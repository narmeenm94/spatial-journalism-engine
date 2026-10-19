# Spatial Journalism Studio

A visual editor and player for chapter-based spatial stories. A portable story is one JSON document containing its chapters, timing, captions, camera paths, lighting, interactive objects and embedded media.

## Start the studio

Use Node.js 22. From the repository directory:

```powershell
npm ci
npm --prefix creator ci
npm run build:studio
npm run studio
```

Open http://127.0.0.1:3000. The player is included in the studio build; no second development server is required.

## Make a story

1. Choose **New** for the gallery, tabletop city, interview or object exhibition starters. Each includes real 3D geometry, three editable chapters, six composed camera cues, inspectable objects and a timed light tour. **Learn by doing** opens five visual, hands-on lessons: rename a chapter, capture a camera view, add a caption, preview and export. Progress reflects actual edits, and all 20 feature topics remain searchable under Explore features. All tools opens a visual chooser for sound, lighting, endings and appearance. You can also open an existing story JSON.
2. In **Media library**, add GLB models, video, audio or images. Use a model as the space, add media to a chapter, or use an image as the cover.
3. Arrange chapters in the left panel. Set a chapter length, or leave it at zero to derive the length from its media and captions. Select an object to move, rotate, scale or edit it.
4. Use **Captions**, **Camera path**, **Soundscape**, **Lighting**, **Ending** and **Screen designer** for the story details. The timeline edits timing and plays the selected chapter in the canvas. The **expand icon on the audience camera** fills the canvas with its view; **Preview** tests the complete reader journey.
5. **Export story** creates a portable JSON file. The download link remains available if the browser did not save the initial download. Open that JSON later to continue editing.

The workspace and local media save in IndexedDB on this browser and device. Opening or creating another story keeps the previous workspace as a recovery copy, available under **New → Restore previous workspace**. Export permanent copies; clearing browser data also clears local recovery.

For an existing story with separate media, add the missing files in Media library. A unique matching filename reconnects its original path. Alternatively, set the media folder URL under **Media links & file check**. **Check linked files** verifies their URLs. Export embeds reachable referenced media and stops with a useful error if files are missing or blocked by CORS. GLB is the recommended model format; separate GLTF texture/buffer packages are not imported as a folder bundle.

## Design the experience screens

Open **All tools → Screen designer**. Choose Editorial, Cinema or Choose a path, then select and drag text, buttons and images on the canvas. Drag the selected corner to resize, use arrow keys to nudge (Shift for larger steps), or center elements with one click. The inspector groups controls into Content, Style and Action. Ctrl/Cmd+Z also undoes canvas edits. Desktop and mobile positions are independent. Screens support image or silent looping video backgrounds, PNG artwork, horizontal sprite strips, and fade, rise or pulse animations. Reduced-motion preferences are respected.

Button actions can open another screen, open an HTTP(S) link, or start the experience with a platform and Guided/Explore navigation choice. **Try buttons** tests screen routes; **Preview** runs the actual player. All artwork and screen settings are included in portable JSON exports. **Project & AR settings** retains the existing branding and tracking settings. The designed screens appear before entering XR; custom in-headset UI authoring is not implemented.

**Focus canvas** hides surrounding panels while keeping the scene editable; **Back to studio** restores them. Each panel has expand/restore and collapse controls. Press Escape to leave an expanded panel; use the Chapters, Details and Tools buttons to reveal hidden panels. At widths up to 1100 px, Chapters / Canvas / Details tabs show one main panel at a time. Chapter headers stay outside the scrolling content. Expand a media group to see its files, and use Title & timing to rename a chapter or set its length. Position, rotation and scale controls expand when precise numeric editing is needed.

## Guided camera tours

Open **Camera path** on any chapter. Frame a view in the canvas, choose **Start at**, then **Capture current view**. Repeat for later moments. Select a stop to change its move duration (seconds), easing, or precise pose; **Edit from this view** and **Replace with current view** let you adjust it visually. **Play camera path**, **Rewind**, and the scrubber preview motion in the Audience camera. This preview moves the camera only; use **Preview → Web 3D** for narration, captions and video together.

Choose whether readers start guided or exploring, or let them choose. Each cue approaches its destination from the reader’s actual current view, then releases the camera. Physical movement remains additive; dragging interrupts the current move until the next cue. Pause freezes scheduled guidance, and recenter returns to the latest destination. In **Camera path → Experience layout**, select **Move inside a full-size space** for Shadows-style phone navigation: Explore uses SLAM, Guided uses orientation/touch by default, with optional world tracking. Full-space mode skips tabletop placement. Headset VR retains its physical viewpoint.

The Shadows reconstruction was missing the tour stored in the original vcc-stabilisation-point/src/guided-camera-controller.js. Its 28 timed views are now in camera.guided: 2 in Introduction, 10 in Oleh’s Story, 13 in Walking Tour and 3 in Reflection. The original local camera offset (1.5, 0, -1.5) is rotated by each authored heading and added to its position. The original +90° heading, 1.5 m desktop eye height and 15° downward tilt are included. Timings and two-second transitions are retained. This restores the timed tour; it does not recreate the old floating chapter-button navigation. Paths and default mode survive portable JSON export/import.

## Share and play

In the local development studio, **New → Shadows of the Stabilisation Point** opens the original documentary with its media folder connected. The starter uses `examples/shadows-rebuilt/story.json`. Directly opening that same legacy JSON is supported: its `endingTrigger: lastVideo` takes precedence over the obsolete `triggerMode: characterFade`. In the local development studio, a matching project reconnects the bundled media without replacing authored settings. The footer distinguishes linked media from media embedded in the JSON. All 40 references, including six restored ambience recordings, were checked against local files. The production export/import functions created and reopened a 276 MB portable JSON; all 40 media hashes matched. Run `node --experimental-strip-types scripts/verify-shadows.mjs` to repeat the check, or pass an output directory to save the verified export and report.

The included [gallery story](examples/gallery/story.json) is a self-contained example with three chapters and an embedded model.

- Open **/player/** to choose a local JSON file.
- Host a story alongside the player and link to **/player/?story=story.json**.
- Add **&mode=3d**, **&mode=ar**, or **&mode=vr** to select an experience.
- Deploy **creator/dist/** to a static host for the studio and player together, or **dist/** for the player alone. Deploying is not performed by the build.

The player bundles its pinned Three.js runtime locally. Core Web 3D playback requires no third-party CDN scripts. AR assets are loaded on demand from the local vendor folder.

## Devices and verification limits

Web 3D runs in a WebGL-capable browser. Native WebXR AR and VR require a compatible browser/device and HTTPS (localhost is suitable for desktop development). Unsupported devices receive a clear Web 3D fallback. Do not assume native WebXR works in every iPhone browser.

AR offers surface hit testing and tap-to-place. Native WebXR can place in front of the viewer if hit testing is unavailable; 8th Wall waits for a tracked surface. VR includes headset captions and controller actions (left trigger pauses/resumes; right trigger advances the chapter). DOM-based interactive-object panels are not yet controller-ray UI. The new immersive paths require physical phone/headset verification before a production release; desktop fallback and Web 3D playback have been exercised.

Surface-placement phone AR defaults to native WebXR with an 8th Wall fallback when WebXR is unavailable. Full-space navigation uses 8th Wall directly. Choose a specific provider under **Screen designer → Project & AR settings → Phone AR**. The pinned MIT framework is loaded locally and only when starting AR. World tracking uses the original project's separately licensed SLAM chunk; image tracking uses the MIT tracker without that binary. All vendor files are copied unmodified. The binary license includes restrictions on paid products deriving substantial value from its functionality and on competing products: review its terms before distributing a commercial authoring platform. This repository's MIT license does not replace those terms.

For image AR, choose a normal photograph under **Screen designer → Project & AR settings → Choose a target image**. The studio creates a centered portrait crop and tracking metadata in the browser, with a downloadable target to print. Prepared planar, cylindrical or conical target JSON can also be imported under **Advanced image target import**. The target geometry and image travel with the story. The story follows the target, pauses when it is lost, and resumes when found (unless already paused by the reader). The framework also contains face and sky modules; dedicated authoring interfaces for these are not implemented.

The AR pipeline now creates the camera scene before media managers, uses tracked surface placement, handles camera failures and tracking loss, and stops camera access on exit. The actual local 8th Wall world-tracking runtime was started in the browser and Exit AR was exercised. Image-target preparation and export were exercised in the studio, but the browser left camera access pending during image-tracker startup; the player now times out with recovery instructions. Image detection has not been verified. These checks are not evidence of physical phone tracking accuracy. Android/iOS camera, lighting, drift, re-localisation and headset testing remain required.

## Story contract

Exports use **formatVersion: 1.1**. Older stories remain importable. **embeddedAssets** maps original media paths to data URLs, so media travels with the document. Larger videos produce larger JSON files and consume browser memory during export; use compressed media suitable for the intended device.

Timing units remain compatible with the existing project: caption times, video triggers/durations, camera keyframe times and chapter durations are seconds; audio/character delays and durations, fades, and camera transition durations are milliseconds. Character duration includes its fade-out. Zero media duration means play to the end / remain for the chapter.

A shared chapter clock drives captions and delayed media even without narration. Pausing freezes the chapter clock, scheduled starts and guided-camera progress. Validation checks schema, duplicate IDs, references and caption timing before accepting a file. Unknown extension fields are retained during editing.

## Development checks

```powershell
npm run test:all
npm run audit:story-contract
npm run build:studio
npm audit --omit=dev
```

Tests cover portable binary media, missing-file export failures, the original stories' round trips, independent translated caption timing, canonical fields, chapter IDs, silent chapters, delayed audio, pause/resume and cleanup. Build tools still report bundle-size warnings. Production dependency audit is clean after compatible dependency updates; the legacy development toolchain has remaining advisories requiring separate major-version upgrades.

The earlier source review is recorded in [docs/engine-audit.md](docs/engine-audit.md). It describes the baseline before these changes and should be read with this README's current behavior.

## Original implementation and new authoring controls

[Shadows feature map](docs/shadows-feature-map.md) records each source feature, where to author it, and the remaining differences. Soundscape supports persistent ambience and inspection-triggered sound. Audio Properties exposes moving sound waypoints, Lighting exposes timed light tours, and Video Properties exposes individual projection surfaces. All are included in the built-in handbook and portable JSON contract.

### Arrange the studio

Drag the dividers between Chapters, the canvas, and Details to change their widths. Drag above the tools to change the timeline height. Sizes are saved on this device independently of story JSON. Double-click a divider to reset it, or use Reset layout to restore all panels. Dividers also support arrow keys, Shift for larger steps, Home/End for limits, and Enter to reset.

Screen designer has separate resizable Layers and Settings sidebars. The artboard fits the available width and height; only the sidebars scroll. At narrow widths, Layers / Design / Settings tabs replace the three-column view.

### Portable typography

Screen designer → Style → Browse fonts & upload offers twelve bundled font families, or WOFF2 / WOFF / TTF / OTF uploads. Project settings offers the same picker for the story typeface. Added fonts are stored under `ui.branding.fonts`; their binary files are stored as data URLs in `embeddedAssets`. Each element stores its typeface, weight and style. Font files and library licenses survive export and reopen; no CDN is needed by a portable story. Legacy `branding.fontFiles` stories remain supported. System font choices are explicitly device-dependent.

The bundled families are distributed through Fontsource under their included open-font licenses. All supplied language subsets and styles are embedded when adding a family; available glyph coverage varies by family. Upload fonts with the right glyph coverage for other scripts.

### Live editor playback

Play timeline rehearses the selected chapter using its video projections, narration, character animation and fades, captions, guided camera, walking light and flicker cues. Pause holds the frame; the ruler and Scene playhead scrub the same clock. Switching tools keeps playback running. Chapters stop at their configured duration or the end of their timed content and loaded media. Selecting another chapter resets playback.

Expanding the audience camera replaces the editing camera with the audience camera, without changing either camera’s authored pose. The restore icon or Escape restores the editing view. Stop / Back to editing restores the placement view. Missing or blocked media appears as a media issue in the canvas; loading media holds the clock. Preview is still used for start screens, interactions, chapter transitions, ending screens and device XR. Editor playback state is not exported in the story JSON.

### Caption design and tool templates

Captions → Appearance & templates provides Classic, Clear, Paper and Cinema starting styles, a font library/upload picker, separate desktop/mobile text sizes, text and bar colours, opacity, alignment, position, width, spacing and corners. Settings live in `ui.captions` and survive single-file export/import. The editor and web player share the caption styling function; XR draws the selected type, colours and alignment on its spatial caption panel. Old stories without caption settings retain the default appearance.

Camera, lighting, soundscape and ending tools offer editable templates alongside the existing complete-story and opening-screen templates. Camera templates append stops; sound templates create a setup requiring the author’s audio file. Lighting changes only chapter modifiers. Closing templates supply editable placeholder copy. All changes support Undo.

### Buttons inside the experience

Chapters → Scene buttons adds optional navigation to any story. Choose a text button, localized PNG/image sprite, or GLB model, position it with the scene gizmo, and select Next chapter or a specific chapter (including replay). Buttons can appear immediately, at a chosen second, or when the chapter ends. Try in audience camera previews their timing and lets you tap through to the destination. The player accepts mouse/touch and native XR selection rays; headset behavior still needs physical-device testing.

Button designs, routes, transforms and media are included in portable JSON export. The rebuilt Shadows example restores its three original English/Finnish sprites. Older JSON files without sceneButtons remain unchanged; open the updated rebuilt example to get the restored buttons.

Player settings and chapter controls are behind the menu icon. In non-AR Explore, Recenter view returns to the authored initial viewpoint, retaining its eye height instead of applying legacy AR floor-level recenter coordinates.

### Tutorial and film introductions

Screen designer → Intro flow creates a welcome, mode choice, three illustrated tutorial screens and a film screen. Add intro flow inserts that sequence into an existing design without replacing its artwork. Every page is editable: change text/images, arrange desktop/mobile layouts, and route Next/Back/Skip buttons. A Go to screen action can remember Guided or Explore for the final Start experience.

Under Background → Intro video, upload a film for each language, enable sound, and choose a destination screen or Start experience when it ends. Films have playback controls, a Play fallback when autoplay is blocked, and an error continuation. Keep an authored Skip button for readers who prefer to enter immediately. Background videos remain silent loops. Localized element artwork and all intro films are included in the portable JSON.

The rebuilt Shadows story now includes its original title artwork, five illustrated tutorial steps and English/Finnish intro films. Tutorial wording adapts the original instructions to desktop/AR and the new player menu.
