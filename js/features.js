/**
 * ============================================================================
 * 🚀 FEATURES.JS
 * ----------------------------------------------------------------------------
 * Description : Handles Question of the Day (QoD) logic and Motivational Quotes.
 *               100% controlled by Firebase Admin Panel.
 * ============================================================================
 */

// 🔹 1. DAILY MOTIVATIONAL QUOTES (Now controlled by Admin via main.js)
// Note: Local static quotes removed. main.js handles quotes directly from DB.
function updateDailyQuote() {
    // This function is kept empty so existing calls to it don't throw errors.
    // The actual quote is set in main.js -> syncAppWithAdmin()
    console.log("Quotes are now dynamically managed by Admin Panel.");
}

// 🔹 2. QUESTION OF THE DAY (QOD) LOGIC (100% Dynamic)
function renderDailyQOD() {
    let user = getUserData();
    if(!user) return;
    if(!user.qodAnswers) user.qodAnswers = {};

    let container = document.getElementById('qodContainerMain');

    // 🔥 NEW: Check if Admin has uploaded questions in the database
    if(!window.dynamicQoDConfig || !window.dynamicQoDConfig.questions || window.dynamicQoDConfig.questions.length === 0) {
        let emptyMsg = currentLang === 'hi' 
            ? "आज एडमिन द्वारा कोई प्रश्न (QoD) अपलोड नहीं किया गया है।" 
            : "No Question of the Day uploaded by Admin today.";
            
        container.innerHTML = `<div style="text-align:center; padding:30px; background:var(--white); border-radius:15px; color:var(--text-gray); box-shadow:0 4px 10px rgba(0,0,0,0.05);">
            <i class="fas fa-box-open" style="font-size:3rem; margin-bottom:15px; opacity:0.5;"></i><br>${emptyMsg}
        </div>`;
        return;
    }

    let dbQuestions = window.dynamicQoDConfig.questions;
    currentQodIndex = 0;
    
    // Find the first unanswered question
    while(currentQodIndex < dbQuestions.length && user.qodAnswers[currentQodIndex] !== undefined) {
        currentQodIndex++;
    }

    // If all questions are answered, show report. Else, show the question.
    if(currentQodIndex >= dbQuestions.length) { 
        showQodReport(); 
    } else { 
        renderSingleQOD(currentQodIndex, dbQuestions); 
    }
}

function renderSingleQOD(index, dbQuestions) {
    let q = dbQuestions[index];
    let container = document.getElementById('qodContainerMain');
    let optsHtml = '';
    
    // Generate Options UI
    for(let optIndex = 0; optIndex < q.optionsEn.length; optIndex++) {
        optsHtml += `
            <div class="qod-opt-premium" onclick="answerQOD(${index}, ${optIndex}, this)">
                <div class="qod-opt-content">
                    <span class="opt-letter">${String.fromCharCode(65 + optIndex)}</span>
                    <div class="opt-text">
                        <div class="opt-text-en">${q.optionsEn[optIndex]}</div>
                        <div class="opt-text-hi">${q.optionsHi[optIndex]}</div>
                    </div>
                </div>
                <div class="status-icon"></div>
            </div>
        `;
    }

    let progressPercent = ((index) / dbQuestions.length) * 100;
    let rewardCoins = window.dynamicQoDConfig.positive || 2;

    container.innerHTML = `
        <div class="qod-premium-card">
            <div class="qod-progress-bg"><div class="qod-progress-fill" style="width: ${progressPercent}%;"></div></div>
            <div class="qod-header-premium">
                <span class="q-count">Question ${index + 1} / ${dbQuestions.length}</span>
                <span class="q-reward"><i class="fas fa-coins"></i> +${rewardCoins} Coins</span>
            </div>
            <div class="qod-question-box">
                <div class="qod-question-en">${q.en}</div>
                <div class="qod-question-hi">${q.hi}</div>
            </div>
            <div class="qod-options-premium" id="currentQodOptions">${optsHtml}</div>
            <button class="qod-next-btn translatable" id="qodNextBtn" data-en="Continue to Next" data-hi="अगला प्रश्न" onclick="renderDailyQOD()">Continue to Next <i class="fas fa-arrow-right"></i></button>
        </div>
    `;
    
    if(currentLang === 'hi') document.getElementById('qodNextBtn').innerHTML = 'अगला प्रश्न <i class="fas fa-arrow-right"></i>';
}

function answerQOD(qIndex, selectedOptIndex, element) {
    let user = getUserData();
    let dbQuestions = window.dynamicQoDConfig.questions;
    let posCoins = window.dynamicQoDConfig.positive || 2;
    let negCoins = window.dynamicQoDConfig.negative || 0;
    
    let qData = dbQuestions[qIndex];
    let isCorrect = (qData.ans === selectedOptIndex);

    user.qodAnswers[qIndex] = selectedOptIndex;
    
    if(user.stats.streakDays === 0) user.stats.streakDays = 1;

    // 🔥 NEGATIVE MARKING LOGIC 🔥
    if(isCorrect) {
         
        element.style.borderColor = "#10b981"; // Green for correct
        element.style.background = "rgba(16, 185, 129, 0.1)";
        showToast(currentLang === 'hi' ? `सही जवाब! +${posCoins} कॉइन्स` : `Correct! +${posCoins} Coins`, 'success');
    } else {
        user.stats.coins -= negCoins; // Deduct Negative Coins
        if(user.stats.coins < 0) user.stats.coins = 0; // Coins can't go below 0
        element.style.borderColor = "#ef4444"; // Red for wrong
        element.style.background = "rgba(239, 68, 68, 0.1)";
        showToast(currentLang === 'hi' ? `गलत जवाब! -${negCoins} कॉइन्स` : `Wrong! -${negCoins} Coins`, 'error');
    }

    if (isCorrect) {
    // 1. UI अपडेट करें
    element.style.borderColor = "#10b981";
    element.style.background = "rgba(16, 185, 129, 0.1)";
    showToast(currentLang === 'hi' ? `सही जवाब! +${posCoins} कॉइन्स` : `Correct! +${posCoins} Coins`, 'success');
    
    // 2. डेटाबेस में सुरक्षित तरीके से कॉइन बढ़ाएं (हैक प्रूफ)
    db.collection("users").doc(user.uid).update({
        "stats.coins": firebase.firestore.FieldValue.increment(posCoins)
    }).then(() => {
        // लोकल डेटा भी अपडेट कर लें
        user.stats.coins += posCoins;
        document.getElementById('homeCoins').innerText = user.stats.coins;
    });

} else {
    // गलत होने पर नेगेटिव कॉइन का लॉजिक
    element.style.borderColor = "#ef4444";
    element.style.background = "rgba(239, 68, 68, 0.1)";
    showToast(currentLang === 'hi' ? `गलत जवाब! -${negCoins} कॉइन्स` : `Wrong! -${negCoins} Coins`, 'error');
    
    if (negCoins > 0 && user.stats.coins > 0) {
        db.collection("users").doc(user.uid).update({
            "stats.coins": firebase.firestore.FieldValue.increment(-negCoins)
        }).then(() => {
            user.stats.coins = Math.max(0, user.stats.coins - negCoins);
            document.getElementById('homeCoins').innerText = user.stats.coins;
        });
    }
}

// QoD के आंसर को सेव करना
user.qodAnswers[qIndex] = selectedOptIndex;
db.collection("users").doc(user.uid).update({
    qodAnswers: user.qodAnswers,
    "stats.streakDays": firebase.firestore.FieldValue.increment(user.stats.streakDays === 0 ? 1 : 0)
}); 

    let optionsBox = document.getElementById('currentQodOptions');
    optionsBox.classList.add('answered');

    document.getElementById('homeCoins').innerText = user.stats.coins;
    document.getElementById('qodNextBtn').style.display = 'block';
}

function showQodReport() {
    let user = getUserData();
    let dbQuestions = window.dynamicQoDConfig.questions;
    let posCoins = window.dynamicQoDConfig.positive || 2;
    
    let correctCount = 0; let wrongCount = 0; let coinsWon = 0;

    for(let i = 0; i < dbQuestions.length; i++) {
        if(user.qodAnswers[i] === dbQuestions[i].ans) { 
            correctCount++; 
            coinsWon += posCoins; 
        } 
        else if(user.qodAnswers[i] !== undefined) { 
            wrongCount++; 
        }
    }

    let container = document.getElementById('qodContainerMain');
    container.innerHTML = `
        <div class="qod-report-card">
            <i class="fas fa-trophy" style="font-size: 3rem; color: #f1c40f; margin-bottom: 10px;"></i>
            <h3 class="translatable" data-en="Today's Report" data-hi="आज की रिपोर्ट" style="margin-bottom:20px; color:#f1c40f;">Today's Report</h3>
            <div class="qod-stats-grid">
                <div class="qod-stat-box" style="border-bottom: 3px solid #2ecc71;">
                    <span style="color:#2ecc71;">${correctCount}</span><p class="translatable" data-en="Correct" data-hi="सही">Correct</p>
                </div>
                <div class="qod-stat-box" style="border-bottom: 3px solid #e74c3c;">
                    <span style="color:#e74c3c;">${wrongCount}</span><p class="translatable" data-en="Wrong" data-hi="गलत">Wrong</p>
                </div>
                <div class="qod-stat-box" style="border-bottom: 3px solid #f1c40f;">
                    <span style="color:#f1c40f;">+${coinsWon}</span><p class="translatable" data-en="Coins Won" data-hi="जीते गए कॉइन्स">Coins Won</p>
                </div>
            </div>
            <button onclick="showQodAnswerKey()" style="background: var(--primary); color: white; border: none; padding: 12px 20px; border-radius: 10px; font-weight: bold; cursor: pointer; width: 100%; margin-top: 10px;"><i class="fas fa-list"></i> View Answer Key</button>
        </div>
    `;
}

// 🔹 3. SHOW ANSWER KEY
function showQodAnswerKey() {
    let user = getUserData();
    let dbQuestions = window.dynamicQoDConfig.questions;
    let container = document.getElementById('qodContainerMain');
    
    let html = `<div style="background: var(--white); border-radius: 15px; padding: 15px; margin-bottom: 100px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <h3 style="margin-bottom: 15px; text-align:center;" class="translatable" data-en="Answer Key" data-hi="उत्तर कुंजी">Answer Key</h3>`;
    
    dbQuestions.forEach((q, i) => {
        let userAnsIndex = user.qodAnswers[i];
        
        let correctEn = q.optionsEn[q.ans];
        let correctHi = q.optionsHi[q.ans];
        
        let userEn = userAnsIndex !== undefined ? q.optionsEn[userAnsIndex] : "Not Answered";
        let userHi = userAnsIndex !== undefined ? q.optionsHi[userAnsIndex] : "उत्तर नहीं दिया";
        
        let isCorrect = userAnsIndex === q.ans;
        let color = isCorrect ? "#27ae60" : "#c0392b";
        let icon = isCorrect ? "fa-check-circle" : "fa-times-circle";

        html += `
            <div style="border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 15px;">
                <p style="font-weight: bold; font-size: 0.9rem; margin-bottom: 8px;">Q${i+1}. <span class="translatable" data-en="${q.en}" data-hi="${q.hi}">${currentLang === 'hi' ? q.hi : q.en}</span></p>
                
                <p style="font-size: 0.8rem; color: #555;">
                    <span class="translatable" data-en="Your Answer:" data-hi="आपका उत्तर:">Your Answer:</span> 
                    <span style="color: ${color}; font-weight: bold;"><i class="fas ${icon}"></i> <span class="translatable" data-en="${userEn}" data-hi="${userHi}">${currentLang === 'hi' ? userHi : userEn}</span></span>
                </p>
                
                ${!isCorrect ? `<p style="font-size: 0.8rem; color: #555; margin-top: 4px;">
                    <span class="translatable" data-en="Correct Answer:" data-hi="सही उत्तर:">Correct Answer:</span> 
                    <span style="color: #27ae60; font-weight: bold;"><i class="fas fa-check-circle"></i> <span class="translatable" data-en="${correctEn}" data-hi="${correctHi}">${currentLang === 'hi' ? correctHi : correctEn}</span></span>
                </p>` : ''}
            </div>
        `;
    });
    
    html += `<button onclick="showQodReport()" class="translatable" data-en="Back to Report" data-hi="रिपोर्ट पर वापस जाएँ" style="background: #333; color: white; border: none; padding: 10px; width: 100%; border-radius: 8px; font-weight: bold;">Back to Report</button></div>`;
    container.innerHTML = html;
}