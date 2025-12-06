// Use relative API paths so frontend and API can be served from the same origin
const API = "";

// Simple cancelable typewriter: call `startTyping(el, text, msPerChar)`.
// If called again on the same element, the previous typing is cancelled.
async function startTyping(el, text, ms = 24){
  if (!el) return;
  // cancel previous
  el._typingToken = (el._typingToken || 0) + 1;
  const token = el._typingToken;
  el.textContent = '';
  for (let i = 0; i < text.length; i++){
    if (el._typingToken !== token) return; // cancelled
    el.textContent += text[i];
    await new Promise(r => setTimeout(r, ms));
  }
  // clear token on complete
  if (el._typingToken === token) el._typingToken = null;
}

function authHeaders() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function apiSignup(payload){
  // Development shortcut: don't call the server — immediately succeed
  // Store a local token and return a minimal user object so the UI proceeds.
  const fakeToken = `local-dev-${Date.now()}`;
  localStorage.setItem("token", fakeToken);
  return {
    id: Date.now(),
    first: payload.first || "Local",
    last: payload.last || "User",
    email: payload.email || "local@dev",
    phone: payload.phone || null
  };
}

async function apiLogin(email, password){
  // Development shortcut: fake a successful login without server validation.
  const fakeToken = `local-dev-${Date.now()}`;
  localStorage.setItem("token", fakeToken);
  return {
    id: 1,
    first: "Local",
    last: "User",
    email: email || "local@dev",
    phone: null
  };
}

async function apiMe(){
  const r = await fetch(`${API}/api/me`, { headers: { ...authHeaders() }});
  if(!r.ok) throw new Error("Not authorized");
  return r.json();
}

async function apiUpdateProfile(updates){
  const r = await fetch(`${API}/api/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(updates)
  });
  if(!r.ok) throw new Error("Profile update failed");
}

async function apiUpdatePrefs(prefs){
  const r = await fetch(`${API}/api/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(prefs)
  });
  if(!r.ok) throw new Error("Preferences update failed");
}

async function apiUpload(file){
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${API}/api/upload`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: fd
  });
  const data = await r.json().catch(() => ({}));
  if(!r.ok) throw new Error(data.error || "Upload failed");
  return data; 
}

async function apiAnalyze(file){
  const fd = new FormData();
  fd.append('file', file, file.name || 'checkin.webm');
  const r = await fetch(`${API}/record`, {
    method: 'POST',
    body: fd
  });
  // Try to parse JSON, but if parsing fails capture raw text for debugging
  const text = await r.text().catch(() => '');
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
  if (!r.ok) {
    const msg = data.error || data.detail || text || `Status ${r.status}`;
    throw new Error(msg);
  }
  return data;
}

// Chat API: send text or optional file, maintain session id in localStorage
async function apiChatSend({session, text, file}){
  const fd = new FormData();
  if (session) fd.append('session', session);
  if (text) fd.append('text', text);
  if (file) fd.append('file', file, file.name || 'reply.mp4');
  const r = await fetch(`${API}/chat`, { method: 'POST', body: fd });
  const textResp = await r.text().catch(() => '');
  let data = {};
  try { data = textResp ? JSON.parse(textResp) : {}; } catch(e){ data = {}; }
  if (!r.ok) {
    const msg = data.error || data.detail || textResp || `Status ${r.status}`;
    throw new Error(msg);
  }
  return data;
}

function renderChatHistory(history){
  const el = document.getElementById('chatHistory');
  if (!el) return;
  el.innerHTML = '';
  history.forEach(m => {
    const row = document.createElement('div');
    row.style.marginBottom = '8px';
    row.style.padding = '6px';
    row.style.borderRadius = '6px';
    row.style.fontSize = '0.95rem';
    if (m.role === 'user'){
      row.style.background = '#e8f0ff';
      row.style.textAlign = 'right';
      row.textContent = `You: ${m.content}`;
    } else if (m.role === 'assistant'){
      row.style.background = '#fff';
      row.style.border = '1px solid #eee';
      row.textContent = `Therapist: ${m.content}`;
    } else if (m.role === 'system'){
      row.style.background = '#fff8e6';
      row.style.fontSize = '0.85rem';
      row.textContent = m.content;
    }
    el.appendChild(row);
  });
  el.scrollTop = el.scrollHeight;
}

function getChatSession(){
  let s = localStorage.getItem('chat_session');
  if (!s){ s = `sess-${Date.now()}`; localStorage.setItem('chat_session', s); }
  return s;
}

// Utility to toggle a loading state on a button. Shows spinner and optional label.
function setButtonLoading(btn, loading, label){
  if (!btn) return;
  if (loading){
    if (!btn.dataset.origLabel) btn.dataset.origLabel = btn.textContent;
    btn.classList.add('loading');
    btn.setAttribute('aria-busy','true');
    btn.disabled = true;
    if (label) btn.textContent = label;
    else btn.textContent = 'Thinking…';
  } else {
    btn.classList.remove('loading');
    btn.setAttribute('aria-busy','false');
    btn.disabled = false;
    if (btn.dataset.origLabel){ btn.textContent = btn.dataset.origLabel; delete btn.dataset.origLabel; }
  }
}

document.getElementById('chatSend')?.addEventListener('click', async () => {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const txt = input.value && input.value.trim();
  if (!txt) return alert('Please type a message first.');
  const session = getChatSession();
  const chatEl = document.getElementById('chatHistory');
  // Optimistically append user's message to the history and clear the input
  if (chatEl) {
    const userRow = document.createElement('div');
    userRow.style.marginBottom = '8px';
    userRow.style.padding = '6px';
    userRow.style.borderRadius = '6px';
    userRow.style.fontSize = '0.95rem';
    userRow.style.background = '#e8f0ff';
    userRow.style.textAlign = 'right';
    userRow.textContent = `You: ${txt}`;
    chatEl.appendChild(userRow);
    chatEl.scrollTop = chatEl.scrollHeight;
  }
  input.value = '';
  const sendBtn = document.getElementById('chatSend');
  if (sendBtn) setButtonLoading(sendBtn, true, 'Thinking…');
  try{
    const res = await apiChatSend({ session, text: txt });
    // server-provided history will replace optimistic UI (keeps things canonical)
    if (res.history) renderChatHistory(res.history);
    // show assistant reply in therapist area with typewriter
    if (res.reply){
      const therapistEl = document.getElementById('therapistResponse');
      startTyping(therapistEl, res.reply || '(no response)');
    }
  }catch(err){
    // On error, show alert and mark last optimistic message as failed
    alert('Chat failed: ' + (err.message || err));
    if (chatEl) {
      const last = chatEl.lastElementChild;
      if (last && last.textContent && last.textContent.startsWith('You:')){
        last.style.opacity = '0.6';
        last.title = 'Failed to send';
      }
    }
  }finally{
    if (sendBtn) setButtonLoading(sendBtn, false);
  }
});

// (Reply-with-video button removed; sending occurs automatically when chat recording stops)

// on load, try to fetch any existing history (noop if none)
(async function loadChatOnBoot(){
  const session = getChatSession();
  try{
    const r = await fetch(`${API}/chat?session=${session}`);
    if (!r.ok) return;
    const data = await r.json().catch(()=>({}));
    if (data.history) renderChatHistory(data.history);
  }catch(e){}
})();

/* Router   */
const views = [...document.querySelectorAll(".page")];

function show(view, pushHash = true){
  views.forEach(v => v.classList.toggle("active", v.dataset.view === view));
  if (pushHash) location.hash = view;
  window.scrollTo(0, 0);

  if (view === "recorder") ensureCamera();
}

function initFromHash(){
  const hash = (location.hash || "").replace("#", "");
  const valid = views.some(v => v.dataset.view === hash);
  show(valid ? hash : "welcome", false);
}
window.addEventListener("hashchange", initFromHash);

/* global [data-go] navigation     */
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-go]");
  if(!el) return;
  e.preventDefault();
  show(el.dataset.go);
});

/*  Nav auth toggle + shortcuts   */
function updateNavForAuth(isAuthed){
  const btn = document.getElementById("navAuthBtn");          
  const rec = document.getElementById("navRecordLink");       
  const fab = document.getElementById("fabRecord");         

  if (rec) rec.hidden = !isAuthed;
  if (fab) fab.hidden = !isAuthed;

  if (!btn) return;
  if (isAuthed){
    btn.textContent = "Sign out";
    btn.onclick = () => {
      localStorage.removeItem("token");
      updateNavForAuth(false);
      show("welcome");
    };
  } else {
    btn.textContent = "Sign in";
    btn.onclick = () => show("login");
  }
}

(function wireBrand(){
  const brand = document.getElementById("brandHome") || document.querySelector(".brand");
  brand?.addEventListener("click", (e) => {
    e.preventDefault();
    if (localStorage.getItem("token")) show("recorder");
    else show("welcome");
  });
})();

document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "r") {
    if (localStorage.getItem("token")) { e.preventDefault(); show("recorder"); }
  }
});

/*  Forms: Login, Signup, Prefs  */
const loginForm  = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const prefForm   = document.getElementById("prefForm");

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(loginForm);
  try{
    await apiLogin(
      (fd.get("email") || "").toString().trim(),
      (fd.get("password") || "").toString()
    );
    updateNavForAuth(true);
    show("recorder");
  }catch(err){
    alert(err.message || "Login failed");
  }
});

signupForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(signupForm);
  const password = (fd.get("password") || "").toString();
  const confirm  = (fd.get("confirm")  || "").toString();
  if(password !== confirm){ alert("Passwords do not match."); return; }

  try{
    await apiSignup({
      first:  (fd.get("first") || "").toString().trim(),
      last:   (fd.get("last")  || "").toString().trim(),
      email:  (fd.get("email") || "").toString().trim(),
      phone:  (fd.get("phone") || "").toString().trim(),
      password
    });
    updateNavForAuth(true);
    show("recorder"); 
  }catch(err){
    alert(err.message || "Signup failed");
  }
});

prefForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(prefForm);
  try{
    await apiUpdatePrefs({
      goal: (fd.get("goal") || "").toString(),
      mood: (fd.get("mood") || "").toString()
    });
    show("recorder");
  }catch(err){
    alert(err.message || "Could not save preferences");
  }
});

/*  Profile  */
const profileForm = document.getElementById("profileForm");

async function hydrateProfile(){
  try{
    const u = await apiMe();
    updateNavForAuth(true);
    if (!profileForm) return;
    profileForm.email.value    = u.email || "";
    profileForm.password.value = "";        
    profileForm.goal.value     = u.goal  || "";
    profileForm.mood.value     = u.mood  || "";
  }catch{
    updateNavForAuth(false);
    alert("Please sign in.");
    show("login");
  }
}
document.querySelector('[data-go="profile"]')?.addEventListener("click", hydrateProfile);

profileForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(profileForm);
  const updates = {
    email: (fd.get("email") || "").toString().trim(),
    goal:  (fd.get("goal")  || "").toString(),
    mood:  (fd.get("mood")  || "").toString()
  };
  const pwd = (fd.get("password") || "").toString();
  if (pwd) updates.password = pwd;

  try{
    await apiUpdateProfile(updates);
    alert("Profile updated!");
    profileForm.password.value = "";
  }catch(err){
    alert(err.message || "Update failed");
  }
});

/*  Recorder (camera + MediaRecorder) */
const camEl       = document.getElementById("cam");
const startBtn    = document.getElementById("startRec");
const timerEl     = document.getElementById("recTimer");
// preview elements removed; playback will reuse the live camera element (`#cam`)
const downloadBtn = document.getElementById("downloadBtn");
const uploadBtn   = document.getElementById("uploadBtn");
const uploadMsg   = document.getElementById("uploadMsg");

let mediaStream = null;
let mediaRecorder = null;
let chunks = [];
let tickInterval = null;
let startAt = 0;
let recordingTarget = null; // 'recorder' | 'chat' | null

function fmt(ms){
  const s = Math.floor(ms/1000);
  const m = String(Math.floor(s/60)).padStart(2,"0");
  const r = String(s%60).padStart(2,"0");
  return `${m}:${r}`;
}

async function ensureCamera(){
  try{
    if(!mediaStream && camEl){
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true }
      });
      camEl.srcObject = mediaStream;
    }
  }catch(e){
    console.error(e);
    alert("Camera/microphone permission denied or unavailable.");
  }
}



// Helpers to start/stop recording with target context
async function startRecording(target){
  if (!['recorder','chat'].includes(target)) target = 'recorder';
  try {
    if (!mediaStream) {
      await ensureCamera();
      if (!mediaStream) { alert("Camera not ready."); return false; }
    }

    // reset previous chunks and playback
    chunks = [];
    if (camEl) {
      camEl.srcObject = mediaStream;
      camEl.muted = true;
      camEl.controls = false;
      try { camEl.src = ""; } catch (e) {}
    }

    let options = { bitsPerSecond: 2_000_000 };
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
      options.mimeType = "video/webm;codecs=vp9";
    } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
      options.mimeType = "video/webm;codecs=vp8";
    } else if (MediaRecorder.isTypeSupported("video/mp4")) {
      options.mimeType = "video/mp4";
    }

    try {
      mediaRecorder = new MediaRecorder(mediaStream, options);
    } catch (err) {
      console.error("MediaRecorder init failed", err);
      alert("Recording is not supported in this browser or with this format.");
      return false;
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mediaRecorder.mimeType || "video/mp4" });
      const url  = URL.createObjectURL(blob);
      if (camEl) {
        try { camEl.srcObject = null; } catch (e) {}
        camEl.src = url;
        camEl.controls = true;
        camEl.muted = false;
        camEl.play().catch(() => {});
      }
      if (downloadBtn) downloadBtn.href = url;
      if (uploadMsg) uploadMsg.textContent = "";

      // UI updates depending on which target initiated recording
      if (recordingTarget === 'recorder'){
        if (startBtn) {
          startBtn.textContent = "Start recording";
          startBtn.classList.remove('recording');
          startBtn.setAttribute('aria-pressed','false');
        }
      } else if (recordingTarget === 'chat'){
        const chatRecord = document.getElementById('chatRecord');
        if (chatRecord) {
          chatRecord.textContent = 'Record Reply';
          chatRecord.classList.remove('recording');
          chatRecord.setAttribute('aria-pressed','false');
        }

        // Auto-send the recorded clip as a chat reply
        (async () => {
          try{
            const chatEl = document.getElementById('chatHistory');
            // optimistic placeholder
            if (chatEl) {
              const userRow = document.createElement('div');
              userRow.style.marginBottom = '8px';
              userRow.style.padding = '6px';
              userRow.style.borderRadius = '6px';
              userRow.style.fontSize = '0.95rem';
              userRow.style.background = '#e8f0ff';
              userRow.style.textAlign = 'right';
              userRow.textContent = `You: (video reply)`;
              chatEl.appendChild(userRow);
              chatEl.scrollTop = chatEl.scrollHeight;
            }

            const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'video/mp4' });
            const file = new File([blob], `reply-${Date.now()}.mp4`, { type: mediaRecorder.mimeType || 'video/mp4' });
            const session = getChatSession();
            if (chatRecord) setButtonLoading(chatRecord, true, 'Sending…');
            const res = await apiChatSend({ session, file });
            if (res.history) renderChatHistory(res.history);
            if (res.reply){
              const therapistEl = document.getElementById('therapistResponse');
              startTyping(therapistEl, res.reply || '(no response)');
            }
          }catch(err){
            alert('Video chat failed: ' + (err.message || err));
            const chatEl = document.getElementById('chatHistory');
            if (chatEl) {
              const last = chatEl.lastElementChild;
              if (last && last.textContent && last.textContent.startsWith('You:')){
                last.style.opacity = '0.6';
                last.title = 'Failed to send video';
              }
            }
          }finally{
            if (chatRecord) setButtonLoading(chatRecord, false);
          }
        })();
      }

      // reset recording target
      recordingTarget = null;
    };

    mediaRecorder.start();
    recordingTarget = target;
    startAt = Date.now();
    if (timerEl) timerEl.textContent = "00:00";
    tickInterval = setInterval(() => {
      if (timerEl) timerEl.textContent = fmt(Date.now() - startAt);
    }, 250);

    // set button states for the initiating control
    if (target === 'recorder' && startBtn) {
      startBtn.textContent = "Stop recording";
      startBtn.classList.add('recording');
      startBtn.setAttribute('aria-pressed','true');
    }
    if (target === 'chat'){
      const chatRecord = document.getElementById('chatRecord');
      if (chatRecord) {
        chatRecord.textContent = 'Stop recording';
        chatRecord.classList.add('recording');
        chatRecord.setAttribute('aria-pressed','true');
      }
    }
    return true;
  } catch (err) {
    console.error(err);
    alert("Recording failed to start.");
    return false;
  }
}

function stopRecording(){
  try{
    if (mediaRecorder && mediaRecorder.state === 'recording'){
      mediaRecorder.stop();
    }
    if (tickInterval){ clearInterval(tickInterval); tickInterval = null; }
  }catch(e){ console.error('stopRecording error', e); }
}

// Start/stop handler for main recorder button
startBtn?.addEventListener('click', async () => {
  if (mediaRecorder && mediaRecorder.state === 'recording'){
    // if currently recording for recorder, stop; if recording for chat, alert
    if (recordingTarget === 'recorder') { stopRecording(); }
    else { alert('Another recording is in progress. Stop it first.'); }
    return;
  }
  // start recorder
  await startRecording('recorder');
});

// Chat record toggle
document.getElementById('chatRecord')?.addEventListener('click', async () => {
  const chatRecord = document.getElementById('chatRecord');
  if (mediaRecorder && mediaRecorder.state === 'recording'){
    if (recordingTarget === 'chat'){
      stopRecording();
    } else {
      alert('Another recording is in progress. Stop it first.');
    }
    return;
  }
  // start chat-targeted recording
  const ok = await startRecording('chat');
  if (ok && chatRecord) {
    // while recording, ensure send state is disabled visually
    chatRecord.classList.add('recording');
  }
});

uploadBtn?.addEventListener("click", async () => {
  if(!chunks.length){ alert("Record something first."); return; }
  const blob = new Blob(chunks, { type: "video/mp4" });
  const file = new File([blob], "checkin.mp4", { type: "video/mp4" });
  if (uploadMsg) uploadMsg.textContent = "Analyzing…";
  if (uploadBtn) uploadBtn.disabled = true;
  try{
    const res = await apiAnalyze(file);
    if (uploadMsg) uploadMsg.textContent = "Analysis complete ✓";
    console.log("Analysis result:", res);
    // Optionally display analysis in the UI
    // Populate structured UI: perceived emotions + typed therapist response
    const emotionsEl = document.getElementById('perceivedEmotions');
    const therapistEl = document.getElementById('therapistResponse');
    if (emotionsEl) {
      const list = Array.isArray(res.emotions) ? res.emotions : (res.emotions ? [res.emotions] : []);
      emotionsEl.textContent = list.length ? `Perceived emotions: ${list.join(', ')}` : 'Perceived emotions: (none detected)';
    }
    if (therapistEl) {
      // typewriter effect
      startTyping(therapistEl, res.response || '(no response)');
    }
  }catch(err){
    if (uploadMsg) uploadMsg.textContent = "Analysis failed: " + (err.message || err);
    console.error('Upload/analysis error:', err);
    // show error details in the response pane as JSON where possible
    const emotionsEl = document.getElementById('perceivedEmotions');
    const therapistEl = document.getElementById('therapistResponse');
    if (emotionsEl) emotionsEl.textContent = '';
    if (therapistEl) {
      // show error message (no typing)
      therapistEl.textContent = (err && err.message) ? `Error: ${err.message}` : String(err);
    }
    alert('Upload failed: ' + (err.message || err));
  }
  finally {
    if (uploadBtn) uploadBtn.disabled = false;
  }
});

/*  Boot */
(async function boot(){
  // optional footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  try{
    await apiMe();              
    updateNavForAuth(true);
  }catch{
    updateNavForAuth(false);
  }
  initFromHash();               
})();
