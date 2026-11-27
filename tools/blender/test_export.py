import bpy, os, sys

# Clear scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Create a simple armature + mesh
bpy.ops.object.armature_add(location=(0,0,0))
arm = bpy.context.object
arm.name = "Armature"
bpy.ops.object.mode_set(mode='EDIT')
# add a bone
eb = arm.data.edit_bones.new("Hips")
eb.head = (0,0,0); eb.tail = (0,0,1)
bpy.ops.object.mode_set(mode='OBJECT')

# mesh cube
bpy.ops.mesh.primitive_cube_add(location=(0,0,0.5))
mesh = bpy.context.object
mesh.name = "Body"

# parent with auto weights
bpy.ops.object.select_all(action='DESELECT')
mesh.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.parent_set(type='ARMATURE_AUTO')

# Create an action
if not arm.animation_data:
    arm.animation_data_create()
act = bpy.data.actions.new("Idle")
arm.animation_data.action = act
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')
pb = arm.pose.bones["Hips"]
pb.rotation_euler = (0,0,0)
pb.keyframe_insert(data_path="rotation_euler", frame=1)
pb.rotation_euler = (0,0,0.5)
pb.keyframe_insert(data_path="rotation_euler", frame=30)
bpy.ops.object.mode_set(mode='OBJECT')

# Push to NLA
track = arm.animation_data.nla_tracks.new()
track.name = "Idle"
strip = track.strips.new("Idle", 1, act)
strip.action = act

out = r"C:\Users\aihmo\Downloads\test\game 1\fresh-mart\public\models\test_char.glb"
os.makedirs(os.path.dirname(out), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=True, export_nla_strips=True)
print("EXPORTED", out)
print("ACTIONS:", [a.name for a in bpy.data.actions])
