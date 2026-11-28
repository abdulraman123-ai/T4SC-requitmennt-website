"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
export default function ScreeningComplete(){
  const [reference,setReference]=useState("");
  useEffect(()=>setReference(localStorage.getItem("t4sc-application-reference")??""),[]);
  return <main className="page-shell"><section className="success-panel" data-reveal>
    <div className="success-icon">✓</div>
    <span className="eyebrow">SCREENING SUBMITTED</span>
    <h1>Your work is in.<br/><span className="gradient-text">Your work is saved.</span></h1>
    <p>Your practical task has been received and locked. Your evidence is pending private human review. A validated rubric score, final admissions decision or membership status has not been created.</p>
    <div className="reference-box"><span>APPLICATION REFERENCE</span><strong>{reference||"T4SC"}</strong></div>
    <div className="notice-panel"><b>What happens next</b><p>Authorised reviewers can inspect the submitted evidence and add internal notes. Numeric scoring, final admissions decisions and formal offers remain disabled until the official assessment banks, rubrics and intake process are approved. Submission does not grant membership or Telegram access.</p></div>
    <Link href="/portal" className="button">Check application status ↗</Link>
  </section></main>;
}
