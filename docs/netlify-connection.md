# Enable the Netlify connection

The studio connects each author to their own Netlify account using Netlify OAuth. The studio owner registers the application once before sharing the studio. No backend, Client Secret or personal access token is required for this browser flow.

## One-time owner setup

1. Sign in at [Netlify applications](https://app.netlify.com/user/applications). Under OAuth applications, register a new application named **Spatial Journalism Studio**.
2. Set its redirect URI to the address shown under **Preview → Test on your phone → Enable Netlify for this studio**. It must match the studio's origin and path exactly.
   - Local studio: `http://127.0.0.1:3000/netlify-callback.html`
   - If opened using localhost: `http://localhost:3000/netlify-callback.html`
   - Hosted example: `https://studio.example.org/netlify-callback.html`
   - Hosted in a subdirectory: `https://example.org/studio/netlify-callback.html`
3. Copy the application's **Client ID**. Do not copy its Client Secret. To try it locally, paste the public Client ID into the studio setup field and click **Connect Netlify**.
4. For permanent configuration, create `creator/.env.local` with `VITE_NETLIFY_CLIENT_ID=your-public-client-id`. Restart the local studio. For a hosted studio, configure that environment variable in its build environment and rebuild with `npm run build:studio`.
5. Register the hosted callback before distributing the studio. If separate local and production applications are needed, use the matching Client ID in each environment. Journalists using a configured studio see the normal Connect button and do not need application settings.

Keep `netlify-callback.html` and `netlify-callback.js` in the published studio directory. Vite copies them from `creator/public`. An experience export does not contain these files, the Client ID or account tokens. If your host uses a Cross-Origin-Opener-Policy header, OAuth popups must be allowed to retain their opener; a strict `same-origin` policy can prevent the return message. Verify with the hosted studio's actual headers and browser.

## Behavior and limits

- Sign-in opens Netlify, never a password form in the studio. The callback checks its origin, popup identity and random state, then removes the credential fragment from browser history. Tokens stay in memory for the Preview session.
- Connecting only lists teams. **Create test link** creates a new project and a draft deployment containing the website export. There is no automatic deployment during sign-in.
- The API endpoint is fixed to `https://api.netlify.com/api/v1`. Authenticated requests do not follow redirects. File paths are validated, and uploads are limited to two concurrent requests.
- The same packaging code supplies both website ZIP exports and direct uploads. Runtime files are checked against the built player manifest before a project is created.
- **Publish this tested version** verifies that the chosen deployment is ready and belongs to the current project before promoting it. Studio edits after the test are excluded until a new test is created.
- A test URL can be accessible publicly. The team's access rules, plan and usage limits apply. The studio does not configure paid plans, domains or access protection.
- Closing Preview disconnects the account and clears the current target. It does not delete hosted versions. Manage those projects in Netlify; use the manual ZIP update path to update an existing project after reconnecting.
- Timeout or Stop cannot guarantee a server request was undone. Check the Netlify dashboard before retrying an ambiguous creation or publication. Failed POST requests are not automatically retried.

## Verification before rollout

The automated tests use a simulated Netlify API and test OAuth state validation, draft uploads, content hashes, limited concurrency, cancellation, failures, HTTPS addresses and explicit publication. Website export tests compare the direct payload with the ZIP contents and preserve the Shadows story configuration.

After registering the real application, verify the live flow in the deployed studio: authorize, select a team, create a test link, open it on a phone, check story behavior, update a draft, then deliberately publish it. Test denied access, blocked popups and cancellation as well. Successful builds or simulated API tests do not prove live account permissions, hosting limits or device SLAM behavior.

Official references: [Netlify OAuth browser flow](https://developers.netlify.com/guides/generating-personal-access-tokens-with-netlify-oauth/), [API deployment guide](https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/), [API reference](https://open-api.netlify.com/).
