import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Badge, Button, Field, Input, Notice, Select, Textarea } from '../../components/ui';
import { ActionError, useAction } from '../../components/feedback';
import { useSession } from '../../state/session';
import { supportService } from '../../services/support-service';

const GUIDES = [
  ['calculator', 'Understanding weighted GPA', 'Why a credit-weighted average differs from adding your grades and dividing.'],
  ['target', 'Reading your required GPA', 'What achievable, difficult and impossible really mean in the target planner.'],
  ['chart', 'Choosing a grading scale', 'How to match the calculator to the scale printed on your result sheet.'],
  ['file', 'What a CGPA+ report is', 'The difference between a planning document and an official transcript.'],
];

export default function PublicSupport() {
  const session = useSession();
  const [form, setForm] = useState({ fullName: '', email: '', category: 'general', subject: '', description: '', priority: 'normal' });
  const action = useAction();
  const [sent, setSent] = useState(false);
  const [authGate, setAuthGate] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const change = key => e => setForm({ ...form, [key]: e.target.value });
  const authenticated = !!session?.user;
  const sessionLoading = session?.status === 'loading';

  useEffect(() => {
    if (!session?.user) return;
    setForm(current => ({ ...current, fullName: session.user.fullName || current.fullName || '', email: session.user.email || current.email || '' }));
    const raw = sessionStorage.getItem('cgpa_public_support_draft');
    if (!raw || pendingSubmit || sent) return;
    try {
      const draft = JSON.parse(raw);
      if (!draft?.subject || !draft?.description) return;
      sessionStorage.removeItem('cgpa_public_support_draft');
      setForm(current => ({ ...current, ...draft, fullName: session.user.fullName || draft.fullName || '', email: session.user.email || draft.email || '' }));
      setPendingSubmit(true);
    } catch {
      sessionStorage.removeItem('cgpa_public_support_draft');
    }
  }, [session?.user, pendingSubmit, sent]);

  useEffect(() => {
    if (!pendingSubmit || !session?.user || action.busy || sent) return;
    setPendingSubmit(false);
    action.run(
      () => supportService.createTicket({ ...form, fullName: session.user.fullName || form.fullName, email: session.user.email || form.email }),
      () => setSent(true),
      'Your support request was created.'
    );
  }, [pendingSubmit, session?.user, sent]);

  function submit(e) {
    e.preventDefault();
    if (!session?.user) {
      sessionStorage.setItem('cgpa_public_support_draft', JSON.stringify(form));
      setAuthGate(true);
      return;
    }
    action.run(
      () => supportService.createTicket({ ...form, fullName: session.user.fullName || form.fullName, email: session.user.email || form.email }),
      () => setSent(true),
      'Your support request was created.'
    );
  }

  return (
    <>
      <header className="public-page-head">
        <div className="container">
          <span className="eyebrow animate-in">LET'S FIND SOME CLARITY</span>
          <h1 tabIndex={-1} data-page-heading className="animate-in stagger-1">A little help goes a long way.</h1>
          <p className="animate-in stagger-2">Questions about CGPA+, calculations or your academic workspace? Start here. Support requests are linked to your CGPA+ account so we can respond securely.</p>
          <div className="page-head-meta animate-in stagger-3"><span><Icon name="message" size={14} />Support requests</span><span><Icon name="help" size={14} />Frequently asked questions</span><span><Icon name="shield" size={14} />Account required to submit</span></div>
        </div>
      </header>

      <div className="container public-content">
        <div className="help-layout">
          <div data-reveal="left">
            {[['calculator', 'Calculators & planning', 'Understand GPA inputs, target projections and the planning scale.', 'calculations'], ['user', 'Account & profile', 'Help with sign-in, academic details and account settings.', 'account'], ['message', 'Something else?', 'Product feedback, accessibility concerns or a technical issue.', 'general']].map(([icon, title, desc, value]) => (
              <button type="button" className="support-category support-category-button" onClick={() => setForm({ ...form, category: value })} key={title}>
                <Icon name={icon} size={22} /><div><h3>{title}</h3><p>{desc}</p></div><Icon name="chevron" size={15} />
              </button>
            ))}
            <div className="support-email-placeholder"><strong>Support email</strong><p>Use the secure support form below. Your request is delivered to the CGPA+ support desk after your account is authenticated.</p></div>
            <Notice icon="shield">Never include your password, payment details or other confidential credentials in a support request.</Notice>
          </div>

          <section className="panel" data-reveal="right" data-reveal-delay="2">
            <header className="panel-header"><div><h2>Tell us what you need.</h2><p>{authenticated ? 'You are signed in. Your request will be linked to this account.' : 'You must create an account or sign in before a request can be submitted.'}</p></div></header>
            {sent ? (
              <div className="auth-success">
                <Icon name="check" size={30} /><h3>Request received.</h3>
                <p className="muted">Your support request has been added to the CGPA+ support desk. You can follow the conversation from your student dashboard.</p>
                <Button href="#/app/support" endIcon="arrow">View my support requests</Button>
              </div>
            ) : (
              <form className="form-stack" onSubmit={submit}>
                <div className="form-grid">
                  <Field label="Full name"><Input required value={authenticated ? (session.user.fullName || '') : form.fullName} onChange={change('fullName')} autoComplete="name" placeholder="Your full name" disabled={authenticated || sessionLoading} /></Field>
                  <Field label="Email address"><Input type="email" required value={authenticated ? (session.user.email || '') : form.email} onChange={change('email')} autoComplete="email" placeholder="you@example.com" disabled={authenticated || sessionLoading} /></Field>
                </div>
                <Field label="Support category"><Select value={form.category} onChange={change('category')}><option value="general">General enquiry</option><option value="calculations">Calculators & planning</option><option value="account">Account & profile</option><option value="technical">Technical issue</option><option value="accessibility">Accessibility</option></Select></Field>
                <Field label="Subject"><Input required value={form.subject} onChange={change('subject')} placeholder="How can we help?" maxLength={180} /></Field>
                <Field label="Your message"><Textarea required value={form.description} onChange={change('description')} placeholder="A few details will help us understand." minLength={10} maxLength={5000} /></Field>
                <ActionError error={action.error} />
                {authGate && !authenticated && <Notice icon="lock">Please create a CGPA+ account or sign in before submitting. Your message has been saved temporarily in this browser so you can continue after authentication.</Notice>}
                {!authenticated && !sessionLoading ? (
                  <div className="form-actions">
                    <Button type="submit" busy={action.busy} endIcon="arrow">Sign in or create an account</Button>
                    {authGate && <><Button type="button" variant="outline" href="#/register">Create account</Button><Button type="button" variant="outline" href="#/login">I already have an account</Button></>}
                  </div>
                ) : <Button type="submit" busy={action.busy || pendingSubmit} endIcon="arrow">Send request</Button>}
                <span className="field-hint">Support requests are only stored after the authenticated backend accepts them.</span>
              </form>
            )}
          </section>
        </div>
      </div>

      <section className="guides-section"><div className="container"><div className="section-heading" data-reveal><div><span className="eyebrow">HELPFUL READING</span><h2>Short guides for<br />the common questions.</h2></div><p>The concepts that come up most often when students start using CGPA+.</p></div><div className="guides-grid" data-reveal-group>{GUIDES.map(([icon, title, copy]) => <article className="guide-card" key={title}><span className="guide-icon"><Icon name={icon} size={18} /></span><div><h3>{title}</h3><p>{copy}</p></div><Badge>Guide</Badge></article>)}</div><p className="capability-note" data-reveal>Full guide articles will be published alongside the connected help center.</p></div></section>

      <section className="expect-section container"><div className="expect-grid" data-reveal="scale"><div><span className="eyebrow">WHAT TO EXPECT</span><h2>Clear support,<br />without the guesswork.</h2><p>Every authenticated request is added to the support desk with a reference ID. You can then follow the conversation from your student dashboard.</p></div><ul className="expect-list">{[['message', 'Every request gets a reference', 'Each support request carries an ID you can follow.'], ['refresh', 'Status you can see', 'Open, in progress, resolved and closed states are visible to you.'], ['lock', 'We never ask for passwords', 'No support agent will request your credentials or payment details.']].map(([icon, title, copy]) => <li key={title}><Icon name={icon} size={17} /><div><strong>{title}</strong><span>{copy}</span></div></li>)}</ul></div></section>
    </>
  );
}
