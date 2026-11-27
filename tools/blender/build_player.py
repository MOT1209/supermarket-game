"""Build the first-person player viewmodels: male and female forearms/hands.

The meshes are authored directly in camera space so Player.js can attach them to
the camera without a corrective rotation: Blender +Y is forward (-Z in glTF),
Blender -Z is down (-Y in glTF), Blender +X is screen right.

Run:
  blender.exe -b --factory-startup -P tools/blender/build_player.py
"""

import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(ROOT, "public", "models")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blender_kit import ellipsoid, join_objects, make_material, rounded_box, tube  # noqa: E402

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def materials(female):
    # Sampled from the matching customer body so first and third person agree.
    if female:
        skin, sleeve, trim = 0x70452E, 0xE8DDC8, 0xB39A6A
    else:
        skin, sleeve, trim = 0x7A4D32, 0x7A2E3A, 0x3A2222
    return {
        "skin": make_material("Player_Skin", skin, roughness=0.62),
        "sleeve": make_material("Player_Sleeve", sleeve, roughness=0.82),
        "trim": make_material("Player_Cuff", trim, roughness=0.75),
        "metal": make_material("Player_Metal", 0xC9A24A if female else 0x24282B,
                               roughness=0.34, metallic=0.75),
        "face": make_material("Player_Watch", 0xD8EAD9, roughness=0.3, metallic=0.15),
    }


def build_hand(side, female, mats, objs):
    sx = 1 if side == "R" else -1
    wrist = Vector((sx * 0.19, 0.42, -0.20))
    elbow = Vector((sx * 0.33, 0.30, -0.32))
    d = (wrist - elbow).normalized()
    slim = 0.88 if female else 1.0

    # Bare wrist between the cuff and the palm.
    path = [wrist, wrist - d * 0.08, wrist - d * 0.17]
    radii = [0.030 * slim, 0.035 * slim, 0.040 * slim]
    objs.append(tube(f"arm_{side}_skin", path, radii, radii, 10, mats["skin"], [None] * 3))

    # Long sleeve, pushed back just enough to leave the wrist and watch visible.
    start = 0.06 if not female else 0.05
    s0 = wrist - d * start
    s1 = wrist - d * (start + 0.09)
    s2 = elbow + (elbow - wrist) * 0.10
    radii = [0.044 * slim, 0.050 * slim, 0.058 * slim]
    objs.append(
        tube(f"arm_{side}_sleeve", [s0, s1, s2], radii, radii, 10, mats["sleeve"], [None] * 3)
    )
    cuff = [s0 + d * 0.004, s0 - d * 0.024]
    cuff_r = 0.0465 * slim
    objs.append(
        tube(f"arm_{side}_cuff", cuff, [cuff_r, cuff_r], [cuff_r, cuff_r], 10,
             mats["trim"], [None] * 2)
    )

    # Palm, slightly turned inward and tilted down toward the fingers.
    rz = math.radians((8 if side == "R" else -8))
    rx = math.radians(-8)
    R = Matrix.Rotation(rz, 3, "Z") @ Matrix.Rotation(rx, 3, "X")
    palm = rounded_box(
        f"hand_{side}_palm", (0, 0, 0),
        (0.042 * slim, 0.058 * slim, 0.020 * slim),
        mats["skin"], radius=0.010, segments=2,
    )
    P = wrist + R @ Vector((0, 0.068, 0.010))
    for v in palm.data.vertices:
        v.co = R @ v.co + P
    objs.append(palm)

    # Four fingers, longest in the middle, with rounded tips.
    lengths = [0.060, 0.067, 0.062, 0.051]
    if female:
        lengths = [v * 0.92 for v in lengths]
    dxs = [-0.027, -0.009, 0.009, 0.027]
    for i, (dx, length) in enumerate(zip(dxs, lengths)):
        base = P + R @ Vector((dx * slim, 0.042 * slim, 0.002))
        tip = base + R @ Vector((dx * 0.12, length * 1.18, -0.014))
        mid = base + R @ Vector((dx * 0.06, length * 0.60, -0.005))
        r0 = 0.0115 * slim
        objs.append(
            tube(f"finger_{side}_{i}", [base, mid, tip],
                 [r0, r0 * 0.9, r0 * 0.62], [r0, r0 * 0.9, r0 * 0.62], 6,
                 mats["skin"], [None] * 3)
        )
        objs.append(
            ellipsoid(f"finger_{side}_{i}_tip", tip, r0 * 0.62, r0 * 0.62, r0 * 0.55,
                      mats["skin"], segments=6, rings=4)
        )

    # Thumb on the inner edge, lower than the fingers.
    inner = -sx
    tb = P + R @ Vector((inner * 0.036 * slim, 0.010, -0.006))
    t1 = tb + R @ Vector((inner * 0.017, 0.030, -0.011))
    t2 = tb + R @ Vector((inner * 0.032, 0.050, -0.023))
    objs.append(
        tube(f"thumb_{side}", [tb, t1, t2],
             [0.0145 * slim, 0.0125 * slim, 0.009 * slim],
             [0.0145 * slim, 0.0125 * slim, 0.009 * slim], 7, mats["skin"], [None] * 3)
    )
    objs.append(
        ellipsoid(f"thumb_{side}_tip", t2, 0.009 * slim, 0.009 * slim, 0.008 * slim,
                  mats["skin"], segments=6, rings=4)
    )

    # Wrist accessory: a watch on the male, thin gold bracelets on the female.
    band_r = 0.0365 * slim
    if female:
        for i, offset in enumerate((-0.010, 0.016)):
            c = wrist - d * (0.030 + offset)
            objs.append(
                tube(f"bracelet_{side}_{i}", [c - d * 0.005, c + d * 0.005],
                     [band_r, band_r], [band_r, band_r], 12, mats["metal"], [None] * 2)
            )
    else:
        c = wrist - d * 0.034
        objs.append(
            tube(f"watch_band_{side}", [c - d * 0.009, c + d * 0.009],
                 [band_r, band_r], [band_r, band_r], 12, mats["metal"], [None] * 2)
        )
        face = rounded_box(f"watch_face_{side}", c + Vector((0, 0, band_r + 0.001)),
                           (0.018, 0.021, 0.005), mats["face"], radius=0.004)
        objs.append(face)


def build(female):
    reset()
    mats = materials(female)
    objs = []
    for side in ("R", "L"):
        build_hand(side, female, mats, objs)

    root = join_objects(objs, "player_arms_female" if female else "player_arms_male")
    root.data.calc_loop_triangles()
    tris = len(root.data.loop_triangles)
    verts = len(root.data.vertices)

    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    bpy.context.view_layer.objects.active = root
    name = "player_female" if female else "player_male"
    path = os.path.join(OUT_DIR, name + ".glb")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_yup=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_materials="EXPORT",
    )
    bounds = [tuple(round(c, 3) for c in v) for v in root.bound_box]
    lo = [min(b[i] for b in bounds) for i in range(3)]
    hi = [max(b[i] for b in bounds) for i in range(3)]
    print(
        f"[player] {name}: {tris} tris, {verts} verts, "
        f"{len(root.data.materials)} materials, bounds {lo}..{hi}",
        flush=True,
    )
    return path


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for female in (False, True):
        build(female)
    print("DONE", flush=True)


if __name__ == "__main__":
    main()
