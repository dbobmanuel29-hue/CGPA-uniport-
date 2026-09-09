import { useState } from 'react';
import { Logo, ThemeButton } from '../../components/navigation';
import { AcademicFields, emptyAcademic } from '../../components/AcademicFields';
import { ActionError, useAction } from '../../components/feedback';
import { Button, Notice } from '../../components/ui';
import { academicService } from '../../services/academic-service';
import { navigate } from '../../utils/routing';
import { UNIVERSITY } from '../../data/uniport';

export default function Onboarding() {
  const [form, setForm] = useState(emptyAcademic);
  const [validation, setValidation] = useState('');
  const action = useAction();
  function submit(event) {
    event.preventDefault();
    const required = ['facultyId', 'departmentId', 'programmeId', 'admissionSessionId', 'currentLevelId', 'currentSessionId', 'currentSemesterId'];
    if (required.some(key => !form[key])) {
      setValidation('Complete each academic selector before saving. Available choices must come from the connected backend.');
      return;
    }
    setValidation('');
    action.run(() => academicService.updateProfile({ ...form, universityId: UNIVERSITY.id }), () => navigate('/app'), 'Your academic profile has been updated.');
  }
  return (
    <div className="onboarding-page">
      <header className="onboarding-nav"><Logo /><ThemeButton /></header>
      <main className="onboarding-container">
        <span className="eyebrow">LET'S MAKE THIS YOURS</span>
        <h1 tabIndex={-1} data-page-heading>Your UniPort journey.<br />Your academic profile.</h1>
        <p className="onboarding-description">A few details help put your results in the right context. Your university is already selected. No other institutions, no unnecessary steps.</p>
        <div className="onboarding-steps"><span><i>1</i>Your account</span><span className="active"><i>2</i>Academic profile</span><span><i>3</i>Your workspace</span></div>
        <form className="panel form-stack" onSubmit={submit}>
          <AcademicFields form={form} setForm={setForm} />
          <Notice>Faculty, department, programme, level and session options come from the backend. No unverified UniPort catalogue is hard-coded.</Notice>
          {validation && <p className="field-error" role="alert">{validation}</p>}
          <ActionError error={action.error} />
          <Button type="submit" busy={action.busy} endIcon="arrow">Save academic profile</Button>
        </form>
        <div className="auth-bottom">Just exploring? <a href="#/app">Preview the workspace without signing in</a></div>
      </main>
    </div>
  );
}