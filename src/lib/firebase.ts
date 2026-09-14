import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCIHyf-TAbzpW-8WGYoObIbfERO2yOrb5U",
  authDomain: "sahayak4cu.firebaseapp.com",
  projectId: "sahayak4cu",
  storageBucket: "sahayak4cu.firebasestorage.app",
  messagingSenderId: "56308915694",
  appId: "1:56308915694:web:7836f9fad9db56305002ff",
  measurementId: "G-TSXV1MG0GS"
};

// Initialize Firebase
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Analytics (safely initialized in browser environments)
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics unavailable in current context
  });
}

// Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Firestore
export const db = getFirestore(app);

export default app;

