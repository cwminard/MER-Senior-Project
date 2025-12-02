const API = ""; // same-origin (http://localhost:4000 in dev)

function authHeaders() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function apiSignup(payload){
  const r = await fetch(`${API}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (Array.isArray(data.errors) && data.errors.length) {
      throw new Error(data.errors[0].msg || "Invalid input");
    }
    throw new Error(data.error || "Signup failed");
  }
  localStorage.setItem("token", data.token);
  return data.user;
}

async function apiLogin(email, password){
  const r = await fetch(`${API}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Login failed");
  localStorage.setItem("token", data.token);
  return data.user;
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
    show("preferences"); 
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
const stopBtn     = document.getElementById("stopRec");
const timerEl     = document.getElementById("recTimer");
const previewWrap = document.getElementById("previewWrap");
const previewEl   = document.getElementById("preview");
const downloadBtn = document.getElementById("downloadBtn");
const uploadBtn   = document.getElementById("uploadBtn");
const uploadMsg   = document.getElementById("uploadMsg");

let mediaStream = null;
let mediaRecorder = null;
let chunks = [];
let tickInterval = null;
let startAt = 0;

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

startBtn?.addEventListener("click", () => {
  if (!mediaStream) { alert("Camera not ready."); return; }
  chunks = [];
  if (previewWrap) previewWrap.hidden = true;

  let options = { bitsPerSecond: 2_000_000 };

  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
    options.mimeType = "video/webm;codecs=vp9";
  } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
    options.mimeType = "video/webm;codecs=vp8";
  } else if (MediaRecorder.isTypeSupported("video/mp4")) {
    // Safari usually likes mp4
    options.mimeType = "video/mp4";
  }
  // If none are supported, we just don't set mimeType at all and let the browser pick.

  try {
    mediaRecorder = new MediaRecorder(mediaStream, options);
  } catch (err) {
    console.error("MediaRecorder init failed", err);
    alert("Recording is not supported in this browser or with this format.");
    return;
  }

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: mediaRecorder.mimeType || "video/mp4" });
    const url  = URL.createObjectURL(blob);
    if (previewEl) previewEl.src = url;
    if (downloadBtn) downloadBtn.href = url;
    if (previewWrap) previewWrap.hidden = false;
  };

  mediaRecorder.start();

  startAt = Date.now();
  if (timerEl) timerEl.textContent = "00:00";
  tickInterval = setInterval(() => {
    if (timerEl) timerEl.textContent = fmt(Date.now() - startAt);
  }, 250);

  if (startBtn) startBtn.disabled = true;
  if (stopBtn)  stopBtn.disabled  = false;
});


stopBtn?.addEventListener("click", () => {
  if(mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
  clearInterval(tickInterval);
  if (startBtn) startBtn.disabled = false;
  if (stopBtn)  stopBtn.disabled  = true;
});

uploadBtn?.addEventListener("click", async () => {
  if(!chunks.length){ alert("Record something first."); return; }
  const blob = new Blob(chunks, { type: "video/mp4" });
  const file = new File([blob], "checkin.mp4", { type: "video/mp4" });
  if (uploadMsg) uploadMsg.textContent = "Uploading…";
  try{
    const res = await apiUpload(file);
    if (uploadMsg) uploadMsg.textContent = "Uploaded ✓";
    console.log("File URL:", res.url);
  }catch(err){
    if (uploadMsg) uploadMsg.textContent = "Upload failed: " + (err.message || err);
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
