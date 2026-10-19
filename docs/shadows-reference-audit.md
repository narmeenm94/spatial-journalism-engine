# Shadows reference audit

19 October 2026. Reference: [Rintamaklinikan_varjot](https://github.com/narmeenm94/Rintamaklinikan_varjot/tree/bc8595080f4976da1a0a3c58ad826b7a8980461f), commit `bc8595080f4976da1a0a3c58ad826b7a8980461f`.

The user has verified the original [GitHub Pages experience](https://narmeenm94.github.io/Rintamaklinikan_varjot/) on a phone. This audit fetched that entry point and pinned source, compared source files to the supplied project, exercised the exported studio player on desktop, and verified media integrity. It does not substitute for testing the adapted runtime on phones.

## What changed

| Finding | Correction |
| --- | --- |
| Studio used the standard framework with the exported SLAM chunk for all world stories | Added `project.ar.runtime: "exported"` as an opt-in paired framework. The rebuilt Shadows document selects it. Existing stories retain the standard default; image tracking retains the standard image tracker. |
| The original exported loader accepts `slam`, while the newer framework supports `slam: URL` | Loader uses the appropriate convention, checks that XrController exists, and reports incomplete runtime files before creating a scene. The browser smoke test caught and verified this compatibility distinction. |
| iOS motion permission was absent from the intro flow | Mode selection requests motion/orientation in a reader gesture before tutorials/video. Video completion requires a final gesture when permission is still needed. Denial leaves an actionable message. |
| Coaching events were listened for but no overlay module was registered | The self-contained original coaching overlay is now bundled and enabled for world tracking, with English/Finnish prompts and an author setting. Orientation and image modes do not register world coaching. |
| Full-space AR excluded outlines, and rendering defaults differed between startup paths | Full-space AR uses the outline composer in the XR8 render callback. Shared renderer defaults are applied to both modes. Shadows exposure is restored from 1.4 to the source value of 2. |
| A browser resize could replace XR8’s calibrated projection | XR8 retains ownership of projection and renderer resize. The studio sizes the canvas buffer to its host and resizes the outline composer using XR8's reported buffer dimensions. |
| Phone output occupied a small rectangle because the original `XRExtras.FullWindowCanvas` behavior was missing | Added a reusable canvas-sizing pipeline module before renderer startup. It maintains full-host CSS dimensions, bounds the buffer to camera resolution, and handles rotation, browser toolbar changes and embedded previews without changing the calibrated projection. |
| Touchscreen Windows laptops were classified as phones, and a preview URL could force phone tracking on desktop | Shared device detection distinguishes desktop, phone and tablet, and identifies iOS, Android, Windows, macOS and Linux. Desktop Phone AR links use Web 3D; phones and tablets retain AR. Explicit Web 3D and headset VR are preserved. |
| The exported tracker emits camera configuration before Three.js has created its camera | The integration queues early camera configuration and replays it after renderer startup or attachment, preserving the initial pose. A browser check with the real exported framework and SLAM chunk confirms the previous null-camera exception is resolved. |
| The original small skip button was absent | A reusable corner chapter shortcut supports artwork and cooldown. Shadows restores `icons/next.png`, five seconds, hiding at the final chapter and yielding to visible scene buttons. |
| An iframe preview could not be transferred to a phone | Preview can export a website ZIP containing the current story, media, player, vendor licenses and a SHA-256 player manifest. The entry point works under a hosted subfolder. |

## Runtime provenance

The exported option uses the framework and SLAM files already supplied in `external/xr`, matching the reference repository’s source copies. Its deployed `dist` files are separately minified and have different hashes; no byte-for-byte claim is made about those minified bundles.

| Reference source file | SHA-256 |
| --- | --- |
| external/xr/xr.js | a48f33aa90f77d306d04af3d99542fc928f070bca456db457304126a31ce9e1c |
| external/xr/xr-slam.js | ac717fd37a10a9bffb92d123860c1d176969ad344431bab389b9736378117d93 |

The optional binary retains its bundled license. The website exporter includes the licenses with the player.

The supplied Netlify deployment archive `deploy-6978c103dfa9c31036a2c81d.zip` was also inspected. Its bundled runtime files are minified and differ from source copies, including license-header formatting. Different hashes alone do not establish a runtime version mismatch. The working deployment's XRExtras module confirmed the missing canvas-sizing behavior; no vendor runtime replacement was required for that correction.

## Verification

Run from the repository root:

```powershell
npm run test:all
npm run build:studio
npm run audit:story-contract
node --experimental-strip-types scripts/verify-shadows.mjs "../verified-exports/reference-parity"
node --experimental-strip-types scripts/verify-website.mjs "../verified-exports/reference-parity"
```

The checks cover schema/import/export compatibility, the original four chapters, nine intro screens, 28 camera cues, six ambient sources, both languages and 63 media files. The website check packs the real media using the same exporter as the studio, verifies every media hash and all 41 player manifest entries, and extracts the result for independent browser testing. The production build reports size advisories for the tracking runtime and studio bundles.

Canvas regression coverage includes default 300 x 150 startup, high-density portrait rendering, landscape rotation, camera-resolution limits, unchanged-frame stability, listener cleanup, and renderer-before-composer resize ordering. A browser fixture using the actual Three.js renderer reproduced the default-size crop and verified full-host rendering after the fix. This checks rendering dimensions, not physical tracking.

After the sizing correction, all 126 automated tests passed (45 engine, 81 studio), and the production studio build passed. A fresh Netlify draft was created through the studio connection. All 41 hosted player files matched the local build and all 62 media files in the currently loaded workspace matched reference assets. That older workspace does not include the newer `icons/next.png` corner shortcut; the rebuilt example includes 63 assets. Hosted desktop checks covered the intro, video, scene rendering, captions and chapter selection without captured console errors. The corrected draft still needs physical phone tracking verification.

Browser verification covers the real exported runtime's scene/camera/renderer startup, the exported Shadows intro and video, desktop fallback when opening a Phone AR link, and chapter navigation. Desktop initialization is not evidence of physical tracking quality. The preview labels its desktop fallback explicitly.

## Original tracked camera rig

The phone rig now retains the original `camera-rig-controls.js` calculations and frame order: preserve the last world pose when coaching changes, solve the current animation against the current local sensor pose, apply device height/local-position rules, then constrain the world camera to room bounds. The computed parent quaternion is reduced to its Y/W components and normalized, exactly as in the source. The rig never adopts device pitch or roll. Animation starts from the last rendered world pose and uses the same quadratic interpolation. Guided cues and recenter use that same animation path. During a guided transition, the source animation takes precedence over drag input; desktop Web 3D retains its existing interruptible navigation.

Android Explore uses a 1.25 m rig offset. iOS Explore uses 0.5 m. Orientation-only Guided uses the original local camera position and a 1.5 m rig height. The original `isUsingApp=true` iOS branch retains its fixed-height and world-tracking behavior. These offsets are configurable as `camera.trackedHeight` in the JSON and Camera path settings. Existing immersive stories receive the original defaults automatically; surface placement and headset tracking do not use this rig.

Tracker startup now establishes the original authored origin and facing through `updateCameraProjectionMatrix`, before rig parenting. The rebuilt Shadows document has all 28 exact phone destinations imported from `guided-camera-controller.js` as optional `arPosition` and `arRotation` fields. The earlier desktop destinations remain intact. These phone overrides are editable per stop and survive the single-JSON export.

`node scripts/verify-tracked-rig-parity.mjs <reference-repository>` executes the actual original source beside the port, with identical sensor poses, coaching transitions, bounds, mouse movement, guided/recenter targets and animation times. All 1,920 frames across eight device/mode combinations match within floating-point tolerance (1e-8), including local camera transforms. This verifies the rig implementation, not sensor performance on hardware. `scripts/import-shadows-ar-cues.mjs` reproducibly imports the phone destinations from that same source.

The source and platform are not identical applications. The source loads Three.js r146, while this player retains its existing r128 runtime to protect working effects and loaders. Intro screens are editable responsive layouts rather than copies of the source's device-height CSS. Physical phone review is still required before claiming identical end-to-end output.

Full-space stories without an explicit runtime selection now use the original paired framework and SLAM chunk by default. Explicit runtime choices remain respected; surface/image stories retain their existing defaults.

The final rig revision passes 133 automated tests and the production build. The rebuilt single-JSON story and website package contain all 63 reference assets, all 28 phone destinations and all 41 verified player files. The rig parity check also includes repeated coaching notifications and manual navigation between animations.

Test the generated website over HTTPS on iPhone Safari and Android Chrome: grant/deny permissions, Guided and Explore, physical motion, tracking loss/recovery, device rotation, eye height, recenter, every in-scene button, object inspection, subtitles, video projection, outlines, audio and ending. Test the native WebXR path on supported hardware separately. A successful build or a desktop camera request does not prove SLAM accuracy or headset behavior.

## Tracking recovery event timing

The paired XR8 framework flushes queued events after its update callback batch. A tracker status event can queue a nested coaching notification that is delivered only after the next batch. Updating the immersive rig in `onUpdate` therefore allowed the reset sensor pose to overwrite the cached world pose before the coaching notification arrived. The isolated rig parity test did not model that pipeline timing.

Full-space XR8 stories now update immediately before the Three.js render callback, after the update event flush. This restores the original rig's render-phase recovery and applies the correction before either the normal renderer or outline composer draws. Surface/image AR retains its update-phase callback; desktop and native WebXR retain their existing loops. The rig calculations and device height policies are unchanged.

The regression test reproduces delayed coaching notifications with repeated horizontal position and yaw resets on Android and iOS. It fails on the previous pipeline, passes with the corrected timing, checks the first rendered frame and the following frame, and verifies physical translation still works afterward. The source parity harness now also includes abrupt coordinate resets across all 1,920 frames. Physical phone loss/recovery remains a separate acceptance test.

The recovery timing revision passes 134 tests (53 engine and 81 studio) and the production build. Render coverage verifies one update per frame before either direct rendering or the outline composer, with the existing update-phase behavior retained when not requested. The new hosted test passed verification of all 63 reference media assets and all 41 current player files.

## Narration clock and ending completion

The previous imported final character fade reached its ending threshold at approximately 85.3 seconds, while `Scene_4.mp3` is 155.0601 seconds long. The final projection starts at 27.5 seconds and lasts 69.93 seconds. Completing immediately at the fade threshold cut both media off. The source starts its ending presentation without the platform's global stop; copying only its visual trigger into that stop path was insufficient.

Narrated chapters now follow the first scheduled non-looping autoplay audio track's playback time. AudioManager uses the Web Audio context clock, as the original AudioManager does, so suspended audio cannot be overtaken by a wall-clock timer. Silent portions before and after narration retain timed progression. By default a ready ending trigger waits for non-looping chapter audio and video to finish, including buffering video. `ending.mediaBehavior: "continue"` instead presents the closing overlay without stopping narration or the scene. This source behavior is used in the rebuilt Shadows example and exposed in Ending settings. Explicit clip trims still apply, while looping ambience does not hold the ending open. Last-video ending delays follow the pausable chapter clock. Stale video callbacks are ignored after a chapter is reactivated or changed.

The original `sceneLoader.activateScene` waits 15 seconds before calling `CharacterLoader.loadCharacter`, which waits the same 15 seconds again. The rebuilt final Oleh character now represents that effective delay as 30 seconds, followed by the source's 3-second fade-in, 66-second linear fade-out, 0.05 opacity threshold and 6-second ending delay. The deterministic threshold is approximately 100.3 seconds; the original also adds asset-loading time and polls opacity once a second. The original closing overlay then takes 4 seconds to black, 2 seconds before text, 13 seconds reading, 3 seconds text fade, and the existing quote timings. Narration continues underneath. No restricted font is copied.

Regression coverage includes the actual Shadows timing mismatch, a slow first frame, suspended audio, pause/resume, narration outlasting video, buffering video outlasting narration, ordinary chapter completion, last-video endings, and the original closing-overlap policy. Single-JSON verification checks the ending policy and final character timing survive export/reopen. The narration/ending changes do not modify the SLAM rig or its recovery timing.

The final revision passes 140 tests (59 engine, 81 studio), the production build, and the 63-asset portable JSON and website export checks. A real hosted desktop run of the complete final chapter triggered Death at narration time 27.5 seconds, received its natural video `ended` event, showed the closing overlay while narration continued, then received the narration's natural `ended` event after 155.19 seconds (decoded buffer duration). Experience completion followed that event. No browser errors were captured. All 41 hosted player files matched the current build on the final file verification. Physical phone review of this final timing remains separate from the completed desktop run.

### Ending playback controls

For overlapping endings, Pause ending now calls the engine's chapter pause, stopping narration, active projections and ambience. The closing film and visual sequence follow the same chapter clock, including tracking or visibility pauses. Resume respects the existing AR tracking guard. Once chapter media finishes naturally, any remaining closing visuals continue on their own clock without restarting or jumping. Standalone ending previews retain independent playback and seeking.

While narration continues, the ending playhead is read-only and visual-only skipping is unavailable, preventing those controls from detaching the closing sequence from narration. Pause remains available if the closing buttons appear before narration ends. Regression coverage exercises the actual rendered buttons, narration and projected-video pause/resume, external pauses, tracking guards, completion handoff, and standalone preview controls. This revision passes 145 tests (64 engine, 81 studio) and the production build.

A browser run of the rebuilt website export paused the real closing control at 19.6 seconds into the ending. Its playhead and narration notifications remained frozen during the pause. Resuming continued narration from the same position through 155.19 seconds, followed by its natural ended event and experience completion. No browser errors were captured. The fresh website export verified all 63 media hashes and 41 player files; this check does not update an existing hosted deployment.
