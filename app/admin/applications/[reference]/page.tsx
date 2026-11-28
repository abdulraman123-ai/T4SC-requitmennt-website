import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getVerifiedApplicantContext } from "@/lib/applicant-auth";
import { callT4SCApi } from "@/lib/t4sc-api";
import { ReviewerNoteForm } from "@/components/reviewer-note-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ reference: string }> };

export default async function ApplicationReview({ params }: Props) {
  const { reference } = await params;
  const reviewer = await getVerifiedApplicantContext();
  if (!reviewer) redirect("/login?next=%2Fadmin");

  const result = await callT4SCApi("reviewer_detail", { reference }, reviewer.accessToken);
  if (result.status === 404) notFound();
  if (result.status === 403) {
    return <main className="page-shell"><section className="page-hero"><h1>Access restricted.</h1><p>Your account does not have reviewer permission.</p><Link href="/admin" className="text-link">Back to reviewer workspace ↗</Link></section></main>;
  }
  if (result.status !== 200 || !result.data.application) {
    return <main className="page-shell"><section className="page-hero"><h1>Could not load this application.</h1><p>{typeof result.data.error === "string" ? result.data.error : "Please retry."}</p><Link href="/admin" className="text-link">Back to reviewer workspace ↗</Link></section></main>;
  }

  const app = result.data.application as Record<string, unknown>;
  const submissions = Array.isArray(result.data.submissions) ? result.data.submissions as Record<string, unknown>[] : [];
  const scoreRecords = Array.isArray(result.data.scoreRecords) ? result.data.scoreRecords as Record<string, unknown>[] : [];
  const notes = Array.isArray(result.data.notes) ? result.data.notes as Record<string, unknown>[] : [];
  const fields: [string, unknown][] = [
    ["Preferred name",app.preferred_name],["Email",app.email],["Country",app.country],["Region",app.region],
    ["Primary department",app.department],["Experience route",app.assessment_level],["Why this department",app.why_department],
    ["Experience",app.experience],["Tools and topics",app.tools_topics],["Motivation",app.motivation],
    ["Problem to solve",app.problem_to_solve],["Session availability",app.session_availability],["Schedule details",app.session_details],
    ["Device access",app.device_access],["Internet access",app.internet_access],["Accessibility needs",app.accessibility_needs],
    ["Status",app.status],["Submitted",app.created_at],
  ];

  return (
    <main className="page-shell">
      <section className="page-hero compact-hero">
        <span className="eyebrow">PRIVATE APPLICATION REVIEW · {String(app.reference)}</span>
        <h1>{String(app.preferred_name || "Applicant")}<br/><span className="gradient-text">application.</span></h1>
        <p>Review the application and submitted evidence. Do not share applicant details outside authorised T4SC review channels.</p>
        <Link href="/admin" className="text-link">← Back to all applications</Link>
      </section>

      <section className="page-section">
        <div className="section-heading"><span className="section-kicker">APPLICATION DETAILS</span><h2>Applicant information</h2></div>
        <div className="content-grid">
          {fields.filter(([,value])=>value!==null&&value!==undefined&&value!=="").map(([label,value])=>(
            <article className="content-card" key={label}><span className="section-kicker">{label}</span><p>{String(value)}</p></article>
          ))}
        </div>
      </section>

      <section className="page-section">
        <div className="section-heading"><span className="section-kicker">SUBMITTED ASSESSMENTS</span><h2>{submissions.length} submission{submissions.length===1?"":"s"}</h2></div>
        {submissions.length===0 ? <div className="notice-panel"><b>No assessment submissions yet</b><p>Assessment work appears here after the applicant submits an official attempt.</p></div> : submissions.map((submission,index)=>(
          <article className="content-card" key={String(submission.pathway)+index}>
            <h3>{String(submission.pathway)}</h3>
            <p>{String(submission.scoring_status)} · {new Date(String(submission.submitted_at)).toLocaleString()}</p>
            <pre className="review-evidence">{JSON.stringify(submission.answers,null,2)}</pre>
          </article>
        ))}
      </section>

      <section className="page-section">
        <div className="section-heading"><span className="section-kicker">SCORE RECORDS</span><h2>{scoreRecords.length} score record{scoreRecords.length===1?"":"s"}</h2></div>
        {scoreRecords.length===0 ? <div className="notice-panel"><b>Rubric scoring is pending</b><p>No validated reviewer or evaluator score is recorded. Do not infer a pass or fail result from objective question marks alone.</p></div> : scoreRecords.map((record,index)=>(
          <article className="content-card" key={String(record.pathway)+index}><h3>{String(record.pathway)}</h3><pre className="review-evidence">{JSON.stringify(record,null,2)}</pre></article>
        ))}
      </section>

      <section className="page-section">
        <div className="section-heading"><span className="section-kicker">INTERNAL REVIEW</span><h2>Reviewer notes</h2></div>
        {notes.map((note,index)=><article className="content-card" key={String(note.created_at)+index}><p>{String(note.note)}</p><p className="small-note">{new Date(String(note.created_at)).toLocaleString()}</p></article>)}
        <ReviewerNoteForm reference={String(app.reference)} />
      </section>
    </main>
  );
}
