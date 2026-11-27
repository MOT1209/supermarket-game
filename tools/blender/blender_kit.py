"""Shared helpers for the FRESH MART character pipeline.

Geometry is generated analytically (lofts / tubes) so every vertex can be
weighted to the skeleton by construction: no automatic-weights cleanup, no
surprise deformation at shoulders, elbows, knees or wrists.

Coordinate conventions
----------------------
Blender Z up, the character faces -Y (glTF +Z after export, which is what the
game's `rotation.y = atan2(dx, dz)` expects). 1 unit = 1 metre, feet on Z=0.
"""

import bpy
import bmesh
import math
from mathutils import Vector, Quaternion

TAU = math.tau
D = math.radians


# --------------------------------------------------------------------------- #
# small maths helpers
# --------------------------------------------------------------------------- #
def smoothstep(a, b, x):
    if a == b:
        return 0.0 if x < a else 1.0
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def catmull(points, samples=5):
    """Interpolate a list of equal-length tuples with a Catmull-Rom spline."""
    if len(points) < 2:
        return list(points)
    ext = [points[0]] + list(points) + [points[-1]]
    out = []
    for i in range(len(points) - 1):
        p0, p1, p2, p3 = ext[i], ext[i + 1], ext[i + 2], ext[i + 3]
        for s in range(samples):
            t = s / samples
            t2, t3 = t * t, t * t * t
            row = []
            for k in range(len(p1)):
                row.append(
                    0.5
                    * (
                        (2 * p1[k])
                        + (-p0[k] + p2[k]) * t
                        + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2
                        + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3
                    )
                )
            out.append(tuple(row))
    out.append(tuple(points[-1]))
    return out


def pchip(points, x):
    """Monotone cubic interpolation through (x, y) points (no overshoot)."""
    pts = sorted(points)
    xs = [q[0] for q in pts]
    ys = [q[1] for q in pts]
    n = len(xs)
    if n == 0:
        return 0.0
    if n == 1 or x <= xs[0]:
        return ys[0]
    if x >= xs[-1]:
        return ys[-1]
    h = [xs[i + 1] - xs[i] for i in range(n - 1)]
    d = [(ys[i + 1] - ys[i]) / h[i] for i in range(n - 1)]
    m = [0.0] * n
    m[0] = d[0]
    m[-1] = d[-1]
    for i in range(1, n - 1):
        if d[i - 1] * d[i] <= 0:
            m[i] = 0.0
        else:
            w1 = 2 * h[i] + h[i - 1]
            w2 = h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    for i in range(n - 1):
        if xs[i] <= x <= xs[i + 1]:
            t = (x - xs[i]) / h[i]
            t2, t3 = t * t, t * t * t
            return (
                (2 * t3 - 3 * t2 + 1) * ys[i]
                + (t3 - 2 * t2 + t) * h[i] * m[i]
                + (-2 * t3 + 3 * t2) * ys[i + 1]
                + (t3 - t2) * h[i] * m[i + 1]
            )
    return ys[-1]


def pchip_curve(points, x):
    return pchip(points, x)


def srgb(hex_value, alpha=1.0):
    """Hex sRGB -> linear RGBA for Blender node inputs."""
    r = ((hex_value >> 16) & 255) / 255.0
    g = ((hex_value >> 8) & 255) / 255.0
    b = (hex_value & 255) / 255.0

    def lin(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    return (lin(r), lin(g), lin(b), alpha)


# --------------------------------------------------------------------------- #
# materials
# --------------------------------------------------------------------------- #
def make_material(name, color, roughness=0.7, metallic=0.0, alpha=1.0, double_sided=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    rgba = srgb(color, alpha)
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    for key in ("Specular IOR Level", "Specular"):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = 0.35 if metallic < 0.2 else 0.5
            break
    if alpha < 1.0:
        for key in ("Alpha",):
            if key in bsdf.inputs:
                bsdf.inputs[key].default_value = alpha
        mat.blend_method = "BLEND"
    mat.use_backface_culling = not double_sided
    mat.diffuse_color = rgba
    return mat


# --------------------------------------------------------------------------- #
# mesh construction
# --------------------------------------------------------------------------- #
def _finish_mesh(name, verts, faces, mat, weights, smooth, recalc):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.validate(verbose=False)
    me.update()
    if recalc:
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
        me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if mat is not None:
        me.materials.append(mat)
    if smooth:
        for poly in me.polygons:
            poly.use_smooth = True
    if weights:
        groups = {}
        for i, w in enumerate(weights):
            if not w:
                continue
            for bone, value in w.items():
                if value <= 1e-4:
                    continue
                grp = groups.get(bone)
                if grp is None:
                    grp = ob.vertex_groups.new(name=bone)
                    groups[bone] = grp
                grp.add([i], value, "REPLACE")
    return ob


def add_mesh(name, verts, faces, mat, weights=None, smooth=True, recalc=True):
    """weights: list (per vertex) or dict (applied to every vertex)."""
    if isinstance(weights, dict):
        weights = [weights] * len(verts)
    return _finish_mesh(name, verts, faces, mat, weights, smooth, recalc)


def loft_z(name, profile, segments, mat, weights_rings=None, cap_start=True,
           cap_end=True, smooth=True):
    """Loft horizontal rings. profile items: (z, rx, ry, y_offset)."""
    verts, faces, weights = [], [], []
    for ring_index, (z, rx, ry, yoff) in enumerate(profile):
        for j in range(segments):
            a = TAU * j / segments
            verts.append(Vector((rx * math.sin(a), yoff - ry * math.cos(a), z)))
            if weights_rings:
                weights.append(weights_rings[ring_index])
    for i in range(len(profile) - 1):
        base = i * segments
        nxt = (i + 1) * segments
        for j in range(segments):
            j2 = (j + 1) % segments
            faces.append((base + j, base + j2, nxt + j2, nxt + j))
    if cap_start:
        z, rx, ry, yoff = profile[0]
        c = len(verts)
        verts.append(Vector((0, yoff, z)))
        if weights_rings:
            weights.append(weights_rings[0])
        for j in range(segments):
            j2 = (j + 1) % segments
            faces.append((c, j2, j))
    if cap_end:
        z, rx, ry, yoff = profile[-1]
        c = len(verts)
        verts.append(Vector((0, yoff, z)))
        if weights_rings:
            weights.append(weights_rings[-1])
        base = (len(profile) - 1) * segments
        for j in range(segments):
            j2 = (j + 1) % segments
            faces.append((c, base + j, base + j2))
    return add_mesh(name, verts, faces, mat, weights or None, smooth)


def _frame_ring(p, direction, rx, ry, segments, phase=0.0):
    """Stable frame: no roll flipping when a limb bends (which caused creases)."""
    z = direction.normalized()
    ref = Vector((1, 0, 0)) if abs(z.x) < 0.9 else Vector((0, 1, 0))
    x_axis = (ref - z * ref.dot(z)).normalized()
    y_axis = z.cross(x_axis).normalized()
    pts = []
    for j in range(segments):
        a = TAU * j / segments + phase
        pts.append(p + x_axis * (rx * math.cos(a)) + y_axis * (ry * math.sin(a)))
    return pts


def tube(name, path, radii_x, radii_y, segments, mat, weights_rings,
         cap_start=True, cap_end=True, smooth=True):
    """Tube along a polyline; radii per path point."""
    n = len(path)
    if isinstance(weights_rings, dict):
        weights_rings = [weights_rings] * n
    verts, faces = [], []
    for i, p in enumerate(path):
        if i == 0:
            direction = path[1] - path[0]
        elif i == n - 1:
            direction = path[-1] - path[-2]
        else:
            direction = path[i + 1] - path[i - 1]
        if direction.length < 1e-6:
            direction = Vector((0, 0, -1))
        direction.normalize()
        verts.extend(_frame_ring(p, direction, radii_x[i], radii_y[i], segments))
    for i in range(n - 1):
        base, nxt = i * segments, (i + 1) * segments
        for j in range(segments):
            j2 = (j + 1) % segments
            faces.append((base + j, base + j2, nxt + j2, nxt + j))
    if cap_start:
        c = len(verts)
        verts.append(path[0] - (path[1] - path[0]).normalized() * 0.004)
        for j in range(segments):
            j2 = (j + 1) % segments
            faces.append((c, j2, j))
    if cap_end:
        c = len(verts)
        verts.append(path[-1] + (path[-1] - path[-2]).normalized() * 0.004)
        base = (n - 1) * segments
        for j in range(segments):
            j2 = (j + 1) % segments
            faces.append((c, base + j, base + j2))
    weights = []
    for i in range(n):
        weights.extend([weights_rings[i]] * segments)
    if cap_start:
        weights.append(weights_rings[0])
    if cap_end:
        weights.append(weights_rings[-1])
    return add_mesh(name, verts, faces, mat, weights, smooth)


def ellipsoid(name, center, rx, ry, rz, mat, weights=None, segments=16, rings=12,
              smooth=True, rotation=None):
    verts, faces = [], []
    for i in range(rings + 1):
        v = math.pi * i / rings
        sz, cz = math.cos(v), math.sin(v)
        for j in range(segments):
            u = TAU * j / segments
            p = Vector((rx * sz * math.sin(u), -ry * sz * math.cos(u), rz * cz))
            if rotation is not None:
                p = rotation @ p
            verts.append(center + p)
    for i in range(rings):
        for j in range(segments):
            j2 = (j + 1) % segments
            a = i * segments + j
            b = i * segments + j2
            c = (i + 1) * segments + j2
            d = (i + 1) * segments + j
            faces.append((a, b, c, d))
    # caps
    top = len(verts)
    verts.append(center + Vector((0, 0, rz)) if rotation is None else center + rotation @ Vector((0, 0, rz)))
    bot = len(verts)
    verts.append(center + Vector((0, 0, -rz)) if rotation is None else center + rotation @ Vector((0, 0, -rz)))
    for j in range(segments):
        j2 = (j + 1) % segments
        faces.append((top, j, j2))
        base = rings * segments
        faces.append((bot, base + j2, base + j))
    return add_mesh(name, verts, faces, mat, weights, smooth)


def rounded_box(name, center, size, mat, weights=None, radius=0.01, segments=2):
    """Beveled cube built with bmesh (cheap, reads as soft fabric/prop)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0] * 2.0
        v.co.y *= size[1] * 2.0
        v.co.z *= size[2] * 2.0
    bmesh.ops.bevel(
        bm,
        geom=list(bm.edges) + list(bm.verts),
        offset=radius,
        segments=segments,
        affect="EDGES",
    )
    for v in bm.verts:
        v.co += Vector(center)
    bm.to_mesh(me)
    bm.free()
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if mat:
        me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = True
    if weights:
        if isinstance(weights, dict):
            weights = [weights] * len(me.vertices)
        groups = {}
        for i, w in enumerate(weights):
            for bone, value in w.items():
                grp = groups.get(bone) or ob.vertex_groups.new(name=bone)
                groups[bone] = grp
                grp.add([i], value, "REPLACE")
    return ob


def torus(name, center, major, minor, mat, weights=None, axis="Z", major_seg=20,
          minor_seg=8, scale=(1, 1, 1), start=0.0, end=TAU):
    verts, faces = [], []
    arc = end - start
    closed = abs(arc - TAU) < 1e-6
    n_major = major_seg if closed else major_seg + 1
    for i in range(n_major):
        a = start + arc * i / major_seg
        for j in range(minor_seg):
            b = TAU * j / minor_seg
            r = major + minor * math.cos(b)
            p = Vector((r * math.cos(a), r * math.sin(a), minor * math.sin(b)))
            p.x *= scale[0]
            p.y *= scale[1]
            p.z *= scale[2]
            if axis == "X":
                p = Vector((p.z, p.x, p.y))
            elif axis == "Y":
                p = Vector((p.x, p.z, p.y))
            verts.append(Vector(center) + p)
    rows = n_major if closed else n_major - 1
    for i in range(rows):
        i2 = (i + 1) % n_major
        for j in range(minor_seg):
            j2 = (j + 1) % minor_seg
            faces.append(
                (i * minor_seg + j, i2 * minor_seg + j, i2 * minor_seg + j2, i * minor_seg + j2)
            )
    return add_mesh(name, verts, faces, mat, weights, True)


def join_objects(objects, name):
    objects = [o for o in objects if o is not None]
    if not objects:
        return None
    if len(objects) == 1:
        objects[0].name = name
        return objects[0]
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    joined = bpy.context.view_layer.objects.active
    joined.name = name
    return joined


def apply_solidify(ob, thickness):
    mod = ob.modifiers.new("shell", "SOLIDIFY")
    mod.thickness = thickness
    mod.offset = 0.0
    mod.use_even_offset = True
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob


def apply_mirror(ob):
    mod = ob.modifiers.new("mirror", "MIRROR")
    mod.use_axis = (True, False, False)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob


# --------------------------------------------------------------------------- #
# weights
# --------------------------------------------------------------------------- #
def norm(w):
    total = sum(w.values())
    if total <= 0:
        return w
    return {k: v / total for k, v in w.items() if v > 1e-5}


def blend(a, b, t):
    """Linear blend between two weight dicts."""
    keys = set(a) | set(b)
    return norm({k: lerp(a.get(k, 0.0), b.get(k, 0.0), t) for k in keys})


# --------------------------------------------------------------------------- #
# armature
# --------------------------------------------------------------------------- #
def build_armature(name, bones):
    """bones: list of dicts {name, head, tail, parent, connect}."""
    arm_data = bpy.data.armatures.new(name)
    arm = bpy.data.objects.new(name, arm_data)
    bpy.context.scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    created = {}
    for spec in bones:
        eb = arm_data.edit_bones.new(spec["name"])
        eb.head = Vector(spec["head"])
        eb.tail = Vector(spec["tail"])
        eb.roll = spec.get("roll", 0.0)
        created[spec["name"]] = eb
    for spec in bones:
        parent = spec.get("parent")
        if parent:
            created[spec["name"]].parent = created[parent]
            created[spec["name"]].use_connect = spec.get("connect", False)
    bpy.ops.object.mode_set(mode="OBJECT")
    for pb in arm.pose.bones:
        pb.rotation_mode = "QUATERNION"
    for bone in arm_data.bones:
        bone.use_deform = bone.name != "Root"
    return arm


def bind_meshes(arm, objects):
    for ob in objects:
        if ob is None:
            continue
        ob.parent = arm
        ob.matrix_parent_inverse = arm.matrix_world.inverted()
        mod = ob.modifiers.new("Armature", "ARMATURE")
        mod.object = arm
        mod.use_vertex_groups = True


# --------------------------------------------------------------------------- #
# animation
# --------------------------------------------------------------------------- #
def pose_quat(pb, degrees):
    """Rotation about armature-space X/Y/Z axes, expressed in bone space."""
    rx, ry, rz = degrees
    m = pb.bone.matrix_local.to_3x3()
    inv = m.inverted()
    q = Quaternion(inv @ Vector((1, 0, 0)), D(rx))
    q = q @ Quaternion(inv @ Vector((0, 1, 0)), D(ry))
    q = q @ Quaternion(inv @ Vector((0, 0, 1)), D(rz))
    return q


def mirror_pose(pose):
    out = {}
    for name, (rx, ry, rz) in pose.items():
        if name.endswith("_L"):
            name = name[:-2] + "_R"
        elif name.endswith("_R"):
            name = name[:-2] + "_L"
        out[name] = (rx, -ry, -rz)
    return out


def key_pose(arm, frame, pose, hips_offset=(0, 0, 0), key_location=True):
    for pb in arm.pose.bones:
        deg = pose.get(pb.name, (0.0, 0.0, 0.0))
        pb.rotation_quaternion = pose_quat(pb, deg)
        pb.location = Vector((0, 0, 0))
        if pb.name == "Hips" and key_location:
            m = pb.bone.matrix_local.to_3x3()
            pb.location = m.inverted() @ Vector(hips_offset)
        pb.keyframe_insert("rotation_quaternion", frame=frame, group=pb.name)
        if pb.name == "Hips" and key_location:
            pb.keyframe_insert("location", frame=frame, group=pb.name)


def action_fcurves(action):
    """F-curves of an action across legacy and layered (4.4+/5.x) actions."""
    try:
        return list(action.fcurves)
    except AttributeError:
        pass
    curves = []
    for layer in getattr(action, "layers", []):
        for strip in getattr(layer, "strips", []):
            for slot in getattr(action, "slots", []):
                try:
                    bag = strip.channelbag(slot)
                except Exception:  # noqa: BLE001 - slot may not be bound
                    bag = None
                if bag:
                    curves.extend(bag.fcurves)
    return curves


def make_action(arm, name, keys, interpolation="BEZIER"):
    """keys: list of (frame, pose_dict, hips_offset)."""
    if arm.animation_data is None:
        arm.animation_data_create()
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    arm.animation_data.action = action
    for frame, pose, hips in keys:
        key_pose(arm, frame, pose, hips)
    for fcu in action_fcurves(action):
        for kp in fcu.keyframe_points:
            kp.interpolation = interpolation
    arm.animation_data.action = None
    return action


def action_length(action):
    return max((kp.co[0] for fcu in action_fcurves(action) for kp in fcu.keyframe_points), default=1)
