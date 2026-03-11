// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAB8yCfmdvOTWRpj50Hhc7AWuabWLDvy6k",
  authDomain: "nacon-post-utme-past-question.firebaseapp.com",
  databaseURL: "https://nacon-post-utme-past-question-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "nacon-post-utme-past-question",
  storageBucket: "nacon-post-utme-past-question.firebasestorage.app",
  messagingSenderId: "1090299637128",
  appId: "1:1090299637128:web:76ef0ac50350266b9fde3d",
  measurementId: "G-V2ESNKV7X8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
