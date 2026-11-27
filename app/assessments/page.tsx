import Link from "next/link";
const levels=[
  ["Beginner","Guided reasoning, supplied explanations and foundational problem-solving. No previous technical study is assumed."],
  ["Developing","Foundational concepts applied to realistic small problems, with explanations of choices and trade-offs."],
  ["Experienced","Deeper evaluation, system thinking, diagnosis and justified engineering decisions."]
];
const components=[
  ["Common Reasoning","A shared, non-specialist component that explores how you interpret information and break a problem into manageable steps."],
  ["Learning Potential","A short unfamiliar concept is explained first. You then demonstrate how you understood it and apply it to new examples."],
  ["Department Assessment","Questions are matched to your primary department and selected experience route."],
  ["Practical Assessment","A bounded task lets you demonstrate your approach using a written response, pseudocode, a small code sample or a no-code design."]
];
export default function Assessments(){return <main className="page-shell">
  <section className="page-hero" data-reveal>
    <span className="eyebrow">ASSESSMENT FRAMEWORK</span>
    <h1>Not just what you know.<br/><span className="gradient-text">How you learn.</span></h1>
    <p>The T4SC process combines common assessments, a department-specific route and a practical task. It is designed to understand reasoning, learning potential and the way you approach problems — not simply the experience you claim to have.</p>
    <div className="page-actions"><Link href="/apply" className="button">Apply and begin ↗</Link><Link href="/how-it-works" className="button button-quiet">See every stage</Link></div>
  </section>
  <section className="page-section">
    <h2>Three experience routes</h2>
    <div className="content-grid">{levels.map(([name,desc],i)=><article className="content-card" data-reveal key={name}><span className="section-kicker">LEVEL 0{i+1}</span><h2>{name}</h2><p>{desc}</p></article>)}</div>
  </section>
  <section className="page-section" data-reveal>
    <h2>Four assessment components</h2>
    <div className="content-grid">{components.map(([name,desc],i)=><article className="content-card" data-reveal key={name}><span className="section-kicker">COMPONENT 0{i+1}</span><h2>{name}</h2><p>{desc}</p></article>)}</div>
    <p className="small-note">Each required component contributes evidence to the admissions process. Scores and qualification rules are applied by the platform using the approved ruleset; the public guide does not publish internal answer keys or pass thresholds. A technical scoring failure is handled as a pending issue, not an invented zero.</p>
  </section>
  <section className="page-section" data-reveal>
    <h2>Before you start</h2>
    <p className="body-copy">Read the instructions before starting each official attempt. Your progress is saved in checkpoints that the platform confirms. A final submission is locked once the platform issues its receipt. A normal attempt is not retaken simply because a result is disappointing; verified technical problems or approved accessibility issues follow a support process.</p>
    <p className="body-copy">Assessment tasks are designed for smartphones and low-bandwidth conditions. Cybersecurity work uses fictional scenarios, supplied records or authorised training environments only.</p>
    <Link href="/apply" className="text-link">Continue to application ↗</Link>
  </section>
</main>}
