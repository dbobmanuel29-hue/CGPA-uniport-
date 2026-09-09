import { configureServices } from '../services/adapter.js';
import { academicService } from '../services/academic-service.js';
import { getFirebase } from './firebase-client.js';
export async function registerOnboardingBackendFix(){
 const original=academicService.updateProfile;
 configureServices({academic:{updateProfile:async payload=>{const result=await original(payload);if(payload?.markOnboardingComplete===false){const sdk=await getFirebase();if(sdk?.auth.currentUser)await sdk.db.collection('users').doc(sdk.auth.currentUser.uid).set({onboardingComplete:false},{merge:true});}return result;}}});
}
