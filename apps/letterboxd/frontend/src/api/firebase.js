import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyALd2LsLMklIs4nzhlqI_ySvfSuiSDxNa0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "vicozworld.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "vicozworld",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "vicozworld.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "9140146073",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:9140146073:web:ef2d55d8028bf9ff444d08",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
