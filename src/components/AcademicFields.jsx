import { AsyncSelect, Field, Input, UniversityLock } from './ui';
import { academicService } from '../services/academic-service';
import { FALLBACK_FACULTIES, FALLBACK_DEPARTMENTS, FALLBACK_PROGRAMMES, FALLBACK_LEVELS, FALLBACK_SEMESTERS, FALLBACK_SESSIONS } from '../data/uniport-catalogue';

export const emptyAcademic = { facultyId: '', departmentId: '', programmeId: '', academicVersionId: '', admissionSessionId: '', currentLevelId: '', currentSessionId: '', currentSemesterId: '', matriculationNumber: '', phone: '' };

async function loadOrFallback(loader, fallback) {
  try {
    const rows = await loader();
    return Array.isArray(rows) && rows.length ? rows : fallback;
  } catch {
    return fallback;
  }
}

export function AcademicFields({ form, setForm, withUniversity = true, optional = true }) {
  const change = key => e => setForm(prev => ({ ...prev, [key]: e.target.value, ...(key === 'facultyId' ? { departmentId: '', programmeId: '', academicVersionId: '', currentLevelId: '', currentSemesterId: '' } : key === 'departmentId' ? { programmeId: '', academicVersionId: '', currentLevelId: '', currentSemesterId: '' } : key === 'programmeId' ? { academicVersionId: '', currentLevelId: '', currentSemesterId: '' } : {}) }));
  const facultyLoader = () => loadOrFallback(() => academicService.getFaculties(), FALLBACK_FACULTIES);
  const departmentLoader = () => loadOrFallback(() => academicService.getDepartments({ facultyId: form.facultyId }), FALLBACK_DEPARTMENTS.filter(row => row.facultyId === form.facultyId));
  const programmeLoader = () => loadOrFallback(() => academicService.getProgrammes({ departmentId: form.departmentId }), FALLBACK_PROGRAMMES.filter(row => row.departmentId === form.departmentId));
  const levelLoader = () => loadOrFallback(() => academicService.getLevels({ programmeId: form.programmeId }), FALLBACK_LEVELS);
  const semesterLoader = () => loadOrFallback(() => academicService.getSemesters({ programmeId: form.programmeId }), FALLBACK_SEMESTERS);
  const sessionLoader = () => loadOrFallback(() => academicService.getAcademicSessions(), FALLBACK_SESSIONS);

  return <>
    {withUniversity && <UniversityLock />}
    <div className="form-grid">
      <AsyncSelect label="Faculty" loader={facultyLoader} value={form.facultyId} onChange={change('facultyId')} />
      <AsyncSelect label="Department" loader={departmentLoader} dependencies={[form.facultyId]} enabled={!!form.facultyId} value={form.departmentId} onChange={change('departmentId')} />
      <div className="full-width"><AsyncSelect label="Programme / course of study" loader={programmeLoader} dependencies={[form.departmentId]} enabled={!!form.departmentId} value={form.programmeId} onChange={change('programmeId')} /></div>
      <AsyncSelect label="Admission session" loader={sessionLoader} value={form.admissionSessionId} onChange={change('admissionSessionId')} />
      <AsyncSelect label="Current level" loader={levelLoader} dependencies={[form.programmeId]} enabled={!!form.programmeId} value={form.currentLevelId} onChange={change('currentLevelId')} />
      <AsyncSelect label="Current academic session" loader={sessionLoader} value={form.currentSessionId} onChange={change('currentSessionId')} />
      <AsyncSelect label="Current semester" loader={semesterLoader} dependencies={[form.programmeId]} enabled={!!form.programmeId} value={form.currentSemesterId} onChange={change('currentSemesterId')} />
      {optional && <>
        <Field label="Matriculation number" optional><Input value={form.matriculationNumber || ''} onChange={change('matriculationNumber')} placeholder="As shown on your student record" /></Field>
        <Field label="Phone number" optional><Input type="tel" autoComplete="tel" value={form.phone || ''} onChange={change('phone')} placeholder="Your contact number" /></Field>
      </>}
    </div>
  </>;
}