import Link from "next/link";
const stages=[
  ["01","Explore T4SC","Understand the community, departments, participation expectations and the recruitment process."],
  ["02","Submit your application","Choose one primary department and a different alternative, select the experience route that best describes your current practice, and complete the required declarations."],
  ["03","Complete the initial assessments","Complete the common reasoning and learning-potential components. The platform checks the initial qualification requirements before unlocking the remaining screening stages."],
  ["04","Complete your remaining assessments","Applicants who progress complete the primary-department assessment and the required practical task. Your dashboard shows each stage and its confirmed submission state."],
  ["05","Automated scoring and qualification","The platform evaluates the required assessment evidence against the approved, versioned criteria. If a scoring service fails, the result remains pending for technical resolution rather than being treated as zero."],
  ["06","Receive an outcome or alternative route","The platform records the qualification outcome. If the primary department is not a fit, the alternative department may be evaluated using the evidence valid for that route and any outstanding required assessment."],
  ["07","Formal offer and response","A formal offer is issued privately when the required conditions are met. Applicants have 48 hours from the offer's issue time to accept or decline. Accepted applicants then receive controlled onboarding information."]
];
export default function HowItWorks(){return <main className="page-shell">
  <section className="page-hero" data-reveal>
    <span className="eyebrow">THE RECRUITMENT JOURNEY · 15 CALENDAR DAYS</span>
    <h1>Open to apply.<br/><span className="gradient-text">Selective to join.</span></h1>
    <p>Submitting an application is the beginning of the process, not automatic membership. The recruitment cycle runs for 15 calendar days. Your private dashboard shows your applicant-specific schedule, current stage and deadlines.</p>
  </section>
  <section className="journey-list">{stages.map(([n,t,d])=><article className="journey-item" key={n} data-reveal><span className="journey-number">{n}</span><div><h2>{t}</h2><p>{d}</p></div><span className="journey-line"/></article>)}</section>
  <aside className="notice-panel" data-reveal>
    <b>Important</b>
    <p>A formal offer has its own 48-hour response window, measured from the dashboard issue time. Email is a notification route; rely on the exact deadline shown in your dashboard.</p>
    <p>There is no public member-group invite. Successful applicants receive private onboarding and community access instructions after the required admission steps. Cybersecurity tasks use fictional examples, supplied files or explicitly authorised labs only.</p>
    <Link href="/apply" className="text-link">Start application ↗</Link>
  </aside>
</main>}
