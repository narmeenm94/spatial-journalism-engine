# Shadows implementation → platform features

Reviewed against the production source in ../vcc-stabilisation-point/src and the supplied camera-rig working notes. Updated 18 October 2026. This is the current mapping; engine-audit.md preserves the earlier baseline.

| Original implementation | Platform feature and authoring location | Current behavior |
| --- | --- | --- |
| app.js, UI/createModeSelectionScreen.js | Camera path → experience layout / reader choice | Full-space stories ask Guided or Explore before startup. Desktop uses Web 3D; phone full-space uses XR8 without surface placement. |
| camera-rig-controls.js | Camera properties, reader drag rotation and recenter; Project & AR settings > Player controls | Touch/mouse movement in both modes, room bounds, smooth recenter, tracker-status pose compensation. No manual-control lock during guidance. Authors can place recenter in the menu or show a corner shortcut with uploaded artwork. Shadows uses its original icon. Desktop recenter retains the authored eye-height pose; tracked AR retains its separate recenter pose. |
| guided-camera-controller.js | Camera path → capture view, timing, easing, preview | 28 original cues restored. A cue starts at the current world view; later physical movement remains additive. Dragging yields control until the next cue. |
| app.js tracking configuration | Camera path → Guided phone tracking | Explore enables world tracking. Guided defaults to orientation and touch; authors can enable world tracking. Configuration happens before pipeline startup. |
| config/scenes.js, scenes/sceneLoader.js | Chapters, Timeline, Properties | Four chapters, narration, delayed media, chapter props and previous/next navigation. A shared chapter clock supports silent chapters and pause. |
| components/CharacterLoader.js | Character properties | GLB animation clips, transforms, delayed appearance, opacity and fade duration. |
| components/VideoProjector.js and shaders | Video properties → Multi-wall → Projection surfaces | Timed projection, opacity, size, muted/loop options, shared video on independently positioned surfaces. |
| components/AudioManager.js | Audio properties → Positional Audio → Moving audio | Narration, delay, looping, spatial attenuation and editable timed movement. |
| AmbienceManager.js | Soundscape | Six original recordings restored. Persistent room sound and object-triggered sound with position, loop, volume and falloff. Pause and ending silence these sources. |
| config/interactiveModels.js, interactions/interaction.js, components/InfoBox.js | Interactive objects and Soundscape | Seven objects, resting/inspected transforms, localized information, rotation and linked sound. Preserve source textures; templates can retain shaded materials. |
| lights/setSceneLights.js, sceneLightingManager.js | Global lights / chapter Lighting | Base lights and per-chapter multipliers. |
| lights/createVolumetricLight.js | Add spotlight → volumetric | Targeted beams and spotlights attached to a chapter. |
| lights/Scene3LightingManager.js | Lighting → Timed light tour | Editable light positions and times, guidance text and during/after room lighting. |
| lights/scene2FlickerEffect.js | Lighting → Flicker | Timed flicker, retaining imported patterns. |
| visual-effects/setupParticles.js | Lighting → Particles | Dust count, size and opacity; imported volume and drift configuration retained. |
| visual-effects/postProcessing.js | Chapter interaction outlines | Web 3D highlights inspectable objects. XR8 does not use the desktop postprocessing composer. |
| UI/createHomeScreen.js, UI/createTutorial.js, config/tutorials.js, app.js intro videos | Screen designer / Project & AR settings / language selector / captions | The source-derived opening has nine editable screens: home, selectable mode cards, five tutorial steps, intro film, and information/credits. It uses the original background video, title images, mode SVGs, three-layer gesture animations, partner logos, fonts and localized content. Guided skips the walking step; Explore includes it. Mode selection stays on the chooser until Next. The film skip button appears after two seconds. Language changes and conditional routes are generic JSON actions. Intro flow and mode chooser templates are available to every story. Visual screens retain independent desktop/mobile layouts. Localized content and uploaded media travel in JSON. Reader language selection remains available. These are launch screens, not custom in-headset panels. |
| UI/createTutorial.js, config/tutorials.js, UI/createSettingsUi.js | Reader How to explore / Studio Tutorial | Reader instructions cover headphones, movement, recenter and object inspection; 20 searchable visual feature cards complement five hands-on authoring lessons. Lessons edit the active story, detect completed actions, and support Undo; detailed reference text expands on demand. |
| scenes/EndingSequence.js | Ending | Readable or cinematic presentation. Cinematic mode restores the source fade-to-black, closing-text and individual-quote timings with optional background video, final links and return to title. Fade lengths, reading intervals, gaps, sound and device visibility are editable. The rebuilt example now uses format 1.1 and the actual source trigger: Oleh appears after 15 seconds, fades in over 3 seconds and fades out over 66 seconds; crossing opacity 0.05 starts a 6-second wait. The chapter clock includes this delay and respects pause. The conflicting legacy last-video field is removed, while legacy import compatibility remains tested. The same renderer provides an in-editor preview with pause, seek and skip. |
| components/StoryButtonManager.js | Scene buttons / compact player menu | Original English/Finnish sprites are restored at their authored room positions after each chapter. Scene buttons in Chapters support text, image or GLB buttons, timing, pulse, optional additive glow and next/specific chapter actions in any story. |
| debug-position-utilities.js, source working-rig files | Transform gizmos, precise properties and captured views | Runtime debugging coordinates become editable story data. |

## Coordinate conversion

The source controller's (1.5, 0, -1.5) camera offset is intentional. Each migrated destination is the authored position plus that offset rotated by the authored quaternion. Heading includes the original +90° yaw. The desktop pose also includes 1.5 m eye height and a 15° downward view. The first destination is (1.5, 1.5, -1.5). Timings and two-second moves are retained. Phone tracking remains relative to the rig instead of being overwritten continuously.

## Intentional differences and verification limits

- The original had a device-specific exception enabling SLAM in the iOS Yle embedded app, plus several hard-coded device-height branches. The platform exposes Guided tracking as a story setting and uses an authored initial world pose. It does not infer that unpublished host-app flag.
- The reader can interrupt a guided move with a drag. The next cue starts at their actual resulting view. This makes manual navigation usable during guidance; deterministic path sampling is reserved for author preview.
- Headset camera travel and controller-ray information panels are not implemented. Scene buttons accept controller selection rays; physical headset verification is still required.
- Face and sky authoring, semantic segmentation authoring and hosted 8th Wall services are not implemented. The bundled framework and separately licensed SLAM binary have different licenses; see README and vendor notices.
- Automated pose tests verify cue transitions, pause, manual interruption, seeking and tracking-reset compensation. They cannot prove camera drift, image recognition or physical SLAM accuracy. The full-space Guided XR8 startup reached camera-requesting state in the desktop in-app browser but timed out without a camera grant; its Web 3D recovery preserved the story URL. Real Android, iOS, embedded-app and headset testing is still required.

## Starting stories and verification

All four starters export and reopen as self-contained JSON. Each has three chapters, six composed camera cues, an inspectable model, caption prompts and a timed light tour. The geometry is deliberately illustrative, with no fabricated testimony or reporting.

The rebuilt Shadows export contains four chapters, 28 camera cues, six soundscape sources, English and Finnish content, and referenced media files, including the restored intro films, tutorial illustrations and title artwork. scripts/verify-shadows.mjs exports, reopens, validates and SHA-256 checks every embedded file. See the latest verified-exports/source-restored/verification.json for file counts and hashes. The runtime and editor tests include portable buttons, intro routes and non-AR recenter regression checks.

## Reproducible intro reconstruction

`scripts/rebuild-shadows-intro.mjs` reads the original tutorial text, icon layers, mode-icon SVGs and credits from the supplied source. It copies the original missing media, reconstructs the cinematic ending from its source text and timing, and writes ordinary screen-designer data to the rebuilt example. It never changes the original project. Run it from the repository root only when intentionally rebuilding the example; it replaces that example's screen design. Reader behavior is implemented in the shared renderer and authoring controls, not in a Shadows-only runtime.

The original text and artwork are preserved. Percentage-based desktop/mobile layouts replace device-height CSS offsets, so this is responsive reconstruction, not a claim of pixel-identical output at every viewport. The information page uses a keyboard-scrollable text block. Physical XR verification and the explicitly listed remaining differences above are still outstanding.
