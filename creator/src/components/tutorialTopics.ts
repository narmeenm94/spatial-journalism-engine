export const tutorialTopics = [
  {
    "id":"intro-flow", "title":"An introduction before the story", "category":"Screens & identity", "tab":"ui",
    "steps":[
      "In Screen designer, choose the Intro flow starter. For an existing design, Add intro flow connects its start buttons to illustrated tutorial pages and a film screen. Undo restores your previous routes.",
      "Each tutorial page is an ordinary editable screen. Change its words and artwork, drag the elements, and connect Next, Back and Skip buttons using Go to screen.",
      "Select the Intro video screen and open Background > Intro video. Upload a film for each language, choose sound, and set what happens when it ends. Readers can play, pause or skip; a blocked autoplay shows a Play intro button.",
      "A Guided or Explore choice can be remembered by a Go to screen button and carried through the tutorial and film. The final Start experience uses that choice. Check the complete sequence in Preview on desktop and mobile.",
      "Add mode chooser gives you selectable Guided and Explore cards plus a separate Continue button. In Action, Select a mode stays on the screen. Use Go to screen on Continue. In Background > Audience & flow, show a lesson only to Guided or Explore readers and choose where everyone else continues.",
      "Use Style for borders, delayed appearance, vertical or horizontal swipes, depth movement and scale pulses. Layer separate images for a device, hand and arrows. Add language buttons with Change language; enable scrolling on a text block for information and credits.",
      "The entire flow, localized artwork and film bytes are included in Export story’s single JSON."
    ]
  },
  {
    "id": "scene-buttons", "title": "Buttons inside your scene", "category": "Interaction", "tab": "timeline",
    "steps": [
      "In Chapters, open Scene buttons and choose Add scene buttons. A Continue button appears in front of the starting camera. Move and scale it directly in the canvas.",
      "Choose Text, Image or 3D model. Upload a PNG for a floating sprite, or a GLB for an object readers can tap. Set its label and image separately for each language.",
      "Choose Next chapter or a specific destination, then From the start, When the chapter ends or At a set time. Use several buttons to offer readers a choice. Text buttons need no media.",
      "Try in audience camera jumps to its reveal time. Tap the actual button there to play its destination chapter. Restore the scene view to keep editing. Preview tests the complete experience; its menu icon contains navigation and settings.",
      "Export story includes the buttons, routes, transforms and uploaded images/models in your single JSON file. Reopen that JSON to keep editing."
    ]
  },
  {
    "id": "tool-templates", "title": "Start with something ready", "category": "Start here", "tab": "camera",
    "steps": [
      "New offers complete story starters. Screen designer offers opening-screen layouts. Inside camera, lighting, soundscape and ending tools, visual template cards give you a smaller starting point.",
      "Camera templates add moves after your existing stops; sound templates add an editable sound setup. Choose or upload your own audio. Lighting templates adjust the selected chapter. Ending templates give you editable closing copy.",
      "Captions → Appearance & templates offers Classic, Clear, Paper and Cinema. Select a look, choose your own font and colours, and adjust spacing. Every template becomes ordinary editable story settings. Undo restores the previous design."
    ]
  },
  {
    "id": "caption-design", "title": "Design your captions", "category": "Screens & identity", "tab": "subtitles",
    "steps": [
      "Open Appearance & templates in Captions. Choose a visual preset, then adjust the font, desktop and mobile sizes, text colour and caption bar.",
      "Open Placement & spacing to move captions to the top or bottom, set their distance from the edge, alignment, width, padding and corners. Set bar opacity to zero for text without a background.",
      "See in audience view shows the design over your actual scene. The web player uses these settings; headset captions use the chosen type and colours in a spatial panel. Export saves the caption design and embedded fonts in the same JSON."
    ]
  },
  {
    "id": "playback", "title": "See your story come alive", "category": "Canvas", "tab": "timeline",
    "steps": [
      "Press Play timeline. Your chapter plays in the canvas: video projections, narration, animated characters, captions, light cues and the guided camera share one playhead. The audience inset opens automatically.",
      "Use the expand icon on the audience camera to fill the canvas, like a game view. Pause or drag the Scene playhead to inspect a moment. The restore icon or Escape restores your editing camera without changing the story.",
      "Switch tools while playback continues. Stop or Back to editing restores all objects for placement. Choose another chapter to rehearse it. Preview remains available for testing home screens, reader interactions and device-specific XR."
    ]
  },
  {
    "id": "fonts",
    "title": "Typography that travels",
    "category": "Screens & identity",
    "tab": "ui",
    "steps": [
      "Select text or a button in Screen designer, open Style, and choose Browse fonts & upload. Preview the font families, search by name or style, and choose one.",
      "Upload WOFF2, WOFF, TTF or OTF files through Upload your own font. Name the font and identify regular, bold, italic or variable weight. The font must allow embedding and sharing.",
      "Library and uploaded font files, license information supplied by the library, screen layouts, buttons and actions are included in the exported JSON. Reopening it restores them. System fonts remain device-dependent fallbacks."
    ]
  },
  {
    "id": "workspace",
    "title": "Make room to work",
    "category": "Start here",
    "tab": "timeline",
    "steps": [
      "Drag a divider to widen Chapters or Details, or raise the timeline. Your panel sizes are remembered on this device. Double-click a divider to reset it.",
      "Use a panel’s expand button to fill the workspace. Escape restores the layout; Focus canvas gives the space your full attention. Reset layout restores all panel sizes and visibility.",
      "Screen designer has its own draggable sidebars. The design fits the available area while layers and settings scroll separately. On smaller screens, use Layers, Design and Settings to switch views."
    ]
  },
  {
    "id": "first-story",
    "title": "Your first spatial story",
    "category": "Start here",
    "tab": "assets",
    "steps": [
      "Choose New and a starter: Gallery, reporting model, interview or artifact. Each includes three chapters, composed camera views, a light tour and inspectable objects.",
      "Rename the story; use Chapters → Title & timing to rename chapters. Replace the example captions with your own reporting; the starter geometry is illustrative.",
      "Add media, Preview the reader experience, then Export story. The JSON includes the files needed to reopen and edit it."
    ]
  },
  {
    "id": "space",
    "title": "Build and navigate your space",
    "category": "Canvas",
    "tab": "assets",
    "steps": [
      "Import a GLB in Media library and use it as the environment. Select Environment to adjust its scale and position. Models and their child media share these coordinates.",
      "Select an object in the chapter tree. Use Move, Rotate or Scale and drag its handles. F focuses the selection. Open Details for precise values. Expand Position, Rotation or Scale when you need numeric control.",
      "The large canvas is your editing view. Play follows the guided camera in the audience inset; its expand icon fills the canvas. Moving your editing camera does not change the audience camera."
    ]
  },
  {
    "id": "chapters",
    "title": "Chapters, pacing and timeline",
    "category": "Story structure",
    "tab": "timeline",
    "steps": [
      "Add, rename and reorder chapters in the left panel. Each chapter owns its narration, videos, characters, captions and light cues.",
      "Set a chapter duration for a silent story. Otherwise media, captions and camera cues determine its length. The timeline positions events in seconds; property fields marked ms use milliseconds.",
      "Play timeline rehearses the selected chapter with real media, camera movement and captions. Scrub to inspect a moment, pause to hold it, or Stop to return to editing. Preview tests the complete reader journey."
    ]
  },
  {
    "id": "guided",
    "title": "Build a guided camera tour",
    "category": "Camera",
    "tab": "camera",
    "steps": [
      "Frame your destination in the large canvas. In Camera path, choose a start time and Capture current view. Repeat for later moments.",
      "Select a stop to edit its time, move duration and easing. Edit from this view returns the editor to it; Replace with current view updates the destination. Scrub or play the camera preview.",
      "In the reader, every cue moves from the reader’s current position. Physical tracking remains additive. Dragging interrupts that move until the next cue. Recenter returns to the latest destination. A duration of zero makes an immediate cut."
    ]
  },
  {
    "id": "modes",
    "title": "Guided, Explore and full-space navigation",
    "category": "Camera",
    "tab": "camera",
    "steps": [
      "Choose Move inside a full-size space for an experience like Shadows. Readers choose Guided or Explore before starting. This does not ask them to place the room on a table.",
      "Explore on phone uses SLAM world tracking, with touch movement as an alternative. Guided normally uses orientation and touch; enable Physical movement + touch for tracked Guided mode.",
      "For a miniature or artifact, use Place a model in the world. Web 3D supports manual and guided navigation. Headset VR follows the headset; automatic camera travel is not applied there."
    ]
  },
  {
    "id": "bounds",
    "title": "Starting view, movement and bounds",
    "category": "Camera",
    "tab": "camera",
    "steps": [
      "Select Audience camera in the tree to edit its initial position and rotation, recenter pose, movement speed and room bounds.",
      "Bounds are world coordinates. Keep destinations inside the bounds, including the buffer around each edge. A narrow bound can prevent a planned view from being reached.",
      "Readers can turn off sideways drag rotation in the playback bar. Physical device orientation remains available in phone tracking modes."
    ]
  },
  {
    "id": "media",
    "title": "Portable media and linked files",
    "category": "Media",
    "tab": "assets",
    "steps": [
      "Upload GLB models, audio, video, images and fonts into Media library. File names are the references stored in the story.",
      "A linked JSON needs its media folder URL or matching local files. Check linked files before previewing. A missing file is not replaced with a silent placeholder.",
      "Export story embeds referenced media into one JSON. Large videos make large JSON files; compress media before import. Open the exported file in a fresh player to verify portability."
    ]
  },
  {
    "id": "audio",
    "title": "Narration and moving spatial audio",
    "category": "Sound",
    "tab": "timeline",
    "steps": [
      "Add Audio to a chapter, choose its file and set delay, volume, loop and playback duration. Zero duration plays to the end. Use Autoplay for scheduled narration.",
      "Enable Positional Audio and set where it comes from. Reference distance controls the full-volume area; maximum distance limits attenuation. Use headphones to judge the result.",
      "Expand Moving audio in Properties. Add timed positions to move the sound through the space, as in the original Shadows walking tour. Times are relative to that recording, in seconds."
    ]
  },
  {
    "id": "soundscape",
    "title": "Ambience and object sounds",
    "category": "Sound",
    "tab": "soundscape",
    "steps": [
      "Open Soundscape and Add ambient sound. Upload or choose a recording, set its volume and loop behavior. These sounds continue across chapters.",
      "Choose The story is playing for background ambience. Choose an inspectable object to play the sound while that object is opened; returning it stops the sound.",
      "Enable positional sound and set its coordinates inside the model. Adjust full-volume distance and falloff. Pause and the ending also pause the soundscape."
    ]
  },
  {
    "id": "video",
    "title": "Video screens and multi-wall projection",
    "category": "Media",
    "tab": "timeline",
    "steps": [
      "Add Video to the chapter and choose a file. Position and rotate the screen; set width, height, opacity, start time and duration.",
      "Enable Multi-wall, then add projection surfaces in Properties. Each surface has its own position and rotation and plays the same video in sync.",
      "Mute projected footage when narration supplies the audio. Preview to check decoding, autoplay behavior and visibility on the intended device."
    ]
  },
  {
    "id": "characters",
    "title": "Animated characters and static objects",
    "category": "Objects",
    "tab": "assets",
    "steps": [
      "Add a character or a static GLB object to a chapter. Choose its model, position, rotation and scale.",
      "For an animated GLB, choose its animation clip. Delay, duration, fade in and fade out control when it appears. Fields marked ms use milliseconds.",
      "Use a static object for furniture or props that do not need character animation. Select it in the hierarchy to edit its transform."
    ]
  },
  {
    "id": "interaction",
    "title": "Objects readers can inspect",
    "category": "Interaction",
    "tab": "assets",
    "steps": [
      "Use Add interactive object in the hierarchy. Choose a model and write its localized name and information text.",
      "Original is its resting transform. Transformed is the position, size and rotation when tapped. Enable information and optional rotation to inspect it.",
      "Connect an object sound in Soundscape. Preview, tap the object to open it, then tap again to put it back. Chapter interaction outlines make objects easier to discover in Web 3D."
    ]
  },
  {
    "id": "light",
    "title": "Lighting, spotlights and atmosphere",
    "category": "Lighting",
    "tab": "lighting",
    "steps": [
      "Select a global light in the hierarchy to set color, intensity and position. Chapter Lighting multipliers adjust that base; 1 keeps it unchanged.",
      "Add a chapter spotlight and set its position, target, angle and intensity. Volumetric beams help guide attention through a room.",
      "Lighting also offers a timed flicker effect and dust particles. Keep effects restrained and check the actual reader player on lower-powered phones."
    ]
  },
  {
    "id": "light-tour",
    "title": "A timed light tour",
    "category": "Lighting",
    "tab": "lighting",
    "steps": [
      "Enable Timed light tour in Lighting. Add waypoint times and positions where the audience should look.",
      "Set the room’s light levels during and after the tour, and write a guidance message in each story language. The light moves independently of the reader’s camera.",
      "Coordinate light points, narration and camera stops around the same moments. Preview the full chapter to check them together."
    ]
  },
  {
    "id": "language",
    "title": "Captions and languages",
    "category": "Accessibility",
    "tab": "subtitles",
    "steps": [
      "Add story languages in Appearance, then choose an editing language in the top bar. Fill the same chapter titles, captions and interface text for each language.",
      "Each caption has start and end times in seconds. End must be later than start. Keep text readable and give the audience time to look at the scene.",
      "Readers can switch language in the player menu. Translation text does not generate a translated recording; provide the actual media your story needs."
    ]
  },
  {
    "id": "ending",
    "title": "Create a considered ending",
    "category": "Story structure",
    "tab": "ending",
    "steps": [
      "In Ending, write the final text, quotes and link to further reporting. An optional video can accompany the ending.",
      "Choose whether the ending follows audio, the last video or a character fade, and select the relevant chapter or character where provided.",
      "Preview the final chapter all the way through. Choose Readable page or Cinematic sequence. Cinematic endings expose fade, reading and quote timings, video visibility and a return-to-title option. Play ending here uses the same renderer as the player, with pause, seek and skip controls."
    ]
  },
  {
    "id": "appearance",
    "title": "Design screens, buttons and actions",
    "category": "Appearance",
    "tab": "ui",
    "steps": [
      "Open Screen designer and choose Editorial, Cinema or Choose a path. Select an element, drag to move it, or drag its corner to resize. Arrow keys nudge; Shift moves further. Undo lets you experiment. Use Desktop and Mobile / XR launch to arrange each layout independently.",
      "Add text, images and buttons. Upload an image or looping video background, PNG button artwork or a horizontal sprite strip. Use Content for words and artwork, Style for typography and animation, and Action for button behaviour. Try buttons previews screen navigation; studio Preview runs the actual experience.",
      "Set each button to Start experience, Go to screen or Open web link. Start buttons choose Web 3D, Phone AR, Headset VR or automatic selection, plus Guided or Explore. These are launch screens before entering XR; headset controls stay in the player. All screen media is embedded on export. Project & AR settings contains languages, fonts and tracking."
    ]
  },
  {
    "id": "ar",
    "title": "Phone AR, image targets and VR",
    "category": "Publish",
    "tab": "ui",
    "steps": [
      "Serve the player and its media over HTTPS. Camera permission is requested when the reader starts phone AR; Web 3D is available when a device cannot start XR.",
      "For surface AR, scan slowly and tap a detected surface. For image AR, prepare and select the image target in Appearance, then point the phone at the physical image. Full-space stories skip placement.",
      "Check on a real phone in the intended lighting. Desktop preview cannot prove physical tracking quality. VR needs a compatible headset browser and uses its physical viewpoint."
    ]
  },
  {
    "id": "save",
    "title": "Save, recover and share",
    "category": "Publish",
    "tab": "assets",
    "steps": [
      "The workspace saves automatically in this browser. Use Export story for a portable JSON backup that you control.",
      "New and Open preserve a previous-workspace checkpoint. Restore it if you replaced the wrong project. Ctrl or Cmd + Z undoes edits within the active story.",
      "Share the JSON for editing or load it in the deployed player. Use a media folder URL for linked projects; do not assume recipients have files from your computer."
    ]
  },
  {
    "id": "shadows",
    "title": "How Shadows maps to the editor",
    "category": "Source example",
    "tab": "camera",
    "steps": [
      "The imported experience has four chapters, both languages, 28 camera destinations, character animations, projected footage, seven inspectable objects and six ambient or object sounds.",
      "Explore and Guided follow the original mode distinction. Camera destinations include the original rig offset; the next move starts from the reader’s actual view. Tracking-status changes preserve the last world pose.",
      "Original floating chapter buttons are editable under Scene buttons. Screen designer contains the original mode cards, animated tutorial, intro film, language buttons and credits. Its ending uses readable text and video controls. Phone tracking, embedded-app behavior and headset interaction still need testing on the devices you intend to publish for."
    ]
  }
] as const
