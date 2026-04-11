// 1. Service Worker Registration (For Offline App & PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
        .then(reg => {
            console.log('Service Worker Registered Successfully!', reg.scope);
            // अगर कोई नया अपडेट आता है, तो तुरंत पेज रिफ्रेश करो
            reg.addEventListener('updatefound', () => {
                if (reg.installing) {
                    reg.installing.addEventListener('statechange', () => {
                        if (reg.installing.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('New update available. Refreshing...');
                            window.location.reload();
                        }
                    });
                }
            });
        })
        .catch(err => console.log('Service Worker Error', err));
    });
}
/* ========================================================================= */
/* 🚀 MAIN.JS - ऐप की शुरुआत, कोर्स प्लेयर, एग्जाम इंजन और स्मार्ट फीचर्स       */
/* यह फ़ाइल पूरे ऐप को चलाती है (लॉगिन चेक, होम पेज डेटा, वीडियो और टेस्ट)   */
/* ========================================================================= */

// -------------------------------------------------------------------------
// फ़ंक्शन 1: ऐप लॉगिन चेक (App Authentication Check)
// यह चेक करता है कि बच्चा पहले से लॉगिन है या नहीं। अगर नेट नहीं है तो एरर देगा।
// -------------------------------------------------------------------------

function runAppAuthCheck() {
    if(typeof firebase === 'undefined') {
        alert("Internet Connection Error! App could not load completely.");
        document.getElementById('spinnerSplashScreen').style.display = 'none';
        document.getElementById('authTab').classList.add('active');
        return;
    }

    firebase.auth().onAuthStateChanged((user) => {
        let spinner = document.getElementById('spinnerSplashScreen');
        let logoSplash = document.getElementById('logoSplashScreen'); 
        
        if (user) {
            db.collection("users").doc(user.uid).onSnapshot(doc => {
                if(doc.exists) {
                    currentUserData = doc.data(); 
                    if(currentUserData.isBlocked) {
                        alert("🚫 Your account has been BLOCKED by Admin. Please contact support.");
                        firebase.auth().signOut(); 
                        return;
                    }
                    initUserData(); 
                } else {
                    logoutUser(); 
                }
            }, err => {
                console.error("Database Error:", err);
                if(spinner) spinner.style.display = 'none';
                if(logoSplash) logoSplash.style.display = 'none';
                document.getElementById('bottomNav').style.display = 'none'; // 🔥 Hide Nav
                document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
                document.getElementById('authTab').classList.add('active');
            });
        } else {
            if(spinner) spinner.style.display = 'none';
            if(logoSplash) logoSplash.style.display = 'none';
            document.getElementById('bottomNav').style.display = 'none'; // 🔥 Hide Nav on Login Screen
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.getElementById('authTab').classList.add('active');
            switchAuthView('loginCard');
        }
    });
}

// -------------------------------------------------------------------------
// इवेंट: जब पूरी HTML (पेज) लोड हो जाए, तब क्या-क्या करना है
// -------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {

    // 1. अगर PDF देखने वाला पेज नहीं बना है, तो उसे बनाओ (In-App PDF Viewer)
    if (!document.getElementById('pdfViewerPage')) {
        const pdfViewerHTML = `
        <div id="pdfViewerPage" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--bg); z-index: 9999999; display: none; flex-direction: column;">
            <div style="background: var(--primary); padding: 15px 20px; display: flex; align-items: center; gap: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                <i class="fas fa-arrow-left" style="color: white; font-size: 1.2rem; cursor: pointer;" onclick="closeInAppPDF()"></i>
                <h2 id="pdfViewerTitle" style="color: white; font-size: 1.1rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; margin: 0;">Reading PDF</h2>
            </div>
            <div style="flex: 1; width: 100%; height: 100%; background: #fff;">
                <iframe id="pdfIframe" src="" style="width: 100%; height: 100%; border: none;"></iframe>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', pdfViewerHTML);
    }

    // 2. फोन नंबर वाले बॉक्स में अपने आप '+91' लगाना
    function setupPhoneFormatting(inputId) {
        let input = document.getElementById(inputId);
        if(!input) return;
        input.addEventListener('focus', function() { if(this.value.trim() === '') this.value = '+91 '; });
        input.addEventListener('input', function(e) {
            let rawNumbers = this.value.replace(/\D/g, ''); 
            if(rawNumbers.startsWith('91')) rawNumbers = rawNumbers.substring(2); 
            rawNumbers = rawNumbers.substring(0, 10); 
            this.value = rawNumbers.length > 0 ? '+91 ' + rawNumbers : '+91 ';
        });
    }
    setupPhoneFormatting('regPhone');
    setupPhoneFormatting('editProfilePhone');
    
    // 3. पुरानी सेव की हुई भाषा (Hindi/English) और डार्क मोड सेट करना
    const savedLang = localStorage.getItem('appLang');
    if(savedLang === 'hi') { currentLang = 'en'; toggleLanguage(); }
    updateDailyQuote();
    localStorage.removeItem('usersDB'); 

    // 5. थीम सेट करना
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeToggle();

    // 6. स्पलैश स्क्रीन (Splash Screen) का लॉजिक
    // अगर ऐप पहली बार खुला है तो लोगो दिखाओ, नहीं तो गोल घूमने वाला लोडर (Spinner)
    const logoSplash = document.getElementById('logoSplashScreen');
    const spinnerSplash = document.getElementById('spinnerSplashScreen');
    const isFirstLoad = !sessionStorage.getItem('appAlreadyOpened');

    if (isFirstLoad) {
        logoSplash.style.display = 'flex';
        sessionStorage.setItem('appAlreadyOpened', 'true'); 
        setTimeout(() => {
            logoSplash.style.opacity = '0';
            logoSplash.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                logoSplash.style.display = 'none';
                runAppAuthCheck(); // लॉगिन चेक करो
            }, 500);
        }, 2000); // 2 सेकंड बाद लोगो हटेगा
    } else {
        spinnerSplash.style.display = 'flex';
        runAppAuthCheck();
    }

    // 7. ऐप चालू होने के बाद एडमिन पैनल से लाइव डेटा मंगाना
    setTimeout(() => {
        syncAppWithAdmin();
        fetchAppLiveClasses();
        if(typeof window.loadDynamicContent === "function") window.loadDynamicContent();
    }, 1500);
    // 🔔 Ask Notification Permission
if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            console.log('Notification permission granted.');
        }
    });
}

// यह फंक्शन तब चलेगा जब एडमिन नई नोटिस डालेगा
db.collection("notifications").orderBy("timestamp", "desc").limit(1).onSnapshot((snap) => {
    snap.docChanges().forEach((change) => {
        if (change.type === "added") {
            let data = change.doc.data();
            let notiTime = data.timestamp ? data.timestamp.toMillis() : Date.now();
            let lastSeen = localStorage.getItem("lastSeenNotiTime") || 0;
            
            // अगर नोटिस नई है और यूजर ने परमिशन दी है, तो मोबाइल स्क्रीन पर पॉपअप दिखाओ
            if (notiTime > lastSeen && Notification.permission === 'granted') {
                new Notification(data.title, {
                    body: data.message,
                    icon: './logo.png' // आपके ऐप का लोगो
                });
            }
        }
    });
});
});

// -------------------------------------------------------------------------
// फ़ंक्शन: सर्च बॉक्स (Search Box Functionality)
// -------------------------------------------------------------------------
function handleSearch() {
    let input = document.getElementById('searchInput').value.toLowerCase();
    let searchableItems = document.querySelectorAll('.filter-item, .exam-item, .menu-item');
    searchableItems.forEach(item => {
        let text = item.innerText.toLowerCase();
        // जो टाइप किया है, अगर वो नाम में है तो दिखाओ, नहीं तो छुपा दो (none)
        item.style.display = text.includes(input) ? "" : "none"; 
    });
}

// -------------------------------------------------------------------------
// फ़ंक्शन: एडमिन पैनल से ऐप को सिंक करना (Dynamic App Controller)
// (बैनर, न्यूज़, मेन्टेनेंस मोड, नोटिफिकेशन आदि रियल-टाइम में अपडेट करना)
// -------------------------------------------------------------------------
function syncAppWithAdmin() {
    if(typeof db === 'undefined') return;
    
    // 1. न्यूज़, मोटिवेशनल कोट (Quote) और सिलेबस लिंक मंगाना
    db.collection("app_settings").doc("home_page").onSnapshot((doc) => {
        if (doc.exists) {
            let data = doc.data();
            let ticker = document.querySelector('.ticker-text');
            if(ticker && data.news) ticker.innerText = data.news;
            
            let quoteBox = document.getElementById('dailyQuoteText');
            if(quoteBox && data.quote) quoteBox.innerText = data.quote;
            
            window.globalSyllabusLink = data.syllabusLink || "";
        }
    });

    // 2. होम स्क्रीन के बटन के नाम बदलना (Categories & Menu Items)
    db.collection("app_settings").doc("home_ui").onSnapshot((doc) => {
        if (doc.exists) {
            let data = doc.data();
            let catItems = document.querySelectorAll('.exam-item span');
            if(catItems.length >= 4) {
                if(data.cat1) catItems[0].innerText = data.cat1;
                if(data.cat2) catItems[1].innerText = data.cat2;
                if(data.cat3) catItems[2].innerText = data.cat3;
                if(data.cat4) catItems[3].innerText = data.cat4;
            }
            
        }
    });

    // 3. Question of the Day (QoD) का डेटा मंगाना
    db.collection("app_settings").doc("qod_data").onSnapshot((doc) => {
        if(doc.exists) {
            let qData = doc.data();
            if(qData.questions && qData.questions.length > 0) {
                window.dynamicQoDConfig = {
                    positive: qData.positiveCoins || 2,
                    negative: qData.negativeCoins || 0,
                    questions: qData.questions
                };
            }
        }
    });

    // 4. मेन्टेनेंस मोड (जब ऐप बंद करना हो) - Admin Bypass
    db.collection("app_settings").doc("status").onSnapshot((doc) => {
        let mScreen = document.getElementById('maintenanceScreen');
        if (doc.exists) {
            let data = doc.data();
            
            // चेक करें कि करेंट यूजर एडमिन है या नहीं
            let currentUser = firebase.auth().currentUser;
            let isAdmin = currentUser && currentUser.email === "gauravkumarverma637@gmail.com";

            // अगर मेंटेनेंस मोड ON है और यूजर एडमिन "नहीं" है, तभी ताला लगाओ
            if(data.isMaintenance && !isAdmin) {
                if(mScreen) mScreen.style.display = 'flex'; // ताला लगाओ
                let mMsg = document.getElementById('maintenanceMsg');
                if(mMsg) mMsg.innerText = data.message || "We are updating our servers. Please check back soon.";
            } else {
                // एडमिन के लिए या नॉर्मल मोड में हमेशा खुला रहेगा
                if(mScreen) mScreen.style.display = 'none'; 
            }
        }
    });

    // 5. स्मार्ट ऑटो-स्लाइडिंग बैनर्स (Smart Banners with Dots)
    let bannerAutoScrollInterval;

    db.collection("app_settings").doc("smart_banners").onSnapshot((doc) => {
        let slider = document.getElementById('appBannerSlider');
        let dotsContainer = document.getElementById('bannerDots');
        if(!slider || !dotsContainer) return;
        
        slider.innerHTML = '';
        dotsContainer.innerHTML = '';
        clearInterval(bannerAutoScrollInterval); // पुराना टाइमर रोक दें
        
        if(doc.exists && doc.data().bannerList && doc.data().bannerList.length > 0) {
            let banners = doc.data().bannerList;

            banners.forEach((banner, index) => {
                // फोटो डालें और उस पर क्लिक फंक्शन लगाएं
                let clickAction = banner.link ? `onclick="handleSmartBannerClick('${banner.link}')"` : '';
                slider.innerHTML += `<img src="${banner.img}" ${clickAction} style="min-width: 100%; height: 160px; object-fit: cover; border-radius: 15px; scroll-snap-align: center; box-shadow: 0 8px 15px rgba(0,0,0,0.1); cursor:pointer;">`;
                
                // डॉट्स डालें (पहला डॉट एक्टिव रहेगा)
                dotsContainer.innerHTML += `<div class="banner-dot ${index === 0 ? 'active' : ''}"></div>`;
            });
            
            slider.style.display = 'flex';
            dotsContainer.style.display = 'flex';

            // SCROLL LISTENER: जब फोटो खिसकेगी, डॉट्स अपडेट होंगे
            slider.addEventListener('scroll', () => {
                let scrollPosition = slider.scrollLeft;
                let slideWidth = slider.clientWidth;
                let currentIndex = Math.round(scrollPosition / slideWidth);
                
                let allDots = dotsContainer.querySelectorAll('.banner-dot');
                allDots.forEach((dot, idx) => {
                    if(idx === currentIndex) dot.classList.add('active');
                    else dot.classList.remove('active');
                });
            });

            // AUTO SLIDE: हर 3 सेकंड में अपने आप फोटो बदलना
            let autoIndex = 0;
            bannerAutoScrollInterval = setInterval(() => {
                autoIndex++;
                if(autoIndex >= banners.length) autoIndex = 0; 
                slider.scrollTo({ left: slider.clientWidth * autoIndex, behavior: 'smooth' }); 
            }, 3000); 

        } else {
            // अगर बैनर नहीं हैं तो छुपा दो
            slider.style.display = 'none';
            dotsContainer.style.display = 'none';
        }
    });

    // ---------------------------------------------------------------------
    // फ़ंक्शन: स्मार्ट बैनर पर क्लिक करने पर कहाँ जाना है (Router)
    // ---------------------------------------------------------------------
    window.handleSmartBannerClick = function(link) {
        if(!link) return;
        
        // 1. अगर कोर्स खोलना है (उदा: course:Maths 2026)
        if(link.toLowerCase().startsWith('course:')) {
            let courseName = link.substring(7).trim(); 
            if(typeof openCourseDetails === 'function') openCourseDetails(courseName);
        } 
        // 2. अगर टेस्ट खोलना है (उदा: test:Mock Test 1)
        else if(link.toLowerCase().startsWith('test:')) {
            let testName = link.substring(5).trim(); 
            if(typeof openTestInstructions === 'function') openTestInstructions(testName, 60);
        } 
        // 3. अगर कोई वेबसाइट या यूट्यूब लिंक है
        else if(link.startsWith('http')) {
            window.open(link, '_blank');
        } 
        else {
            console.log("Unknown link format: " + link);
        }
    };
    
    // ---------------------------------------------------------------------
    // घंटी (Bell Icon), Notifications और Push Notification
    // ---------------------------------------------------------------------
    let bellIconDot = document.querySelector('.bell-icon .dot');
    let bellIconBtn = document.querySelector('.bell-icon');
    if (bellIconBtn) {
        bellIconBtn.onclick = () => {
            if (bellIconDot) bellIconDot.style.display = 'none';
            document.getElementById('notificationPage').style.display = 'flex';
            loadNotifications();
        };
    }
    
    // Push Notification Permission
    if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
    
    let currentUser = firebase.auth().currentUser;
    let uidKey = currentUser ? currentUser.uid : "guest";

    db.collection("notifications").orderBy("timestamp", "desc").onSnapshot((snap) => {
        let deletedNotis = JSON.parse(localStorage.getItem('deletedNotis_' + uidKey)) || [];
        let hasNew = false;
        
        let userCreationTime = currentUser ? new Date(currentUser.metadata.creationTime).getTime() : 0;
        let lastSeen = localStorage.getItem("lastSeenNotiTime_" + uidKey) || 0;
        
        snap.docChanges().forEach((change) => {
            let data = change.doc.data();
            let notiTime = data.timestamp ? data.timestamp.toMillis() : Date.now();
            
            // नया नोटिस आया है और डिलीट नहीं हुआ है
            if (!deletedNotis.includes(change.doc.id) && notiTime >= userCreationTime) {
                if (notiTime > lastSeen) hasNew = true;

                // मोबाइल स्क्रीन पर Push Notification भेजना (सिर्फ नई नोटिस पर)
                if (change.type === "added" && notiTime > lastSeen && Notification.permission === 'granted') {
                    new Notification(data.title, { body: data.message, icon: './logo.png' });
                }
            }
        });

        if (hasNew && bellIconDot) bellIconDot.style.display = 'block';
    });
}

// नोटिफिकेशन की लिस्ट लोड करना
async function loadNotifications() {
    let currentUser = firebase.auth().currentUser;
    if(!currentUser) return;
    
    let uidKey = currentUser.uid;
    let container = document.getElementById('notiListContainer');
    let deletedNotis = JSON.parse(localStorage.getItem('deletedNotis_' + uidKey)) || [];
    localStorage.setItem("lastSeenNotiTime_" + uidKey, Date.now());
    
    let userCreationTime = new Date(currentUser.metadata.creationTime).getTime();
    
    try {
        const snap = await db.collection("notifications").orderBy("timestamp", "desc").get();
        let html = '';
        snap.forEach(doc => {
            let data = doc.data();
            let notiTime = data.timestamp ? data.timestamp.toMillis() : 0;
            
            if (!deletedNotis.includes(doc.id) && notiTime >= userCreationTime) {
                html += `
                <div class="noti-item" id="noti-${doc.id}">
                    <h4>${data.title}</h4>
                    <p>${data.message}</p>
                    <span class="noti-date">${data.date}</span>
                    <i class="fas fa-trash-alt noti-del-btn" onclick="deleteAppNotification('${doc.id}')"></i>
                </div>`;
            }
        });
        container.innerHTML = html || '<div style="text-align:center; color:var(--text-gray); margin-top:20px;">No new notifications.</div>';
    } catch (e) { console.log(e); }
}

// नोटिफिकेशन डिलीट करना (अब हर यूज़र का डिलीट डेटा अलग सेव होगा)
window.deleteAppNotification = function(id) {
    let currentUser = firebase.auth().currentUser;
    if(!currentUser) return;
    
    let uidKey = currentUser.uid;
    let deletedNotis = JSON.parse(localStorage.getItem('deletedNotis_' + uidKey)) || [];
    deletedNotis.push(id);
    localStorage.setItem('deletedNotis_' + uidKey, JSON.stringify(deletedNotis));
    document.getElementById(`noti-${id}`).style.display = 'none';
}

// -------------------------------------------------------------------------
// फ़ंक्शन: लाइव क्लासेस लोड करना
// -------------------------------------------------------------------------
let allLiveClasses = [];
async function fetchAppLiveClasses() {
    if(typeof db === 'undefined') return;
    db.collection("live_classes").orderBy("createdAt", "desc").onSnapshot((snap) => {
        allLiveClasses = [];
        snap.forEach(doc => allLiveClasses.push(doc.data()));
        filterLiveClasses('LIVE', document.querySelector('.live-sub-tab.active') || document.querySelectorAll('.live-sub-tab')[0]); 
    });
}

// लाइव क्लास को LIVE, UPCOMING या COMPLETED के हिसाब से फ़िल्टर करना
function filterLiveClasses(status, element) {
    if(element) {
        document.querySelectorAll('.live-sub-tab').forEach(el => el.classList.remove('active'));
        element.classList.add('active');
    }
    let container = document.getElementById('liveClassContainer');
    if(!container) return;
    
    let filtered = allLiveClasses.filter(c => c.status === status);
    
    if(filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px 20px; color:var(--text-gray);">
            <i class="fas fa-video-slash" style="font-size:3rem; margin-bottom:10px; opacity:0.5;"></i><br>
            No ${status.toLowerCase()} classes right now.
        </div>`;
        return;
    }

    let html = '';
    filtered.forEach(cls => {
        let statusBadge = '';
        if(status === 'LIVE') statusBadge = `<span style="background: #ef4444; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: bold; animation: pulse 1.5s infinite;">🔴 LIVE NOW</span>`;
        if(status === 'UPCOMING') statusBadge = `<span style="background: #f59e0b; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: bold;">🟡 UPCOMING</span>`;
        if(status === 'COMPLETED') statusBadge = `<span style="background: #94a3b8; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: bold;">⚪ COMPLETED</span>`;

        html += `
        <div style="background: #000; border-radius: 15px; overflow: hidden; box-shadow: 0 6px 15px rgba(0,0,0,0.1); margin-bottom: 20px;">
            <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
                <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" src="https://www.youtube.com/embed/${cls.videoId}" allow="autoplay; fullscreen"></iframe>
            </div>
            <div style="padding: 15px; background: var(--white);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="font-size: 1rem; font-weight: 800; color: var(--text); flex:1; padding-right:10px;">${cls.title}</h3>
                    ${statusBadge}
                </div>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

// =========================================================================
// 🎓 प्रीमियम कोर्सेज का फोल्डर सिस्टम (Subject -> Topic -> Video/PDF)
// =========================================================================

let activeCourseSyllabus = [];
let currentNavLevel = 'subject'; 
let selectedSubIndex = -1;
let selectedTopicIndex = -1;
let mainCourseTitle = "";

// 1. कोर्स की डिटेल खोलना
window.openCourseDetails = async function(courseTitle) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById('courseDetailsPage').classList.add('active');
    
    document.getElementById('videoPlayerWrapper').style.display = 'none';
    document.getElementById('courseVideoPlayer').src = "";
    
    mainCourseTitle = courseTitle;
    document.getElementById('openedCourseTitle').innerText = courseTitle;
    const contentBox = document.getElementById('courseContentArea');
    
    contentBox.innerHTML = '<div style="text-align:center; padding:50px; color:#aaa;"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Loading...</div>';

    try {
        const snapshot = await db.collection("courses").where("title", "==", courseTitle).get();
        if(snapshot.empty) {
            contentBox.innerHTML = '<p style="text-align:center; color:#ef4444;">Content not found!</p>';
            return;
        }

        activeCourseSyllabus = snapshot.docs[0].data().syllabus || [];
        renderSubjectsUI(); 

    } catch (error) {
        console.error(error);
        contentBox.innerHTML = '<p style="text-align:center; color:#ef4444;">Failed to load data.</p>';
    }
};

// 2. सब्जेक्ट (Subjects) की लिस्ट दिखाना
function renderSubjectsUI() {
    currentNavLevel = 'subject';
    document.getElementById('openedCourseTitle').innerText = mainCourseTitle;
    document.getElementById('videoPlayerWrapper').style.display = 'none'; 
    document.getElementById('courseVideoPlayer').src = "";

    const contentBox = document.getElementById('courseContentArea');
    if(activeCourseSyllabus.length === 0) {
        contentBox.innerHTML = '<p style="text-align:center; color:#aaa; margin-top:30px;">No content added by Admin yet.</p>';
        return;
    }

    let html = '';
    activeCourseSyllabus.forEach((sub, index) => {
        html += `
        <div class="edtech-folder-card" onclick="renderTopicsUI(${index})">
            <div class="edtech-folder-num">${index + 1}</div>
            <div class="edtech-folder-title">${sub.subjectName}</div>
        </div>`;
    });
    contentBox.innerHTML = html;
    window.scrollTo({ top: 0 });
}

// 3. टॉपिक (Topics) की लिस्ट दिखाना
function renderTopicsUI(subIndex) {
    currentNavLevel = 'topic';
    selectedSubIndex = subIndex;
    let subjectObj = activeCourseSyllabus[subIndex];
    document.getElementById('openedCourseTitle').innerText = subjectObj.subjectName;

    const contentBox = document.getElementById('courseContentArea');
    let topics = subjectObj.topics || [];

    if(topics.length === 0) {
        contentBox.innerHTML = '<p style="text-align:center; color:#aaa; margin-top:30px;">No topics available in this subject.</p>';
        return;
    }

    let html = '';
    topics.forEach((topic, index) => {
        html += `
        <div class="edtech-folder-card" onclick="renderContentsUI(${subIndex}, ${index})">
            <div class="edtech-folder-num">${index + 1}</div>
            <div class="edtech-folder-title">${topic.topicName}</div>
        </div>`;
    });
    contentBox.innerHTML = html;
    window.scrollTo({ top: 0 });
}

// 4. वीडियोस और PDF (Content) की लिस्ट दिखाना
function renderContentsUI(subIndex, topicIndex) {
    currentNavLevel = 'content';
    selectedTopicIndex = topicIndex;
    let topicObj = activeCourseSyllabus[subIndex].topics[topicIndex];
    document.getElementById('openedCourseTitle').innerText = topicObj.topicName;

    const contentBox = document.getElementById('courseContentArea');
    let contents = topicObj.contents || [];

    if(contents.length === 0) {
        contentBox.innerHTML = '<p style="text-align:center; color:#aaa; margin-top:30px;">No videos or PDFs available.</p>';
        return;
    }

    let html = '';
    contents.forEach((item) => {
        let isVideo = item.type === 'video';
        if(isVideo) {
            // 🌟 यहाँ class="edtech-content-card type-video" जोड़ा गया है
            html += `
            <div class="edtech-content-card type-video">
                
                <div class="content-top-row">
                    <div class="content-thumbnail">
                        <img src="https://img.youtube.com/vi/${extractYouTubeID(item.link)}/hqdefault.jpg" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <i class="fab fa-youtube" style="display:none; font-size:2rem;"></i>
                    </div>
                    <div class="content-title-text">${item.title}</div>
                </div>
                <div class="content-action-row">
                    <button class="ed-btn" onclick="playPremiumVideo('${item.link}', '${item.title}')"><i class="fas fa-play"></i> Watch</button>
                    <button class="ed-btn"><i class="fas fa-headphones"></i> Listen</button>
                    <button class="ed-btn"><i class="fas fa-share-alt"></i> Share</button>
                </div>
            </div>`;
        } else {
            // 🌟 यहाँ Bookmark की जगह Download का आइकॉन और फंक्शन लगा दिया है
            html += `
            <div class="edtech-content-card type-pdf">
                <button class="ed-icon-btn" onclick="downloadAppPDF('${item.link}', '${item.title}')"><i class="fas fa-download"></i></button>
                <div class="content-top-row">
                    <div class="content-thumbnail" style="border-color: #fff;">
                        <i class="fas fa-file-pdf" style="color: #ef4444; font-size: 2.5rem;"></i>
                        <span style="color:red; font-size:0.6rem; font-weight:bold; margin-top:5px;">PDF</span>
                    </div>
                    <div class="content-title-text">${item.title}</div>
                </div>
                <div class="content-action-row">
                    <button class="ed-btn" onclick="openInAppPDF('${item.link}', '${item.title}')"><i class="fas fa-book-open"></i> Read</button>
                    <button class="ed-btn"><i class="fas fa-share-alt"></i> Share</button>
                </div>
            </div>`;
        }
    });
    contentBox.innerHTML = html;
    window.scrollTo({ top: 0 });
    
    // 🌟 जैसे ही टॉपिक खुले, डिफ़ॉल्ट रूप से सिर्फ 'Class' (Video) टैब दिखाएं
    filterCourseContent('video'); 
}

// बैक बटन लॉजिक
window.handleCourseBackBtn = function() {
    if(currentNavLevel === 'content') {
        renderTopicsUI(selectedSubIndex); 
    } else if (currentNavLevel === 'topic') {
        renderSubjectsUI(); 
    } else {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById('courses').classList.add('active'); 
        document.getElementById('videoPlayerWrapper').style.display = 'none';
        document.getElementById('courseVideoPlayer').src = "";
    }
}

// वीडियो प्ले करना
// =========================================================================
// 🎥 YOUTUBE VIDEO CONTROLLER (PIRACY PROTECTED & CUSTOM CONTROLS)
// =========================================================================
let globalYtPlayer = null;

// यह फंक्शन YouTube API अपने आप कॉल करता है
function onYouTubeIframeAPIReady() {
    globalYtPlayer = new YT.Player('courseVideoPlayer', {
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
}

// वीडियो Play या Pause होने पर बीच वाले बटन का आइकॉन बदलना
function onPlayerStateChange(event) {
    let ppBtn = document.getElementById('customPlayPauseBtn');
    if(ppBtn) {
        if (event.data == YT.PlayerState.PLAYING) {
            ppBtn.innerHTML = '<i class="fas fa-pause"></i>'; // वीडियो चल रहा है तो Pause आइकॉन
        } else if (event.data == YT.PlayerState.PAUSED || event.data == YT.PlayerState.ENDED) {
            ppBtn.innerHTML = '<i class="fas fa-play"></i>'; // वीडियो रुका है तो Play आइकॉन
        }
    }
}

// 1. Play/Pause टॉगल करने का फंक्शन (शील्ड पर या बटन पर क्लिक करने से)
window.togglePlayPause = function() {
    if (globalYtPlayer && typeof globalYtPlayer.getPlayerState === 'function') {
        let state = globalYtPlayer.getPlayerState();
        if (state == 1) { // 1 मतलब PLAYING
            globalYtPlayer.pauseVideo();
        } else {
            globalYtPlayer.playVideo();
        }
    }
};

// 2. 10 सेकंड आगे/पीछे करने का फंक्शन
window.skipVideo = function(seconds) {
    if (globalYtPlayer && typeof globalYtPlayer.getCurrentTime === 'function') {
        let currentTime = globalYtPlayer.getCurrentTime();
        globalYtPlayer.seekTo(currentTime + seconds, true);
    }
};

// =========================================================================
// 🎥 YOUTUBE VIDEO CONTROLLER (PIRACY PROTECTED & CUSTOM CONTROLS)
// =========================================================================


// API Ready होने पर प्लेयर को जोड़ना
function onYouTubeIframeAPIReady() {
    globalYtPlayer = new YT.Player('courseVideoPlayer', {
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerStateChange(event) {
    let ppBtn = document.getElementById('customPlayPauseBtn');
    if(!ppBtn) return;
    
    if (event.data == YT.PlayerState.PLAYING) {
        ppBtn.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        ppBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}

window.togglePlayPause = function() {
    if (globalYtPlayer && typeof globalYtPlayer.getPlayerState === 'function') {
        let state = globalYtPlayer.getPlayerState();
        if (state == 1) { 
            globalYtPlayer.pauseVideo();
        } else {
            globalYtPlayer.playVideo();
        }
    }
};

window.skipVideo = function(seconds) {
    if (globalYtPlayer && typeof globalYtPlayer.getCurrentTime === 'function') {
        let currentTime = globalYtPlayer.getCurrentTime();
        globalYtPlayer.seekTo(currentTime + seconds, true);
    }
};

window.playPremiumVideo = function(link, title) {
    let videoId = extractYouTubeID(link);
    document.getElementById('playingVideoTitle').innerText = title;
    
    // controls=0 और disablekb=1 से सब कुछ साफ़ हो जाएगा
    let ytUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&disablekb=1&fs=0&modestbranding=1&playsinline=1&rel=0&enablejsapi=1`;
    
    let iframe = document.getElementById('courseVideoPlayer');
    iframe.src = ytUrl;
    
    if (globalYtPlayer && typeof globalYtPlayer.loadVideoById === 'function') {
        globalYtPlayer.loadVideoById(videoId);
    }
    
    document.getElementById('courseHeaderDark').style.display = 'none'; 
    document.getElementById('videoPlayerWrapper').style.display = 'flex'; // flex करने से UI सही बैठेगा
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.closeVideoPlayer = function() {
    if (globalYtPlayer && typeof globalYtPlayer.stopVideo === 'function') {
        globalYtPlayer.stopVideo();
    }
    let iframe = document.getElementById('courseVideoPlayer');
    if(iframe) iframe.src = ""; 
    
    document.getElementById('videoPlayerWrapper').style.display = 'none';
    document.getElementById('courseHeaderDark').style.display = 'flex';
};

// वीडियो बंद करने पर API को भी स्टॉप करना
window.closeVideoPlayer = function() {
    if (globalYtPlayer && typeof globalYtPlayer.stopVideo === 'function') {
        globalYtPlayer.stopVideo();
    }
    let iframe = document.getElementById('courseVideoPlayer');
    if(iframe) iframe.src = ""; 
    
    document.getElementById('videoPlayerWrapper').style.display = 'none';
    document.getElementById('courseHeaderDark').style.display = 'flex';
};


function extractYouTubeID(url) {
    // यह नया फार्मूला Live, Shorts, Embed और नॉर्मल सभी वीडियो की ID निकाल लेगा
    let regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    let match = url.match(regExp);
    return (match && match[1]) ? match[1] : url;
}

// =========================================================================
// 📝 एग्जाम इंजन लॉजिक (REAL EXAM ENGINE) - नंबर और टाइमर के साथ
// =========================================================================

let examTimerInterval;
let currentTestConfig = {}; 
let testLanguage = 'en';
let realTestQuestions = []; 
let currentQuestionIndex = 0;
let userAnswers = {}; 

// 1. टेस्ट शुरू करने से पहले इंस्ट्रक्शन दिखाना
window.openTestInstructions = async function(testTitle, durationMinutes) {
    document.getElementById('instTestTitle').innerText = testTitle;
    document.getElementById('examInstructionPage').style.display = 'flex';

    let startBtn = document.querySelector('.btn-start-exam');
    startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading Test...';
    startBtn.disabled = true;

    try {
        const snapshot = await db.collection("tests").where("title", "==", testTitle).get();
        if (snapshot.empty) {
            alert("Error: Test content not found!");
            document.getElementById('examInstructionPage').style.display = 'none';
            return;
        }

        let testData = snapshot.docs[0].data();
        currentTestConfig = { 
            title: testData.title, 
            duration: testData.duration || durationMinutes,
            instructions: testData.instructions || '' 
        };
        realTestQuestions = testData.questions || [];

        let instBox = document.querySelector('.inst-list');
        if (testData.instructions && testData.instructions.trim() !== '') {
            instBox.innerHTML = `<li>${testData.instructions.replace(/\n/g, '<br><li>')}</li>`;
        }

        startBtn.innerHTML = 'I am ready to begin <i class="fas fa-arrow-right"></i>';
        startBtn.disabled = false;

    } catch (error) {
        console.error("Test Load Error:", error);
        alert("Failed to load test from server.");
        document.getElementById('examInstructionPage').style.display = 'none';
    }
};

// 2. असली टेस्ट स्क्रीन खोलना
window.proceedToTest = function() {
    if (realTestQuestions.length === 0) {
        alert("This test has no questions! Please contact admin.");
        return;
    }

    testLanguage = document.getElementById('examLangSelect').value; 
    document.getElementById('examInstructionPage').style.display = 'none';
    
    // 🔥 REFRESH FIX: चेक करें कि क्या टेस्ट पहले से चल रहा था?
    let savedSession = JSON.parse(localStorage.getItem('activeTestSession_' + currentTestConfig.title));
    
    if (savedSession) {
        currentQuestionIndex = savedSession.currentIndex || 0;
        userAnswers = savedSession.answers || {};
    } else {
        currentQuestionIndex = 0;
        userAnswers = {};
    }
    
    document.getElementById('examEnginePage').style.display = 'flex';
    document.getElementById('examTestTitle').innerText = currentTestConfig.title;
    
    loadQuestionUI(); 
    startExamTimer(currentTestConfig.duration * 60); 
};

// 3. सवाल और ऑप्शंस लोड करना
function loadQuestionUI() {
    let qData = realTestQuestions[currentQuestionIndex];
    document.getElementById('examQNo').innerText = currentQuestionIndex + 1;
    
    // टॉप बार में असली (+ और -) मार्क्स दिखाना
    let marksBadge = document.querySelector('.q-marks');
    if(marksBadge) {
        marksBadge.innerHTML = `<i class="fas fa-check-circle"></i> +${currentTestConfig.positiveMarks || 2} &nbsp;|&nbsp; <i class="fas fa-times-circle" style="color:#ef4444;"></i> -${currentTestConfig.negativeMarking || 0}`;
    }
    
    let questionText = testLanguage === 'hi' ? (qData.qHi || qData.qEn) : (qData.qEn || qData.qHi);
    document.getElementById('examQuestionText').innerText = questionText;
    
    let options = testLanguage === 'hi' ? (qData.optsHi || qData.optsEn) : (qData.optsEn || qData.optsHi);
    let optsHtml = '';
    let letters = ['A', 'B', 'C', 'D'];
    
    if (options && options.length > 0) {
        options.forEach((opt, index) => {
            let isChecked = userAnswers[currentQuestionIndex] === index ? "checked" : "";
            optsHtml += `
                <label class="option-label" onclick="saveAnswer(${currentQuestionIndex}, ${index})">
                    <input type="radio" name="q_opt" ${isChecked}> 
                    <span style="font-weight:800; color:var(--primary); margin-right:8px;">(${letters[index]})</span> ${opt}
                </label>
            `;
        });
    }
    document.getElementById('examOptionsArea').innerHTML = optsHtml;
    document.getElementById('btnExamPrev').style.display = currentQuestionIndex === 0 ? 'none' : 'flex';
    
    let nextBtn = document.getElementById('btnExamNext');
    if (currentQuestionIndex === realTestQuestions.length - 1) {
        nextBtn.innerHTML = 'Submit Test <i class="fas fa-check-circle"></i>';
        nextBtn.style.background = '#ef4444'; 
    } else {
        nextBtn.innerHTML = 'Save & Next <i class="fas fa-chevron-right"></i>';
        nextBtn.style.background = '#10b981'; 
    }
}

window.saveAnswer = function(qIndex, optIndex) {
    userAnswers[qIndex] = optIndex;
    let radios = document.querySelectorAll('input[name="q_opt"]');
    radios[optIndex].checked = true;
    
    // 🔥 REFRESH FIX: हर टिक पर डेटा ब्राउज़र में सेव करें
    localStorage.setItem('activeTestSession_' + currentTestConfig.title, JSON.stringify({
        currentIndex: currentQuestionIndex,
        answers: userAnswers
    }));
};

// अगला और पिछला सवाल
window.nextQuestion = function() {
    if (currentQuestionIndex < realTestQuestions.length - 1) {
        currentQuestionIndex++;
        loadQuestionUI();
    } else { submitRealExam(); }
};

window.prevQuestion = function() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestionUI();
    }
};

// 4. टेस्ट सबमिट करना और नंबर कैलकुलेट करना
window.submitRealExam = function() {
    clearInterval(examTimerInterval); 
    document.getElementById('examEnginePage').style.display = 'none'; 
    
    // 🔥 REFRESH FIX: टेस्ट ख़त्म होने पर सेव किया हुआ डेटा डिलीट कर दें
    localStorage.removeItem('activeTestSession_' + currentTestConfig.title);
    localStorage.removeItem('testEndTime_' + currentTestConfig.title);
    
    let correct = 0; let wrong = 0; let skipped = 0;
    
    realTestQuestions.forEach((q, index) => {
        if(userAnswers[index] === undefined) { skipped++; } 
        else if(userAnswers[index] === q.ans) { correct++; } 
        else { wrong++; }
    });

    let posMarkValue = currentTestConfig.positiveMarks || 2;
    let negMarkValue = currentTestConfig.negativeMarking || 0;
    let totalMarks = (correct * posMarkValue) - (wrong * negMarkValue);
    if(totalMarks < 0) totalMarks = 0;

    let maxMarks = realTestQuestions.length * posMarkValue;
    let accuracy = correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0;

    document.getElementById('resTotalScore').innerText = `${totalMarks} / ${maxMarks}`;
    document.getElementById('resCorrect').innerText = correct;
    document.getElementById('resWrong').innerText = wrong;
    document.getElementById('resSkipped').innerText = skipped;
    document.getElementById('resAccuracy').innerText = accuracy + "%";
    
    let user = getUserData();
    if(user) {
        if(!user.testLogs) user.testLogs = [];
        user.testLogs.push({ testTitle: currentTestConfig.title, score: totalMarks, maxMarks: maxMarks, accuracy: accuracy, date: new Date().toLocaleDateString() });
        user.stats.testsTaken = (user.stats.testsTaken || 0) + 1;
        let totalAcc = user.testLogs.reduce((sum, log) => sum + (log.accuracy || 0), 0);
        user.stats.avgScore = Math.round(totalAcc / user.testLogs.length);
        saveUserData(user); 
    }
    document.getElementById('examResultPage').style.display = 'flex';
};


window.closeExamEngine = function() { document.getElementById('examResultPage').style.display = 'none'; };

// टाइमर का लॉजिक
function startExamTimer(totalSeconds) {
    clearInterval(examTimerInterval);
    let display = document.getElementById('examTimerDisplay');
    display.parentElement.style.background = "rgba(0,0,0,0.25)";
    display.parentElement.style.color = "white";
    
    // 🔥 REFRESH FIX: अगर पहले से टाइमर सेव है तो वहीं से शुरू करो
    let savedEndTime = localStorage.getItem('testEndTime_' + currentTestConfig.title);
    let endTime;
    
    if (savedEndTime && Number(savedEndTime) > Date.now()) {
        endTime = Number(savedEndTime); // पुराना समय
    } else {
        endTime = Date.now() + (totalSeconds * 1000); // नया समय
        localStorage.setItem('testEndTime_' + currentTestConfig.title, endTime);
    }
    
    examTimerInterval = setInterval(function () {
        let remainingSeconds = Math.round((endTime - Date.now()) / 1000);
        
        if (remainingSeconds <= 0) {
            clearInterval(examTimerInterval);
            display.textContent = "00:00";
            submitRealExam(); 
            return;
        }

        let minutes = parseInt(remainingSeconds / 60, 10);
        let seconds = parseInt(remainingSeconds % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;
        display.textContent = minutes + ":" + seconds;

        if(remainingSeconds <= 60) display.parentElement.style.background = "#ef4444"; 
    }, 1000);
}



// =========================================================================
// 📄 इन-ऐप PDF व्यूअर (In-App PDF Viewer)
// =========================================================================

window.openInAppPDF = function(link, title) {
    let finalLink = link;
    // अगर गूगल ड्राइव का लिंक है, तो उसे प्रीव्यू मोड में बदलना
    if(link.includes("drive.google.com") && link.includes("/view")) {
        finalLink = link.replace("/view", "/preview").split("?")[0];
    } else if(link.endsWith(".pdf")) {
        finalLink = `https://docs.google.com/viewer?url=${encodeURIComponent(link)}&embedded=true`;
    }
    document.getElementById('pdfViewerTitle').innerText = title;
    document.getElementById('pdfViewerPage').style.display = 'flex';
    document.getElementById('pdfIframe').src = finalLink;
};

window.closeInAppPDF = function() {
    document.getElementById('pdfViewerPage').style.display = 'none';
    document.getElementById('pdfIframe').src = ""; 
};

// =========================================================================
// 📁 टेस्ट सीरीज फोल्डर सिस्टम (Test Series Hierarchical Nav)
// =========================================================================

let activeTestSyllabus = [];
let currentTestNavLevel = 'subject'; 
let selTSub = -1, selTSec = -1, selTTop = -1;
let mainTestSeriesTitle = "";

window.openTestFolders = async function(seriesTitle) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById('testFolderPage').classList.add('active');
    
    mainTestSeriesTitle = seriesTitle;
    document.getElementById('openedTestSeriesTitle').innerText = seriesTitle;
    document.getElementById('testBreadcrumb').innerHTML = `<i class="fas fa-home"></i> Home`;
    
    const contentBox = document.getElementById('testContentArea');
    contentBox.innerHTML = '<div style="text-align:center; padding:50px; color:#aaa;"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Loading Folders...</div>';

    try {
        const snapshot = await db.collection("tests").where("title", "==", seriesTitle).get();
        if(snapshot.empty) {
            contentBox.innerHTML = '<p style="text-align:center; color:#ef4444;">No content found!</p>';
            return;
        }

        let testData = snapshot.docs[0].data();
        window.activeTestRootData = testData; // पूरे टेस्ट की सेटिंग सेव की
        activeTestSyllabus = testData.syllabus || [];
        renderTestSubjectsUI(); 

    } catch (error) {
        console.error(error);
        contentBox.innerHTML = '<p style="text-align:center; color:#ef4444;">Failed to load data.</p>';
    }
};

function renderTestSubjectsUI() {
    currentTestNavLevel = 'subject';
    document.getElementById('openedTestSeriesTitle').innerText = mainTestSeriesTitle;
    document.getElementById('testBreadcrumb').innerHTML = `<i class="fas fa-home"></i> Home`;

    const contentBox = document.getElementById('testContentArea');
    if(activeTestSyllabus.length === 0) return contentBox.innerHTML = '<p style="text-align:center; color:#aaa;">No content added by Admin yet.</p>';

    let html = '';
    activeTestSyllabus.forEach((sub, index) => {
        html += `
        <div class="edtech-folder-card" onclick="renderTestSectionsUI(${index})">
            <div class="edtech-folder-num" style="background:#3b82f6;"><i class="fas fa-book"></i></div>
            <div class="edtech-folder-title">${sub.subjectName}</div>
            <i class="fas fa-chevron-right" style="padding: 18px 15px; color:#cbd5e1;"></i>
        </div>`;
    });
    contentBox.innerHTML = html;
}

function renderTestSectionsUI(subIdx) {
    currentTestNavLevel = 'section'; selTSub = subIdx;
    let subObj = activeTestSyllabus[subIdx];
    document.getElementById('openedTestSeriesTitle').innerText = subObj.subjectName;
    document.getElementById('testBreadcrumb').innerHTML = `<span onclick="renderTestSubjectsUI()" style="cursor:pointer;"><i class="fas fa-home"></i> Home</span> > ${subObj.subjectName}`;

    const contentBox = document.getElementById('testContentArea');
    let sections = subObj.sections || [];
    if(sections.length === 0) return contentBox.innerHTML = '<p style="text-align:center; color:#aaa;">No sections available.</p>';

    let html = '';
    sections.forEach((sec, index) => {
        html += `
        <div class="edtech-folder-card" onclick="renderTestContentsUI(${subIdx}, ${index})">
            <div class="edtech-folder-num" style="background:#8b5cf6;"><i class="fas fa-layer-group"></i></div>
            <div class="edtech-folder-title">${sec.sectionName}</div>
            <i class="fas fa-chevron-right" style="padding: 18px 15px; color:#cbd5e1;"></i>
        </div>`;
    });
    contentBox.innerHTML = html;
}

function renderTestContentsUI(subIdx, secIdx) {
    currentTestNavLevel = 'content'; selTSub = subIdx; selTSec = secIdx;
    let secObj = activeTestSyllabus[subIdx].sections[secIdx];
    document.getElementById('openedTestSeriesTitle').innerText = secObj.sectionName;
    document.getElementById('testBreadcrumb').innerHTML = `<span onclick="renderTestSubjectsUI()" style="cursor:pointer;"><i class="fas fa-home"></i> Home</span> > <span onclick="renderTestSectionsUI(${subIdx})" style="cursor:pointer;">${activeTestSyllabus[subIdx].subjectName}</span> > ${secObj.sectionName}`;

    const contentBox = document.getElementById('testContentArea');
    let topics = secObj.topics || [];
    let directTests = secObj.directTests || [];
    let html = '';

    topics.forEach((top, index) => {
        html += `
        <div class="edtech-folder-card" onclick="renderTopicTestsUI(${subIdx}, ${secIdx}, ${index})" style="border-left: 4px solid #f59e0b;">
            <div class="edtech-folder-num" style="background:#f59e0b; color:white;"><i class="fas fa-folder"></i></div>
            <div class="edtech-folder-title">${top.topicName}</div>
            <i class="fas fa-chevron-right" style="padding: 18px 15px; color:#cbd5e1;"></i>
        </div>`;
    });

    directTests.forEach((test) => {
        let qCount = test.questions ? test.questions.length : 0;
        let testJson = encodeURIComponent(JSON.stringify(test)); 
        html += `
        <div class="edtech-content-card" style="border-left: 4px solid #10b981;">
            <div class="content-top-row">
                <div class="content-thumbnail" style="background:#ecfdf5; border-color:#10b981;">
                    <i class="fas fa-file-signature" style="color:#10b981;"></i>
                </div>
                <div class="content-title-text">
                    ${test.title}
                    <div style="font-size:0.75rem; color:#94a3b8; font-weight:normal; margin-top:5px;">
                        <i class="far fa-clock"></i> ${test.duration} Mins &nbsp;|&nbsp; <i class="fas fa-list-ol"></i> ${qCount} Qs
                    </div>
                </div>
            </div>
            <div class="content-action-row">
                <button class="ed-btn" style="width:100%; background:#10b981; color:white; border:none; padding:10px;" onclick="startSeriesTest('${testJson}')">
                    <i class="fas fa-play-circle"></i> Start Test
                </button>
            </div>
        </div>`;
    });

    if(html === '') return contentBox.innerHTML = '<p style="text-align:center; color:#aaa;">Empty section.</p>';
    contentBox.innerHTML = html;
}

function renderTopicTestsUI(subIdx, secIdx, topIdx) {
    currentTestNavLevel = 'topic_test'; selTTop = topIdx;
    let topObj = activeTestSyllabus[subIdx].sections[secIdx].topics[topIdx];
    document.getElementById('openedTestSeriesTitle').innerText = topObj.topicName;
    
    let breadcrumb = `<span onclick="renderTestSubjectsUI()" style="cursor:pointer;"><i class="fas fa-home"></i> Home</span> > 
                      <span onclick="renderTestSectionsUI(${subIdx})" style="cursor:pointer;">${activeTestSyllabus[subIdx].subjectName}</span> > 
                      <span onclick="renderTestContentsUI(${subIdx}, ${secIdx})" style="cursor:pointer;">${activeTestSyllabus[subIdx].sections[secIdx].sectionName}</span> > 
                      ${topObj.topicName}`;
    document.getElementById('testBreadcrumb').innerHTML = breadcrumb;

    const contentBox = document.getElementById('testContentArea');
    let tests = topObj.tests || [];

    if(tests.length === 0) return contentBox.innerHTML = '<p style="text-align:center; color:#aaa;">No tests in this topic.</p>';

    let html = '';
    tests.forEach((test) => {
        let qCount = test.questions ? test.questions.length : 0;
        let testJson = encodeURIComponent(JSON.stringify(test)); 
        html += `
        <div class="edtech-content-card" style="border-left: 4px solid #10b981;">
            <div class="content-top-row">
                <div class="content-thumbnail" style="background:#ecfdf5; border-color:#10b981;">
                    <i class="fas fa-file-alt" style="color:#10b981;"></i>
                </div>
                <div class="content-title-text">
                    ${test.title}
                    <div style="font-size:0.75rem; color:#94a3b8; font-weight:normal; margin-top:5px;">
                        <i class="far fa-clock"></i> ${test.duration} Mins &nbsp;|&nbsp; <i class="fas fa-list-ol"></i> ${qCount} Qs
                    </div>
                </div>
            </div>
            <div class="content-action-row">
                <button class="ed-btn" style="width:100%; background:#10b981; color:white; border:none; padding:10px;" onclick="startSeriesTest('${testJson}')">
                    <i class="fas fa-play-circle"></i> Start Test
                </button>
            </div>
        </div>`;
    });
    contentBox.innerHTML = html;
}

window.handleTestBackBtn = function() {
    if(currentTestNavLevel === 'topic_test') { renderTestContentsUI(selTSub, selTSec); } 
    else if (currentTestNavLevel === 'content') { renderTestSectionsUI(selTSub); } 
    else if (currentTestNavLevel === 'section') { renderTestSubjectsUI(); } 
    else {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById('test').classList.add('active'); 
    }
}

// 🚀 सीरीज के अंदर वाला टेस्ट शुरू करना (NEW LOGIC)
window.startSeriesTest = function(encodedTestJson) {
    let testData = JSON.parse(decodeURIComponent(encodedTestJson));
    
    if (!testData.questions || testData.questions.length === 0) {
        alert("This test has no questions! Please contact admin.");
        return;
    }

    currentTestConfig = { 
        title: testData.title, 
        duration: testData.duration || 60,
        positiveMarks: Number(window.activeTestRootData.positiveMarks) || 2,
        negativeMarking: Number(window.activeTestRootData.negativeMarking) || 0,
        instructions: `Each correct answer carries +${Number(window.activeTestRootData.positiveMarks) || 2} marks.\nThere is a negative marking of -${Number(window.activeTestRootData.negativeMarking) || 0} marks for each wrong answer.`
    };
    realTestQuestions = testData.questions || [];
    
    document.getElementById('instTestTitle').innerText = testData.title;
    document.getElementById('examInstructionPage').style.display = 'flex';
};

// =========================================================================
// 📚 DEDICATED SYLLABUS FOLDER SYSTEM LOGIC
// =========================================================================


function renderSylSubjects() {
    sylCurrentNav = 'subject';
    document.getElementById('sylBreadcrumb').innerHTML = '<i class="fas fa-home"></i> Syllabus';
    
    let box = document.getElementById('syllabusContentArea');
    let html = '';
    
    globalSyllabusData.forEach((exam, i) => {
        html += `
        <div class="edtech-folder-card" onclick="renderSylTopics(${i})">
            <div class="edtech-folder-num" style="background:#ea580c;"><i class="fas fa-folder"></i></div>
            <div class="edtech-folder-title">${exam.examName}</div>
            <i class="fas fa-chevron-right" style="padding: 18px 15px; color:#cbd5e1;"></i>
        </div>`;
    });
    box.innerHTML = html || '<p style="text-align:center; color:#aaa;">No folders available.</p>';
}

function renderSylTopics(examIdx) {
    sylCurrentNav = 'topic'; selSylSub = examIdx;
    let exam = globalSyllabusData[examIdx];
    document.getElementById('sylBreadcrumb').innerHTML = `<span onclick="renderSylSubjects()" style="cursor:pointer;"><i class="fas fa-home"></i> Syllabus</span> > ${exam.examName}`;
    
    let box = document.getElementById('syllabusContentArea');
    let html = '';
    
    if(exam.pdfs && exam.pdfs.length > 0) {
        exam.pdfs.forEach(pdf => {
            html += `
            <div class="edtech-content-card" style="border-left: 3px solid #ef4444; margin-bottom:8px; padding:10px; cursor:pointer;" onclick="openInAppPDF('${pdf.link}', '${pdf.title}')">
                <div class="content-top-row" style="margin-bottom:0; align-items:center;">
                    <div class="content-thumbnail" style="width:40px; height:40px; border-color:#ef4444; background:#fef2f2;"><i class="fas fa-file-pdf" style="color:#ef4444; font-size:1.5rem;"></i></div>
                    <div class="content-title-text" style="font-size:0.85rem; flex:1;">${pdf.title}</div>
                    <i class="fas fa-book-open" style="color:#ef4444;"></i>
                    <i class="fas fa-download" style="color:var(--primary); margin-left: 15px;" onclick="event.stopPropagation(); downloadAppPDF('${pdf.link}', '${pdf.title}')"></i>
                </div>
            </div>`;
        });
    } else {
        html = '<p style="text-align:center; color:#aaa;">No PDFs available in this folder.</p>';
    }
    
    box.innerHTML = html;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


// 1. सब्जेक्ट दिखाओ
function renderSylSubjects() {
    sylCurrentNav = 'subject';
    document.getElementById('sylBreadcrumb').innerHTML = '<i class="fas fa-home"></i> Syllabus';
    
    let box = document.getElementById('syllabusContentArea');
    let html = '';
    
    globalSyllabusData.forEach((sub, i) => {
        html += `
        <div class="edtech-folder-card" onclick="renderSylTopics(${i})">
            <div class="edtech-folder-num" style="background:#ea580c;"><i class="fas fa-book"></i></div>
            <div class="edtech-folder-title">${sub.subjectName}</div>
            <i class="fas fa-chevron-right" style="padding: 18px 15px; color:#cbd5e1;"></i>
        </div>`;
    });
    box.innerHTML = html;
}

// 2. टॉपिक और PDF दिखाओ
function renderSylTopics(subIdx) {
    sylCurrentNav = 'topic'; selSylSub = subIdx;
    let sub = globalSyllabusData[subIdx];
    document.getElementById('sylBreadcrumb').innerHTML = `<span onclick="renderSylSubjects()" style="cursor:pointer;"><i class="fas fa-home"></i> Syllabus</span> > ${sub.subjectName}`;
    
    let box = document.getElementById('syllabusContentArea');
    let html = '';
    
    sub.topics.forEach((top, i) => {
        html += `<div style="background:var(--white); border-radius:12px; margin-bottom:15px; padding:15px; box-shadow:0 4px 10px rgba(0,0,0,0.05); border:1px solid rgba(0,0,0,0.05);">
            <h4 style="color:#ea580c; margin-bottom:10px;"><i class="fas fa-folder"></i> ${top.topicName}</h4>`;
        
        top.pdfs.forEach(pdf => {
            html += `
            <div class="edtech-content-card" style="border-left: 3px solid #ef4444; margin-bottom:8px; padding:10px; cursor:pointer;" onclick="openInAppPDF('${pdf.link}', '${pdf.title}')">
                <div class="content-top-row" style="margin-bottom:0; align-items:center;">
                    <div class="content-thumbnail" style="width:40px; height:40px; border-color:#ef4444; background:#fef2f2;"><i class="fas fa-file-pdf" style="color:#ef4444; font-size:1.5rem;"></i></div>
                    <div class="content-title-text" style="font-size:0.85rem; flex:1;">${pdf.title}</div>
                    <i class="fas fa-book-open" style="color:#ef4444;"></i>
                </div>
            </div>`;
        });
        html += `</div>`;
    });
    box.innerHTML = html || '<p style="text-align:center; color:#aaa;">No PDFs available.</p>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 3. बैक बटन
window.handleSyllabusBack = function() {
    if(sylCurrentNav === 'topic') {
        renderSylSubjects();
    } else {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById('home').classList.add('active'); // वापस होम पर
    }
}

// =========================================================================
// 🔑 टेस्ट देने के बाद सही/गलत जवाब (Answer Key) देखना
// =========================================================================
window.showTestAnswerKey = function() {
    document.getElementById('resultCardMain').style.display = 'none';
    document.getElementById('answerKeyContainer').style.display = 'block';
    
    let container = document.getElementById('answerKeyList');
    let html = '';
    let letters = ['A', 'B', 'C', 'D'];

    realTestQuestions.forEach((q, index) => {
        let userAns = userAnswers[index];
        let correctAns = q.ans;
        let isCorrect = userAns === correctAns;
        let isSkipped = userAns === undefined;

        let qText = testLanguage === 'hi' ? (q.qHi || q.qEn) : (q.qEn || q.qHi);
        let options = testLanguage === 'hi' ? (q.optsHi || q.optsEn) : (q.optsEn || q.optsHi);
        let explanation = q.exp ? q.exp : 'No detailed solution provided by admin.';

        // सही, गलत या छोड़ा गया का बैज
        let badge = isSkipped ? `<span style="background:#94a3b8; color:white; padding:3px 8px; border-radius:6px; font-size:0.7rem;">Skipped</span>` : 
                    isCorrect ? `<span style="background:#10b981; color:white; padding:3px 8px; border-radius:6px; font-size:0.7rem;">Correct</span>` : 
                                `<span style="background:#ef4444; color:white; padding:3px 8px; border-radius:6px; font-size:0.7rem;">Wrong</span>`;

        html += `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <strong style="color: var(--primary);">Q${index + 1}.</strong> ${badge}
            </div>
            <p style="font-weight: 700; color: var(--text); margin-bottom: 15px; line-height: 1.5;">${qText}</p>
            
            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px;">`;

        // ऑप्शंस को रंग देना (हरा=सही, लाल=गलत)
        options.forEach((opt, optIdx) => {
            let optBg = "#fff"; let optBorder = "#cbd5e1"; let optIcon = "";
            
            if (optIdx === correctAns) {
                optBg = "#ecfdf5"; optBorder = "#10b981"; optIcon = `<i class="fas fa-check-circle" style="color:#10b981; float:right; font-size:1.1rem;"></i>`;
            } else if (optIdx === userAns && !isCorrect) {
                optBg = "#fef2f2"; optBorder = "#ef4444"; optIcon = `<i class="fas fa-times-circle" style="color:#ef4444; float:right; font-size:1.1rem;"></i>`;
            }

            html += `<div style="background:${optBg}; border:2px solid ${optBorder}; padding:10px 15px; border-radius:8px; font-size:0.9rem; color:#334155; font-weight:600;">
                        <span style="color:var(--text-gray); margin-right:8px;">(${letters[optIdx]})</span> ${opt} ${optIcon}
                     </div>`;
        });

        // सॉल्यूशन का डब्बा
        html += `</div>
            <div style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 12px; border-radius: 0 8px 8px 0; margin-top: 10px;">
                <strong style="color: #d97706; font-size: 0.8rem; display: block; margin-bottom: 5px;"><i class="fas fa-lightbulb"></i> Solution / Explanation:</strong>
                <span style="font-size: 0.85rem; color: var(--text); line-height: 1.4;">${explanation}</span>
            </div>
        </div>`;
    });

    container.innerHTML = html;
};
// =========================================================================
// 🔍 कोर्स प्लेयर में Class और PDF को फ़िल्टर करने वाला फंक्शन
// =========================================================================
window.filterCourseContent = function(type) {
    let btnClass = document.getElementById('tabClassBtn');
    let btnPdf = document.getElementById('tabPdfBtn');
    
    if(!btnClass || !btnPdf) return;

    // 1. बटन का कलर (Active State) सेट करना
    btnClass.classList.remove('active');
    btnPdf.classList.remove('active');
    
    if(type === 'video') {
        btnClass.classList.add('active');
    } else {
        btnPdf.classList.add('active');
    }

    // 2. कार्ड्स को छुपाना या दिखाना
    let allCards = document.querySelectorAll('.edtech-content-card');
    let hasVisibleContent = false;

    allCards.forEach(card => {
        // अगर कार्ड की क्लास टाइप से मैच करती है तो दिखाओ, वरना छुपा दो
        if(card.classList.contains('type-' + type)) {
            card.style.display = 'block';
            hasVisibleContent = true;
        } else {
            card.style.display = 'none';
        }
    });

    // 3. अगर उस टैब में कुछ भी नहीं है (जैसे सिर्फ वीडियो हैं, PDF नहीं), तो मैसेज दिखाएं
    let contentBox = document.getElementById('courseContentArea');
    let oldMsg = document.getElementById('emptyFilterMsg');
    if(oldMsg) oldMsg.remove(); // पुराना मैसेज हटाएं

    if(!hasVisibleContent && allCards.length > 0) {
        let msg = type === 'video' ? "No Classes available in this topic." : "No PDFs available in this topic.";
        contentBox.insertAdjacentHTML('beforeend', `<p id="emptyFilterMsg" style="text-align:center; color:#aaa; margin-top:30px;"><i class="fas fa-box-open fa-2x" style="opacity:0.5; margin-bottom:10px; display:block;"></i>${msg}</p>`);
    }
};
// main.js के अंत में इसे बदलें
window.closeVideoPlayer = function() {
    let iframe = document.getElementById('courseVideoPlayer');
    // 🌟 वीडियो को पूरी तरह से रोकने का सबसे पक्का तरीका
    if(iframe) {
        iframe.src = ""; 
    }
    
    // प्लेयर को छुपाना और हेडर को वापस दिखाना
    document.getElementById('videoPlayerWrapper').style.display = 'none';
    document.getElementById('courseHeaderDark').style.display = 'flex';
};

window.downloadAppPDF = async function(link, title) {
    let user = getUserData();
    if(!user) return;

    if(!user.downloadedPDFs) user.downloadedPDFs = [];

    // चेक करें कि पहले से डाउनलोड तो नहीं है
    let exists = user.downloadedPDFs.find(p => p.title === title);
    if(exists) {
        showToast("यह PDF पहले से डाउनलोड है!", "success");
        return;
    }

    // Google Drive के लिंक डायरेक्ट डाउनलोड नहीं होते, इसलिए वॉर्निंग
    if(link.includes("drive.google.com")) {
        alert("Google Drive लिंक्स ऑफलाइन डाउनलोड नहीं हो सकते। कृपया इसे ऑनलाइन ही पढ़ें। (एडमिन से कहें कि Firebase में अपलोड करें)");
        window.open(link, '_blank');
        return;
    }

    showToast("Background में PDF डाउनलोड हो रही है...", "success");
    
    try {
        // बैकग्राउंड में फाइल Fetch करना
        let response = await fetch(link);
        let blob = await response.blob(); // फाइल को Blob (Data) में बदलना
        
        let localId = "pdf_" + Date.now();
        
        // IndexedDB में सेव करना
        await PDFDatabase.savePDF(localId, blob);

        // यूजर के डेटा में एंट्री करना
        user.downloadedPDFs.push({ title: title, localId: localId, date: new Date().toLocaleDateString() });
        user.stats.offlineDownloads = user.downloadedPDFs.length;

        // डेटाबेस में अपडेट करना
        if(navigator.onLine) {
            await db.collection("users").doc(user.uid).update({
                downloadedPDFs: user.downloadedPDFs,
                "stats.offlineDownloads": user.stats.offlineDownloads
            });
        }
        
        saveUserData(user); // लोकल अपडेट
        let dlElement = document.getElementById('statDownloads');
        if(dlElement) dlElement.innerText = user.stats.offlineDownloads + " PDFs";

        showToast("PDF सफलतापुर्वक डाउनलोड हो गई! My Downloads में चेक करें।", "success");

    } catch (error) {
        console.error(error);
        showToast("डाउनलोड फेल हो गया। कृपया इंटरनेट कनेक्शन चेक करें।", "error");
    }
};
// =========================================================================
// 📚 DEDICATED SYLLABUS FOLDER SYSTEM LOGIC (main.js के अंत में डालें)
// =========================================================================
let globalSyllabusData = [];
let sylCurrentNav = 'subject';
let selSylSub = -1;

window.openAppSyllabus = async function() {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById('syllabusTab').classList.add('active');
    
    document.getElementById('syllabusContentArea').innerHTML = '<div style="text-align:center; padding:50px; color:#aaa;"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Loading Syllabus...</div>';
    document.getElementById('sylBreadcrumb').innerHTML = '<i class="fas fa-home"></i> Syllabus';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
        let doc = await db.collection("app_settings").doc("syllabus_data").get();
        if(doc.exists && doc.data().syllabus && doc.data().syllabus.length > 0) {
            globalSyllabusData = doc.data().syllabus;
            renderSylSubjects();
        } else {
            document.getElementById('syllabusContentArea').innerHTML = '<div style="text-align:center; padding:30px; color:#aaa;"><i class="fas fa-folder-open fa-3x" style="margin-bottom:15px; opacity:0.5;"></i><br>Syllabus not uploaded by Admin yet.</div>';
        }
    } catch(e) {
        document.getElementById('syllabusContentArea').innerHTML = '<p style="text-align:center; color:#ef4444;">Error loading syllabus.</p>';
    }
};

window.renderSylSubjects = function() {
    sylCurrentNav = 'subject';
    document.getElementById('sylBreadcrumb').innerHTML = '<i class="fas fa-home"></i> Syllabus';
    
    let box = document.getElementById('syllabusContentArea');
    let html = '';
    
    globalSyllabusData.forEach((exam, i) => {
        html += `
        <div class="edtech-folder-card" onclick="renderSylTopics(${i})">
            <div class="edtech-folder-num" style="background:#ea580c;"><i class="fas fa-folder"></i></div>
            <div class="edtech-folder-title">${exam.examName}</div>
            <i class="fas fa-chevron-right" style="padding: 18px 15px; color:#cbd5e1;"></i>
        </div>`;
    });
    box.innerHTML = html || '<p style="text-align:center; color:#aaa;">No folders available.</p>';
};

window.renderSylTopics = function(examIdx) {
    sylCurrentNav = 'topic'; selSylSub = examIdx;
    let exam = globalSyllabusData[examIdx];
    document.getElementById('sylBreadcrumb').innerHTML = `<span onclick="renderSylSubjects()" style="cursor:pointer;"><i class="fas fa-home"></i> Syllabus</span> > ${exam.examName}`;
    
    let box = document.getElementById('syllabusContentArea');
    let html = '';
    
    if(exam.pdfs && exam.pdfs.length > 0) {
        exam.pdfs.forEach(pdf => {
            html += `
            <div class="edtech-content-card" style="border-left: 3px solid #ef4444; margin-bottom:8px; padding:10px; cursor:pointer;" onclick="openInAppPDF('${pdf.link}', '${pdf.title}')">
                <div class="content-top-row" style="margin-bottom:0; align-items:center;">
                    <div class="content-thumbnail" style="width:40px; height:40px; border-color:#ef4444; background:#fef2f2;"><i class="fas fa-file-pdf" style="color:#ef4444; font-size:1.5rem;"></i></div>
                    <div class="content-title-text" style="font-size:0.85rem; flex:1;">${pdf.title}</div>
                    <i class="fas fa-book-open" style="color:#ef4444;"></i>
                    <i class="fas fa-download" style="color:var(--primary); margin-left: 15px;" onclick="event.stopPropagation(); downloadAppPDF('${pdf.link}', '${pdf.title}')"></i>
                </div>
            </div>`;
        });
    } else {
        html = '<p style="text-align:center; color:#aaa;">No PDFs available in this folder.</p>';
    }
    box.innerHTML = html;
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.handleSyllabusBack = function() {
    if(sylCurrentNav === 'topic') {
        renderSylSubjects();
    } else {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById('home').classList.add('active'); 
    }
};

// =========================================================================
// 🌐 DYNAMIC GOVT. SITES SYSTEM + IN-APP BROWSER (ADMIN CONTROLLED)
// =========================================================================


// 1. एडमिन पैनल के डेटाबेस से साइट्स लोड करना


function loadWebSitesFromDB() {
    if(typeof db === 'undefined') return;
    
    db.collection("govt_sites").orderBy("createdAt", "desc").onSnapshot(
        (snap) => {
            let container = document.getElementById('webLinksContainer');
            if(!container) return;
            
            let html = '';
            snap.forEach(doc => {
                let site = doc.data();
                // Google API से ऑटोमैटिक लोगो
                let domain = (new URL(site.url)).hostname;
                let logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
                
                html += `
                <div class="web-site-card" style="background: var(--white); padding: 12px 15px; border-radius: 12px; display: flex; align-items: center; gap: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.04); cursor: pointer; border: 1px solid #e2e8f0; transition: 0.2s;" onclick="openInAppBrowser('${site.url}', '${site.name}', '${logoUrl}')">
                    <img src="${logoUrl}" style="width: 40px; height: 40px; border-radius: 8px; background: #f8fafc; padding: 5px; border: 1px solid #e2e8f0;" onerror="this.src='logo.png'">
                    <div style="flex: 1;">
                        <h4 style="color: var(--text); font-size: 0.95rem; margin-bottom: 2px;">${site.name}</h4>
                        <p style="color: #64748b; font-size: 0.75rem;">Click to open portal</p>
                    </div>
                    <i class="fas fa-chevron-right" style="color: #cbd5e1;"></i>
                </div>`;
            });
            
            container.innerHTML = html || '<div style="text-align:center; padding:30px; color:#94a3b8;"><i class="fas fa-globe fa-3x" style="opacity:0.3; margin-bottom:15px;"></i><br>No Govt Sites added by Admin yet.</div>';
        },
        (error) => {
            // 🔥 अगर Firebase से एरर आए तो लोडिंग रोक कर मेसेज दिखाए
            console.error("Govt Sites Error: ", error);
            let container = document.getElementById('webLinksContainer');
            if(container) {
                container.innerHTML = '<div style="text-align:center; padding:30px; color:#ef4444;"><i class="fas fa-exclamation-circle fa-2x" style="margin-bottom:10px;"></i><br>Failed to load sites. Database permission denied.</div>';
            }
        }
    );
}
setTimeout(loadWebSitesFromDB, 2000);
setTimeout(loadWebSitesFromDB, 2000);

// Govt Sites पेज में सर्च बॉक्स
window.filterWebSites = function() {
    let query = document.getElementById('siteSearchInput').value.toLowerCase();
    let cards = document.querySelectorAll('.web-site-card');
    cards.forEach(card => {
        let name = card.querySelector('h4').innerText.toLowerCase();
        card.style.display = name.includes(query) ? "flex" : "none";
    });
};

// Courses पेज में सर्च बॉक्स
window.filterCoursesLocal = function() {
    let query = document.getElementById('courseSearchInput').value.toLowerCase();
    let cards = document.getElementById('courseContainer').querySelectorAll('.content-card');
    cards.forEach(card => {
        let title = card.querySelector('h3').innerText.toLowerCase();
        card.style.display = title.includes(query) ? "block" : "none";
    });
};

// Test Series पेज में सर्च बॉक्स
window.filterTestsLocal = function() {
    let query = document.getElementById('testSearchInput').value.toLowerCase();
    let cards = document.getElementById('testContainer').querySelectorAll('.content-card');
    cards.forEach(card => {
        let title = card.querySelector('h3').innerText.toLowerCase();
        card.style.display = title.includes(query) ? "block" : "none";
    });
};

// =========================================================================
// 🚀 IN-APP BROWSER CONTROLS (With Back Button)
// =========================================================================
let currentBrowserUrl = "";

window.openInAppBrowser = function(url, title, logo) {
    currentBrowserUrl = url;
    document.getElementById('browserSiteTitle').innerText = title;
    
    // अगर लोगो है तो दिखाएं, वरना डिफॉल्ट लोगो
    let logoEl = document.getElementById('browserSiteLogo');
    if(logoEl) logoEl.src = logo || 'logo.png';
    
    // स्क्रीन दिखाएं और Iframe में लिंक लोड करें
    document.getElementById('inAppBrowserOverlay').style.display = 'flex';
    document.getElementById('browserIframe').src = url;
}

window.closeInAppBrowser = function() {
    // स्क्रीन बंद करें और Iframe को खाली कर दें ताकि बैकग्राउंड में चलता न रहे
    document.getElementById('inAppBrowserOverlay').style.display = 'none';
    document.getElementById('browserIframe').src = ""; 
}

window.openLinkExternally = function() {
    // यह बटन दबाते ही साइट ऐप से बाहर असली Chrome में खुल जाएगी
    if(currentBrowserUrl) {
        window.open(currentBrowserUrl, '_blank');
    }
}