# T4SC admissions and assessment security — implementation status

**Specification basis:** T4SC AI Developer Execution Pack v1.0, dated 27 November 2026  
**Scoring ruleset:** t4sc-2026-11-27-draft-1  
**Assessment-key version in live database:** legacy-ui-sample-v0  
**Git branch:** feat/admissions-scoring-core-draft  
**GitHub pull request:** https://github.com/abdulraman123-ai/T4SC-requitmennt-website/pull/1  
**Status:** Partial implementation. Not ready for a live recruitment cohort.

## Delivered in this implementation slice

### 1. Versioned admissions scoring core — draft only

The module at `lib/admissions/scoring.ts` implements the four-component weighting arithmetic:

| Component | Raw maximum | Weighted maximum |
| --- | ---: | ---: |
| Common Reasoning | 12 | 15 |
| Department Assessment | 20 | 25 |
| Learning Potential | 20 | 20 |
| Practical Assessment | 40 | 40 |
| **Total** | **92** | **100** |

Each available contribution uses raw score / raw maximum × weighted maximum. Full precision is retained internally. Missing component marks remain null and the total remains unavailable until all four are present. Invalid, negative, non-finite and over-maximum values are rejected.

The candidate initial and final gates from the execution pack are encoded only for inspection and tests. They are not production rules:

- `ADMISSIONS_RULESET_STATUS = "draft-not-for-production"`
- `LIVE_ADMISSIONS_DECISIONS_ENABLED = false`
- No applicant API route or Edge Function uses this module to issue an admission decision.

The pack's later founder-confirmed update still requires final approval of exact thresholds and component floors, plus validated automatic rubric scoring for every route. No live admission decision is produced by this code.

### 2. Server-side objective answer scoring

The deployed `t4sc-api` Edge Function is now version 3. The browser no longer supplies a score that the backend trusts. For objective multiple-choice submissions, the function retrieves answer keys from `public.assessment_answer_keys` using the application's stored department and experience level, then calculates the objective mark on the server.

The answer-key table has RLS enabled and no browser-role grants:

- `anon`: cannot select
- `authenticated`: cannot select
- `service_role`: can select

The table has 42 seeded rows: six keys for the current Common Reasoning mini-screen and three keys for each of the 12 simplified department/level mini-screens. Every row is tagged `legacy-ui-sample-v0`.

**Important limitation:** these 42 keys match the current simplified legacy UI questions. They are not the complete official CR-A v0.2 (10 questions), department route banks (12 questions each), or LP-A v0.1 (10 questions) in the execution pack. They are not approved for a live admissions exam. The live API currently scores the objective portion of these legacy forms only; written and practical rubric scoring is still pending.

Written/practical submissions are stored with a pending rubric-scoring state. A missing key produces a technical-review state rather than a zero. The overall `score` column remains null, and no final weighted admissions score is issued.

### 3. One final submission per component

Migration `0004_assessment_submission_security` is applied to the T4SC Supabase project. It adds:

- A unique database index on `(application_id, pathway)`, enforcing one final submission per component.
- An optional idempotency UUID so a retry after a lost response can return the existing receipt rather than create a second submission.
- A database check on objective score ranges and scoring-state values.
- A server-only answer-key table.

The preview front-end branch sends an idempotency key for general, department and practical final submissions. The server returns a receipt only after confirming the database insert.

### 4. Server-side attempt and checkpoint API

Migration `0005_assessment_attempts` is applied, and `t4sc-api` version 4 adds three private service operations:

- `attempt_start`: verifies the application and prerequisite stage, records the single official attempt, and stores the server start timestamp. The client supplies an idempotency UUID and a random UUID bearer token; only its SHA-256 hash is stored.
- `attempt_read`: verifies the application and bearer token, then returns the applicant's own attempt state and last confirmed checkpoint.
- `attempt_save`: accepts a versioned JSON response checkpoint only for an active attempt. The server confirms the save with a timestamp and version. Stale/out-of-order versions cannot overwrite a newer checkpoint.

Attempt responses are limited to 200 KB. The table has RLS enabled and no `anon` or `authenticated` grants. The server stores a start timestamp, but `expires_at` remains null because a timed deadline has not been configured.

**Integration boundary:** the current applicant screening pages have not yet been connected to these new attempt operations. The server API and table are deployed, but the applicant-facing Start/Resume screen, token persistence, 10-second autosave loop, visible Saving/Saved/Not confirmed states, refresh recovery and final attempt-to-submission transition are still to be wired and tested. Do not tell applicants that autosave is active yet.

The live database was checked before migrations: two application rows existed and there were zero assessment submissions. After the attempt table was added and its uniqueness constraint was tested with a rolled-back insert, there are still zero attempt rows and zero assessment submissions. No applicant row or answer was changed.

### 5. Build and unit tests

The Node built-in test suite contains 15 tests:

- 10 tests for weighting, missing marks, score bounds and draft progression-gate behavior.
- 5 tests for objective answer scoring, malformed/incomplete answers and missing-key failure; 6 tests for attempt-token hashing, checkpoint versions, stale saves and payload size validation.

Verified locally on Node 22.16.0: **21/21 tests passed** using `node --experimental-strip-types --test tests/admissions-scoring.test.ts tests/assessment-objective.test.ts`.

The latest Vercel feature-branch preview is **READY**:
https://t4sc-recruitment-website-95q7xl09g-abdulraman123-ais-projects.vercel.app

The preview build compiled, type-checked and generated the app routes. This is a preview branch, not the production domain.

## Boundaries and remaining launch blockers

1. **Incomplete assessment banks.** Replace the current 6-question Common Reasoning and three-question department mini-screens with the exact latest question-bank revisions in the execution pack, including LP-A and all 12 department routes. Do not represent the seeded legacy keys as the official assessment bank.
2. **Historic repository exposure.** The GitHub repository is public. Earlier commits contain browser-side answer-key copies. Removing keys from the current branch does not erase historical Git objects or public clones. Treat these old question keys as exposed; rotate/replace the bank and make the repository private through GitHub account settings before relying on question secrecy. The available GitHub connector does not provide a repository-visibility update action.
3. **Rubric-based automatic evaluation.** Build and validate the approved written/practical scoring evaluator. Persist criterion-level marks, evidence/reasons, confidence, evaluator version, rubric version and timestamp. A scoring error must remain pending/technical, never become zero or rejection.
4. **Applicant-facing assessment attempt lifecycle.** Server-side attempt creation, secure token validation, checkpoint reads and versioned saves now exist. The screening UI still needs Start/Resume controls, token persistence, 10-second autosave, visible confirmed-save states, refresh/reconnect recovery and final submission integration. No timed expiry is active because a final time policy is not configured. Controlled technical/accessibility reopening remains outstanding.
5. **Authentication and rate limiting.** Assessment verification still uses application reference plus email. It is not the account-based, verified-email applicant experience specified by the pack. Add individual applicant accounts, email verification/recovery, server session checks, and proportionate endpoint rate limits before live use.
6. **Full admissions state machine.** Only coarse progress labels are updated after submission. There is no automated initial qualifying checkpoint, primary/alternative department evaluation, transfer opportunity, final gate, 15-day operating cycle, offer issuance or 48-hour accept/decline workflow yet.
7. **Reviewer permissions and audit.** The admin screen still confirms sign-in only. Reviewer roles, role-scoped RLS, append-only audit events and the verified correction/recalculation process are not implemented.
8. **Privacy and safeguarding.** Complete the documented privacy, retention/deletion, age-band/guardian-consent, safeguarding, support, jurisdiction and provider/data-location reviews before using applicant information for a real cohort.
9. **Phone/accessibility validation.** Run actual phone-only, low-bandwidth, reconnect, accessibility, shared-device and cross-applicant isolation tests. Current preview build success is not a substitute for these tests.
10. **Experience-route naming.** The current application/database uses Beginner, Developing and Advanced. The execution pack uses Beginner, Developing and Experienced. Reconcile the current approved terminology consistently before publishing recruitment.

## Operational note

The Supabase Edge Function version 3 and database migration 0004 are deployed to the live T4SC Supabase project. The Next.js changes in this pull request are on a feature branch with a READY preview; they have not been merged into `main` or deployed to the production website. The production website itself has not been redeployed in this implementation slice.

The RLS advisor's “RLS enabled, no policy” messages are informational for these tables: browser roles have no table grants, and the private Edge Function uses its server-managed service-role credential. Do not add broad authenticated policies merely to silence that notice.

This is a partial security and scoring foundation, not a declaration that T4SC admissions is launch-ready.
