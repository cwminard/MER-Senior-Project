// ------- Simple SPA Navigation -------
const views = [...document.querySelectorAll(".page")];
function show(view){
  views.forEach(v => v.classList.toggle("active", v.dataset.view === view));
  window.scrollTo(0,0);
}
document.addEventListener("click", (e) => {
  const go = e.target.closest("[data-go]")?.dataset.go;
  if(go){ e.preventDefault(); show(go); }
});

// Initial view
show("welcome");

// ------- Local Storage Helpers -------
const KEY = "theraUser";
const readUser = () => JSON.parse(localStorage.getItem(KEY) || "{}");
const writeUser = (data) => localStorage.setItem(KEY, JSON.stringify(data));

// ------- Sign Up -------
document.getElementById("signupForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const password = fd.get("password");
  const confirm = fd.get("confirm");
  if(password !== confirm){
    alert("Passwords do not match.");
    return;
  }
  const user = {
    first: fd.get("first")?.toString().trim(),
    last: fd.get("last")?.toString().trim(),
    email: fd.get("email")?.toString().trim(),
    phone: fd.get("phone")?.toString().trim(),
    password: password?.toString()
  };
  writeUser({...readUser(), ...user});
  show("preferences"); // flow: Sign Up -> Preferences
});

// ------- Preferences -------
document.getElementById("prefForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  writeUser({...readUser(), goal: fd.get("goal"), mood: fd.get("mood")});
  show("menu"); // flow: Preferences -> Menu
});

// ------- Login -------
document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const email = fd.get("email")?.toString().trim();
  const pwd = fd.get("password")?.toString();
  const user = readUser();
  if(!user.email){
    alert("No account found. Please Sign up first.");
    show("signup");
    return;
  }
  if(user.email === email && user.password === pwd){
    show("menu");
  }else{
    alert("Invalid email or password.");
  }
});

// ------- Profile (prefill + update) -------
const profileForm = document.getElementById("profileForm");
function hydrateProfile(){
  const u = readUser();
  profileForm.email.value = u.email || "";
  profileForm.password.value = u.password || "";
  profileForm.goal.value = u.goal || "";
  profileForm.mood.value = u.mood || "";
}
document.querySelector('[data-go="profile"]').addEventListener("click", hydrateProfile);
profileForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(profileForm);
  writeUser({
    ...readUser(),
    email: fd.get("email"),
    password: fd.get("password"),
    goal: fd.get("goal"),
    mood: fd.get("mood")
  });
  alert("Profile updated!");
});

// ------- Upload (drag & drop + browse) -------
const dz = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");

function handleFiles(files){
  if(!files || !files.length) return;
  const f = files[0];
  fileName.textContent = `Selected: ${f.name} (${Math.round(f.size/1024)} KB)`;
}

["dragenter","dragover"].forEach(ev =>
  dz.addEventListener(ev, (e)=>{ e.preventDefault(); dz.style.borderColor="#0b0b0b"; })
);
["dragleave","drop"].forEach(ev =>
  dz.addEventListener(ev, (e)=>{ e.preventDefault(); dz.style.borderColor="#b9d5ff"; })
);
dz.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));
dz.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

// Keyboard accessibility
dz.addEventListener("keydown", (e) => {
  if(e.key === "Enter" || e.key === " "){
    e.preventDefault(); fileInput.click();
  }
});
