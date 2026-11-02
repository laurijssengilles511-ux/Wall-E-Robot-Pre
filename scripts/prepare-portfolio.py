"""Read the team's originals; copy published materials and render actual STL parts.

Never modifies the source directory. The manifest records hashes for provenance.
Uses only numpy/matplotlib for technical previews; no synthetic project photos.
"""
from pathlib import Path
import hashlib, json, re, runpy, shutil, struct, zipfile
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

PROJECT = Path(__file__).resolve().parent.parent
SOURCE = Path(r'D:\桌面\大二秋冬\课内课程\实体、结构与制造\Otto 机器人\瓦力机器人')
PUBLIC = PROJECT / 'public'
OUT = PUBLIC / 'portfolio'
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'previews').mkdir(exist_ok=True)
(OUT / 'documents').mkdir(exist_ok=True)
(OUT / 'models').mkdir(exist_ok=True)

def copy_file(src, relative):
    destination = OUT / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, destination)
    return 'portfolio/' + relative.as_posix()

images = {
    'model-list.png': SOURCE / '瓦力机器人建模文件/建模文件清单.png',
    'print-assignments.png': SOURCE / '瓦力机器人建模文件/打印分工清单.png',
    'circuit.png': SOURCE / '瓦利机器人接线方案/接线图.png',
    'concept-sheet.png': Path(r'C:\Users\hp\AppData\Local\Temp\codex-clipboard-c0e13d42-d29c-404c-8279-ad67fc89586c.png'),
    'concept-blueprint.png': Path(r'C:\Users\hp\AppData\Local\Temp\codex-clipboard-46ffe718-749f-49dd-8f88-828832465aa4.png'),
}
for name, path in images.items(): copy_file(path, Path(name))

documents = []
for path in sorted(SOURCE.rglob('*')):
    if path.suffix.lower() in ['.docx', '.pdf', '.xlsm', '.txt']:
        relative = Path('documents') / path.relative_to(SOURCE)
        documents.append({'name': path.name, 'path': copy_file(path, relative), 'bytes': path.stat().st_size})

# Publish only the two extracted figures used by the current portfolio.
(OUT / 'reference').mkdir(exist_ok=True)
used_reference_figures = {
    '瓦力机器人设计方案-image2.jpeg',
    '瓦力机器人设计方案-image4.jpeg',
}
for path in sorted(SOURCE.rglob('*.docx')):
    with zipfile.ZipFile(path) as archive:
        for name in archive.namelist():
            published_name = path.stem + '-' + Path(name).name
            if name.startswith('word/media/') and published_name in used_reference_figures:
                (OUT / 'reference' / published_name).write_bytes(archive.read(name))

def read_stl(path):
    data = path.read_bytes()
    if len(data) >= 84:
        count = struct.unpack_from('<I', data, 80)[0]
        if 84 + count * 50 == len(data):
            rows = np.frombuffer(data, dtype=np.dtype([('normal','<f4',(3,)),('vertices','<f4',(3,3)),('attribute','<u2')]), offset=84, count=count)
            return rows['vertices'].astype(float)
    values = re.findall(r'vertex\s+([-+\deE.]+)\s+([-+\deE.]+)\s+([-+\deE.]+)', data.decode('ascii'))
    return np.array(values, dtype=float).reshape(-1, 3, 3)

def render_preview(vertices, destination):
    lo, hi = vertices.min(axis=(0,1)), vertices.max(axis=(0,1))
    # Every preview uses the real mesh. No invented missing geometry.
    normals = np.cross(vertices[:,1]-vertices[:,0], vertices[:,2]-vertices[:,0])
    normals /= np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-9)
    direction = np.array([-.4,-.5,.8]); direction /= np.linalg.norm(direction)
    shade = .64 + .36 * np.clip(normals @ direction, 0, 1)
    base = np.array([.72,.66,.49])
    colors = np.column_stack([np.clip(shade[:,None]*base[None,:],0,1),np.ones(len(shade))])
    fig = plt.figure(figsize=(5.2,3.8), dpi=120)
    fig.patch.set_facecolor('#f3f2ed')
    ax=fig.add_subplot(111,projection='3d'); ax.set_facecolor('#f3f2ed')
    mesh=Poly3DCollection(vertices,facecolors=colors,linewidths=0,edgecolors='none',rasterized=True)
    ax.add_collection3d(mesh)
    center=(lo+hi)/2; radius=max((hi-lo).max()/2,1e-5)*1.12
    ax.set_xlim(center[0]-radius,center[0]+radius); ax.set_ylim(center[1]-radius,center[1]+radius); ax.set_zlim(center[2]-radius,center[2]+radius)
    ax.set_box_aspect((1,1,1)); ax.set_proj_type('ortho'); ax.view_init(elev=24,azim=-55); ax.set_axis_off()
    fig.subplots_adjust(0,0,1,1); fig.savefig(destination,facecolor=fig.get_facecolor(),bbox_inches=None,pad_inches=0)
    plt.close(fig)
    return (hi-lo).round(2).tolist()

translations = {
 'body-front-door':'机身前舱门','body-left':'机身左侧板','body-right':'机身右侧板','body-top':'机身顶板',
 'body-neck-servo-holder':'颈部舵机支架','body-front-pins':'前舱门销钉',
 'arm-barrel':'手臂套筒','arm-barrel-end':'套筒端盖','arm-piston':'手臂活塞杆',
 'arm-servo-bracket-left':'左肩舵机支架','arm-servo-bracket-right':'右肩舵机支架',
 'arm-hinge-inner':'手臂内铰链','arm-hinge-outer':'手臂外铰链','arm-hinge-axle':'手臂铰链轴',
 'hand-finger-left':'左侧手指','hand-finger-middle':'中间手指','hand-finger-right':'右侧手指','hand-axle':'手掌转轴','hand-bracket':'手掌支架',
 'head-axle':'头部转轴','eye-camera-replica':'眼部仿摄像头',
 'eye-front-left':'左眼前壳','eye-front-right':'右眼前壳','eye-middle-left':'左眼中壳','eye-middle-right':'右眼中壳','eye-back-left':'左眼后壳','eye-back-right':'右眼后壳',
 'neck-bottom-axle':'颈部底端转轴','neck-bottom-left':'颈部下段左支架','neck-bottom-right':'颈部下段右支架',
 'neck-bottom-linkage':'颈部下连杆','neck-middle-axle':'颈部中间转轴','neck-top':'颈部上段支架',
 'neck-round-bottom':'颈部下圆座','neck-round-top-left':'颈部上圆座（左）','neck-round-top-right':'颈部上圆座（右）',
 'neck-wire-guide-left':'颈部左导线夹','neck-wire-guide-right':'颈部右导线夹','neck-top-linkage':'颈部上连杆',
 'wheel-back':'后轮','wheel-front':'前轮','wheel-top':'上支撑轮','wheel-frame-addon':'轮架附加件',
 'wheel-bracket-inner-left':'左内轮支架','wheel-bracket-inner-right':'右内轮支架',
 'wheel-axle-back':'后轮轴','wheel-axle-notched':'带槽轮轴','wheel-axle-spacer':'轮轴隔套',
 'wheel-gear-driven':'从动齿轮','wheel-gear-motor':'电机驱动齿轮','tread-plate':'履带板','tread-pin':'履带销钉',
}
category_titles={'body':'机身','head':'头部','neck':'颈部','arms':'手臂','wheels':'轮组','treads':'履带'}
models=[]
for index,path in enumerate(sorted(SOURCE.rglob('*.STL'))):
    raw=re.sub(r'^打印\d+件__','',path.stem)
    raw=re.sub(r'（.*?）','',raw)
    canonical=re.sub(r'-x\d+$','',raw)
    category='body' if canonical.startswith('body-') else 'head' if canonical.startswith(('head-','eye-')) else 'neck' if canonical.startswith('neck-') else 'arms' if canonical.startswith(('arm-','hand-')) else 'treads' if canonical.startswith('tread-') else 'wheels'
    count_match=re.match(r'打印(\d+)件',path.name)
    preview=f'previews/{canonical}.png'
    vertices=read_stl(path)
    dims=render_preview(vertices,OUT/preview)
    models.append({'id':canonical,'title':translations.get(canonical,canonical),'category':category,'categoryTitle':category_titles[category],'filename':path.name,'path':copy_file(path,Path('models')/path.relative_to(SOURCE/'瓦力机器人建模文件')),'preview':'portfolio/'+preview,'plannedQuantity':int(count_match[1]) if count_match else 1,'bytes':path.stat().st_size,'triangles':len(vertices),'dimensions':dims,'source':'以电影中的瓦力形象为原型进行建模与设计'})
    print(f'{index+1:02d} {canonical}: {len(vertices)} faces',flush=True)

manifest=[]
for path in sorted(SOURCE.rglob('*')):
    if path.is_file(): manifest.append({'file':path.relative_to(SOURCE).as_posix(),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
(OUT/'source-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(PROJECT/'src/content/catalog.json').write_text(json.dumps({'models':models,'documents':documents},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Prepared {len(models)} real model previews, {len(documents)} original documents; source unchanged.')
runpy.run_path(str(PROJECT / 'scripts/prepare-model-inventory.py'))
