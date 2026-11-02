"""Build the complete parts index from the three published print lists."""
from pathlib import Path
import json
import re

project = Path(__file__).resolve().parent.parent
content = project / 'src/content'
catalog_path = content / 'catalog.json'
catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
models = {model['id']: model for model in catalog['models']}
additional_parts = {
    'body-back': ('机身后板', 'body'),
    'body-bottom': ('机身底板', 'body'),
    'body-front': ('机身前板', 'body'),
    'head-center': ('头部中央支架', 'head'),
    'wheel-bracket-outer-left': ('左外轮支架', 'wheels'),
    'wheel-bracket-outer-right': ('右外轮支架', 'wheels'),
    'wheel-frame-left': ('左轮架', 'wheels'),
    'wheel-frame-right': ('右轮架', 'wheels'),
}

inventory = []
lists = project / 'public/portfolio/documents/瓦力机器人建模文件'
for path in sorted(lists.glob('*/本组打印数量.txt')):
    for filename, quantity in re.findall(r'^(.+\.STL)：(\d+)件$', path.read_text(encoding='utf-8-sig'), re.MULTILINE):
        part_id = re.sub(r'-x\d+$', '', Path(filename).stem)
        model = models.get(part_id)
        title, category = (model['title'], model['category']) if model else additional_parts[part_id]
        inventory.append({
            'id': part_id, 'title': title, 'category': category,
            'filename': filename, 'quantity': int(quantity), 'printGroup': path.parent.name,
        })

assert len(inventory) == len({item['id'] for item in inventory}) == 60
assert sum(item['quantity'] for item in inventory) == 310
assert set(models).issubset({item['id'] for item in inventory})
(content / 'model-inventory.json').write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f"Indexed {len(inventory)} part types, {sum(item['quantity'] for item in inventory)} printed pieces and {len(models)} STL files.")
