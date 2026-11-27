# T4SC — Tech 4 Skill Community

A multi-page recruitment and admissions website for T4SC, based on the Axion Marketplace Next.js project foundation and adapted for T4SC.

## Public pages
- Home, About, Departments, Admissions, Recruitment journey, Assessment framework
- Multi-step application form with local draft saving and a review stage
- Community code of conduct, privacy and accessibility pages
- Applicant portal for private status lookup
- General screening, department/level assessment, practical task and completion pages
- Team sign-in page with Supabase email/password authentication and a protected reviewer workspace landing page
- Applicant portal for private status lookup

## Application questions and schema v1

The feature branch contains the founder-approved application form:
- Required email, name to use in T4SC, country, primary and different alternative department, experience route, motivation (50–150 words), learning/goals (30–120 words), weekly availability and separate declarations.
- Optional city/region, prior experience/project description (up to 150 words), one HTTPS work-sample URL, and a private accessibility/support request (up to 500 characters).
- Weekly availability: Less than 2 hours; 2–4 hours; 5–7 hours; 8 or more hours; Not sure yet.
- New experience routes: Beginner, Developing, Experienced. Legacy Advanced records remain supported internally.
- No mandatory portfolio or file upload. No full date of birth, home address or identity-document collection.

The new wizard preserves a local draft and the server validates the same limits. The feature branch's v1 flow requires a verified Supabase Auth magic-link session and binds each new application to the authenticated user. Production Auth redirect configuration still needs to be set and verified in the Supabase dashboard.

## Assessment flow — implementation status

The app still uses shortened legacy question screens. They are not the complete official assessment banks in the T4SC AI Developer Execution Pack v1.0. The 42 answer-key records are tagged `legacy-ui-sample-v0` and must not be treated as the production examination. LP-A v0.1 is stored in a private database table in draft-not-approved state; its question bank is not exposed to applicants or the attempt API.

Target weighting:
- Common Reasoning: 12 raw marks → 15 weighted points
- Department Assessment: 20 raw marks → 25 weighted points
- Learning Potential: 20 raw marks → 20 weighted points
- Practical Assessment: 40 raw marks → 40 weighted points

The scoring core is versioned but draft-only; it cannot produce a live admission decision. Written/practical rubric-based automatic evaluation and calibration are outstanding.

## Assessment security and attempt lifecycle

- The T4SC `t4sc-api` Edge Function is deployed as version 10. It fetches objective answer keys server-side. The answer-key table has RLS enabled; `anon` and `authenticated` have no select grant.
- Database uniqueness enforces one final submission per application/component. Idempotency keys support retries after a lost response.
- Assessment screens for Common Reasoning, department and practical are connected to server-owned attempt start/read/save actions. The server stores only a SHA-256 hash of the client-generated attempt token.
- The attempt hook persists the attempt envelope on the applicant's device, restores the latest local/server checkpoint, and saves changed responses every 10 seconds. It shows Saving/Saved/Not confirmed; final submission requires a confirmed latest checkpoint and is bound to the official attempt token.
- No countdown/expiry is active because the approved time-limit settings are not configured. A complete technical/accessibility reopening workflow remains outstanding.
- The feature-branch applicant access path now uses verified-email magic links and server-side ownership binding. Production Auth redirect configuration and further lifecycle tests remain outstanding. Rate limiting is not yet implemented.
- Written/practical automatic evaluation, the full 15-day admissions state machine, alternative-department transfer, formal offers and the 48-hour response job are not complete.

## Current deployment state

Supabase migrations 0001–0010 are applied. The Edge Function is live at version 10. The current branch passes 42 automated tests and a Next.js production build (TypeScript and all 24 routes). Vercel could not generate a fresh preview because its daily free-tier deployment API limit (100 deployments/day) was reached. The production site has not been redeployed from this branch.

The GitHub repository is currently public and earlier commits contain browser-side answer-key copies. Treat them as exposed: current branch cleanup does not purge repository history.

## Design and accessibility
Responsive multi-page navigation, dark navy base with warm orange/yellow accents, animated ambient background, scroll reveal, floating/orbiting hero elements and reduced-motion support. Motion is CSS-led and lightweight; the site respects the user's reduced-motion preference.

## Stack
Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase and Vercel.

## Supabase setup required before live submissions
The T4SC project is already created separately; do not reuse Axion credentials or the Axion database. Applied migrations:
- supabase/migrations/0001_t4sc_recruitment.sql
- supabase/migrations/0002_application_and_assessment_fields.sql
- supabase/migrations/0003_service_role_grants_and_fk_indexes.sql
- supabase/migrations/0004_assessment_submission_security.sql
- supabase/migrations/0005_assessment_attempts.sql
- supabase/migrations/0006_experienced_route_name.sql
- supabase/migrations/0007_application_schema_v1.sql
- supabase/migrations/0008_applicant_auth_identity.sql
- supabase/migrations/0009_assessment_bank_content.sql
- supabase/migrations/0010_private_api_proxy_secret.sql

Configure Vercel environment variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY
- The T4SC Edge Function uses Supabase's server-managed service-role secret internally; do not copy it into client-side code

Application, status and assessment API routes forward requests to the private-data Edge Function. Its deployable source is versioned at `supabase/functions/t4sc-api/index.ts`; the deployed function uses the project-managed service-role secret internally, and that key is never sent to the browser or stored in Vercel. The deployed `t4sc-api` function is version 10. A Sensitive `T4SC_API_PROXY_SECRET` is used server-to-server for verified application v1 and official attempt operations; only its SHA-256 digest is stored in `private_system_secrets`. A private LP-A draft bank is stored in `assessment_bank_content`; it is not published or attempt-enabled. Reviewer access must be implemented with authenticated roles and appropriate RLS policies before reviewers access applicant data. The status endpoint exposes only an applicant's own stage, never answers or reviewer notes.

## Founder decisions still to confirm before public recruitment promotion
Geographic eligibility, participation mode, weekly minimum commitment, intake capacity, recruitment deadline/window, assessment language options, application fee, foundation-route support, reapplication period and privacy/retention details. The public copy deliberately does not invent these.


## Applicant account access
- `/applicant-access` sends a passwordless Supabase email link and creates an Auth account where needed.
- New application v1 submissions require a verified Auth email and store the owning `auth_user_id`.
- Applicant status, assessment attempt and community-access endpoints require the verified account session and matching email.
- An unowned legacy application can be claimed only when the verified account email matches its stored application email.
- Configure the Supabase Auth Site URL as `https://t4sc-recruitment-website.vercel.app` and allow `https://t4sc-recruitment-website.vercel.app/auth/callback`. This configuration is still a dashboard action and has not been verified through the connector.

## Team sign-in
- `/login` is for authorised T4SC team accounts only; public self-registration is disabled.
- `/admin` requires a valid Supabase Auth session. The current page confirms authentication but intentionally does not expose applicant data until T4SC reviewer roles and matching RLS policies are implemented.
- `/auth/callback` supports Supabase invite, email OTP and PKCE callback links. Configure the Supabase Auth Site URL and redirect allow-list to include the production domain and `/auth/callback`.
- The browser uses only the Supabase publishable/anon key. Keep all service-role or secret keys server-only.

## Preview safety
- Vercel Preview has `T4SC_PREVIEW_READ_ONLY=true` and `NEXT_PUBLIC_T4SC_PREVIEW_READ_ONLY=true`.
- The Next.js API helper blocks applicant and assessment writes in preview/development before they reach Supabase; read-only status checks remain available.
- Production does not have these preview-only flags. The separate server-only `T4SC_API_PROXY_SECRET` protects the verified v1 application and official assessment-attempt calls from direct Edge Function invocation.

## Join T4SC Community and private Telegram access
- The public homepage includes a dedicated Join T4SC Community section. Its CTA leads to the application; it does not expose a Telegram invite.
- The applicant portal requests a Telegram invitation only after the applicant's reference and email have been verified and the recorded status is `admitted`, `onboarding` or `active_member`.
- Configure `T4SC_TELEGRAM_INVITE_URL` as a **Sensitive** server-side Vercel environment variable. Never prefix it with `NEXT_PUBLIC_` and never put the invite in client components or source control.
- The `/api/community-access` route re-checks the application status on the server before returning the invite and sends `Cache-Control: no-store`.
- A shared Telegram invite can still be forwarded by a recipient. For stricter one-person admission, replace it later with unique, limited-use Telegram invite links generated through an authenticated Telegram bot.
