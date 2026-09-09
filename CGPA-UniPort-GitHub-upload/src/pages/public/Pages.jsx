import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { Badge, Button, Field, Input, Notice, Select, Textarea, UniversityLock } from '../../components/ui';
import { ActionError, useAction } from '../../components/feedback';
import { FEATURES, FAQ } from '../../data/features';
import { supportService } from '../../services/support-service';

export function PublicHeading({ eyebrow, title, description, meta }) {
  return (
    <header className="public-page-head">
      <div className="container">
        <span className="eyebrow animate-in">{eyebrow}</span>
        <h1 tabIndex={-1} data-page-heading className="animate-in stagger-1">{title}</h1>
        <p className="animate-in stagger-2">{description}</p>
        {meta && <div className="page-head-meta animate-in stagger-3">{meta.map(([icon, text]) => <span key={text}><Icon name={icon} size={14} />{text}</span>)}</div>}
      </div>
    </header>
  );
}

export function PublicCta({ eyebrow = 'YOUR NEXT CHAPTER', title, copy, primary = ['Get started', '/register'], secondary = ['Calculate your GPA', '/app/calculator'] }) {
  return (
    <section className="page-cta">
      <div className="container" data-reveal="scale">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{copy}</p>
        <div className="page-cta-actions">
          <Button href={`#${primary[1]}`} variant="lime" endIcon="diagonal">{primary[0]}</Button>
          <Button href={`#${secondary[1]}`} variant="transparent" icon="calculator">{secondary[0]}</Button>
        </div>
        <small>Free calculators. No account required. Not an official UniPort website.</small>
      </div>
    </section>
  );
}

const PRINCIPLES = [
  ['shield', 'Honesty over polish', 'We would rather show an empty state than fill your dashboard with numbers that were never yours.'],
  ['graduation', 'One university, done properly', 'Focusing on UniPort alone means the flow matches how your academic structure actually works.'],
  ['lock', 'Your data is not the product', 'No trackers, no advertising, no quiet data collection. Calculations run in your browser.'],
  ['users', 'Students first, always', 'Built around the realities of student life: limited data, shared devices and busy weeks.'],
  ['target', 'Clarity beats complexity', 'Every screen should answer a question you actually have, in language you already use.'],
  ['refresh', 'Built to be handed over', 'A clean architecture so the platform can grow with proper backend verification behind it.'],
];

const IS_ISNT = [
  ['A planning and organization tool', 'An official University of Port Harcourt website'],
  ['A place to store and read your results', 'A source of official grades or transcripts'],
  ['A calculator using values you provide', 'An authority on grading policy or classification'],
  ['A way to explore future scenarios', 'A guarantee of academic performance'],
  ['An independent student product', 'A replacement for departmental clearance'],
];

const STORY = [
  ['The problem', 'Students were tracking results across notebooks, group chats and half-finished spreadsheets, recalculating the same figures every semester.'],
  ['The focus', 'Instead of serving every university poorly, CGPA+ was scoped to University of Port Harcourt so the academic structure could be modelled properly.'],
  ['The build', 'The interface was designed mobile-first, with a shared calculation engine, reusable components and clear loading, empty and error states.'],
  ['Where we are', 'The frontend is complete and navigable. Authentication, records and reporting are prepared for a verified backend rather than simulated.'],
];

export function About() {
  return (
    <>
      <PublicHeading
        eyebrow="A STUDENT-FIRST PERSPECTIVE"
        title="Your ambition deserves a little clarity."
        description="CGPA+ UniPort is an independent academic companion built for University of Port Harcourt students. One university, a more thoughtful way to navigate it."
        meta={[['location', 'Port Harcourt, Rivers State'], ['graduation', 'UniPort students only'], ['shield', 'Independent platform']]}
      />

      <div className="public-content container">
        <div className="public-two-col">
          <div className="public-prose" data-reveal="left">
            <h2>A companion, not another portal.</h2>
            <p>Between lectures, assignments and everything else life brings, understanding your academic progress should not feel like another course. CGPA+ brings the important pieces into one calm, focused space.</p>
            <h2>Built around your journey.</h2>
            <p>Calculate GPA and CGPA, organize results by session, understand the patterns behind your performance and explore what your next semesters could look like. It is about making informed decisions, not just collecting numbers.</p>
            <h2>Why academic tracking matters.</h2>
            <p>Small decisions add up. A clear academic record helps you notice changes, ask better questions, and set realistic goals early rather than guessing at the finish line.</p>
          </div>
          <div data-reveal="right" data-reveal-delay="2">
            <img className="about-photo" src="https://images.pexels.com/photos/6334575/pexels-photo-6334575.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200" loading="lazy" alt="Students discussing their studies in a library" />
            <Notice><strong>Independent by design.</strong> CGPA+ is not an official University of Port Harcourt website. Your university remains the authority on results, transcripts, grading and graduation eligibility.</Notice>
          </div>
        </div>
      </div>

      <section className="principles-section">
        <div className="container">
          <div className="section-heading" data-reveal>
            <div><span className="eyebrow">WHAT GUIDES US</span><h2>Six principles<br />behind every screen.</h2></div>
            <p>These are the decisions we keep returning to whenever the product has to choose a direction.</p>
          </div>
          <div className="principles-grid" data-reveal-group>
            {PRINCIPLES.map(([icon, title, copy]) => (
              <article className="principle" key={title}>
                <span className="principle-icon"><Icon name={icon} size={19} /></span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="isnt-section container">
        <div className="section-heading" data-reveal>
          <div><span className="eyebrow">NO ROOM FOR CONFUSION</span><h2>What CGPA+ is,<br />and what it isn't.</h2></div>
          <p>Academic records matter too much for vague claims. Here is the boundary, stated plainly.</p>
        </div>
        <div className="isnt-grid" data-reveal="scale">
          <div className="isnt-column is-yes">
            <header><Icon name="check" size={17} /><h3>What CGPA+ is</h3></header>
            <ul>{IS_ISNT.map(([yes]) => <li key={yes}>{yes}</li>)}</ul>
          </div>
          <div className="isnt-column is-no">
            <header><Icon name="close" size={17} /><h3>What CGPA+ is not</h3></header>
            <ul>{IS_ISNT.map(([, no]) => <li key={no}>{no}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="story-section">
        <div className="container">
          <div className="section-heading" data-reveal>
            <div><span className="eyebrow">HOW WE GOT HERE</span><h2>A product shaped<br />by a real problem.</h2></div>
            <p>The short version of why this exists and where it currently stands.</p>
          </div>
          <ol className="story-track" data-reveal-group>
            {STORY.map(([title, copy], i) => (
              <li key={title}>
                <span className="story-index">{String(i + 1).padStart(2, '0')}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="container">
        <div className="about-mission" data-reveal>
          <div>
            <span className="eyebrow">OUR MISSION</span>
            <h3>Make academic progress easier to understand.</h3>
            <p>Give UniPort students clear, accessible tools to track their results, plan responsibly and feel more in control of their academic journey.</p>
          </div>
          <div>
            <span className="eyebrow">OUR VISION</span>
            <h3>A more confident next generation.</h3>
            <p>Help every UniPort student approach the next semester with a clearer picture of where they are and a considered plan for where they want to go.</p>
          </div>
        </div>
      </div>

      <PublicCta title="Ready to see your numbers clearly?" copy="Try the calculators now, or create an account and start building your academic record." />
    </>
  );
}

const DEEP_DIVES = [
  {
    eyebrow: '01 / CALCULATION',
    title: 'A calculation engine you can trust to be consistent.',
    copy: 'Every GPA, CGPA, projection and target figure comes from one shared module. There are no duplicated formulas hiding different behaviour on different screens.',
    points: ['Credit-weighted, never a plain average', 'Validated inputs with clear error messages', 'Adjustable maximum grading scale', 'Precision retained until the moment of display'],
    link: ['Open the GPA calculator', '/app/calculator'],
  },
  {
    eyebrow: '02 / ORGANIZATION',
    title: 'Your record, structured the way your university is.',
    copy: 'Results are grouped by academic session, semester and level so each grade carries its context. Search, filter and sort your way to the courses you need.',
    points: ['Session, semester and level filters', 'Searchable and sortable tables', 'Add, edit and delete individual results', 'A full academic timeline view'],
    link: ['See the academic record', '/app/academic'],
  },
  {
    eyebrow: '03 / FORESIGHT',
    title: 'Decisions are easier when you can see ahead.',
    copy: 'Set a target class of degree and find the average you need. Compare future GPA scenarios before registration closes rather than after results arrive.',
    points: ['Required GPA for any target', 'Achievable, difficult or impossible signals', 'Five preset scenarios plus a custom slider', 'Maximum achievable CGPA'],
    link: ['Plan your target CGPA', '/app/target'],
  },
];

const CAPABILITIES = [
  ['GPA and CGPA calculators', true, true],
  ['Target and projection planning', true, true],
  ['Light, dark and system themes', true, true],
  ['Saved academic records', false, true],
  ['Performance analytics and charts', false, true],
  ['Graduation and timeline tracking', false, true],
  ['CGPA+ Academic Reports', false, true],
  ['Notifications and support requests', false, true],
];

const CRAFT = [
  ['grid', 'Responsive from 360px', 'Layouts are designed for phones first, then scaled to tablets and wide desktops.'],
  ['sun', 'Light, dark and system', 'Pick a theme or follow your device. The preference stays on your browser.'],
  ['help', 'Accessible by default', 'Semantic structure, keyboard navigation, visible focus and screen-reader friendly states.'],
  ['spark', 'Fast on modest data', 'A lightweight build, lazy-loaded images and no heavy chart dependency.'],
];

export function Features() {
  const [filter, setFilter] = useState('All features');
  const categories = ['All features', 'Calculate', 'Organize', 'Understand', 'Plan ahead'];
  const visible = FEATURES.filter(f => filter === 'All features' || f.category === filter);

  return (
    <>
      <PublicHeading
        eyebrow="A MORE COMPLETE PICTURE"
        title="Everything for your next chapter."
        description="Sixteen thoughtful tools. One focused UniPort experience. Explore what you can calculate now and the connected features ready for your academic records."
        meta={[['grid', '16 academic tools'], ['calculator', '4 free calculators'], ['lock', 'No account to start']]}
      />

      <div className="container public-content">
        <div className="feature-filter" aria-label="Filter features" data-reveal>
          {categories.map(c => <button key={c} onClick={() => setFilter(c)} className={filter === c ? 'active' : ''} aria-pressed={filter === c}>{c}<small>{c === 'All features' ? FEATURES.length : FEATURES.filter(f => f.category === c).length}</small></button>)}
        </div>
        <div className="feature-grid" data-reveal-group key={filter}>
          {visible.map(f => (
            <a className="feature-tile" href={`#${f.route}`} key={f.title}>
              <Icon name={f.icon} />
              <h2>{f.title}</h2>
              <p>{f.description}</p>
              <Icon name="diagonal" />
            </a>
          ))}
        </div>
      </div>

      <section className="deepdive-section">
        <div className="container">
          {DEEP_DIVES.map((dive, i) => (
            <div className={`deepdive ${i % 2 ? 'deepdive-flip' : ''}`} key={dive.title}>
              <div className="deepdive-copy" data-reveal={i % 2 ? 'right' : 'left'}>
                <span className="eyebrow">{dive.eyebrow}</span>
                <h2>{dive.title}</h2>
                <p>{dive.copy}</p>
                <a className="section-link" href={`#${dive.link[1]}`}>{dive.link[0]}<Icon name="arrow" size={15} /></a>
              </div>
              <ul className="deepdive-points" data-reveal={i % 2 ? 'left' : 'right'} data-reveal-delay="2">
                {dive.points.map(point => <li key={point}><Icon name="check" size={15} />{point}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="capability-section">
        <div className="container">
          <div className="section-heading" data-reveal>
            <div><span className="eyebrow">WHAT WORKS WHEN</span><h2>Start free.<br />Grow with your record.</h2></div>
            <p>The planning tools never require an account. Features that store or verify your academic data need a connected account.</p>
          </div>
          <div className="capability-table" data-reveal="scale">
            <div className="capability-head">
              <span>Capability</span>
              <span>Without an account</span>
              <span>With a connected account</span>
            </div>
            {CAPABILITIES.map(([label, free, account]) => (
              <div className="capability-row" key={label}>
                <span>{label}</span>
                <span data-label="Without an account">{free ? <Icon name="check" size={16} className="yes" /> : <Icon name="close" size={16} className="no" />}</span>
                <span data-label="With an account">{account ? <Icon name="check" size={16} className="yes" /> : <Icon name="close" size={16} className="no" />}</span>
              </div>
            ))}
          </div>
          <p className="capability-note" data-reveal>Account features become available once the platform's backend services are connected and verified.</p>
        </div>
      </section>

      <section className="craft-section container">
        <div className="section-heading" data-reveal>
          <div><span className="eyebrow">THE DETAILS UNDERNEATH</span><h2>Considered in the<br />places you notice most.</h2></div>
          <p>Good academic tools should feel effortless on the device you actually carry.</p>
        </div>
        <div className="craft-grid" data-reveal-group>
          {CRAFT.map(([icon, title, copy]) => (
            <article className="craft-card" key={title}>
              <Icon name={icon} size={20} />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <PublicCta eyebrow="SIXTEEN TOOLS. ONE JOURNEY." title="Find the one you need today." copy="Most students start with the GPA calculator. Everything else is waiting when you are." />
    </>
  );
}

const PREP = [
  ['file', 'Your result sheets', 'Course codes, credit units and the grade points recorded for each course.'],
  ['graduation', 'Your academic details', 'Faculty, department, programme, level and the sessions you have completed.'],
  ['clock', 'About five minutes', 'Enough to set up your profile and enter a first semester of results.'],
];

const PHASES = [
  ['Set up', 'Steps 1 to 2', 'Create your account and confirm University of Port Harcourt, which is already selected for you.'],
  ['Personalize', 'Steps 3 to 6', 'Choose your faculty, department and programme, then add your academic session and level.'],
  ['Use it', 'Steps 7 to 8', 'Enter results, calculate your figures and start planning the semesters ahead.'],
];

const TIPS = [
  ['Enter grade points exactly as recorded', 'Use the values from your official result sheet rather than converting them yourself.'],
  ['Add a full semester at a time', 'Your GPA is credit-weighted, so partial semesters give a partial picture.'],
  ['Check the maximum scale', 'The calculators support 4.0, 5.0, 7.0 and 10.0. Pick the one your result sheet uses.'],
  ['Revisit your target each semester', 'Required GPA changes as your completed and remaining credits change.'],
];

export function HowItWorks() {
  const steps = [
    ['Create your CGPA+ account.', 'Start with your name and email, or use the Google sign-in integration when the authentication backend is connected.'],
    ['Your university is already selected.', 'There is no university picker. This experience is exclusively for University of Port Harcourt students.'],
    ['Select your faculty.', 'Choose from the faculty catalogue supplied by the connected UniPort academic database.'],
    ['Find your department.', 'The department selector follows your faculty, so the academic context stays connected.'],
    ['Choose your programme.', 'Select the programme and academic version that match your university record.'],
    ['Set your academic context.', 'Add your admission session, current level, academic session and semester. Matriculation and phone numbers are optional.'],
    ['Bring your results together.', 'Enter your courses, credit units and grades. Local calculators work now; cloud records require the connected backend.'],
    ['Track. Calculate. Improve.', 'Review trends, explore target CGPAs and build a considered plan for the semesters ahead.'],
  ];

  return (
    <>
      <PublicHeading
        eyebrow="ONE STEP AT A TIME"
        title="A clearer journey starts here."
        description="From your first sign-in to your next academic milestone. Here is how CGPA+ UniPort fits into student life."
        meta={[['check', '8 simple steps'], ['clock', 'About 5 minutes'], ['lock', 'University pre-selected']]}
      />

      <section className="prep-section container">
        <div className="section-heading" data-reveal>
          <div><span className="eyebrow">BEFORE YOU BEGIN</span><h2>Three things<br />worth having nearby.</h2></div>
          <p>Nothing complicated. Just the details that make your first session quick.</p>
        </div>
        <div className="prep-grid" data-reveal-group>
          {PREP.map(([icon, title, copy]) => (
            <article className="prep-card" key={title}>
              <span className="prep-icon"><Icon name={icon} size={19} /></span>
              <div><h3>{title}</h3><p>{copy}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="phase-section">
        <div className="container">
          <div className="phase-grid" data-reveal-group>
            {PHASES.map(([title, range, copy]) => (
              <article className="phase-card" key={title}>
                <span className="phase-range">{range}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
                <span className="phase-bar" data-reveal-bar />
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="container public-content">
        <div className="process-list">
          <span className="process-line" data-reveal-line aria-hidden="true" />
          {steps.map(([t, d], i) => (
            <section className="process-item" key={t} data-reveal="left" data-reveal-delay={Math.min(7, i + 1)}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h2>{t}</h2>
                <p>{d}</p>
                {i === 1 && <UniversityLock />}
              </div>
            </section>
          ))}
          <div className="form-actions" data-reveal>
            <Button href="#/register" endIcon="arrow">Start your journey</Button>
            <Button variant="outline" href="#/app/calculator">Try a calculator</Button>
          </div>
        </div>
      </div>

      <section className="tips-section">
        <div className="container">
          <div className="section-heading" data-reveal>
            <div><span className="eyebrow">GET MORE FROM IT</span><h2>Four small habits<br />that make a difference.</h2></div>
            <p>Simple ways to keep your figures accurate and your planning realistic.</p>
          </div>
          <div className="tips-grid" data-reveal-group>
            {TIPS.map(([title, copy], i) => (
              <article className="tip-card" key={title}>
                <span className="tip-number">{String(i + 1).padStart(2, '0')}</span>
                <div><h3>{title}</h3><p>{copy}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mini-faq container">
        <div className="section-heading" data-reveal>
          <div><span className="eyebrow">STILL WONDERING?</span><h2>Quick answers<br />before you start.</h2></div>
          <a className="section-link" href="#/support">Visit the help center<Icon name="arrow" size={15} /></a>
        </div>
        <div className="faq-list" data-reveal>
          {FAQ.slice(0, 3).map(([q, a]) => <details key={q}><summary>{q}<Icon name="plus" size={16} /></summary><p>{a}</p></details>)}
        </div>
      </section>

      <PublicCta eyebrow="EIGHT STEPS. ONE AFTERNOON." title="Your clearer semester starts today." copy="Create your account, or try the calculators first and set things up when you are ready." />
    </>
  );
}

const GUIDES = [
  ['calculator', 'Understanding weighted GPA', 'Why a credit-weighted average differs from adding your grades and dividing.'],
  ['target', 'Reading your required GPA', 'What achievable, difficult and impossible really mean in the target planner.'],
  ['chart', 'Choosing a grading scale', 'How to match the calculator to the scale printed on your result sheet.'],
  ['file', 'What a CGPA+ report is', 'The difference between a planning document and an official transcript.'],
];

export function PublicSupport() {
  const [form, setForm] = useState({ fullName: '', email: '', category: 'general', subject: '', description: '' });
  const action = useAction();
  const [sent, setSent] = useState(false);
  const change = key => e => setForm({ ...form, [key]: e.target.value });

  return (
    <>
      <PublicHeading
        eyebrow="LET'S FIND SOME CLARITY"
        title="A little help goes a long way."
        description="Questions about CGPA+, calculations or your academic workspace? Start here. We will never pretend a message was sent when it was not."
        meta={[['message', 'Support requests'], ['help', 'Frequently asked questions'], ['shield', 'No credentials requested']]}
      />

      <div className="container public-content">
        <div className="help-layout">
          <div data-reveal="left">
            {[['calculator', 'Calculators & planning', 'Understand GPA inputs, target projections and the planning scale.', 'calculations'], ['user', 'Account & profile', 'Help with sign-in, academic details and account settings.', 'account'], ['message', 'Something else?', 'Product feedback, accessibility concerns or a technical issue.', 'general']].map(([icon, title, desc, value]) => (
              <button type="button" className="support-category support-category-button" onClick={() => setForm({ ...form, category: value })} key={title}>
                <Icon name={icon} size={22} />
                <div><h3>{title}</h3><p>{desc}</p></div>
                <Icon name="chevron" size={15} />
              </button>
            ))}
            <div className="support-email-placeholder">
              <strong>Support email</strong>
              <p>An inbox address will be published before launch.<br />No unverified contact details are listed here.</p>
            </div>
            <Notice icon="shield">Never include your password, payment details or other confidential credentials in a support request.</Notice>
          </div>

          <section className="panel" data-reveal="right" data-reveal-delay="2">
            <header className="panel-header"><div><h2>Tell us what you need.</h2><p>Contact form connected through the public support service.</p></div></header>
            {sent ? (
              <div className="auth-success">
                <Icon name="check" size={30} />
                <h3>Request received.</h3>
                <p className="muted">The connected support service has accepted your message.</p>
              </div>
            ) : (
              <form className="form-stack" onSubmit={e => { e.preventDefault(); action.run(() => supportService.createPublicRequest(form), () => setSent(true)); }}>
                <div className="form-grid">
                  <Field label="Full name"><Input required value={form.fullName} onChange={change('fullName')} autoComplete="name" placeholder="Your full name" /></Field>
                  <Field label="Email address"><Input type="email" required value={form.email} onChange={change('email')} autoComplete="email" placeholder="you@example.com" /></Field>
                </div>
                <Field label="Support category">
                  <Select value={form.category} onChange={change('category')}>
                    <option value="general">General enquiry</option>
                    <option value="calculations">Calculators & planning</option>
                    <option value="account">Account & profile</option>
                    <option value="technical">Technical issue</option>
                    <option value="accessibility">Accessibility</option>
                  </Select>
                </Field>
                <Field label="Subject"><Input required value={form.subject} onChange={change('subject')} placeholder="How can we help?" maxLength={180} /></Field>
                <Field label="Your message"><Textarea required value={form.description} onChange={change('description')} placeholder="A few details will help us understand." minLength={10} maxLength={5000} /></Field>
                <ActionError error={action.error} />
                <Button type="submit" busy={action.busy} endIcon="arrow">Send request</Button>
                <span className="field-hint">Messages require the support backend. This form does not simulate delivery.</span>
              </form>
            )}
          </section>
        </div>
      </div>

      <section className="guides-section">
        <div className="container">
          <div className="section-heading" data-reveal>
            <div><span className="eyebrow">HELPFUL READING</span><h2>Short guides for<br />the common questions.</h2></div>
            <p>The concepts that come up most often when students start using CGPA+.</p>
          </div>
          <div className="guides-grid" data-reveal-group>
            {GUIDES.map(([icon, title, copy]) => (
              <article className="guide-card" key={title}>
                <span className="guide-icon"><Icon name={icon} size={18} /></span>
                <div><h3>{title}</h3><p>{copy}</p></div>
                <Badge>Guide</Badge>
              </article>
            ))}
          </div>
          <p className="capability-note" data-reveal>Full guide articles will be published alongside the connected help center.</p>
        </div>
      </section>

      <section className="expect-section container">
        <div className="expect-grid" data-reveal="scale">
          <div>
            <span className="eyebrow">WHAT TO EXPECT</span>
            <h2>Clear support,<br />without the guesswork.</h2>
            <p>Response times will be published once the support backend is live. Until then, this form will always tell you honestly whether your message was accepted.</p>
          </div>
          <ul className="expect-list">
            {[['message', 'Every request gets a reference', 'Once connected, each ticket carries an ID you can follow.'], ['refresh', 'Status you can see', 'Open, in progress, resolved and closed states are visible to you.'], ['lock', 'We never ask for passwords', 'No support agent will request your credentials or payment details.']].map(([icon, title, copy]) => (
              <li key={title}><Icon name={icon} size={17} /><div><strong>{title}</strong><span>{copy}</span></div></li>
            ))}
          </ul>
        </div>
      </section>

      <div className="public-help-faq container">
        <h2 data-reveal>Frequently asked questions</h2>
        <div className="faq-list" data-reveal>
          {FAQ.map(([q, a]) => <details key={q}><summary>{q}<Icon name="plus" size={16} /></summary><p>{a}</p></details>)}
        </div>
      </div>

      <PublicCta eyebrow="WE'RE HERE WHEN YOU NEED US" title="Back to what matters." copy="Head to your workspace, or start with a quick calculation." primary={['Open the workspace', '/app']} />
    </>
  );
}

const legalSections = {
  terms: [
    ['About these terms', 'This is draft legal copy for the CGPA+ UniPort frontend. It requires review by a qualified legal professional before a production service is launched. Use of a future connected service will be governed by the finalized terms displayed at that time.'],
    ['Independent platform', 'CGPA+ UniPort is an independent student-focused planning product. It is not an official University of Port Harcourt website, transcript provider or clearance authority. Nothing on this website represents an official university decision.'],
    ['Calculations and academic data', 'You are responsible for entering accurate units, grade points and academic context. Local outputs are estimates under your stated assumptions. Classifications, repeat policies and programme requirements must come from authorized academic data. Always confirm important decisions with your department.'],
    ['Accounts and acceptable use', 'When authentication is enabled, keep your sign-in credentials private and use only information you are authorized to access. Do not impersonate students, attempt unauthorized access or use the platform to misrepresent academic results.'],
    ['Reports and subscriptions', 'CGPA+ Academic Reports are personal planning documents, not official UniPort transcripts. No paid subscription or successful transaction is simulated in this release. Production fees, cancellation terms and refund arrangements must be disclosed before any payment is accepted.'],
    ['Availability and limitations', 'This frontend is provided for product use and integration review. Backend-dependent features are unavailable until real services are configured. No guarantee is made about institutional outcomes, graduation eligibility or the accuracy of user-entered records.'],
    ['Changes and contact', 'Material changes to final terms should be dated and communicated in the connected service. Questions can be submitted through the support form once its backend is connected.'],
  ],
  privacy: [
    ['About this policy', 'This is a draft privacy notice for a frontend application. Actual production data handling depends on the backend implementation and must be documented and legally reviewed before launch. It is not a claim that a particular backend security system is already active.'],
    ['What this frontend stores', 'Only your light, dark or system appearance preference is stored in local browser storage. Calculator inputs and temporary image previews stay in memory while the page is open. No academic record, account or payment is silently created.'],
    ['Future account and academic data', 'A connected service may process your name, email, optional contact details and academic records to provide the features you request. The future developer must define the lawful basis, retention periods, access controls and relevant student consent processes.'],
    ['External resources', 'This frontend loads web fonts from Google Fonts and some example photography from Pexels. These providers may receive network information such as your IP address. The deployed frontend can self-host these assets. No behavioral analytics or advertising trackers are installed here.'],
    ['Security and service providers', 'Authentication, database access, photo uploads, email and payment processing must use properly secured providers. Secrets belong on the server. Frontend display restrictions cannot substitute for server authorization or Firestore security rules.'],
    ['Your controls', 'You can change appearance locally. Account deletion, data export and privacy preference controls are service integration hooks and will not claim completion while disconnected. Production request handling and contact details must be provided before launch.'],
    ['Retention and updates', 'A production policy must explain how long information is retained, how deletion is handled and which jurisdictional obligations apply. Updates should carry a publication date and notice of material changes.'],
  ],
};

export function LegalPage({ type }) {
  const terms = type === 'terms';
  const sections = legalSections[type];
  return (
    <>
      <PublicHeading
        eyebrow="TRANSPARENCY MATTERS"
        title={terms ? 'Terms of service' : 'Your privacy matters.'}
        description={terms ? 'Clear expectations for an independent academic planning tool.' : 'A clear view of this frontend and the responsibilities of a future connected service.'}
        meta={[['file', `${sections.length} sections`], ['alert', 'Draft content'], ['shield', 'Pending legal review']]}
      />
      <div className="container public-content">
        <Notice tone="warning">Draft legal content. Review and finalize this document before accepting production users.</Notice>
        <div className="legal-layout">
          <nav className="legal-index" aria-label="On this page">
            {sections.map(([title], i) => (
              <a href={`#legal-${type}-${i}`} key={title} onClick={e => { e.preventDefault(); document.getElementById(`legal-${type}-${i}`)?.scrollIntoView({ behavior: 'smooth' }); }}>
                {String(i + 1).padStart(2, '0')}. {title}
              </a>
            ))}
          </nav>
          <div className="legal-prose">
            {sections.map(([title, body], i) => (
              <section id={`legal-${type}-${i}`} key={title} data-reveal="fade">
                <h2>{i + 1}. {title}</h2>
                <p>{body}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
      <PublicCta eyebrow="QUESTIONS ABOUT THIS PAGE?" title="We're happy to explain." copy="Reach out through the help center and we will clarify anything that is unclear." primary={['Contact support', '/support']} />
    </>
  );
}
