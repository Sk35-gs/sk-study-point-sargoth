/**
 * ============================================================================
 * 👤 USER.JS
 * ----------------------------------------------------------------------------
 * Description : Manages User Data (Read/Write to Firebase), Dashboard UI
 *               Initialization, Profile Updates, and Password Management.
 * Author      : SK STUDY POINT SARGOTH
 * ============================================================================
 */

/* -------------------------------------------------------------------------- */
/* 1. DATA GETTER & SETTER                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Returns the currently authenticated user's data object.
 * @returns {Object} User Data Object
 */
function getUserData() {
    return currentUserData; 
}

/**
 * Updates the local user state and syncs the changes to Firestore Database.
 * @param {Object} updatedUser - The modified user object.
 */
function saveUserData(updatedUser) {
    currentUserData = updatedUser; 
    if (updatedUser && updatedUser.uid) {
        db.collection("users").doc(updatedUser.uid).set(updatedUser, { merge: true })
        .then(() => console.log("User Data successfully synced to Firebase."))
        .catch(error => console.error("Database Sync Error:", error));
    }
}


/* -------------------------------------------------------------------------- */
/* 2. USER DASHBOARD INITIALIZATION                                           */
/* -------------------------------------------------------------------------- */

/**
 * Initializes the main App Dashboard. Loads user stats, profile info, 
 * handles daily resets (like QoD tracking), and toggles splash screens.
 */
function initUserData() {
    let user = getUserData();
    if(!user) return logoutUser();

    let todayDate = new Date();
    let todayStr = todayDate.toDateString();
    
    // Daily Login Bonus & Streak Logic
    if (user.lastLoginDate !== todayStr) {
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        // अगर कल लॉगिन किया था, तो स्ट्रीक बढ़ाओ, वरना 1 से शुरू करो
        if (user.lastLoginDate === yesterday.toDateString()) {
            user.stats.streakDays = (user.stats.streakDays || 0) + 1;
        } else {
            user.stats.streakDays = 1;
        }

        user.stats.coins = (user.stats.coins || 0) + 10; // 10 Coin Bonus
        user.lastLoginDate = todayStr;
        user.qodAnswers = {}; // Reset QoD for today
        
        saveUserData(user);
        setTimeout(() => showToast("Daily Login Bonus: +10 Coins!", "success"), 2000);
    }

    // 2. Setup Admin Panel Access Button
    let adminBtn = document.getElementById('adminPanelBtn');
    if (adminBtn) {
        if (user.email === "gauravkumarverma637@gmail.com") {
            adminBtn.style.display = 'flex'; // Show only to Master Admin
        } else {
            adminBtn.style.display = 'none'; 
        }
    }

    // 3. Fallback for Missing or Broken Profile Pictures
    let finalPic = user.profilePic;
    if (!finalPic || finalPic.trim() === "" || finalPic.includes("freepik.com")) {
        finalPic = (user.gender === 'Female') ? "default-female.png" : "default-male.png";
    }

    // 4. Update Header & Profile UI Elements
    document.getElementById('homeUserName').innerText = user.name;
    document.getElementById('homeProfileImg').src = finalPic;
    document.getElementById('profileNameDisplay').innerText = user.name;
    document.getElementById('profileEmailDisplay').innerText = user.email;
    document.getElementById('profilePageImg').src = finalPic;

    // 5. Update Gamification & Engagement Stats
    document.getElementById('homeCoins').innerText = user.stats.coins || 0;
    document.getElementById('homeStreak').innerText = user.stats.streakDays || 0;
    document.getElementById('statTests').innerText = user.stats.testsTaken || 0;
    document.getElementById('statAvg').innerText = (user.stats.avgScore || 0) + "%";
    document.getElementById('statStreak').innerText = user.stats.streakDays || 0;
    document.getElementById('statRank').innerText = user.stats.globalRank > 0 ? "#" + user.stats.globalRank : "N/A";
    
    // 6. Update Library & Purchase Stats
    let courseCount = user.purchasedCourses ? user.purchasedCourses.length : 0;
    let testCount = user.purchasedTests ? user.purchasedTests.length : 0;
    
    document.getElementById('statCourses').innerText = courseCount + " Active";
    document.getElementById('statTestsPurchased').innerText = testCount + " Purchased";
    document.getElementById('statDoubts').innerText = (user.stats.aiDoubts || 0) + " Questions";
    document.getElementById('statDownloads').innerText = (user.stats.offlineDownloads || 0) + " PDFs";

    // 7. Hide Splash Screens and Show App Layout
    let spinner = document.getElementById('spinnerSplashScreen');
    if(spinner) spinner.style.display = 'none';
    
    let logoSplash = document.getElementById('logoSplashScreen');
    if(logoSplash) logoSplash.style.display = 'none';
    
    document.getElementById('authTab').classList.remove('active');
    document.getElementById('bottomNav').style.display = 'flex';

    // 8. Restore Last Active View (Maintains UI state on refresh)
    // ✅ नया कोड (हमेशा होम पेज खुलेगा)
    let homeNavBtn = document.querySelectorAll('.bottom-nav .nav-item')[0];
    switchTab('home', homeNavBtn, 'all');

    // 9. Load Content
    updateCartBadge(); 
    renderCart();
    renderDailyQOD(); 
}


/* -------------------------------------------------------------------------- */
/* 3. PROFILE MANAGEMENT (Password & Details)                                 */
/* -------------------------------------------------------------------------- */

/**
 * Handles Firebase secure Password Change functionality.
 * Requires user to re-authenticate with old password first.
 */
async function changePasswordUI() {
    let oldP = document.getElementById('profileOldPass').value;
    let newP = document.getElementById('profileNewPass').value;
    
    if(!oldP || !newP) { 
        showToast(currentLang === 'hi' ? "दोनों पासवर्ड डालें!" : "Enter both passwords!", 'error'); 
        return; 
    }
    
    let fbUser = firebase.auth().currentUser;
    if(!fbUser) return;

    let btn = document.querySelector('#passwordModal .btn-primary');
    let originalText = btn.innerText;
    btn.innerText = currentLang === 'hi' ? "अपडेट हो रहा है..." : "Updating...";
    btn.disabled = true;

    try {
        // Step 1: Re-authenticate with old password (Firebase Security Requirement)
        let credential = firebase.auth.EmailAuthProvider.credential(fbUser.email, oldP);
        await fbUser.reauthenticateWithCredential(credential);
        
        // Step 2: Set New Password
        await fbUser.updatePassword(newP);
        
        closeModal('passwordModal');
        document.getElementById('profileOldPass').value = ''; 
        document.getElementById('profileNewPass').value = '';
        showToast(currentLang === 'hi' ? "पासवर्ड सफलतापूर्वक अपडेट हो गया!" : "Password Updated Successfully!", 'success');
        
    } catch(error) {
        if(error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            showToast(currentLang === 'hi' ? "पुराना पासवर्ड गलत है!" : "Old password incorrect!", 'error');
        } else if (error.code === 'auth/weak-password') {
            showToast(currentLang === 'hi' ? "नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए!" : "New password must be at least 6 characters!", 'error');
        } else {
            showToast("Error: " + error.message, 'error');
        }
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

/** Opens the Edit Profile Modal and pre-fills current details */
function openEditProfileModal() {
    let user = getUserData();
    if(!user) return;
    document.getElementById('editProfileName').value = user.name || '';
    document.getElementById('editProfilePhone').value = user.phone || '';
    document.getElementById('editProfilePicFile').value = '';
    openModal('editProfileModal');
}

/**
 * Saves Profile Updates (Name, Phone, Profile Picture).
 * Compresses the image using HTML Canvas before saving it directly to Firestore as Base64.
 */
function saveProfileChanges() {
    let newName = document.getElementById('editProfileName').value.trim();
    let newPhone = document.getElementById('editProfilePhone').value.trim();
    let fileInput = document.getElementById('editProfilePicFile');

    if(!newName || !newPhone) { 
        showToast(currentLang === 'hi' ? "नाम और मोबाइल नंबर खाली नहीं हो सकते!" : "Name and Phone cannot be empty!", 'error'); 
        return; 
    }

    let user = getUserData();
    user.name = newName;
    user.phone = newPhone;

    let btn = document.querySelector('#editProfileModal .btn-primary');
    let originalText = btn.innerText;
    btn.innerText = currentLang === 'hi' ? "सेव हो रहा है..." : "Saving...";
    btn.disabled = true;

    // Check if user selected a new profile picture
    if (fileInput.files && fileInput.files[0]) {
        let file = fileInput.files[0];
        let reader = new FileReader();

        reader.onload = function(event) {
            let img = new Image();
            img.onload = function() {
                // Step 1: Create Canvas for compression
                let canvas = document.createElement('canvas');
                let ctx = canvas.getContext('2d');
                
                // Step 2: Resize image to 200x200 pixels
                canvas.width = 200;
                canvas.height = 200;
                
                // Step 3: Draw image on Canvas
                ctx.drawImage(img, 0, 0, 200, 200);

                // Step 4: Convert Canvas to Base64 Text (70% Quality to save DB space)
                let compressedBase64Image = canvas.toDataURL('image/jpeg', 0.7);

                // Step 5: Save directly to User Object
                user.profilePic = compressedBase64Image; 
                finalizeProfileUpdate(user, btn, originalText);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    } else { 
        // No photo selected, just update name and phone
        finalizeProfileUpdate(user, btn, originalText); 
    }
}

/** Internal helper function to finalize the profile save process */
function finalizeProfileUpdate(user, btn, originalText) {
    saveUserData(user); 
    
    // Update UI instantly
    document.getElementById('homeUserName').innerText = user.name;
    document.getElementById('homeProfileImg').src = user.profilePic;
    document.getElementById('profileNameDisplay').innerText = user.name;
    document.getElementById('profilePageImg').src = user.profilePic;
    
    closeModal('editProfileModal');
    showToast(currentLang === 'hi' ? "प्रोफाइल अपडेट हो गई!" : "Profile Updated!", 'success');
    
    if(btn) { 
        btn.innerText = originalText; 
        btn.disabled = false; 
    }
}
// --- REFER & EARN LOGIC ---
function shareApp() {
    let user = getUserData();
    let myCode = user.myReferralCode || "SK" + user.uid.substring(0,5).toUpperCase();
    let shareText = `Download SK STUDY POINT App and get 500 Bonus Coins! 🚀\nUse my Referral Code: *${myCode}*\nDownload Link: https://your-website.com`;
    
    if (navigator.share) {
        navigator.share({ title: 'SK STUDY POINT', text: shareText });
    } else {
        navigator.clipboard.writeText(shareText);
        showToast("Code copied to clipboard!", "success");
    }
}

async function applyReferralCode() {
    let code = document.getElementById('enterRefCode').value.trim().toUpperCase();
    let user = getUserData();
    if(!code) return showToast("Please enter a code!", "error");
    if(code === user.myReferralCode) return showToast("You cannot use your own code!", "error");

    let btn = document.querySelector('#applyCodeSection button');
    btn.innerHTML = "Wait..."; btn.disabled = true;

    try {
        let refUserSnap = await db.collection("users").where("myReferralCode", "==", code).get();
        if(refUserSnap.empty) {
            showToast("Invalid Referral Code!", "error");
        } else {
            // जिसने रेफ़र किया उसे 250 कॉइन दो
            let refUserId = refUserSnap.docs[0].id;
            let refUserData = refUserSnap.docs[0].data();
            await db.collection("users").doc(refUserId).update({ "stats.coins": (refUserData.stats.coins || 0) + 250 });

            // मुझे (यूजर को) 500 कॉइन दो
            user.stats.coins = (user.stats.coins || 0) + 500;
            user.referredBy = code; // सेव कर लिया ताकि दोबारा न डाल सके
            saveUserData(user);
            
            showToast("Code Applied! You got 500 Coins 🎉", "success");
            document.getElementById('applyCodeSection').style.display = 'none';
            document.getElementById('homeCoins').innerText = user.stats.coins;
        }
    } catch(e) { showToast("Error applying code.", "error"); }
    finally { btn.innerHTML = "Apply"; btn.disabled = false; }
}

// user.js के अंत में इसे डालें (पुराने पेमेंट और रेफर फंक्शन्स को रिप्लेस करें)

// 1. Payment Page Logic
window.openPaymentPage = async function() {
    let user = getUserData();
    if(!user) return;
    
    // सारे टैब छुपाएं और पेमेंट पेज दिखाएं
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById('paymentTrackerPage').classList.add('active');
    window.scrollTo(0, 0);

    let container = document.getElementById('userPaymentHistoryList');
    container.innerHTML = '<div style="text-align:center; padding: 50px; color:var(--text-gray);"><i class="fas fa-spinner fa-spin fa-2x"></i><br><br>Loading your payments...</div>';

    try {
        const snap = await db.collection("payments").where("uid", "==", user.uid).get();
        let paymentsArray = [];
        snap.forEach(doc => paymentsArray.push(doc.data()));

        // Sort by time
        paymentsArray.sort((a, b) => {
            let timeA = a.timestamp ? a.timestamp.toMillis() : 0;
            let timeB = b.timestamp ? b.timestamp.toMillis() : 0;
            return timeB - timeA; 
        });

        let html = '';
        paymentsArray.forEach(data => {
            let dateStr = data.date || "N/A";
            let statusColor = data.status === 'Pending' ? '#f59e0b' : (data.status === 'Approved' ? '#10b981' : '#ef4444');
            let statusIcon = data.status === 'Pending' ? 'fa-clock' : (data.status === 'Approved' ? 'fa-check-circle' : 'fa-times-circle');
            let items = data.items ? data.items.map(i => i.title).join(', ') : "Course/Test";

            html += `
            <div style="background: var(--white); padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); border-left: 5px solid ${statusColor};">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span style="font-size:0.8rem; color:var(--text-gray); font-weight:600;">${dateStr}</span>
                    <span style="color:${statusColor}; font-size:0.9rem; font-weight:800;"><i class="fas ${statusIcon}"></i> ${data.status}</span>
                </div>
                <div style="font-weight:900; font-size:1.4rem; color:var(--text); margin-bottom:8px;">₹${data.amount}</div>
                <div style="font-size:0.85rem; color:var(--text-gray); line-height:1.5;"><strong>Items:</strong> ${items}</div>
                <div style="font-size:0.8rem; color:#94a3b8; margin-top:8px; background:#f1f5f9; padding:6px 10px; border-radius:6px; display:inline-block;">UTR: ${data.utr}</div>
            </div>`;
        });
        
        container.innerHTML = html || '<div style="text-align:center; color:var(--text-gray); padding: 50px;"><i class="fas fa-box-open fa-3x" style="opacity:0.3; margin-bottom:15px;"></i><br>No payment history found.</div>';
    } catch(e) {
        container.innerHTML = '<div style="text-align:center; color:#ef4444; padding: 50px;">Failed to load history.</div>';
    }
};

// 2. Refer & Earn Page Logic
window.openReferPage = async function() {
    let user = getUserData();
    if(!user) return;

    // सारे टैब छुपाएं और रेफर पेज दिखाएं
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById('referEarnPage').classList.add('active');
    window.scrollTo(0, 0);

    let myCode = user.myReferralCode || "SK" + user.uid.substring(0,5).toUpperCase();
    document.getElementById('myReferralCodeTxt').innerText = myCode;

    // अगर पहले से कोड डाल चुका है, तो Apply वाला डब्बा छुपा दो
    if(user.referredBy) {
        document.getElementById('applyCodeSection').style.display = 'none';
    }

    let teamContainer = document.getElementById('myTeamList');
    teamContainer.innerHTML = '<div style="text-align:center; color:var(--text-gray); padding: 30px;"><i class="fas fa-spinner fa-spin fa-2x"></i><br><br>Loading team...</div>';

    try {
        const snap = await db.collection("users").where("referredBy", "==", myCode).get();
        let html = '';
        snap.forEach(doc => {
            let data = doc.data();
            html += `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding:12px 0;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:35px; height:35px; background:var(--primary); color:white; border-radius:50%; display:flex; justify-content:center; align-items:center; font-weight:bold;">${data.name.charAt(0).toUpperCase()}</div>
                    <span style="font-size:0.95rem; font-weight:bold; color:var(--text);">${data.name}</span>
                </div>
                <span style="font-size:0.8rem; color:#10b981; background:#ecfdf5; padding:5px 10px; border-radius:15px; font-weight:bold;">+250 Coins</span>
            </div>`;
        });
        teamContainer.innerHTML = html || '<div style="text-align:center; color:#94a3b8; padding: 20px;">You have not referred anyone yet.<br>Share your code to earn coins!</div>';
    } catch(e) { 
        teamContainer.innerHTML = '<div style="text-align:center; color:#ef4444; padding: 20px;">Failed to load team.</div>';
    }
};

window.openDownloadsPage = function() {
    let user = getUserData();
    if(!user) return;

    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById('downloadsPage').classList.add('active');
    window.scrollTo(0, 0);

    let container = document.getElementById('downloadedPdfsList');
    let pdfs = user.downloadedPDFs || [];

    if(pdfs.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:var(--text-gray); padding: 50px;"><i class="fas fa-file-pdf fa-3x" style="opacity:0.3; margin-bottom:15px;"></i><br>No PDFs downloaded yet.</div>';
        return;
    }

    let html = '';
    pdfs.forEach(pdf => {
        // यहाँ नया बटन लगाया है जो ऑफलाइन ओपन करेगा
        html += `
        <div style="background: var(--white); padding: 15px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="width: 45px; height: 45px; background: #ecfdf5; border-radius: 10px; display: flex; justify-content: center; align-items: center;">
                    <i class="fas fa-check-circle" style="color: #10b981; font-size: 1.5rem;"></i>
                </div>
                <div>
                    <h4 style="color: var(--text); font-size: 0.95rem; margin-bottom: 3px;">${pdf.title}</h4>
                    <span style="font-size: 0.75rem; color: var(--text-gray);">Offline Saved on: ${pdf.date}</span>
                </div>
            </div>
            <button onclick="openOfflinePDF('${pdf.localId}', '${pdf.title}')" style="background: #10b981; color: white; border: none; width: 38px; height: 38px; border-radius: 8px; cursor: pointer; display: flex; justify-content: center; align-items: center;">
                <i class="fas fa-book-open"></i>
            </button>
        </div>`;
    });
    
    container.innerHTML = html;
};

// यह फंक्शन ऑफलाइन सेव की गई PDF को बिना इंटरनेट के ऐप के अंदर खोलेगा
window.openOfflinePDF = async function(localId, title) {
    try {
        let blob = await PDFDatabase.getPDF(localId);
        if(!blob) throw new Error("File not found");

        let blobUrl = URL.createObjectURL(blob);
        document.getElementById('pdfViewerTitle').innerText = title + " (Offline Mode)";
        document.getElementById('pdfViewerPage').style.display = 'flex';
        document.getElementById('pdfIframe').src = blobUrl;
    } catch (e) {
        showToast("PDF फाइल करप्ट हो गई है या डिलीट हो गई है।", "error");
    }
};