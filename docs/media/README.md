# Studio demo media

Actual captures of the running studio and its Web 3D player, edited into silent feature walkthroughs. The final portable-format diagram is explanatory artwork. These clips do not claim to demonstrate physical AR tracking or headset operation.

[36-second overview video](studio-overview.mp4) · [Animated overview](studio-overview.gif) · [Overview still](studio-overview.jpg)

| Feature | Duration | Animated preview | Full-quality video | Still preview |
| :--- | ---: | :--- | :--- | :--- |
| See the story as you build it. | 11s | [GIF](01-live-playback.gif) (0.79 MB) | [MP4](01-live-playback.mp4) | [Still](01-live-playback.jpg) |
| Design the first impression. | 9.5s | [GIF](02-screen-designer.gif) (0.50 MB) | [MP4](02-screen-designer.mp4) | [Still](02-screen-designer.jpg) |
| Give every moment a viewpoint. | 9.5s | [GIF](03-guided-camera.gif) (0.59 MB) | [MP4](03-guided-camera.mp4) | [Still](03-guided-camera.jpg) |
| Make the words part of the design. | 7s | [GIF](04-caption-design.gif) (0.29 MB) | [MP4](04-caption-design.mp4) | [Still](04-caption-design.jpg) |
| Start with a space. Make it yours. | 9s | [GIF](05-start-create.gif) (0.59 MB) | [MP4](05-start-create.mp4) | [Still](05-start-create.jpg) |
| An entire experience. One JSON file. | 12s | [GIF](06-portable-story.gif) (0.86 MB) | [MP4](06-portable-story.mp4) | [Still](06-portable-story.jpg) |

## Use in a README

Use a GIF as an inline image and link it to its MP4. The project README already does this with relative paths, so the links work when these files are committed with it. MP4s are 1600 × 900, H.264, with web playback metadata at the start. GIFs loop silently; still previews provide a motion-free alternative.

```markdown
[![Screen designer demo](docs/media/02-screen-designer.gif)](docs/media/02-screen-designer.mp4)
```

The clips use real captured states, edited pauses and cuts. Live portions retain their capture timing. Titles use the system Arial typeface rendered into the video; no font binaries are included. Documentary artwork and footage retain their existing credits and rights.

## Regenerate

Install Pillow and FFmpeg, then run from the repository root:

```powershell
python scripts/render-readme-demos.py --captures "path/to/readme-captures"
```

Raw captures are local production inputs, kept outside the Git repository. Still captures are named in the rendering script. Live capture folders contain numbered PNGs and a `times.json` array of capture timestamps. On a non-Windows system, pass `--font-dir` pointing to a directory containing `arial.ttf` and `arialbd.ttf`, or adapt the font selection to a locally available typeface. The renderer does not redistribute font files.

`manifest.json` records feature durations and media sizes. `index.html` provides a local video gallery when this folder is served over HTTP.
