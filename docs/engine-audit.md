> Baseline audit. The studio and playback improvements described in the repository README have since addressed several findings below. This document preserves the original review rather than asserting that every listed issue remains open.

# Spatial Journalism Engine: source audit and product direction

Date: 17 October 2026. Baseline: `0120c2c` on `origin/main`.

This report distinguishes source evidence, executed checks, and proposed work. It replaces neither the story specification nor hardware testing. The Grok overview was read as a set of claims to check, not as evidence that features work.

## Repository and source provenance

`D:\Spatial Journalism Engine\spatial-journalism-engine` is the checkout of `https://github.com/narmeenm94/spatial-journalism-engine.git`. After fetching, `HEAD...origin/main` was 0 ahead / 0 behind and the working tree was clean. The repairs described below are subsequent local, uncommitted changes; they have not been pushed.

`D:\Spatial Journalism Engine\overview.md` is the actual overview filename. There is no need to treat the supplied `overview\.md` spelling as a separate document.

`D:\Spatial Journalism Engine\vcc-stabilisation-point` is the separate exported documentary production. Its scene loader, scene configuration, media, camera controls, lighting, interactions, subtitles and ending provide useful references for the engine extraction. It is not another copy of the current engine.

The shared `D:\00 ASUS Laptop DEV Projects\07 Ukraine Yle` folder also contains production source, models, photogrammetry/Postshot work, audio, video, design files and experiments. The inspected `01 Working Codes\webXR\index.html` contains a native immersive-AR experiment; the React R3F Test 2 manifest includes `@react-three/xr`; the AlvaAR-named folder contains additional camera/WebXR experiments. These are reference prototypes, not integrated engine capabilities. They have not been device-tested in this audit. Media binaries and every archived experiment have not been exhaustively reviewed.

## What the engine does

The central idea is a portable story document interpreted by a reusable player. Today the document describes chapters under `scenes`, rather than a separate `chapters` key. A story includes project metadata, languages, assets, environment transforms, camera settings, global and scene lighting, media, interactions, captions, branding, and an ending.

The JSON contains story instructions and media paths. It does not currently contain all the media bytes. Sharing JSON alone works only while its referenced media remains accessible. A standalone offline handoff needs packaged media or an explicitly designed embedded-media format.

| Layer | Implementation | What is present |
| --- | --- | --- |
| Story contract | `engine/schema/story.schema.json`, `JSONParser.js`, Creator types and normalizer | Schema validation, defaults, compatibility conversions, relative asset resolution; these disagree in important places. |
| Player | `engine/src/core/Engine.js` | Load story, home/language UI, choose mode, initialize scene, load environment, create managers, start chapters, show ending and invoke callbacks. |
| Chapter orchestration | `managers/SceneManager.js` | Media loading, transitions, first-audio-track timing, video triggers, lighting effects, camera tracking, ending callbacks. |
| Assets | `core/AssetLoader.js` | Model/audio/video/texture loading, caches, concurrent preload, progress reporting. |
| People and objects | `CharacterManager.js`, scene object loading, `InteractionManager.js` | GLB characters and animation clips, opacity transitions, static props, inspectable objects, information cards, outlines. |
| Sound and captions | `AudioManager.js`, `SubtitleManager.js` | Multiple audio records, positional sound and waypoint interpolation, language-specific timed captions. Lifecycle problems remain below. |
| Video | `VideoProjector.js` | Spatial video planes, multiple walls, textures, shader styling, fade transitions. `VideoManager.js` also exists, but the active engine uses VideoProjector. |
| Lighting and atmosphere | `LightingManager.js`, `lighting/*`, `ParticleManager.js` | Ambient/directional/hemisphere lights, modifiers, dynamic lights, volumetric appearance, flicker, walking-tour lighting, dust, fog and exposure. |
| Camera | `CameraRigControls.js`, `GuidedCameraController.js` | Touch/mouse navigation, bounds, recenter, timed guided keyframes. |
| Authoring | `creator/` | React/TypeScript/R3F viewport, Zustand/Immer state and history, hierarchy, inspector, media import, timeline, captions, lighting, camera, ending and branding panels. |
| Preview | `creator/src/components/ar/ARPreview.tsx`, `engine/src/index.html` | Separate player server, iframe/popup bridge, JSON and local file buffers passed with postMessage. |
| Earlier authoring tool | `generator/` | Form-based JSON generator. It adds a second authoring surface to maintain. |
| Examples | `examples/shadows-rebuilt`, `templates/` | Four-chapter English/Finnish documentary and interview/historical starter stories. |

Normal player flow: load and parse story → home/language selection → mode → environment/assets → chapter media and timed events → next chapter → ending. The ordinary chapter advance is managed by the player's Next button after audio ends; the implementation is not a general branching narrative graph.

## Corrections to the overview

- **Present in source does not mean verified in use.** The overview labels many systems “working” without tests. This audit verifies builds, selected editor interactions and specific data transformations, not the complete documentary on every device.
- **JSON round-trip is broken.** All three bundled source stories pass the current schema; all three fail after Creator normalization and serialization.
- **Preview can conceal that failure.** The parser validates URL-loaded documents but skips validation for object inputs. Creator preview supplies an object. An apparently successful preview therefore does not prove the exported JSON will load when hosted.
- **The AR dependency description is outdated.** The export includes a self-hosted XR8 binary. 8th Wall's official March 2026 announcement distinguishes the MIT framework from the binary-only SLAM runtime. The local `external/xr/LICENSE` is a separate XR Engine agreement. Do not describe the whole dependency stack as MIT, or assume the old hosted account/app-key requirement still applies. Sources: [official transition announcement](https://8thwall.org/blog/8th-wall-open-source), [distributed engine documentation](https://github.com/8thwall/engine).
- **Native WebXR and headset VR are not implemented in this engine.** The main runtime uses XR8 for AR and WebGL camera controls for 3D. Separate WebXR experiments exist in the shared production folder.
- **Ending modes are inconsistent.** The inspector/schema offer `triggerMode`; actual audio/video completion also depends on `endingTrigger`. The character-fade path has production-specific opacity thresholds and a hard-coded 66-second fade. This is not a fully generic ending system.
- **ZIP export is a placeholder.** `exportStoryBundle` only downloads JSON. Browser-selected media is held in memory; exporting JSON does not save those files.
- **There was no working test command.** Root `npm test` called Jest although Jest and a real suite were absent. The first pass replaces this with Node regression tests.

## Confirmed problems and their implications

| Priority | Finding and source | Consequence / required repair |
| --- | --- | --- |
| P0 | Creator normalizer reconstructs objects and drops fields: control flags, fog near/far, ending credits, character timing fields and other extensions. Subtitle language arrays are merged by array index using the first language's timing. | Editing can silently change a documentary. Preserve data, migrate explicitly and test semantic round-trips, including uneven subtitle tracks. |
| P0 | Schema expects object audio/subtitles and numeric character scale; Creator exports arrays, vector scale and nullable animation. | Reopening a hosted export fails. Define one versioned public contract, generate types from it, and use the same validation at open, preview and export. |
| P0 | Creator converts scene `effects[]` to `flicker`/`walkingTour`; runtime consumes `effects[]` without converting them back. Particle area/animation shapes also diverge. | Editor controls and player behavior disagree. Normalize once at a defined compatibility boundary. |
| P0 | `loadSceneAudio` uses configured/generated IDs; deactivate, pause, resume and skip still use `${sceneId}_audio`. | Narration can survive transitions and controls can address nonexistent tracks. Track actual loaded media by chapter and clean up all of it. |
| P0 | Audio time is derived from a new `performance.now()` origin on every play; pause does not retain the accumulated playhead. Timers and camera effects run independently. | Pause/resume can desynchronize sound, captions, motion and video. Introduce one chapter clock and cancellation lifecycle. |
| P0 | `InteractionManager._showInfoBox` interpolates story text into `innerHTML`; the player preview accepts the first loadStory message without checking its sender. | A shareable story must be treated as untrusted input. Render text safely and bind the preview bridge to the intended source/origin. |
| P1 | AR scripts load only when the initial URL says `mode=ar`; normal home-screen mode selection does not load them. The popup readiness signal is sent only to `window.parent`, not `window.opener`. | Mode selection and pop-out preview need repair and explicit readiness/error states. |
| P1 | Editor has in-memory state and assets, no persistence/recovery, no unsaved-work guard; opening/new story retains some prior session settings. | Reloading or replacing a project can lose work or retain unrelated assets. Add recoverable local projects and explicit project lifecycle. |
| P1 | Editor uses Three 0.182 while player HTML loads global Three 0.128 from CDNs; package peer range says >=0.150. | Preview/rendering parity is unproven. Align the renderer deliberately with reference-scene visual checks; do not blindly upgrade XR8 integration. |
| P1 | Character entry fades use hard-coded 3000 ms; video replacement stops earlier active videos; several duration controls are not applied as the timeline implies. | A visual timeline must have documented, consistent playback semantics. |
| P1 | Asset URLs previously discarded their remote origin and query/hash. | Remote stories could request media from the wrong host. Fixed in this first pass. |
| P1 | Global keyboard handler captured Backspace and undo while editing text; chapter IDs could collide after deleting a middle chapter. | Accidental deletion and ambiguous chapter identity. Fixed in this first pass. |
| P2 | Dense fixed-panel layout, emoji controls, small text, technical path/URL prompts, default dark blue/purple styling. | Requires an authoring workflow and visual redesign, rather than only changing colors. |
| P2 | Creator production chunk is about 1.33 MB before gzip; player build copies about 31.3 MiB of external files. | Profile actual network/device costs and load mode-specific modules when needed. Copied size is not the same as initial download size. |

These are prioritized engineering findings, not a claim of an exhaustive security audit. Several lifecycle failures still require device/browser reproduction beyond source tracing.

## First repairs completed locally

1. Repaired all ten reported Creator TypeScript build errors: missing light/state types, current BufferAttribute constructor props, unused bindings. Strict checking stays enabled.
2. Prevented editor shortcuts from handling typing, composition and native control input; normalized Ctrl/Cmd+Shift+Z handling.
3. Made new chapter IDs skip IDs already in the story, including imported IDs.
4. Preserved complete resolved asset URLs, including remote origins and query/hash components.
5. Added actual regression-test commands without installing dependencies, plus a separate reproducible contract audit.

Verification on Node 22.14.0:

| Check | Result |
| --- | --- |
| Root `npm run build:prod` | Pass; bundle-size warnings remain. |
| Creator `npm run build` | Pass after repairs; large-chunk warning remains. |
| Root `npm test` | 3 passing tests for remote URLs, preview URLs and repeated resolution. |
| Creator `npm test` | 2 passing tests for chapter identity and undo/redo. |
| Browser smoke test | Added a character, typed `were` into its animation field, pressed Backspace to obtain `wer`, then text undo restored `were`. Character remained selected and present; transform mode remained Translate. |
| Contract diagnostic | 3/3 original stories pass; 3/3 Creator-serialized stories fail. Shadows: 15 validation errors; interview: 8; historical: 8. Control flags disappear and Shadows scene2/scene3 effects lose the runtime field. |

Run `npm run audit:story-contract` from the repository root to reproduce the contract failures. It intentionally exits 1 until repaired; it is not part of the passing regression suite and passing it alone will not prove visual or semantic equivalence. Creator tests and the diagnostic currently use Node's experimental TypeScript stripping flag; use Node 22.14 or a compatible newer runtime.

## Product direction: a light, clear storytelling studio

The experience should start with a story and its chapters. Technical settings should appear when the author needs them. The content and spatial preview should dominate the screen.

Use a warm near-white workspace, white panels, graphite text, quiet gray separators and one restrained deep-teal accent. Use the platform sans-serif stack (`Segoe UI` on Windows), regular/medium weights, clear hierarchy and legible controls. Use consistent line icons with text labels. Avoid decorative gradients, glowing buttons, emoji navigation, glass panels and ornamental display typography. These are proposed design constraints; this pass has not redesigned the interface.

Suggested layout:

- A calm top bar: story title, truthful save state, Undo/Redo, Preview and Export/share actions.
- A chapter outline on the left with readable titles, thumbnails, durations and drag reorder. Camera/environment should not precede the story as the primary mental model.
- A generous central canvas with clear Edit/Preview states, sensible camera framing, snapping, grounding and a visible reset view.
- A contextual inspector on the right: content first, placement second, advanced settings collapsed. Give authors actions such as “Place on floor”, “Face viewer”, “Frame this view” and “Use this camera position”.
- A resizable bottom timeline for narration, media, people, captions and camera. Present time consistently in seconds/timecode; adapt old millisecond fields at the migration boundary.
- An asset library with previews, media metadata, missing-file relinking, duplicate handling and import progress. Authors should not need to construct asset URLs.
- An empty state that explains the first action: choose a starting layout or add a space. Templates must be complete, honest examples, including an option that does not need a scanned environment.

For narrow screens, panels should become accessible drawers/tabs while keeping the main canvas useful. Do not compress three desktop panels into a narrow browser pane. Preserve keyboard navigation, visible focus, readable contrast, reduced motion and caption access throughout.

## Implementation sequence and acceptance criteria

### 1. Make story ownership reliable

Keep one JSON document as the public story contract. Add a format version distinct from editorial/project version. Implement named migrations for existing engine and Creator shapes, stable IDs and reference checks. Preserve extension data or report unsupported fields explicitly. Validate without silently disabling checks. Use safe text rendering and validate asset/link protocols.

Acceptance: Shadows and both templates can open, edit, export, reopen and play with preserved captions, languages, effects, transforms, timings and ending. Include fixtures with zero values, missing optional data, invalid input, custom fields, multiple tracks, differing caption timings and deleted/reordered chapter references.

### 2. Make playback deterministic

Use a shared chapter clock and an explicit lifecycle (loading, ready, playing, paused, transitioning, complete, error). Cancel pending asynchronous work when leaving a chapter. Own and dispose every sound, texture, object URL, listener and timer. Use one playback implementation for editor preview and publication. Convert documentary-specific fade and ending behavior into explicit story settings.

Acceptance: pause/resume/skip/restart work repeatedly; no media from an old chapter continues; silent chapters run timed events; errors are visible and recoverable; the published player matches preview.

### 3. Build the approachable studio

Implement the light layout and chapter-first workflow above, local recovery for JSON and media (IndexedDB), a visible save state, safe replacement of projects, and one asset workflow. Introduce intuitive placement operations before exposing additional low-level properties. Consolidate generator functionality into Creator rather than expanding both tools.

Acceptance: a new user can create a two-chapter story, add media/captions, place objects, preview and export without entering code or asset paths. Closing/reopening the editor recovers the project and its media.

### 4. Make sharing dependable

Offer JSON export for stories with accessible referenced media, and a portable package containing that same JSON plus assets for offline transfer. Optional embedding of small assets can be designed separately; large models/videos make all-media-in-JSON expensive. Publishing must report missing assets, unsupported capabilities and total size before producing an embed/share URL. No backend is required merely to serve a static story.

Acceptance: a recipient can import a portable package on a clean machine and edit/preview it without the author's local file paths, blob URLs or development servers.

### 5. Add native XR as explicit capabilities

Separate viewing technology (`web`, `immersive-ar`, `immersive-vr`) from navigation (`guided`, `explore`). Keep the story independent of the tracking backend. Evaluate XR8 and the existing WebXR experiments as adapters around a common runtime. Add native WebXR session lifecycle, reference spaces, placement, controller/ray input, headset-readable controls, comfort options and clear fallbacks. Handle permission denial and session loss visibly.

Acceptance: the same story is verified on the chosen desktop, phone and headset/browser matrix. An unavailable mode explains the fallback; AR/VR support is not inferred from a JSON enum or an installed library.

## What is not yet verified

The full documentary has not been watched through in the current player; AR tracking, camera permission flows, mobile media autoplay, headset input, memory limits, production deployment and complete media-package portability have not been tested. The UI redesign, canonical contract, autosave, package export and native XR work remain proposed work. The initial repairs are a buildable starting point, not a finished beginner-ready engine.
