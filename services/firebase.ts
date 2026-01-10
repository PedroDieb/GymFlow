import { initializeApp, FirebaseOptions, FirebaseApp, getApp, getApps } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

// Handle potential parsing errors or undefined globals safely
const getFirebaseConfig = (): FirebaseOptions | null => {
  try {
    // Check if defined globally (injected by platform)
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      const parsed = JSON.parse(__firebase_config);
      // Basic validation to ensure it's not an empty object or has empty values
      if (
        parsed && 
        typeof parsed === 'object' && 
        parsed.apiKey && 
        parsed.apiKey.length > 5 && // valid keys are usually long
        !parsed.apiKey.includes("YOUR_API_KEY") // reject placeholders
      ) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Firebase config parsing failed.");
  }
  return null;
};

const firebaseConfig = getFirebaseConfig();

export const appId = typeof __app_id !== 'undefined' ? __app_id : 'gymflow-app';

// Initialize Firebase
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (firebaseConfig) {
  try {
    // Check if already initialized to avoid duplicate app errors
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    
    // Initialize services if app exists
    if (app) {
      auth = getAuth(app);
      db = getFirestore(app);
    }
  } catch (e) {
    console.error("Firebase initialization failed:", e);
    // Ensure we don't export broken references
    app = null;
    auth = null;
    db = null;
  }
} else {
  console.log("No valid Firebase config found. App will run in Offline Mode.");
}

// Export services (can be null)
export { auth, db };

// Helper to check if we have a valid instance
export const isFirebaseInitialized = (): boolean => {
  return !!app && !!auth && !!db;
};