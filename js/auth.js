/**
 * ============================================================================
 * 🔐 AUTH.JS
 * ----------------------------------------------------------------------------
 * Description : Handles User Authentication (Login, Signup, Password Reset),
 *               Email OTP Verification using EmailJS, and UI toggling.
 * Author      : SK STUDY POINT SARGOTH
 * ============================================================================
 */

/* -------------------------------------------------------------------------- */
/* 1. EMAILJS CONFIGURATION (For OTP Verification)                            */
/* -------------------------------------------------------------------------- */
const EMAILJS_SERVICE_ID = "service_bp3hfkm"; 
const EMAILJS_TEMPLATE_ID = "template_kr3wxqt"; 
const EMAILJS_PUBLIC_KEY = "3LwxZB1u3vkmYtb2g";
emailjs.init(EMAILJS_PUBLIC_KEY);

/* -------------------------------------------------------------------------- */
/* 2. UTILITY FUNCTIONS                                                       */
/* -------------------------------------------------------------------------- */

/** Generates a 4-digit random OTP */
function generateOTP() { 
    return Math.floor(1000 + Math.random() * 9000); 
}

/** Validates email format using regex */
function isValidEmail(email) { 
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); 
}

/** Switches between Login, Signup, and Forgot Password UI Cards */
function switchAuthView(cardId) {
    document.querySelectorAll('.auth-card').forEach(c => c.classList.remove('active'));
    
    const targetCard = document.getElementById(cardId);
    if(targetCard) targetCard.classList.add('active');
    
    // Clear all input fields when switching cards
    document.querySelectorAll('.auth-card input').forEach(inp => inp.value = '');
    
    // Reset OTP box if switching away from Signup
    const regOtpBox = document.getElementById('regOtpBox');
    if(regOtpBox) {
        regOtpBox.style.display = 'none';
        document.getElementById('regOtpInput').disabled = true;
        document.getElementById('regSendOtpBtn').innerText = currentLang === 'hi' ? "ईमेल पर OTP भेजें" : "Send OTP to Email";
    }
    tempOtp = null; // Reset global OTP variable
}

/* -------------------------------------------------------------------------- */
/* 3. AUTHENTICATION LOGIC                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Sends a 4-digit OTP to the user's email during Registration.
 * Also checks if the Email or Phone is already registered in the Database.
 */
async function sendOtp(context) {
    if(context !== 'register') return;

    let email = document.getElementById('regEmail').value.trim().toLowerCase();
    let name = document.getElementById('regName').value.trim() || 'Student';
    let phone = document.getElementById('regPhone').value.trim();
    let btnElement = document.getElementById('regSendOtpBtn');
    
    // Basic Validation
    if(!email || !phone) { showToast("ईमेल और फोन दर्ज करें!", 'error'); return; }
    if(!isValidEmail(email)) { showToast("कृपया सही ईमेल डालें!", 'error'); return; }
    if(phone.length < 10) { showToast("सही मोबाइल नंबर डालें!", 'error'); return; }

    // Firebase Permission Error से बचने के लिए सीधा OTP भेजने का प्रोसेस
    btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btnElement.disabled = true;

    try {
        tempOtp = generateOTP(); 
        
        let templateParams = { 
            to_email: email, 
            to_name: name, 
            otp_code: tempOtp, 
            app_name: "SK STUDY POINT" 
        };
        
        // EmailJS से OTP भेजना
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
        
        showToast("OTP आपके ईमेल पर भेज दिया गया है!", 'success');
        document.getElementById('regOtpBox').style.display = 'flex';
        document.getElementById('regOtpInput').disabled = false;
        btnElement.innerText = "OTP दोबारा भेजें";

    } catch (error) {
        console.error("EmailJS Error:", error);
        showToast("OTP भेजने में समस्या आई।", "error");
        btnElement.innerText = "Send OTP to Email";
    } finally { 
        btnElement.disabled = false; 
    }
}

/**
 * Validates the entered OTP and registers the user in Firebase Auth.
 * Also creates a user profile document in Firestore.
 */
/**
 * Validates the entered OTP and registers the user in Firebase Auth.
 * Also creates a user profile document in Firestore and handles Referrals.
 */
async function processSignup() {
    let name = document.getElementById('regName').value.trim();
    let gender = document.getElementById('regGender').value;
    let dob = document.getElementById('regDob').value;
    
    let phone = document.getElementById('regPhone').value.trim();
    let email = document.getElementById('regEmail').value.trim().toLowerCase(); 
    let pass1 = document.getElementById('regPass1').value;
    let pass2 = document.getElementById('regPass2').value;
    let enteredOtp = document.getElementById('regOtpInput').value.trim();
    
    // नया: Referral Code बॉक्स की वैल्यू लेना (अगर HTML में बॉक्स लगाया है तो)
    let refInput = document.getElementById('regReferral');
    let refCode = refInput ? refInput.value.trim().toUpperCase() : "";

    // Input Validations
    if(!name || !email || !pass1) { showToast("सभी फील्ड भरें!", 'error'); return; }
    if(pass1 !== pass2) { showToast("पासवर्ड मैच नहीं हुए!", 'error'); return; }
    if(!tempOtp) { showToast("पहले OTP भेजें!", 'error'); return; }
    if(parseInt(enteredOtp) !== tempOtp) { showToast("गलत OTP!", 'error'); return; }

    let btn = document.getElementById('regBtn');
    btn.disabled = true;
    btn.innerHTML = "Creating Account...";

    try {
        let phoneStr = phone.replace(/\s/g, '');
        if(phoneStr.length === 10) phoneStr = '+91' + phoneStr;

        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

        // Create user in Firebase Auth
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, pass1);
        const user = userCredential.user;

        // नया: इस नए यूजर का खुद का Referral Code बनाना
        let myUniqueCode = "SK" + user.uid.substring(0, 5).toUpperCase();

        // Prepare Default User Profile Data
        let newUser = {
            uid: user.uid, 
            email: email, 
            phone: phoneStr, 
            name: name, 
            gender: gender, 
            dob: dob,
            joinedDate: new Date().toDateString(),
            myReferralCode: myUniqueCode, // यूजर का खुद का रेफरल कोड डेटाबेस में सेव होगा
            profilePic: gender === 'Female' ? "default-female.png" : "default-male.png",
            stats: { 
                testsTaken: 0, 
                avgScore: 0, 
                streakDays: 0, 
                globalRank: 0, 
                 
                offlineDownloads: 0, 
                coins: 0 
            },
            purchasedCourses: [], 
            purchasedTests: [], 
            qodAnswers: {}, 
            qodDate: ""
        };

        // Save User Profile to Firestore
        await db.collection("users").doc(user.uid).set(newUser);

        // ==========================================
        // नया: 500 Coin Referral Logic
        // ==========================================
        if(refCode) {
            // चेक करो कि क्या किसी और यूजर का ये कोड है?
            let refUserSnap = await db.collection("users").where("myReferralCode", "==", refCode).get();
            if(!refUserSnap.empty) {
                let refUserId = refUserSnap.docs[0].id;
                let refUserData = refUserSnap.docs[0].data();
                
                // जिसके कोड से ज्वाइन किया है, उसे 500 कॉइन दे दो
                let updatedCoins = (refUserData.stats.coins || 0) + 500;
                await db.collection("users").doc(refUserId).update({ 
                    "stats.coins": updatedCoins 
                });
                
                // आप चाहें तो नए यूजर को भी बोनस दे सकते हैं (नीचे वाली लाइन चालू कर लें)
                // await db.collection("users").doc(user.uid).update({ "stats.coins": 100 });
            }
        }
        // ==========================================

        showToast("रजिस्ट्रेशन सफल!", 'success');
        
        // Reload page to initialize app state
        setTimeout(() => { window.location.reload(); }, 1500);

    } catch (error) { 
        showToast("एरर: " + error.message, 'error'); 
    } finally {
        btn.disabled = false;
        btn.innerHTML = "Register Now";
    }
}

/**
 * Logs the user into the App. 
 * Supports both Email ID and Registered Mobile Number.
 */
async function processLogin() {
    let loginId = document.getElementById('loginId').value.trim().toLowerCase();
    let pass = document.getElementById('loginPass').value;

    if(!loginId || !pass) { showToast("ID और पासवर्ड डालें!", 'error'); return; }

    let emailToLogin = loginId;
    let isPhone = /^\+?[0-9]{10,13}$/.test(loginId.replace(/\s/g, ''));

    try {
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        // If user entered a Phone Number, fetch associated Email from Firestore
        if(isPhone) {
            let phoneStr = loginId.replace(/\s/g, '');
            if(phoneStr.length === 10) phoneStr = '+91' + phoneStr; 
            
            const querySnapshot = await db.collection("users").where("phone", "==", phoneStr).get();
            if(querySnapshot.empty) { 
                showToast("यह मोबाइल नंबर रजिस्टर्ड नहीं है!", 'error'); 
                return; 
            }
            emailToLogin = querySnapshot.docs[0].data().email; 
        }

        // Authenticate with Firebase
        await firebase.auth().signInWithEmailAndPassword(emailToLogin, pass);
    } catch (error) { 
        showToast("गलत आईडी या पासवर्ड!", 'error'); 
    }
}

/**
 * Sends a Password Reset Link to the user's registered Email.
 */
async function processResetPassword() {
    let email = document.getElementById('forgotEmail').value.trim().toLowerCase();
    if(!isValidEmail(email)) return showToast("सही ईमेल डालें!", 'error');
    
    try {
        await firebase.auth().sendPasswordResetEmail(email);
        showToast("पासवर्ड रिसेट लिंक ईमेल पर भेजा गया!", 'success');
        switchAuthView('loginCard');
    } catch (e) { 
        showToast("एरर: ईमेल नहीं मिला।", 'error'); 
    }
}

/**
 * Signs out the currently authenticated user and reloads the page.
 */
function logoutUser() { 
    firebase.auth().signOut().then(() => window.location.reload()); 
}