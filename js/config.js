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

/* -------------------------------------------------------------------------- */
/* 2. GLOBAL STATE VARIABLES                                                  */
/* -------------------------------------------------------------------------- */
let currentActiveUserEmail = null; 
let currentUserData = null; 
let cart = JSON.parse(localStorage.getItem('savedCart')) || []; 
let currentSelectedCategory = 'all'; 
let currentCategoryName = 'All';
let currentLang = 'en'; 
let currentViewMode = 'all'; 
let tempOtp = null; 
let currentQodIndex = 0;