# T4SC admissions scoring core — implementation status

**Specification basis:** T4SC AI Developer Execution Pack v1.0, dated 27 November 2026  
**Ruleset version:** t4sc-2026-11-27-draft-1  
**Status:** Draft implementation only — not connected to production admissions decisions

## What this change contains

The new lib/admissions/scoring.ts module provides a small, versioned implementation of the scoring arithmetic described in the opening execution manual:

| Component | Raw maximum | Weighted maximum |
| --- | ---: | ---: |
| Common Reasoning | 12 | 15 |
| Department Assessment | 20 | 25 |
| Learning Potential | 20 | 20 |
| Practical Assessment | 40 | 40 |
| **Total** | **92** | **100** |

For each available component, the weighted contribution is raw score / raw maximum * weighted maximum. Values retain full precision internally. Missing components remain null; the overall total remains unavailable until all four components exist. Out-of-range or non-finite scores are rejected.

The file also records the candidate initial and final progression thresholds from the opening manual. Functions return only pending, draft-pass or draft-not-pass, include the ruleset version, and always identify the result as non-live.

## Why the rules are not activated

The execution pack's later founder-confirmed admissions update says exact qualifying thresholds and component minima still require final approval, and automated written/practical evaluator outputs must be validated against reference-marked samples for every route. The pack also says a scoring failure must remain pending/technical, never become an invented zero or rejection.

Accordingly:

- ADMISSIONS_RULESET_STATUS is draft-not-for-production.
- LIVE_ADMISSIONS_DECISIONS_ENABLED is false.
- The functions are not imported by applicant routes, API handlers, the Supabase Edge Function or admin pages.
- No live applicant status, assessment record or existing database row is changed by this code.

## Tests

The unit tests cover version/status guards, all component maxima, full-precision conversion, incomplete scores, invalid ranges, initial-gate boundaries, final-gate boundaries and per-component minimums.

Run with Node 22.6+ using npm run test:admissions. This uses Node's built-in test runner and TypeScript type stripping; it introduces no test dependency.

## Current implementation blockers before live admissions

1. Replace the client-exposed assessment answer keys and incomplete sample questions with the latest versioned assessment banks. Complete all 12 department/experience routes plus Common Reasoning and Learning Potential; retain protected answer keys server-side.
2. Complete independent question/key/rubric review and route-level pilot/calibration. The pack explicitly says current draft banks are not yet approved for live examination.
3. Build the rubric-based automated written/practical scoring service. Store criterion marks, evidence/reasons, confidence, evaluator version and rubric version; define a safe pending/technical state on failure.
4. Add server-authoritative assessment attempts, one-attempt enforcement, idempotent save/submit receipts and 10-second autosave with the documented Saving/Saved/Pending sync/Connection lost/Save failed/Submitted states. The current API accepts client-supplied scores and does not enforce a unique attempt.
5. Build server-side application state transitions, primary/alternative department routing and the 15-calendar-day cycle, including an offer timestamp and full 48-hour response deadline. Do not infer or manually force admission from a client request.
6. Complete individual applicant accounts, email verification/recovery, private applicant records and role-scoped staff access. The present reference-plus-email lookup is not a replacement for the account-based portal specified in the pack.
7. Implement reviewer roles/RLS, audit events and the restricted correction/recalculation process before exposing applicant records to staff.
8. Complete privacy, retention, age/guardian-consent, safeguarding, support and provider/data-location reviews before processing a live recruitment cohort. Use synthetic data until those launch gates pass.
9. Test phone-only completion, accessibility, low-bandwidth/reconnect handling, cross-applicant isolation, backup/restore and incident response.
10. The connected GitHub repository is currently public, while the execution pack specifies a private repository. Restricting visibility is an account-level change and is not performed by this code change.

## Verification boundary

The scoring module and its unit tests can be verified independently. This change does not certify the assessment banks, evaluator quality, applicant portal, database state machine, staff permissions, privacy/safeguarding readiness or production admissions process. It must not be represented as making T4SC ready to accept or decide a live admissions cohort.
