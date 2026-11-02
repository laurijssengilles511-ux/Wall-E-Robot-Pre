"""Read-only inspection of connected mesh islands in the saved display assembly."""
from pathlib import Path
import bpy
import json
from mathutils import Vector

root = Path(__file__).resolve().parent.parent
bpy.ops.wm.open_mainfile(filepath=str(root / 'models/virtual/walle-assembled.blend'))
for name in ['neck-bottom-left', 'neck-bottom-right', 'neck-top', 'neck-round-top-left', 'eye-front-left', 'eye-middle-left', 'eye-back-left']:
    obj = bpy.data.objects.get(name)
    mesh = obj.data
    adjacency = [set() for _ in mesh.vertices]
    for edge in mesh.edges:
        a, b = edge.vertices
        adjacency[a].add(b); adjacency[b].add(a)
    seen, islands = set(), []
    for vertex in mesh.vertices:
        if vertex.index in seen:
            continue
        stack, island = [vertex.index], []
        while stack:
            i = stack.pop()
            if i in seen:
                continue
            seen.add(i); island.append(i)
            stack.extend(adjacency[i] - seen)
        if len(island) < 8:
            continue
        coords = [mesh.vertices[i].co for i in island]
        lo = Vector([min(v[k] for v in coords) for k in range(3)])
        hi = Vector([max(v[k] for v in coords) for k in range(3)])
        islands.append({'vertices':len(island), 'center':list((lo+hi)/2), 'size':list(hi-lo)})
    print('ISLANDS', name, json.dumps(sorted(islands, key=lambda x:-x['vertices'])[:12]), flush=True)
