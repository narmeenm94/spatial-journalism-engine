"""Render README videos from real studio screenshots. Requires Pillow and FFmpeg.
Usage: python scripts/render-readme-demos.py --captures ../readme-captures
Capture files are local production inputs, not application dependencies.
"""
import argparse, json, shutil, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument('--captures', type=Path, required=True)
parser.add_argument('--output', type=Path, default=Path('docs/media'))
parser.add_argument('--overview-only', action='store_true')
parser.add_argument('--font-dir', type=Path, default=Path('C:/Windows/Fonts'))
args = parser.parse_args()
CAP = args.captures.resolve()
OUT = args.output.resolve()
WORK = CAP / 'render'
OUT.mkdir(parents=True, exist_ok=True)
WORK.mkdir(exist_ok=True)
FF = shutil.which('ffmpeg')
if not FF: raise SystemExit('FFmpeg is required')

def font(size, bold=False):
    return ImageFont.truetype(str(args.font_dir / ('arialbd.ttf' if bold else 'arial.ttf')), size)

def run(*argv):
    result = subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-y', *map(str, argv)], capture_output=True, text=True)
    if result.returncode: raise RuntimeError(result.stderr)

def line(draw, xy, text, size, fill='#181818', bold=False):
    draw.text(xy, text, font=font(size, bold), fill=fill)

def background(slug, number, title, subtitle):
    image = Image.new('RGB', (1600, 900), '#f6f6f2')
    d = ImageDraw.Draw(image)
    d.rectangle((160, 25, 187, 30), fill='#ebcd48')
    line(d, (200, 17), 'SPATIAL JOURNALISM STUDIO', 15, bold=True)
    line(d, (160, 49), title, 42, bold=True)
    line(d, (160, 105), subtitle, 19, '#5e5e58')
    line(d, (1370, 49), number, 44, '#b5b5aa')
    d.rectangle((159, 139, 1440, 860), outline='#d4d4ca', width=1)
    line(d, (160, 873), 'ONE STORY. ONE JSON FILE.', 12, '#55554f', True)
    line(d, (1236, 873), 'REAL STUDIO CAPTURES', 12, '#55554f')
    p = WORK / (slug + '-background.png')
    image.save(p)
    return p

# A labeled format diagram, separate from the unmodified product captures.
im = Image.new('RGB', (1280, 720), '#ffffff')
d = ImageDraw.Draw(im)
line(d, (70, 52), 'The whole experience travels together.', 42, bold=True)
line(d, (72, 112), 'A portable story document you can export, share and reopen.', 22, '#62625b')
labels = [('Chapters', 'Scenes, timing and languages'), ('Media', 'Models, video, audio and images'), ('Design', 'Screens, buttons, captions and fonts'), ('Interaction', 'Camera routes and scene actions')]
for i, (a, b) in enumerate(labels):
    y = 195 + i * 100
    d.rectangle((72, y, 590, y + 78), fill='#f6f6f2', outline='#ddddd4')
    d.rectangle((72, y, 77, y + 78), fill='#ebcd48')
    line(d, (98, y + 11), a, 23, bold=True)
    line(d, (98, y + 43), b, 18, '#62625b')
d.line((630, 382, 728, 382), fill='#1a1a1a', width=3)
d.polygon([(728, 382), (715, 375), (715, 389)], fill='#1a1a1a')
d.rectangle((778, 205, 1150, 563), fill='#171717')
line(d, (820, 240), '{ }', 76, '#ebcd48', True)
line(d, (820, 355), 'story.json', 42, '#ffffff', True)
line(d, (820, 421), 'One editable document', 21, '#ddddcf')
line(d, (820, 458), 'Media included', 21, '#ddddcf')
line(d, (72, 644), 'OPEN  /  EDIT  /  EXPORT  /  REOPEN', 20, '#55554f', True)
im.save(CAP / 'portable-format.png')

clips = [
 ('01-live-playback', '01', 'See the story as you build it.', 'Play the timeline. Watch video, captions and the audience camera together.', [('scene-editor', 1.5), ('@timeline-live', 4.5), ('@audience-live', 5)]),
 ('02-screen-designer', '02', 'Design the first impression.', 'Opening screens, button actions and independent desktop and mobile layouts.', [('screens-desktop', 2.5), ('screens-button', 2), ('screens-mobile', 2.5), ('screens-modes', 2.5)]),
 ('03-guided-camera', '03', 'Give every moment a viewpoint.', 'Edit camera cues, set their timing, then rehearse the guided experience.', [('camera-editor', 3), ('@guided-live', 6.5)]),
 ('04-caption-design', '04', 'Make the words part of the design.', 'Caption presets, colours, typefaces and your own uploaded fonts.', [('captions-classic', 2), ('captions-paper', 2), ('font-library', 3)]),
 ('05-start-create', '05', 'Start with a space. Make it yours.', 'Ready-to-edit scenes and a tutorial that responds to your real changes.', [('templates', 3), ('gallery', 2), ('tutorial-before', 1.5), ('tutorial-complete', 2.5)]),
 ('06-portable-story', '06', 'An entire experience. One JSON file.', 'Screens, scenes, interactions and embedded media, ready to reopen.', [('reader-welcome', 2), ('reader-modes', 2), ('@reader-live', 3), ('export-ready', 2), ('portable-format', 3)]),
]
manifest = []
if args.overview_only:
    manifest = json.loads((OUT / 'manifest.json').read_text(encoding='utf-8'))['clips']
    clips = []
for slug, number, title, subtitle, segments in clips:
    parts = []
    for index, (source, duration) in enumerate(segments):
        part = WORK / f'{slug}-{index}.mp4'
        if source.startswith('@'):
            folder = CAP / source[1:]
            times = json.loads((folder / 'times.json').read_text())
            entries = []
            for n, stamp in enumerate(times):
                entries.append("file '" + (folder / f'{n:04d}.png').as_posix() + "'")
                gap = (times[n + 1] - stamp) / 1000 if n + 1 < len(times) else 0.1
                entries.append(f'duration {gap:.6f}')
            entries.append("file '" + (folder / f'{len(times)-1:04d}.png').as_posix() + "'")
            listing = WORK / f'{slug}-{index}.txt'
            listing.write_text('\n'.join(entries), encoding='utf-8')
            inputs = ['-f', 'concat', '-safe', '0', '-i', listing]
        else:
            inputs = ['-loop', '1', '-i', CAP / (source + '.png')]
        run(*inputs, '-t', duration, '-vf', 'scale=1280:720:flags=lanczos,setsar=1,fps=30,format=yuv420p', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-threads', '4', part)
        parts.append(part)
    listing = WORK / (slug + '-parts.txt')
    listing.write_text('\n'.join("file '" + p.as_posix() + "'" for p in parts), encoding='utf-8')
    raw = WORK / (slug + '-raw.mp4')
    run('-f', 'concat', '-safe', '0', '-i', listing, '-c', 'copy', raw)
    backdrop = background(slug, number, title, subtitle)
    video = OUT / (slug + '.mp4')
    run('-loop', '1', '-i', backdrop, '-i', raw, '-filter_complex', '[0:v][1:v]overlay=160:140:shortest=1,format=yuv420p[v]', '-map', '[v]', '-an', '-r', '30', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-threads', '4', '-movflags', '+faststart', video)
    gif = OUT / (slug + '.gif')
    run('-i', video, '-filter_complex', 'fps=10,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle', '-loop', '0', gif)
    run('-i', video, '-ss', '0.5', '-frames:v', '1', '-update', '1', OUT / (slug + '.jpg'))
    manifest.append({'id': slug, 'title': title, 'duration': sum(s[1] for s in segments), 'videoBytes': video.stat().st_size, 'gifBytes': gif.stat().st_size})
    print(f'Rendered {slug}: MP4 {video.stat().st_size / 1e6:.1f} MB, GIF {gif.stat().st_size / 1e6:.1f} MB', flush=True)

# An overview assembled from the same verified feature clips.
overview_parts = []
for item in manifest:
    p = WORK / (item['id'] + '-overview.mp4')
    start = {'01-live-playback': 5, '03-guided-camera': 2, '06-portable-story': 6}.get(item['id'], 0)
    run('-ss', start, '-i', OUT / (item['id'] + '.mp4'), '-t', '6', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-threads', '4', p)
    overview_parts.append(p)
listing = WORK / 'overview-parts.txt'
listing.write_text('\n'.join("file '" + p.as_posix() + "'" for p in overview_parts), encoding='utf-8')
run('-f', 'concat', '-safe', '0', '-i', listing, '-c', 'copy', '-movflags', '+faststart', OUT / 'studio-overview.mp4')
run('-i', OUT / 'studio-overview.mp4', '-filter_complex', 'fps=8,scale=1120:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle', '-loop', '0', OUT / 'studio-overview.gif')
run('-i', OUT / '01-live-playback.mp4', '-ss', '8', '-frames:v', '1', '-update', '1', OUT / 'studio-overview.jpg')
(OUT / 'manifest.json').write_text(json.dumps({'capture': 'Real browser UI captures; silent edited demos. Diagram illustrates the portable format.', 'resolution': '1600x900', 'overviewSeconds': 36, 'clips': manifest}, indent=2), encoding='utf-8')
print('Overview and media manifest complete.', flush=True)
