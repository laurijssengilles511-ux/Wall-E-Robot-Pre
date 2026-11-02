"""Rebuild the display assembly without changing any original STL.

Run: blender --background --factory-startup --python scripts/build-virtual-model.py
Optional: -- --preview-only (load the saved assembly and render its views).
Coordinates during assembly are millimetres: X right, Y back, Z up.
This is a visual reconstruction, not a mechanically validated CAD assembly.
"""
from pathlib import Path
import bpy
import math
import json
import sys
import hashlib
import numpy as np
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path(r'D:\桌面\大二秋冬\课内课程\实体、结构与制造\Otto 机器人\瓦力机器人\瓦力机器人建模文件')
OUT = ROOT / 'public' / 'portfolio' / 'virtual'
WORK = ROOT / 'models' / 'virtual'
OUT.mkdir(parents=True, exist_ok=True)
WORK.mkdir(parents=True, exist_ok=True)
CATALOG = json.loads((ROOT / 'src/content/catalog.json').read_text(encoding='utf-8'))['models']
INVENTORY = json.loads((ROOT / 'src/content/model-inventory.json').read_text(encoding='utf-8'))
RIG_SPEC = json.loads((ROOT / 'src/content/robot-rig.json').read_text(encoding='utf-8'))
SOURCES = {}
TEMPLATES = {}
MATERIALS = {}


def group(name):
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def move_to(obj, collection):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    collection.objects.link(obj)


def material(name, color, metal=0.0, rough=.6, image=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Roughness'].default_value = rough
    if image:
        tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = image
        mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    mat.diffuse_color = (*color, 1)
    MATERIALS[name] = mat
    return mat


def bake_finishes():
    """Bake the procedural wear mask once; exported finishes use only image textures."""
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 8
    bpy.ops.mesh.primitive_plane_add(size=2)
    plane = bpy.context.object
    mat = bpy.data.materials.new('Bake source • subtle paint wear')
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    uv = nodes.new('ShaderNodeTexCoord')
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 35
    noise.inputs['Detail'].default_value = 3
    links.new(uv.outputs['UV'], noise.inputs['Vector'])
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = .25
    ramp.color_ramp.elements[0].color = (.27, .27, .27, 1)
    ramp.color_ramp.elements[1].position = .6
    ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    mask = bpy.data.images.new('Baked wear mask', width=512, height=512, alpha=False)
    target = nodes.new('ShaderNodeTexImage')
    target.image = mask
    nodes.active = target
    plane.data.materials.append(mat)
    scene.render.bake.use_pass_direct = False
    scene.render.bake.use_pass_indirect = False
    scene.render.bake.use_pass_color = True
    bpy.ops.object.bake(type='DIFFUSE')
    pixels = np.array(mask.pixels[:], dtype=np.float32).reshape(512, 512, 4)
    wear = np.clip(pixels[:, :, 0], 0, 1)
    # Keep the wear deliberately restrained; a few narrow streaks imply handling.
    rng = np.random.default_rng(42)
    streaks = np.ones((512, 512), dtype=np.float32)
    for _ in range(35):
        x, y = rng.integers(0, 500, size=2)
        streaks[y:y + int(rng.integers(6, 35)), x:x + 1] = .72
    wear *= streaks
    finishes = [
        ('ochre', (.48, .29, .025), (.14, .085, .018), .28, .64),
        ('track', (.07, .085, .091), (.035, .042, .044), .25, .81),
        ('metal', (.37, .39, .37), (.17, .16, .13), .72, .4),
        ('neck', (.38, .25, .115), (.15, .11, .065), .58, .55),
    ]
    for name, clean, dirty, metal, rough in finishes:
        factor = (.78 + .22 * wear)[:, :, None]
        if name == 'ochre':
            factor = (.61 + .39 * wear)[:, :, None]
        colors = np.array(clean)[None, None, :] * factor + np.array(dirty)[None, None, :] * (1 - factor)
        result = np.ones((512, 512, 4), dtype=np.float32)
        result[:, :, :3] = colors
        image = bpy.data.images.new(f'{name} • baked finish', 512, 512, alpha=False)
        image.pixels.foreach_set(result.ravel())
        image.filepath_raw = str(OUT / f'{name}-basecolor.png')
        image.file_format = 'PNG'
        image.save()
        image.pack()
        material(name, clean, metal, rough, image)
    bpy.data.objects.remove(plane, do_unlink=True)
    bpy.data.materials.remove(mat)
    bpy.data.images.remove(mask)
    material('lens', (.012, .028, .05), .5, .12)
    material('black', (.016, .022, .027), .3, .5)
    material('label', (.7, .68, .56), .15, .66)
    material('red', (.44, .045, .026), .25, .6)


def uv_mesh(obj):
    if obj.type != 'MESH' or obj.data.uv_layers:
        return
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.015)
    bpy.ops.object.mode_set(mode='OBJECT')


def load_template(model_id):
    if model_id in TEMPLATES:
        return TEMPLATES[model_id]
    record = next(x for x in CATALOG if x['id'] == model_id)
    relative = Path(record['path'].replace('portfolio/models/', ''))
    path = SOURCE / relative
    if not path.exists():
        path = ROOT / 'public' / record['path']
    if not path.exists():
        path = ROOT / 'dist' / record['path']
    bpy.ops.wm.stl_import(filepath=str(path))
    obj = bpy.context.object
    coords = np.array([v.co[:] for v in obj.data.vertices])
    center = (coords.min(axis=0) + coords.max(axis=0)) / 2
    for v in obj.data.vertices:
        v.co -= Vector(center)
    uv_mesh(obj)
    # STL flat triangles are welded before smooth shading so cylinders read as cylinders.
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=.001)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    for p in obj.data.polygons:
        p.use_smooth = False
    mesh = obj.data
    bpy.data.objects.remove(obj, do_unlink=True)
    TEMPLATES[model_id] = mesh
    SOURCES[model_id] = {'id': model_id, 'source': str(path.relative_to(SOURCE)) if path.is_relative_to(SOURCE) else record['path'], 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'instances': 0}
    return mesh


def part(model_id, location, rotation=(0, 0, 0), finish='ochre', collection=None, label=None):
    mesh = load_template(model_id)
    obj = bpy.data.objects.new(label or model_id, mesh)
    (collection or BODY).objects.link(obj)
    obj.location = location
    obj.rotation_euler = tuple(math.radians(x) for x in rotation)
    # Material override is per object, keeping repeated meshes shared in GLB.
    if not mesh.materials:
        mesh.materials.append(MATERIALS[finish])
    obj.material_slots[0].link = 'OBJECT'
    obj.material_slots[0].material = MATERIALS[finish]
    obj['source_id'] = model_id
    obj['provenance'] = 'original STL; display placement inferred'
    SOURCES[model_id]['instances'] += 1
    return obj


def tag(obj, kind, description):
    obj['provenance'] = kind
    obj['description'] = description
    return obj


def box(name, location, size, finish='ochre', bevel=0, collection=None, kind='display detail'):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('Edge highlights', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.data.materials.append(MATERIALS[finish])
    move_to(obj, collection or BODY)
    return tag(obj, kind, name)


def cylinder(name, location, radius, depth, finish='metal', rotation=(0, 0, 0), collection=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=radius, depth=depth, location=location, rotation=tuple(math.radians(x) for x in rotation))
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(MATERIALS[finish])
    move_to(obj, collection or BODY)
    for p in obj.data.polygons:
        p.use_smooth = len(p.vertices) == 4
    return tag(obj, 'display detail', name)


def line_cylinder(name, a, b, radius, finish, collection):
    a, b = Vector(a), Vector(b)
    obj = cylinder(name, (a + b) / 2, radius, (b - a).length, finish, collection=collection)
    obj.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
    return obj


def label(text, location, size, finish='black', rotation=(90, 0, 0), collection=None):
    curve = bpy.data.curves.new(text, 'FONT')
    curve.body = text
    curve.size = size
    curve.align_x = 'CENTER'
    curve.align_y = 'CENTER'
    curve.extrude = .12
    obj = bpy.data.objects.new('Graphic • ' + text, curve)
    (collection or BODY).objects.link(obj)
    obj.location = location
    obj.rotation_euler = tuple(math.radians(x) for x in rotation)
    obj.data.materials.append(MATERIALS[finish])
    tag(obj, 'display detail', 'Decorative lettering; not source geometry')
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    return obj


def assemble_body():
    # Side plates retain their native 17 x 143 x 162.7 dimensions.
    part('body-left', (-69, 0, 165.35), collection=BODY)
    part('body-right', (69, 0, 165.35), rotation=(0, 0, 180), collection=BODY)
    # The top STL was exported standing on its edge: its original Y becomes Z.
    part('body-top', (0, 0, 230), rotation=(90, 0, 0), finish='track', collection=BODY)
    box('Top deck infill • display detail', (0, 0, 241), (136, 127, 3), 'track', 1, BODY)
    box('body-bottom • inferred', (0, 0, 85), (138, 136, 5), 'track', 1, BODY, 'inferred missing part')
    box('body-back • inferred', (0, 68.5, 163), (138, 5, 154), 'ochre', 1, BODY, 'inferred missing part')
    # A frame rather than a solid slab leaves a real opening behind the moving door.
    for suffix, location, size in [
        ('upper', (0, -69, 212.5), (138, 5, 57)),
        ('lower', (0, -69, 96.5), (138, 5, 19)),
        ('left', (-63.5, -69, 145), (11, 5, 78)),
        ('right', (63.5, -69, 145), (11, 5, 78)),
    ]:
        box('body-front • inferred ' + suffix, location, size, 'ochre', 1, BODY, 'inferred missing part')
    part('body-front-door', (0, -76.5, 145), rotation=(90, 0, 0), collection=BODY)
    part('body-front-pins', (-58, -70, 103), rotation=(0, 90, 0), finish='metal', collection=BODY)
    part('body-front-pins', (58, -70, 103), rotation=(0, 90, 0), finish='metal', collection=BODY)
    # Upper dark equipment band and small optical panel are appearance details.
    box('Upper instrument band', (0, -73, 220), (140, 7, 38), 'track', 1, BODY)
    box('Instrument surround', (-23, -78, 222), (42, 5, 28), 'metal', 1, BODY)
    for z in (217, 223, 229):
        for x in (-35, -26, -17):
            box('Instrument slot', (x, -81, z), (5, 1, 2), 'black', .3, BODY)
    box('Instrument switch', (27, -78, 218), (23, 4, 23), 'black', 1, BODY)
    box('Instrument indicator', (27, -80.5, 222), (12, 1, 3), 'label', .4, BODY)
    # Side panel corner bumpers and back service vents.
    for side in (-1, 1):
        for y in (-67, 67):
            box('Corner guard', (side * 71, y, 101), (12, 12, 24), 'track', 1, BODY)
        box('Rear corner trim', (side * 68, 72, 180), (12, 6, 95), 'track', 1, BODY)
    for z in range(178, 214, 7):
        box('Back vent', (0, 72, z), (74, 2, 3), 'black', .5, BODY)
    box('Nameplate background', (16, -87, 114), (82, 2, 18), 'ochre', 1, BODY)
    label('WALL', (10, -88.3, 114), 12, 'black')
    box('Red E badge', (49, -88.4, 114), (15, 1.5, 16), 'red', 2, BODY)
    label('E', (49, -89.3, 114), 12, 'label')


def assemble_tracks():
    # Closed belt around three sprocket contact circles in the YZ plane.
    # Equally spaced links follow the exact convex offset of the wheel centres.
    wheel_centres = [Vector((-53, 26)), Vector((47, 37)), Vector((38, 91))]
    radii = [21, 34, 14]
    # Compute the convex hull of sampled wheel surfaces, then a closed arc-length path.
    points = []
    for c, r in zip(wheel_centres, radii):
        for j in range(120):
            a = j * math.tau / 120
            points.append((c.x + (r + 5) * math.cos(a), c.y + (r + 5) * math.sin(a)))
    points = sorted(set(points))
    def cross(o, a, b):
        return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
    lower, upper = [], []
    for p in points:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(points):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    hull = [Vector(p) for p in lower[:-1] + upper[:-1]]
    lengths = [(hull[(i+1) % len(hull)] - p).length for i, p in enumerate(hull)]
    total = sum(lengths)
    # 35 plates per side matches the original print list (70 plates / 140 pins).
    for side in (-1, 1):
        collection = TRACK_L if side < 0 else TRACK_R
        x = side * 108
        for model, c, count in [('wheel-front', wheel_centres[0], 2), ('wheel-back', wheel_centres[1], 2)]:
            for layer in (-1, 1):
                part(model, (x + layer * 21, c.x, c.y), rotation=(0, 90, 0), finish='track', collection=collection)
        for j in range(4):
            y, z = (0, 72) if j < 2 else (38, 91)
            part('wheel-top', (x + (-21 if j % 2 else 21), y, z), rotation=(0, 90, 0), finish='track', collection=collection)
        # Missing wheel frames are deliberately named and tracked as inferred parts.
        for layer in (-1, 1):
            name = ('wheel-frame' if layer == -1 else 'wheel-bracket-outer') + ('-left' if side < 0 else '-right')
            # Three connecting struts form a closed triangular wheel frame.
            vertices, faces = [], []
            outer = [Vector((-53, 26)), Vector((47, 37)), Vector((38, 91))]
            centre = sum(outer, Vector((0, 0))) / 3
            inner = [centre + (p - centre) * .55 for p in outer]
            for offset in (-2.5, 2.5):
                vertices.extend([(x + layer * 15 + offset, p.x, p.y) for p in outer + inner])
            for j in range(3):
                k = (j + 1) % 3
                faces.extend([(j, k, k+3, j+3), (j+6, j+9, k+9, k+6), (j, j+6, k+6, k), (j+3, k+3, k+9, j+9)])
            mesh = bpy.data.meshes.new(name)
            mesh.from_pydata(vertices, [], faces); mesh.update()
            support = bpy.data.objects.new(name + ' • inferred', mesh)
            collection.objects.link(support)
            mesh.materials.append(MATERIALS['track'])
            uv_mesh(support)
            tag(support, 'inferred missing part', name)
        part('wheel-bracket-inner-left' if side < 0 else 'wheel-bracket-inner-right', (side * 79, 4, 65), finish='track', collection=collection)
        part('wheel-frame-addon', (side * 80, 2, 82), rotation=(0, 90, 0), finish='track', collection=collection)
        part('wheel-axle-back', (x, 47, 37), rotation=(0, 90, 0), finish='metal', collection=collection)
        for y, z in [(-53, 26), (38, 91), (4, 91)]:
            part('wheel-axle-notched', (x, y, z), rotation=(0, 90, 0), finish='metal', collection=collection)
        for c in wheel_centres[:2]:
            for layer in (-1, 1):
                part('wheel-axle-spacer', (x + layer * 27, c.x, c.y), rotation=(0, 90, 0), finish='metal', collection=collection)
        part('wheel-gear-driven', (side * 78, 47, 37), finish='metal', collection=collection)
        part('wheel-gear-motor', (side * 78, 9, 48), finish='metal', collection=collection)
        for j in range(35):
            distance = (j + .5) * total / 35
            k = 0
            while distance > lengths[k]:
                distance -= lengths[k]
                k += 1
            tangent = (hull[(k + 1) % len(hull)] - hull[k]).normalized()
            p = hull[k] + tangent * distance
            angle = math.atan2(tangent.y, tangent.x)
            part('tread-plate', (x, p.x, p.y), rotation=(math.degrees(angle) - 90, 0, 0), finish='track', collection=collection)
            for layer in (-1, 1):
                # Pin local Y is its narrow axis, oriented across the belt.
                pin = part('tread-pin', (x + layer * 28, p.x, p.y), finish='track', collection=collection)
                pin.rotation_euler = Matrix(((0, 1, 0), (tangent.x, 0, tangent.y), (tangent.y, 0, -tangent.x))).to_euler()
        # Small exposed wheel hubs improve legibility without replacing source wheels.
        for c, r in zip(wheel_centres, radii):
            cylinder('Wheel hub', (x + side * 28, c.x, c.y), r * .25, 2.5, 'metal', rotation=(0, 90, 0), collection=collection)


def assemble_neck_head():
    part('body-neck-servo-holder', (0, 0, 246), finish='track', collection=NECK)
    part('neck-round-bottom', (0, -1, 254), rotation=(0, 90, 0), finish='neck', collection=NECK)
    part('neck-bottom-axle', (0, -1, 254), rotation=(0, 90, 0), finish='metal', collection=NECK)
    # Side fork pieces flank the same plane and lean toward the face.
    for side in (-1, 1):
        # In the source XY outline, the small round base is at (81, 51)
        # and the upper bearing at (21, 51): rotate source X vertically.
        part('neck-bottom-left' if side < 0 else 'neck-bottom-right', (side * 12, -18, 287), rotation=(0, 90, 0), finish='neck', collection=NECK)
    linkage = part('neck-bottom-linkage', (0, 2, 291), finish='metal', collection=NECK)
    linkage.rotation_euler = Vector((1, 0, 0)).rotation_difference(Vector((0, 0, 1))).to_euler()
    part('neck-middle-axle', (0, -21, 303), rotation=(0, 90, 0), finish='metal', collection=NECK)
    part('neck-top', (0, -23, 321), rotation=(0, 0, 0), finish='neck', collection=NECK)
    linkage = part('neck-top-linkage', (0, -5, 322), finish='metal', collection=NECK)
    linkage.rotation_euler = Vector((0, 1, 0)).rotation_difference(Vector((0, -11, 30)).normalized()).to_euler()
    for side in (-1, 1):
        part('neck-round-top-left' if side < 0 else 'neck-round-top-right', (side * 13, -24, 336), rotation=(0, 90, 0), finish='neck', collection=NECK)
        part('neck-wire-guide-left' if side < 0 else 'neck-wire-guide-right', (side * 20, -4, 290), finish='track', collection=NECK)
    part('head-axle', (0, -24, 344), rotation=(0, 90, 0), finish='metal', collection=HEAD)
    box('head-center • inferred', (0, -20, 346), (29, 33, 28), 'metal', 4, HEAD, 'inferred missing part')
    for side in (-1, 1):
        suffix = 'left' if side < 0 else 'right'
        # All three STL eye sections have different print orientations. Keep shells
        # as independently named objects; align the long middle section to depth.
        part('eye-front-' + suffix, (side * 43, -54, 365), rotation=(90, 0, 0 if side < 0 else 0), finish='metal', collection=HEAD)
        part('eye-middle-' + suffix, (side * 43, -8, 364), rotation=(90, 0, 0), finish='neck', collection=HEAD)
        part('eye-back-' + suffix, (side * 43, 36, 362), rotation=(90, 0, 0), finish='track', collection=HEAD)
        part('eye-camera-replica', (side * 43, -57, 365), rotation=(90, 0, 0), finish='black', collection=HEAD)
        cylinder('Lens rim ' + suffix, (side * 43, -77, 367), 23.5, 4, 'black', rotation=(90, 0, 0), collection=HEAD)
        cylinder('Lens retaining ring ' + suffix, (side * 43, -80, 367), 21.3, 2, 'metal', rotation=(90, 0, 0), collection=HEAD)
        # Dark glossy convex lens: no transmission requirement on the webpage.
        bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=20, radius=1, location=(side * 43, -82.5, 367))
        lens = bpy.context.object
        lens.name = 'Optical glass ' + suffix
        lens.scale = (19.6, 5, 19.6)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        lens.data.materials.append(MATERIALS['lens'])
        for p in lens.data.polygons:
            p.use_smooth = True
        move_to(lens, HEAD)
        tag(lens, 'display detail', 'Lens appearance inferred from reference photograph')


def assemble_arms():
    for side in (-1, 1):
        collection = ARM_L if side < 0 else ARM_R
        suffix = 'left' if side < 0 else 'right'
        shoulder = Vector((side * 85, 0, 206))
        wrist = Vector((side * 99, -47, 247))
        direction = (wrist - shoulder).normalized()
        rotation = Vector((0, 0, 1)).rotation_difference(direction)
        part('arm-servo-bracket-' + suffix, (side * 73, 0, 206), rotation=(0, 90, 0), finish='track', collection=collection)
        barrel = part('arm-barrel', (shoulder + wrist) / 2, finish='ochre', collection=collection)
        barrel.rotation_euler = rotation.to_euler()
        piston = part('arm-piston', (shoulder + wrist) / 2 + direction * 12, finish='metal', collection=collection)
        piston.rotation_euler = rotation.to_euler()
        end = part('arm-barrel-end', wrist - direction * 9, finish='metal', collection=collection)
        end.rotation_euler = rotation.to_euler()
        part('arm-hinge-inner', shoulder, rotation=(0, 90, 0), finish='neck', collection=collection)
        part('arm-hinge-outer', shoulder + Vector((side * 4, 0, 0)), rotation=(0, 90, 0), finish='ochre', collection=collection)
        part('arm-hinge-axle', shoulder + Vector((side * 7, 0, 0)), rotation=(0, 90, 0), finish='metal', collection=collection)
        cylinder('Shoulder cap', shoulder + Vector((side * 17, 0, 0)), 9, 3, 'metal', rotation=(0, 90, 0), collection=collection)
        part('hand-bracket', wrist + Vector((0, -9, 10)), rotation=(90, 0, 0), finish='metal', collection=collection)
        part('hand-axle', wrist + Vector((0, -8, 12)), rotation=(0, 90, 0), finish='metal', collection=collection)
        for model, dx, dz in [('hand-finger-left', -17, 0), ('hand-finger-middle', 0, 3), ('hand-finger-right', 17, 0)]:
            part(model, wrist + Vector((dx, -21, 32 + dz)), rotation=(65, 0, 0), finish='metal', collection=collection)


def setup_scene():
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 1200
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.world.color = (.24, .24, .24)
    scene.world.use_nodes = True
    bg = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (.75, .77, .8, 1)
    bg.inputs['Strength'].default_value = .35
    scene.view_settings.view_transform = 'AgX'
    bpy.ops.mesh.primitive_plane_add(size=20000, location=(0, 0, -.5))
    floor = bpy.context.object
    floor.name = 'Studio floor • preview only'
    floor.data.materials.append(material('studio', (.72, .73, .7), 0, .85))
    move_to(floor, STUDIO)
    for name, pos, power, size, color in [
        ('Key', (-400, -500, 700), 9000000, 450, (1, .96, .86)),
        ('Fill', (400, -250, 450), 4500000, 350, (.8, .88, 1)),
        ('Rim', (120, 400, 600), 11000000, 320, (1, .96, .85)),
    ]:
        data = bpy.data.lights.new(name, 'AREA')
        data.energy = power
        data.shape = 'DISK'
        data.size = size
        data.color = color
        obj = bpy.data.objects.new(name, data)
        STUDIO.objects.link(obj)
        obj.location = pos
        obj.rotation_euler = (Vector((0, 0, 180)) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    camera = bpy.data.objects.new('Review camera', bpy.data.cameras.new('Review camera'))
    STUDIO.objects.link(camera)
    scene.camera = camera
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 480
    camera.data.clip_end = 10000
    camera.location = (570, -850, 470)
    camera.rotation_euler = (Vector((0, 0, 198)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                area.spaces.active.clip_end = 50000
                area.spaces.active.region_3d.view_location = (0, 0, 198)
                area.spaces.active.region_3d.view_distance = 650
                area.spaces.active.region_3d.view_rotation = camera.rotation_euler.to_quaternion()
                area.spaces.active.shading.color_type = 'MATERIAL'


def render_views():
    scene = bpy.context.scene
    camera = scene.camera
    target = Vector((0, 0, 198))
    for name, position in [('poster', (570, -850, 470)), ('front', (0, -1000, 290)), ('side', (1000, 0, 290)), ('back', (0, 1000, 290))]:
        camera.location = position
        camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = str(OUT / f'{name}.png')
        bpy.ops.render.render(write_still=True)
        print('Rendered', name, flush=True)


def rig_model():
    """Keep the rest assembly intact while adding editable joint parent frames."""
    collections = {'body': BODY, 'neck': NECK, 'head': HEAD, 'armLeft': ARM_L, 'armRight': ARM_R}
    all_meshes = [o for c in (BODY, TRACK_L, TRACK_R, NECK, HEAD, ARM_L, ARM_R) for o in c.objects if o.type == 'MESH']
    nodes = {}
    for spec in RIG_SPEC['nodes']:
        node = bpy.data.objects.new(spec['name'], None)
        node.empty_display_type = 'ARROWS'
        node.empty_display_size = 12
        RIG.objects.link(node)
        node.location = spec['pivotMm']
        node['provenance'] = RIG_SPEC['note']
        bpy.context.view_layer.update()
        if spec['parent']:
            world = node.matrix_world.copy()
            node.parent = nodes[spec['parent']]
            node.matrix_world = world
        nodes[spec['name']] = node
        candidates = all_meshes if spec['collection'] == 'all' else list(collections[spec['collection']].objects)
        selected = []
        for obj in candidates:
            source = obj.get('source_id', '')
            if 'sourceIds' in spec and source not in spec['sourceIds'] and obj.name not in spec.get('includeNames', []):
                continue
            if source in spec.get('excludeSourceIds', []) or obj.name in spec.get('excludeNames', []):
                continue
            selected.append(obj)
        if not selected:
            raise RuntimeError('Empty joint: ' + spec['name'])
        bpy.context.view_layer.update()
        for obj in selected:
            world = obj.matrix_world.copy()
            obj.parent = node
            obj.matrix_world = world
        bpy.context.view_layer.update()


def prepare_drive_rig():
    """Tag original moving meshes; export the same closed belt used in assembly."""
    points = []
    for y, z, radius in [(-53, 26, 26), (47, 37, 39), (38, 91, 19)]:
        for j in range(120):
            angle = j * math.tau / 120
            points.append((y + radius * math.cos(angle), z + radius * math.sin(angle)))
    points = sorted(set(points))
    def cross(o, a, b):
        return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
    lower, upper = [], []
    for p in points:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(points):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    hull = [Vector(p) for p in lower[:-1] + upper[:-1]]
    lengths = [(hull[(i+1) % len(hull)] - p).length for i, p in enumerate(hull)]
    total = sum(lengths)
    samples = []
    for j in range(35):
        distance = (j + .5) * total / 35
        remaining, index = distance, 0
        while remaining > lengths[index]:
            remaining -= lengths[index]; index += 1
        tangent = (hull[(index + 1) % len(hull)] - hull[index]).normalized()
        point = hull[index] + tangent * remaining
        samples.append((distance, point, math.atan2(tangent.y, tangent.x)))
    for side, collection in [('left', TRACK_L), ('right', TRACK_R)]:
        for obj in collection.objects:
            source = obj.get('source_id')
            if source in ['tread-plate', 'tread-pin']:
                point = obj.matrix_world.translation
                distance, _, angle = min(samples, key=lambda sample: (sample[1] - Vector((point.y, point.z))).length)
                obj['drive_kind'] = 'link'
                obj['drive_phase_mm'] = distance
                obj['drive_angle_rad'] = angle
                obj['drive_side'] = side
            elif source in ['wheel-front', 'wheel-back', 'wheel-top', 'wheel-gear-driven', 'wheel-gear-motor'] or obj.name.startswith('Wheel hub'):
                radius = {'wheel-front': 21, 'wheel-back': 34, 'wheel-top': 14, 'wheel-gear-driven': 27, 'wheel-gear-motor': 18}.get(source, 14)
                obj['drive_kind'] = 'wheel'
                obj['drive_radius_mm'] = radius
                obj['drive_side'] = side
    # JS samples the serialized float coordinates with double precision.
    exported_length = sum(math.hypot(hull[(i+1) % len(hull)].x - p.x, hull[(i+1) % len(hull)].y - p.y) for i, p in enumerate(hull))
    (OUT / 'drive-rig.json').write_text(json.dumps({'version': 1, 'pathMm': [list(p) for p in hull], 'totalMm': exported_length, 'trackWidthM': .216}, indent=2), encoding='utf-8')


def export():
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.object.select_all(action='DESELECT')
    objects = [obj for collection in (BODY, TRACK_L, TRACK_R, NECK, HEAD, ARM_L, ARM_R) for obj in collection.objects if obj.type == 'MESH']
    for obj in objects:
        obj.select_set(True)
    for node in RIG.objects:
        node.select_set(True)
    # Scale at the hierarchy root exactly once; scaling every child would collapse it.
    root = bpy.data.objects['joint_bodyYaw']
    root.scale *= .001
    bpy.context.view_layer.update()
    bpy.ops.export_scene.gltf(filepath=str(OUT / 'walle-assembled.glb'), export_format='GLB', use_selection=True, export_yup=True, export_extras=True, export_materials='EXPORT', export_cameras=False, export_lights=False)
    root.scale *= 1000
    bpy.context.view_layer.update()
    report = {
        'title': '瓦力整机虚拟装配',
        'status': '展示用重建，未经实体装配与机构运动验证',
        'sourceUnitsAssumed': 'millimetres', 'exportUnits': 'metres',
        'reference': '用户提供的实物照片为造型主参考；两张概念图辅助配色',
        'sources': list(SOURCES.values()),
        'missingParts': [{'id': x['id'], 'title': x['title'], 'status': '展示用推定零件'} for x in INVENTORY if x['id'] not in {m['id'] for m in CATALOG}],
        'displayDetails': ['镜片与固定环', '面板仪表与通风槽', '文字标识', '轮毂与肩部端盖'],
        'assemblyNote': '保留原始零件尺寸；位置、方向、眼部轴线和履带路径按参考外观推定。履带按清单使用70块履带板和140个销钉。内部电子器件未装配。',
        'objects': len(objects),
        'rigVersion': RIG_SPEC['version'],
        'jointNodes': [n['name'] for n in RIG_SPEC['nodes']],
        'motionNote': RIG_SPEC['note'],
        'driveRig': 'drive-rig.json',
        'triangles': sum(len(p.vertices) - 2 for obj in objects for p in obj.data.polygons),
        'textureNote': 'Cycles烘焙磨损蒙版，生成四种基础色贴图；GLB内嵌贴图，无在线素材依赖。',
    }
    (OUT / 'assembly-record.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.scene.unit_settings.scale_length = .001
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.wm.save_as_mainfile(filepath=str(WORK / 'walle-assembled.blend'))
    print('ASSEMBLY', json.dumps({'objects': len(objects), 'sourceKinds': len(SOURCES), 'triangles': report['triangles']}), flush=True)


if '--drive-rig-only' in sys.argv:
    bpy.ops.wm.open_mainfile(filepath=str(WORK / 'walle-assembled.blend'))
    BODY, TRACK_L, TRACK_R, NECK, HEAD, ARM_L, ARM_R, RIG = [bpy.data.collections[name] for name in ['01 • Body', '02 • Left track', '03 • Right track', '04 • Neck', '05 • Head', '06 • Left arm', '07 • Right arm', '00 • Motion joints']]
    SOURCES = {item['id']: item for item in json.loads((OUT / 'assembly-record.json').read_text(encoding='utf-8'))['sources']}
    prepare_drive_rig()
    export()
elif '--preview-only' in sys.argv:
    bpy.ops.wm.open_mainfile(filepath=str(WORK / 'walle-assembled.blend'))
    render_views()
else:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    BODY = group('01 • Body')
    RIG = group('00 • Motion joints')
    TRACK_L = group('02 • Left track')
    TRACK_R = group('03 • Right track')
    NECK = group('04 • Neck')
    HEAD = group('05 • Head')
    ARM_L = group('06 • Left arm')
    ARM_R = group('07 • Right arm')
    STUDIO = group('Studio • excluded from GLB')
    bake_finishes()
    assemble_body()
    assemble_tracks()
    assemble_neck_head()
    assemble_arms()
    rig_model()
    prepare_drive_rig()
    setup_scene()
    export()
    render_views()
