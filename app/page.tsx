import Link from "next/link";

const departments = [
  { number: "01", name: "AI & Machine Learning", icon: "✳", description: "Python, data reasoning, machine learning, deep learning and intelligent features for software and games.", tags: ["Python", "Data", "Intelligent systems"] },
  { number: "02", name: "Game Development", icon: "◈", description: "Game design and engineering, programming, interactive systems, 2D/3D development and game physics.", tags: ["Game logic", "2D / 3D", "Interactive systems"] },
  { number: "03", name: "Full Stack Development & System Architecture", icon: "⌘", description: "Frontend and backend development, APIs, databases, web applications and system architecture.", tags: ["Frontend", "Backend", "Architecture"] },
  { number: "04", name: "Cybersecurity & Systems Security", icon: "⛨", description: "Defensive security, secure software and systems, networking fundamentals and responsible security research.", tags: ["Defensive security", "Networking", "Secure design"] },
];

const stages = [
  { number: "01", title: "Application", description: "Tell us what interests you and how you learn." },
  { number: "02", title: "General screening", description: "Explore reasoning, problem-solving and judgement." },
  { number: "03", title: "Department assessment", description: "Complete a route matched to your chosen pathway and level." },
  { number: "04", title: "Practical task", description: "Show your approach through a small, bounded challenge." },
];

const communitySteps = [
  { number: "01", title: "Discover T4SC", description: "Explore our departments, expectations and learning culture." },
  { number: "02", title: "Apply", description: "Submit your application and tell us where your interests lie." },
  { number: "03", title: "Complete screening", description: "Complete the required screening, department assessment and practical task." },
  { number: "04", title: "Receive your invitation", description: "Successful applicants receive private access to the T4SC Telegram community." },
];

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-content">
          <div className="eyebrow"><span className="pulse-dot" /> TECH 4 SKILL COMMUNITY · OPEN APPLICATION</div>
          <h1>Curiosity is a<br /><span className="gradient-text">starting point.</span></h1>
          <p className="hero-copy">Build skills. Solve problems. Create real technology. T4SC brings curious people together across four technology disciplines to learn, collaborate and contribute.</p>
          <div className="hero-actions">
            <Link href="/apply" className="button">Start your application ↗</Link>
            <Link href="/how-it-works" className="button button-quiet">See how it works →</Link>
          </div>
          <div className="hero-facts"><span>✳</span> All ages and experience levels are welcome to apply. <span>·</span> Admission is selective.</div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <span className="hero-stamp">LEARN · BUILD · PLAY</span>
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-orbit orbit-three" />
          <div className="hero-core"><span>T4</span><small>SC</small></div>
          <div className="float-chip chip-ai"><b>✳</b> AI & ML</div>
          <div className="float-chip chip-game"><b>◈</b> Game Development</div>
          <div className="float-chip chip-full"><b>⌘</b> Full Stack</div>
          <div className="float-chip chip-cyber"><b>⛨</b> Cybersecurity</div>
        </div>
        <div className="hero-bottom"><span>FOUR DEPARTMENTS · THREE LEVELS</span><span>LEARN. BUILD. PLAY.</span></div>
      </section>

      <section className="ticker" aria-label="T4SC values">
        <div className="ticker-track">
          <span>THINK BRAVELY</span><i>✳</i><span>LEARN OUT LOUD</span><i>✳</i><span>BUILD WITH PURPOSE</span><i>✳</i><span>MAKE ROOM FOR BEGINNERS</span><i>✳</i>
          <span>THINK BRAVELY</span><i>✳</i><span>LEARN OUT LOUD</span><i>✳</i>
        </div>
      </section>

      <section className="section" data-reveal>
        <div className="section-kicker">/ THE COMMUNITY</div>
        <div className="split-heading">
          <h2>Talent isn't always<br />loud. <span className="muted-heading">Sometimes<br />it just needs a door.</span></h2>
          <div>
            <p className="lead">T4SC is a cross-age technology community built around structured learning, practical engineering and real collaboration.</p>
            <p className="body-copy">You do not need to arrive as an expert. We look at how you think, learn, communicate and approach problems — alongside the skills you already have.</p>
            <Link href="/about" className="text-link">Discover T4SC ↗</Link>
          </div>
        </div>
        <div className="stats">
          <div><strong>04</strong><span>Technology departments</span></div>
          <div><strong>03</strong><span>Assessment levels</span></div>
          <div><strong>All</strong><span>Experience levels welcome</span></div>
          <div><strong>01</strong><span>Fair recruitment journey</span></div>
        </div>
      </section>

      <section className="section department-section">
        <div className="section-heading-row" data-reveal>
          <div><div className="section-kicker">/ EXPLORE YOUR PATH</div><h2>Four disciplines.<br /><span className="muted-heading">One community.</span></h2></div>
          <p className="body-copy">Choose a primary department based on what genuinely interests you. Teams are expected to collaborate on shared products and solve problems across disciplines.</p>
        </div>
        <div className="department-grid">
          {departments.map((department) => (
            <article className="department-card" key={department.number} data-reveal>
              <div className="department-top"><span>{department.number} / DEPARTMENT</span><b>{department.icon}</b></div>
              <h3>{department.name}</h3>
              <p>{department.description}</p>
              <div className="tag-row">{department.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              <Link href="/departments" className="text-link">Explore department ↗</Link>
            </article>
          ))}
        </div>
        <div style={{ marginTop: 28 }}><Link href="/departments" className="text-link">View all department details ↗</Link></div>
      </section>

      <section className="method-section">
        <div className="motion-art" data-reveal aria-hidden="true"><span className="ring" /><span className="ring" /><span className="ring" /><strong>✳</strong></div>
        <div className="method-copy" data-reveal>
          <div className="section-kicker">/ THE T4SC APPROACH</div>
          <h2>We assess your<br /><span className="gradient-text">potential, not your past.</span></h2>
          <p>Choose Beginner, Developing or Advanced. Your choice guides the difficulty of your assessment route; it is not an automatic admission score. Beginners receive clear learning materials before being asked to apply a new idea.</p>
          <Link href="/admissions" className="button button-quiet">Read admissions guidance ↗</Link>
        </div>
      </section>

      <section className="section" data-reveal>
        <div className="section-kicker">/ WHAT HAPPENS NEXT</div>
        <h2>A clear process.<br /><span className="muted-heading">A meaningful opportunity.</span></h2>
        <div className="steps-grid">
          {stages.map((stage) => (
            <article className="step-card" key={stage.number}>
              <span>{stage.number} / STAGE</span><h3>{stage.title}</h3><p>{stage.description}</p>
            </article>
          ))}
        </div>
        <Link href="/how-it-works" className="text-link">See the complete recruitment journey ↗</Link>
      </section>

      <section className="community-section" id="join-community" data-reveal>
        <div className="community-orbit" aria-hidden="true"><span /><span /><span /><b>✳</b></div>
        <div className="community-content">
          <div className="section-kicker">/ JOIN T4SC COMMUNITY</div>
          <h2>Get involved.<br /><span className="gradient-text">Earn your place.</span></h2>
          <p className="community-intro">T4SC brings curious people together to learn, build and collaborate. Community access follows the admissions process so that every member joins through the same fair journey.</p>
          <div className="community-flow">
            {communitySteps.map((step) => (
              <article className="community-step" key={step.number}>
                <span>{step.number}</span>
                <div><h3>{step.title}</h3><p>{step.description}</p></div>
              </article>
            ))}
          </div>
          <div className="community-actions">
            <Link href="/apply" className="button">Apply to join T4SC <span aria-hidden="true">↗</span></Link>
            <p>Telegram invitations are shared privately with successful applicants after screening and assessment. There is no public group invite.</p>
          </div>
        </div>
      </section>

      <section className="cta-section" data-reveal>
        <div className="cta-symbol">✳</div>
        <div className="section-kicker">/ YOUR NEXT CHAPTER</div>
        <h2>Start where you are.<br /><span className="gradient-text">Build what comes next.</span></h2>
        <p>Bring your questions, your ideas and your willingness to learn. Applying is your first step — every applicant completes the screening process.</p>
        <Link href="/apply" className="button">Begin your T4SC application ↗</Link>
      </section>
    </main>
  );
}