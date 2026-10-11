import { AsyncSelect, Field, Input, Select } from './ui';
import { UNIVERSITIES, UNIVERSITY, getMatriculationConfig, isUniversitySupported } from '../data/universities';
import { academicService } from '../services/academic-service';
import { FALLBACK_FACULTIES, FALLBACK_DEPARTMENTS, FALLBACK_PROGRAMMES, FALLBACK_LEVELS, FALLBACK_SEMESTERS, FALLBACK_SESSIONS } from '../data/uniport-catalogue';

export const emptyAcademic = { universityId: UNIVERSITY.id, facultyId: '', departmentId: '', programmeId: '', academicVersionId: '', admissionSessionId: '', currentLevelId: '', currentSessionId: '', currentSemesterId: '', matriculationNumber: '', phone: '' };

async function loadOrFallback(loader, fallback) {
  try {
    const rows = await loader();
    return Array.isArray(rows) && rows.length ? rows : fallback;
  } catch {
    return fallback;
  }
}

export function AcademicFields({ form, setForm, withUniversity = true, optional = true, requireMatriculation = false }) {
  const change = key => e => setForm(prev => ({ ...prev, [key]: e.target.value, ...(key === 'universityId' ? { facultyId: '', departmentId: '', programmeId: '', academicVersionId: '', admissionSessionId: '', currentLevelId: '', currentSessionId: '', currentSemesterId: '' } : key === 'facultyId' ? { departmentId: '', programmeId: '', academicVersionId: '', currentLevelId: '', currentSemesterId: '' } : key === 'departmentId' ? { programmeId: '', academicVersionId: '', currentLevelId: '', currentSemesterId: '' } : key === 'programmeId' ? { academicVersionId: '', currentLevelId: '', currentSemesterId: '' } : {}) }));
  const facultyLoader = () => {
    const universityId = form.universityId || UNIVERSITY.id;
    if (!isUniversitySupported(universityId)) return Promise.resolve([]);
    return loadOrFallback(() => academicService.getFaculties({ universityId }), universityId === UNIVERSITY.id ? FALLBACK_FACULTIES : []);
  };
  const departmentLoader = () => {
    const universityId = form.universityId || UNIVERSITY.id;
    if (!isUniversitySupported(universityId)) return Promise.resolve([]);
    return loadOrFallback(() => academicService.getDepartments({ facultyId: form.facultyId, universityId }), universityId === UNIVERSITY.id ? FALLBACK_DEPARTMENTS.filter(row => row.facultyId === form.facultyId) : []);
  };
  const programmeLoader = async () => {
    const universityId = form.universityId || UNIVERSITY.id;
    if (!isUniversitySupported(universityId)) return [];
    const departments = await departmentLoader();
    const selectedDepartment = departments.find(row => row.id === form.departmentId);
    try {
      const rows = await academicService.getProgrammes({ departmentId: form.departmentId });
      if (Array.isArray(rows) && rows.length) {
        // Keep the catalogue IDs for compatibility, but present every course of study
        // consistently as a B.Sc. programme in the student profile form.
        return rows.map(row => ({ ...row, name: `B.Sc. ${String(row.name || selectedDepartment?.name || 'Programme').replace(/^B\.(Sc|Ed|Eng)\.\s*/i, '')}` }));
      }
    } catch {}
    // Some departments may not yet have programme documents in Firestore.
    // Provide a selectable B.Sc. fallback so the form never gets stuck.
    if (selectedDepartment) return [{ id: `fallback-bsc-${selectedDepartment.id}`, name: `B.Sc. ${selectedDepartment.name}`, departmentId: selectedDepartment.id, status: 'active' }];
    return [];
  };
  const levelLoader = () => {
    const universityId = form.universityId || UNIVERSITY.id;
    if (!isUniversitySupported(universityId)) return Promise.resolve([]);
    return loadOrFallback(() => academicService.getLevels({ programmeId: form.programmeId, universityId }), universityId === UNIVERSITY.id ? FALLBACK_LEVELS : []);
  };
  const semesterLoader = () => {
    const universityId = form.universityId || UNIVERSITY.id;
    if (!isUniversitySupported(universityId)) return Promise.resolve([]);
    return loadOrFallback(() => academicService.getSemesters({ programmeId: form.programmeId, universityId }), universityId === UNIVERSITY.id ? FALLBACK_SEMESTERS : []);
  };
  const sessionLoader = () => {
    const universityId = form.universityId || UNIVERSITY.id;
    if (!isUniversitySupported(universityId)) return Promise.resolve([]);
    return loadOrFallback(() => academicService.getAcademicSessions({ universityId }), universityId === UNIVERSITY.id ? FALLBACK_SESSIONS : []);
  };

  const selectedUniversity = UNIVERSITIES.find(item => item.id === (form.universityId || UNIVERSITY.id)) || UNIVERSITY;
  const matriculation = getMatriculationConfig(form.universityId || UNIVERSITY.id);

  return <>
    {withUniversity && <div className="form-grid"><Field label="University" hint={selectedUniversity.status !== 'supported' ? 'This university is not available for academic calculations yet.' : 'More Nigerian universities will be added after their grading rules are verified.'}><Select value={form.universityId || UNIVERSITY.id} onChange={change('universityId')} required><option value="">Choose your university</option>{UNIVERSITIES.map(item => <option key={item.id} value={item.id} disabled={item.status !== 'supported'}>{item.name}{item.status !== 'supported' ? ' — coming soon' : ''}</option>)}</Select></Field></div>}
    <div className="form-grid">
      <AsyncSelect label="Faculty" loader={facultyLoader} value={form.facultyId} onChange={change('facultyId')} />
      <AsyncSelect label="Department" loader={departmentLoader} dependencies={[form.facultyId]} enabled={!!form.facultyId} value={form.departmentId} onChange={change('departmentId')} />
      <div className="full-width"><AsyncSelect label="Programme / course of study" loader={programmeLoader} dependencies={[form.departmentId]} enabled={!!form.departmentId} value={form.programmeId} onChange={change('programmeId')} /></div>
      <AsyncSelect label="Admission session" loader={sessionLoader} value={form.admissionSessionId} onChange={change('admissionSessionId')} />
      <AsyncSelect label="Current level" loader={levelLoader} dependencies={[form.programmeId]} enabled={!!form.programmeId} value={form.currentLevelId} onChange={change('currentLevelId')} />
      <AsyncSelect label="Current academic session" loader={sessionLoader} value={form.currentSessionId} onChange={change('currentSessionId')} />
      <AsyncSelect label="Current semester" loader={semesterLoader} dependencies={[form.programmeId]} enabled={!!form.programmeId} value={form.currentSemesterId} onChange={change('currentSemesterId')} />
      {(optional || requireMatriculation) && <>
        <Field label={matriculation?.label || 'Matriculation / registration number'} optional={!requireMatriculation} hint={matriculation?.hint || (requireMatriculation ? 'Required to complete your academic profile.' : undefined)}><Input required={requireMatriculation} autoComplete="off" value={form.matriculationNumber || ''} onChange={change('matriculationNumber')} placeholder={matriculation?.placeholder || 'As shown on your student record'} /></Field>
        <Field label="Phone number" optional><Input type="tel" autoComplete="tel" value={form.phone || ''} onChange={change('phone')} placeholder="Your contact number" /></Field>
      </>}
    </div>
  </>;
}