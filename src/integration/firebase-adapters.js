import { configureServices } from '../services/adapter.js';
import { firebaseConfigured, getFirebase } from './firebase-client.js';
import { UNIVERSITY } from '../data/uniport.js';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';
const now = () => new Date().toISOString();
const unwrap = value => Array.isArray(value) ? value : (value?.items || []);
const asDate = value => value?.toDate ? value.toDate().toISOString() : (value || null);
const clean = value => Object.fromEntries(Object.entries(value || {}).filter(([, v]) => v !== undefined));
const id = ref => ref?.id || ref;
const title = value => value?.name || value?.title || value?.label || '';

async function ctx() {
  const sdk = await getFirebase();
  if (!sdk) throw Object.assign(new Error('Firebase is not configured.'), { code: 'BACKEND_NOT_CONNECTED' });
  return sdk;
}

async function requireUser() {
  const { auth, db } = await ctx();
  const user = auth.currentUser;
  if (!user) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
  return { auth, db, user };
}

async function userAccount(user, db) {
  if (!user) return null;
  const snap = await db.collection('users').doc(user.uid).get();
  const data = snap.exists ? snap.data() : {};
  const isOwnerAdmin = user.uid === OWNER_ADMIN_UID;
  return clean({
    id: user.uid,
    fullName: data.fullName || user.displayName || '',
    email: user.email || data.email || '',
    phone: data.phone || user.phoneNumber || '',
    photoUrl: data.photoUrl || user.photoURL || '',
    accountStatus: data.accountStatus || 'active',
    emailVerified: !!user.emailVerified,
    onboardingComplete: !!data.onboardingComplete,
    role: isOwnerAdmin ? 'admin' : (data.role || undefined),
    createdAt: asDate(data.createdAt) || asDate(user.metadata?.creationTime) || now(),
  });
}

function queryRows(snapshot) {
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function relationQuery(collection, field, value) {
  return value ? collection.where(field, '==', value) : collection;
}

async function getCollection(db, name, filters = {}) {
  let query = db.collection(name);
  for (const [field, value] of Object.entries(filters)) if (value) query = query.where(field, '==', value);
  const snap = await query.get();
  return queryRows(snap);
}

function normalizeAcademic(row) {
  return clean({ ...row, createdAt: asDate(row.createdAt), updatedAt: asDate(row.updatedAt), startDate: asDate(row.startDate) || row.startDate, endDate: asDate(row.endDate) || row.endDate });
}

async function academicProfile(db, uid) {
  const snap = await db.collection('academicProfiles').doc(uid).get();
  if (!snap.exists) return null;
  const data = snap.data();
  const names = {};
  for (const [collection, field, key] of [['faculties', 'facultyId', 'facultyName'], ['departments', 'departmentId', 'departmentName'], ['programmes', 'programmeId', 'programmeName'], ['academicSessions', 'admissionSessionId', 'admissionSessionName'], ['levels', 'currentLevelId', 'currentLevelName'], ['academicSessions', 'currentSessionId', 'currentSessionName'], ['semesters', 'currentSemesterId', 'currentSemesterName']]) {
    if (data[field]) {
      const snapRef = await db.collection(collection).doc(data[field]).get();
      if (snapRef.exists) names[key] = title(snapRef.data());
    }
  }
  return { universityId: UNIVERSITY.id, ...data, ...names };
}

async function getAcademicCollection(db, name, filters = {}) {
  const rows = await getCollection(db, name, filters);
  return rows.map(normalizeAcademic);
}

function resultWithNames(row, sessions, semesters, levels) {
  return clean({ ...row, sessionName: sessions.find(x => x.id === row.sessionId)?.name || row.sessionName || '', semesterName: semesters.find(x => x.id === row.semesterId)?.name || row.semesterName || '', levelName: levels.find(x => x.id === row.levelId)?.name || row.levelName || '', createdAt: asDate(row.createdAt), updatedAt: asDate(row.updatedAt) });
}

async function listOwnedResults(db, uid, filters = {}) {
  let query = db.collection('results').where('userId', '==', uid);
  for (const key of ['sessionId', 'semesterId', 'levelId']) if (filters[key]) query = query.where(key, '==', filters[key]);
  const snap = await query.get();
  const [sessions, semesters, levels] = await Promise.all([getAcademicCollection(db, 'academicSessions'), getAcademicCollection(db, 'semesters'), getAcademicCollection(db, 'levels')]);
  return queryRows(snap).map(row => resultWithNames(row, sessions, semesters, levels));
}

function calculateSummary(results, maxPoint = 5) {
  const totalCredits = results.reduce((sum, r) => sum + Number(r.credits || 0), 0);
  const qualityPoints = results.reduce((sum, r) => sum + Number(r.qualityPoints ?? Number(r.credits || 0) * Number(r.points || 0)), 0);
  const gpa = totalCredits ? qualityPoints / totalCredits : 0;
  return { gpa, cgpa: gpa, totalCredits, qualityPoints, maxPoint };
}

async function getPolicy(db, uid) {
  const profile = await academicProfile(db, uid);
  if (!profile) return null;
  let query = db.collection('gradingRules').where('programmeId', '==', profile.programmeId);
  if (profile.academicVersionId) query = query.where('academicVersionId', '==', profile.academicVersionId);
  const snap = await query.get();
  const rules = queryRows(snap);
  if (!rules.length) return null;
  const maxPoint = Math.max(...rules.map(r => Number(r.maxPoint || 0)));
  return { maxPoint, source: rules[0].source || '', classifications: rules.filter(r => r.classificationMin !== undefined).map(r => ({ min: Number(r.classificationMin), label: r.classificationLabel })) };
}

async function registerAuth() {
  const { auth, db, storage } = await ctx();
  const persistence = window.firebase.auth.Auth.Persistence;
  const authMethods = {
    async login({ email, password, remember = true }) {
      await auth.setPersistence(remember ? persistence.LOCAL : persistence.SESSION);
      const result = await auth.signInWithEmailAndPassword(email, password);
      return userAccount(result.user, db);
    },
    async loginWithGoogle({ intent }) {
      const provider = new window.firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await auth.signInWithPopup(provider);
      const ref = db.collection('users').doc(result.user.uid);
      const existing = await ref.get();
      if (!existing.exists) await ref.set({ fullName: result.user.displayName || '', email: result.user.email || '', accountStatus: 'active', onboardingComplete: false, role: result.user.uid === OWNER_ADMIN_UID ? 'admin' : 'student', createdAt: window.firebase.firestore.FieldValue.serverTimestamp(), provider: 'google' });
      return userAccount(result.user, db);
    },
    async register({ fullName, email, password, acceptedTerms }) {
      if (!acceptedTerms) throw Object.assign(new Error('Terms acceptance is required.'), { code: 'auth/terms-required' });
      const result = await auth.createUserWithEmailAndPassword(email, password);
      await result.user.updateProfile({ displayName: fullName });
      await db.collection('users').doc(result.user.uid).set({ fullName, email, accountStatus: 'active', onboardingComplete: false, role: result.user.uid === OWNER_ADMIN_UID ? 'admin' : 'student', acceptedTermsAt: window.firebase.firestore.FieldValue.serverTimestamp(), createdAt: window.firebase.firestore.FieldValue.serverTimestamp() });
      await db.collection('academicProfiles').doc(result.user.uid).set({ universityId: UNIVERSITY.id, userId: result.user.uid, createdAt: window.firebase.firestore.FieldValue.serverTimestamp() });
      return userAccount(result.user, db);
    },
    async sendPasswordReset({ email }) { await auth.sendPasswordResetEmail(email); return { accepted: true }; },
    async logout() { await auth.signOut(); return { ok: true }; },
    async getCurrentUser() { return userAccount(auth.currentUser, db); },
    async subscribeToAuthState(callback) { return new Promise(resolve => resolve(auth.onAuthStateChanged(async user => callback(await userAccount(user, db))))); },
    async getIdToken() { if (!auth.currentUser) return null; return auth.currentUser.getIdToken(); },
    async sendEmailVerification() { if (!auth.currentUser) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' }); await auth.currentUser.sendEmailVerification(); },
    async updatePassword({ currentPassword, newPassword }) {
      if (!auth.currentUser?.email) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
      const credential = window.firebase.auth.EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await auth.currentUser.reauthenticateWithCredential(credential);
      await auth.currentUser.updatePassword(newPassword);
    },
    async updateAccount({ fullName, email, phone }) {
      if (!auth.currentUser) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
      if (email && email !== auth.currentUser.email) await auth.currentUser.updateEmail(email);
      await auth.currentUser.updateProfile({ displayName: fullName || auth.currentUser.displayName });
      await db.collection('users').doc(auth.currentUser.uid).set({ fullName, email: email || auth.currentUser.email, phone: phone || '', updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return userAccount(auth.currentUser, db);
    },
    async changePhoto({ file }) {
      if (!auth.currentUser) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
      const ref = storage.ref(`users/${auth.currentUser.uid}/profile/avatar`);
      await ref.put(file, { contentType: file.type });
      const photoUrl = await ref.getDownloadURL();
      await auth.currentUser.updateProfile({ photoURL: photoUrl });
      await db.collection('users').doc(auth.currentUser.uid).set({ photoUrl, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return userAccount(auth.currentUser, db);
    },
    async deleteAccount() {
      if (!auth.currentUser) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
      await auth.currentUser.delete();
      return { ok: true };
    },
  };
  configureServices({ auth: authMethods });
}
