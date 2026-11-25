# T4SC Recruitment & Admissions Portal

Tech 4 Skill Community (T4SC) — Learn. Build. Play.

A mobile-first, low-bandwidth admissions portal open to people of all ages, backgrounds, and experience levels. Membership remains selective and requires assessment, human review, and controlled onboarding.

## Project status

Planning and implementation are staged. The repository is being adapted from the Axion Marketplace codebase in a separate repository. The original Axion repository is not modified by this project.

## Initial operating defaults

- Nationwide Nigeria, online-first participation; optional Lagos activities when organised.
- Open to everyone regardless of age, educational background, qualifications, or prior technical experience.
- No minimum age requirement in T4SC admissions criteria and no compulsory date-of-birth field.
- No application fee.
- Beginner, Developing, and Advanced assessment routes; level controls assessment difficulty, not admission eligibility.
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

## Non-negotiable principles

- No age-based admissions restrictions or separate age-based assessment routes.
- No automatic Telegram or community admission after submission.
- Applicant data and reviewer notes are private.
- Privacy, respectful conduct, accessibility, and appropriate safeguarding apply to everyone.
- No paid tools or high-end hardware are required for beginner assessments.
- No real-world offensive security testing; cybersecurity assessments use fictional scenarios and authorised practice environments only.
- Submitted assessment work is for evaluation only and is not reused as T4SC production work without separate permission and credit.
- Collect only information needed to operate admissions. Any legally required consent or safeguards must be handled proportionately without turning age into an admissions disadvantage.

## Technology direction

Next.js, TypeScript, Tailwind CSS, Supabase (separate project from Axion), and Vercel. The app must remain functional and safe when optional integrations are not configured; no credentials from the Axion project may be reused.

## Build sequence

1. Finalise policy and assessment blueprint.
2. Create actual question banks, learning modules, exercises, answer keys, and rubrics for all 12 department/level routes.
3. Define screening progression, weights, thresholds, human review, and decisions.
4. Build applicant pages and private reviewer/admin workflows.
5. Configure a separate database and role-based access controls.
6. Test all pathways with Firecrawl and automated tests before launch.
