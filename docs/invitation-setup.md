# Invitation page

Share `/invitation`. After Yes, the page asks where to send the next link and
waits for the owner to allow the link in My Records before revealing Coffee,
Dinner, or Maybe another time.
Maybe is saved as `maybe`, not as a
rejection or acceptance. Coffee/Dinner displays a confirmation. Scheduling and
contact details are optional and only requested after opening the optional form.

The app records one basic visit per document load, including the invitation page,
without requesting geolocation. Failed visits retry on reconnect/focus with the
same ID; the app only marks them saved after confirmation. Responses and contact
drafts stay out of browser storage and URLs. The admin response list requires
Appwrite sign-in; database permissions enforce actual record access.

## Server configuration

### Owner-controlled follow-up

The link is blocked by default and does not open automatically after a time delay.
She can share a preferred delivery method/contact or decline to share contact
details. These are stored as `delivery_method` and `delivery_contact`. A signed
private link is stored as `next_link` and shown in My Records. The admin can
copy it anytime, then choose **Allow next question** or **Block next question**.
The recipient can copy her own return link before approval. Delivery is manual;
there is no scheduled email, SMS or WhatsApp sender in this project.

The recipient may save her return link and close the page. Opening it before
approval shows the waiting screen. The API rejects final answers without owner
approval even if browser state or the device clock is edited. Polling checks readiness every 30 seconds
while the waiting page is open. No new question is revealed until it is ready.

Approval requires a fresh Appwrite JWT from the signed-in account. The API
validates that JWT against Appwrite and checks the account ID matches the
configured admin. Approval is stored as a signed `link_access` entry; direct
public row writes cannot forge a valid approval. Blocking is checked on both
link opening and answer submission. This replaces the previous 12-hour unlock.

Keep `INVITATION_LINK_SECRET` stable and server-only, including when deploying.
A random local value has been generated in the ignored `.env`. Rotating this
secret invalidates existing links. If absent, the server uses the Appwrite key
as a fallback, so rotating that key will invalidate links too. Links grant access
to one session's next question; treat them as private. They contain no contact
details or responses, and only validated token holders can submit the follow-up.

Existing dedicated collections with an Enum `stage` attribute must add
`delivery_method`, `delivery_contact`, `next_link`, `link_access` to the allowed values. The
default shared collection uses existing text fields and needs no schema change.

Saves go through `POST /api/invitations`. It accepts same-origin JSON only,
limits request size, validates IDs, stages, choices, dates, times, time zones and
lengths, enforces question order and refuses to overwrite saved answers.
The endpoint returns success or safe errors, never response documents or keys.
Timestamps are generated on the server. There is no public read endpoint.

Set these server-only values in `frontend/.env` locally and in your deployment's
server environment settings. Never prefix them with `VITE_` or commit real values:

```dotenv
APPWRITE_API_KEY=your-server-key
APPWRITE_ADMIN_USER_ID=your-appwrite-user-id
```

The server uses the Tables API with `tables.read`, `rows.read` and `rows.write`
scopes against the same existing database. The browser's legacy collection reader
remains compatible with the same records. `tables.write` is additionally needed
while restricting table permissions during setup; it is not needed for normal
response saves after configuration is complete.
Existing VITE_APPWRITE endpoint/project/database settings are reused. Server-only
`APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_DATABASE_ID` and
`APPWRITE_INVITATION_COLLECTION_ID` can override them; keep browser reader settings
pointing at the same database and collection.

Vite runs the API locally with `npm run dev`. Vercel runs the Node function when
the deployment Root Directory is `frontend`. Static-only hosting and Vite's
`preview` command cannot run this API; use Node/serverless hosting alongside the
frontend. Restart Vite or rebuild/redeploy after changing environment settings.

## Private database setup

The API checks permissions before every write and refuses collection-level Read,
Update, Delete or Write grants to anyone except the configured admin. It assigns
new response documents Read/Delete permissions for that specific admin. Enable
Document security or grant the admin collection-level Read.

### Recommended: separate collection

1. Create `invitation-responses` in the existing database.
2. Enable Document security. Grant Read/Delete specifically to your admin user.
   Do not grant public collection permissions, including Create. The server key
   writes documents, preventing direct public writes that bypass API validation.
3. Create required attributes:

   | Attribute | Type | Size |
   | --- | --- | --- |
   | `session_id` | String | 36 |
   | `stage` | String | 16 |
   | `answer` | String | 256 |
   | `created_at` | String | 40 |

   The stage can instead be an Enum with `permission`, `invitation`, `date`,
   `time`, `timezone`, `contact_method`, `contact`. Appwrite validates required
   fields, types and lengths; the API validates answers based on the stage.
4. Set `VITE_APPWRITE_INVITATION_COLLECTION_ID=invitation-responses` for the browser
   build and server. Wait for attributes to become available before saving.
   Existing dedicated collections with answer size 16 need that increased to 256
   for optional contact details. Add your hostname as an Appwrite Web platform.

### Existing collection compatibility

Without an invitation collection setting, the existing check-in collection is
used. It reuses `event_type: "invitation"`, `what_happened` for the session,
`anger_level` for the stage, `what_wants` for the answer and `created_at`.
The admin list filters invitations; mood records exclude them.

Broad Read/Update/Delete collection grants must still be replaced with grants to
the configured admin. Enable Document security for existing mood documents to
continue using their document-level guest update permissions. Public Create may
remain for the mood form, but permits direct database writes that bypass the
invitation API; use the separate collection for strict server-only writes.
Historical document permissions are not migrated or audited by this change.

## Retries and privacy

Sending is confirmed only after the API confirms saving. Failed events remain in
memory and retry in order. Server-generated document IDs are derived from the
random session reference and stage. A retry checks that a saved answer matches,
preventing duplicates after a lost confirmation and rejecting conflicting answers.
Closing or refreshing discards unsent events. Skipping the optional form sends no
draft contact details. Proposed date/time includes the visitor's IANA time zone;
it is not a confirmed booking. The reader displays matching references together.

This anonymous page does not authenticate the recipient: anyone with the link can
submit. Use hosting rate limits on the POST endpoint if shared widely; an origin
check does not replace rate limiting. No API secrets belong in the frontend bundle.

## Page visibility and My Records

Settings includes switches for all six pages. Each switch saves immediately to
the existing settings document. Older settings retain their shop visibility;
other pages default to visible. Hidden public pages lose their navigation link
and redirect to the first visible public page. If all public pages are hidden,
visitors see an unavailable message. Visibility is a display control, not an
authentication boundary. Admin page switches hide navigation only; authenticated
admins can always open `/settings` and `/records` directly to avoid lockout.

The invitation is labeled **One Another Try** in navigation and Settings. Its URL
remains `/invitation`, so existing shared links continue to work.

My Records opens **All Records** by default, showing One Another Try and website
visit details together. Separate tabs filter each record type. Responses are grouped by their random session
reference. Initial/final choices, preferred date/time, time zone and any shared
contact details appear together. The reader follows database pagination so a
session's contact details are not lost at the first 100-entry boundary. Original
entries remain available under each card's disclosure. Matching references do
not establish a person's identity or combine sessions across devices.

Email, phone, WhatsApp and Instagram actions are generated only from recognized
methods and suitable values. Other values remain plain text and can be copied.
Actions open a contact app only when the admin clicks; no message is sent
automatically. Existing database permissions and API setup still apply.

Visit and check-in readers follow pagination and show newest entries first.
Their failures are isolated so an unavailable check-in does not hide valid
visits. Both record readers refresh on focus, every 30 seconds while visible,
and after a successful write. Refresh all records triggers both readers.

My Records checks `/api/invitations?status=1` and shows a configuration warning
when server credentials are missing. This check reports configuration presence,
not a successful database connection. Unsent answers cannot appear in records;
configure the server and retry while the original invitation page remains open.

## Verification commands

- `npm run test:invitation-api`: server validation, permissions, question order,
  private writes, retries and conflicts against a simulated Appwrite server.
- `npm run test:invitation`: browser flows, optional details, retries and admin
  access with intercepted requests; never creates real responses.
- Set `INVITATION_TEST_SHARED=1` to test the existing collection reader.
- `npm run build`: production build.
- `npm run test:records-integration`: the real browser and local API communicate
  over HTTP with an isolated Appwrite-compatible test database, without browser
  request interception. Tests cover retry, 125+ visits, all seven invitation
  fields, My Records, No and Maybe. This does not verify the production database;
  real server credentials and private collection permissions are still required.

Browser tests use installed Edge on Windows; elsewhere install Playwright Chromium
or set `PLAYWRIGHT_CHANNEL`. All choices are keyboard accessible, stationary and
at least 48px high. Motion respects reduced-motion preferences.
