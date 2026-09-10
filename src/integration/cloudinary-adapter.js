import { configureServices } from '../services/adapter.js';
import { getFirebase } from './firebase-client.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function config() {
  return {
    cloudName: String(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '').trim(),
    uploadPreset: String(import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '').trim(),
  };
}

function invalid(message, code = 'validation/invalid-image') {
  return Object.assign(new Error(message), { code });
}

async function uploadImage(file, uid) {
  const { cloudName, uploadPreset } = config();
  if (!cloudName || !uploadPreset) throw invalid('Cloudinary image upload is not configured.', 'cloudinary/not-configured');
  if (!file || typeof file !== 'object') throw invalid('Please choose an image.');
  if (!String(file.type || '').startsWith('image/')) throw invalid('Please choose an image file.');
  if (Number(file.size || 0) > MAX_IMAGE_BYTES) throw invalid('Image must be 5 MB or smaller.');

  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', uploadPreset);
  body.append('folder', `cgpa-uniport/users/${uid}/profile`);
  body.append('public_id', 'avatar');
  body.append('overwrite', 'true');

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, { method: 'POST', body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.secure_url) {
    const error = data?.error?.message || 'Cloudinary could not upload the image.';
    throw invalid(error, 'cloudinary/upload-failed');
  }
  return `${data.secure_url}?v=${Date.now()}`;
}

export async function registerCloudinaryAdapter() {
  const sdk = await getFirebase();
  if (!sdk) return;
  configureServices({
    auth: {
      async changePhoto({ file }) {
        const user = sdk.auth.currentUser;
        if (!user) throw invalid('Authentication required.', 'unauthorized');
        const photoUrl = await uploadImage(file, user.uid);
        await user.updateProfile({ photoURL: photoUrl });
        await sdk.db.collection('users').doc(user.uid).set({ photoUrl, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return {
          id: user.uid,
          fullName: user.displayName || '',
          email: user.email || '',
          phone: user.phoneNumber || '',
          photoUrl,
          accountStatus: 'active',
          emailVerified: !!user.emailVerified,
        };
      },
    },
  });
}
