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

function handleBuy(button, title, price, type) {
    let user = getUserData();
    if (!user) return showToast("Please login first!", "error");
    
    if (!user.cart) user.cart = [];

    let purchasedArray = type === 'course' ? (user.purchasedCourses || []) : (user.purchasedTests || []);

    // 1. चेक करें कि क्या पहले से खरीदा हुआ है (Date ऑब्जेक्ट और स्ट्रिंग दोनों को सपोर्ट करेगा)
    let isAlreadyBought = purchasedArray.some(t => {
        let tTitle = typeof t === 'object' ? t.title : t;
        return tTitle && title && tTitle.trim().toLowerCase() === title.trim().toLowerCase();
    });

    if (isAlreadyBought) {
        let targetNav = type === 'course' ? document.querySelectorAll('.nav-item')[1] : document.querySelectorAll('.nav-item')[2];
        switchTab(type === 'course' ? 'courses' : 'test', targetNav, 'purchased');
        return;
    }

    // 2. फ्री कंटेंट ऑटो-बाय (Date के साथ)
    if (price === 0) {
        let purchaseObj = { title: title.trim(), date: new Date().toLocaleDateString() };
        if (type === 'course') user.purchasedCourses.push(purchaseObj);
        else user.purchasedTests.push(purchaseObj);
        
        saveUserData(user); // Firestore में सेव
        showToast(currentLang === 'hi' ? "फ्री कंटेंट सक्रिय हो गया!" : "Free Content Activated!", 'success');
        applyContentFilter(type === 'course' ? 'courses' : 'test'); 
        return;
    }

    // 3. Paid Content कार्ट में जोड़ना
    let exists = user.cart.find(item => item.title && item.title.trim().toLowerCase() === title.trim().toLowerCase());
    if(exists) { 
        showToast(currentLang === 'hi' ? "पहले से कार्ट में है!" : "Already in Cart!", 'error'); 
        return; 
    }

    user.cart.push({ title: title.trim(), price: parseInt(price), type: type }); 
    
    db.collection("users").doc(user.uid).update({ cart: user.cart }).then(() => {
        saveUserData(user);
        button.innerHTML = '<i class="fas fa-check"></i> ' + (currentLang === 'hi' ? "कार्ट में है" : "Added");
        button.style.backgroundColor = '#10b981'; 
        button.style.color = '#fff';
        button.onclick = null; 
        updateCartBadge(); 
        showToast(currentLang === 'hi' ? "कार्ट में जुड़ गया!" : "Added to Cart!", 'success');
    });
}

async function checkout() {
    let user = getUserData();
    if(!user || !user.cart || user.cart.length === 0) {
        showToast("Your cart is empty!", "error");
        return;
    }

    // 🔥 SMART LOGIC: 100% Promo Code या Coin से अमाउंट 0 होने पर सीधा अनलॉक
    if (window.currentCartTotal === 0) {
        let btn = document.querySelector('.checkout-box .btn-primary');
        let originalText = btn.innerText;
        btn.innerHTML = "Unlocking Free..."; 
        btn.disabled = true;

        try {
            let todayDate = new Date().toLocaleDateString();
            
            user.cart.forEach(item => {
                if(item.type === 'course') user.purchasedCourses.push({ title: item.title, date: todayDate });
                if(item.type === 'test') user.purchasedTests.push({ title: item.title, date: todayDate });
            });

            if(window.coinsUsedInCart > 0) {
                user.stats.coins -= window.coinsUsedInCart;
            }

            user.cart = [];
            await db.collection("users").doc(user.uid).update({
                purchasedCourses: user.purchasedCourses,
                purchasedTests: user.purchasedTests,
                "stats.coins": user.stats.coins,
                cart: []
            });

            saveUserData(user);
            showToast("🎉 Successfully Unlocked for Free!", "success");
            updateCartBadge();
            renderCart();
            switchTab('courses', document.querySelectorAll('.nav-item')[1], 'purchased'); 
        } catch(e) {
            showToast("Error processing request.", "error");
        } finally {
            if(btn) { btn.innerHTML = originalText; btn.disabled = false; }
        }
        return; // ₹0 होने पर UTR स्कैनर नहीं खुलेगा
    }
    
    // अगर पैसे देने हैं तो QR Code वाला डब्बा खोलो
    document.getElementById('payAmountTxt').innerText = `₹${window.currentCartTotal}`;
    document.getElementById('utrNumber').value = '';
    
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
        await db.collection("payments").add({
            uid: user.uid,
            name: user.name,
            email: user.email,
            phone: user.phone,
            amount: window.currentCartTotal,
            utr: utr,
            items: user.cart, 
            status: "Pending",
            date: new Date().toLocaleDateString(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        if(window.coinsUsedInCart > 0) {
            user.stats.coins -= window.coinsUsedInCart;
        }

        user.cart = [];
        await db.collection("users").doc(user.uid).update({ 
            cart: [],
            "stats.coins": user.stats.coins 
        });
        
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

    user.cart.splice(index, 1); 
    
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
let currentPromoType = 'none'; 

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
            
            if(data.courseCode && userInput === data.courseCode && data.courseDiscount > 0) {
                let limit = data.courseLimit || 0;
                let used = data.courseUsedCount || 0;
                
                if(limit > 0 && used >= limit) {
                    showToast("❌ Promo Code Expired (Limit Reached)!", "error");
                } else {
                    currentPromoType = 'course';
                    currentDiscountPercent = data.courseDiscount;
                    showToast(`🎉 Course Code Applied! ${data.courseDiscount}% OFF`, "success");
                }
            } 
            else if(data.testCode && userInput === data.testCode && data.testDiscount > 0) {
                let limit = data.testLimit || 0;
                let used = data.testUsedCount || 0;

                if(limit > 0 && used >= limit) {
                    showToast("❌ Promo Code Expired (Limit Reached)!", "error");
                } else {
                    currentPromoType = 'test';
                    currentDiscountPercent = data.testDiscount;
                    showToast(`🎉 Test Code Applied! ${data.testDiscount}% OFF`, "success");
                }
            } 
            else {
                currentPromoType = 'none';
                currentDiscountPercent = 0;
                showToast("❌ Invalid Promo Code!", "error");
            }
        }
    } catch(e) { 
        showToast("Error checking code!", "error"); 
    } finally {
        applyBtn.innerText = originalText;
        applyBtn.disabled = false;
        renderCart(); 
    }
}

function renderCart() {
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
                <button class="remove-btn" onclick="removeFromCart(${index})"><i class="fas fa-trash"></i></button>
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
    let maxCoinAllowed = Math.floor(finalTotal * 0.15); 
    let coinsToUse = 0;

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

function applyContentFilter(tabId) {
    const titlePrefix = currentSelectedCategory === 'all' ? (currentLang === 'hi' ? 'सभी' : 'All') : currentCategoryName;
    let user = getUserData(); 
    if(!user) return;

    const courseTitle = document.getElementById('coursePageTitle');
    const testTitle = document.getElementById('testPageTitle');
    
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
                isBought = purchasedArray.some(t => {
                    let tTitle = typeof t === 'object' ? t.title : t;
                    return tTitle && tTitle.trim().toLowerCase() === title.toLowerCase();
                });
            }
            
            let matchesCategory = (targetCategory === 'all' || itemCategory === targetCategory);
            let matchesPurchased = (currentViewMode === 'all' || isBought);

            if (matchesCategory && matchesPurchased) { 
                item.style.display = 'block'; 
                visibleCount++; 
                
                let btn = item.querySelector('.buy-now-btn') || item.querySelector('.explore-btn');
                let isSeries = item.getAttribute('data-istestseries') === 'true'; 
                
                if(btn) {
                    if(isBought) {
                        btn.innerHTML = '<i class="fas fa-folder-open"></i> ' + (currentLang === 'hi' ? 'सीरीज़ खोलें' : 'Open Series');
                        btn.style.backgroundColor = '#10b981'; 
                        btn.style.color = 'white';
                        btn.onclick = function() { 
                            if(tabId === 'courses') { openCourseDetails(title); } 
                            else { if(isSeries) { openTestFolders(title); } else { openTestInstructions(title, parseInt(testDuration)); } }
                        };
                    } else {
                        let existsInCart = user.cart && user.cart.find(c => c.title && c.title.trim().toLowerCase() === title.toLowerCase());
                        if(existsInCart) {
                            btn.innerHTML = '<i class="fas fa-check"></i> ' + (currentLang === 'hi' ? "कार्ट में है" : "Added");
                            btn.style.backgroundColor = '#10b981'; 
                            btn.style.color = '#fff';
                            btn.onclick = null;
                        } else {
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

    const emptyMsg = document.getElementById(emptyMsgId);
    if(emptyMsg) {
        if (currentViewMode === 'purchased' && visibleCount === 0) { emptyMsg.style.display = 'block'; } 
        else { emptyMsg.style.display = 'none'; }
    }
}

function selectCategory(categoryCode, element) {
    let displayName = element.querySelector('span').innerText; 
    const grid = document.getElementById('examGrid');
    
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
    
    const targetHeader = document.getElementById('targetHeader');
    if(targetHeader) {
        targetHeader.innerText = currentSelectedCategory === 'all' 
            ? (currentLang==='hi' ? 'सभी परीक्षाएं' : 'All Exams Selection') 
            : displayName + ' Target';
    }
    
    applyContentFilter('courses'); 
    applyContentFilter('test');
}

/* -------------------------------------------------------------------------- */
/* 4. FETCH DYNAMIC CONTENT FROM FIREBASE                                     */
/* -------------------------------------------------------------------------- */

window.loadDynamicContent = async function() {
    
    // ================= 1. FETCH COURSES =================
    const courseContainer = document.getElementById('courseContainer');
    if(courseContainer) {
        try {
            const snapshot = await db.collection("courses").get();
            const emptyMsg = document.getElementById('emptyCourseMsg');
            
            courseContainer.innerHTML = '';
            if(emptyMsg) { emptyMsg.style.display = 'none'; courseContainer.appendChild(emptyMsg); }

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
                                <span class="old-price">${course.oldPrice ? '₹'+course.oldPrice : ''}</span>
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
        } catch (error) { console.error("Error loading courses:", error); }
    }

    // ================= 2. FETCH TESTS =================
    const testContainer = document.getElementById('testContainer');
    if(testContainer) {
        try {
            const snapshot = await db.collection("tests").get();
            const emptyMsg = document.getElementById('emptyTestMsg');
            
            testContainer.innerHTML = '';
            if(emptyMsg) { emptyMsg.style.display = 'none'; testContainer.appendChild(emptyMsg); }

            let html = "";
            snapshot.forEach(doc => {
                let test = doc.data();
                let safeTitle = test.title ? test.title.replace(/'/g, "\\'") : '';
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
        } catch (error) { console.error("Error loading tests:", error); }
    }
};