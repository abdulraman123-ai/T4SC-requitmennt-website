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

The applicant screens still use shortened legacy sample questions. They are not the complete banks in the T4SC AI Developer Execution Pack v1.0, and the 42 old objective answer-key records are tagged `legacy-ui-sample-v0`; they must not be treated as official examination content. The private `assessment_bank_content` table now holds 26 source-backed records: CR-A v0.2, LP-A v0.1, all 12 department/experience routes and all 12 practical tasks. Every record remains `draft_not_approved`, is available only through the service role, and is not exposed by the applicant UI or attempt API. Superseding source corrections are included. These are complete drafts, not approved live examinations.

Target weighting:
- Common Reasoning: 12 raw marks → 15 weighted points
- Department Assessment: 20 raw marks → 25 weighted points
- Learning Potential: 20 raw marks → 20 weighted points
- Practical Assessment: 40 raw marks → 40 weighted points

The scoring core implements the founder-approved 15/25/20/40 weighting and initial/final qualification gates in version `t4sc-admissions-2026-11-27-approved-baseline-v1`. The gates use full-precision weighted calculations, non-compensatory component floors and null/pending handling for missing scores. Live decisions remain disabled until every written/practical rubric evaluator is validated against independently reference-marked samples and the required experience-route calibration is approved. No confidence percentage has been invented.

## Assessment security and attempt lifecycle

- The T4SC `t4sc-api` Edge Function is deployed as version 12. It fetches objective answer keys server-side. The answer-key table has RLS enabled; `anon` and `authenticated` have no select grant.
- Database uniqueness enforces one final submission per application/component. Idempotency keys support retries after a lost response.
- Assessment screens for Common Reasoning, department and practical are connected to server-owned attempt start/read/save actions. The server stores only a SHA-256 hash of the client-generated attempt token.
- The attempt hook persists the attempt envelope on the applicant's device, restores the latest local/server checkpoint, and saves changed responses every 10 seconds. It shows Saving/Saved/Not confirmed; final submission requires a confirmed latest checkpoint and is bound to the official attempt token.
- No countdown/expiry is active because the approved time-limit settings are not configured. A complete technical/accessibility reopening workflow remains outstanding.
- The feature-branch applicant access path now uses verified-email magic links and server-side ownership binding. Production Auth redirect configuration and further lifecycle tests remain outstanding. Rate limiting is not yet implemented.
- A pure, deterministic admissions-lifecycle module models initial progression, primary and alternative-route checks, scoring-pending/technical states, transfer acceptance, recommendation and the 48-hour offer calculation. The new private database ledger stores component score provenance, one current admission state per application, append-only decision events, 15-day cycle configuration and formal offers. Service-role-only RPCs enforce offer issue by Day 13, a full 48-hour response window, cycle-end fit and atomic accept/decline/expiry state changes. The applicant portal now retrieves a formal offer only for the verified account owner and submits accept/decline through a proxy-protected server route. Acceptance syncs the existing application status to `admitted` for the private community-access gate. These features are not yet connected to the automated admissions scoring worker; no expiry scheduler or email notification is configured. No existing application has been assigned an admissions state or offer.

## Current deployment state

Supabase migrations 0001–0017 are applied. The Edge Function is live at version 13. On commit `7c4608e54cba688c7b4e2bc0c32d004efe176eb1`, GitHub Actions passed 58/58 automated tests, TypeScript and the Next.js production build; all 24 static routes generated. The available Vercel preview failure was for stale commit `5d58a11` and reported a duplicated `email` property that is already absent from the current branch. A fresh preview could not be generated because the Vercel free-tier daily deployment API limit had been reached. The production site has not been redeployed from this branch.

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
- supabase/migrations/0011_admissions_runtime_ledger.sql
- supabase/migrations/0012_admission_offer_hardening.sql
- supabase/migrations/0013_offer_acceptance_status_bridge.sql
- supabase/migrations/0014_admissions_ledger_fk_indexes.sql
- supabase/migrations/0015_admission_routine_invoker_hardening.sql
- supabase/migrations/0016_schedule_admission_offer_expiry.sql
- supabase/migrations/0017_idempotent_admission_offer_response.sql

Configure Vercel environment variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY
- The T4SC Edge Function uses Supabase's server-managed service-role secret internally; do not copy it into client-side code

Application, status and assessment API routes forward requests to the private-data Edge Function. Its deployable source is versioned at `supabase/functions/t4sc-api/index.ts`; the deployed function uses the project-managed service-role secret internally, and that key is never sent to the browser or stored in Vercel. The deployed `t4sc-api` function is version 13. A Sensitive `T4SC_API_PROXY_SECRET` is used server-to-server for verified application v1 and official attempt operations; only its SHA-256 digest is stored in `private_system_secrets`. The 26 source-backed draft records (CR-A, LP-A, 12 department routes and 12 practical tasks) are stored in `assessment_bank_content` with `draft_not_approved`; none is published or attempt-enabled. Reviewer access must be implemented with authenticated roles and appropriate RLS policies before reviewers access applicant data. The status endpoint exposes only an applicant's own stage, never answers or reviewer notes.

## Launch blockers and security handover

- The pure lifecycle helper is tested, but persistent admission states, decision-event history, production scoring orchestration, alternative-transfer screens, formal-offer storage, applicant accept/decline actions and scheduled 48-hour expiry processing are not connected.
- The automated written/practical evaluator is not configured or validated. The system must never convert scoring errors into zero marks or rejection.
- The exact experience-route calibration, reference-marked pilot evidence and evaluator confidence/escalation behavior must be validated before live automated decisions.
- The 15-day cycle and Day-13 offer issuance rules are implemented in the pure offer-window helper, but no cycle is configured and no production scheduler is active.
- Supabase Auth Site URL and `/auth/callback` allow-list still require dashboard verification.
- No reviewer roles/policies, post-process audit UI, verified correction/recalculation workflow, technical-incident/accessibility reopening route or endpoint rate limiting is live. The new append-only decision-event schema is present, but no authority accounts are assigned and no correction console is connected.
- A real 15-day cycle has not been configured; the expiry job is active but has no applicant offers to process. The job has been tested and its first run succeeded.
- The three unindexed admissions-ledger foreign-key findings were fixed in migration 0014. The remaining performance advisor messages are informational unused-index notices on tables with no production workload.
- The connected GitHub repository is public and historic commits contain legacy client-side answer-key samples. Treat those historic samples as exposed; the available GitHub actions here do not provide repository-visibility or history-rewrite controls. Restrict repository access in GitHub and do not reuse those legacy keys in a live assessment.
- Privacy/retention/deletion, safeguarding and age/guardian-consent, jurisdiction, hosting region/data-location and support-operating decisions remain launch gates.

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
- Production does not have these preview-only flags. The separate server-only `T4SC_API_PROXY_SECRET` is required by Edge Function v12 for new schema-v1 application submissions, attempt start/read/save and attempt-bound final submissions. The legacy production form and reference/email status lookup remain compatible until the frontend is merged and released.

## Join T4SC Community and private Telegram access
- The public homepage includes a dedicated Join T4SC Community section. Its CTA leads to the application; it does not expose a Telegram invite.
- The applicant portal requests a Telegram invitation only after the applicant's reference and email have been verified and the recorded status is `admitted`, `onboarding` or `active_member`.
- Configure `T4SC_TELEGRAM_INVITE_URL` as a **Sensitive** server-side Vercel environment variable. Never prefix it with `NEXT_PUBLIC_` and never put the invite in client components or source control.
- The `/api/community-access` route re-checks the application status on the server before returning the invite and sends `Cache-Control: no-store`.
- A shared Telegram invite can still be forwarded by a recipient. For stricter one-person admission, replace it later with unique, limited-use Telegram invite links generated through an authenticated Telegram bot.
