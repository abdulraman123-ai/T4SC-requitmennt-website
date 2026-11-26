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
- Beginner / Developing / Advanced level, what the applicant has tried or built, optional tools/topics
- Motivation and a technology problem the applicant would like to solve
- Weekly availability, session/team availability, device and connectivity
- Community-rules, honesty and privacy acknowledgements
- Optional accessibility/assessment adjustments

No exact date of birth or age gate is used. Device/connectivity answers are for participation planning, not a measure of ability. Previous technical experience and a beginner portfolio are not compulsory.

## Assessment flow
1. Application
2. Common general screening (reasoning, problem decomposition, learning response, communication and judgement; approximately 20–30 minutes)
3. Department assessment (4 departments × 3 experience levels)
4. Practical task (approximately 30–60 minutes; written, pseudocode, small code or no-code alternatives)
5. Human review and private decision communication

Scoring framework: reasoning 15, department fundamentals 25, practical task 35, learning/feedback 15, communication/integrity/collaboration 10. Automated checks do not make final admissions decisions. Cybersecurity tasks use fictional scenarios, supplied samples or explicitly authorised labs only.

## Design and accessibility
Responsive multi-page navigation, dark navy base with warm orange/yellow accents, animated ambient background, scroll reveal, floating/orbiting hero elements and reduced-motion support. Motion is CSS-led and lightweight; the site respects the user's reduced-motion preference.

## Stack
Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase and Vercel.

## Supabase setup required before live submissions
Create a separate T4SC Supabase project. Do not reuse Axion credentials or the Axion database. Apply:
- supabase/migrations/0001_t4sc_recruitment.sql
- supabase/migrations/0002_application_and_assessment_fields.sql

Configure Vercel environment variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (server only; never expose publicly)

Application and assessment API routes use the service role key on the server only. Reviewer access must be implemented with authenticated roles and appropriate RLS policies before real reviewers access data. The status endpoint exposes only the applicant's own stage, never answers, scores or reviewer notes.

## Founder decisions still to confirm before public recruitment promotion
Geographic eligibility, participation mode, weekly minimum commitment, intake capacity, recruitment deadline/window, assessment language options, application fee, foundation-route support, reapplication period and privacy/retention details. The public copy deliberately does not invent these.


## Team sign-in
- `/login` is for authorised T4SC team accounts only; public self-registration is disabled.
- `/admin` requires a valid Supabase Auth session. The current page confirms authentication but intentionally does not expose applicant data until T4SC reviewer roles and matching RLS policies are implemented.
- `/auth/callback` supports Supabase invite, email OTP and PKCE callback links. Configure the Supabase Auth Site URL and redirect allow-list to include the production domain and `/auth/callback`.
- The browser uses only the Supabase publishable/anon key. Keep all service-role or secret keys server-only.
