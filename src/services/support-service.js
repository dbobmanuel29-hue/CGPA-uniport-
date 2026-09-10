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

export const supportService = Object.freeze({
  ...supportReadWriteService,
  async deleteTicket(ticketId) {
    const sdk = await getFirebase();
    if (!sdk) throw Object.assign(new Error('Firebase is not configured.'), { code: 'BACKEND_NOT_CONNECTED' });
    const { auth, db } = sdk;
    const user = auth.currentUser;
    if (!user) throw Object.assign(new Error('Authentication required.'), { code: 'unauthorized' });

    const account = await db.collection('users').doc(user.uid).get();
    const role = account.exists ? account.data()?.role : null;
    const isAdmin = user.uid === OWNER_ADMIN_UID || role === 'admin';
    if (!isAdmin) throw Object.assign(new Error('Administrator permission is required to delete support requests.'), { code: 'permission-denied' });
    if (!ticketId) throw Object.assign(new Error('A support request ID is required.'), { code: 'validation/support-ticket-id' });

    await db.collection('supportTickets').doc(ticketId).delete();
    return { ok: true, id: ticketId };
  }
});
