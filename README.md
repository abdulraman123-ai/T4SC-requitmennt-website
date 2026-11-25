# T4SC Recruitment Website

T4SC recruitment and admissions platform, based on a copy of the Axion Marketplace Next.js project structure.

## Experience
- Open admissions for everyone; no age-based admissions restrictions or separate age-based pathways.
- Four departments: AI & Machine Learning; Game Development; Full Stack Development & System Architecture; Cybersecurity & Systems Security.
- Beginner, Developing and Advanced assessment levels.
- Beginner-friendly admissions; previous technical experience, portfolio or formal qualifications are not compulsory.
- Human review; assessment scores guide decisions and are not automatic admissions decisions.
- Animated background with reduced-motion support.
- Applicant form, admissions information, department pages and applicant portal shell.

## Stack
Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase and Vercel.

## Supabase setup
Create a **separate T4SC Supabase project**. Do not reuse Axion credentials or apply the old Axion migrations. Apply only `supabase/migrations/0001_t4sc_recruitment.sql` and configure:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or publishable key)
- `SUPABASE_SERVICE_ROLE_KEY` (server only; never expose publicly)

Before accepting live applications, configure server-side insertion with the service role key, reviewer authentication/roles, and explicit RLS policies. Public applicant data and reviewer notes must remain private.

## Local development
```bash
npm install
npm run dev
```
