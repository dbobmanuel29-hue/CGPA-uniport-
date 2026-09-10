import { createService } from './adapter.js';
import { getFirebase } from '../integration/firebase-client.js';

const OWNER_ADMIN_UID = 'lmUB6IdhuaOlHjzkqBEyoNkE7PH2';

const supportReadWriteService = createService('support', [
  'createPublicRequest',
  'getTickets',
  'getTicket',
  'createTicket',
  'replyToTicket',
  'updateTicketStatus',
  'assignTicket',
  'addInternalNote'
]);

async function requireAdmin() {
  const sdk = await getFirebase();
  if (!sdk) throw Object.assign(new Error('Firebase is not configured.'), { code: 'BACKEND_NOT_CONNECTED' });
  const { auth, db } = sdk;
  const user = auth.currentUser;
  if (!user) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });
  if (user.uid === OWNER_ADMIN_UID) return { ...sdk, user };
  const account = await db.collection('users').doc(user.uid).get();
  const role = account.exists ? account.data()?.role : null;
  if (role === 'admin') return { ...sdk, user };
  const token = await user.getIdTokenResult(true);
  if (token.claims.admin === true || token.claims.role === 'admin') return { ...sdk, user };
  throw Object.assign(new Error('Administrator permission is required for this support operation.'), { code: 'permission-denied' });
}

export const supportService = Object.freeze({
  ...supportReadWriteService,
  async getTicket(request = {}) {
    if (request.scope === 'admin') await requireAdmin();
    return supportReadWriteService.getTicket(request);
  },
  async replyToTicket(request = {}) {
    if (request.scope === 'admin') await requireAdmin();
    return supportReadWriteService.replyToTicket(request);
  },
  async updateTicketStatus(request = {}) {
    await requireAdmin();
    const allowed = ['open', 'in_progress', 'resolved', 'closed'];
    if (!allowed.includes(request.status)) throw Object.assign(new Error('Invalid support ticket status.'), { code: 'validation/support-status' });
    return supportReadWriteService.updateTicketStatus(request);
  },
  async assignTicket(request = {}) {
    await requireAdmin();
    if (!request.ticketId) throw Object.assign(new Error('A support request ID is required.'), { code: 'validation/support-ticket-id' });
    return supportReadWriteService.assignTicket(request);
  },
  async addInternalNote(request = {}) {
    await requireAdmin();
    if (!request.ticketId) throw Object.assign(new Error('A support request ID is required.'), { code: 'validation/support-ticket-id' });
    if (!String(request.message || '').trim()) throw Object.assign(new Error('An internal note is required.'), { code: 'validation/support-note' });
    return supportReadWriteService.addInternalNote(request);
  },
  async deleteTicket(ticketId) {
    const { db } = await requireAdmin();
    if (!ticketId) throw Object.assign(new Error('A support request ID is required.'), { code: 'validation/support-ticket-id' });
    await db.collection('supportTickets').doc(ticketId).delete();
    return { ok: true, id: ticketId };
  }
});
