/**
 * ============================================================================
 * ⚙️ CONFIG.JS
 * ----------------------------------------------------------------------------
 * Description : Handles Firebase Initialization and Global App Variables.
 * ============================================================================
 */

/* -------------------------------------------------------------------------- */
/* 1. FIREBASE CONFIGURATION & INITIALIZATION                                 */
/* -------------------------------------------------------------------------- */
const firebaseConfig = {
    apiKey: "AIzaSyA0yEDkq6Wr2Sy4zIXQqZ6aHCAXK1ymSEw",
    authDomain: "sk-study-point.firebaseapp.com",
    projectId: "sk-study-point",
    storageBucket: "sk-study-point.firebasestorage.app",
    messagingSenderId: "763488713829",
    appId: "1:763488713829:web:2e6cfb3649de47b71e9a8c"
};

// Initialize Firebase App and Firestore Database
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 👇 OFFLINE DATABASE LOGIC 👇
db.enablePersistence()
  .catch((err) => {
      if (err.code == 'failed-precondition') {
          console.log("Multiple tabs open, offline mode works only in one.");
      } else if (err.code == 'unimplemented') {
          console.log("Browser doesn't support offline data.");
      }
  });

/* -------------------------------------------------------------------------- */
/* 2. GLOBAL STATE VARIABLES                                                  */
/* -------------------------------------------------------------------------- */
let currentActiveUserEmail = null; 
let currentUserData = null; // Stores currently authenticated user's document
let cart = JSON.parse(localStorage.getItem('savedCart')) || []; // Local cart state

// UI & Filter States
let currentSelectedCategory = 'all'; 
let currentCategoryName = 'All';
let currentLang = 'en'; // Default application language
let currentViewMode = 'all'; // Toggles between 'all' and 'purchased' views

// Feature States
let tempOtp = null; // Temporarily stores OTP for email verification
let currentQodIndex = 0; // Tracks current Question of the Day index
let isAiProcessing = false; // Prevents multiple rapid requests to AI solver