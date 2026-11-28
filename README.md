# T4SC — Tech 4 Skill Community

A mobile-first public recruitment site and private applicant/reviewer portal for T4SC. The public site introduces the community; admission remains selective and never happens through a public Telegram invitation.

## Public pages

- Home, About, Departments, Admissions, Recruitment Journey and Assessment Framework
- Multi-step application form with per-account local draft saving
- Community Code of Conduct, Privacy and Accessibility information
- Applicant account creation and sign-in at `/applicant-access`
- Applicant portal at `/portal`
- General screening, department assessment, practical task and completion pages
- Team sign-in at `/login`
- Restricted reviewer workspace at `/admin` and private application detail pages

## T4SC departments

1. AI & Machine Learning
2. Game Development
3. Full Stack Development & System Architecture
4. Cybersecurity & Systems Security

## Application form

Applicants must sign in to a T4SC applicant account before submission. The form collects only the existing application details: preferred name, email, country/region, optional contact, primary and secondary department interest, experience route, experience description, tools/topics, motivation, problem to solve, scheduled-session/collaboration availability, device access, internet reliability, declarations and optional accessibility needs.

The former weekly-hours question is not part of the form. Session availability, device access and internet reliability remain. Previous technical experience and a portfolio are not compulsory; a beginner can state that they are just starting.

The server binds a submission to the verified applicant account. Draft answers are stored in that browser under the signed-in email. Existing database applications are not rewritten by the application UI.

## Current applicant-facing assessment flow

1. Application
2. Common reasoning assessment (six objective questions and three short written responses)
3. Department assessment matched to one of the four departments and the declared route
4. Bounded practical task with written, pseudocode, code or no-code response formats
5. Private human review

Assessment attempts are created by the server. Start, resume and checkpoint saves are bound to the application owner. Final submissions are idempotent and locked after a confirmed receipt. Objective answer keys are read by the server and are not included in the applicant components.

### Assessment and admissions status

The separate Learning Potential question bank is still marked draft-not-approved and is not exposed as an official live assessment. The full assessment rubrics/evaluator have not been validated against independent reference-scored samples. Therefore:

- No public pass threshold is advertised.
- No automated pass/fail or final admissions decision is active.
- Objective question checks do not constitute an admission result.
- Formal offers and admission decisions are not issued by the current live workflow.

The website must not be promoted as a fully operational admissions cycle until the assessment bank, reviewer rubric, intake rules and decision process have been approved and tested.

## Private reviewer workflow

- Reviewer access requires a verified Supabase Auth session and an active row in `reviewer_memberships`.
- A normal applicant account does not grant reviewer access.
- The workspace lists applications and shows application details, assessment submissions, score records and internal reviewer notes.
- An admissions administrator can move an application only through non-final stages: Needs review, General screening, Department assessment, Practical task, Clarification or Under review.
- Each status update requires a reason and is written atomically to `reviewer_status_history`.
- Admission, rejection, waitlist, onboarding and active-member outcomes cannot be set through the status editor.
- Browser roles have no direct table access; reviewer data is returned only by the protected server-to-server Edge Function.

The initial admissions-admin membership is provisioned in the private database. Add or remove reviewer roles only through a trusted administrative procedure.

## Telegram and community access

The homepage's Join T4SC Community CTA leads to the application, not a Telegram group. Community access requires the verified applicant owner to have accepted a formal offer. The server will return the invitation only after the private invite URL is configured and the Telegram join-request approval flow is confirmed. Do not place an unrestricted invite in client code, page metadata or repository files.

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase Auth/Postgres/Edge Functions and Vercel.

## Environment

Client-side values:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (preferred) or `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-only sensitive values:
- `T4SC_API_PROXY_SECRET`
- `T4SC_TELEGRAM_INVITE_URL` (leave unset until the approved private join-request invitation is ready)

Never put a service-role key or private proxy secret in `NEXT_PUBLIC_*` variables, browser code or source control. Vercel Preview is configured read-only for application and assessment writes.

## Automated checks

GitHub Actions runs TypeScript checks, a Next.js production build and Playwright browser tests against a local CI app in desktop Chromium and mobile Chromium. Test fixtures use synthetic localStorage values only; they do not submit applications or create Supabase records.

Run locally:
- `npm run lint`
- `npm run build`
- `npm test`

## Decisions still required before public intake

The original T4SC specification leaves geography, participation mode, intake capacity, application window, assessment language, application fee, foundation-route support, reapplication rules, privacy retention and mixed-age safeguarding/guardian procedures for founder confirmation. These are not invented by the website.

## Security note

The repository has legacy commits containing client-side sample assessment answer keys from an earlier prototype. Those are tagged as legacy sample content and must never be reused as official live assessment material. The current applicant UI no longer ships those answer keys.


## Applicant identity and older applications

Applicant accounts use email/password sign-in without a sign-up verification link. This supports immediate account access, but **sign-in does not prove that the person controls the email inbox**. New applications are linked to the authenticated account ID at creation. For safety, a pre-existing application with no `auth_user_id` is not automatically claimed merely because an account supplies a matching email; it requires separate administrator-led identity reconciliation before applicant access can be granted. Do not treat the Supabase email-confirmed flag set during password-only account provisioning as proof of mailbox ownership.

Reviewer database objects are versioned in migrations `0019_reviewer_memberships.sql` and `0020_reviewer_status_history.sql`. The initial admissions-admin role is assigned separately through a trusted database operation; personal Auth user IDs are not hard-coded into public migrations.
