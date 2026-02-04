// Firebase client initialization (safe for Next.js)
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_WEB_API_KEY,
  authDomain: "weederz-1d78a.firebaseapp.com",
  projectId: "weederz-1d78a",
  storageBucket: "weederz-1d78a.firebasestorage.app",
  messagingSenderId: "142150836364",
  appId: "1:142150836364:web:464f4d0f212a440e229ba9",
  measurementId: "G-Q43283MQVN"
};

// Initialize Firebase
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

// Analytics is browser-only
if (typeof window !== "undefined") {
  isSupported()
    .then((ok) => {
      if (ok) getAnalytics(firebaseApp);
    })
    .catch(() => undefined);
}