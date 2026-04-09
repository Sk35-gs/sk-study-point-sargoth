/* ========================================================================= */
/* 🤖 AI.JS - AI चैटबॉट (AI SOLVER) का पूरा लॉजिक                             */
/* यह फ़ाइल बच्चों के सवालों को AI के पास भेजती है और जवाब लाकर स्क्रीन पर दिखाती है */
/* ========================================================================= */

// -------------------------------------------------------------------------
// फ़ंक्शन 1: सुरक्षा (Security Check)
// यह फ़ंक्शन यूजर के मैसेज से खतरनाक कोड (HTML Injection) को हटाता है।
// ताकि कोई हैकर इनपुट बॉक्स में कोड डालकर ऐप को हैक न कर सके।
// -------------------------------------------------------------------------
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, function(tag) {
        const charsToReplace = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
        return charsToReplace[tag] || tag;
    });
}

// -------------------------------------------------------------------------
// फ़ंक्शन 2: AI को मैसेज भेजना और जवाब लाना (Main Chat Function)
// -------------------------------------------------------------------------
async function handleSendAI() {
    // HTML से इनपुट बॉक्स, सेंड बटन और चैट एरिया को पकड़ना
    const userInput = document.getElementById('aiInput');
    const text = userInput.value.trim(); // आगे-पीछे का खाली स्पेस हटाना
    const sendBtn = document.getElementById('sendBtn');
    const chatArea = document.getElementById('chatArea');

    // अगर बॉक्स खाली है या पहले से कोई AI प्रोसेस चल रहा है, तो कुछ मत करो
    if (!text || isAiProcessing) return;
    
    // प्रोसेसिंग चालू कर दो और सेंड बटन को बंद (disabled) कर दो ताकि बच्चा बार-बार क्लिक न करे
    isAiProcessing = true; 
    sendBtn.disabled = true;

    // 1. बच्चे (यूजर) का मैसेज स्क्रीन पर दिखाना
    // पहले मैसेज को सुरक्षित (escape) किया, फिर लाइन ब्रेक (\n) को <br> में बदला
    let safeText = escapeHTML(text).replace(/\n/g, '<br>');
    chatArea.innerHTML += `<div class="msg msg-user">${safeText}</div>`;
    
    // इनपुट बॉक्स को खाली करना और स्क्रॉल को सबसे नीचे ले जाना
    userInput.value = ''; 
    chatArea.scrollTop = chatArea.scrollHeight;

    // 2. लोडिंग वाला मैसेज दिखाना (Finding answer...)
    const loadingId = "loading-" + Date.now(); // हर लोडिंग मैसेज को एक यूनिक ID दी गई है
    chatArea.innerHTML += `<div class="msg msg-ai" id="${loadingId}" style="color: var(--primary); font-weight: 600;">
        <i class="fas fa-circle-notch fa-spin"></i> ${currentLang === 'hi' ? 'जवाब ढूंढ रहा हूँ...' : 'Finding answer...'}
    </div>`;
    chatArea.scrollTop = chatArea.scrollHeight;
    
    // 3. एडमिन के देखने के लिए: बच्चे का सवाल डेटाबेस (Firestore) में सेव करना
    if(user && typeof db !== 'undefined') {
        db.collection("ai_doubts_logs").add({
            userName: user.name,
            email: user.email,
            question: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp() // सर्वर का टाइम
        }).catch(e => console.log("Log error:", e));
    }

    try {
        // 4. AI API को रिक्वेस्ट भेजना
        // भाषा के हिसाब से AI को कमांड (Prompt) देना कि उसे कैसे जवाब देना है
        const systemPrompt = currentLang === 'hi' ? 
            "You are a helpful study assistant for SK STUDY POINT. Answer strictly in clear Hindi: " : 
            "You are a helpful study assistant for SK STUDY POINT. Answer in clear English: ";
            
        const finalPrompt = systemPrompt + text;
        
        // Pollinations AI का URL और CORS एरर से बचने के लिए Proxy URL
        const targetUrl = 'https://text.pollinations.ai/' + encodeURIComponent(finalPrompt);
        const proxyUrl = 'https://api.allorigins.win/get?disableCache=true&url=' + encodeURIComponent(targetUrl);

        // API से डेटा मंगाना
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("API Server Error"); // अगर सर्वर डाउन है तो एरर देना

        const data = await response.json();
        let reply = data.contents; 
        
        // अगर API ने ब्लॉक कर दिया या कोई खराब जवाब दिया
        if (!reply || reply.includes("IMPORTANT NOTICE")) throw new Error("API Blocked");
        
        // 5. AI के जवाब को सुंदर बनाना (Bold टेक्स्ट और नई लाइन को सेट करना)
        reply = reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        reply = reply.replace(/\n/g, '<br>');
        
        // लोडिंग वाला मैसेज हटाना और असली जवाब स्क्रीन पर दिखाना
        document.getElementById(loadingId).remove();
        chatArea.innerHTML += `<div class="msg msg-ai"><i class="fas fa-robot" style="color:var(--primary); margin-right:5px;"></i> ${reply}</div>`;
    
    } catch (err) {
        // अगर ऊपर के प्रोसेस में कोई भी एरर (नेटवर्क या API) आता है, तो यह हिस्सा चलेगा
        document.getElementById(loadingId).remove(); // लोडिंग हटाओ
        let backupReply = currentLang === 'hi' ? 
            "माफ़ करना, अभी नेटवर्क में समस्या है। कृपया 1 मिनट बाद फिर से कोशिश करें।" : 
            "Sorry, there is a network issue right now. Please try again in 1 minute.";
        chatArea.innerHTML += `<div class="msg msg-ai"><i class="fas fa-robot" style="color:#ef4444; margin-right:5px;"></i> ${backupReply}</div>`;
    }
    
    // 6. जवाब आने के बाद सब कुछ वापस नॉर्मल करना
    isAiProcessing = false; // प्रोसेसिंग खत्म
    sendBtn.disabled = false; // बटन वापस चालू
    chatArea.scrollTop = chatArea.scrollHeight; // स्क्रॉल नीचे
    
    // 7. गेमिफिकेशन (Gamification): बच्चे ने AI का यूज़ किया है, तो उसके खाते (Profile) में गिनती बढ़ाना
    let user = getUserData(); // लोकल स्टोरेज से डेटा निकाला
    if(user) {
        user.stats.aiDoubts = (user.stats.aiDoubts || 0) + 1; // गिनती +1 की
        saveUserData(user); // वापस सेव कर दिया
        
        // स्क्रीन पर भी गिनती अपडेट कर दी
        let statAi = document.getElementById('statDoubts');
        if(statAi) statAi.innerText = user.stats.aiDoubts + " Questions";
    }
}