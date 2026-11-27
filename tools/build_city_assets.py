"""Generate the modular FRESH MART city asset pack.

Run headless:
  "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe" -b -P tools/build_city_assets.py

Every asset is authored with its origin on the ground, +Y in Blender pointing
away from the street. The glTF exporter converts Blender +Y to glTF -Z, so the
front of a building faces +Z in Three.js (the same direction as the supermarket
entrance). Assets use flat Principled materials so they stay small and load fast.
"""

import math
import os

import bpy

OUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "models", "city"
)
os.makedirs(OUT_DIR, exist_ok=True)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = "METRIC"


def material(name, color, metallic=0.0, roughness=0.72, emission=None, strength=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission is not None:
        try:
            bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
            bsdf.inputs["Emission Strength"].default_value = strength
        except KeyError:
            pass
    return mat


def cube(name, dims, loc, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = dims
    obj.rotation_euler = rot
    obj.data.materials.append(mat)
    return obj


def cylinder(name, radius, depth, loc, mat, vertices=12, rot=(0, 0, 0), radius2=None):
    if radius2 is None:
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=vertices, radius=radius, depth=depth, location=loc
        )
    else:
        bpy.ops.mesh.primitive_cone_add(
            vertices=vertices, radius1=radius, radius2=radius2, depth=depth, location=loc
        )
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler = rot
    obj.data.materials.append(mat)
    return obj


def sphere(name, radius, loc, mat, subdivisions=2, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=radius, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    return obj


def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objs:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    result = bpy.context.active_object
    result.name = name
    return result


def export(name, objs):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objs:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    filepath = os.path.join(OUT_DIR, name)
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
    )
    print(f"[city-assets] wrote {name} ({os.path.getsize(filepath)} bytes)")


def windows_front(prefix, w, d, floors, floor_h, mat, frame_mat, columns, start_z=2.0):
    """Dark window panes on the -Y facade, with a slim frame around each."""
    objs = []
    usable = w - 2.4
    step = usable / max(1, columns)
    for floor in range(floors):
        z = start_z + floor * floor_h
        for col in range(columns):
            x = -usable / 2 + step * (col + 0.5)
            objs.append(cube(f"{prefix}_frame", (step * 0.72, 0.16, floor_h * 0.55), (x, -d / 2 - 0.03, z), frame_mat))
            objs.append(cube(f"{prefix}_glass", (step * 0.6, 0.1, floor_h * 0.45), (x, -d / 2 - 0.12, z), mat))
    return objs


def building_residential(name, w, d, h, floors, body_color, accent_color, columns=3):
    reset()
    body = material("body", body_color, roughness=0.86)
    accent = material("accent", accent_color, roughness=0.8)
    frame = material("frame", (0.16, 0.18, 0.2), roughness=0.7)
    glass = material("glass", (0.16, 0.28, 0.38), metallic=0.15, roughness=0.25, emission=(0.12, 0.2, 0.28), strength=0.7)
    roof = material("roof", (0.22, 0.24, 0.25), roughness=0.95)
    door = material("door", (0.18, 0.24, 0.2), metallic=0.2, roughness=0.5)
    objs = [cube("body", (w, d, h), (0, 0, h / 2), body)]
    objs += windows_front("win", w, d, floors, (h - 2.6) / floors, glass, frame, columns)
    # Ground floor door and canopy.
    objs.append(cube("door", (1.5, 0.18, 2.3), (0, -d / 2 - 0.08, 1.15), door))
    objs.append(cube("canopy", (2.6, 1.1, 0.16), (0, -d / 2 - 0.55, 2.55), accent))
    # Balconies on alternating floors.
    for floor in range(1, floors, 2):
        z = 2.0 + floor * ((h - 2.6) / floors)
        objs.append(cube("balcony", (w - 2.0, 1.0, 0.16), (0, -d / 2 - 0.5, z - 0.7), accent))
        objs.append(cube("rail", (w - 2.0, 0.08, 0.7), (0, -d / 2 - 1.0, z - 0.35), frame))
    # Parapet and roof clutter.
    objs.append(cube("parapet", (w + 0.2, d + 0.2, 0.5), (0, 0, h + 0.2), roof))
    objs.append(cube("roof_box", (2.2, 1.6, 1.0), (w * 0.22, d * 0.15, h + 0.75), roof))
    export(name, [join(objs, name.replace(".glb", ""))])


def building_commercial(name, w, d, h, floors, body_color, sign_color, columns=3):
    reset()
    body = material("body", body_color, roughness=0.72)
    dark = material("dark", (0.1, 0.12, 0.14), roughness=0.55, metallic=0.25)
    glass = material("glass", (0.12, 0.25, 0.32), metallic=0.3, roughness=0.18, emission=(0.1, 0.22, 0.3), strength=1.0)
    frame = material("frame", (0.14, 0.15, 0.17), metallic=0.4, roughness=0.4)
    sign = material("sign", sign_color, emission=sign_color, strength=1.6)
    objs = [cube("body", (w, d, h), (0, 0, h / 2), body)]
    # Full-height glass storefront with mullions.
    objs.append(cube("shop_glass", (w - 1.6, 0.18, 3.2), (0, -d / 2 - 0.1, 1.7), glass))
    for i in range(5):
        x = -(w - 2.0) / 2 + i * ((w - 2.0) / 4)
        objs.append(cube("mullion", (0.1, 0.24, 3.2), (x, -d / 2 - 0.16, 1.7), frame))
    objs.append(cube("sign_band", (w - 1.2, 0.3, 0.9), (0, -d / 2 - 0.12, 3.85), sign))
    objs += windows_front("win", w, d, floors - 1, (h - 5.0) / max(1, floors - 1), glass, frame, columns, start_z=5.3)
    objs.append(cube("parapet", (w + 0.2, d + 0.2, 0.45), (0, 0, h + 0.18), dark))
    objs.append(cube("roof_sign", (w * 0.55, 0.35, 1.1), (0, -d * 0.25, h + 0.9), sign))
    export(name, [join(objs, name.replace(".glb", ""))])


def shop_shell():
    reset()
    wall = material("wall", (0.86, 0.84, 0.78), roughness=0.88)
    trim = material("trim", (0.24, 0.3, 0.27), roughness=0.7)
    glass = material("glass", (0.42, 0.66, 0.74), metallic=0.1, roughness=0.12, emission=(0.2, 0.34, 0.4), strength=0.35)
    floor = material("floor", (0.52, 0.44, 0.34), roughness=0.95)
    roof = material("roof", (0.3, 0.32, 0.33), roughness=0.95)
    w, d, h = 14.0, 12.0, 4.6
    objs = [
        cube("floor_slab", (w, d, 0.2), (0, 0, 0.1), floor),
        cube("back_wall", (w, 0.3, h), (0, d / 2, h / 2), wall),
        cube("left_wall", (0.3, d, h), (-w / 2, 0, h / 2), wall),
        cube("right_wall", (0.3, d, h), (w / 2, 0, h / 2), wall),
    ]
    # Front wall with a 3 m door gap and two big display windows.
    objs.append(cube("front_left", (w / 2 - 1.5, 0.3, h), (-w / 4 - 0.75, -d / 2, h / 2), wall))
    objs.append(cube("front_right", (w / 2 - 1.5, 0.3, h), (w / 4 + 0.75, -d / 2, h / 2), wall))
    objs.append(cube("front_header", (3.0, 0.3, h - 2.6), (0, -d / 2, 2.6 + (h - 2.6) / 2), wall))
    objs.append(cube("glass_left", (4.6, 0.12, 2.2), (-w / 4 - 0.6, -d / 2 - 0.12, 1.5), glass))
    objs.append(cube("glass_right", (4.6, 0.12, 2.2), (w / 4 + 0.6, -d / 2 - 0.12, 1.5), glass))
    objs.append(cube("entrance_step", (3.4, 0.8, 0.14), (0, -d / 2 - 0.4, 0.07), trim))
    objs.append(cube("roof", (w + 0.4, d + 0.4, 0.35), (0, 0, h + 0.18), roof))
    objs.append(cube("parapet", (w + 0.4, d + 0.4, 0.5), (0, 0, h + 0.45), trim))
    export("shop_shell.glb", [join(objs, "shop_shell")])


def streetlight():
    reset()
    pole = material("pole", (0.18, 0.2, 0.22), metallic=0.65, roughness=0.4)
    lamp = material("lamp", (1.0, 0.86, 0.55), emission=(1.0, 0.78, 0.4), strength=4.0)
    objs = [
        cylinder("base", 0.22, 0.3, (0, 0, 0.15), pole, 10),
        cylinder("pole", 0.1, 5.2, (0, 0, 2.6), pole, 8),
        cylinder("arm", 0.07, 1.6, (0.72, 0, 5.1), pole, 8, rot=(0, math.pi / 2, 0)),
        cube("lamp_head", (0.7, 0.34, 0.2), (1.45, 0, 5.05), pole),
        cube("bulb", (0.54, 0.22, 0.08), (1.45, 0, 4.92), lamp),
    ]
    export("streetlight.glb", [join(objs, "streetlight")])


def tree(name, trunk_color, leaf_color, height=4.2, spread=1.5):
    reset()
    trunk = material("trunk", trunk_color, roughness=0.95)
    leaf = material("leaf", leaf_color, roughness=0.85)
    objs = [
        cylinder("trunk", 0.16, height * 0.55, (0, 0, height * 0.275), trunk, 8),
        sphere("crown_a", spread, (0, 0, height * 0.72), leaf, 2, (1, 1, 0.9)),
        sphere("crown_b", spread * 0.7, (spread * 0.55, 0.1, height * 0.6), leaf, 2),
        sphere("crown_c", spread * 0.65, (-spread * 0.5, -0.1, height * 0.65), leaf, 2),
        sphere("crown_d", spread * 0.6, (0, 0.35, height * 0.88), leaf, 2),
    ]
    export(name, [join(objs, name.replace(".glb", ""))])


def bench():
    reset()
    wood = material("wood", (0.45, 0.29, 0.16), roughness=0.9)
    metal = material("metal", (0.2, 0.22, 0.24), metallic=0.6, roughness=0.4)
    objs = []
    for i in range(4):
        objs.append(cube("slat", (2.0, 0.16, 0.08), (0, -0.25 + i * 0.16, 0.48), wood))
    for i in range(3):
        objs.append(cube("back", (2.0, 0.08, 0.15), (0, 0.32, 0.68 + i * 0.18), wood))
    for x in (-0.8, 0.8):
        objs.append(cube("leg", (0.1, 0.6, 0.48), (x, 0, 0.24), metal))
        objs.append(cube("arm", (0.1, 0.1, 0.55), (x, 0.28, 0.72), metal))
    export("bench.glb", [join(objs, "bench")])


def planter():
    reset()
    pot = material("pot", (0.5, 0.31, 0.22), roughness=0.9)
    soil = material("soil", (0.2, 0.14, 0.1), roughness=1.0)
    leaf = material("leaf", (0.22, 0.5, 0.26), roughness=0.85)
    objs = [
        cube("pot", (1.0, 1.0, 0.55), (0, 0, 0.275), pot),
        cube("soil", (0.86, 0.86, 0.06), (0, 0, 0.56), soil),
        sphere("bush_a", 0.42, (0, 0, 0.9), leaf, 2, (1, 1, 0.8)),
        sphere("bush_b", 0.3, (0.28, 0.1, 0.78), leaf, 2),
        sphere("bush_c", 0.28, (-0.24, -0.1, 0.8), leaf, 2),
    ]
    export("planter.glb", [join(objs, "planter")])


def traffic_light():
    reset()
    pole = material("pole", (0.16, 0.18, 0.2), metallic=0.65, roughness=0.4)
    housing = material("housing", (0.09, 0.1, 0.11), roughness=0.6)
    red = material("red", (0.8, 0.08, 0.06), emission=(1.0, 0.08, 0.05), strength=2.5)
    yellow = material("yellow", (0.8, 0.6, 0.05), emission=(1.0, 0.7, 0.05), strength=2.5)
    green = material("green", (0.06, 0.7, 0.25), emission=(0.05, 1.0, 0.3), strength=2.5)
    objs = [
        cylinder("tl_base", 0.2, 0.25, (0, 0, 0.125), pole, 10),
        cylinder("tl_pole", 0.09, 3.6, (0, 0, 1.8), pole, 8),
        cube("tl_housing", (0.55, 0.36, 1.5), (0, 0, 3.55), housing),
    ]
    # Separate objects keep their names so Three.js can toggle the lenses.
    lenses = [
        cylinder("light_red", 0.13, 0.08, (0, -0.22, 4.05), red, 12, rot=(math.pi / 2, 0, 0)),
        cylinder("light_yellow", 0.13, 0.08, (0, -0.22, 3.55), yellow, 12, rot=(math.pi / 2, 0, 0)),
        cylinder("light_green", 0.13, 0.08, (0, -0.22, 3.05), green, 12, rot=(math.pi / 2, 0, 0)),
    ]
    export("traffic_light.glb", [join(objs, "traffic_light_body")] + lenses)


def bus_stop():
    reset()
    metal = material("metal", (0.2, 0.22, 0.24), metallic=0.55, roughness=0.45)
    glass = material("glass", (0.5, 0.7, 0.8), metallic=0.1, roughness=0.15)
    roof = material("roof", (0.15, 0.4, 0.48), roughness=0.7)
    sign = material("sign", (0.9, 0.8, 0.3), emission=(1.0, 0.85, 0.25), strength=1.2)
    objs = []
    for x in (-1.6, 1.6):
        objs.append(cube("post", (0.12, 0.12, 2.7), (x, 0.4, 1.35), metal))
    objs.append(cube("roof", (3.8, 1.9, 0.14), (0, 0, 2.75), roof))
    objs.append(cube("back_glass", (3.4, 0.08, 2.1), (0, 0.55, 1.55), glass))
    objs.append(cube("bench_seat", (2.6, 0.5, 0.12), (0, 0.05, 0.55), metal))
    objs.append(cube("sign", (0.7, 0.1, 0.5), (2.1, 0.4, 2.2), sign))
    export("bus_stop.glb", [join(objs, "bus_stop")])


def kiosk():
    reset()
    body = material("body", (0.28, 0.42, 0.35), roughness=0.8)
    trim = material("trim", (0.75, 0.62, 0.3), roughness=0.6, metallic=0.2)
    glass = material("glass", (0.4, 0.6, 0.7), metallic=0.15, roughness=0.15)
    objs = [
        cube("body", (2.4, 1.8, 2.2), (0, 0, 1.1), body),
        cube("counter", (2.6, 0.6, 0.14), (0, -1.0, 1.05), trim),
        cube("window", (1.9, 0.08, 1.0), (0, -0.94, 1.55), glass),
        cube("roof", (2.8, 2.2, 0.18), (0, 0, 2.3), trim),
        cube("sign", (2.0, 0.12, 0.5), (0, -1.02, 2.05), trim),
    ]
    export("kiosk.glb", [join(objs, "kiosk")])


def car(name, body_color, cabin_color, taxi=False):
    reset()
    body = material("body", body_color, metallic=0.45, roughness=0.32)
    cabin = material("cabin", cabin_color, metallic=0.3, roughness=0.18)
    tire = material("tire", (0.05, 0.05, 0.06), roughness=0.95)
    rim = material("rim", (0.62, 0.65, 0.68), metallic=0.8, roughness=0.25)
    light = material("light", (1.0, 0.92, 0.7), emission=(1.0, 0.9, 0.6), strength=2.0)
    tail = material("tail", (0.8, 0.08, 0.06), emission=(1.0, 0.08, 0.05), strength=1.5)
    objs = [
        cube("chassis", (1.8, 3.7, 0.55), (0, 0, 0.62), body),
        cube("hood", (1.7, 1.1, 0.24), (0, -1.35, 0.98), body),
        cube("trunk", (1.7, 0.9, 0.24), (0, 1.35, 0.98), body),
        cube("cabin", (1.55, 1.9, 0.72), (0, 0.1, 1.28), cabin),
        cube("roof", (1.4, 1.5, 0.1), (0, 0.1, 1.68), body),
    ]
    for x in (-0.82, 0.82):
        for y in (-1.2, 1.2):
            objs.append(cylinder("wheel", 0.36, 0.26, (x, y, 0.38), tire, 12, rot=(0, math.pi / 2, 0)))
            objs.append(cylinder("rim", 0.18, 0.28, (x, y, 0.38), rim, 8, rot=(0, math.pi / 2, 0)))
    for x in (-0.6, 0.6):
        objs.append(cube("headlight", (0.32, 0.08, 0.18), (x, -1.86, 0.85), light))
        objs.append(cube("taillight", (0.3, 0.08, 0.16), (x, 1.86, 0.85), tail))
    if taxi:
        objs.append(cube("taxi_sign", (0.6, 0.32, 0.22), (0, 0.1, 1.84), light))
    export(name, [join(objs, name.replace(".glb", ""))])


def van():
    reset()
    body = material("body", (0.85, 0.86, 0.84), metallic=0.25, roughness=0.45)
    stripe = material("stripe", (0.18, 0.5, 0.3), roughness=0.5)
    tire = material("tire", (0.05, 0.05, 0.06), roughness=0.95)
    glass = material("glass", (0.2, 0.3, 0.36), metallic=0.2, roughness=0.2)
    objs = [
        cube("cargo", (1.9, 3.2, 1.7), (0, 0.55, 1.2), body),
        cube("cab", (1.85, 1.5, 1.25), (0, -1.55, 1.0), body),
        cube("windshield", (1.65, 0.1, 0.7), (0, -2.28, 1.3), glass),
        cube("stripe", (1.94, 3.22, 0.22), (0, 0.55, 0.9), stripe),
    ]
    for x in (-0.9, 0.9):
        for y in (-1.55, 0.95):
            objs.append(cylinder("wheel", 0.4, 0.28, (x, y, 0.42), tire, 12, rot=(0, math.pi / 2, 0)))
    export("van.glb", [join(objs, "van")])


def hydrant():
    reset()
    red = material("red", (0.7, 0.12, 0.08), roughness=0.6)
    metal = material("metal", (0.55, 0.55, 0.55), metallic=0.7, roughness=0.35)
    objs = [
        cylinder("body", 0.18, 0.7, (0, 0, 0.35), red, 10),
        sphere("cap", 0.2, (0, 0, 0.72), red, 1),
        cylinder("side", 0.08, 0.5, (0, 0, 0.45), metal, 8, rot=(0, math.pi / 2, 0)),
    ]
    export("hydrant.glb", [join(objs, "hydrant")])


def trash_bin():
    reset()
    body = material("body", (0.16, 0.35, 0.24), roughness=0.8)
    lid = material("lid", (0.1, 0.2, 0.14), roughness=0.7)
    objs = [
        cylinder("bin", 0.32, 0.9, (0, 0, 0.45), body, 12),
        cylinder("lid", 0.36, 0.1, (0, 0, 0.95), lid, 12),
    ]
    export("trash_bin.glb", [join(objs, "trash_bin")])


def main():
    building_residential("building_residential_a.glb", 10, 12, 16, 4, (0.82, 0.74, 0.6), (0.55, 0.42, 0.3), 3)
    building_residential("building_residential_b.glb", 8, 10, 12, 3, (0.64, 0.34, 0.27), (0.4, 0.26, 0.2), 2)
    building_residential("building_residential_c.glb", 12, 11, 19, 5, (0.62, 0.67, 0.7), (0.32, 0.4, 0.45), 4)
    building_commercial("building_commercial_a.glb", 12, 10, 10, 3, (0.5, 0.55, 0.58), (0.85, 0.6, 0.18), 3)
    building_commercial("building_commercial_b.glb", 10, 10, 13, 4, (0.38, 0.44, 0.48), (0.2, 0.65, 0.72), 3)
    shop_shell()
    streetlight()
    tree("tree_a.glb", (0.36, 0.24, 0.14), (0.2, 0.48, 0.24), 4.4, 1.6)
    tree("tree_b.glb", (0.3, 0.2, 0.12), (0.3, 0.55, 0.22), 3.6, 1.25)
    bench()
    planter()
    traffic_light()
    bus_stop()
    kiosk()
    car("car_red.glb", (0.68, 0.12, 0.1), (0.12, 0.14, 0.16))
    car("car_blue.glb", (0.12, 0.28, 0.55), (0.1, 0.12, 0.15))
    car("car_white.glb", (0.86, 0.86, 0.82), (0.15, 0.16, 0.18))
    car("taxi.glb", (0.9, 0.7, 0.08), (0.12, 0.13, 0.15), taxi=True)
    van()
    hydrant()
    trash_bin()
    print("[city-assets] done")


if __name__ == "__main__":
    main()
