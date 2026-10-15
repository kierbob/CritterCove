# Bundles the game into one HTML file with the sprites it uses embedded.
import base64, glob, io, os, re
from PIL import Image
ROOT = os.path.dirname(os.path.abspath(__file__))
# The Cute Fantasy pack goes in ./assets (it is never uploaded: see .gitignore).
# If the game folder sits inside the pack instead, the parent folder is used.
CF = os.path.join(ROOT, 'assets')
if not os.path.isdir(os.path.join(CF, 'Animals')): CF = os.path.dirname(ROOT)
if not os.path.isdir(os.path.join(CF, 'Animals')): raise SystemExit('Put the Cute Fantasy pack folders (Animals, Buildings, ...) in the assets folder first.')
INCLUDE = [
  'Animals/*/*.png', 'Animals/Kapybara/Static/*.png',
  'Tiles/Water/*.png', 'Tiles/Beach/*.png', 'Tiles/Grass/*.png', 'Tiles/FarmLand/*.png', 'Tiles/Cobble_Road/*.png',
  'Tiles/Bridge/*.png', 'Tiles/Hedge_Tiles.png', 'Tiles/Picnic_Blankets.png', 'Tiles/Pavement_Tiles.png', 'Tiles/Wooden_Deck_Tiles.png',
  'Trees/*.png', 'Crops/*.png',
  'Outdoor decoration/*.png', 'Outdoor decoration/Outdoor_Decor_Animations/*/*.png', 'Outdoor decoration/Outdoor_Decor_Animations/*/*/*.png',
  'Buildings/Buildings/Houses/Wood/*.png', 'Buildings/Buildings/Unique_Buildings/*/*.png',
  'Buildings/House_Decor/*.png', 'Buildings/Houses_Interiors/*.png',
  'Icons/Outline/*.png', 'Weather effects/*.png', 'NPCs (Premade)/*.png',
  'Enemies/Slime/*/*.png',
]
# player layers: only rows 0-5 (idle + walk in 3 directions) are used, so crop them
PLAYER = ['Player/Player_Base/*.png', 'Player/Head/Hair_*/*.png', 'Player/Chest/*_Shirt/*.png', 'Player/Legs/*_Pants/*.png', 'Player/Feet/*.png', 'Player/Accessories/*.png']
def key(path):
    k = os.path.relpath(path, CF).replace('\\', '/')[:-4]
    return k
def enc(im):
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True); return base64.b64encode(b.getvalue()).decode()
sprites = {}
for pat in INCLUDE:
    for p in sorted(glob.glob(os.path.join(CF, pat))):
        if p.endswith('.png'): sprites[key(p)] = base64.b64encode(open(p, 'rb').read()).decode()
# rows kept from the 56-row player sheets: idle+walk (0-5), axe (29-31),
# pickaxe (32-34), fishing cast (44-46) and reel (47-49) -> packed as 18 rows
KEEP = list(range(0, 6)) + list(range(29, 35)) + list(range(44, 50)) + list(range(38, 41))   # + watering (38-40) as rows 18-20
for pat in PLAYER:
    for p in sorted(glob.glob(os.path.join(CF, pat))):
        im = Image.open(p).convert('RGBA'); w, h = im.size
        out = Image.new('RGBA', (w, 64 * len(KEEP)))
        for i, r in enumerate(KEEP):
            if r * 64 < h: out.paste(im.crop((0, r * 64, w, r * 64 + 64)), (0, i * 64))
        sprites[key(p)] = enc(out)
for p in ['Player/Tools/Iron/Iron_Tools.png', 'Player/Tools/Fishing_Rod/Wooden_Fishing_Rod.png']:
    sprites[key(os.path.join(CF, p))] = base64.b64encode(open(os.path.join(CF, p), 'rb').read()).decode()
js = 'const SPRITES = {\n' + ',\n'.join(f'{k!r}: "data:image/png;base64,{v}"' for k, v in sprites.items()) + '\n};\n'
ORDER = ['util.js', 'assets.js', 'furndata.js', 'world.js', 'render.js', 'player.js', 'animals.js', 'game.js', 'activities.js', 'crops.js', 'bees.js', 'helpers.js', 'interior.js', 'tutorial.js', 'ui.js', 'buildui.js', 'main.js']
code = '\n'.join(open(os.path.join(ROOT, 'src', f)).read() for f in ORDER)
tpl = open(os.path.join(ROOT, 'src', 'template.html')).read()
html = tpl.replace('/*SPRITES*/', js).replace('/*CODE*/', code)
os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
open(os.path.join(ROOT, 'index.html'), 'w').write(html)
print(len(sprites), 'sprites,', round(len(html) / 1e6, 2), 'MB')
