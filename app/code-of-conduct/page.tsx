import Link from "next/link";
const rules = [
 "Treat people with respect, regardless of background or experience level.",
 "Give honest credit for work, ideas, sources and assistance from tools.",
 "Communicate clearly, ask questions when stuck and respond constructively to feedback.",
 "Protect private information. Do not publish another person's details, application or assessment.",
 "Use technology responsibly. Security testing must stay within fictional, supplied or explicitly authorised environments.",
 "Respect collaboration agreements, project ownership and community decisions.",
 "Report harassment, impersonation, unsafe behaviour or suspicious contact through an official T4SC channel."
];
export default function Conduct() {
 return (
  <main className="page-shell">
   <section className="page-hero" data-reveal>
    <span className="eyebrow">COMMUNITY EXPECTATIONS</span>
    <h1>Build with skill.<br /><span className="gradient-text">Act with respect.</span></h1>
    <p>T4SC is a collaborative learning and technology community. These expectations apply to applicants, reviewers and members.</p>
   </section>
   <section className="conduct-list" data-reveal>
    {rules.map((rule, index) => <div key={rule}><span>0{index + 1}</span><p>{rule}</p></div>)}
   </section>
   <div className="notice-panel" data-reveal>
    <b>Applicant acknowledgement</b>
    <p>Before submitting your application, you will be asked to confirm that you have read and agree to follow these community expectations.</p>
    <Link href="/apply" className="text-link">Continue to application ↗</Link>
   </div>
  </main>
 );
}