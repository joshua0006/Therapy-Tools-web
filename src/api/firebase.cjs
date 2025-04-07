/**
 * Firebase initialization for API server (CommonJS version)
 */

// Import Firebase modules
const { initializeApp } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBYEPbbEzgTCQZN3v6vejbIT_5OvIn5E30",
  authDomain: "adventures-in-speech-library.firebaseapp.com",
  projectId: "adventures-in-speech-library",
  storageBucket: "adventures-in-speech-library.firebasestorage.app",
  messagingSenderId: "74251825554",
  appId: "1:74251825554:web:e07eb22cda6092f68b114b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Export the Firebase app and Firestore database
module.exports = {
  app,
  db
}; 