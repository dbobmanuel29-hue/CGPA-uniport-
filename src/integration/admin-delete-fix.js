import { configureServices } from '../services/adapter.js';
import { getFirebase } from './firebase-client.js';

export async function registerAdminDeleteFix() {
  const sdk = await getFirebase();
  if (!sdk?.functions) return;
  configureServices({
    admin: {
      async deleteStudent(studentId) {
        const uid = String(studentId || '').trim();
        if (!uid) throw Object.assign(new Error('Student id is required.'), { code: 'validation/invalid-student' });
        const callable = sdk.functions.httpsCallable('deleteStudentAccount');
        const result = await callable({ uid });
        return result.data || { ok: true, uid };
      },
    },
  });
}
