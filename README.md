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

## Application questions
The form follows the T4SC Recruitment & Admissions System Specification:
- Preferred name, email, country/region and optional alternative contact
- Primary department, optional secondary interest and reason for department choice
- Beginner / Developing / Experienced route, what the applicant has tried or built, optional tools/topics
- Motivation and a technology problem the applicant would like to solve
- Weekly availability, session/team availability, device and connectivity
- Community-rules, honesty and privacy acknowledgements
- Optional accessibility/assessment adjustments

No exact date of birth or age gate is used. Device/connectivity answers are for participation planning, not a measure of ability. Previous technical experience and a beginner portfolio are not compulsory.

## Assessment flow — implementation status
The public app currently contains a legacy Common Reasoning mini-screen, a three-question department mini-screen and a practical response form. These are implementation placeholders and are **not** the complete approved assessment banks in the T4SC AI Developer Execution Pack v1.0.

The execution pack's target scoring structure is:
- Common Reasoning: 12 raw marks → 15 weighted points
- Department Assessment: 20 raw marks → 25 weighted points
- Learning Potential: 20 raw marks → 20 weighted points
- Practical Assessment: 40 raw marks → 40 weighted points

The versioned scoring core and candidate progression gates are currently draft-only and do not issue admissions decisions. The live Edge Function scores the objective portion of the current legacy mini-screens against server-side keys; written and practical rubric scoring remains pending. Do not treat the 42 seeded `legacy-ui-sample-v0` keys as the official assessment bank.

The target admissions model requires a validated automated evaluator and versioned qualification rules. A technical/scoring failure must remain pending or require technical review, never become an invented zero or automatic rejection. Cybersecurity scenarios remain fictional or explicitly authorised only.

## Assessment security implemented so far
- The live `t4sc-api` Edge Function retrieves objective answer keys server-side. The answer-key table has RLS enabled and no `anon` or `authenticated` grants.
- The Edge Function also exposes server-owned attempt start, read and versioned checkpoint-save actions. Attempt tokens are random UUID bearer values whose SHA-256 hashes are stored server-side. The current applicant screens are not yet wired to these attempt operations.
- Final submissions are protected by a database unique index on application plus component/pathway.
- The preview client sends idempotency keys and displays a receipt only after server confirmation.
- Written/practical scoring is not yet implemented; these are stored pending rubric evaluation.
- The attempt table records a server start time and confirmed checkpoint state; no timed expiry is active. Applicant-facing Start/Resume UI, 10-second autosave, visible save states, refresh/reconnect recovery and attempt-to-submission integration are still outstanding. Do not represent the current screens as having autosave.
- The GitHub repository is currently public and older commits contain answer-key copies. Treat those old keys as exposed; current-branch cleanup does not erase repository history.

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

Configure Vercel environment variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY
- The T4SC Edge Function uses Supabase's server-managed service-role secret internally; do not copy it into client-side code

Application, status and assessment API routes forward requests to the private-data Edge Function. Its deployable source is versioned at `supabase/functions/t4sc-api/index.ts`; the deployed function uses the project-managed service-role secret internally, and that key is never sent to the browser or stored in Vercel. The deployed `t4sc-api` function is version 3. Reviewer access must be implemented with authenticated roles and appropriate RLS policies before reviewers access applicant data. The status endpoint exposes only an applicant's own stage, never answers or reviewer notes.

## Founder decisions still to confirm before public recruitment promotion
Geographic eligibility, participation mode, weekly minimum commitment, intake capacity, recruitment deadline/window, assessment language options, application fee, foundation-route support, reapplication period and privacy/retention details. The public copy deliberately does not invent these.


## Team sign-in
- `/login` is for authorised T4SC team accounts only; public self-registration is disabled.
- `/admin` requires a valid Supabase Auth session. The current page confirms authentication but intentionally does not expose applicant data until T4SC reviewer roles and matching RLS policies are implemented.
- `/auth/callback` supports Supabase invite, email OTP and PKCE callback links. Configure the Supabase Auth Site URL and redirect allow-list to include the production domain and `/auth/callback`.
- The browser uses only the Supabase publishable/anon key. Keep all service-role or secret keys server-only.

## Join T4SC Community and private Telegram access
- The public homepage includes a dedicated Join T4SC Community section. Its CTA leads to the application; it does not expose a Telegram invite.
- The applicant portal requests a Telegram invitation only after the applicant's reference and email have been verified and the recorded status is `admitted`, `onboarding` or `active_member`.
- Configure `T4SC_TELEGRAM_INVITE_URL` as a **Sensitive** server-side Vercel environment variable. Never prefix it with `NEXT_PUBLIC_` and never put the invite in client components or source control.
- The `/api/community-access` route re-checks the application status on the server before returning the invite and sends `Cache-Control: no-store`.
- A shared Telegram invite can still be forwarded by a recipient. For stricter one-person admission, replace it later with unique, limited-use Telegram invite links generated through an authenticated Telegram bot.
