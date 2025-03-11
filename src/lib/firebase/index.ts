/**
 * Firebase Initialization Module
 * 
 * This is the central point for Firebase initialization.
 * All Firebase services should be initialized from the app instance exported here.
 */

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBYEPbbEzgTCQZN3v6vejbIT_5OvIn5E30",
  authDomain: "adventures-in-speech-library.firebaseapp.com",
  projectId: "adventures-in-speech-library",
  storageBucket: "adventures-in-speech-library.firebasestorage.app",
  messagingSenderId: "74251825554",
  appId: "1:74251825554:web:e07eb22cda6092f68b114b"
};

let app: any = null;

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  
  // Initialize Firestore
  const db = getFirestore(app);
  
  // Enable offline persistence for better user experience
  enableIndexedDbPersistence(db)
    .catch((error) => {
      if (error.code !== 'failed-precondition' && error.code !== 'unimplemented') {
        console.error('Firebase persistence error:', error);
      }
    });
} catch (error) {
  console.error('Firebase initialization error:', error);
}

// Export the app instance
export { app }; 