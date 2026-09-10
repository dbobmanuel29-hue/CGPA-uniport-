import { useState } from 'react';
import { Logo, ThemeButton } from '../../components/navigation';
import { Button, Field, Input, PasswordInput } from '../../components/ui';
import { ActionError, useAction } from '../../components/feedback';
import { GoogleIcon, Icon } from '../../components/Icon';
import { authService } from '../../services/auth-service';
import { academicService } from '../../services/academic-service';
import { useSession } from '../../state/session';
import { navigate } from '../../utils/routing';
import { validatePassword } from '../../utils/validation';

const PROFILE_FIELDS = ['facultyId','departmentId','programmeId','admissionSessionId','currentLevelId','currentSessionId','currentSemesterId'];

export default function Auth({ mode = 'login' }) {
  const register = mode === 'register', reset = mode === 'forgot-password';
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '', remember: true, terms: false });
  const [validation, setValidation] = useState('');
  const [sent, setSent] = useState(false);
  const action = useAction();
  const session = useSession();
  const change = key => e => setForm({ ...form, [key]: e.target.value });

  const authenticated = async user => {
    session.accept(user);
    if (!user) return;
    let hasPendingSupport = false;
    try {
      const draft = JSON.parse(sessionStorage.getItem('cgpa_public_support_draft') || 'null');
      hasPendingSupport = !!(draft?.subject && draft?.description);
    } catch {}
    if (hasPendingSupport) {
      navigate('/support');
      return;
    }
    try {
      const profile = await academicService.getProfile();
      const profileComplete = PROFILE_FIELDS.every(key => !!profile?.[key]);
      navigate(profileComplete ? '/app' : '/onboarding');
    } catch {
      navigate(user.onboardingComplete ? '/app' : '/onboarding');
    }
  };

  function submit(e) {
    e.preventDefault(); setValidation('');
    if (register && validatePassword(form.password)) return setValidation(validatePassword(form.password));
    if (register && form.password !== form.confirm) return setValidation('Your passwords do not match.');
    if (reset) return action.run(() => authService.sendPasswordReset({ email: form.email }), () => setSent(true));
    action.run(() => register ? authService.register({ fullName: form.fullName.trim(), email: form.email.trim(), password: form.password, acceptedTerms: form.terms }) : authService.login({ email: form.email.trim(), password: form.password, remember: form.remember }), authenticated);
  }

  return <div className="auth-page"><aside className="auth-aside"><img src="/images/uniport-campus-hero.jpg" alt="" /><Logo light /><div><span className="eyebrow">BUILT FOR UNIPORT. BUILT AROUND YOU.</span><h2>A clearer picture.<br />A more confident<br />next chapter.</h2><p>Your UniPort Academic Journey, Simplified.<br />Track. Calculate. Improve.</p></div></aside><main className="auth-main"><div className="auth-theme"><ThemeButton /></div><div className="auth-box"><a className="auth-back" href="#/"><Icon name="back" size={14} />Back to CGPA+ UniPort</a><span className="eyebrow">{reset ? 'A FRESH START' : register ? 'YOUR NEXT CHAPTER' : 'GOOD TO SEE YOU'}</span><h1 tabIndex={-1} data-page-heading>{reset ? 'Forgot your password?' : register ? 'Make room for progress.' : 'Welcome back.'}</h1><p>{reset ? 'Enter your email and request a password reset link.' : register ? 'Create your CGPA+ account and start your UniPort journey with a little more clarity.' : 'Sign in to your CGPA+ UniPort workspace. Your next step starts here.'}</p>{sent ? <div className="auth-success"><Icon name="mail" size={30} /><h3>Check your email.</h3><p className="muted">The authentication service has accepted your reset request. Check your inbox and spam folder.</p><Button href="#/login" className="button-full">Return to sign in</Button></div> : <form className="form-stack" onSubmit={submit}>{register && <Field label="Full name"><Input autoComplete="name" required value={form.fullName} onChange={change('fullName')} placeholder="Your full name" /></Field>}<Field label="Email address"><Input type="email" autoComplete="email" required value={form.email} onChange={change('email')} placeholder="you@example.com" /></Field>{!reset && <Field label="Password" hint={register ? 'At least 8 characters.' : undefined}><PasswordInput required value={form.password} onChange={change('password')} autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? 'Create a strong password' : 'Enter your password'} minLength={register ? 8 : undefined} /></Field>}{register && <Field label="Confirm password"><PasswordInput required value={form.confirm} onChange={change('confirm')} autoComplete="new-password" placeholder="Enter your password again" /></Field>}{!reset && !register && <div className="auth-options"><label className="checkbox-row"><input type="checkbox" checked={form.remember} onChange={e => setForm({ ...form, remember: e.target.checked })} />Remember me</label><a href="#/forgot-password">Forgot password?</a></div>}{register && <label className="checkbox-row"><input type="checkbox" required checked={form.terms} onChange={e => setForm({ ...form, terms: e.target.checked })} /><span>I agree to the <a href="#/terms" target="_blank" rel="noreferrer">Terms</a> and <a href="#/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</span></label>}{validation && <p className="field-error" role="alert">{validation}</p>}<ActionError error={action.error} /><Button type="submit" busy={action.busy} endIcon="arrow">{reset ? 'Send reset link' : register ? 'Create account' : 'Sign in'}</Button>{!reset && <><div className="auth-divider">or continue with</div><Button variant="outline" busy={action.busy} onClick={() => action.run(() => authService.loginWithGoogle({ intent: register ? 'register' : 'login' }), authenticated)}><GoogleIcon />Continue with Google</Button></>}</form>}<div className="auth-bottom">{reset ? <a href="#/login">Back to sign in</a> : register ? <>Already have an account? <a href="#/login">Sign in</a></> : <>New to CGPA+? <a href="#/register">Create an account</a></>}</div><p className="auth-legal">Independent platform for University of Port Harcourt students.<br />Authentication requires the connected backend. No sign-in is simulated.</p></div></main></div>;
}