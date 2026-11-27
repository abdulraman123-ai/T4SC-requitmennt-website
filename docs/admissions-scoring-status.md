# T4SC admissions and application system — implementation status

**Specification basis:** T4SC AI Developer Execution Pack v1.0, 27 November 2026  
**Scoring ruleset:** `t4sc-2026-11-27-draft-1` — inactive for live decisions  
**Application schema:** `t4sc-application-v1`  
**Legacy assessment-key version:** `legacy-ui-sample-v0`  
**Git branch:** `feat/admissions-scoring-core-draft`  
**Pull request:** https://github.com/abdulraman123-ai/T4SC-requitmennt-website/pull/1  
**Current state:** Partial implementation. Do not use for a live recruitment cohort yet.

## Implemented

### 1. Application wizard and server validation

The feature-branch application wizard now follows the approved application field structure:

- Required email address, name to use, country, primary department, different alternative department, experience route, motivation, learning/goals response, weekly availability, and three separate declarations.
- Optional city/region; experience/project description (maximum 150 words); one HTTPS work-sample URL (maximum 2,048 characters); and an accessibility/support request (maximum 500 characters).
- Motivation: 50–150 words. Learning/goals: 30–120 words.
- Weekly availability: Less than 2 hours; 2–4 hours; 5–7 hours; 8 or more hours; Not sure yet.
- Experience routes for new applications: Beginner, Developing, Experienced.
- No initial file upload, precise home address, full date of birth, ID document, school name, diagnosis or mandatory portfolio.
- Smartphone is the standard applicant device; computer use is optional.

The form saves a local draft and shows live word/character counts. The server validates the same constraints in `supabase/functions/t4sc-api/_shared/application-validation.ts`, stores `application_schema_version`, `declaration_version` and `privacy_notice_version`, and never fetches an applicant-provided URL. The previous production form remains supported by a separate legacy API path while this branch is being reviewed.

**Important:** the email field is syntax-validated and normalized, but the account-based verified-email onboarding/recovery flow is not implemented yet. Do not describe an application email as verified merely because it passed this field validation.

### 2. Versioned scoring model — draft only

`lib/admissions/scoring.ts` implements the current four-component weighting arithmetic:

| Component | Raw maximum | Weighted maximum |
| --- | ---: | ---: |
| Common Reasoning | 12 | 15 |
| Department Assessment | 20 | 25 |
| Learning Potential | 20 | 20 |
| Practical Assessment | 40 | 40 |
| **Total** | **92** | **100** |

Each weighted contribution uses raw score / raw maximum × weighted maximum. Full precision is retained internally. Missing marks remain null; the total is unavailable until all four component marks exist. Invalid and out-of-range marks are rejected.

Candidate initial/final qualification thresholds exist only in the draft module for inspection and boundary tests. They are not active rules:
- `ADMISSIONS_RULESET_STATUS = "draft-not-for-production"`
- `LIVE_ADMISSIONS_DECISIONS_ENABLED = false`
- No production applicant API or Edge Function uses this module to issue an admission decision.

Exact thresholds/component minima still require approval and route-level calibration. Automated written/practical evaluator outputs must be validated against independently marked reference samples before a live admissions decision is enabled.

### 3. Objective assessment scoring and final submission protection

Migration `0004_assessment_submission_security` is applied. The deployed Edge Function retrieves objective answer keys from `public.assessment_answer_keys` using the stored application department and experience route, then calculates objective marks server-side.

The answer-key table contains 42 entries for the simplified legacy forms: six Common Reasoning questions and three questions for each of 12 department/route combinations. Rows are tagged `legacy-ui-sample-v0`.

This is **not** the complete official assessment bank in the execution pack. It does not include the complete CR-A v0.2, 12-question department routes or LP-A v0.1. Learning Potential is not yet present in the applicant UI/backend. Do not market the legacy mini-screens as the official examination.

The database enforces one final submission per application/component using a unique index. Idempotency keys allow a retry after a lost HTTP response to return the existing receipt. A missing answer key or scoring/evaluation issue becomes technical review/pending, not an invented zero. The overall weighted admission score is not produced.

### 4. Server-owned attempts and autosave

Migration `0005_assessment_attempts` is applied. The deployed Edge Function provides:
- `attempt_start`: creates one official attempt after the applicant presses Start and records the server start time.
- `attempt_read`: checks the application and bearer token, then returns the attempt and its latest confirmed checkpoint.
- `attempt_save`: records a versioned response checkpoint and server confirmation time. Stale versions cannot overwrite newer saves.

The browser generates a random UUID bearer token; only its SHA-256 hash is stored in Supabase. The applicant screens for Common Reasoning, department and practical stages are connected to the attempt API. They include Start/Resume, 10-second checkpoint saves after changes, local checkpoint recovery, visible Saving/Saved/Not confirmed states, explicit save-on-navigation/final-submit and final submission tied to the official attempt.

The attempt table has RLS enabled, and browser roles have no table grants. The server owns the attempt start and save timestamps. `expires_at` currently remains null because a final per-component time-limit policy has not been configured. Controlled technical/accessibility reopening is not yet implemented.

### 5. Experience-route name

New applications use Beginner, Developing and Experienced. Migration `0006_experienced_route_name` updates constraints and the draft key labels, while retaining Advanced as a legacy-compatible database value for older records. The Edge Function maps legacy Advanced assessment attempts to the Experienced key set. Existing application rows were not rewritten.

### 6. Application schema version 1

Migration `0007_application_schema_v1` adds:
- `learning_goals`
- `work_sample_url`
- `application_schema_version`
- `declaration_version`
- `privacy_notice_version`

The database checks that any work-sample URL uses HTTPS and is no longer than 2,048 characters.

### 7. Public admissions copy

The feature branch removes the superseded five-component weighting and draft pass bands from public pages. Admissions, Assessments and How It Works now describe the four components qualitatively, the automated qualification direction, the 15-calendar-day cycle and the full 48-hour offer response window without exposing internal pass thresholds or answer keys.

## Deployment and verification state

- T4SC Supabase project: `qhslwfasplgigamujxvj`.
- Applied migrations: `0001_t4sc_recruitment_schema`, `0002_application_and_assessment_fields`, `0003_service_role_grants_and_fk_indexes`, `0004_assessment_submission_security`, `0005_assessment_attempts`, `0006_experienced_route_name`, `0007_application_schema_v1`.
- Deployed Edge Function: `t4sc-api`, version **7**, ACTIVE.
- `assessment_answer_keys`: 42 legacy sample rows.
- Existing live applications: two, both Beginner at the last verification. The application rows have not been modified by this implementation slice.
- `assessment_submissions`: zero rows at the last verification.
- `assessment_attempts`: zero rows at the last verification. No real applicant attempt was created for testing.
- Answer-key and attempt tables: RLS enabled; `anon` and `authenticated` cannot select; `service_role` can.
- GitHub Actions ran all four test files on the latest branch commit: **36/36 passed, 0 failed**.
- Latest Next.js preview is **READY** at commit `c99a109fe27baee3296d59e8e7017755764c53b3`: https://t4sc-recruitment-website-2wv51wiww-abdulraman123-ais-projects.vercel.app
- The Next.js changes remain on the feature branch and have not been merged into `main` or deployed to the production website. Supabase migrations and Edge Function updates are already on the live T4SC backend.

## Remaining launch blockers

1. **Official assessment bank integration.** Replace the legacy Common Reasoning and three-question department mini-screens with the complete current CR-A v0.2, LP-A v0.1 and all 12 department/experience banks, including the latest wording, marking and protected answer keys.
2. **Rubric-based automatic evaluation.** Implement and validate written/practical scoring. Persist criterion marks, evidence/reasons, confidence, evaluator version, rubric version and timestamp. Evaluator failure must remain pending/technical.
3. **Verified applicant accounts.** The portal still uses application reference plus email. Implement individual accounts, email verification, recovery, server session checks and applicant-owned records. Current application email validation is not mailbox verification.
4. **Rate limiting and abuse protection.** Add proportionate server-side throttling to application, status, attempt and submission endpoints; avoid exposing whether an email/reference pair exists through overly detailed error differences.
5. **Admissions state machine.** Only coarse progress labels currently update. Initial qualifying gate, final automated qualification, primary/alternative-department evaluation and transfer acceptance, automated recommendation, formal offer, 48-hour response and expiry processing are not implemented yet.
6. **15-day operating schedule.** Implement server-owned cycle dates, stage windows, applicant-specific deadlines, notification delivery and offer expiry. No attempt timer currently runs because the time-limit settings are not configured.
7. **Reviewer roles and audit.** The admin route still confirms authentication only. Implement role-specific permissions/RLS, append-only audit events, oversight views and verified correction/recalculation before any reviewer can access applicant data.
8. **Privacy and safeguarding.** Complete and document privacy, retention/deletion, age-band/guardian-consent, safeguarding, support/escalation, jurisdiction and provider/data-location reviews before a real cohort.
9. **Phone/accessibility validation.** Conduct real phone-only, low-bandwidth, offline/reconnect, accessibility, shared-device and cross-applicant-isolation tests. Build success is not a substitute for these.
10. **Repository history.** The GitHub repository is public, and older commits contain browser-side answer-key copies. Removing keys from the current branch does not erase Git history or existing clones. Treat those copies as exposed; use a replacement bank and make the repository private before relying on question secrecy. This visibility change has not been performed.

## Security note

RLS advisor notices stating “RLS enabled, no policy” are informational for the protected assessment tables: browser roles have no table grants and the private Edge Function uses the server-managed service-role credential. Do not add broad authenticated policies just to silence the notices.

This is a partial implementation foundation, not a statement that T4SC is ready to accept or decide a live admissions cohort.
