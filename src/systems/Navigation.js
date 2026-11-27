// Lightweight grid navigation for shoppers and staff.
//
// The supermarket is small enough that a 0.5 m grid is cheap to rebuild
// whenever furniture changes, and A* paths can be smoothed with a line-of-sight
// test so customers walk naturally instead of hugging cell centres.

// Binary heap over cell indices, kept in two typed arrays that survive between
// searches: the earlier object-per-push heap was the biggest allocation source
// inside a single findPath call.
class IndexHeap {
  constructor(capacity = 2048) {
    this.items = new Int32Array(capacity);
    this.costs = new Float64Array(capacity);
    this.size = 0;
  }
  clear() {
    this.size = 0;
  }
  grow(need) {
    let cap = this.items.length;
    while (cap < need) cap *= 2;
    const items = new Int32Array(cap);
    items.set(this.items);
    const costs = new Float64Array(cap);
    costs.set(this.costs);
    this.items = items;
    this.costs = costs;
  }
  push(idx, f) {
    if (this.size === this.items.length) this.grow(this.size + 1);
    const items = this.items;
    const costs = this.costs;
    let i = this.size++;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (costs[p] <= f) break;
      items[i] = items[p];
      costs[i] = costs[p];
      i = p;
    }
    items[i] = idx;
    costs[i] = f;
  }
  pop() {
    const items = this.items;
    const costs = this.costs;
    const top = items[0];
    const size = --this.size;
    if (size > 0) {
      items[0] = items[size];
      costs[0] = costs[size];
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let best = i;
        if (l < size && costs[l] < costs[best]) best = l;
        if (r < size && costs[r] < costs[best]) best = r;
        if (best === i) break;
        const bi = items[best];
        const bc = costs[best];
        items[best] = items[i];
        costs[best] = costs[i];
        items[i] = bi;
        costs[i] = bc;
        i = best;
      }
    }
    return top;
  }
}

const DIRS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2]
];

export class NavGrid {
  /**
   * @param {object} opts
   * @param {number} opts.minX
   * @param {number} opts.maxX
   * @param {number} opts.minZ
   * @param {number} opts.maxZ
   * @param {number} [opts.cell]
   * @param {number} [opts.radius] obstacle inflation for a walker
   * @param {(x:number,z:number)=>boolean} [opts.walkable] extra area test
   * @param {Array<{minX:number,maxX:number,minZ:number,maxZ:number}>} [opts.obstacles]
   */
  constructor({
    minX,
    maxX,
    minZ,
    maxZ,
    cell = 0.5,
    radius = 0.34,
    walkable = null,
    obstacles = []
  }) {
    this.minX = minX;
    this.minZ = minZ;
    this.cell = cell;
    this.cols = Math.max(1, Math.ceil((maxX - minX) / cell));
    this.rows = Math.max(1, Math.ceil((maxZ - minZ) / cell));
    this.blocked = new Uint8Array(this.cols * this.rows);
    this.extraWalkable = walkable;
    this.stamp = 0;
    // A* needs a real closed set: without one the same cell is expanded again
    // every time a cheaper route reaches it, which burned the expansion budget
    // and returned null on long city routes that do exist.
    this.closedAt = new Uint32Array(this.cols * this.rows);
    // Scratch buffers reused by every search. On the city grid these are
    // 320x216 cells, so allocating and clearing them per call threw away
    // ~550 kB per path; a stamp marks which entries belong to this search.
    this.gScore = new Float32Array(this.cols * this.rows);
    this.gAt = new Uint32Array(this.cols * this.rows);
    this.came = new Int32Array(this.cols * this.rows);
    this.open = new IndexHeap();

    for (const r of obstacles) {
      if (!r) continue;
      const x0 = r.minX - radius;
      const x1 = r.maxX + radius;
      const z0 = r.minZ - radius;
      const z1 = r.maxZ + radius;
      const c0 = Math.max(0, Math.floor((x0 - minX) / cell));
      const c1 = Math.min(this.cols - 1, Math.ceil((x1 - minX) / cell));
      const r0 = Math.max(0, Math.floor((z0 - minZ) / cell));
      const r1 = Math.min(this.rows - 1, Math.ceil((z1 - minZ) / cell));
      // Block a cell only when the cell square actually overlaps the inflated
      // rectangle. Rounding to whole cells instead added a full cell of dead
      // ground around every prop, which sealed the kerb entrances of the
      // crossings and made city routes impossible.
      for (let cz = r0; cz <= r1; cz++) {
        const cellZ = minZ + cz * cell;
        if (cellZ >= z1 || cellZ + cell <= z0) continue;
        for (let cx = c0; cx <= c1; cx++) {
          const cellX = minX + cx * cell;
          if (cellX >= x1 || cellX + cell <= x0) continue;
          this.blocked[cz * this.cols + cx] = 1;
        }
      }
    }
  }

  index(cx, cz) {
    return cz * this.cols + cx;
  }

  inBounds(cx, cz) {
    return cx >= 0 && cz >= 0 && cx < this.cols && cz < this.rows;
  }

  cellCenter(cx, cz) {
    return {
      x: this.minX + (cx + 0.5) * this.cell,
      z: this.minZ + (cz + 0.5) * this.cell
    };
  }

  toCell(x, z) {
    return {
      cx: Math.max(0, Math.min(this.cols - 1, Math.floor((x - this.minX) / this.cell))),
      cz: Math.max(0, Math.min(this.rows - 1, Math.floor((z - this.minZ) / this.cell)))
    };
  }

  isOpen(cx, cz) {
    if (!this.inBounds(cx, cz)) return false;
    if (this.blocked[this.index(cx, cz)]) return false;
    if (!this.extraWalkable) return true;
    const p = this.cellCenter(cx, cz);
    return this.extraWalkable(p.x, p.z);
  }

  isWalkableWorld(x, z) {
    const { cx, cz } = this.toCell(x, z);
    return this.isOpen(cx, cz);
  }

  nearestOpen(x, z, maxRadius = 10) {
    const { cx, cz } = this.toCell(x, z);
    if (this.isOpen(cx, cz)) return { cx, cz };
    for (let r = 1; r <= maxRadius; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const nx = cx + dx;
          const nz = cz + dz;
          if (this.isOpen(nx, nz)) return { cx: nx, cz: nz };
        }
      }
    }
    return null;
  }

  lineOfSight(ax, az, bx, bz) {
    const dist = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(1, Math.ceil(dist / (this.cell * 0.5)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (!this.isWalkableWorld(ax + (bx - ax) * t, az + (bz - az) * t)) return false;
    }
    return true;
  }

  smooth(points) {
    if (points.length <= 2) return points;
    const out = [points[0]];
    let anchor = 0;
    while (anchor < points.length - 1) {
      let next = anchor + 1;
      for (let i = points.length - 1; i > anchor + 1; i--) {
        if (this.lineOfSight(points[anchor].x, points[anchor].z, points[i].x, points[i].z)) {
          next = i;
          break;
        }
      }
      out.push(points[next]);
      anchor = next;
    }
    return out;
  }

  /**
   * Returns a smoothed list of world-space waypoints, or null when no route
   * exists. Start/goal are snapped to the nearest open cells.
   */
  findPath(startX, startZ, goalX, goalZ, maxExpanded = 20000) {
    const start = this.nearestOpen(startX, startZ, 8);
    const goal = this.nearestOpen(goalX, goalZ, 8);
    if (!start || !goal) return null;
    if (start.cx === goal.cx && start.cz === goal.cz) {
      return [
        { x: startX, z: startZ },
        { x: goalX, z: goalZ }
      ];
    }

    const stamp = ++this.stamp;
    const open = this.open;
    open.clear();
    const gScore = this.gScore;
    const gAt = this.gAt;
    const came = this.came;
    const startIdx = this.index(start.cx, start.cz);
    const goalIdx = this.index(goal.cx, goal.cz);
    gScore[startIdx] = 0;
    gAt[startIdx] = stamp;
    // The buffers are reused, so the root must not inherit an old parent.
    came[startIdx] = -1;
    const gx = goal.cx;
    const gz = goal.cz;
    // Math.hypot is several times slower than the plain square root and this
    // runs on every expansion.
    const h = (cx, cz) => {
      const dx = cx - gx;
      const dz = cz - gz;
      return Math.sqrt(dx * dx + dz * dz);
    };
    open.push(startIdx, h(start.cx, start.cz));
    let expanded = 0;
    let found = false;

    while (open.size && expanded < maxExpanded) {
      const curIdx = open.pop();
      if (this.closedAt[curIdx] === stamp) continue;
      this.closedAt[curIdx] = stamp;
      if (curIdx === goalIdx) {
        found = true;
        break;
      }
      expanded++;
      const curCx = curIdx % this.cols;
      const curCz = (curIdx - curCx) / this.cols;
      for (let d = 0; d < DIRS.length; d++) {
        const dx = DIRS[d][0];
        const dz = DIRS[d][1];
        const cost = DIRS[d][2];
        const nx = curCx + dx;
        const nz = curCz + dz;
        if (!this.isOpen(nx, nz)) continue;
        // Do not cut through the corner of a blocked cell.
        if (dx && dz && (!this.isOpen(curCx + dx, curCz) || !this.isOpen(curCx, curCz + dz)))
          continue;
        const nIdx = this.index(nx, nz);
        const tentative = gScore[curIdx] + cost;
        if (tentative >= (gAt[nIdx] === stamp ? gScore[nIdx] : Infinity)) continue;
        gScore[nIdx] = tentative;
        gAt[nIdx] = stamp;
        came[nIdx] = curIdx;
        open.push(nIdx, tentative + h(nx, nz));
      }
    }

    if (!found) return null;
    const cells = [];
    let idx = goalIdx;
    while (idx !== -1) {
      const cx = idx % this.cols;
      const cz = Math.floor(idx / this.cols);
      cells.push(this.cellCenter(cx, cz));
      idx = came[idx];
    }
    cells.reverse();
    // Replace the snapped endpoints with the real requested points when they
    // are reachable from the first/last cell.
    if (this.isWalkableWorld(startX, startZ) && cells.length > 1)
      cells[0] = { x: startX, z: startZ };
    if (this.isWalkableWorld(goalX, goalZ) && cells.length > 1) {
      cells[cells.length - 1] = { x: goalX, z: goalZ };
    }
    return this.smooth(cells);
  }
}

export function buildStoreNavGrid(game) {
  const world = game.world;
  const level = game.state.level || 1;
  return new NavGrid({
    minX: -32,
    maxX: 32,
    minZ: -32,
    maxZ: 22,
    cell: 0.5,
    radius: 0.36,
    walkable: (x, z) => {
      if (world.isInsideStore?.(x, z, level, 0.28)) return true;
      // Entrance corridor connects the sales floor to the delivery apron.
      return x >= -4.2 && x <= 4.2 && z >= 11.4 && z <= 19.5;
    },
    obstacles: world.storeColliders || []
  });
}
