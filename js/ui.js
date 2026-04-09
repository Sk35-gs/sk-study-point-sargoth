/**
 * ============================================================================
 * 🎨 UI.JS
 * ----------------------------------------------------------------------------
 * Description : Handles App User Interface interactions including Toasts, 
 *               Tab Switching, Modals, Theme (Dark/Light), Language Toggle, 
 *               and Dynamic Test Details rendering.
 * Author      : SK STUDY POINT SARGOTH
 * ============================================================================
 */

/* -------------------------------------------------------------------------- */
/* 1. MODERN TOAST ALERTS (SUCCESS/ERROR)                                     */
/* -------------------------------------------------------------------------- */

/**
 * Displays a temporary popup notification at the top/bottom of the screen.
 * @param {string} msg - The message to display.
 * @param {string} type - 'success' (Green) or 'error' (Red).
 */
function showToast(msg, type = 'success') {
    const toast = document.getElementById('modernToast');
    const icon = document.getElementById('toastIcon');
    const text = document.getElementById('toastText');
    if(!toast) return; 

    text.innerText = msg;
    
    if (type === 'error') {
        toast.className = 'modern-toast toast-error show';
        icon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
    } else {
        toast.className = 'modern-toast toast-success show';
        icon.innerHTML = '<i class="fas fa-check-circle"></i>';
    }
    
    // Auto hide after 3 seconds
    setTimeout(() => { 
        toast.classList.remove('show'); 
    }, 3000);
}


/* -------------------------------------------------------------------------- */
/* 2. TAB SWITCHING (Bottom Nav & Home Menu)                                  */
/* -------------------------------------------------------------------------- */

/**
 * Switches between main application tabs (Home, Courses, Tests, Profile, etc.)
 * @param {string} tabId - ID of the target tab container.
 * @param {HTMLElement} element - The navigation button clicked (optional).
 * @param {string} mode - 'all' or 'purchased' (used for filtering courses/tests).
 */
function switchTab(tabId, element, mode = 'all') {
    currentViewMode = mode;
    
    // Save state so user returns to the exact same screen on refresh
    localStorage.setItem('lastActiveTab', tabId);
    localStorage.setItem('lastViewMode', mode);
    
    // Reset Live Video Iframe to stop audio playing in background when switching tabs
    if(tabId !== 'live') {
        let iframe = document.getElementById('liveVideo');
        if(iframe)     if(tabId !== 'live' && tabId !== 'courses') {
        // कोर्स प्लेयर वाला वीडियो Pause करना
        let courseIframe = document.getElementById('courseVideoPlayer');
        if(courseIframe && courseIframe.src !== "") {
            courseIframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        }
        
        // लाइव क्लास वाला वीडियो Pause करना (अगर है तो)
        let liveIframe = document.getElementById('liveVideo');
        if(liveIframe && liveIframe.src !== "") {
            liveIframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        }
    }
; 
    }

    // Apply filters if switching to Course or Test tabs
    if (tabId === 'courses' || tabId === 'test') { 
        applyContentFilter(tabId); 
    }
    
    // Hide all tabs and show target tab
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    // Update Bottom Navigation highlighting
    if(element) {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        element.classList.add('active');
    } else {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        if(tabId === 'courses') document.querySelectorAll('.nav-item')[1].classList.add('active');
        if(tabId === 'test') document.querySelectorAll('.nav-item')[2].classList.add('active');
    }
    
    // Scroll to top automatically
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Render cart if user switched to Cart tab
    if(tabId === 'cart') renderCart();
}


/* -------------------------------------------------------------------------- */
/* 3. THEME TOGGLE (Dark/Light Mode)                                          */
/* -------------------------------------------------------------------------- */

/** Toggles between dark and light themes and saves preference in localStorage */
function toggleTheme() {
    const newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggle();
}

/** Syncs the Theme toggle switch UI button state */
function updateThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    if (toggle) toggle.classList.toggle('active', document.body.getAttribute('data-theme') === 'dark');
}


/* -------------------------------------------------------------------------- */
/* 4. MODAL CONTROLS (Popups)                                                 */
/* -------------------------------------------------------------------------- */

function openModal(id) { 
    document.getElementById(id).style.display = 'flex'; 
}

function closeModal(id) { 
    document.getElementById(id).style.display = 'none'; 
}


/* -------------------------------------------------------------------------- */
/* 5. LANGUAGE TOGGLE (Hindi / English Translation System)                    */
/* -------------------------------------------------------------------------- */

/** Toggles app language dynamically and updates text on all elements with '.translatable' */
function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'hi' : 'en';
    localStorage.setItem('appLang', currentLang);
    
    // Update all static text based on language attributes
    document.querySelectorAll('.translatable').forEach(el => {
        if(currentLang === 'hi' && el.getAttribute('data-hi')) { 
            el.innerText = el.getAttribute('data-hi'); 
        } 
        else if (currentLang === 'en' && el.getAttribute('data-en')) { 
            el.innerText = el.getAttribute('data-en'); 
        }
    });

    // Re-apply filters to update dynamic text like "All Courses" vs "सभी कोर्सेज"
    const activeTab = document.querySelector('.tab-content.active');
    if(activeTab && (activeTab.id === 'courses' || activeTab.id === 'test')) { 
        applyContentFilter(activeTab.id); 
    }
    
    // Refresh Cart and Daily Quote text
    renderCart();
    updateDailyQuote();
}


/* -------------------------------------------------------------------------- */
/* 6. DYNAMIC TEST DETAILS NAVIGATION & RENDER LOGIC                          */
/* -------------------------------------------------------------------------- */

/**
 * Fetches and displays details for a specific Premium Test Series from Firestore.
 * Manages UI for Buying, adding to Cart, or Playing the Test.
 * @param {string} testTitle - Exact title of the test to load from the Database.
 */
window.openTestDetails = async function(testTitle) {
    // Switch to details page and show loading state
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById('testDetailsPage').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.getElementById('tdHeaderTitle').innerText = "Loading...";
    document.getElementById('tdTitle').innerText = "Fetching test details...";
    document.getElementById('tdImage').src = "logo.png";

    try {
        // Fetch test data from Firestore
        const snap = await db.collection("tests").where("title", "==", testTitle).get();
        if(!snap.empty) {
            let test = snap.docs[0].data();
            let qCount = test.questions ? test.questions.length : 0;
            
            // Populate Basic UI Elements
            document.getElementById('tdHeaderTitle').innerText = test.category + " Test";
            document.getElementById('tdTitle').innerText = test.title;
            document.getElementById('tdImage').src = test.image || 'logo.png';
            document.getElementById('tdMeta').innerHTML = `Duration: ${test.duration} Mins &nbsp;|&nbsp; Validity: ${test.validity || '6 Months'}`;
            
            // Render Dynamic Features List
            document.getElementById('tdOfferings').innerHTML = `
                <div style="font-size: 0.8rem; display: flex; align-items: center; gap: 8px;"><i class="far fa-check-circle" style="color: #2ecc71;"></i> Total ${qCount} Questions</div>
                <div style="font-size: 0.8rem; display: flex; align-items: center; gap: 8px;"><i class="far fa-check-circle" style="color: #2ecc71;"></i> ${test.duration} Mins Limit</div>
                <div style="font-size: 0.8rem; display: flex; align-items: center; gap: 8px;"><i class="far fa-check-circle" style="color: #2ecc71;"></i> Negative Mark: ${test.negativeMarking || 0}</div>
                <div style="font-size: 0.8rem; display: flex; align-items: center; gap: 8px;"><i class="far fa-check-circle" style="color: #2ecc71;"></i> Detailed Results</div>
            `;

            document.getElementById('tdQCount').innerText = `${qCount} Qs`;
            document.getElementById('tdContentTitle').innerText = test.title;
            
            // Handle Pricing Logic
            let priceText = (test.price === 0 || test.price === "0") ? "Free" : `₹${test.price}`;
            document.getElementById('tdNewPrice').innerText = priceText;
            document.getElementById('tdOldPrice').innerText = test.oldPrice ? `Price: ₹${test.oldPrice}` : '';

            // 🔥 Smart Purchase Button Logic 🔥
            let user = getUserData();
            let isBought = user && user.purchasedTests && user.purchasedTests.includes(test.title);
            let btn = document.getElementById('tdBuyBtn');

            if(isBought) {
                // If Already Purchased -> Show Open Button
                btn.innerHTML = '<i class="fas fa-play-circle"></i> Open Test Series';
                btn.style.background = "#2ecc71"; // Green
                btn.style.color = "white";
                
                btn.onclick = function() { 
                    if(test.isTestSeries) {
                        openTestFolders(test.title); // Opens Advanced Folder Structure
                    } else {
                        openTestInstructions(test.title, test.duration); // Fallback for old single tests
                    }
                };
            } else {
                // Not Purchased -> Check if in Cart
                let inCart = cart.find(c => c.title === test.title);
                if(inCart) {
                    btn.innerHTML = '<i class="fas fa-check"></i> Added to Cart';
                    btn.style.background = '#2ecc71';
                    btn.style.color = "white";
                    btn.onclick = function() { switchTab('cart', null); };
                } else {
                    // Show Buy Now Button
                    btn.innerHTML = "Buy Now";
                    btn.style.background = "#f1c40f"; // Yellow
                    btn.style.color = "black";
                    btn.onclick = function() { handleBuy(this, test.title, test.price, 'test'); };
                }
            }
        } else {
            document.getElementById('tdTitle').innerText = "❌ Test not found in database!";
        }
    } catch(e) { 
        console.error(e); 
    }
};

/** Closes the Test Details page and returns to the previous screen */
window.closeTestDetails = function() {
    document.getElementById('testDetailsPage').classList.remove('active');
    document.getElementById('test').classList.add('active'); // Safely return to test library
};