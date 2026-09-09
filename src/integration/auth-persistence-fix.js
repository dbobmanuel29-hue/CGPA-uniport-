import { getFirebase } from './firebase-client.js';

export async function registerAuthPersistenceFix() {
  try {
    const sdk = await getFirebase();
    if (!sdk?.auth || !window?.firebase?.auth?.Auth?.Persistence) return;
    await sdk.auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);
  } catch (error) {
    console.warn('Could not establish persistent authentication.', error);
  }
}
