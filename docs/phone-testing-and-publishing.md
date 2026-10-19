# Phone testing and publishing

The studio prepares a complete website. Netlify or another hosting service puts those files online and gives you a link. The studio turns that link into a QR code to open on your phone. You do not need to buy a domain name.

## Connect, test and publish with Netlify

The studio owner first [enables the Netlify connection](netlify-connection.md). This is a one-time application setup for a hosted studio, not a setup each journalist has to perform.

1. Open **Preview → Test on your phone → Connect Netlify**. Sign in or create your Netlify account in the window that opens and approve the studio connection.
2. Choose your team if you belong to more than one. Click **Create test link**. This uploads your story, its media and the verified player to a new Netlify project. Keep Preview open until it finishes.
3. The test address and QR appear automatically. Scan with your phone camera and open in Safari or Chrome. Allow camera and motion, then work through the device checks below.
4. If you edit the story, choose **Create updated test link**. Each test has its own address. Updating a test does not change your public version.
5. When satisfied, click **Publish this tested version**. The studio promotes that exact test to the project's main address and shows its public QR.

Uploads use Netlify's file digest API, with two files at a time. Only files Netlify requests are sent. There is no ZIP extraction or link copying in this flow. All Netlify plan, usage and access restrictions still apply. A draft link is **not automatically private**. Check your team access settings before uploading unpublished reporting.

**Stop** cancels local work and pending requests; already uploaded files or created projects may remain in Netlify. A connection error never automatically retries project creation or publishing. If a request may have reached Netlify, check **Manage hosting in Netlify** before retrying. If processing takes a while after uploading, use **Check test status**.

The connection and target project are kept for the current Preview session. Hiding the phone panel preserves them; closing Preview disconnects and clears that session. Existing websites stay in Netlify. To update one after closing Preview, use that project's Deploys page with a fresh website export. A new connection session creates a new project rather than overwriting an unrelated website. Access tokens are kept only in memory and never saved in a story, browser storage or export. Disconnecting clears the studio's token; revoke the application in Netlify to remove its grant too.

## Manual Netlify publishing

1. In **Preview → Test on your phone → Download a website or use another host**, click **Download website ZIP**.
2. Find the downloaded file. On Windows, right-click and choose **Extract All**. On Mac, double-click it. Open the extracted folder and confirm it contains `index.html`, `story.json`, `media` and `player`.
3. Click **Open Netlify Drop** in the studio. Sign in to your own Netlify account so you can manage the site later.
4. Drag the extracted folder onto Netlify's upload area. This uploads your story and media to Netlify. Wait for publishing to finish.
5. Netlify shows a **Preview URL** ending in `.netlify.app`. Open it to check the home screen, then copy the address.
6. Back in the studio, paste it into **Your experience link** and click **Show QR code**. Scan with your phone camera and open in Safari or Chrome.

Your account's Netlify plan and sharing settings apply. Netlify recommends the drag-and-drop tool for smaller projects and notes that large files can stall. Shadows is about 288 MiB with individual files above 10 MB, so prefer the studio connection or another supported deployment workflow for large documentaries. The manual QR generator only converts a link; it does not upload files.

To update a Netlify site, download and extract a fresh website ZIP. In the same site's **Deploys** page, drop the updated folder into its upload area. Keep using the same site's link and QR code. Dropping it on the new-site page instead creates a separate site.

## Publish with GitHub Pages

1. Open your story in the studio. Choose **Preview → Test on your phone → Download website ZIP**.
2. Extract the ZIP. Keep `index.html`, `story.json`, `media/`, `player/` and `.nojekyll` together.
3. Create a separate GitHub repository for the experience, for example `shadows-studio-preview`. This keeps the original working documentary deployment available for comparison. Add the extracted contents to the repository root using Git or GitHub Desktop. Upload the extracted files, not the ZIP. Large media may exceed GitHub's browser upload limit.
4. In that repository, open **Settings → Pages**. Select **Deploy from a branch**, then **main** and **/(root)**, and save. Wait for GitHub's Pages deployment to succeed. Open the URL shown by Pages and confirm the home screen appears.
5. Back in the studio's phone panel, paste that HTTPS address under **Your experience link** and choose **Show QR code**. Scan with your phone camera and open in Safari on iPhone/iPad or Chrome on Android. You can save the QR image for sharing.

For a repository named `shadows-studio-preview` under `narmeenm94`, the expected project address is `https://narmeenm94.github.io/shadows-studio-preview/`. This is an example until the repository is created and deployed. Use the URL reported by GitHub Pages.

GitHub Pages is one option. Any static host that serves the entire exported directory over HTTPS can host the experience. If your host provides password-protected previews, the phone must be able to sign in before loading it.

The QR generator runs locally. It does not transmit the link to a QR service or upload your story. It cannot verify whether a pasted website is deployed or reachable. It rejects insecure URLs, localhost and studio-only preview links. Use the hosted site's entry URL, not a GitHub repository page or the studio iframe URL.

## Verify on real devices

Run these checks on iPhone/iPad and Android hardware you intend to support. Keep the original documentary open separately for comparison.

| Check | Expected result |
| --- | --- |
| Start, language, intro and video | The intended artwork, language, tutorials and video appear. Skip and Next lead to the correct screen. |
| Permissions | Camera and motion requests follow a tap. Denying access gives a useful recovery path. |
| Explore | Walking and turning move the viewpoint consistently through the scene. Phone motion controls the view rather than only touch dragging. |
| Guided | Each cue moves smoothly toward the authored view. Look-around and touch input work; physical translation depends on the selected Guided tracking setting. |
| Tracking recovery | Briefly cover the camera or point at a featureless surface, then return to the room. The experience recovers without a permanent freeze or an uncontrolled jump. |
| Recenter and rotation | Recenter restores the intended placement; rotating the screen does not stretch the scene or cause a floor-level desktop view. |
| Chapters | The in-scene buttons appear at their authored time, respond to a tap and advance to the correct chapter. |
| Story media | Narration, video, captions, interactions, outlines and ending work throughout all chapters, in both languages. |
| Web 3D and VR | The same hosted link works on desktop without requesting phone AR. Test headset VR separately in compatible hardware. |

Record the phone model, OS/browser version, tested URL, selected mode and any failing step. A desktop preview, a successful QR scan or a successful build is not proof of physical tracking quality.

## Publish updates and keep the authoring file

After editing, export a new website ZIP and replace the hosted contents with that complete export. Deploy again and reload the phone page. The same QR code continues to open the same URL, but it only shows the latest version once your host serves it. There is no automatic live sync between the local studio and hosting.

**Export story** remains the portable, editable single JSON document, including referenced media. Keep that as the master backup. The website export separates media so browsers can stream it efficiently. Pushing the engine's source repository updates the software source; publishing an experience is a separate deployment.

References: [Netlify drag-and-drop publishing](https://docs.netlify.com/manage/projects/add-new-project/), [GitHub Pages setup](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site), [publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [browser secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts).
