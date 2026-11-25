# T4SC Recruitment & Admissions Portal

Tech 4 Skill Community (T4SC) — Learn. Build. Play.

A mobile-first, low-bandwidth admissions portal for T4SC. Public applications are open to eligible applicants; membership remains selective and requires assessment, human review, and controlled onboarding.

## Project status

Planning and implementation are staged. The repository is being adapted from the Axion Marketplace codebase in a separate repository. The original Axion repository is not modified by this project.

## Initial operating defaults

- Nationwide Nigeria, online-first participation; optional Lagos activities when organised.
- All ages may express interest, subject to age-appropriate privacy, consent, safeguarding, and platform rules.
- No application fee.
- Beginner, Developing, and Advanced assessment routes; level controls the assessment route, not admission eligibility.
- 4–6 hours per week as a proposed commitment guide.
- Six-week recruitment window and an initial target of up to 12 admits (up to 3 per department), only where reviewer and mentor capacity supports it.
- Four-week foundation pathway and two-to-three-week onboarding period.
- Assessment language: clear, accessible English, with reasonable accessibility adjustments.
- Reapplication after 90 days.
- Proposed unsuccessful-application retention: 90 days, subject to applicable law and the approved privacy notice.

These are planning defaults and must be confirmed by T4SC before public launch.

## Departments

1. AI & Machine Learning
2. Game Development
3. Full Stack Development & System Architecture
4. Cybersecurity & Systems Security

## Non-negotiable safeguards

- No automatic Telegram or community admission after submission.
- Applicant data and reviewer notes are private.
- No paid tools or high-end hardware are required for beginner assessments.
- No real-world offensive security testing; cybersecurity assessments use fictional scenarios and authorised practice environments only.
- Under-18 applicants receive age-appropriate safeguards and guardian involvement where required. Under-13 applicants use a guardian-mediated route and are never asked to evade platform age restrictions.
- Submitted assessment work is for evaluation only and is not reused as T4SC production work without separate permission and credit.

## Technology direction

Next.js, TypeScript, Tailwind CSS, Supabase (separate project from Axion), and Vercel. The app must remain functional and safe when optional integrations are not configured; no credentials from the Axion project may be reused.

## Build sequence

1. Finalise policy and assessment blueprint.
2. Create actual question banks, learning modules, exercises, answer keys, and rubrics for all 12 department/level routes.
3. Define screening progression, weights, thresholds, human review, and decisions.
4. Build applicant pages and private reviewer/admin workflows.
5. Configure a separate database and role-based access controls.
6. Test all pathways with Firecrawl and automated tests before launch.
