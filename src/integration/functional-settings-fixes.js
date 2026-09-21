import { configureServices } from '../services/adapter.js';
import { getFirebase } from './firebase-client.js';
import { academicService } from '../services/academic-service.js';
import { notificationService } from '../services/notification-service.js';
import { supportService } from '../services/support-service.js';
import { authService } from '../services/auth-service.js';
import { reportService } from '../services/report-service.js';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';
const ts = () => window.firebase.firestore.FieldValue.serverTimestamp();
const dateValue = value => value?.toDate ? value.toDate().toISOString() : (value || null);

async function sdk() {
  const value = await getFirebase();
  if (!value?.auth?.currentUser) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
  return value;
}
async function adminSdk() {
  const value = await sdk();
  const user = value.auth.currentUser;
  if (user.uid !== OWNER_ADMIN_UID) {
    const token = await user.getIdTokenResult(true);
    if (token.claims.admin !== true && token.claims.role !== 'admin') {
      const account = await value.db.collection('users').doc(user.uid).get();
      if (!account.exists || account.data()?.role !== 'admin') throw Object.assign(new Error('Administrator access required.'), { code: 'permission-denied' });
    }
  }
  const securitySnap = await value.db.collection('adminSettings').doc('security').get().catch(() => null);
  const security = securitySnap?.data()?.settings || {};
  if (security.requireAdminMfa === true && (!Array.isArray(user.multiFactor?.enrolledFactors) || user.multiFactor.enrolledFactors.length === 0)) {
    throw Object.assign(new Error('Administrator MFA is required for this workspace.'), { code: 'security/mfa-required' });
  }
  return value;
}
async function settings(section, fallback = {}) {
  const value = await adminSdk();
  const snap = await value.db.collection('adminSettings').doc(section).get();
  return snap.exists ? (snap.data()?.settings || snap.data() || {}) : fallback;
}
async function publicSettings(section, fallback = {}) {
  const value = await getFirebase();
  if (!value) return fallback;
  const snap = await value.db.collection('adminSettings').doc(section).get().catch(() => null);
  return snap?.exists ? (snap.data()?.settings || snap.data() || {}) : fallback;
}
function notificationTypeEnabled(preferences, type) {
  const key = type === 'academic' ? 'academicNotifications'
    : type === 'result' ? 'resultNotifications'
    : type === 'support' ? 'supportNotifications'
    : type === 'announcement' ? 'announcements'
    : 'systemNotifications';
  return preferences[key] !== false;
}
async function createNotification(db, userId, data, preferences = null) {
  if (preferences && !notificationTypeEnabled(preferences, data.type || 'system')) return null;
  const ref = db.collection('notifications').doc();
  await ref.set({ userId, title: data.title, message: data.message, body: data.message, type: data.type || 'system', priority: data.priority || 'normal', read: false, createdAt: ts(), ...(data.campaignId ? { campaignId: data.campaignId } : {}) });
  return ref.id;
}
async function ensureAutomaticReminders() {
  const value = await sdk();
  const uid = value.auth.currentUser.uid;
  const profileSnap = await value.db.collection('academicProfiles').doc(uid).get();
  if (!profileSnap.exists) return;
  const profile = profileSnap.data() || {};
  const prefsSnap = await value.db.collection('userPreferences').doc(uid).get();
  const prefs = prefsSnap.exists ? prefsSnap.data() : {};
  const currentKey = [profile.currentSessionId, profile.currentSemesterId, profile.currentLevelId].filter(Boolean).join('-') || 'profile';
  if (!profile.facultyId || !profile.departmentId || !profile.programmeId || !profile.currentLevelId || !profile.currentSessionId || !profile.currentSemesterId) {
    const id = `auto-academic-${uid}-${currentKey}`;
    const existing = await value.db.collection('notifications').doc(id).get();
    if (!existing.exists && notificationTypeEnabled(prefs, 'academic')) {
      await value.db.collection('notifications').doc(id).set({ userId: uid, title: 'Complete your academic profile', message: 'Your academic profile is missing information. Complete it so CGPA+ can personalize your academic workspace.', type: 'academic', priority: 'normal', read: false, createdAt: ts(), automatic: true });
    }
    return;
  }
  const resultSnap = await value.db.collection('results').where('userId', '==', uid).get();
  const hasCurrentResults = resultSnap.docs.some(doc => {
    const row = doc.data() || {};
    return row.sessionId === profile.currentSessionId && row.semesterId === profile.currentSemesterId && (!profile.currentLevelId || row.levelId === profile.currentLevelId);
  });
  if (!hasCurrentResults && notificationTypeEnabled(prefs, 'result')) {
    const id = `auto-result-${uid}-${currentKey}`;
    const existing = await value.db.collection('notifications').doc(id).get();
    if (!existing.exists) {
      await value.db.collection('notifications').doc(id).set({ userId: uid, title: 'Result reminder', message: 'No result has been recorded for your current session and semester yet. Add your results when they are available.', type: 'result', priority: 'normal', read: false, createdAt: ts(), automatic: true });
    }
  }
}
async function notificationMethods() {
  return {
    async getNotifications(filters = {}) {
      const value = await sdk();
      await ensureAutomaticReminders().catch(() => {});
      let query = value.db.collection('notifications').where('userId', '==', value.auth.currentUser.uid);
      const snap = await query.get();
      let rows = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: dateValue(doc.data().createdAt) }));
      if (filters.read !== undefined) rows = rows.filter(row => !!row.read === filters.read);
      if (filters.type) rows = rows.filter(row => row.type === filters.type);
      return rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    },
    async markAsRead(notificationId) {
      const value = await sdk();
      const ref = value.db.collection('notifications').doc(notificationId);
      const snap = await ref.get();
      if (!snap.exists || snap.data()?.userId !== value.auth.currentUser.uid) throw Object.assign(new Error('Notification not found.'), { code: 'not-found' });
      await ref.update({ read: true, readAt: ts() });
      return { ok: true };
    },
    async markAllAsRead() {
      const value = await sdk();
      const snap = await value.db.collection('notifications').where('userId', '==', value.auth.currentUser.uid).get();
      for (let offset = 0; offset < snap.docs.length; offset += 450) {
        const batch = value.db.batch();
        snap.docs.slice(offset, offset + 450).filter(doc => !doc.data()?.read).forEach(doc => batch.update(doc.ref, { read: true, readAt: ts() }));
        await batch.commit();
      }
      return { ok: true };
    },
    async deleteNotification(notificationId) {
      const value = await sdk();
      const ref = value.db.collection('notifications').doc(notificationId);
      const snap = await ref.get();
      if (!snap.exists || snap.data()?.userId !== value.auth.currentUser.uid) throw Object.assign(new Error('Notification not found.'), { code: 'not-found' });
      await ref.delete();
      return { ok: true };
    },
    async subscribeToNotifications(callback) {
      const value = await sdk();
      const query = value.db.collection('notifications').where('userId', '==', value.auth.currentUser.uid);
      return query.onSnapshot(snapshot => callback(snapshot), error => console.warn('Notification listener stopped.', error));
    },
  };
}
async function supportMethods() {
  return {
    async createTicket(payload = {}) {
      const value = await sdk();
      const supportConfig = await publicSettings('support', { requestsEnabled: true });
      if (supportConfig.requestsEnabled === false) throw Object.assign(new Error('Support requests are currently disabled.'), { code: 'support/disabled' });
      const subject = String(payload.subject || '').trim();
      const description = String(payload.description || payload.message || '').trim();
      if (!subject || description.length < 10) throw Object.assign(new Error('Enter a subject and a message of at least 10 characters.'), { code: 'validation/support-request' });
      const uid = value.auth.currentUser.uid;
      const userSnap = await value.db.collection('users').doc(uid).get();
      const user = userSnap.exists ? userSnap.data() : {};
      const ref = value.db.collection('supportTickets').doc();
      await ref.set({ userId: uid, studentName: user.fullName || value.auth.currentUser.displayName || payload.fullName || '', email: value.auth.currentUser.email || payload.email || '', subject, category: payload.category || 'general', priority: payload.priority || 'normal', status: 'open', description, messages: [], internalNotes: [], createdAt: ts(), updatedAt: ts() });
      await fetch('/api/support/email', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await value.auth.currentUser.getIdToken()}` }, body: JSON.stringify({ event: 'new_support_request', ticketId: ref.id, subject, message: description }) }).catch(() => {});
      return { id: ref.id, status: 'open' };
    },
    async getTickets(request = {}) {
      const value = await sdk();
      const user = value.auth.currentUser;
      const isAdmin = user.uid === OWNER_ADMIN_UID || user.role === 'admin' || (await user.getIdTokenResult(true)).claims.role === 'admin';
      let snap;
      if (request.scope === 'admin' || isAdmin && request.scope !== 'student') snap = await value.db.collection('supportTickets').get();
      else snap = await value.db.collection('supportTickets').where('userId', '==', user.uid).get();
      let rows = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: dateValue(doc.data().createdAt), updatedAt: dateValue(doc.data().updatedAt) }));
      if (request.status) rows = rows.filter(row => row.status === request.status);
      if (request.priority) rows = rows.filter(row => row.priority === request.priority);
      return rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    },
    async getTicket(request = {}) {
      const value = await sdk();
      const ref = value.db.collection('supportTickets').doc(request.ticketId);
      const snap = await ref.get();
      if (!snap.exists) throw Object.assign(new Error('Support request not found.'), { code: 'not-found/support' });
      const ticket = { id: snap.id, ...snap.data(), createdAt: dateValue(snap.data().createdAt), updatedAt: dateValue(snap.data().updatedAt) };
      const user = value.auth.currentUser;
      const isAdmin = user.uid === OWNER_ADMIN_UID || user.role === 'admin' || (await user.getIdTokenResult(true)).claims.role === 'admin';
      if (!isAdmin && ticket.userId !== user.uid) throw Object.assign(new Error('You do not have permission to view this request.'), { code: 'permission-denied' });
      return ticket;
    },
    async replyToTicket(request = {}) {
      const value = await sdk();
      const ref = value.db.collection('supportTickets').doc(request.ticketId);
      const snap = await ref.get();
      if (!snap.exists) throw Object.assign(new Error('Support request not found.'), { code: 'not-found/support' });
      const ticket = snap.data();
      const user = value.auth.currentUser;
      const isAdmin = user.uid === OWNER_ADMIN_UID || user.role === 'admin' || (await user.getIdTokenResult(true)).claims.role === 'admin';
      if (!isAdmin && ticket.userId !== user.uid) throw Object.assign(new Error('You do not have permission to reply to this request.'), { code: 'permission-denied' });
      const message = String(request.message || '').trim();
      if (!message) throw Object.assign(new Error('Write a reply before sending.'), { code: 'validation/support-reply' });
      const authorRole = isAdmin ? 'admin' : 'student';
      const authorName = isAdmin ? (user.displayName || user.email || 'Administrator') : (user.displayName || user.email || ticket.studentName || 'Student');
      const messages = Array.isArray(ticket.messages) ? ticket.messages.slice() : [];
      messages.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, authorId: user.uid, authorRole, authorName, message, createdAt: new Date().toISOString() });
      const updateData = { messages, updatedAt: ts() };
      if (isAdmin) updateData.status = 'in_progress';
      await ref.update(updateData);
      if (isAdmin) {
        const prefsSnap = await value.db.collection('userPreferences').doc(ticket.userId).get();
        await createNotification(value.db, ticket.userId, { title: 'Support replied', message: `An administrator replied to your support request: ${ticket.subject}`, type: 'support', priority: 'high' }, prefsSnap.exists ? prefsSnap.data() : {});
        await fetch('/api/support/email', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await value.auth.currentUser.getIdToken()}` }, body: JSON.stringify({ event: 'support_reply', ticketId: ticket.id, subject: ticket.subject, message }) }).catch(() => {});
      } else {
        await createNotification(value.db, OWNER_ADMIN_UID, { title: 'Student replied', message: `${authorName} replied to support request: ${ticket.subject}`, type: 'support', priority: 'high' });
      }
      return { id: request.ticketId, status: isAdmin ? 'in_progress' : ticket.status };
    },
    async updateTicketStatus(request = {}) {
      const value = await adminSdk();
      const allowed = ['open', 'pending', 'in_progress', 'resolved', 'closed'];
      if (!allowed.includes(request.status)) throw Object.assign(new Error('Invalid support ticket status.'), { code: 'validation/support-status' });
      await value.db.collection('supportTickets').doc(request.ticketId).update({ status: request.status, updatedAt: ts() });
      const snap = await value.db.collection('supportTickets').doc(request.ticketId).get();
      const ticket = snap.data() || {};
      if (ticket.userId) {
        const prefsSnap = await value.db.collection('userPreferences').doc(ticket.userId).get();
        await createNotification(value.db, ticket.userId, { title: `Support request ${request.status.replace('_', ' ')}`, message: `Your support request “${ticket.subject || request.ticketId}” is now ${request.status.replace('_', ' ')}.`, type: 'support', priority: 'normal' }, prefsSnap.exists ? prefsSnap.data() : {});
      }
      return { ok: true };
    },
    async assignTicket(request = {}) {
      const value = await adminSdk();
      await value.db.collection('supportTickets').doc(request.ticketId).update({ assigneeId: request.assigneeId, updatedAt: ts() });
      return { ok: true };
    },
    async addInternalNote(request = {}) {
      const value = await adminSdk();
      const ref = value.db.collection('supportTickets').doc(request.ticketId);
      const snap = await ref.get();
      if (!snap.exists) throw Object.assign(new Error('Support request not found.'), { code: 'not-found/support' });
      const ticket = snap.data();
      const notes = Array.isArray(ticket.internalNotes) ? ticket.internalNotes.slice() : [];
      notes.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, authorId: value.auth.currentUser.uid, authorName: value.auth.currentUser.displayName || value.auth.currentUser.email || 'Administrator', message: String(request.message || '').trim(), createdAt: new Date().toISOString() });
      await ref.update({ internalNotes: notes, updatedAt: ts() });
      return { ok: true };
    },
    async deleteTicket(ticketId) {
      const value = await adminSdk();
      await value.db.collection('supportTickets').doc(ticketId).delete();
      return { ok: true, id: ticketId };
    },
  };
}
async function preferenceMethods() {
  return {
    async getPreferences() { const value = await sdk(); const snap = await value.db.collection('userPreferences').doc(value.auth.currentUser.uid).get(); const data = snap.exists ? snap.data() : {}; return { academicNotifications: true, resultNotifications: true, systemNotifications: true, supportNotifications: true, announcements: true, emailNotifications: true, shareAnalytics: false, profileDiscoverable: false, ...data }; },
    async updatePreferences(preferences) { const value = await sdk(); const next = { academicNotifications: true, resultNotifications: true, systemNotifications: true, supportNotifications: true, announcements: true, emailNotifications: true, shareAnalytics: false, profileDiscoverable: false, ...preferences, updatedAt: ts() }; await value.db.collection('userPreferences').doc(value.auth.currentUser.uid).set(next, { merge: true }); return next; },
    async requestDataExport() {
      const value = await sdk();
      const uid = value.auth.currentUser.uid;
      const [userSnap, profileSnap, prefsSnap, resultsSnap, notificationsSnap, ticketsSnap] = await Promise.all([
        value.db.collection('users').doc(uid).get(),
        value.db.collection('academicProfiles').doc(uid).get(),
        value.db.collection('userPreferences').doc(uid).get(),
        value.db.collection('results').where('userId', '==', uid).get(),
        value.db.collection('notifications').where('userId', '==', uid).get(),
        value.db.collection('supportTickets').where('userId', '==', uid).get(),
      ]);
      const cleanRows = snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).map(row => JSON.parse(JSON.stringify(row, (key, val) => val?.toDate ? val.toDate().toISOString() : val)));
      const exportData = {
        exportedAt: new Date().toISOString(),
        account: userSnap.exists ? { id: uid, ...userSnap.data() } : { id: uid, email: value.auth.currentUser.email || '' },
        academicProfile: profileSnap.exists ? profileSnap.data() : null,
        preferences: prefsSnap.exists ? prefsSnap.data() : {},
        results: cleanRows(resultsSnap),
        notifications: cleanRows(notificationsSnap),
        supportTickets: cleanRows(ticketsSnap),
      };
      const ref = await value.db.collection('dataExportRequests').add({ userId: uid, status: 'completed', createdAt: ts(), completedAt: ts() });
      return { id: ref.id, status: 'completed', exportData };
    },
  };
}
async function adminSettingsMethods() {
  return {
    async getSettings({ section } = {}) {
      const value = await adminSdk();
      if (!section) return {};
      const snap = await value.db.collection('adminSettings').doc(section).get();
      return snap.exists ? (snap.data()?.settings || snap.data() || {}) : {};
    },
    async updateSettings({ section, settings: next = {} } = {}) {
      const value = await adminSdk();
      if (!section) throw Object.assign(new Error('A settings section is required.'), { code: 'validation/settings-section' });
      const allowedSections = ['general','academic','notifications','reports','support','security'];
      if (!allowedSections.includes(section)) throw Object.assign(new Error('Invalid settings section.'), { code: 'validation/settings-section' });
      const cleanSettings = { ...next };
      if (section === 'academic') {
        cleanSettings.allowStudentResultEntry = cleanSettings.allowStudentResultEntry !== false;
        cleanSettings.requireServerValidation = cleanSettings.requireServerValidation !== false;
      }
      if (section === 'notifications') cleanSettings.emailEnabled = cleanSettings.emailEnabled === true;
      if (section === 'reports') cleanSettings.studentReportsEnabled = cleanSettings.studentReportsEnabled !== false;
      if (section === 'support') cleanSettings.requestsEnabled = cleanSettings.requestsEnabled !== false;
      if (section === 'security') cleanSettings.requireVerifiedEmail = cleanSettings.requireVerifiedEmail === true;
      await value.db.collection('adminSettings').doc(section).set({ section, settings: cleanSettings, updatedBy: value.auth.currentUser.uid, updatedAt: ts() }, { merge: true });
      return cleanSettings;
    },
  };
}
async function academicMethods() {
  const originalSaveResult = academicService.saveResult;
  const originalUpdateResult = academicService.updateResult;
  return {
    async saveResult(payload) {
      const value = await sdk();
      const user = value.auth.currentUser;
      const isAdmin = user.uid === OWNER_ADMIN_UID || (await user.getIdTokenResult(true)).claims.admin === true || (await user.getIdTokenResult(true)).claims.role === 'admin';
      const config = await publicSettings('academic', { allowStudentResultEntry: true, requireServerValidation: true });
      if (isAdmin) return originalSaveResult(payload);
      if (config.allowStudentResultEntry === false) throw Object.assign(new Error('Student result entry is currently disabled by the administrator.'), { code: 'academic/result-entry-disabled' });
      if (config.requireServerValidation !== false) {
        const credits = Number(payload.credits), points = Number(payload.points);
        if (!Number.isFinite(credits) || credits <= 0 || !Number.isFinite(points) || points < 0 || points > 5 || Number(payload.qualityPoints ?? credits * points) !== credits * points) throw Object.assign(new Error('This result failed the configured server-validation rules.'), { code: 'academic/server-validation' });
      }
      return originalSaveResult(payload);
    },
    async updateResult(resultId, payload) {
      const value = await sdk();
      const user = value.auth.currentUser;
      const isAdmin = user.uid === OWNER_ADMIN_UID || (await user.getIdTokenResult(true)).claims.admin === true || (await user.getIdTokenResult(true)).claims.role === 'admin';
      const config = await publicSettings('academic', { allowStudentResultEntry: true, requireServerValidation: true });
      if (isAdmin) return originalUpdateResult(resultId, payload);
      if (config.allowStudentResultEntry === false) throw Object.assign(new Error('Student result entry is currently disabled by the administrator.'), { code: 'academic/result-entry-disabled' });
      return originalUpdateResult(resultId, payload);
    },
  };
}
async function adminNotificationMethods() {
  return {
    async sendNotification(payload = {}) {
      const value = await adminSdk();
      const title = String(payload.title || '').trim();
      const message = String(payload.message || '').trim();
      if (!title || message.length < 5) throw Object.assign(new Error('Enter a title and a message of at least 5 characters.'), { code: 'validation/notification' });
      const audience = payload.audience || 'all_students';
      const usersSnap = await value.db.collection('users').get();
      let recipients = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(row => row.id !== OWNER_ADMIN_UID && row.role !== 'admin' && row.accountStatus !== 'deleted');
      if (audience === 'faculty') {
        if (!payload.facultyId) throw Object.assign(new Error('Select a faculty before sending.'), { code: 'validation/faculty-required' });
        const profiles = await value.db.collection('academicProfiles').get();
        const facultyByUser = new Map(profiles.docs.map(doc => [doc.id, doc.data()?.facultyId]));
        recipients = recipients.filter(row => facultyByUser.get(row.id) === payload.facultyId);
      }
      const campaignRef = value.db.collection('notificationCampaigns').doc();
      await campaignRef.set({ title, message, type: payload.type || 'announcement', audience, facultyId: payload.facultyId || '', priority: payload.priority || 'normal', status: 'sent', recipientCount: recipients.length, createdBy: value.auth.currentUser.uid, createdAt: ts(), sentAt: ts() });
      const preferenceDocs = await Promise.all(recipients.map(row => value.db.collection('userPreferences').doc(row.id).get()));
      for (let offset = 0; offset < recipients.length; offset += 450) {
        const batch = value.db.batch();
        recipients.slice(offset, offset + 450).forEach((row, index) => {
          const prefSnap = preferenceDocs[offset + index];
          const prefs = prefSnap.exists ? prefSnap.data() : {};
          if (!notificationTypeEnabled(prefs, payload.type || 'announcement')) {
            return;
          }
          const ref = value.db.collection('notifications').doc();
          batch.set(ref, { userId: row.id, title, message, body: message, type: payload.type || 'announcement', priority: payload.priority || 'normal', read: false, campaignId: campaignRef.id, createdAt: ts() });
        });
        await batch.commit();
      }
      return { id: campaignRef.id, status: 'sent', recipientCount: recipients.length };
    },
  };
}

async function reportMethods() {
  const original = {
    getReports: reportService.getReports,
    getReportPreview: reportService.getReportPreview,
    generateReport: reportService.generateReport,
    downloadReport: reportService.downloadReport,
    printReport: reportService.printReport,
  };
  async function check(request = {}) {
    if (request.scope === 'admin') return;
    const config = await publicSettings('reports', { studentReportsEnabled: true });
    if (config.studentReportsEnabled === false) throw Object.assign(new Error('Student report requests are currently disabled by the administrator.'), { code: 'reports/disabled' });
  }
  return {
    async getReports(request = {}) { await check(request); return original.getReports(request); },
    async getReportPreview(request = {}) { await check(request); return original.getReportPreview(request); },
    async generateReport(request = {}) { await check(request); return original.generateReport(request); },
    async downloadReport(request = {}) { await check(request); return original.downloadReport(request); },
    async printReport(request = {}) { await check(request); return original.printReport(request); },
  };
}

let securityCleanup = null;
function registerSecurityRuntime() {
  if (securityCleanup) return;
  getFirebase().then(sdk => {
    if (!sdk?.auth) return;
    let timer = null;
    let activityHandler = null;
    const clear = () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
      if (activityHandler) {
        ['pointerdown','keydown','touchstart','scroll'].forEach(event => window.removeEventListener(event, activityHandler));
        activityHandler = null;
      }
    };
    const startForUser = async user => {
      clear();
      if (!user) return;
      const isAdmin = user.uid === OWNER_ADMIN_UID || (await user.getIdTokenResult(true)).claims.admin === true || (await user.getIdTokenResult(true)).claims.role === 'admin';
      if (!isAdmin) return;
      const snap = await sdk.db.collection('adminSettings').doc('security').get().catch(() => null);
      const minutes = Number(snap?.data()?.settings?.sessionTimeoutMinutes || 0);
      if (!Number.isFinite(minutes) || minutes <= 0) return;
      activityHandler = () => {
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(async () => {
          await sdk.auth.signOut().catch(() => {});
          window.location.hash = '#/login';
        }, minutes * 60 * 1000);
      };
      ['pointerdown','keydown','touchstart','scroll'].forEach(event => window.addEventListener(event, activityHandler, { passive: true }));
      activityHandler();
    };
    const unsubscribe = sdk.auth.onAuthStateChanged(user => { startForUser(user).catch(() => clear()); });
    securityCleanup = () => { clear(); unsubscribe?.(); securityCleanup = null; };
  }).catch(() => {});
}

async function registerFunctionalSettingsFixes() {
  const admin = { ...(await adminSettingsMethods()), ...(await adminNotificationMethods()) };
  const notification = await notificationMethods();
  const support = await supportMethods();
  const preferences = await preferenceMethods();
  const academic = await academicMethods();
  const report = await reportMethods();
  configureServices({ admin, notification, support, auth: preferences, academic, report });
  registerSecurityRuntime();
}
export { registerFunctionalSettingsFixes };
