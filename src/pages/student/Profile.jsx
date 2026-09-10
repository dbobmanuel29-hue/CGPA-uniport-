import { useEffect, useState } from 'react';
import { PageHeader, Button, Panel, Field, Input, Badge, Notice, UniversityLock } from '../../components/ui';
import { Modal, ConnectionState, ActionError, useAction } from '../../components/feedback';
import { AcademicFields, emptyAcademic } from '../../components/AcademicFields';
import { Icon } from '../../components/Icon';
import { useResource } from '../../hooks/useResource';
import { academicService } from '../../services/academic-service';
import { authService } from '../../services/auth-service';
import { initials, titleCase } from '../../utils/formatting';

function PersonalEditor({ open, onClose, user, onSaved }) {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '' });
  const action = useAction();
  useEffect(() => { if (open) { setForm({ fullName: user?.fullName || '', email: user?.email || '', phone: user?.phone || '' }); action.clear(); } }, [open, user]);
  return <Modal open={open} onClose={onClose} title="Edit your personal details"><form className="form-stack" onSubmit={e => { e.preventDefault(); action.run(() => authService.updateAccount(form), () => { onSaved(); onClose(); }, 'Your profile details were updated.'); }}><Field label="Full name"><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required autoComplete="name" /></Field><Field label="Email address"><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required autoComplete="email" /></Field><Field label="Phone number" optional><Input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} autoComplete="tel" /></Field><Notice>Email changes may require reauthentication and verification by the connected authentication service.</Notice><ActionError error={action.error} /><div className="modal-actions"><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" busy={action.busy}>Save profile</Button></div></form></Modal>;
}

function PhotoEditor({ open, onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const action = useAction();
  useEffect(() => { if (!file) { setPreview(''); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  useEffect(() => { if (open) { setFile(null); setError(''); action.clear(); } }, [open]);
  return <Modal open={open} onClose={onClose} title="Change your profile photo"><div className="photo-upload"><div className="photo-preview">{preview ? <img src={preview} alt="Local profile photo preview, not uploaded" /> : <Icon name="user" size={40} />}</div><label className="upload-label"><Icon name="upload" size={20} /><strong>Choose an image</strong><span>JPEG, PNG or WebP. Maximum 5 MB.</span><input type="file" accept="image/jpeg,image/png,image/webp" onClick={e => { e.currentTarget.value = ''; }} onChange={e => { const candidate = e.target.files?.[0]; if (!candidate) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(candidate.type)) { setError('Choose a JPEG, PNG or WebP image.'); return; } if (candidate.size > 5 * 1024 * 1024) { setError('Your image must be 5 MB or smaller.'); return; } setError(''); setFile(candidate); }} /></label>{preview && <Badge tone="warning">Local preview. Not uploaded.</Badge>}{error && <p className="field-error" role="alert">{error}</p>}</div><ActionError error={action.error} /><div className="modal-actions"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!file} busy={action.busy} icon="upload" onClick={() => action.run(() => authService.changePhoto({ file }), () => { onSaved(); onClose(); }, 'Your photo was updated.')}>Upload photo</Button></div></Modal>;
}

export function AcademicProfileEditor({ open, onClose, profile, onSaved }) {
  const [form, setForm] = useState(emptyAcademic);
  const action = useAction();
  useEffect(() => { if (open) setForm(Object.fromEntries(Object.keys(emptyAcademic).map(key => [key, profile?.[key] ?? emptyAcademic[key]]))); }, [open, profile]);
  return <Modal open={open} onClose={onClose} title="Update academic profile" wide><form className="form-stack" onSubmit={e => { e.preventDefault(); action.run(() => academicService.updateProfile({ ...form, universityId: 'UNIPORT' }), () => { onSaved?.(); onClose(); }, 'Academic profile updated.'); }}><AcademicFields form={form} setForm={setForm} /><ActionError error={action.error} /><div className="modal-actions"><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" busy={action.busy} disabled={!form.facultyId || !form.departmentId || !form.programmeId || !form.currentLevelId || !form.currentSessionId || !form.currentSemesterId || !form.admissionSessionId}>Update academic profile</Button></div></form></Modal>;
}

export default function Profile() {
  const account = useResource(() => authService.getCurrentUser());
  const academic = useResource(() => academicService.getProfile());
  const [modal, setModal] = useState('');
  const action = useAction();
  const user = account.data;
  const profile = academic.data;
  return <><PageHeader eyebrow="YOUR SPACE. YOUR STORY." title="Your student profile." description="Keep your personal and academic details in their proper place." actions={<Button variant="outline" icon="edit" onClick={() => setModal('personal')}>Edit profile</Button>} /><div className="profile-layout"><div><Panel><div className="profile-identity"><div className="profile-avatar">{user?.photoUrl ? <img src={user.photoUrl} alt="Your profile" /> : <span>{user?.fullName ? initials(user.fullName) : <Icon name="user" size={35} />}</span>}</div><h2>{user?.fullName || 'Your student profile'}</h2><p>{user?.email || 'Account details not connected'}</p><Badge tone="success">UniPort</Badge><Button variant="outline" className="button-small" icon="upload" onClick={() => setModal('photo')}>Change photo</Button></div></Panel><Panel title="Your account" className="profile-account"><dl className="semester-details"><div><dt>Account status</dt><dd>{user?.accountStatus ? titleCase(user.accountStatus) : '--'}</dd></div><div><dt>Email verification</dt><dd>{user ? user.emailVerified ? 'Verified' : 'Not verified' : '--'}</dd></div><div><dt>Account type</dt><dd>Free</dd></div></dl><Button variant="outline" className="button-small" icon="mail" busy={action.busy} onClick={() => action.run(() => authService.sendEmailVerification(), null, 'Verification email requested.')}>Verify email</Button><ActionError error={action.error} /></Panel></div><div><Panel title="Personal information" action={<button className="text-button" onClick={() => setModal('personal')}>Edit details</button>}><ConnectionState resource={account} title="personal information" emptyTitle="Your account is not connected.">{data => <dl className="detail-grid"><div><dt>Full name</dt><dd>{data.fullName || '--'}</dd></div><div><dt>Email address</dt><dd>{data.email || '--'}</dd></div><div><dt>Phone number</dt><dd>{data.phone || 'Not provided'}</dd></div></dl>}</ConnectionState></Panel><Panel title="Academic profile" action={<button className="text-button" onClick={() => setModal('academic')}>Update profile</button>}><UniversityLock /><ConnectionState resource={academic} title="academic profile" emptyTitle="Make this journey yours." emptyDescription="Add your faculty, programme and academic context.">{data => <dl className="detail-grid">{[['facultyName', 'Faculty'], ['departmentName', 'Department'], ['programmeName', 'Programme'], ['admissionSessionName', 'Admission session'], ['currentLevelName', 'Current level'], ['currentSessionName', 'Current session'], ['currentSemesterName', 'Current semester'], ['matriculationNumber', 'Matriculation number']].map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{data[key] || '--'}</dd></div>)}</dl>}</ConnectionState></Panel></div></div><PersonalEditor open={modal === 'personal'} onClose={() => setModal('')} user={user} onSaved={account.refresh} /><PhotoEditor open={modal === 'photo'} onClose={() => setModal('')} onSaved={account.refresh} /><AcademicProfileEditor open={modal === 'academic'} onClose={() => setModal('')} profile={profile} onSaved={academic.refresh} /></>;
}
