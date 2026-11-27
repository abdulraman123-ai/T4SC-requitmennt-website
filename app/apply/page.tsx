"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const departments = [
  "AI & Machine Learning",
  "Game Development",
  "Full Stack Development & System Architecture",
  "Cybersecurity & Systems Security",
] as const;

const availabilityOptions = [
  "Less than 2 hours",
  "2–4 hours",
  "5–7 hours",
  "8 or more hours",
  "Not sure yet",
] as const;

type Application = {
  preferredName: string;
  email: string;
  country: string;
  region: string;
  primaryDepartment: string;
  alternativeDepartment: string;
  experienceLevel: string;
  experienceDescription: string;
  workSampleUrl: string;
  motivation: string;
  learningGoals: string;
  weeklyAvailability: string;
  accessibilityNeeds: string;
  rulesAccepted: boolean;
  honestyAccepted: boolean;
  privacyAccepted: boolean;
};

const initial: Application = {
  preferredName: "",
  email: "",
  country: "",
  region: "",
  primaryDepartment: "",
  alternativeDepartment: "",
  experienceLevel: "",
  experienceDescription: "",
  workSampleUrl: "",
  motivation: "",
  learningGoals: "",
  weeklyAvailability: "",
  accessibilityNeeds: "",
  rulesAccepted: false,
  honestyAccepted: false,
  privacyAccepted: false,
};

const sections = [
  "Basic details",
  "Department choices",
  "Experience route",
  "Motivation and goals",
  "Availability and support",
  "Declarations and review",
];

function wordCount(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="form-field">
      <span>
        {label} {required && <i>Required</i>} {!required && <em>Optional</em>}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export default function Apply() {
  const router = useRouter();
  const [form, setForm] = useState<Application>(initial);
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadApplicantAndDraft() {
      try {
        const supabase = createClient();
        const { data, error: userError } = await supabase.auth.getUser();
        const user = data.user;
        if (!active) return;
        if (userError || !user?.email_confirmed_at || !user.email) {
          router.replace("/applicant-access?next=%2Fapply");
          return;
        }
        const normalizedEmail = user.email.trim().toLowerCase();
        setVerifiedEmail(normalizedEmail);
        let saved: Partial<Application> = {};
        try {
          const raw = localStorage.getItem("t4sc-application-draft-v3:" + normalizedEmail)
            || localStorage.getItem("t4sc-application-draft-v3");
          if (raw) saved = JSON.parse(raw) as Partial<Application>;
          localStorage.removeItem("t4sc-application-draft-v3");
        } catch {
          saved = {};
        }
        if (!active) return;
        setForm({ ...initial, ...saved, email: normalizedEmail });
        setHydrated(true);
      } catch {
        if (active) router.replace("/applicant-access?next=%2Fapply");
      } finally {
        if (active) setAuthLoading(false);
      }
    }
    void loadApplicantAndDraft();
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("t4sc-application-draft-v3:" + verifiedEmail, JSON.stringify(form));
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch {
      setSavedAt("");
    }
  }, [form, hydrated, verifiedEmail]);

  const set = (key: keyof Application, value: string | boolean) => {
    setForm((old) => ({ ...old, [key]: value }));
  };

  const completion = useMemo(() => {
    const required: (keyof Application)[] = [
      "preferredName", "email", "country",
      "primaryDepartment", "alternativeDepartment", "experienceLevel",
      "motivation", "learningGoals", "weeklyAvailability",
      "rulesAccepted", "honestyAccepted", "privacyAccepted",
    ];
    const completed = required.filter((key) => {
      const value = form[key];
      return typeof value === "boolean" ? value : String(value).trim().length > 0;
    }).length;
    return Math.round((completed / required.length) * 100);
  }, [form]);

  function validate() {
    if (step === 0) {
      if (!form.preferredName.trim()) return "Enter the name you want T4SC to use.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Enter a valid email address you can access throughout the recruitment cycle.";
      if (!form.country.trim()) return "Enter your country.";
    }
    if (step === 1) {
      if (!departments.includes(form.primaryDepartment as (typeof departments)[number])) return "Choose your primary department.";
      if (!departments.includes(form.alternativeDepartment as (typeof departments)[number])) return "Choose a different alternative department.";
      if (form.primaryDepartment === form.alternativeDepartment) return "Your alternative department must be different from your primary department.";
    }
    if (step === 2) {
      if (!["Beginner", "Developing", "Experienced"].includes(form.experienceLevel)) return "Choose the experience route that best describes your current practice.";
      if (wordCount(form.experienceDescription) > 150) return "Your optional experience description must be 150 words or fewer.";
      if (form.workSampleUrl.trim()) {
        try {
          const sample = new URL(form.workSampleUrl.trim());
          if (sample.protocol !== "https:") return "A work-sample link must use HTTPS.";
          if (sample.href.length > 2048) return "The work-sample link is too long.";
        } catch {
          return "Enter a valid HTTPS work-sample URL.";
        }
      }
    }
    if (step === 3) {
      const motivationWords = wordCount(form.motivation);
      const goalWords = wordCount(form.learningGoals);
      if (motivationWords < 50 || motivationWords > 150) return "Your motivation response must be 50–150 words.";
      if (goalWords < 30 || goalWords > 120) return "Your learning/goals response must be 30–120 words.";
    }
    if (step === 4) {
      if (!(availabilityOptions as readonly string[]).includes(form.weeklyAvailability)) return "Choose your realistic weekly availability.";
      if (form.accessibilityNeeds.trim().length > 500) return "Your support request must be 500 characters or fewer.";
    }
    if (step === 5) {
      if (!form.rulesAccepted) return "Please read and agree to the T4SC community rules.";
      if (!form.honestyAccepted) return "Please confirm the honesty declaration.";
      if (!form.privacyAccepted) return "Please acknowledge the privacy information.";
    }
    return "";
  }

  function next() {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, sections.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setError("");
    setStep((current) => Math.max(current - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setSaving(true);
    try {
      if (!verifiedEmail) throw new Error("Sign in with your verified applicant email before submitting.");
      const payload = {
        ...form,
        email: verifiedEmail,
        applicationSchemaVersion: "t4sc-application-v1",
        preferredName: form.preferredName.trim(),
        country: form.country.trim(),
        region: form.region.trim(),
        experienceDescription: form.experienceDescription.trim(),
        workSampleUrl: form.workSampleUrl.trim(),
        motivation: form.motivation.trim(),
        learningGoals: form.learningGoals.trim(),
        accessibilityNeeds: form.accessibilityNeeds.trim(),
      };
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Your application could not be submitted.");
      localStorage.setItem("t4sc-application-reference", data.reference);
      localStorage.setItem("t4sc-application-email", payload.email);
      localStorage.setItem("t4sc-application-route", JSON.stringify({
        primaryDepartment: form.primaryDepartment,
        alternativeDepartment: form.alternativeDepartment,
        experienceLevel: form.experienceLevel,
      }));
      localStorage.removeItem("t4sc-application-draft-v3");
      router.push("/apply/confirmation");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit your application. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !hydrated) {
    return <main className="page-shell"><p className="small-note">Verifying your applicant account…</p></main>;
  }

  const textArea = (key: keyof Application, placeholder: string, rows = 4) => (
    <textarea
      rows={rows}
      value={String(form[key])}
      onChange={(event) => set(key, event.target.value)}
      placeholder={placeholder}
    />
  );

  return (
    <main className="page-shell application-shell">{process.env.NEXT_PUBLIC_T4SC_PREVIEW_READ_ONLY === "true" && <div className="notice-panel" role="status"><b>Preview environment · read-only</b><p>This preview is connected to the live T4SC database, but all application and assessment writes are blocked. Do not enter real applicant data here.</p></div>}
      <section className="page-hero compact-hero" data-reveal>
        <span className="eyebrow">T4SC · APPLICATION FORM</span>
        <h1>Your next step<br/><span className="gradient-text">starts with you.</span></h1>
        <p>Six short sections. Your progress is saved on this device as you go. You can review every answer before submitting.</p>
      </section>

      <div className="application-layout">
        <aside className="application-side">
          <div className="progress-card">
            <span className="section-kicker">APPLICATION PROGRESS</span>
            <strong>{completion}%</strong>
            <div className="progress-track"><i style={{ width: completion + "%" }}/></div>
            <div className="progress-steps">
              {sections.map((label, index) => (
                <button key={label} type="button" className={index === step ? "current" : index < step ? "complete" : ""} onClick={() => { if (index <= step) { setError(""); setStep(index); } }}>
                  <span>{index < step ? <Check size={13}/> : String(index + 1).padStart(2, "0")}</span>{label}
                </button>
              ))}
            </div>
            <p className="save-indicator"><Save size={13}/> {savedAt ? "Draft saved on this device" : "Draft saving enabled"}</p>
          </div>
          <div className="application-side-note">
            <b>Before you begin</b>
            <p>Set aside time to read the questions and answer honestly. A portfolio is optional. You do not need to own a computer; the applicant journey is designed for smartphone use.</p>
            <Link href="/privacy-policy">How we handle your information ↗</Link>
          </div>
        </aside>

        <section className="application-card">
          <div className="form-card-heading">
            <div><span className="section-kicker">SECTION {String(step + 1).padStart(2, "0")} / 06</span><h2>{sections[step]}</h2></div>
            <span className="step-count">{step + 1} of 6</span>
          </div>

          {step === 0 && <div className="form-fields">
            <p className="form-intro">We use these details to identify your application and contact you during the recruitment cycle. Do not enter a home address or identity-document details.</p>
            <div className="form-grid">
              <Field label="Name to use in T4SC" required><input value={form.preferredName} onChange={e => set("preferredName", e.target.value)} placeholder="What should we call you?"/></Field>
              <Field label="Verified email address" required hint="This email belongs to the signed-in applicant account and cannot be changed inside the application."><input type="email" value={verifiedEmail} disabled readOnly autoComplete="email"/></Field>
              <Field label="Country" required><input value={form.country} onChange={e => set("country", e.target.value)} placeholder="Country you are based in"/></Field>
              <Field label="City / region" hint="Optional"><input value={form.region} onChange={e => set("region", e.target.value)} placeholder="City, state or region"/></Field>
            </div>
          </div>}

          {step === 1 && <div className="form-fields">
            <p className="form-intro">Choose one primary department and one different alternative. The alternative is a real fallback route if the primary route is not a fit; one application can lead to admission into one department only.</p>
            <Field label="Primary department" required><select value={form.primaryDepartment} onChange={e => set("primaryDepartment", e.target.value)}><option value="">Select your primary department</option>{departments.map(department => <option key={department}>{department}</option>)}</select></Field>
            <Field label="Alternative department" required><select value={form.alternativeDepartment} onChange={e => set("alternativeDepartment", e.target.value)}><option value="">Select a different alternative department</option>{departments.filter(department => department !== form.primaryDepartment).map(department => <option key={department}>{department}</option>)}</select></Field>
          </div>}

          {step === 2 && <div className="form-fields">
            <p className="form-intro">Choose the route that best reflects your current practice. This places you into a suitable assessment; it does not guarantee or determine admission.</p>
            <Field label="Experience route" required><select value={form.experienceLevel} onChange={e => set("experienceLevel", e.target.value)}><option value="">Choose the route that feels right</option><option>Beginner</option><option>Developing</option><option>Experienced</option></select></Field>
            <Field label="Prior experience or project description" hint={wordCount(form.experienceDescription) + " / 150 words · Optional"}>
              {textArea("experienceDescription", "You can describe something you have tried or built, or leave this blank if you are just starting.", 4)}
            </Field>
            <Field label="One work-sample link" hint="Optional. HTTPS links only. Do not upload a file or include private credentials.">
              <input type="url" value={form.workSampleUrl} onChange={e => set("workSampleUrl", e.target.value)} placeholder="https://example.com/your-project"/>
            </Field>
            <p className="small-note">A portfolio, certificate or previous project is not required, especially for beginners.</p>
          </div>}

          {step === 3 && <div className="form-fields">
            <p className="form-intro">Tell us why you want to participate and what you want to learn or build. These responses help explain your goals; verbosity or buzzwords are not rewarded.</p>
            <Field label="Motivation" required hint={wordCount(form.motivation) + " / 150 words · Required range: 50–150"}>
              {textArea("motivation", "Why do you want to join T4SC? What makes you curious about this community?", 5)}
            </Field>
            <Field label="Learning and goals" required hint={wordCount(form.learningGoals) + " / 120 words · Required range: 30–120"}>
              {textArea("learningGoals", "What do you hope to learn, practise or build through T4SC?", 5)}
            </Field>
          </div>}

          {step === 4 && <div className="form-fields">
            <p className="form-intro">Availability is a planning signal, not an automatic rejection criterion. The standard applicant device is a smartphone; a computer is optional.</p>
            <Field label="Realistic weekly availability" required>
              <select value={form.weeklyAvailability} onChange={e => set("weeklyAvailability", e.target.value)}>
                <option value="">Select the time you can realistically give</option>
                {availabilityOptions.map(option => <option key={option}>{option}</option>)}
              </select>
            </Field>
            <Field label="Accessibility or support request" hint={form.accessibilityNeeds.length + " / 500 characters · Optional"}>
              <textarea rows={3} maxLength={500} value={form.accessibilityNeeds} onChange={e => set("accessibilityNeeds", e.target.value)} placeholder="Tell us about a format or adjustment that would help you participate. Only share what is useful for support."/>
            </Field>
          </div>}

          {step === 5 && <div className="form-fields">
            <p className="form-intro">Each acknowledgement is separate and starts unticked. Please read the linked information before confirming.</p>
            <div className="agreement-card">
              <label className="check-row"><input type="checkbox" checked={form.rulesAccepted} onChange={e => set("rulesAccepted", e.target.checked)}/><span>I have read and agree to follow the <Link href="/code-of-conduct" target="_blank">T4SC community rules</Link>.</span></label>
              <label className="check-row"><input type="checkbox" checked={form.honestyAccepted} onChange={e => set("honestyAccepted", e.target.checked)}/><span>I confirm that my application is honest and that I will disclose assistance or tools used in assessment work when requested.</span></label>
              <label className="check-row"><input type="checkbox" checked={form.privacyAccepted} onChange={e => set("privacyAccepted", e.target.checked)}/><span>I have read the <Link href="/privacy-policy" target="_blank">privacy information</Link> and understand how my application details are used for recruitment.</span></label>
            </div>
            <div className="notice-panel">
              <b>Privacy and assessment use</b>
              <p>Application and assessment information is used for recruitment and related communication. Assessment work is for evaluation only and will not be used in a T4SC product without separate permission and credit. Do not submit passwords, precise home addresses, identity documents or unrelated sensitive information.</p>
              <Link href="/privacy-policy" className="text-link">Read the privacy information ↗</Link>
            </div>
            <div className="review-panel">
              <h3>Review your answers</h3>
              <p className="form-intro">Check the details below. Use Edit to return to a section before final submission.</p>
              {sections.slice(0, 5).map((label, index) => {
                const rows: [string, string][] = index === 0
                  ? [["Name", form.preferredName], ["Email", form.email], ["Country", form.country], ["City / region", form.region]]
                  : index === 1
                  ? [["Primary department", form.primaryDepartment], ["Alternative department", form.alternativeDepartment]]
                  : index === 2
                  ? [["Experience route", form.experienceLevel], ["Experience description", form.experienceDescription], ["Work sample", form.workSampleUrl]]
                  : index === 3
                  ? [["Motivation", form.motivation], ["Learning and goals", form.learningGoals]]
                  : [["Weekly availability", form.weeklyAvailability], ["Accessibility request", form.accessibilityNeeds]];
                return <div className="review-section" key={label}>
                  <div><b>{label}</b><button type="button" onClick={() => { setError(""); setStep(index); }}>Edit</button></div>
                  <dl>{rows.filter(([, value]) => value).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
                </div>;
              })}
            </div>
          </div>}

          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-navigation">
            {step > 0 ? <button type="button" className="button button-quiet" onClick={back}><ArrowLeft size={16}/> Back</button> : <span className="small-note">You can leave and return on this device.</span>}
            {step < 5
              ? <button type="button" className="button" onClick={next}>Continue <ArrowRight size={16}/></button>
              : <button type="button" className="button" onClick={submit} disabled={saving}>{saving ? "Submitting…" : <>Submit application <ArrowRight size={16}/></>}</button>}
          </div>
        </section>
      </div>
    </main>
  );
}
