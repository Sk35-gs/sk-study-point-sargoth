/* ========================================================================= */
/* 🚀 ADMIN.JS - मास्टर एडमिन पैनल का पूरा लॉजिक                             */
/* इस फ़ाइल से पूरा ऐप कंट्रोल होता है (लॉगिन, डैशबोर्ड, कोर्स, टेस्ट, यूज़र्स) */
/* ========================================================================= */

const ADMIN_EMAIL = "gauravkumarverma637@gmail.com"; 
const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');

// -------------------------------------------------------------------------
// 📱 मोबाइल मेनू (Mobile Menu Toggle)
// -------------------------------------------------------------------------
function toggleMobileAdminMenu() {
    const navList = document.querySelector('.nav-list');
    navList.classList.toggle('show');
}

// -------------------------------------------------------------------------
// 🔐 एडमिन लॉगिन चेक (Admin Auth Check)
// -------------------------------------------------------------------------
firebase.auth().onAuthStateChanged((user) => {
    // अगर लॉगिन है और ईमेल एडमिन वाला ही है, तो डैशबोर्ड दिखाओ
    if (user && user.email === ADMIN_EMAIL) {
        loginScreen.style.display = 'none'; 
        dashboardScreen.style.display = 'flex'; 
        fetchAllRealData(); // सारा डेटा लाओ
        fetchLiveClasses();
        loadHomePageSettings();
        loadHomeUIControls(); // होम स्क्रीन के बटन लोड करो
    } else { 
        // नहीं तो लॉगिन स्क्रीन दिखाओ
        loginScreen.style.display = 'flex'; 
        dashboardScreen.style.display = 'none'; 
    }
});

// लॉगिन बटन दबाने पर क्या होगा
async function processAdminLogin() {
    let email = document.getElementById('adminEmail').value.trim();
    let pass = document.getElementById('adminPass').value;
    let remember = document.getElementById('rememberMe').checked;
    let btn = document.getElementById('loginBtn');
    
    if(!email || !pass) return;
    btn.innerHTML = 'Verifying...'; btn.disabled = true;
    
    try { 
        // Remember Me का लॉजिक (लॉगिन याद रखना है या नहीं)
        let persistence = remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;
        await firebase.auth().setPersistence(persistence);
        
        await firebase.auth().signInWithEmailAndPassword(email, pass); 
    } catch(e) { 
        alert("❌ Login Failed! " + e.message); 
        btn.innerHTML = 'Secure Login'; 
        btn.disabled = false; 
    }
}

// पासवर्ड भूल जाने पर
async function adminForgotPassword() {
    let email = document.getElementById('adminEmail').value.trim();
    if(!email) return alert("❌ Please enter your Admin Email in the box first to reset password!");
    
    try {
        await firebase.auth().sendPasswordResetEmail(email);
        alert("✅ Password Reset Link sent to your Email. Please check your inbox!");
    } catch(e) {
        alert("❌ Error: " + e.message);
    }
}

// -------------------------------------------------------------------------
// 📑 पैनल के सेक्शन बदलना (Switch Tabs)
// -------------------------------------------------------------------------
function switchSection(sectionId, element) {
    document.querySelectorAll('.section-panel').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    
    if(element) { 
        element.classList.add('active'); 
        document.getElementById('pageTitleText').innerText = element.innerText.trim(); 
    }
    
    // मोबाइल में क्लिक करने के बाद मेनू अपने आप बंद हो जाए
    const navList = document.querySelector('.nav-list');
    if(navList.classList.contains('show')) {
        navList.classList.remove('show');
    }
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// =========================================================================
// 📊 सारा असली डेटा डेटाबेस से लाना (FETCH ALL REAL DATA)
// =========================================================================
async function fetchAllRealData() {
    // PART A: कोर्स (Courses) लोड करना
    try {
        const coursesSnap = await db.collection("courses").get();
        let courseHtml = '';
        let testLogsHtml = '';
        coursesSnap.forEach(doc => {
            let course = doc.data();
            courseHtml += `<tr>
                <td><strong style="color:white;">${course.title}</strong></td>
                <td><span style="background:rgba(245, 158, 11, 0.1); color:var(--accent); padding:4px 10px; border-radius:6px; font-size:0.75rem;">${course.category}</span></td>
                <td><strong style="color:var(--success);">₹${course.newPrice}</strong></td>
                <td>
                    <div style="display:flex; gap:8px;">
                        <button style="background:#3b82f6; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;" onclick="editCourse('${doc.id}')"><i class="fas fa-edit"></i> Edit</button>
                        <button style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;" onclick="deleteCourse('${doc.id}')"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </td>
            </tr>`;
        });
        document.getElementById('realTestLogsBody').innerHTML = testLogsHtml || '<tr><td colspan="3">No real tests given yet.</td></tr>';
        document.getElementById('statCourses').innerHTML = `${coursesSnap.size} <span>Real</span>`;
        document.getElementById('courseTableBody').innerHTML = courseHtml || '<tr><td colspan="4">No courses found.</td></tr>';
    } catch(e) { console.error("Course Load Error:", e); }

    // PART B: यूज़र्स, टेस्ट्स और QoD (Question of the Day) लोड करना
    try {
        const usersSnap = await db.collection("users").orderBy("joinedDate", "desc").limit(100).get();
        let totalRealTestsCount = 0; let totalQodCount = 0; 
        let studentHtml = ''; let qodHtml = ''; 

        usersSnap.forEach(doc => {
            let user = doc.data();
            let img = (user.profilePic && !user.profilePic.includes('freepik')) ? user.profilePic : 'logo.png';
            
            let userQodCount = user.qodAnswers ? Object.keys(user.qodAnswers).length : 0;
            totalQodCount += userQodCount;
            
            let userRealTests = (user.testLogs && Array.isArray(user.testLogs)) ? user.testLogs.length : 0;
            totalRealTestsCount += userRealTests;

            // डेटा सुरक्षित तरीके से पास करने के लिए
            let safeUserObj = encodeURIComponent(JSON.stringify(user));
            let blockedBadge = user.isBlocked ? '<span style="background:#ef4444; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem; margin-left:8px;">Blocked</span>' : '';

            // 1. स्टूडेंट लिस्ट टेबल
            studentHtml += `<tr>
                <td><div style="display:flex; align-items:center; gap:12px;"><img src="${img}" style="width:35px; height:35px; border-radius:50%; object-fit:cover;"> <strong style="color:white;">${user.name || 'Student'}</strong> ${blockedBadge}</div></td>
                <td><div style="color:#e2e8f0;">${user.email}</div><div style="font-size:0.8rem; color:var(--text-gray);">${user.phone || 'N/A'}</div></td>
                <td>
                    <button style="background:#3b82f6; color:white; border:none; padding:6px 15px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.8rem;" onclick="openStudentKundali('${safeUserObj}', '${doc.id}')">
                        <i class="fas fa-eye"></i> View Profile
                    </button>
                </td>
            </tr>`;

            // 2. QoD एनालिटिक्स टेबल
            if(userQodCount > 0) {
                let coins = user.stats ? user.stats.coins : 0;
                qodHtml += `<tr>
                    <td><strong style="color:white;">${user.name || 'Student'}</strong><br><span style="font-size:0.75rem; color:var(--text-gray);">${user.email}</span></td>
                    <td><span style="background:rgba(168, 85, 247, 0.1); color:#a855f7; padding:4px 10px; border-radius:6px; font-weight:bold;">${userQodCount} Solved</span></td>
                    <td><strong style="color:#f59e0b;"><i class="fas fa-coins"></i> ${coins} Coins</strong></td>
                </tr>`;
            }
                    // Test Logs Live Data
            if(user.testLogs && user.testLogs.length > 0) {
                let avg = user.stats ? user.stats.avgScore : 0;
                testLogsHtml += `<tr>
                    <td><strong style="color:white;">${user.name}</strong><br><span style="font-size:0.75rem; color:#94a3b8;">${user.phone}</span></td>
                    <td><span style="background:rgba(59,130,246,0.1); color:#3b82f6; padding:4px 8px; border-radius:6px; font-weight:bold;">${user.testLogs.length} Tests</span></td>
                    <td><strong style="color:#10b981;">${avg}% Accuracy</strong></td>
                </tr>`;
            }
        });

        document.getElementById('statUsers').innerHTML = `${usersSnap.size} <span>Real</span>`;
        document.getElementById('statRealTests').innerHTML = `${totalRealTestsCount} <span>Real</span>`;
        document.getElementById('statQoD').innerHTML = `${totalQodCount} <span>Real</span>`;
        
        if(studentHtml) document.getElementById('studentTableBody').innerHTML = studentHtml;
        document.getElementById('qodLogsBody').innerHTML = qodHtml || '<tr><td colspan="3">No QoD attempted yet.</td></tr>';
        
        // AI के सवाल भी लोड करें
        loadAIDoubts();
    } catch(e) { console.error("User Load Error:", e); }
}

// =========================================================================
// 🏠 ऐप का होम पेज कंट्रोल (News, Quote & Syllabus)
// =========================================================================
async function loadHomePageSettings() {
    try {
        const doc = await db.collection("app_settings").doc("home_page").get();
        if(doc.exists) {
            document.getElementById('newsTicker').value = doc.data().news || '';
            document.getElementById('adminQuote').value = doc.data().quote || '';
            document.getElementById('adminSyllabus').value = doc.data().syllabusLink || '';
        }
    } catch(e) { console.log(e); }
}

async function updateHomePage() {
    let news = document.getElementById('newsTicker').value;
    let quote = document.getElementById('adminQuote').value;
    let syllabusLink = document.getElementById('adminSyllabus').value;
    
    let btn = event.target; btn.innerHTML = "Updating...";
    try {
        await db.collection("app_settings").doc("home_page").set({ 
            news: news, quote: quote, syllabusLink: syllabusLink 
        }, { merge: true });
        alert("✅ App Home Updated Successfully!");
    } catch(error) { alert("Error: " + error.message); }
    btn.innerHTML = '<i class="fas fa-satellite-dish"></i> UPDATE APP HOME';
}

// =========================================================================
// 🔴 लाइव क्लास मैनेजर (LIVE CLASS)
// =========================================================================
async function addLiveClass() {
    let title = document.getElementById('lcTitle').value;
    let videoId = document.getElementById('lcVideoId').value;
    let status = document.getElementById('lcStatus').value;
    if(!title || !videoId) return alert("Please enter Title and Video ID!");
    try {
        await db.collection("live_classes").add({ title, videoId, status, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        alert("✅ Live Class Added!");
        document.getElementById('lcTitle').value = ''; document.getElementById('lcVideoId').value = '';
        fetchLiveClasses();
    } catch(e) { alert("Error: " + e.message); }
}

async function fetchLiveClasses() {
    try {
        const snap = await db.collection("live_classes").orderBy("createdAt", "desc").get();
        let html = '';
        snap.forEach(doc => {
            let data = doc.data();
            let color = data.status === 'LIVE' ? '#ef4444' : (data.status === 'UPCOMING' ? '#f59e0b' : '#94a3b8');
            html += `<tr>
                <td style="color:white;">${data.title}</td>
                <td><span style="background:rgba(255,255,255,0.1); color:${color}; padding:4px 8px; border-radius:4px; font-weight:bold; font-size:0.8rem;">${data.status}</span></td>
                <td><button style="background:rgba(239, 68, 68, 0.2); color:#ef4444; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;" onclick="deleteLiveClass('${doc.id}')"><i class="fas fa-trash"></i> Delete</button></td>
            </tr>`;
        });
        document.getElementById('liveClassTableBody').innerHTML = html || '<tr><td colspan="3">No live classes found.</td></tr>';
    } catch(e) { console.log(e); }
}

async function deleteLiveClass(id) {
    if(confirm("Are you sure you want to delete this class?")) {
        await db.collection("live_classes").doc(id).delete();
        fetchLiveClasses();
    }
}

// =========================================================================
// 🔔 पुश नोटिफिकेशन भेजना (Push Notifications)
// =========================================================================
async function sendNotification() {
    let title = document.getElementById('notiTitle').value;
    let msg = document.getElementById('notiMsg').value;
    if(!title || !msg) return alert("Please write title and message!");
    try {
        await db.collection("notifications").add({ title, message: msg, date: new Date().toLocaleDateString(), timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        alert("🔔 Notification Sent!");
        document.getElementById('notiTitle').value = ''; document.getElementById('notiMsg').value = '';
    } catch(error) { alert("Error: " + error.message); }
}

// =========================================================================
// 📚 कोर्स बिल्डर (COURSE FOLDER BUILDER)
// =========================================================================
let subjectCount = 0; let topicCount = 0;

// नया कोर्स बनाने का डब्बा खोलना
function openCourseModal(editMode = false) {
    document.getElementById('addCourseModal').style.display = 'flex';
    if(!editMode) {
        document.getElementById('editingCourseId').value = '';
        document.getElementById('courseModalTitle').innerHTML = '<i class="fas fa-folder-tree"></i> Create Premium Course';
        document.getElementById('saveCourseBtn').innerHTML = '<i class="fas fa-cloud-upload-alt"></i> PUBLISH COURSE';
        
        document.getElementById('cTitle').value = ''; document.getElementById('cOldPrice').value = '';
        document.getElementById('cNewPrice').value = ''; document.getElementById('cBannerBase64').value = '';
        document.getElementById('cValidity').value = ''; document.getElementById('cStartDate').value = '';
        document.getElementById('cDiscountBadge').value = '';
        
        document.getElementById('cBannerName').innerText = 'Click to upload Banner';
        document.getElementById('folderContainer').innerHTML = '';
    }
}

// बैनर फोटो को Base64 में बदलना
function previewCourseBanner(input) {
    if (input.files && input.files[0]) {
        document.getElementById('cBannerName').innerText = input.files[0].name;
        let reader = new FileReader();
        reader.onload = function(e) {
            let img = new Image();
            img.onload = function() {
                let canvas = document.createElement('canvas');
                canvas.width = 600; canvas.height = 300;
                canvas.getContext('2d').drawImage(img, 0, 0, 600, 300);
                document.getElementById('cBannerBase64').value = canvas.toDataURL('image/jpeg', 0.6);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// कोर्स में PDF अपलोड करना (Firebase Storage)
async function handleDevicePDF(inputElement) {
    let file = inputElement.files[0];
    if(file && file.type === "application/pdf") {
        let linkInput = inputElement.parentElement.querySelector('.c-link');
        let uploadBtn = inputElement.parentElement.querySelector('.file-upload-btn');
        
        let originalText = uploadBtn.innerText;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        uploadBtn.disabled = true;

        try {
            let storageRef = firebase.storage().ref();
            let pdfRef = storageRef.child('course_pdfs/' + Date.now() + '_' + file.name);
            await pdfRef.put(file);
            let downloadURL = await pdfRef.getDownloadURL();
            
            linkInput.value = downloadURL; 
            linkInput.placeholder = "PDF Uploaded ✅";
            linkInput.style.display = 'block';
            linkInput.readOnly = true;
            
            uploadBtn.innerHTML = '<i class="fas fa-check"></i> Uploaded';
            uploadBtn.style.background = '#10b981';
            uploadBtn.style.color = 'white';
        } catch(e) {
            console.error("Upload Error: ", e);
            alert("PDF Upload Error: " + e.message);
            uploadBtn.innerHTML = originalText;
            uploadBtn.disabled = false;
        }
    } else { 
        alert("Please select a valid PDF file!"); 
    }
}

// सब्जेक्ट (Subject) फोल्डर बनाना
function addSubjectFolder(subName = '') {
    subjectCount++;
    const container = document.getElementById('folderContainer');
    const html = `<div class="subject-folder" id="sub-${subjectCount}">
            <div class="subject-header"><i class="fas fa-folder-open" style="color:#3b82f6;"></i>
                <input type="text" class="sub-name" placeholder="Subject Name (e.g. Maths)" value="${subName}">
                <button class="btn-del" onclick="this.parentElement.parentElement.remove()"><i class="fas fa-trash"></i></button></div>
            <div id="topicBox-${subjectCount}" class="topics-container"></div>
            <button class="btn-add-topic" onclick="addTopicFolder(${subjectCount})"><i class="fas fa-plus-circle"></i> Add Topic Folder</button>
        </div>`;
    container.insertAdjacentHTML('beforeend', html);
    return subjectCount;
}

// टॉपिक (Topic) फोल्डर बनाना
function addTopicFolder(subId, topicName = '') {
    topicCount++;
    const box = document.getElementById(`topicBox-${subId}`);
    const html = `<div class="topic-folder" id="topic-${topicCount}">
            <div class="topic-header"><i class="fas fa-folder" style="color:#f59e0b;"></i>
                <input type="text" class="top-name" placeholder="Topic Name" value="${topicName}">
                <button class="btn-del" onclick="this.parentElement.parentElement.remove()"><i class="fas fa-trash"></i></button></div>
            <div id="contentBox-${topicCount}" class="contents-container"></div>
            <button class="btn-add-content" onclick="addContentRow(${topicCount})"><i class="fas fa-video"></i> / <i class="fas fa-file-pdf"></i> Add Content</button>
        </div>`;
    box.insertAdjacentHTML('beforeend', html);
    return topicCount;
}

// वीडियो या PDF लिंक जोड़ने की लाइन (Content Row)
function addContentRow(topicId, type = 'video', title = '', link = '') {
    const box = document.getElementById(`contentBox-${topicId}`);
    if(type === 'device_pdf') type = 'pdf';

    const html = `<div class="content-item">
            <select class="c-type" onchange="toggleUploadBtn(this)">
                <option value="video" ${type==='video'?'selected':''}>🎥 YouTube Link</option>
                <option value="pdf" ${type==='pdf'?'selected':''}>📄 Drive / PDF Link</option>
            </select>
            <input type="text" class="c-title" placeholder="Part Name" value="${title}">
            <input type="text" class="c-link" placeholder="${type==='pdf' ? 'Paste Google Drive Link' : 'Paste YouTube URL'}" value="${link}">
            <button class="btn-del" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
        </div>`;
    box.insertAdjacentHTML('beforeend', html);
}

// वीडियो/पीडीएफ सेलेक्ट करने पर Placeholder बदलना
function toggleUploadBtn(selectEl) {
    let linkInput = selectEl.parentElement.querySelector('.c-link');
    if(selectEl.value === 'pdf') {
        linkInput.placeholder = "Paste Google Drive Link here";
    } else {
        linkInput.placeholder = "Paste YouTube URL/ID here";
    }
}

// (यह फ़ंक्शन डायरेक्ट डिवाइस अपलोड को रोकता है ताकि गूगल ड्राइव यूज़ हो)
function handleDevicePDF(inputElement) {
    alert("Please use Google Drive links for PDFs. Direct upload is disabled.");
}

// =========================================================================
// 💾 कोर्स को डेटाबेस में सेव करना (SAVE COURSE - Super Safe Mode)
// =========================================================================
async function saveCourseToDB() {
    let editingId = document.getElementById('editingCourseId').value;
    let title = document.getElementById('cTitle').value.trim();
    let category = document.getElementById('cCategory').value;
    let oldPrice = document.getElementById('cOldPrice').value;
    let newPrice = document.getElementById('cNewPrice').value;
    
    // सुरक्षित तरीके से डेटा निकालना
    let validityBox = document.getElementById('cValidity');
    let startDateBox = document.getElementById('cStartDate');
    let badgeBox = document.getElementById('cDiscountBadge');
    
    let validity = validityBox ? validityBox.value.trim() : '1 Year';
    let startDate = startDateBox ? startDateBox.value.trim() : 'Started';
    let discountBadge = badgeBox ? badgeBox.value.trim() : 'Premium';
    let banner = document.getElementById('cBannerBase64').value;

    if(!title || !newPrice) return alert("Course Title and Selling Price are required!");

    let btn = document.getElementById('saveCourseBtn');
    btn.innerHTML = 'Processing...'; btn.disabled = true;

    let syllabus = [];

    // फोल्डर्स के डेटा को JSON में बदलना
    document.querySelectorAll('.subject-folder').forEach(subDiv => {
        let subName = subDiv.querySelector('.sub-name').value.trim();
        if(!subName) return; 

        let topics = [];
        subDiv.querySelectorAll('.topic-folder').forEach(topDiv => {
            let topName = topDiv.querySelector('.top-name').value.trim();
            if(!topName) return; 

            let contents = [];
            topDiv.querySelectorAll('.content-item').forEach(item => {
                let type = item.querySelector('.c-type').value;
                let cTitle = item.querySelector('.c-title').value.trim();
                let cLink = item.querySelector('.c-link').value.trim();

                if(type === 'device_pdf') type = 'pdf'; 
                if(cTitle && cLink) contents.push({ type: type, title: cTitle, link: cLink });
            });
            topics.push({ topicName: topName, contents: contents });
        });
        syllabus.push({ subjectName: subName, topics: topics });
    });

    let courseData = { 
        title: title, category: category || "RPSC", 
        oldPrice: Number(oldPrice) || 0, newPrice: Number(newPrice) || 0, 
        validity: validity || "Lifetime", startDate: startDate || "Join Now",
        discountBadge: discountBadge || "New",
        image: banner || "", syllabus: syllabus 
    };

    // कचरा डेटाबेस में जाने से रोकने के लिए (Clean Data)
    let cleanCourseData = JSON.parse(JSON.stringify(courseData));

    try {
        if(editingId) { 
            await db.collection("courses").doc(editingId).update(cleanCourseData); 
            alert("✅ Course Updated Successfully!"); 
        } else { 
            cleanCourseData.createdAt = firebase.firestore.FieldValue.serverTimestamp(); 
            await db.collection("courses").add(cleanCourseData); 
            alert("✅ New Course Created Successfully!"); 
        }
        closeModal('addCourseModal'); 
        fetchAllRealData();
    } catch(e) { 
        alert("Error saving to database: " + e.message); 
    } finally { 
        btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> PUBLISH COURSE'; 
        btn.disabled = false; 
    }
}

// कोर्स एडिट करना
async function editCourse(courseId) {
    try {
        let doc = await db.collection("courses").doc(courseId).get();
        if(doc.exists) {
            let data = doc.data();
            openCourseModal(true);
            document.getElementById('editingCourseId').value = courseId;
            document.getElementById('courseModalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Course';
            document.getElementById('saveCourseBtn').innerHTML = '<i class="fas fa-sync"></i> UPDATE COURSE';
            
            document.getElementById('cTitle').value = data.title;
            document.getElementById('cCategory').value = data.category;
            document.getElementById('cOldPrice').value = data.oldPrice;
            document.getElementById('cNewPrice').value = data.newPrice;
            document.getElementById('cValidity').value = data.validity || '';
            document.getElementById('cStartDate').value = data.startDate || '';
            document.getElementById('cDiscountBadge').value = data.discountBadge || '';
            document.getElementById('cBannerBase64').value = data.image;
            document.getElementById('cBannerName').innerText = "Banner Loaded";

            let container = document.getElementById('folderContainer');
            container.innerHTML = ''; 
            
            // पुराने फोल्डर्स वापस बनाना
            if(data.syllabus) {
                data.syllabus.forEach(sub => {
                    let sId = addSubjectFolder(sub.subjectName);
                    if(sub.topics) {
                        sub.topics.forEach(top => {
                            let tId = addTopicFolder(sId, top.topicName);
                            if(top.contents) { top.contents.forEach(con => addContentRow(tId, con.type, con.title, con.link)); }
                        });
                    }
                });
            }
        }
    } catch(e) { console.error("Edit Error:", e); }
}

// कोर्स डिलीट करना
async function deleteCourse(courseId) {
    if(confirm("⚠️ क्या आप सच में इस कोर्स को डिलीट करना चाहते हैं? यह वापस नहीं आएगा!")) {
        try {
            await db.collection("courses").doc(courseId).delete();
            alert("✅ Course Deleted Successfully!");
            fetchAllRealData(); 
        } catch(error) { alert("❌ Error deleting course: " + error.message); }
    }
}

// =========================================================================
// 📝 टेस्ट सीरीज और मॉक टेस्ट बिल्डर (TEST SERIES BUILDER)
// =========================================================================
let qCount = 0;

// टेस्ट बिल्डर का मोडल खोलना
function openTestModal() {
    document.getElementById('addTestModal').style.display = 'flex';
    document.getElementById('editingTestId').value = '';
    
    // सारे इनपुट खाली करना
    document.getElementById('tTitle').value = ''; document.getElementById('tOldPrice').value = '';
    document.getElementById('tNewPrice').value = '0'; document.getElementById('tValidity').value = '';
    document.getElementById('tStartDate').value = ''; document.getElementById('tDuration').value = '60';
    document.getElementById('tNegative').value = ''; document.getElementById('tPositive').value = '2'; 
    document.getElementById('tDiscountBadge').value = ''; document.getElementById('tInstructions').value = '';
    document.getElementById('tBannerBase64').value = '';
    document.getElementById('tBannerName').innerText = 'Click to upload Test Banner (Ratio 2:1)';
    
    // फोल्डर वाला डब्बा खाली करना
    let folderContainer = document.getElementById('testFolderContainer');
    if (folderContainer) folderContainer.innerHTML = '';
    
    tsubCount = 0; tsecCount = 0; ttopCount = 0; tpaperCount = 0;
    
    let btn = document.getElementById('saveTestBtn');
    if (btn) { btn.innerHTML = '🚀 Publish Test Series'; btn.style.background = '#10b981'; }
}

// टेस्ट का बैनर सेट करना
function previewTestBanner(input) {
    if (input.files && input.files[0]) {
        document.getElementById('tBannerName').innerText = input.files[0].name;
        let reader = new FileReader();
        reader.onload = function(e) {
            let img = new Image();
            img.onload = function() {
                let canvas = document.createElement('canvas');
                canvas.width = 600; canvas.height = 300;
                canvas.getContext('2d').drawImage(img, 0, 0, 600, 300);
                document.getElementById('tBannerBase64').value = canvas.toDataURL('image/jpeg', 0.6);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// टेस्ट में एक नया सवाल जोड़ना (Manual Question Block)
function addQuestionBlock() {
    qCount++;
    const container = document.getElementById('testQuestionsContainer');
    
    const html = `
        <div class="question-block" id="qb-${qCount}" style="background: #0f172a; border: 1px solid #334155; padding: 20px; border-radius: 12px; margin-top: 15px;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 10px; margin-bottom: 15px;">
                <strong style="color: #f59e0b; font-size: 1.1rem;">Question ${qCount}</strong>
                <div>
                    <button type="button" class="btn-translate" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid #3b82f6; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; margin-right: 10px;" onclick="autoTranslateBlock(${qCount}, this)"><i class="fas fa-language"></i> Auto Translate to Hindi</button>
                    <button type="button" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;" onclick="this.parentElement.parentElement.parentElement.remove()"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            
            <div class="form-grid">
                <div class="input-group"><label>Question (English)</label><input type="text" class="q-en" placeholder="Type question in English"></div>
                <div class="input-group"><label>Question (Hindi)</label><input type="text" class="q-hi" placeholder="हिंदी में प्रश्न"></div>
                
                <div class="input-group"><label>Option A (English)</label><input type="text" class="opt-en-0" placeholder="Option A"></div>
                <div class="input-group"><label>Option A (Hindi)</label><input type="text" class="opt-hi-0" placeholder="विकल्प A"></div>
                
                <div class="input-group"><label>Option B (English)</label><input type="text" class="opt-en-1" placeholder="Option B"></div>
                <div class="input-group"><label>Option B (Hindi)</label><input type="text" class="opt-hi-1" placeholder="विकल्प B"></div>
                
                <div class="input-group"><label>Option C (English)</label><input type="text" class="opt-en-2" placeholder="Option C"></div>
                <div class="input-group"><label>Option C (Hindi)</label><input type="text" class="opt-hi-2" placeholder="विकल्प C"></div>
                
                <div class="input-group"><label>Option D (English)</label><input type="text" class="opt-en-3" placeholder="Option D"></div>
                <div class="input-group"><label>Option D (Hindi)</label><input type="text" class="opt-hi-3" placeholder="विकल्प D"></div>
                
                <div class="input-group full-width">
                    <label style="color:#10b981; font-size:0.9rem;">Correct Answer</label>
                    <select class="q-ans"><option value="0">Option A</option><option value="1">Option B</option><option value="2">Option C</option><option value="3">Option D</option></select>
                    
                    <div class="input-group full-width" style="margin-top: 15px;">
                        <label style="color:#f59e0b; font-size:0.9rem;">Explanation / Solution (Optional)</label>
                        <textarea class="q-exp" rows="2" placeholder="Write the detailed solution for this question here..." style="width:100%; padding:10px; border-radius:6px; background:#0f172a; color:white; border:1px solid #334155; outline:none;"></textarea>
                    </div>
                </div>
            </div>
        </div>`;
    container.insertAdjacentHTML('beforeend', html);
}

// 🌐 ऑटो ट्रांसलेट (English से Hindi - Google Translate Trick)
async function autoTranslateBlock(id, btnElement) {
    const block = document.getElementById(`qb-${id}`);
    if(!block) return;
    
    btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
    btnElement.disabled = true;
    
    try {
        let qEn = block.querySelector('.q-en').value;
        let opt0 = block.querySelector('.opt-en-0').value;
        let opt1 = block.querySelector('.opt-en-1').value;
        let opt2 = block.querySelector('.opt-en-2').value;
        let opt3 = block.querySelector('.opt-en-3').value;

        if(qEn) block.querySelector('.q-hi').value = await fetchTranslation(qEn);
        if(opt0) block.querySelector('.opt-hi-0').value = await fetchTranslation(opt0);
        if(opt1) block.querySelector('.opt-hi-1').value = await fetchTranslation(opt1);
        if(opt2) block.querySelector('.opt-hi-2').value = await fetchTranslation(opt2);
        if(opt3) block.querySelector('.opt-hi-3').value = await fetchTranslation(opt3);
        
        btnElement.innerHTML = '<i class="fas fa-check"></i> Translated';
        btnElement.style.color = '#10b981';
        btnElement.style.borderColor = '#10b981';
    } catch (e) {
        alert("Translation failed. Try again.");
    } finally {
        setTimeout(() => { 
            btnElement.innerHTML = '<i class="fas fa-language"></i> Auto Translate to Hindi'; 
            btnElement.style.color = '#3b82f6'; btnElement.style.borderColor = '#3b82f6';
            btnElement.disabled = false; 
        }, 2000);
    }
}

async function fetchTranslation(text) {
    if(!text) return "";
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    return data[0][0][0]; 
}

// 💾 पुराने तरीके वाले टेस्ट को सेव करना (Single Test Save)
async function saveTestToDB() {
    let title = document.getElementById('tTitle').value;
    let category = document.getElementById('tCategory').value;
    let oldPrice = document.getElementById('tOldPrice').value;
    let newPrice = document.getElementById('tNewPrice').value;
    let validity = document.getElementById('tValidity').value || '6 Months';
    let startDate = document.getElementById('tStartDate').value || 'Upcoming';
    let duration = document.getElementById('tDuration').value;
    let negativeMarking = Number(document.getElementById('tNegative').value) || 0;
    let discountBadge = document.getElementById('tDiscountBadge').value || 'Premium';
    let instructions = document.getElementById('tInstructions').value;
    let banner = document.getElementById('tBannerBase64').value;
    
    if(!title || !duration || !newPrice) return alert("Title, Price and Duration are required!");

    let btn = document.getElementById('saveTestBtn');
    btn.innerHTML = 'Publishing...'; btn.disabled = true;

    let questions = [];
    document.querySelectorAll('.question-block').forEach(block => {
        let qObj = {
            qEn: block.querySelector('.q-en').value, qHi: block.querySelector('.q-hi').value,
            optsEn: [block.querySelector('.opt-en-0').value, block.querySelector('.opt-en-1').value, block.querySelector('.opt-en-2').value, block.querySelector('.opt-en-3').value],
            optsHi: [block.querySelector('.opt-hi-0').value, block.querySelector('.opt-hi-1').value, block.querySelector('.opt-hi-2').value, block.querySelector('.opt-hi-3').value],
            ans: parseInt(block.querySelector('.q-ans').value),
            exp: block.querySelector('.q-exp').value.trim() 
        };
        if(qObj.qEn || qObj.qHi) questions.push(qObj);
    });

    let testData = {
        title, category, oldPrice: Number(oldPrice), price: Number(newPrice), 
        validity, startDate, discountBadge, instructions, image: banner,
        duration: Number(duration), negativeMarking: negativeMarking, questions: questions,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    let editingId = document.getElementById('editingTestId').value;
    try {
        if(editingId) {
            await db.collection("tests").doc(editingId).update(testData);
            alert("✅ Premium Test Updated Successfully!");
        } else {
            testData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("tests").add(testData);
            alert("✅ Premium Test Published Successfully!");
        }
        closeModal('addTestModal');
        fetchTestsData(); 
    } catch(e) { alert("Error: " + e.message); } 
    finally { 
        btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> PUBLISH TEST'; 
        btn.style.background = '#10b981'; btn.disabled = false; 
    }
}

// =========================================================================
// 📝 टेस्ट मैनेजर (Load, Edit & Delete Tests)
// =========================================================================

// 1. डेटाबेस से सारे टेस्ट लोड करना
async function fetchTestsData() {
    try {
        const testsSnap = await db.collection("tests").orderBy("createdAt", "desc").get();
        let testHtml = '';
        
        testsSnap.forEach(doc => {
            let test = doc.data();
            let priceText = test.price === 0 || test.price === "0" ? "Free" : `₹${test.price}`;
            let qCount = test.questions ? test.questions.length : 0;

            testHtml += `<tr>
                <td>
                    <strong style="color:white; display:block;">${test.title}</strong>
                    <span style="font-size:0.75rem; color:var(--text-gray);">${qCount} Questions</span>
                </td>
                <td>
                    <span style="background:rgba(245, 158, 11, 0.1); color:var(--accent); padding:4px 8px; border-radius:6px; font-size:0.75rem; margin-right:5px;">${test.category}</span>
                    <span style="font-size:0.8rem; color:#cbd5e1;"><i class="far fa-clock"></i> ${test.duration} Mins</span>
                </td>
                <td><strong style="color:var(--success);">${priceText}</strong></td>
                <td>
                    <button style="background:#3b82f6; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;" onclick="editTest('${doc.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;" onclick="deleteTest('${doc.id}')"><i class="fas fa-trash"></i> Delete</button>
                </td>
            </tr>`;
        });
        document.getElementById('testTableBody').innerHTML = testHtml || '<tr><td colspan="4">No tests found. Click "Create New Test" to add one.</td></tr>';
    } catch(e) { 
        document.getElementById('testTableBody').innerHTML = '<tr><td colspan="4" style="color:red;">Error loading tests.</td></tr>';
    }
}

// 2. टेस्ट डिलीट करना
async function deleteTest(testId) {
    if(confirm("⚠️ क्या आप सच में इस टेस्ट को डिलीट करना चाहते हैं?")) {
        try {
            await db.collection("tests").doc(testId).delete();
            alert("✅ Test Deleted Successfully!");
            fetchTestsData(); 
        } catch(error) { alert("❌ Error deleting test: " + error.message); }
    }
}

// डैशबोर्ड लोड होने पर टेस्ट लोड करना
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if(document.getElementById('dashboardScreen').style.display !== 'none') {
            fetchTestsData();
        }
    }, 2000);
});

// 3. टेस्ट एडिट करना (Advanced Folder System Support)
async function editTest(testId) {
    try {
        let doc = await db.collection("tests").doc(testId).get();
        if(doc.exists) {
            let data = doc.data();
            openTestModal(); 
            
            document.getElementById('editingTestId').value = testId;
            document.getElementById('testModalTitle').innerHTML = '<i class="fas fa-edit" style="color:#3b82f6;"></i> Edit Test Series';
            let saveBtn = document.getElementById('saveTestBtn');
            if(saveBtn) {
                saveBtn.innerHTML = '<i class="fas fa-sync"></i> UPDATE TEST SERIES';
                saveBtn.style.background = '#3b82f6';
            }

            document.getElementById('tTitle').value = data.title || '';
            document.getElementById('tCategory').value = data.category || 'RPSC';
            document.getElementById('tOldPrice').value = data.oldPrice || '';
            document.getElementById('tNewPrice').value = data.price || '0';
            document.getElementById('tValidity').value = data.validity || '';
            document.getElementById('tPositive').value = data.positiveMarks || '2';
            document.getElementById('tNegative').value = data.negativeMarking || '0';
            document.getElementById('tBannerBase64').value = data.image || '';
            if(data.image) document.getElementById('tBannerName').innerText = "Banner Loaded ✅";

            let container = document.getElementById('testFolderContainer');
            if(container) container.innerHTML = ''; 
            
            tsubCount = 0; tsecCount = 0; ttopCount = 0; tpaperCount = 0;

            // अगर यह नया टेस्ट सीरीज है (फोल्डर्स के साथ)
            if(data.isTestSeries && data.syllabus) {
                data.syllabus.forEach(sub => {
                    let sId = addTestSubjectFolder(sub.subjectName);
                    if(sub.sections) {
                        sub.sections.forEach(sec => {
                            let secId = addTestSectionFolder(sId, sec.sectionName);
                            if(sec.directTests) { sec.directTests.forEach(dt => { addTestPaperRow(`tsecContent-${secId}`, dt.title, dt.duration, JSON.stringify(dt.questions || [])); }); }
                            if(sec.topics) {
                                sec.topics.forEach(top => {
                                    let topId = addTestTopicFolder(secId, top.topicName);
                                    if(top.tests) { top.tests.forEach(tt => { addTestPaperRow(`ttopContent-${topId}`, tt.title, tt.duration, JSON.stringify(tt.questions || [])); }); }
                                });
                            }
                        });
                    }
                });
            } 
            // अगर यह बहुत पुराना सिंगल टेस्ट है
            else if (!data.isTestSeries && data.questions) {
                 let sId = addTestSubjectFolder("General Subject");
                 let secId = addTestSectionFolder(sId, "Mock Tests");
                 addTestPaperRow(`tsecContent-${secId}`, data.title || "Old Test", data.duration || 60, JSON.stringify(data.questions));
            }
        }
    } catch(e) { alert("Failed to open test for editing."); }
}

// =========================================================================
// 👨‍🎓 स्टूडेंट्स मैनेजमेंट (Student Profile & Block/Unblock)
// =========================================================================

// स्टूडेंट की पूरी कुंडली (प्रोफाइल) खोलना
function openStudentKundali(encodedUserStr, uid) {
    let user = JSON.parse(decodeURIComponent(encodedUserStr));
    document.getElementById('stuModalMyCode').innerText = user.myReferralCode || "Not Generated";
    document.getElementById('stuModalReferredBy').innerText = user.referredBy || "Direct Joined";
    document.getElementById('stuModalImg').src = user.profilePic && !user.profilePic.includes('freepik') ? user.profilePic : 'logo.png';
    document.getElementById('stuModalName').innerText = user.name || 'Unknown Student';
    document.getElementById('stuModalEmail').innerText = user.email || 'No Email';
    document.getElementById('stuModalPhone').innerText = user.phone || 'No Phone';

    // 🌟 1. REFERRAL CODE LOGIC (यहाँ जोड़ा गया है)
    let displayCode = user.myReferralCode || "SK" + uid.substring(0,5).toUpperCase();
    let elMyCode = document.getElementById('stuModalMyCode');
    if(elMyCode) elMyCode.innerText = displayCode;
    
    let elRefBy = document.getElementById('stuModalReferredBy');
    if(elRefBy) elRefBy.innerText = user.referredBy || "Direct Joined";
    
    let stats = user.stats || {};
    document.getElementById('stuModalCoins').innerText = stats.coins || 0;
    document.getElementById('stuModalStreak').innerText = stats.streakDays || 0;
    document.getElementById('stuModalAi').innerText = stats.aiDoubts || 0;

    let purchasesHtml = '';
    let hasPurchases = false;

    if(user.purchasedCourses && user.purchasedCourses.length > 0) {
        hasPurchases = true;
        user.purchasedCourses.forEach((c, index) => {
            purchasesHtml += `<li style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span><i class="fas fa-book" style="color:#3b82f6; margin-right:5px;"></i> ${c}</span>
                <button onclick="revokeStudentAccess('${uid}', 'course', ${index})" style="background:rgba(239,68,68,0.2); color:#ef4444; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.7rem;"><i class="fas fa-times"></i> Remove</button>
            </li>`;
        });
    }
    
    if(user.purchasedTests && user.purchasedTests.length > 0) {
        hasPurchases = true;
        user.purchasedTests.forEach((t, index) => {
            purchasesHtml += `<li style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span><i class="fas fa-laptop-code" style="color:#10b981; margin-right:5px;"></i> ${t}</span>
                <button onclick="revokeStudentAccess('${uid}', 'test', ${index})" style="background:rgba(239,68,68,0.2); color:#ef4444; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.7rem;"><i class="fas fa-times"></i> Remove</button>
            </li>`;
        });
    }

    if(!hasPurchases) purchasesHtml = '<li style="color:#ef4444;">No courses or tests purchased yet.</li>';
    document.getElementById('stuModalPurchases').innerHTML = purchasesHtml;

    // 🌟 2. NEW BLOCK / DELETE LOGIC
    let actionDiv = document.getElementById('blockStudentBtn').parentElement;
    let oldDel = document.getElementById('deleteUserBtnApp');
    if(oldDel) oldDel.remove(); // पुराना डिलीट बटन हटाओ

    let blockBtn = document.getElementById('blockStudentBtn');
    let isCurrentlyBlocked = user.isBlocked === true;

    // अगर ईमेल मास्टर एडमिन का है (आपका)
    if (user.email === "gauravkumarverma637@gmail.com") {
        blockBtn.style.background = '#94a3b8'; 
        blockBtn.innerHTML = '<i class="fas fa-shield-alt"></i> Admin Protected';
        blockBtn.onclick = function() { alert("🛡️ Master Admin cannot be blocked or deleted!"); };
    } else {
        // अगर नॉर्मल स्टूडेंट है, तो Delete बटन बनाओ
        let delBtn = document.createElement('button');
        delBtn.id = 'deleteUserBtnApp';
        delBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Account';
        delBtn.style.cssText = 'background:#475569; color:white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; font-weight:bold; margin-left:10px;';
        delBtn.onclick = async function() {
            let conf = prompt("WARNING! Type 'DELETE' to permanently remove this user and all their data.");
            if(conf === 'DELETE') {
                try {
                    await db.collection("users").doc(uid).delete();
                    alert("✅ User data permanently deleted from Database.");
                    closeModal('studentDetailsModal');
                    fetchAllRealData();
                } catch(e) { alert("Error: " + e.message); }
            }
        };
        actionDiv.appendChild(delBtn);

        // नॉर्मल स्टूडेंट के लिए Block/Unblock बटन
        if (isCurrentlyBlocked) {
            blockBtn.style.background = '#10b981'; 
            blockBtn.innerHTML = '<i class="fas fa-unlock"></i> Unblock User';
            blockBtn.onclick = function() { toggleBlockStatus(uid, false); };
        } else {
            blockBtn.style.background = '#ef4444'; 
            blockBtn.innerHTML = '<i class="fas fa-ban"></i> Block User';
            blockBtn.onclick = function() { toggleBlockStatus(uid, true); };
        }
    }
    document.getElementById('studentDetailsModal').style.display = 'flex';
}

// बच्चे से कोर्स/टेस्ट वापस छीनना (Revoke Access)
async function revokeStudentAccess(uid, type, index) {
    if(confirm(`⚠️ Are you sure you want to remove this ${type} from the student's account?`)) {
        try {
            let userDoc = await db.collection("users").doc(uid).get();
            let userData = userDoc.data();
            
            if(type === 'course') userData.purchasedCourses.splice(index, 1);
            else userData.purchasedTests.splice(index, 1);
            
            await db.collection("users").doc(uid).update({
                purchasedCourses: userData.purchasedCourses || [],
                purchasedTests: userData.purchasedTests || []
            });
            
            alert("✅ Access Removed successfully!");
            closeModal('studentDetailsModal');
            fetchAllRealData(); 
        } catch(e) { alert("Error: " + e.message); }
    }
}

// स्टूडेंट को ब्लॉक / अनब्लॉक करना
async function toggleBlockStatus(uid, shouldBlock) {
    if(!uid) return alert("❌ Error: User ID not found!");

    let confirmMsg = shouldBlock 
        ? "⚠️ Are you sure you want to BLOCK this student? They will not be able to use the app." 
        : "✅ Are you sure you want to UNBLOCK this student? They will get access back.";

    if(confirm(confirmMsg)) {
        try {
            let btn = document.getElementById('blockStudentBtn');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            btn.disabled = true;

            await db.collection("users").doc(uid).set({ isBlocked: shouldBlock }, { merge: true });
            
            alert(shouldBlock ? "🚫 Student Blocked Successfully!" : "✅ Student Unblocked Successfully!");
            closeModal('studentDetailsModal');
            fetchAllRealData(); 
            
        } catch(e) { alert("Error: " + e.message); } 
        finally { document.getElementById('blockStudentBtn').disabled = false; }
    }
}

// =========================================================================
// 🚀 DYNAMIC QOD BUILDER & HOME UI (आज का प्रश्न और होम स्क्रीन बटन)
// =========================================================================

// होम स्क्रीन के बटन का डेटा लोड करना
async function loadHomeUIControls() {
    try {
        const doc = await db.collection("app_settings").doc("home_ui").get();
        if(doc.exists) {
            let data = doc.data();
            for(let i=1; i<=4; i++) { if(data[`cat${i}`]) document.getElementById(`uiCat${i}`).value = data[`cat${i}`]; }
            for(let i=1; i<=6; i++) { if(data[`btn${i}`]) document.getElementById(`uiBtn${i}`).value = data[`btn${i}`]; }
        }
    } catch(e) { console.log("UI Load Error", e); }
}

async function saveHomeUIConfig() {
    let uiData = {};
    for(let i=1; i<=4; i++) uiData[`cat${i}`] = document.getElementById(`uiCat${i}`).value;
    for(let i=1; i<=6; i++) uiData[`btn${i}`] = document.getElementById(`uiBtn${i}`).value;
    
    try {
        await db.collection("app_settings").doc("home_ui").set(uiData, { merge: true });
        alert("✅ App Home UI Settings Updated Successfully!");
    } catch(e) { alert("Error: " + e.message); }
}

// QoD बिल्डर डब्बा खोलना
let qodRowCount = 0;
async function openQodBuilderModal() {
    document.getElementById('qodBuilderModal').style.display = 'flex';
    document.getElementById('qodListContainer').innerHTML = '<div style="text-align:center; color:white;"><i class="fas fa-spinner fa-spin"></i> Loading QoD Data...</div>';
    
    try {
        const doc = await db.collection("app_settings").doc("qod_data").get();
        document.getElementById('qodListContainer').innerHTML = '';
        qodRowCount = 0;

        if(doc.exists && doc.data().questions && doc.data().questions.length > 0) {
            let data = doc.data();
            document.getElementById('qodPositive').value = data.positiveCoins || 2;
            document.getElementById('qodNegative').value = data.negativeCoins || 0;
            data.questions.forEach(q => addQodRow(q));
        } else { 
            if(typeof dailyQuestions !== 'undefined' && dailyQuestions.length > 0) {
                dailyQuestions.forEach(q => addQodRow(q));
            } else { addQodRow(); }
        }
    } catch(e) { console.log(e); }
}

// QoD में सवाल जोड़ना
function addQodRow(qData = null) {
    qodRowCount++;
    const container = document.getElementById('qodListContainer');
    
    let qEn = qData ? qData.en : ''; let qHi = qData ? qData.hi : '';
    let oEn = qData ? qData.optionsEn : ['', '', '', ''];
    let oHi = qData ? qData.optionsHi : ['', '', '', ''];
    let ans = qData ? qData.ans : 0;

    let html = `
    <div class="qod-row-box" style="background: #0f172a; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #334155; position: relative;">
        <div style="display:flex; justify-content:space-between; margin-bottom:15px; border-bottom:1px solid #334155; padding-bottom:10px;">
            <strong style="color:var(--accent); font-size:1.1rem;"><i class="fas fa-bolt"></i> QoD Question</strong>
            <div>
                <button type="button" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid #3b82f6; padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; margin-right: 10px; font-weight:bold;" onclick="autoTranslateQod(this)"><i class="fas fa-language"></i> Auto Translate to Hindi</button>
                <button type="button" style="background:rgba(239, 68, 68, 0.2); color:#ef4444; border:none; padding:5px 12px; border-radius:6px; cursor:pointer; font-size: 0.8rem; font-weight:bold;" onclick="this.parentElement.parentElement.parentElement.remove()"><i class="fas fa-trash"></i> Remove</button>
            </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:15px;">
            <div><label style="color:#94a3b8; font-size:0.8rem;">Question (English)</label><input type="text" class="qod-q-en" value="${qEn}" style="width:100%; padding:10px; border-radius:6px; border:1px solid #334155; background:#1e293b; color:white;"></div>
            <div><label style="color:#94a3b8; font-size:0.8rem;">Question (Hindi)</label><input type="text" class="qod-q-hi" value="${qHi}" style="width:100%; padding:10px; border-radius:6px; border:1px solid #334155; background:#1e293b; color:white;"></div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;">
            <input type="text" class="qod-opt-en-0" value="${oEn[0]}" style="padding:8px; border-radius:6px; border:1px solid #334155; background:#1e293b; color:white;">
            <input type="text" class="qod-opt-hi-0" value="${oHi[0]}" style="padding:8px; border-radius:6px; border:1px solid #334155; background:#1e293b; color:white;">
            <input type="text" class="qod-opt-en-1" value="${oEn[1]}" style="padding:8px; border-radius:6px; border:1px solid #334155; background:#1e293b; color:white;">
            <input type="text" class="qod-opt-hi-1" value="${oHi[1]}" style="padding:8px; border-radius:6px; border:1px solid #334155; background:#1e293b; color:white;">
            <input type="text" class="qod-opt-en-2" value="${oEn[2]}" style="padding:8px; border-radius:6px; border:1px solid #334155; background:#1e293b; color:white;">
            <input type="text" class="qod-opt-hi-2" value="${oHi[2]}" style="padding:8px; border-radius:6px; border:1px solid #334155; background:#1e293b; color:white;">
            <input type="text" class="qod-opt-en-3" value="${oEn[3]}" style="padding:8px; border-radius:6px; border:1px solid #334155; background:#1e293b; color:white;">
            <input type="text" class="qod-opt-hi-3" value="${oHi[3]}" style="padding:8px; border-radius:6px; border:1px solid #334155; background:#1e293b; color:white;">
        </div>
        <div>
            <label style="color:#10b981; font-size:0.9rem; font-weight:bold;">Correct Answer:</label>
            <select class="qod-ans" style="padding:8px 15px; border-radius:6px; background:#1e293b; color:white; border:1px solid #334155; cursor:pointer;">
                <option value="0" ${ans === 0 ? 'selected' : ''}>Option A</option>
                <option value="1" ${ans === 1 ? 'selected' : ''}>Option B</option>
                <option value="2" ${ans === 2 ? 'selected' : ''}>Option C</option>
                <option value="3" ${ans === 3 ? 'selected' : ''}>Option D</option>
            </select>
        </div>
    </div>`;
    container.insertAdjacentHTML('beforeend', html);
}

// QoD ऑटो ट्रांसलेट
async function autoTranslateQod(btnElement) {
    const block = btnElement.closest('.qod-row-box');
    if(!block) return;
    btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
    btnElement.disabled = true;

    try {
        let qEn = block.querySelector('.qod-q-en').value;
        let opt0 = block.querySelector('.qod-opt-en-0').value;
        let opt1 = block.querySelector('.qod-opt-en-1').value;
        let opt2 = block.querySelector('.qod-opt-en-2').value;
        let opt3 = block.querySelector('.qod-opt-en-3').value;

        if(qEn) block.querySelector('.qod-q-hi').value = await fetchTranslation(qEn);
        if(opt0) block.querySelector('.qod-opt-hi-0').value = await fetchTranslation(opt0);
        if(opt1) block.querySelector('.qod-opt-hi-1').value = await fetchTranslation(opt1);
        if(opt2) block.querySelector('.qod-opt-hi-2').value = await fetchTranslation(opt2);
        if(opt3) block.querySelector('.qod-opt-hi-3').value = await fetchTranslation(opt3);

        btnElement.innerHTML = '<i class="fas fa-check"></i> Translated';
        btnElement.style.color = '#10b981'; btnElement.style.borderColor = '#10b981';
    } catch (e) { alert("Translation failed. Try again."); } 
    finally {
        setTimeout(() => {
            btnElement.innerHTML = '<i class="fas fa-language"></i> Auto Translate to Hindi';
            btnElement.style.color = '#3b82f6'; btnElement.style.borderColor = '#3b82f6';
            btnElement.disabled = false;
        }, 2000);
    }
}

// QoD को सेव करना
async function saveQodConfig() {
    let positiveCoins = Number(document.getElementById('qodPositive').value) || 2;
    let negativeCoins = Number(document.getElementById('qodNegative').value) || 0;
    
    let questions = [];
    document.querySelectorAll('.qod-row-box').forEach(box => {
        let qEn = box.querySelector('.qod-q-en').value.trim();
        let qHi = box.querySelector('.qod-q-hi').value.trim();
        
        if(qEn || qHi) {
            questions.push({
                en: qEn, hi: qHi || qEn,
                optionsEn: [box.querySelector('.qod-opt-en-0').value, box.querySelector('.qod-opt-en-1').value, box.querySelector('.qod-opt-en-2').value, box.querySelector('.qod-opt-en-3').value],
                optionsHi: [box.querySelector('.qod-opt-hi-0').value, box.querySelector('.qod-opt-hi-1').value, box.querySelector('.qod-opt-hi-2').value, box.querySelector('.qod-opt-hi-3').value],
                ans: parseInt(box.querySelector('.qod-ans').value)
            });
        }
    });

    let saveBtn = event.target; saveBtn.innerHTML = "Publishing...";
    try {
        await db.collection("app_settings").doc("qod_data").set({ positiveCoins, negativeCoins, questions });
        alert("✅ Dynamic QoD Updated Successfully!");
        closeModal('qodBuilderModal');
    } catch(e) { alert("Error: " + e.message); } 
    finally { saveBtn.innerHTML = '<i class="fas fa-save"></i> Publish QoD'; }
}

// =========================================================================
// 🗂️ बल्क CSV अपलोड (BULK CSV UPLOAD) - टेस्ट सवालों के लिए
// =========================================================================
function downloadCSVTemplate() {
    let csvContent = "question_en,question_hi,option_a_en,option_a_hi,option_b_en,option_b_hi,option_c_en,option_c_hi,option_d_en,option_d_hi,correct_answer,explanation\n";
    csvContent += "What is CPU?,सीपीयू क्या है?,Central Processing Unit,सेंट्रल प्रोसेसिंग यूनिट,Control Panel,कंट्रोल पैनल,Computer Part,कंप्यूटर पार्ट,None,कोई नहीं,0\n";
    
    let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sk_study_test_template.csv";
    link.click();
}

function handleCSVUpload(event) {
    let file = event.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = function(e) {
        let text = e.target.result;
        let lines = text.split('\n');
        let successCount = 0;
        
        for(let i = 1; i < lines.length; i++) {
            let cols = lines[i].split(',');

            if(cols.length >= 12 && cols[0].trim() !== '') {
                addQuestionBlock();
                let block = document.getElementById(`qb-${qCount}`);
                
                block.querySelector('.q-en').value = cols[0].trim();
                block.querySelector('.q-hi').value = cols[1].trim();
                block.querySelector('.opt-en-0').value = cols[2].trim();
                block.querySelector('.opt-hi-0').value = cols[3].trim();
                block.querySelector('.opt-en-1').value = cols[4].trim();
                block.querySelector('.opt-hi-1').value = cols[5].trim();
                block.querySelector('.opt-en-2').value = cols[6].trim();
                block.querySelector('.opt-hi-2').value = cols[7].trim();
                block.querySelector('.opt-en-3').value = cols[8].trim();
                block.querySelector('.opt-hi-3').value = cols[9].trim();

                let ans = cols[10].trim().toUpperCase();
                let ansMap = { A:0, B:1, C:2, D:3 };
                block.querySelector('.q-ans').value = ansMap[ans] ?? 0;
                block.querySelector('.q-exp').value = cols[11]?.trim() || "";
                successCount++;
            }
        }
        alert(`✅ CSV Uploaded! ${successCount} questions added successfully.`);
        document.getElementById('csvFileInput').value = '';
    };
    reader.readAsText(file);
}

// =========================================================================
// 🚧 मेंटेनेंस मोड (MAINTENANCE MODE)
// =========================================================================
db.collection("app_settings").doc("status").get().then(doc => {
    if(doc.exists) {
        document.getElementById('appStatusToggle').value = doc.data().isMaintenance ? "true" : "false";
        document.getElementById('appStatusMsg').value = doc.data().message || "";
    }
});

async function updateAppStatus() {
    let isMaintenance = document.getElementById('appStatusToggle').value === "true";
    let message = document.getElementById('appStatusMsg').value;
    try {
        await db.collection("app_settings").doc("status").set({ isMaintenance, message });
        alert(isMaintenance ? "🔴 App is now LOCKED for students." : "🟢 App is now LIVE.");
    } catch(e) { alert("Error: " + e.message); }
}

// =========================================================================
// 🎟️ प्रोमो कोड लॉजिक (PROMO CODE LOGIC)
// =========================================================================
db.collection("app_settings").doc("promo_code").get().then(doc => {
    if(doc.exists) {
        let data = doc.data();
        document.getElementById('adminCoursePromo').value = data.courseCode || "";
        document.getElementById('adminCourseDiscount').value = data.courseDiscount || 0;
        document.getElementById('adminTestPromo').value = data.testCode || "";
        document.getElementById('adminTestDiscount').value = data.testDiscount || 0;
    }
});

async function savePromoConfig() {
    let cCode = document.getElementById('adminCoursePromo').value.trim().toUpperCase();
    let cDisc = Number(document.getElementById('adminCourseDiscount').value) || 0;
    let tCode = document.getElementById('adminTestPromo').value.trim().toUpperCase();
    let tDisc = Number(document.getElementById('adminTestDiscount').value) || 0;
    
    try {
        await db.collection("app_settings").doc("promo_code").set({ 
            courseCode: cCode, courseDiscount: cDisc, testCode: tCode, testDiscount: tDisc
        });
        alert(`✅ Promo Codes Updated Successfully!`);
    } catch(e) { alert("Error: " + e.message); }
}

// =========================================================================
// 🖼️ स्मार्ट बैनर स्लाइडर (SMART BANNER SLIDER)
// =========================================================================
function loadAdminBanners() {
    db.collection("app_settings").doc("smart_banners").onSnapshot(doc => {
        let container = document.getElementById('activeBannersList');
        container.innerHTML = '';
        if(doc.exists && doc.data().bannerList) {
            doc.data().bannerList.forEach((banner, index) => {
                container.innerHTML += `
                <div style="position:relative; width: 220px; background:#0f172a; padding:10px; border-radius: 12px; border: 1px solid #334155;">
                    <img src="${banner.img}" style="width:100%; height:100px; object-fit:cover; border-radius:8px; margin-bottom:5px;">
                    <p style="font-size:0.7rem; color:#10b981; word-break:break-all; line-height:1.2;">🔗 ${banner.link || 'No Link'}</p>
                    <button onclick="removeBanner(${index})" style="position:absolute; top:15px; right:15px; background:#ef4444; color:white; border:none; width:30px; height:30px; border-radius:50%; cursor:pointer;"><i class="fas fa-trash"></i></button>
                </div>`;
            });
        }
    });
}
loadAdminBanners(); 

async function addHomepageBanner() {
    let imgUrl = document.getElementById('adminBannerUrl').value.trim();
    let targetLink = document.getElementById('adminBannerLink').value.trim();
    if(!imgUrl) return alert("Please paste an image URL!");
    
    let btn = event.target; btn.innerHTML = "Publishing...";
    try {
        let docRef = db.collection("app_settings").doc("smart_banners");
        let docSnap = await docRef.get();
        let bannerList = docSnap.exists ? docSnap.data().bannerList || [] : [];
        
        bannerList.push({ img: imgUrl, link: targetLink }); 
        await docRef.set({ bannerList });
        
        document.getElementById('adminBannerUrl').value = '';
        document.getElementById('adminBannerLink').value = '';
    } catch(e) { alert(e.message); }
    btn.innerHTML = '<i class="fas fa-upload"></i> PUBLISH SMART BANNER';
}

async function removeBanner(index) {
    let docRef = db.collection("app_settings").doc("smart_banners");
    let docSnap = await docRef.get();
    let bannerList = docSnap.data().bannerList;
    bannerList.splice(index, 1); 
    await docRef.set({ bannerList });
}

// =========================================================================
// 📈 डैशबोर्ड ग्राफ और AI ट्रैकर (Dashboard Graph & AI Log)
// =========================================================================

// 1. डैशबोर्ड ग्राफ
let myChart = null;
function initDashboardChart() {
    const ctx = document.getElementById('activityChart').getContext('2d');
    if(myChart) myChart.destroy(); 
    
    // पिछले 7 दिनों के नाम (Labels) बनाना
    let labels = [];
    let past7Days = [];
    for(let i=6; i>=0; i--) {
        let d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
        past7Days.push(d.toDateString());
    }

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'New Registrations',
                data: [0, 0, 0, 0, 0, 0, 0], // शुरू में 0
                borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3, fill: true, tension: 0.4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', stepSize: 1 } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            },
            plugins: { legend: { labels: { color: 'white' } } }
        }
    });

    // डेटाबेस से असली यूज़र्स लाकर गिनना
    db.collection("users").get().then(snap => {
        let counts = [0, 0, 0, 0, 0, 0, 0];
        
        snap.forEach(doc => {
            let user = doc.data();
            // Firebase Auth या कस्टम डेट से यूज़र का जॉइनिंग दिन निकालना
            // चूँकि हमने signup के टाइम शायद Date नहीं डाली थी, हम lastLoginDate या dummy का सहारा ले सकते हैं
            // लेकिन सबसे सुरक्षित है कि आप auth() metadata यूज़ करें। यहाँ हम एक बेसिक चेकिंग कर रहे हैं:
            
            let userDateStr = user.joinedDate || new Date().toDateString(); // Default to today if not found
            
            let index = past7Days.indexOf(userDateStr);
            if(index !== -1) {
                counts[index]++;
            }
        });
        
        // ग्राफ का डेटा अपडेट करें
        myChart.data.datasets[0].data = counts;
        myChart.update();
    }).catch(e => console.log("Graph Error: ", e));
}

// ⚠️ ध्यान दें: अगर आप चाहते हैं कि यह ग्राफ 100% सटीक काम करे, 
// तो auth.js में processSignup() के अंदर newUser ऑब्जेक्ट में यह लाइन जरूर जोड़ दें:
// joinedDate: new Date().toDateString()
setTimeout(initDashboardChart, 1000);
setTimeout(initDashboardChart, 1000); 

// 2. AI डाउट्स लॉग लोड करना
async function loadAIDoubts() {
    try {
        const snap = await db.collection("ai_doubts_logs").orderBy("timestamp", "desc").limit(50).get();
        let html = '';
        snap.forEach(doc => {
            let d = doc.data();
            let dateStr = d.timestamp ? new Date(d.timestamp.toDate()).toLocaleDateString() : 'Just Now';
            html += `<tr>
                <td style="color: white; font-weight: bold;">${d.userName}<br><span style="font-size:0.75rem; color:#94a3b8; font-weight:normal;">${d.email}</span></td>
                <td style="color: #cbd5e1; max-width: 300px; word-wrap: break-word;">"${d.question}"</td>
                <td><span style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">${dateStr}</span></td>
            </tr>`;
        });
        document.getElementById('aiDoubtsTableBody').innerHTML = html || '<tr><td colspan="3">No questions asked to AI yet.</td></tr>';
    } catch(e) { console.log(e); }
}

// (ये फंक्शन सिर्फ टेस्ट करने के लिए है - एक साथ 100 सवाल बनाने के लिए)
function autoGenerateQuestions() {
    let count = 100;
    for(let i = 1; i <= count; i++) {
        addQuestionBlock();
        let block = document.getElementById(`qb-${qCount}`);
        block.querySelector('.q-en').value = `What is ${i} + ${i}?`;
        block.querySelector('.q-hi').value = `${i} + ${i} कितना होता है?`;
        block.querySelector('.opt-en-0').value = i; block.querySelector('.opt-hi-0').value = i;
        block.querySelector('.opt-en-1').value = i * 2; block.querySelector('.opt-hi-1').value = i * 2;
        block.querySelector('.opt-en-2').value = i + 1; block.querySelector('.opt-hi-2').value = i + 1;
        block.querySelector('.opt-en-3').value = i - 1; block.querySelector('.opt-hi-3').value = i - 1;
        block.querySelector('.q-ans').value = 1;
        block.querySelector('.q-exp').value = `${i} + ${i} = ${i*2}, इसलिए सही उत्तर B है।`;
    }
    alert("🔥 100 Questions Auto Generated Successfully!");
}

// =========================================================================
// 🚀 ADVANCED TEST SERIES BUILDER (Subject -> Section -> Topic -> Test)
// =========================================================================
let tsubCount = 0, tsecCount = 0, ttopCount = 0, tpaperCount = 0;

// 1. सबसे बड़ा फोल्डर (सब्जेक्ट)
function addTestSubjectFolder(subName = '') {
    tsubCount++;
    const container = document.getElementById('testFolderContainer');
    const html = `
    <div class="subject-folder" id="tsub-${tsubCount}" style="border: 2px solid #3b82f6; margin-top: 15px;">
        <div class="subject-header" style="background: rgba(59, 130, 246, 0.1);">
            <i class="fas fa-book" style="color:#3b82f6; font-size:1.2rem;"></i>
            <input type="text" class="sub-name" placeholder="Subject Name (e.g. Maths / GK)" value="${subName}">
            <button class="btn-del" onclick="this.parentElement.parentElement.remove()"><i class="fas fa-trash"></i></button>
        </div>
        <div id="tsecBox-${tsubCount}" style="padding-left:15px; border-left: 2px dashed #334155; margin-left: 15px;"></div>
        <button class="btn-add-topic" style="margin-left:15px; margin-top:10px; background:rgba(139, 92, 246, 0.1); color:#8b5cf6; border-color:#8b5cf6;" onclick="addTestSectionFolder(${tsubCount})"><i class="fas fa-layer-group"></i> Add Section (Full Test / Topic Test)</button>
    </div>`;
    container.insertAdjacentHTML('beforeend', html);
    return tsubCount;
}

// 2. सेक्शन फोल्डर (Full Length या Topic)
function addTestSectionFolder(subId, secName = '') {
    tsecCount++;
    const box = document.getElementById(`tsecBox-${subId}`);
    const html = `
    <div class="topic-folder" id="tsec-${tsecCount}" style="border: 1px solid #8b5cf6; margin-top: 15px;">
        <div class="topic-header">
            <i class="fas fa-layer-group" style="color:#8b5cf6;"></i>
            <input type="text" class="sec-name" placeholder="Section Name (e.g. Full Tests / Topic Tests)" value="${secName}" style="color:#8b5cf6;">
            <button class="btn-del" onclick="this.parentElement.parentElement.remove()"><i class="fas fa-trash"></i></button>
        </div>
        <div id="tsecContent-${tsecCount}" style="padding-left:15px; margin-bottom:10px;"></div>
        <div style="display:flex; gap:15px; margin-left:15px; border-top: 1px solid #334155; padding-top: 10px;">
            <button class="btn-add-topic" style="margin-left:0; color:#f59e0b; border-color:#f59e0b;" onclick="addTestTopicFolder(${tsecCount})"><i class="fas fa-folder"></i> Add Topic Folder</button>
            <button class="btn-add-content" style="margin-left:0; color:#10b981; border-color:#10b981;" onclick="addTestPaperRow('tsecContent-${tsecCount}')"><i class="fas fa-file-signature"></i> Add Direct Test (Full Length)</button>
        </div>
    </div>`;
    box.insertAdjacentHTML('beforeend', html);
    return tsecCount;
}

// 3. टॉपिक फोल्डर
function addTestTopicFolder(secId, topicName = '') {
    ttopCount++;
    const box = document.getElementById(`tsecContent-${secId}`);
    const html = `
    <div class="topic-folder" id="ttop-${ttopCount}" style="border: 1px dashed #f59e0b; margin-top: 10px; margin-left: 0;">
        <div class="topic-header">
            <i class="fas fa-folder" style="color:#f59e0b;"></i>
            <input type="text" class="top-name" placeholder="Topic Name (e.g. Percentage / History)" value="${topicName}" style="color:#f59e0b;">
            <button class="btn-del" onclick="this.parentElement.parentElement.remove()"><i class="fas fa-trash"></i></button>
        </div>
        <div id="ttopContent-${ttopCount}"></div>
        <button class="btn-add-content" style="color:#10b981; border-color:#10b981; margin-left:20px;" onclick="addTestPaperRow('ttopContent-${ttopCount}')"><i class="fas fa-file-alt"></i> Add Topic Test</button>
    </div>`;
    box.insertAdjacentHTML('beforeend', html);
    return ttopCount;
}

// 4. टेस्ट पेपर रो (CSV Upload के साथ)
function addTestPaperRow(containerId, title = '', duration = 60, questionsJson = '[]') {
    tpaperCount++;
    const box = document.getElementById(containerId);
    
    const html = `
    <div class="content-item test-file-row" style="border-left: 4px solid #10b981; flex-wrap: nowrap; gap: 10px; background:#0f172a; margin-top:8px;">
        <i class="fas fa-file-signature" style="color:#10b981; font-size:1.2rem;"></i>
        <input type="text" class="tp-title" placeholder="Test Name (e.g. Mock 1)" value="${title}" style="flex:2; border:1px solid #334155;">
        <input type="number" class="tp-duration" placeholder="Mins" value="${duration}" style="width:70px; border:1px solid #334155;">
        <input type="hidden" class="tp-questions-data" value='${questionsJson}'>
        <input type="file" id="csv-upload-${tpaperCount}" accept=".csv" style="display:none;" onchange="processTestCSV(this)">
        <button class="file-upload-btn" style="background:#3b82f6; white-space:nowrap; padding:10px;" onclick="document.getElementById('csv-upload-${tpaperCount}').click()"><i class="fas fa-upload"></i> Upload CSV</button>
        <button class="btn-del" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    </div>`;
    box.insertAdjacentHTML('beforeend', html);
}

// CSV से सवाल पढ़कर JSON में बदलना
function processTestCSV(inputElement) {
    let file = inputElement.files[0];
    if (!file) return;

    let btn = inputElement.nextElementSibling;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reading...';

    let reader = new FileReader();
    reader.onload = function(e) {
        let text = e.target.result;
        let lines = text.split('\n');
        let questions = [];
        
        for(let i = 1; i < lines.length; i++) {
            let cols = lines[i].split(',');
            if(cols.length >= 11 && cols[0].trim() !== '') {
                questions.push({
                    qEn: cols[0].trim(), qHi: cols[1].trim(),
                    optsEn: [cols[2].trim(), cols[4].trim(), cols[6].trim(), cols[8].trim()],
                    optsHi: [cols[3].trim(), cols[5].trim(), cols[7].trim(), cols[9].trim()],
                    ans: parseInt(cols[10].trim()),
                    exp: cols[11] ? cols[11].trim() : "No explanation provided."
                });
            }
        }
        
        inputElement.previousElementSibling.value = JSON.stringify(questions);
        btn.innerHTML = `<i class="fas fa-check"></i> ${questions.length} Qs Ready`;
        btn.style.background = '#10b981';
    };
    reader.readAsText(file);
}

// 💾 पूरे टेस्ट सीरीज को डेटाबेस में सेव करना
async function saveTestSeriesToDB() {
    let editingId = document.getElementById('editingTestId').value;
    let title = document.getElementById('tTitle').value;
    let category = document.getElementById('tCategory').value;
    let newPrice = document.getElementById('tNewPrice').value;
    
    if(!title || !newPrice) return alert("Title and Price are required!");

    let btn = document.getElementById('saveTestBtn');
    btn.innerHTML = 'Publishing Series...'; btn.disabled = true;

    let syllabus = [];

    // फोल्डर्स को लूप करना (Subject -> Section -> Topic/Direct Test)
    document.querySelectorAll('.subject-folder').forEach(subDiv => {
        let subName = subDiv.querySelector('.sub-name').value.trim();
        if(!subName) return;

        let sections = [];
        subDiv.querySelectorAll('.topic-folder[id^="tsec-"]').forEach(secDiv => {
            let secName = secDiv.querySelector('.sec-name').value.trim();
            if(!secName) return;

            let directTests = []; let topics = [];

            // A. डायरेक्ट टेस्ट्स (Full Tests)
            let secContentBox = secDiv.querySelector('div[id^="tsecContent-"]');
            Array.from(secContentBox.children).forEach(child => {
                if(child.classList.contains('test-file-row')) {
                    let tpTitle = child.querySelector('.tp-title').value.trim();
                    let tpDur = parseInt(child.querySelector('.tp-duration').value) || 60;
                    let tpQs = JSON.parse(child.querySelector('.tp-questions-data').value || '[]');
                    if(tpTitle && tpQs.length > 0) directTests.push({ title: tpTitle, duration: tpDur, questions: tpQs });
                }
            });

            // B. टॉपिक वाले टेस्ट्स
            secDiv.querySelectorAll('.topic-folder[id^="ttop-"]').forEach(topDiv => {
                let topName = topDiv.querySelector('.top-name').value.trim();
                if(!topName) return;

                let topicTests = [];
                topDiv.querySelectorAll('.test-file-row').forEach(item => {
                    let tpTitle = item.querySelector('.tp-title').value.trim();
                    let tpDur = parseInt(item.querySelector('.tp-duration').value) || 60;
                    let tpQs = JSON.parse(item.querySelector('.tp-questions-data').value || '[]');
                    if(tpTitle && tpQs.length > 0) topicTests.push({ title: tpTitle, duration: tpDur, questions: tpQs });
                });
                topics.push({ topicName: topName, tests: topicTests });
            });

            sections.push({ sectionName: secName, directTests: directTests, topics: topics });
        });
        syllabus.push({ subjectName: subName, sections: sections });
    });

    let testData = { 
        title, category, 
        oldPrice: Number(document.getElementById('tOldPrice').value) || 0, 
        price: Number(newPrice) || 0, 
        validity: document.getElementById('tValidity').value || "6 Months", 
        image: document.getElementById('tBannerBase64').value, 
        positiveMarks: Number(document.getElementById('tPositive').value) || 2,
        negativeMarking: Number(document.getElementById('tNegative').value) || 0,
        syllabus: syllabus, isTestSeries: true 
    };

    try {
        if(editingId) { 
            await db.collection("tests").doc(editingId).update(testData); 
            alert("✅ Test Series Updated!"); 
        } else { 
            testData.createdAt = firebase.firestore.FieldValue.serverTimestamp(); 
            await db.collection("tests").add(testData); 
            alert("✅ New Test Series Published!"); 
        }
        closeModal('addTestModal'); fetchTestsData();
    } catch(e) { alert("Error: " + e.message); } 
    finally { btn.innerHTML = '🚀 Publish Test Series'; btn.style.background = '#10b981'; btn.disabled = false; }
}

// --- PAYMENT APPROVAL LOGIC ---
// admin.js - पेमेंट टेबल का नया रियल-टाइम कोड
db.collection("payments").orderBy("timestamp", "desc").onSnapshot(snap => {
    let html = '';
    snap.forEach(doc => {
        let data = doc.data();
        let itemsList = data.items.map(i => `${i.title} (${i.type})`).join(', ');
        
        // स्टेटस के हिसाब से बैज का रंग तय करना
        let statusBadge = '';
        let actionButtons = '';

        if(data.status === "Pending") {
            statusBadge = `<span style="background:#f59e0b; color:white; padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:bold;">Pending</span>`;
            // सिर्फ Pending वालों को ही Approve/Reject का बटन दिखेगा
            actionButtons = `
                <button style="background:#10b981; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;" onclick="approvePayment('${doc.id}', '${data.uid}')"><i class="fas fa-check"></i></button>
                <button style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; margin-left:5px;" onclick="rejectPayment('${doc.id}')"><i class="fas fa-times"></i></button>
            `;
        } else if(data.status === "Approved") {
            statusBadge = `<span style="background:#10b981; color:white; padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:bold;"><i class="fas fa-check-circle"></i> Approved</span>`;
            actionButtons = `<span style="color:#94a3b8; font-size:0.8rem;">Done</span>`;
        } else {
            statusBadge = `<span style="background:#ef4444; color:white; padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:bold;"><i class="fas fa-times-circle"></i> Rejected</span>`;
            actionButtons = `<span style="color:#94a3b8; font-size:0.8rem;">Done</span>`;
        }

        html += `<tr>
            <td><strong style="color:white;">${data.name}</strong><br><span style="font-size:0.75rem; color:#94a3b8;">${data.phone}</span></td>
            <td><strong style="color:#10b981;">₹${data.amount}</strong><br><span style="font-size:0.8rem; color:#94a3b8;">UTR: ${data.utr}</span></td>
            <td style="font-size:0.85rem; color:#e2e8f0; max-width:200px;">${itemsList}</td>
            <td>${statusBadge}</td>
            <td>${actionButtons}</td>
        </tr>`;
    });
    
    let tbody = document.getElementById('paymentTableBody');
    if(tbody) tbody.innerHTML = html || '<tr><td colspan="5">No payments found.</td></tr>';
});

// Reject वाले फंक्शन को भी अपडेट कर लें (अगर पहले से नहीं है)
window.rejectPayment = async function(payId) {
    if(confirm("इस पेमेंट रिक्वेस्ट को रिजेक्ट (Reject) करना है?")) {
        await db.collection("payments").doc(payId).update({ status: "Rejected" });
    }
}

window.approvePayment = async function(payId, userId) {
    if(!confirm("क्या आपने बैंक में पेमेंट चेक कर लिया है? Appove करें?")) return;
    try {
        let payDoc = await db.collection("payments").doc(payId).get();
        let items = payDoc.data().items;
        
        let userDoc = await db.collection("users").doc(userId).get();
        let userData = userDoc.data();
        
        // बच्चे के अकाउंट में कोर्स और टेस्ट डालना
        items.forEach(item => {
            if(item.type === 'course' && !userData.purchasedCourses.includes(item.title)) {
                userData.purchasedCourses.push(item.title);
            }
            if(item.type === 'test' && !userData.purchasedTests.includes(item.title)) {
                userData.purchasedTests.push(item.title);
            }
        });
        
        await db.collection("users").doc(userId).update({
            purchasedCourses: userData.purchasedCourses,
            purchasedTests: userData.purchasedTests
        });
        await db.collection("payments").doc(payId).update({ status: "Approved" });
        alert("✅ Payment Approved! बच्चे को कोर्स/टेस्ट मिल गया है।");
    } catch(e) { alert("Error: " + e.message); }
}

window.rejectPayment = async function(payId) {
    if(confirm("इस पेमेंट रिक्वेस्ट को रिजेक्ट (Reject) करना है?")) {
        await db.collection("payments").doc(payId).update({ status: "Rejected" });
    }
}
// =========================================================================
// 📚 SYLLABUS FOLDER BUILDER (DEDICATED)
// =========================================================================


let sylExamCount = 0;

function addSylExam(name = '') {
    sylExamCount++;
    let html = `
    <div class="subject-folder syl-exam" style="border: 1px solid #ea580c; margin-bottom: 15px;">
        <div class="subject-header" style="background:rgba(234, 88, 12, 0.1);">
            <i class="fas fa-folder" style="color:#ea580c;"></i>
            <input type="text" class="e-name" placeholder="Exam Folder Name (e.g. Maths Notes)" value="${name}">
            <button class="btn-del" onclick="this.parentElement.parentElement.remove()"><i class="fas fa-trash"></i></button>
        </div>
        <div id="sylPdfBox-${sylExamCount}" style="padding-left:15px;"></div>
        <button class="btn-add-content" style="color:#ef4444; border-color:#ef4444; margin-left: 15px;" onclick="addSylPdf(${sylExamCount})"><i class="fas fa-file-pdf"></i> Add PDF Here</button>
    </div>`;
    document.getElementById('syllabusBuilderContainer').insertAdjacentHTML('beforeend', html);
    return sylExamCount;
}

function addSylPdf(examId, title = '', link = '') {
    let html = `
    <div class="content-item syl-pdf" style="border-left: 3px solid #ef4444; background:#0f172a; margin-bottom: 8px;">
        <i class="fas fa-file-pdf" style="color:#ef4444; font-size:1.2rem;"></i>
        <input type="text" class="p-title" placeholder="PDF Title" value="${title}" style="flex:1; padding:8px; border-radius:6px; border:1px solid #334155; background:#1e293b; color:white;">
        <input type="text" class="p-link" placeholder="Paste Google Drive PDF Link" value="${link}" style="flex:2; padding:8px; border-radius:6px; border:1px solid #334155; background:#1e293b; color:white;">
        <button class="btn-del" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    </div>`;
    document.getElementById(`sylPdfBox-${examId}`).insertAdjacentHTML('beforeend', html);
}

async function saveSyllabusToDB() {
    let btn = event.target; btn.innerText = "Saving..."; btn.disabled = true;
    let syllabus = [];
    
    document.querySelectorAll('.syl-exam').forEach(examDiv => {
        let examName = examDiv.querySelector('.e-name').value.trim();
        if(!examName) return;
        
        let pdfs = [];
        examDiv.querySelectorAll('.syl-pdf').forEach(pdfDiv => {
            let pTitle = pdfDiv.querySelector('.p-title').value.trim();
            let pLink = pdfDiv.querySelector('.p-link').value.trim();
            if(pTitle && pLink) pdfs.push({ title: pTitle, link: pLink });
        });
        
        syllabus.push({ examName: examName, pdfs: pdfs });
    });

    try {
        await db.collection("app_settings").doc("syllabus_data").set({ syllabus });
        alert("✅ Syllabus Updated Successfully!");
    } catch(e) { alert("Error: " + e.message); }
    btn.innerHTML = '<i class="fas fa-save"></i> Save Syllabus'; btn.disabled = false;
}

// पुराना सिलेबस लोड करने का कोड
db.collection("app_settings").doc("syllabus_data").get().then(doc => {
    if(doc.exists && doc.data().syllabus) {
        document.getElementById('syllabusBuilderContainer').innerHTML = '';
        doc.data().syllabus.forEach(exam => {
            let eid = addSylExam(exam.examName); // Note: Purana data (subject->topic) crash ho sakta hai, naya save karein
            if(exam.pdfs) {
                exam.pdfs.forEach(pdf => addSylPdf(eid, pdf.title, pdf.link));
            }
        });
    }
});

// 🔄 पहले का बना हुआ सिलेबस लोड करना
db.collection("app_settings").doc("syllabus_data").get().then(doc => {
    if(doc.exists && doc.data().syllabus) {
        document.getElementById('syllabusBuilderContainer').innerHTML = '';
        doc.data().syllabus.forEach(sub => {
            let sid = addSylSubject(sub.subjectName);
            sub.topics.forEach(top => {
                let tid = addSylTopic(sid, top.topicName);
                top.pdfs.forEach(pdf => addSylPdf(tid, pdf.title, pdf.link));
            });
        });
    }
});