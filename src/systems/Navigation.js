// Lightweight grid navigation for shoppers and staff.
//
// The supermarket is small enough that a 0.5 m grid is cheap to rebuild
// whenever furniture changes, and A* paths can be smoothed with a line-of-sight
// test so customers walk naturally instead of hugging cell centres.

class MinHeap {
  constructor() {
    this.items = [];
  }
  get size() {
    return this.items.length;
  }
  push(node) {
    const a = this.items;
    a.push(node);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.items;
    if (!a.length) return null;
    const top = a[0];
    const last = a.pop();
    if (a.length && last) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let best = i;
        if (l < a.length && a[l].f < a[best].f) best = l;
        if (r < a.length && a[r].f < a[best].f) best = r;
        if (best === i) break;
        [a[best], a[i]] = [a[i], a[best]];
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
    this.visit = new Uint32Array(this.cols * this.rows);

    for (const r of obstacles) {
      if (!r) continue;
      const c0 = Math.max(0, Math.floor((r.minX - radius - minX) / cell));
      const c1 = Math.min(this.cols - 1, Math.ceil((r.maxX + radius - minX) / cell));
      const r0 = Math.max(0, Math.floor((r.minZ - radius - minZ) / cell));
      const r1 = Math.min(this.rows - 1, Math.ceil((r.maxZ + radius - minZ) / cell));
      for (let z = r0; z <= r1; z++) {
        for (let x = c0; x <= c1; x++) this.blocked[z * this.cols + x] = 1;
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
  findPath(startX, startZ, goalX, goalZ, maxExpanded = 9000) {
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
    const open = new MinHeap();
    const gScore = new Float32Array(this.cols * this.rows).fill(Infinity);
    const came = new Int32Array(this.cols * this.rows).fill(-1);
    const startIdx = this.index(start.cx, start.cz);
    const goalIdx = this.index(goal.cx, goal.cz);
    gScore[startIdx] = 0;
    const h = (cx, cz) => Math.hypot(cx - goal.cx, cz - goal.cz);
    open.push({ cx: start.cx, cz: start.cz, f: h(start.cx, start.cz) });
    this.visit[startIdx] = stamp;
    let expanded = 0;
    let found = false;

    while (open.size && expanded < maxExpanded) {
      const cur = open.pop();
      const curIdx = this.index(cur.cx, cur.cz);
      if (this.visit[curIdx] !== stamp) continue;
      if (curIdx === goalIdx) {
        found = true;
        break;
      }
      expanded++;
      for (const [dx, dz, cost] of DIRS) {
        const nx = cur.cx + dx;
        const nz = cur.cz + dz;
        if (!this.isOpen(nx, nz)) continue;
        // Do not cut through the corner of a blocked cell.
        if (dx && dz && (!this.isOpen(cur.cx + dx, cur.cz) || !this.isOpen(cur.cx, cur.cz + dz)))
          continue;
        const nIdx = this.index(nx, nz);
        const tentative = gScore[curIdx] + cost;
        if (tentative >= gScore[nIdx]) continue;
        gScore[nIdx] = tentative;
        came[nIdx] = curIdx;
        this.visit[nIdx] = stamp;
        open.push({ cx: nx, cz: nz, f: tentative + h(nx, nz) });
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
