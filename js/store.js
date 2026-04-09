/**
 * ============================================================================
 * 🛒 STORE.JS
 * ----------------------------------------------------------------------------
 * Description : Handles E-Commerce operations including Cart Management, 
 *               Checkout, Promo Codes, Category Filtering, and dynamically 
 *               loading Courses and Test Series from Firebase Firestore.
 * Author      : SK STUDY POINT SARGOTH
 * ============================================================================
 */

/* -------------------------------------------------------------------------- */
/* 1. CART MANAGEMENT & AUTO-BUY LOGIC                                        */
/* -------------------------------------------------------------------------- */

/**
 * Handles adding items to the cart or automatically unlocking free content.
 * @param {HTMLElement} button - The clicked button element to update its UI.
 * @param {string} title - The title of the course/test.
 * @param {number} price - The price of the content (0 means Free).
 * @param {string} type - 'course' or 'test'.
 */
// store.js - नया handleBuy फंक्शन
function handleBuy(button, title, price, type) {
    let user = getUserData();
    if (!user) return showToast("Please login first!", "error");
    
    // कार्ट एरे सुनिश्चित करें
    if (!user.cart) user.cart = [];

    let purchasedArray = type === 'course' ? (user.purchasedCourses || []) : (user.purchasedTests || []);

    // 1. अगर पहले से खरीदा हुआ है
    if (purchasedArray.some(t => t && title && t.trim().toLowerCase() === title.trim().toLowerCase())) {
        let targetNav = type === 'course' ? document.querySelectorAll('.nav-item')[1] : document.querySelectorAll('.nav-item')[2];
        switchTab(type === 'course' ? 'courses' : 'test', targetNav, 'purchased');
        return;
    }

    // 2. फ्री कंटेंट ऑटो-बाय
    if (price === 0) {
        if (type === 'course') user.purchasedCourses.push(title.trim());
        else user.purchasedTests.push(title.trim());
        
        saveUserData(user); // Firestore में सेव
        showToast(currentLang === 'hi' ? "फ्री कंटेंट सक्रिय हो गया!" : "Free Content Activated!", 'success');
        applyContentFilter(type === 'course' ? 'courses' : 'test'); 
        return;
    }

    // 3. Paid Content कार्ट में जोड़ना (Firebase में)
    let exists = user.cart.find(item => item.title && item.title.trim().toLowerCase() === title.trim().toLowerCase());
    if(exists) { 
        showToast(currentLang === 'hi' ? "पहले से कार्ट में है!" : "Already in Cart!", 'error'); 
        return; 
    }

    // आइटम को यूजर के कार्ट में डालें
    user.cart.push({ title: title.trim(), price: parseInt(price), type: type }); 
    
    // Firebase Database में अपडेट करें
    db.collection("users").doc(user.uid).update({ cart: user.cart }).then(() => {
        saveUserData(user); // लोकल डेटा भी सिंक करें
        
        // Button UI Update
        button.innerHTML = '<i class="fas fa-check"></i> ' + (currentLang === 'hi' ? "कार्ट में है" : "Added");
        button.style.backgroundColor = '#10b981'; 
        button.style.color = '#fff';
        button.onclick = null; 
        
        updateCartBadge(); 
        showToast(currentLang === 'hi' ? "कार्ट में जुड़ गया!" : "Added to Cart!", 'success');
    });
}

/** Processes the payment and moves cart items to user's purchased lists */
function checkout() {
    let user = getUserData();
    // 🌟 यहाँ ग्लोबल cart की जगह user.cart चेक कर रहे हैं
    if(!user || !user.cart || user.cart.length === 0) {
        showToast("Your cart is empty!", "error");
        return;
    }
    
    // QR Code वाला डब्बा खोलो
    document.getElementById('payAmountTxt').innerText = `₹${window.currentCartTotal}`;
    document.getElementById('utrNumber').value = '';
    
    // AUTO UPI LINK GENERATE KARNA
    let merchantUpiId = "sk332404@ibl"; 
    let merchantName = "GAURAV VERMA";
    let upiUrl = `upi://pay?pa=${merchantUpiId}&pn=${merchantName}&am=${window.currentCartTotal}&cu=INR`;
    
    document.getElementById('upiDirectLink').href = upiUrl;
    document.getElementById('paymentModal').style.display = 'flex';
}

async function submitManualPayment() {
    let utr = document.getElementById('utrNumber').value.trim();
    if(utr.length < 8) { showToast("सही UTR नंबर डालें!", "error"); return; }
    
    let btn = document.querySelector('#paymentModal .btn-primary');
    btn.innerHTML = "Submitting..."; btn.disabled = true;
    
    let user = getUserData();
    
    try {
        // एडमिन के पास डेटाबेस में रिक्वेस्ट भेजना
        await db.collection("payments").add({
            uid: user.uid,
            name: user.name,
            email: user.email,
            phone: user.phone,
            amount: window.currentCartTotal,
            utr: utr,
            items: cart, // इसमें कोर्स/टेस्ट का नाम है
            status: "Pending",
            date: new Date().toLocaleDateString(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // जो कॉइन यूज़ किये हैं, वो काट लेना
        if(window.coinsUsedInCart > 0) {
            user.stats.coins -= window.coinsUsedInCart;
            saveUserData(user);
        }

        // कार्ट खाली करना (Firebase से भी)
        user.cart = [];
        await db.collection("users").doc(user.uid).update({ cart: [] });
        saveUserData(user);
        document.getElementById('paymentModal').style.display = 'none';
        
        showToast("Your payment is processing. Track your order in Profile!", "success");
        
        updateCartBadge(); 
        renderCart(); 
        switchTab('home');

    } catch(e) {
        showToast("Error submitting payment.", "error");
    } finally {
        btn.innerHTML = "Submit Payment"; btn.disabled = false;
    }
}

function removeFromCart(index) {
    let user = getUserData();
    if (!user || !user.cart) return;

    user.cart.splice(index, 1); // आइटम हटाएं
    
    // Firebase में अपडेट करें
    db.collection("users").doc(user.uid).update({ cart: user.cart }).then(() => {
        saveUserData(user);
        updateCartBadge(); 
        renderCart(); 
        applyContentFilter('courses'); 
        applyContentFilter('test');
    });
}


function updateCartBadge() {
    let user = getUserData();
    let cartLength = (user && user.cart) ? user.cart.length : 0;
    
    const badge = document.getElementById('cartBadgeMenu');
    if(badge) { 
        badge.style.display = cartLength > 0 ? 'flex' : 'none'; 
        badge.innerText = cartLength; 
    }
}



/* -------------------------------------------------------------------------- */
/* 2. PROMO CODE SYSTEM (Admin Controlled)                                    */
/* -------------------------------------------------------------------------- */

let currentDiscountPercent = 0; 
let currentPromoType = 'none'; // Tracks if the coupon is for 'course' or 'test'

/** Verifies entered Promo Code from Firebase and applies discounts */
async function applyPromoCode() {
    let promoInput = document.getElementById('promoInput');
    if(!promoInput) return;
    
    let userInput = promoInput.value.trim().toUpperCase();
    if(userInput === "") return showToast("⚠️ Please enter a Promo Code", "error");

    let applyBtn = promoInput.nextElementSibling;
    let originalText = applyBtn.innerText;
    applyBtn.innerText = "...";
    applyBtn.disabled = true;

    try {
        let doc = await db.collection("app_settings").doc("promo_code").get();
        if(doc.exists) {
            let data = doc.data();
            
            // Check 1: Is it a valid COURSE code?
            if(data.courseCode && userInput === data.courseCode.toUpperCase() && data.courseDiscount > 0) {
                currentPromoType = 'course';
                currentDiscountPercent = data.courseDiscount;
                showToast(`🎉 Course Code Applied! ${data.courseDiscount}% OFF`, "success");
            } 
            // Check 2: Is it a valid TEST code?
            else if(data.testCode && userInput === data.testCode.toUpperCase() && data.testDiscount > 0) {
                currentPromoType = 'test';
                currentDiscountPercent = data.testDiscount;
                showToast(`🎉 Test Code Applied! ${data.testDiscount}% OFF`, "success");
            } 
            // Check 3: Invalid code
            else {
                currentPromoType = 'none';
                currentDiscountPercent = 0;
                showToast("❌ Invalid Promo Code!", "error");
            }
        } else { 
            showToast("❌ No active offers!", "error"); 
        }
    } catch(e) { 
        showToast("Error checking code!", "error"); 
    } finally {
        applyBtn.innerText = originalText;
        applyBtn.disabled = false;
        renderCart(); // Refresh cart to show new prices
    }
}

/** Renders cart UI and calculates totals with smart discount logic */


function renderCart() {
    // यहाँ हमने user को एक ही बार डिक्लेयर किया है
    let user = getUserData();
    let userCart = (user && user.cart) ? user.cart : []; 

    const list = document.getElementById('cartItemsList');
    const checkoutBox = document.getElementById('checkoutBox');
    const totalEl = document.getElementById('cartTotal');
    const discountRow = document.getElementById('discountRow');
    const discountAmountEl = document.getElementById('discountAmount');
    
    let subTotal = 0;
    let discountValue = 0; 

    if(!list || !checkoutBox || !totalEl) return;

    // Handle Empty Cart
    if(userCart.length === 0) {
        list.innerHTML = `<p style="text-align:center; margin-top: 50px; color: var(--text-gray);">
            <i class="fas fa-shopping-cart" style="font-size:3rem; opacity:0.3; margin-bottom:15px; display:block;"></i>
            ${currentLang === 'hi' ? 'कार्ट खाली है।' : 'Cart is empty.'}
        </p>`;
        checkoutBox.style.display = 'none'; 
        currentDiscountPercent = 0; currentPromoType = 'none';
        if(document.getElementById('promoInput')) document.getElementById('promoInput').value = '';
        return;
    }

    list.innerHTML = ''; 
    checkoutBox.style.display = 'block';
    
    // Calculate Subtotal & Discounts
    userCart.forEach((item, index) => {
        subTotal += item.price;
        
        if(currentDiscountPercent > 0) {
            if(currentPromoType === 'course' && item.type === 'course') {
                discountValue += (item.price * currentDiscountPercent) / 100;
            } else if(currentPromoType === 'test' && item.type === 'test') {
                discountValue += (item.price * currentDiscountPercent) / 100;
            }
        }
        
        list.innerHTML += `
            <div class="cart-item">
                <div class="cart-details">
                    <h4>${item.title}</h4>
                    <p>₹${item.price} <span style="font-size:0.7rem; color:var(--text-gray); background:var(--bg); padding:2px 5px; border-radius:4px; margin-left:5px;">${item.type.toUpperCase()}</span></p>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });

    if (currentDiscountPercent > 0 && discountValue === 0) {
        showToast(`⚠️ This code is only valid for ${currentPromoType.toUpperCase()}S!`, "error");
        currentDiscountPercent = 0;
        currentPromoType = 'none';
    }

    if(discountValue > 0 && discountRow && discountAmountEl) {
        discountRow.style.display = 'flex';
        discountAmountEl.innerText = `- ₹${discountValue}`;
    } else if (discountRow) {
        discountRow.style.display = 'none';
    }

    let finalTotal = subTotal - discountValue;

    // --- COIN DISCOUNT लॉजिक ---
    let maxCoinAllowed = Math.floor(finalTotal * 0.15); // 15% लिमिट
    let coinsToUse = 0;

    // यहाँ हम दोबारा let user = getUserData() नहीं लिखेंगे!
    if(user && user.stats && user.stats.coins > 0) {
        coinsToUse = Math.min(user.stats.coins, maxCoinAllowed);
        finalTotal = finalTotal - coinsToUse;
        
        if(coinsToUse > 0 && discountRow) {
            discountRow.style.display = 'flex';
            discountAmountEl.innerHTML = `- ₹${discountValue} <br> <span style="color:#f59e0b; font-size:0.8rem;">(Coins Used: -₹${coinsToUse})</span>`;
        }
    }

    window.currentCartTotal = finalTotal; 
    window.coinsUsedInCart = coinsToUse;
    totalEl.innerText = '₹' + finalTotal;
}


/* -------------------------------------------------------------------------- */
/* 3. CONTENT FILTERING & NAVIGATION LOGIC                                    */
/* -------------------------------------------------------------------------- */

/**
 * Filters the displayed content based on Category (RPSC, SSC) 
 * and View Mode (All vs My Courses/Tests).
 */
function applyContentFilter(tabId) {
    const titlePrefix = currentSelectedCategory === 'all' ? (currentLang === 'hi' ? 'सभी' : 'All') : currentCategoryName;
    let user = getUserData(); 
    if(!user) return;

    const courseTitle = document.getElementById('coursePageTitle');
    const testTitle = document.getElementById('testPageTitle');
    
    // Update Headers dynamically based on language and filter
    if(tabId === 'courses' && courseTitle) {
        courseTitle.innerText = currentViewMode === 'purchased' ? (currentLang==='hi'?"मेरे कोर्सेज":"My Courses") : titlePrefix + " Courses";
    }
    if(tabId === 'test' && testTitle) {
        testTitle.innerText = currentViewMode === 'purchased' ? (currentLang==='hi'?"मेरे टेस्ट":"My Tests") : titlePrefix + " Test Series";
    }

    let visibleCount = 0;
    const containerId = tabId === 'courses' ? 'courseContainer' : 'testContainer';
    const emptyMsgId = tabId === 'courses' ? 'emptyCourseMsg' : 'emptyTestMsg';
    
    let purchasedArray = [];
    if (tabId === 'courses' && user.purchasedCourses) purchasedArray = user.purchasedCourses;
    if (tabId === 'test' && user.purchasedTests) purchasedArray = user.purchasedTests;
    
    const container = document.getElementById(containerId);
    if(container) {
        container.querySelectorAll('.filter-item').forEach(item => {
            let rawCategory = item.getAttribute('data-category') || 'all';
            if (rawCategory === "undefined" || rawCategory === "null") rawCategory = 'all';

            const itemCategory = rawCategory.trim().toLowerCase();
            const targetCategory = (currentSelectedCategory || 'all').trim().toLowerCase();
            
            const titleElement = item.querySelector('h3');
            const title = titleElement ? titleElement.innerText.trim() : "";
            const testDuration = item.getAttribute('data-duration') || 60; 
            
            let isBought = false;
            if(title !== "") {
                isBought = purchasedArray.some(t => t && t.trim().toLowerCase() === title.toLowerCase());
            }
            
            let matchesCategory = (targetCategory === 'all' || itemCategory === targetCategory);
            let matchesPurchased = (currentViewMode === 'all' || isBought);

            // If it matches filters, show it and update its button
            if (matchesCategory && matchesPurchased) { 
                item.style.display = 'block'; 
                visibleCount++; 
                
                let btn = item.querySelector('.buy-now-btn') || item.querySelector('.explore-btn');
                let isSeries = item.getAttribute('data-istestseries') === 'true'; // New Test Series Check
                
                if(btn) {
                    if(isBought) {
                        // User owns it -> Turn button into "Open"
                        btn.innerHTML = '<i class="fas fa-folder-open"></i> ' + (currentLang === 'hi' ? 'सीरीज़ खोलें' : 'Open Series');
                        btn.style.backgroundColor = '#10b981'; 
                        btn.style.color = 'white';
                        
                        btn.onclick = function() { 
                            if(tabId === 'courses') { 
                                openCourseDetails(title); 
                            } else {
                                if(isSeries) {
                                    openTestFolders(title); 
                                } else {
                                    openTestInstructions(title, parseInt(testDuration)); 
                                }
                            }
                        };
                    } else {
                        // User doesn't own it -> Check Cart Status
                        let existsInCart = cart.find(c => c.title && c.title.trim().toLowerCase() === title.toLowerCase());
                        if(existsInCart) {
                            btn.innerHTML = '<i class="fas fa-check"></i> ' + (currentLang === 'hi' ? "कार्ट में है" : "Added");
                            btn.style.backgroundColor = '#10b981'; 
                            btn.style.color = '#fff';
                            btn.onclick = null;
                        } else {
                            // Default Buy Now state
                            btn.innerHTML = currentLang === 'hi' ? 'कार्ट में डालें' : 'Buy Now';
                            btn.style.backgroundColor = ''; 
                            btn.style.color = ''; 
                            
                            let priceEl = item.querySelector('.new-price') || item.querySelector('.content-card-body div');
                            let priceNum = 0;
                            if(priceEl) {
                                let numStr = priceEl.innerText.replace(/[^0-9]/g, ''); 
                                if(numStr !== "") { priceNum = parseInt(numStr); }
                            }

                            let itemType = tabId === 'courses' ? 'course' : 'test';
                            btn.onclick = function() { handleBuy(this, title, priceNum, itemType); };
                        }
                    }
                }
            } else { 
                item.style.display = 'none'; 
            }
        });
    }

    // Toggle Empty State Messages
    const emptyMsg = document.getElementById(emptyMsgId);
    if(emptyMsg) {
        if (currentViewMode === 'purchased' && visibleCount === 0) { 
            emptyMsg.style.display = 'block'; 
        } else { 
            emptyMsg.style.display = 'none'; 
        }
    }
}

/** Handles clicking on a category icon on the Home screen */
function selectCategory(categoryCode, element) {
    let displayName = element.querySelector('span').innerText; 
    const grid = document.getElementById('examGrid');
    
    // Toggle off if clicking the already selected category
    if (currentSelectedCategory === categoryCode) {
        currentSelectedCategory = 'all'; 
        currentCategoryName = 'All Exams';
        element.classList.remove('selected-exam'); 
        grid.classList.remove('has-selection');
    } else {
        currentSelectedCategory = categoryCode; 
        currentCategoryName = displayName;
        
        document.querySelectorAll('.exam-item').forEach(item => item.classList.remove('selected-exam'));
        element.classList.add('selected-exam'); 
        grid.classList.add('has-selection');
        
        showToast(currentLang === 'hi' ? `${displayName} चुना गया!` : `${displayName} Selected!`, 'success');
    }
    
    // Update Target Header Text
    const targetHeader = document.getElementById('targetHeader');
    if(targetHeader) {
        targetHeader.innerText = currentSelectedCategory === 'all' 
            ? (currentLang==='hi' ? 'सभी परीक्षाएं' : 'All Exams Selection') 
            : displayName + ' Target';
    }
    
    // Apply filters immediately
    applyContentFilter('courses'); 
    applyContentFilter('test');
}


/* -------------------------------------------------------------------------- */
/* 4. FETCH DYNAMIC CONTENT FROM FIREBASE                                     */
/* -------------------------------------------------------------------------- */

/**
 * Main function called on App Load to fetch all Courses and Tests 
 * from the Firebase Database and inject them into the DOM as HTML cards.
 */
window.loadDynamicContent = async function() {
    
    // ================= 1. FETCH COURSES =================
    const courseContainer = document.getElementById('courseContainer');
    if(courseContainer) {
        try {
            const snapshot = await db.collection("courses").get();
            const emptyMsg = document.getElementById('emptyCourseMsg');
            
            courseContainer.innerHTML = '';
            if(emptyMsg) { 
                emptyMsg.style.display = 'none'; 
                courseContainer.appendChild(emptyMsg); 
            }

            let html = "";
            snapshot.forEach(doc => {
                let course = doc.data();
                html += `
                <div class="content-card filter-item" data-category="${course.category}">
                    <div class="course-banner">
                        <img src="${course.image || 'logo.png'}" alt="Course Banner">
                        <span class="discount-badge">${course.discountBadge || 'Premium'}</span>
                    </div>
                    <div class="advanced-course-body">
                        <h3>${course.title}</h3>
                        <div class="course-meta-info">
                            <span><i class="fas fa-history" style="color:var(--primary)"></i> Validity: ${course.validity || '1 Year'}</span>
                            <span><i class="far fa-calendar-alt" style="color:var(--primary)"></i> ${course.startDate || 'Started'}</span>
                        </div>
                        <div class="course-price-row">
                            <div class="price-calc">
                                <span class="old-price">₹${course.oldPrice || ''}</span>
                                <span class="new-price">₹${course.newPrice}</span>
                            </div>
                            <div class="course-action-btns">
                                <button class="buy-now-btn" onclick="handleBuy(this, '${course.title}', ${course.newPrice}, 'course')">Buy Now</button>
                            </div>
                        </div>
                    </div>
                </div>`;
            });
            courseContainer.insertAdjacentHTML('beforeend', html);
            applyContentFilter('courses'); 
        } catch (error) { 
            console.error("Error loading courses:", error); 
        }
    }

    // ================= 2. FETCH TESTS =================
    const testContainer = document.getElementById('testContainer');
    if(testContainer) {
        try {
            const snapshot = await db.collection("tests").get();
            const emptyMsg = document.getElementById('emptyTestMsg');
            
            testContainer.innerHTML = '';
            if(emptyMsg) { 
                emptyMsg.style.display = 'none'; 
                testContainer.appendChild(emptyMsg); 
            }

            let html = "";
            snapshot.forEach(doc => {
                let test = doc.data();
                let safeTitle = test.title ? test.title.replace(/'/g, "\\'") : '';
                
                // Track if it's a new advanced Test Series (Folders) or an old single test
                let isSeries = test.isTestSeries ? 'true' : 'false';
                
                html += `
                <div class="content-card filter-item" data-category="${test.category}" data-duration="${test.duration}" data-istestseries="${isSeries}">
                    <div class="course-banner" style="cursor:pointer;" onclick="openTestDetails('${safeTitle}')">
                        <img src="${test.image || 'logo.png'}" alt="Test Banner" style="object-fit:cover;">
                        <span class="discount-badge">${test.discountBadge || 'Mock Test'}</span>
                    </div>
                    <div class="advanced-course-body">
                        <h3 style="cursor:pointer;" onclick="openTestDetails('${safeTitle}')">${test.title}</h3>
                        <div class="course-meta-info">
                            <span><i class="far fa-clock" style="color:var(--primary)"></i> Duration: ${test.duration} Mins</span>
                            <span><i class="fas fa-layer-group" style="color:var(--primary)"></i> Test Series / Mock</span>
                        </div>
                        <div class="course-price-row">
                            <div class="price-calc">
                                <span class="old-price">${test.oldPrice ? '₹'+test.oldPrice : ''}</span>
                                <span class="new-price">₹${test.price}</span>
                            </div>
                            <div class="course-action-btns">
                                <button class="buy-now-btn" onclick="handleBuy(this, '${test.title}', ${test.price}, 'test')">Buy Now</button>
                            </div>
                        </div>
                    </div>
                </div>`;
            });
            testContainer.insertAdjacentHTML('beforeend', html);
            applyContentFilter('test'); 
        } catch (error) { 
            console.error("Error loading tests:", error); 
        }
    }
};