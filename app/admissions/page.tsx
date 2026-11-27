import Link from "next/link";
const levels=[
  ["Beginner","You are new to technology or have very little practical experience. This route focuses on reasoning, curiosity, learning from clear explanations and applying basic ideas."],
  ["Developing","You understand some foundations and have tried exercises or small projects. This route explores how you apply what you know and explain your decisions."],
  ["Experienced","You have substantial practice in your chosen area. This route explores deeper reasoning, system design, evaluation and engineering trade-offs."]
];
export default function Admissions(){return <main className="page-shell">
  <section className="page-hero" data-reveal>
    <span className="eyebrow">ADMISSIONS · FAIR ROUTES, SELECTIVE ENTRY</span>
    <h1>Potential over<br/><span className="gradient-text">polish.</span></h1>
    <p>People of all ages and experience levels are welcome to apply. Previous technical experience and a beginner portfolio are not compulsory. T4SC looks for curiosity, learning ability, practical thinking, collaboration and readiness to take part in a structured community.</p>
    <div className="page-actions"><Link href="/apply" className="button">Start application ↗</Link><Link href="/how-it-works" className="button button-quiet">Screening stages</Link></div>
  </section>
  <section className="page-section">
    <h2>Choose the route that fits you</h2>
    <div className="content-grid">{levels.map(([name,desc],i)=><article className="content-card" key={name} data-reveal><span className="section-kicker">LEVEL 0{i+1}</span><h2>{name}</h2><p>{desc}</p></article>)}</div>
    <p className="small-note">Your selected route places you in an appropriately challenging assessment. It is a routing choice, not a qualification badge. Beginners are not expected to know the material the learning programme is designed to teach.</p>
  </section>
  <section className="page-section" data-reveal>
    <h2>What the process looks at</h2>
    <div className="content-grid">
      <article className="content-card"><h3>Reasoning</h3><p>How you interpret information, break down a problem and explain a sensible next step.</p></article>
      <article className="content-card"><h3>Learning potential</h3><p>How you understand an unfamiliar idea when it is explained, then apply it to a new situation.</p></article>
      <article className="content-card"><h3>Department understanding</h3><p>How you approach questions connected to the primary department and your selected experience route.</p></article>
      <article className="content-card"><h3>Practical thinking</h3><p>How you plan, test and communicate a useful solution using an accessible format.</p></article>
    </div>
    <p className="small-note">The exact scoring rules and qualification thresholds are internal operating settings and are not published as pass guarantees. Applicants receive their own status and next steps through the private portal.</p>
  </section>
  <section className="page-section" data-reveal>
    <h2>Time, tools and access</h2>
    <p className="body-copy">Assessment sessions are designed to be completed on a smartphone; a computer is optional. Tasks are designed around ordinary devices, low-bandwidth use and accessible alternatives such as written explanations, pseudocode or no-code descriptions. Paid software, high-end hardware and a portfolio are not entry requirements.</p>
    <p className="body-copy">The recruitment cycle is 15 calendar days. Your dashboard shows your own schedule and deadlines. A formal offer has a separate 48-hour response window from the time it is issued.</p>
  </section>
  <div className="notice-panel" data-reveal>
    <b>Details being confirmed</b>
    <p>T4SC's geographic eligibility, participation mode, weekly minimum commitment, intake capacity, recruitment deadline, assessment language options, application fee, foundation-route support and reapplication period still require formal confirmation. Submitting an application does not confirm eligibility or guarantee admission.</p>
    <p>Cybersecurity assessments use fictional scenarios, supplied examples or explicitly authorised training labs only. Applicant responses are private and are not posted to public group channels.</p>
    <Link href="/code-of-conduct" className="text-link">Read community conduct ↗</Link>
  </div>
</main>}
