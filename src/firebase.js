// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA1Z3BsRmbRr-hUkoAC0Xcd8YKYSKddq1I",
  authDomain: "wellmind-projects.firebaseapp.com",
  projectId: "wellmind-projects",
  storageBucket: "wellmind-projects.firebasestorage.app",
  messagingSenderId: "864492890117",
  appId: "1:864492890117:web:650ff5f5f8271dbaea546c",
  measurementId: "G-0JLE6XXS2R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app); 
export const auth = getAuth(app);