import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { getVerifiedApplicantContext } from "@/lib/applicant-auth";
import { callT4SCApi } from "@/lib/t4sc-api";

export const dynamic = "force-dynamic";

type ReviewApplication = {
  reference: string;
  preferred_name: string | null;
  email: string;
  department: string;
  assessment_level: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export default async function Admin() {
  const reviewer = await getVerifiedApplicantContext();
  if (!reviewer) redirect("/login?next=%2Fadmin");

  const result = await callT4SCApi("reviewer_list", {}, reviewer.accessToken);
  if (result.status === 403) {
    return (
      <main className="page-shell">
        <section className="page-hero">
          <span className="eyebrow">PRIVATE REVIEWER WORKSPACE</span>
          <h1>Access is<br/><span className="gradient-text">restricted.</span></h1>
          <p>Your T4SC account is signed in, but it does not have an active reviewer role. Applicant information is visible only to designated reviewers.</p>
          <div className="admin-account"><span>Signed in: {reviewer.email}</span><SignOutButton/></div>
          <Link href="/" className="text-link">Back to T4SC ↗</Link>
        </section>
      </main>
    );
  }

  if (result.status !== 200 || !Array.isArray(result.data.applications)) {
    return (
      <main className="page-shell">
        <section className="page-hero">
          <span className="eyebrow">PRIVATE REVIEWER WORKSPACE</span>
          <h1>Workspace<br/><span className="gradient-text">unavailable.</span></h1>
          <p>{typeof result.data.error === "string" ? result.data.error : "The reviewer list could not be loaded. Please refresh or contact the T4SC system administrator."}</p>
          <div className="admin-account"><span>Signed in: {reviewer.email}</span><SignOutButton/></div>
        </section>
      </main>
    );
  }

  const applications = result.data.applications as ReviewApplication[];
  return (
    <main className="page-shell">
      <section className="page-hero">
        <span className="eyebrow">T4SC · PRIVATE REVIEWER WORKSPACE</span>
        <h1>Applicant<br/><span className="gradient-text">review.</span></h1>
        <p>Applications and assessment evidence are visible only to active T4SC reviewers. Add evidence-based notes to support consistent human review.</p>
        <div className="admin-account"><span>Reviewer: {reviewer.email}</span><SignOutButton/></div>
      </section>

      <section className="page-section">
        <div className="section-heading">
          <span className="section-kicker">APPLICATIONS</span>
          <h2>{applications.length} recent application{applications.length===1?"":"s"}</h2>
        </div>
        {applications.length===0 ? (
          <div className="notice-panel"><b>No applications yet</b><p>New submissions will appear here after they are received.</p></div>
        ) : (
          <div className="content-grid">
            {applications.map((application)=>(
              <article className="content-card" key={application.reference}>
                <span className="section-kicker">{application.reference}</span>
                <h3>{application.preferred_name || "Applicant"}</h3>
                <p>{application.email}</p>
                <p><b>{application.department}</b></p>
                <p>{application.assessment_level} · {application.status.replaceAll("_"," ")}</p>
                <p className="small-note">Submitted {new Date(application.created_at).toLocaleString()}</p>
                <Link className="text-link" href={"/admin/applications/"+encodeURIComponent(application.reference)}>Review application ↗</Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="notice-panel">
        <b>Scoring and admissions decisions are not enabled</b>
        <p>Reviewers can inspect submitted evidence and leave internal notes. Numeric rubric scoring and final admissions decisions remain locked until the official assessment banks, reviewer rubrics and intake policy are approved and validated.</p>
      </section>
    </main>
  );
}
