"""Generate the reusable shop fixture kit used by the five FRESH MART neighbours.

Run headless:
  "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe" -b -P tools/build_shop_assets.py

Assets are authored in metres with their origin on the floor. The front of each
fixture faces Blender -Y, which the glTF exporter turns into +Z in Three.js, the
same convention as the existing city models. Each export is a single joined mesh
per material group so instances stay cheap and materials can be shared at runtime.
"""

import math
import os

import bpy

OUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "models", "shops"
)
os.makedirs(OUT_DIR, exist_ok=True)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = "METRIC"


def material(name, color, metallic=0.0, roughness=0.7, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        try:
            mat.blend_method = "BLEND"
        except (AttributeError, TypeError):
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
    print(f"[shop-assets] wrote {name} ({os.path.getsize(filepath)} bytes)")


def common_materials():
    return {
        "wood": material("wood", (0.42, 0.27, 0.16), roughness=0.88),
        "dark_wood": material("dark_wood", (0.24, 0.15, 0.09), roughness=0.9),
        "metal": material("metal", (0.45, 0.5, 0.54), metallic=0.65, roughness=0.35),
        "dark": material("dark", (0.09, 0.11, 0.12), roughness=0.55),
        "cream": material("cream", (0.83, 0.78, 0.67), roughness=0.85),
        "white": material("white", (0.91, 0.92, 0.9), roughness=0.7),
        "glass": material("glass", (0.55, 0.78, 0.84), metallic=0.15, roughness=0.1, alpha=0.4),
        "brass": material("brass", (0.7, 0.56, 0.3), metallic=0.7, roughness=0.3),
    }


def shop_counter():
    reset()
    m = common_materials()
    accent = material("accent", (0.16, 0.34, 0.25), roughness=0.72)
    objs = [
        cube("body", (3.3, 0.82, 0.92), (0, 0, 0.48), m["wood"]),
        cube("kick", (3.2, 0.76, 0.16), (0, 0, 0.08), m["dark_wood"]),
        cube("top", (3.5, 0.98, 0.1), (0, 0, 1.03), m["dark_wood"]),
        cube("front_a", (1.4, 0.035, 0.55), (-0.78, -0.43, 0.52), accent),
        cube("front_b", (1.4, 0.035, 0.55), (0.78, -0.43, 0.52), accent),
        cube("trim", (3.36, 0.05, 0.06), (0, -0.44, 0.84), m["brass"]),
    ]
    for x in (-1.55, 1.55):
        objs.append(cube("post", (0.1, 0.88, 0.98), (x, 0, 0.5), m["dark_wood"]))
    export("shop_counter.glb", [join(objs, "shop_counter")])


def shop_shelf():
    reset()
    m = common_materials()
    accent = material("accent", (0.55, 0.4, 0.24), roughness=0.8)
    w, d, h = 1.8, 0.55, 2.15
    objs = [
        cube("back", (w, 0.06, h), (0, d / 2 - 0.03, h / 2), m["dark_wood"]),
        cube("left", (0.07, d, h), (-w / 2 + 0.035, 0, h / 2), m["wood"]),
        cube("right", (0.07, d, h), (w / 2 - 0.035, 0, h / 2), m["wood"]),
        cube("top", (w, d, 0.07), (0, 0, h - 0.035), m["wood"]),
        cube("plinth", (w, d, 0.12), (0, 0, 0.06), m["dark_wood"]),
    ]
    for z in (0.42, 1.03, 1.64):
        objs.append(cube("shelf", (w - 0.12, d - 0.08, 0.05), (0, -0.01, z), m["wood"]))
        objs.append(cube("lip", (w - 0.1, 0.035, 0.08), (0, -d / 2 + 0.02, z + 0.04), accent))
    objs.append(cube("label_band", (w - 0.14, 0.035, 0.12), (0, -d / 2 - 0.01, h - 0.22), accent))
    export("shop_shelf.glb", [join(objs, "shop_shelf")])


def display_case():
    reset()
    m = common_materials()
    accent = material("accent", (0.5, 0.35, 0.2), roughness=0.75)
    objs = [
        cube("base", (1.7, 0.68, 0.68), (0, 0, 0.34), m["wood"]),
        cube("top_rail", (1.74, 0.72, 0.06), (0, 0, 0.7), accent),
        cube("glass_low", (1.6, 0.6, 0.06), (0, 0, 0.76), m["glass"]),
        cube("glass_box", (1.56, 0.56, 0.56), (0, 0, 1.04), m["glass"]),
        cube("glass_top", (1.68, 0.64, 0.05), (0, 0, 1.35), accent),
        cube("mid_shelf", (1.48, 0.5, 0.03), (0, 0, 1.03), m["glass"]),
    ]
    for x in (-0.78, 0.78):
        objs.append(cube("frame_post", (0.05, 0.62, 0.62), (x, 0, 1.04), m["metal"]))
    export("display_case.glb", [join(objs, "display_case")])


def bakery_oven():
    reset()
    brick = material("brick", (0.48, 0.25, 0.17), roughness=0.92)
    soot = material("soot", (0.11, 0.12, 0.12), roughness=0.6)
    m = common_materials()
    objs = [
        cube("body", (1.7, 0.95, 1.6), (0, 0, 0.8), brick),
        cube("plinth", (1.8, 1.02, 0.14), (0, 0, 0.07), soot),
        cube("top", (1.82, 1.03, 0.12), (0, 0, 1.66), m["dark"]),
        cube("door", (1.22, 0.06, 0.72), (0, -0.5, 0.78), soot),
        cube("window", (0.92, 0.025, 0.48), (0, -0.535, 0.8), material("oven_glass", (0.9, 0.55, 0.2), roughness=0.25)),
        cube("handle", (1.05, 0.07, 0.06), (0, -0.57, 1.05), m["brass"]),
        cube("control", (0.34, 0.04, 0.13), (0.55, -0.52, 1.18), m["metal"]),
        cube("flue", (0.32, 0.32, 1.1), (0.55, 0.24, 2.15), m["dark"]),
        cube("flue_cap", (0.46, 0.46, 0.1), (0.55, 0.24, 2.72), m["metal"]),
    ]
    for i in range(4):
        objs.append(cube("vent", (0.3, 0.03, 0.03), (-0.55 + i * 0.06, -0.53, 0.4), m["brass"]))
    export("bakery_oven.glb", [join(objs, "bakery_oven")])


def cafe_bar():
    reset()
    m = common_materials()
    accent = material("accent", (0.1, 0.28, 0.2), roughness=0.8)
    objs = [
        cube("cabinet", (1.9, 0.78, 0.98), (0, 0, 0.49), accent),
        cube("top", (2.0, 0.86, 0.07), (0, 0, 1.02), m["wood"]),
        cube("kick", (1.84, 0.72, 0.12), (0, 0, 0.06), m["dark"]),
        cube("machine", (0.92, 0.52, 0.5), (-0.2, 0.02, 1.32), m["metal"]),
        cube("machine_top", (0.78, 0.44, 0.12), (-0.2, 0.02, 1.62), m["dark"]),
        cube("group_a", (0.16, 0.18, 0.12), (-0.4, -0.19, 1.13), m["brass"]),
        cube("group_b", (0.16, 0.18, 0.12), (-0.02, -0.19, 1.13), m["brass"]),
        cube("steam_wand", (0.03, 0.03, 0.4), (0.25, -0.25, 1.2), m["metal"]),
        cube("grinder", (0.22, 0.26, 0.42), (0.6, 0.08, 1.27), m["dark"]),
        cylinder("hopper", 0.16, 0.2, (0.6, 0.08, 1.55), m["glass"], 12),
        cube("tray", (0.52, 0.28, 0.03), (0.2, -0.25, 1.08), m["metal"]),
        cube("sign", (0.62, 0.03, 0.22), (-0.2, -0.33, 1.82), m["cream"]),
    ]
    for i, x in enumerate((-0.52, -0.22, 0.08, 0.38)):
        objs.append(cylinder("cup", 0.055, 0.09, (x, -0.3, 1.1), m["white"], 10))
    export("cafe_bar.glb", [join(objs, "cafe_bar")])


def pharmacy_counter():
    reset()
    m = common_materials()
    teal = material("teal", (0.14, 0.38, 0.46), roughness=0.7)
    green = material("green", (0.13, 0.62, 0.36), roughness=0.55)
    objs = [
        cube("base", (1.8, 0.72, 0.98), (0, 0, 0.49), m["white"]),
        cube("kick", (1.72, 0.68, 0.1), (0, 0, 0.05), teal),
        cube("top", (1.92, 0.8, 0.08), (0, 0, 1.02), m["metal"]),
        cube("glass_back", (1.44, 0.05, 0.6), (0, 0.27, 1.38), m["glass"]),
        cube("glass_shelf", (1.42, 0.5, 0.03), (0, 0.02, 1.26), m["glass"]),
        cube("glass_top", (1.5, 0.58, 0.05), (0, 0, 1.7), teal),
        cube("cross_v", (0.12, 0.04, 0.42), (0.65, -0.38, 0.52), green),
        cube("cross_h", (0.42, 0.04, 0.12), (0.65, -0.38, 0.52), green),
        cube("printer", (0.38, 0.3, 0.2), (-0.55, -0.12, 1.13), m["dark"]),
    ]
    for i in range(4):
        objs.append(cylinder("bottle", 0.05, 0.18, (-0.4 + i * 0.28, 0.02, 1.4), m["white"], 8))
    export("pharmacy_counter.glb", [join(objs, "pharmacy_counter")])


def tailor_table():
    reset()
    m = common_materials()
    fabric = material("fabric", (0.48, 0.24, 0.33), roughness=0.92)
    objs = [
        cube("top", (1.95, 0.85, 0.1), (0, 0, 0.9), m["wood"]),
        cube("apron", (1.8, 0.05, 0.55), (0, -0.42, 0.62), m["dark_wood"]),
        cube("machine_base", (0.5, 0.34, 0.12), (-0.38, 0, 1.0), m["dark"]),
        cube("machine_arm", (0.18, 0.32, 0.34), (-0.62, 0, 1.2), m["metal"]),
        cube("machine_head", (0.22, 0.4, 0.14), (-0.2, 0, 1.24), m["metal"]),
        cube("fabric_roll", (0.65, 0.22, 0.22), (0.5, 0.05, 1.02), fabric),
        cylinder("pincushion", 0.11, 0.09, (0.35, -0.24, 1.0), material("pink", (0.7, 0.3, 0.4), roughness=0.9), 12),
        cylinder("thread", 0.055, 0.13, (0.6, -0.22, 1.02), m["brass"], 10),
        cylinder("scissors", 0.03, 0.24, (-0.05, -0.28, 1.0), m["metal"], 6, rot=(0, math.pi / 2, 0)),
    ]
    for x in (-0.82, 0.82):
        for y in (-0.32, 0.32):
            objs.append(cube("leg", (0.09, 0.09, 0.88), (x, y, 0.44), m["dark_wood"]))
    export("tailor_table.glb", [join(objs, "tailor_table")])


def electronics_bench():
    reset()
    m = common_materials()
    cyan = material("cyan", (0.1, 0.55, 0.62), roughness=0.45)
    objs = [
        cube("top", (2.0, 0.8, 0.09), (0, 0, 0.92), m["wood"]),
        cube("shelf", (2.0, 0.7, 0.06), (0, 0.05, 1.48), m["dark"]),
        cube("backboard", (2.0, 0.06, 0.9), (0, 0.38, 1.85), m["dark"]),
        cube("monitor", (0.62, 0.06, 0.4), (-0.28, -0.18, 1.25), m["dark"]),
        cube("screen", (0.54, 0.02, 0.31), (-0.28, -0.22, 1.26), cyan),
        cube("drawer_a", (0.44, 0.5, 0.16), (0.6, 0.08, 0.76), m["metal"]),
        cube("drawer_b", (0.44, 0.5, 0.16), (0.6, 0.08, 0.56), m["metal"]),
        cube("scope", (0.5, 0.32, 0.24), (-0.65, -0.05, 1.1), m["dark"]),
        cube("solder", (0.04, 0.3, 0.04), (0.15, -0.25, 1.02), m["metal"]),
    ]
    for x in (-0.86, 0.86):
        for y in (-0.3, 0.3):
            objs.append(cube("leg", (0.08, 0.08, 0.9), (x, y, 0.45), m["metal"]))
    for i in range(5):
        objs.append(cube("tool", (0.05, 0.04, 0.22), (-0.8 + i * 0.12, 0.35, 1.8), m["metal"]))
    export("electronics_bench.glb", [join(objs, "electronics_bench")])


def cafe_table():
    reset()
    m = common_materials()
    accent = material("accent", (0.16, 0.34, 0.25), roughness=0.72)
    objs = [
        cylinder("top", 0.58, 0.07, (0, 0, 0.76), m["wood"], 20),
        cylinder("stem", 0.06, 0.68, (0, 0, 0.4), m["metal"], 10),
        cylinder("foot", 0.34, 0.06, (0, 0, 0.05), m["metal"], 16),
        cube("menu", (0.26, 0.01, 0.18), (0.16, -0.22, 0.82), m["cream"]),
        cube("card", (0.24, 0.01, 0.16), (0.16, -0.22, 0.85), accent),
    ]
    export("cafe_table.glb", [join(objs, "cafe_table")])


def clothing_rack():
    reset()
    m = common_materials()
    colors = [
        material("cloth_blue", (0.15, 0.23, 0.36), roughness=0.92),
        material("cloth_wine", (0.42, 0.18, 0.25), roughness=0.92),
        material("cloth_cream", (0.76, 0.69, 0.56), roughness=0.92),
        material("cloth_green", (0.17, 0.32, 0.22), roughness=0.92),
        material("cloth_rust", (0.5, 0.27, 0.15), roughness=0.92),
    ]
    objs = [
        cube("bar", (1.95, 0.06, 0.06), (0, 0, 1.7), m["metal"]),
        cube("lower_bar", (1.7, 0.05, 0.05), (0, 0.02, 1.05), m["metal"]),
        cube("bottom", (1.8, 0.5, 0.05), (0, 0, 0.2), m["wood"]),
    ]
    for x in (-0.95, 0.95):
        objs.append(cube("upright", (0.06, 0.06, 1.7), (x, 0, 0.85), m["metal"]))
        objs.append(cube("foot", (0.08, 0.7, 0.07), (x, 0, 0.04), m["metal"]))
    for i in range(5):
        objs.append(
            cube(
                "garment",
                (0.34, 0.42, 0.68),
                (-0.7 + i * 0.35, -0.02, 1.3),
                colors[i],
            )
        )
        objs.append(cube("shoulder", (0.38, 0.08, 0.08), (-0.7 + i * 0.35, -0.02, 1.63), m["metal"]))
    for i in range(3):
        objs.append(cube("folded", (0.4, 0.36, 0.12), (-0.45 + i * 0.45, 0, 0.29), colors[(i + 2) % 5]))
    export("clothing_rack.glb", [join(objs, "clothing_rack")])


def main():
    shop_counter()
    shop_shelf()
    display_case()
    bakery_oven()
    cafe_bar()
    pharmacy_counter()
    tailor_table()
    electronics_bench()
    cafe_table()
    clothing_rack()
    print("[shop-assets] done")


if __name__ == "__main__":
    main()
