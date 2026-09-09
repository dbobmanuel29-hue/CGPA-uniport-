import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { Badge, Button } from '../../components/ui';
import { LineChart, DonutChart, Progress } from '../../components/charts';
import { calculateGPA, calculateProjectedCGPA } from '../../utils/calculations';
import { number } from '../../utils/formatting';
import { useCountUp } from '../../hooks/useReveal';
import { FAQ } from '../../data/features';

const HERO = '/images/uniport-campus-hero.jpg';
const STUDY = 'https://images.pexels.com/photos/8199762/pexels-photo-8199762.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200';
const CAMPUS = 'https://images.pexels.com/photos/6334877/pexels-photo-6334877.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200';

const RIBBON = ['Exclusively UniPort', 'GPA calculator', 'CGPA tracking', 'Target planning', 'Academic timeline', 'Graduation progress', 'Performance analytics', 'Semester records', 'Course attention', 'Academic reports'];

const SHOWCASE = {
  calculate: {
    label: 'Calculate',
    title: 'Numbers that finally make sense.',
    copy: 'Enter your credit units and grade points exactly as they appear on your result sheet. CGPA+ handles the credit weighting, quality points and cumulative maths.',
    points: ['Weighted semester GPA', 'Cumulative CGPA from your totals', 'Adjustable 4.0, 5.0, 7.0 and 10.0 scales', 'Clear validation before any result'],
    link: ['Open the GPA calculator', '/app/calculator'],
    icon: 'calculator',
  },
  organize: {
    label: 'Organize',
    title: 'One home for every result.',
    copy: 'Group your courses by academic session, semester and level so each grade keeps the context that makes it meaningful.',
    points: ['Session, semester and level filters', 'Search and sort your full record', 'Add, edit and review course results', 'A timeline of your whole journey'],
    link: ['Explore the academic record', '/app/academic'],
    icon: 'book',
  },
  understand: {
    label: 'Understand',
    title: 'The story behind the score.',
    copy: 'Charts turn a long list of grades into something you can actually read: momentum, grade balance and the semesters that need attention.',
    points: ['GPA and CGPA progression', 'Grade distribution breakdown', 'Best and weakest semesters', 'Passed against failed courses'],
    link: ['See the analytics view', '/app/analytics'],
    icon: 'bars',
  },
  plan: {
    label: 'Plan ahead',
    title: 'Turn "what if" into a plan.',
    copy: 'Set a target, discover the average you need across remaining units, and test future scenarios before the semester starts.',
    points: ['Required GPA for any target', 'Achievable, difficult or impossible signals', 'Maximum achievable CGPA', 'Custom projection scenarios'],
    link: ['Try target planning', '/app/target'],
    icon: 'target',
  },
};

const JOURNEY = [
  ['100 Level', 'Where it begins', 'First semester, first results, first sense of your pace.', 'completed'],
  ['200 Level', 'Finding your rhythm', 'Patterns appear. You start to see which semesters work for you.', 'completed'],
  ['300 Level', 'The turning point', 'Your cumulative average settles. Planning matters most here.', 'current'],
  ['400 Level', 'The final stretch', 'Outstanding courses and credit progress come into focus.', 'upcoming'],
  ['500 Level', 'The finish line', 'Longer programmes keep the same clarity, right to the end.', 'upcoming'],
];

const MOMENTS = [
  ['clock', 'Results just dropped', 'You want your semester GPA now, not after twenty minutes with a phone calculator and a notebook.'],
  ['target', 'You set a goal', 'You know the class of degree you want. You need to know what the remaining semesters must look like.'],
  ['alert', 'A course went badly', 'One result knocked your average. You want to see the real impact instead of assuming the worst.'],
  ['grid', 'Registration week', 'Credit units are being decided. A quick projection helps you plan a realistic load.'],
  ['file', 'A scholarship form', 'Someone needs your CGPA and credit totals, accurately, in a format you can read at a glance.'],
  ['graduation', 'Final year planning', 'You are counting credits and outstanding courses, and you want the full picture in one place.'],
];

const COMPARISON = [
  ['Scattered notes and screenshots', 'Every result in one organized record'],
  ['Recalculating from scratch each time', 'Weighted GPA and CGPA in seconds'],
  ['Guessing what you need next semester', 'A required GPA for your actual target'],
  ['No sense of the wider pattern', 'Trends, grade balance and semester comparisons'],
  ['Counting credits by hand near graduation', 'Credit progress tracked as you go'],
];

const TRUST = [
  ['shield', 'No invented academic data', 'We never fill your dashboard with made-up results. Empty means empty, until your real records arrive.'],
  ['lock', 'Calculations stay on your device', 'The public calculators run locally in your browser. Nothing is uploaded while you experiment.'],
  ['graduation', 'Your university stays the authority', 'Grading policy, classification and graduation eligibility always come from UniPort, never from us.'],
  ['cloud', 'Honest about what is connected', 'If a feature needs a backend that is not live yet, we say so plainly instead of faking success.'],
];

function Metric({ value, decimals = 0, suffix = '', label, detail }) {
  const [ref, display] = useCountUp(value, { decimals });
  return (
    <div className="metric" ref={ref}>
      <strong>{display}{suffix}</strong>
      <span>{label}</span>
      <small>{detail}</small>
    </div>
  );
}

export function CalculatorPreview() {
  const [rows, setRows] = useState([{ code: 'Course 01', credits: 3, points: 5 }, { code: 'Course 02', credits: 2, points: 4 }, { code: 'Course 03', credits: 3, points: 5 }]);
  const totals = calculateGPA(rows);
  return <div className="calculator-preview"><div className="preview-topline"><span><Icon name="calculator" size={17} />Your semester, in focus.</span><Badge>Demo preview</Badge></div><div className="preview-course-table"><div className="preview-course-head"><span>COURSE</span><span>CREDIT UNITS</span><span>GRADE POINTS</span></div>{rows.map((row, i) => <div className="preview-course-row" key={row.code}><span><i>{String(i + 1).padStart(2, '0')}</i>{row.code}</span><select aria-label={`Credit units for ${row.code}`} value={row.credits} onChange={e => setRows(rows.map((r, j) => j === i ? { ...r, credits: Number(e.target.value) } : r))}>{[1, 2, 3, 4, 5, 6].map(v => <option key={v}>{v}</option>)}</select><select aria-label={`Grade points for ${row.code}`} value={row.points} onChange={e => setRows(rows.map((r, j) => j === i ? { ...r, points: Number(e.target.value) } : r))}>{[5, 4, 3, 2, 1, 0].map(v => <option key={v} value={v}>{v.toFixed(1)} points</option>)}</select></div>)}</div><div className="preview-result"><div><span>Your semester GPA</span><strong aria-live="polite" key={totals.gpa} className="value-animate">{number(totals.gpa)}<small>/ 5.00</small></strong></div><div className="preview-result-right"><span>{totals.totalCreditUnits} credit units</span><span>{totals.totalQualityPoints} quality points</span><Icon name="chart" size={27} /></div></div><p className="demo-footnote">Sample courses. Illustrative 5-point scale, not a verified UniPort policy.</p></div>;
}

export function DashboardPreview() {
  return <a className="dashboard-preview" href="#/app" aria-label="Explore the student workspace"><div className="preview-topline"><span><span className="tiny-logo">CGPA<span>+</span></span>Workspace overview</span><Badge>Demo preview</Badge></div><div className="mini-dashboard-head"><div><h3>A little progress, every day.</h3><p>Your academic journey at a glance.</p></div><span className="mini-avatar"><Icon name="user" size={16} /></span></div><div className="mini-stats">{[['Current CGPA', '4.32', '/ 5', 'Illustrative figure'], ['Semester GPA', '4.50', '', 'Sample semester'], ['Credit units', '72', '', 'Example completed']].map(([label, value, suffix, note]) => <div key={label}><span>{label}</span><strong>{value}{suffix && <small>{suffix}</small>}</strong><i>{note}</i></div>)}</div><div className="mini-chart-header"><strong>Your progress, over time</strong><span><i />Semester GPA</span></div><LineChart values={[3.4, 3.9, 3.6, 4.2, 4.1, 4.5]} labels={['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6']} /><div className="preview-bottom"><span>Classification follows the connected grading policy.</span><Icon name="diagonal" size={17} /></div></a>;
}

export default function Home() {
  const [scenario, setScenario] = useState(4.5);
  const [analytics, setAnalytics] = useState('gpa');
  const [showcase, setShowcase] = useState('calculate');
  const projected = calculateProjectedCGPA(3.5, 60, scenario, 60);
  const active = SHOWCASE[showcase];

  return <>
    <section className="home-hero">
      <img className="hero-photo" src={HERO} alt="Two university students sharing a moment on a tropical campus" fetchPriority="high" />
      <div className="hero-shade" />
      <div className="container hero-content">
        <p className="hero-eyebrow animate-in">YOUR AMBITION. YOUR NEXT CHAPTER.</p>
        <h1 className="hero-wordmark animate-in stagger-1" data-page-heading tabIndex={-1}>CGPA<span>+</span><small>UniPort</small></h1>
        <h2 className="hero-title animate-in stagger-2">Your UniPort Academic<br />Journey, Simplified.</h2>
        <p className="hero-description animate-in stagger-2">Know your numbers. Own your progress. A smarter way to calculate, track and plan your university journey.</p>
        <div className="hero-actions animate-in stagger-3">
          <Button href="#/register" variant="lime" endIcon="diagonal">Get started</Button>
          <Button href="#/app/calculator" variant="transparent" icon="calculator">Calculate GPA</Button>
          <a href="#/login" className="hero-sign-in">Sign in<Icon name="arrow" size={15} /></a>
        </div>
        <div className="hero-chips animate-in stagger-4">
          <span><Icon name="check" size={13} />No account needed to calculate</span>
          <span><Icon name="lock" size={13} />Your inputs stay on your device</span>
          <span><Icon name="graduation" size={13} />Built for UniPort students</span>
        </div>
      </div>
      <button
        type="button"
        className="scroll-cue"
        aria-label="Scroll down to explore CGPA+"
        onClick={() => document.getElementById('home-metrics')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      >
        <span /><Icon name="down" size={15} />
      </button>
    </section>

    <div className="ribbon-marquee" aria-hidden="true">
      <div className="marquee">
        {[0, 1].map(copy => (
          <div className="marquee-track" key={copy}>
            {RIBBON.map(item => <span key={item}><Icon name="spark" size={12} />{item}</span>)}
          </div>
        ))}
      </div>
    </div>

    <section className="metrics-band" id="home-metrics">
      <div className="container">
        <div className="metrics-head" data-reveal>
          <span className="eyebrow">ONE UNIVERSITY. EVERY POSSIBILITY.</span>
          <h2>A focused companion,<br />not another portal.</h2>
        </div>
        <div className="metrics-grid" data-reveal-group>
          <Metric value={16} label="Academic tools" detail="Calculators, records, analytics and planning" />
          <Metric value={1} label="University, exclusively" detail="University of Port Harcourt, Rivers State" />
          <Metric value={4} label="Grading scales" detail="Choose 4.0, 5.0, 7.0 or 10.0 for planning" />
          <Metric value={0} label="Naira to calculate" detail="Public calculators are free and account-free" />
        </div>
        <p className="metrics-note" data-reveal>These describe the product, not a student population. CGPA+ does not publish invented usage statistics.</p>
      </div>
    </section>

    <section className="home-tools container">
      <div className="section-heading" data-reveal>
        <div><span className="eyebrow">A CLEARER PICTURE. A BETTER PLAN.</span><h2>Big ambitions.<br />Meet your academic advantage.</h2></div>
        <div><p>From your very first result to your final semester, keep the important things in perspective.</p><a href="#/features" className="section-link">Explore all features<Icon name="diagonal" size={15} /></a></div>
      </div>
      <div className="tools-grid">
        <article className="tool-interactive" data-reveal="left">
          <div className="tool-copy"><span className="tool-index">01 / CALCULATE</span><h3>Less maths. More clarity.</h3><p>Put your results in. Get your GPA out. It's that simple.</p></div>
          <CalculatorPreview />
          <a className="tool-bottom-link" href="#/app/calculator">Try the calculator<Icon name="arrow" size={17} /></a>
        </article>
        <article className="tool-interactive" data-reveal="right" data-reveal-delay="2">
          <div className="tool-copy"><span className="tool-index">02 / TRACK</span><h3>Every semester. One place.</h3><p>A home for your results and a view of the bigger picture.</p></div>
          <DashboardPreview />
        </article>
      </div>
    </section>

    <section className="showcase-section">
      <div className="container">
        <div className="section-heading" data-reveal>
          <div><span className="eyebrow">03 / EXPLORE</span><h2>Four ways CGPA+<br />works for you.</h2></div>
          <p>Every tool answers a different question about your academic journey. Choose one to see what it does.</p>
        </div>
        <div className="showcase" data-reveal="scale">
          <div className="showcase-tabs" role="tablist" aria-label="Product capabilities">
            {Object.entries(SHOWCASE).map(([key, item]) => (
              <button key={key} role="tab" id={`showcase-tab-${key}`} aria-selected={showcase === key} aria-controls={`showcase-panel-${key}`} className={showcase === key ? 'active' : ''} onClick={() => setShowcase(key)}>
                <Icon name={item.icon} size={17} />{item.label}
              </button>
            ))}
          </div>
          <div className="showcase-panel" role="tabpanel" id={`showcase-panel-${showcase}`} aria-labelledby={`showcase-tab-${showcase}`} key={showcase}>
            <div className="showcase-copy">
              <h3>{active.title}</h3>
              <p>{active.copy}</p>
              <a className="section-link" href={`#${active.link[1]}`}>{active.link[0]}<Icon name="arrow" size={15} /></a>
            </div>
            <ul className="showcase-points">
              {active.points.map(point => <li key={point}><Icon name="check" size={15} />{point}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section className="analytics-story">
      <div className="container analytics-story-grid">
        <div className="story-copy" data-reveal="left">
          <span className="eyebrow">04 / UNDERSTAND</span>
          <h2>You're more than<br />a number.<br /><span>Understand yours.</span></h2>
          <p>See the patterns behind your performance. Celebrate the progress, spot the opportunities, and make your next semester count.</p>
          <Button href="#/app/analytics" variant="outline" endIcon="arrow">Explore your analytics</Button>
          <div className="story-photo"><img src={STUDY} alt="Students studying together in a university library" loading="lazy" /><span>Built around student life.</span></div>
        </div>
        <div className="analytics-preview" data-reveal="right" data-reveal-delay="2">
          <div className="preview-topline"><span>Performance, with perspective.</span><Badge>Demo preview</Badge></div>
          <div className="preview-tabs">{[['gpa', 'GPA trend'], ['cgpa', 'CGPA progress'], ['grades', 'Grade distribution']].map(([v, label]) => <button key={v} className={analytics === v ? 'active' : ''} onClick={() => setAnalytics(v)}>{label}</button>)}</div>
          <div className="analytics-preview-number"><span>{analytics === 'grades' ? 'A balanced view' : analytics === 'cgpa' ? 'Cumulative progress' : 'A stronger semester'}</span><strong key={analytics} className="value-animate">{analytics === 'grades' ? '24 courses' : analytics === 'cgpa' ? '4.12' : '4.50'}<Icon name="chart" size={24} /></strong></div>
          {analytics === 'grades'
            ? <DonutChart items={[{ label: '5 points', value: 12 }, { label: '4 points', value: 7 }, { label: '3 points', value: 4 }, { label: '0 points', value: 1 }]} />
            : <LineChart values={analytics === 'gpa' ? [3.4, 3.9, 3.6, 4.2, 4.1, 4.5] : [3.4, 3.65, 3.63, 3.77, 3.9, 4.12]} labels={['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6']} />}
          <div className="sample-pass-fail"><span><i />Passed <strong>23</strong></span><span><i />Failed <strong>1</strong></span><small>Illustrative outcomes only</small></div>
        </div>
      </div>
    </section>

    <section className="projection-story container">
      <div className="section-heading" data-reveal>
        <div><span className="eyebrow">05 / PLAN AHEAD</span><h2>Aim higher.<br />See what's possible.</h2></div>
        <p>What could your next semester change? Try a scenario and turn "what if" into a plan.</p>
      </div>
      <div className="projection-demo" data-reveal="scale">
        <div>
          <Badge>Demo preview</Badge>
          <h3>Your next GPA could make<br />all the difference.</h3>
          <p>Example: 3.50 current CGPA, 60 completed units and 60 remaining units.</p>
          <div className="scenario-options">{[3, 3.5, 4, 4.5, 5].map(v => <button key={v} onClick={() => setScenario(v)} aria-pressed={scenario === v} className={scenario === v ? 'active' : ''}><span>IF YOUR GPA IS</span><strong>{v.toFixed(1)}</strong></button>)}</div>
          <a href="#/app/projection" className="section-link">Build your own scenario<Icon name="diagonal" size={16} /></a>
        </div>
        <div className="projection-answer" aria-live="polite">
          <span>YOUR PROJECTED CGPA</span>
          <strong key={scenario} className="value-animate">{number(projected)}<small>/ 5.00</small></strong>
          <p>A little intention goes a long way.</p>
          <div className="projection-bars">{[3, 3.5, 4, 4.5, 5].map(v => <span key={v} className={v === scenario ? 'active' : ''} style={{ height: `${calculateProjectedCGPA(3.5, 60, v, 60) * 25}px` }} />)}</div>
        </div>
      </div>
    </section>

    <section className="journey-section">
      <div className="container">
        <div className="section-heading" data-reveal>
          <div><span className="eyebrow">06 / FOLLOW YOUR JOURNEY</span><h2>Five levels.<br />One continuous story.</h2></div>
          <p>Your academic timeline keeps every level and semester in view, so progress never feels abstract.</p>
        </div>
        <ol className="journey-rail">
          <span className="journey-line" data-reveal-line aria-hidden="true" />
          {JOURNEY.map(([level, title, copy, status], i) => (
            <li key={level} className={`journey-step is-${status}`} data-reveal="left" data-reveal-delay={i + 1}>
              <span className="journey-dot">{status === 'completed' ? <Icon name="check" size={14} /> : status === 'current' ? <span className="journey-pulse" /> : i + 1}</span>
              <div className="journey-card">
                <header><h3>{level}</h3><Badge tone={status === 'current' ? 'lime' : status === 'completed' ? 'success' : 'neutral'}>{status === 'completed' ? 'Recorded' : status === 'current' ? 'In progress' : 'Ahead of you'}</Badge></header>
                <strong>{title}</strong>
                <p>{copy}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="journey-note" data-reveal>An illustration of the timeline layout. Your real levels and semesters come from your academic records.</p>
      </div>
    </section>

    <section className="graduation-story container">
      <a className="graduation-demo" href="#/app/graduation" aria-label="Explore graduation planning. This panel contains demo data." data-reveal="left">
        <Badge>Demo preview</Badge>
        <div className="graduation-demo-head"><span className="grad-icon"><Icon name="graduation" size={36} /></span><div><span>THE BIG PICTURE</span><h3>One step closer.</h3></div></div>
        <Progress value={60} label="Example credit progress" detail="72 / 120 units" />
        <div className="grad-details"><div><span>Example current level</span><strong>300 Level</strong></div><div><span>Outstanding courses</span><strong>Curriculum required</strong></div></div>
        <div className="mini-milestones"><span className="done"><Icon name="check" size={13} />First steps</span><span className="current"><i />In progress</span><span>Next chapter</span></div>
        <p className="demo-footnote">Illustrative progress only. Your programme's requirements come from the backend.</p>
      </a>
      <div className="story-copy" data-reveal="right" data-reveal-delay="2">
        <span className="eyebrow">07 / KEEP MOVING FORWARD</span>
        <h2>Your journey.<br />Your finish line.</h2>
        <p>Keep track of your credits, see courses that need attention, and approach your final year with a little more confidence.</p>
        <a href="#/app/graduation" className="section-link">Explore graduation planning<Icon name="diagonal" size={16} /></a>
        <p className="story-disclaimer">CGPA+ does not replace official UniPort clearance or transcripts.</p>
      </div>
    </section>

    <section className="compare-section">
      <div className="container">
        <div className="section-heading" data-reveal>
          <div><span className="eyebrow">A SIMPLER WAY TO WORK</span><h2>Same results.<br />A lot less friction.</h2></div>
          <p>Most students already track their grades somehow. CGPA+ just makes that effort go further.</p>
        </div>
        <div className="compare-grid">
          <div className="compare-column compare-before" data-reveal="left">
            <header><span className="compare-tag">The usual way</span><h3>Scattered and manual</h3></header>
            <ul>{COMPARISON.map(([before]) => <li key={before}><Icon name="close" size={14} />{before}</li>)}</ul>
          </div>
          <div className="compare-column compare-after" data-reveal="right" data-reveal-delay="2">
            <header><span className="compare-tag">With CGPA+</span><h3>Organized and clear</h3></header>
            <ul>{COMPARISON.map(([, after]) => <li key={after}><Icon name="check" size={14} />{after}</li>)}</ul>
            <Button href="#/register" variant="lime" endIcon="arrow">Start with CGPA+</Button>
          </div>
        </div>
      </div>
    </section>

    <section className="why-section">
      <div className="container">
        <div className="section-heading" data-reveal>
          <div><span className="eyebrow">DESIGNED WITH YOU IN MIND</span><h2>Student life is a lot.<br />Your academic tools shouldn't be.</h2></div>
          <p>A focused companion for one university, built to make your next step feel simpler.</p>
        </div>
        <div className="benefit-grid" data-reveal-group>
          {[['Know your numbers', 'Less spreadsheet stress. More academic clarity.'], ['Track every semester', 'Keep all your results in their proper context.'], ['Understand performance', 'See progress, not just a list of grades.'], ['Plan ahead', 'Make informed goals for what comes next.'], ['Stay organized', 'A single home for your academic journey.']].map(([t, d], i) => <div className="benefit" key={t}><span>0{i + 1}</span><h3>{t}</h3><p>{d}</p></div>)}
        </div>
      </div>
    </section>

    <section className="moments-section container">
      <div className="section-heading" data-reveal>
        <div><span className="eyebrow">REAL STUDENT MOMENTS</span><h2>Built for the weeks<br />that actually matter.</h2></div>
        <p>These are the situations CGPA+ was designed around, described honestly rather than dressed up as testimonials.</p>
      </div>
      <div className="moments-grid" data-reveal-group>
        {MOMENTS.map(([icon, title, copy]) => (
          <article className="moment" key={title}>
            <span className="moment-icon"><Icon name={icon} size={19} /></span>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="how-section container">
      <div className="section-heading" data-reveal>
        <div><span className="eyebrow">YOUR FIRST STEP IS SIMPLE</span><h2>From where you are<br />to where you want to be.</h2></div>
        <a className="section-link" href="#/how-it-works">See how it works<Icon name="diagonal" size={16} /></a>
      </div>
      <div className="steps-row" data-reveal-group>
        {[['Create your account', 'Your own space for a clearer academic journey.'], ['Make it yours', 'Add your UniPort faculty, programme and level.'], ['Bring your results', 'Enter your courses, credits and grade points.'], ['Own your progress', 'Calculate, understand and plan your next move.']].map(([t, d], i) => <div className="step" key={t}><span className="step-number">0{i + 1}</span><h3>{t}</h3><p>{d}</p></div>)}
      </div>
    </section>

    <section className="device-section">
      <div className="container device-grid">
        <div className="device-copy" data-reveal="left">
          <span className="eyebrow">MADE FOR THE PHONE IN YOUR HAND</span>
          <h2>Between lectures.<br />On the bus.<br />In the hostel.</h2>
          <p>CGPA+ is designed mobile-first, then scaled up. Tap targets are generous, tables stay readable, and the layout adapts from a 360px phone to a wide desktop monitor.</p>
          <ul className="device-list">
            {[['Bottom navigation on phones', 'Your four most-used pages, always one tap away.'], ['Readable tables on small screens', 'Swipe through the full academic record without losing columns.'], ['Light and dark themes', 'Match your device, or pick the one that is easier on your eyes.'], ['Works on modest connections', 'A lightweight build with lazy-loaded imagery.']].map(([t, d]) => (
              <li key={t}><Icon name="check" size={15} /><div><strong>{t}</strong><span>{d}</span></div></li>
            ))}
          </ul>
          <Button href="#/app" variant="outline" endIcon="arrow">Open the workspace</Button>
        </div>
        <div className="device-frames" data-reveal="right" data-reveal-delay="2">
          <div className="phone-frame float-soft">
            <div className="phone-notch" />
            <div className="phone-screen">
              <div className="phone-head"><span className="tiny-logo">CGPA<span>+</span></span><span className="phone-avatar" /></div>
              <div className="phone-hero"><span>Current CGPA</span><strong>4.32</strong><i>Illustrative figure</i></div>
              <div className="phone-bars">{[52, 74, 61, 88, 79, 94].map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}</div>
              <div className="phone-rows">{['Semester GPA', 'Credit units', 'Quality points'].map(row => <div key={row}><span>{row}</span><i /></div>)}</div>
              <div className="phone-nav">{['grid', 'book', 'calculator', 'bars'].map((icon, i) => <span key={icon} className={i === 0 ? 'active' : ''}><Icon name={icon} size={14} /></span>)}</div>
            </div>
          </div>
          <div className="device-badge pulse-soft"><Icon name="check" size={14} />360px to 1440px+</div>
        </div>
      </div>
    </section>

    <section className="trust-section">
      <div className="container">
        <div className="section-heading" data-reveal>
          <div><span className="eyebrow">HONESTY BY DESIGN</span><h2>Your academic data<br />deserves straight answers.</h2></div>
          <p>An independent tool should be clear about what it does, what it stores and where its limits are.</p>
        </div>
        <div className="trust-grid" data-reveal-group>
          {TRUST.map(([icon, title, copy]) => (
            <article className="trust-card" key={title}>
              <span className="trust-icon"><Icon name={icon} size={20} /></span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
        <div className="trust-banner" data-reveal>
          <img src={CAMPUS} alt="Students working together at a study table" loading="lazy" />
          <div>
            <h3>Independent, and clear about it.</h3>
            <p>CGPA+ UniPort is not an official University of Port Harcourt website. It is a planning companion built for students, and your university remains the authority on every official result.</p>
            <a className="section-link" href="#/about">Read more about us<Icon name="arrow" size={15} /></a>
          </div>
        </div>
      </div>
    </section>

    <section className="faq-section container">
      <div data-reveal="left">
        <span className="eyebrow">A LITTLE MORE CLARITY</span>
        <h2>Good questions.<br />Straight answers.</h2>
        <p className="faq-intro">Everything students ask most often, answered without the marketing gloss.</p>
        <a href="#/support" className="section-link">Visit the help center<Icon name="arrow" size={15} /></a>
      </div>
      <div className="faq-list" data-reveal="right" data-reveal-delay="2">
        {FAQ.map(([q, a]) => <details key={q}><summary>{q}<Icon name="plus" size={16} /></summary><p>{a}</p></details>)}
      </div>
    </section>

    <section className="final-cta">
      <div className="container">
        <div data-reveal="left">
          <span className="eyebrow">THIS IS YOUR NEXT CHAPTER.</span>
          <h2>Take control of your<br />academic journey.</h2>
          <p>Start with a little clarity. See how far it takes you.</p>
        </div>
        <div className="final-cta-actions" data-reveal="right" data-reveal-delay="2">
          <Button href="#/register" variant="lime" endIcon="diagonal">Get started with CGPA+</Button>
          <Button href="#/app/calculator" variant="transparent" icon="calculator">Calculate your GPA</Button>
          <span className="final-cta-note">Free calculators. No account required.</span>
        </div>
      </div>
    </section>
  </>;
}
