import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyALd2LsLMklIs4nzhlqI_ySvfSuiSDxNa0",
  authDomain: "vicozworld.firebaseapp.com",
  projectId: "vicozworld",
  storageBucket: "vicozworld.firebasestorage.app",
  messagingSenderId: "9140146073",
  appId: "1:9140146073:web:ef2d55d8028bf9ff444d08",
  measurementId: "G-0XB3WNXEVG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
