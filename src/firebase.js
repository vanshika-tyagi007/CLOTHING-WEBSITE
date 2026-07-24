import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithPopup, 
  GoogleAuthProvider, 
  updateProfile,
  onAuthStateChanged as fbOnAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';

// Detect if Firebase has been configured in the .env file
const isFirebaseConfigured = 
  import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_API_KEY !== 'your_api_key_here' &&
  import.meta.env.VITE_FIREBASE_API_KEY !== '';

let auth = null;
let db = null;

if (isFirebaseConfigured) {
  console.log("✦ Firebase Configuration loaded:", {
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? (import.meta.env.VITE_FIREBASE_API_KEY.substring(0, 5) + "...") : "undefined"
  });
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };

  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("✦ MOD APPARELS: Firebase initialized successfully.");
  } catch (error) {
    console.error("✦ MOD APPARELS: Firebase initialization error:", error);
    auth = null;
    db = null;
  }
} else {
  console.warn(
    "✦ MOD APPARELS: Running in Mock/Simulated Auth Mode.\n" +
    "To connect a live database, configure your actual keys in the .env file."
  );
}

// -------------------------------------------------------------------------
// REAL FIREBASE IMPLEMENTATION HELPERS
// -------------------------------------------------------------------------

async function registerUserReal(email, password, displayName) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(userCredential.user, { displayName });
  return userCredential.user;
}

async function loginUserReal(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

async function loginWithGoogleReal() {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  return userCredential.user;
}

async function logoutUserReal() {
  await signOut(auth);
}

function onAuthStateChangedReal(callback) {
  return fbOnAuthStateChanged(auth, callback);
}

async function fetchUserLooksReal(uid) {
  if (!db) return [];
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().savedLooks || [];
  }
  return [];
}

async function saveLookToCloudReal(uid, look) {
  if (!db) return;
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  let currentLooks = [];
  if (docSnap.exists()) {
    currentLooks = docSnap.data().savedLooks || [];
  }
  // Prevent duplicate look entries by checking look ID
  if (!currentLooks.some(l => l.id === look.id)) {
    const updatedLooks = [look, ...currentLooks];
    await setDoc(docRef, { savedLooks: updatedLooks }, { merge: true });
  }
}

async function deleteLookFromCloudReal(uid, lookId) {
  if (!db) return;
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const currentLooks = docSnap.data().savedLooks || [];
    const updatedLooks = currentLooks.filter(l => l.id !== lookId);
    await setDoc(docRef, { savedLooks: updatedLooks }, { merge: true });
  }
}

async function syncLocalLooksToCloudReal(uid, localLooks) {
  if (!db) return [];
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  let cloudLooks = [];
  if (docSnap.exists()) {
    cloudLooks = docSnap.data().savedLooks || [];
  }
  
  // Merge lists (cloud takes precedence, but add local ones if they don't exist by id)
  const mergedLooks = [...cloudLooks];
  localLooks.forEach(local => {
    if (!mergedLooks.some(c => c.id === local.id)) {
      mergedLooks.push(local);
    }
  });
  
  // Save back to cloud
  await setDoc(docRef, { savedLooks: mergedLooks }, { merge: true });
  return mergedLooks;
}

async function bookShowroomVisitReal(uid, booking) {
  if (!db) return;
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  let currentVisits = [];
  if (docSnap.exists()) {
    currentVisits = docSnap.data().showroomVisits || [];
  }
  const updatedVisits = [booking, ...currentVisits];
  await setDoc(docRef, { showroomVisits: updatedVisits }, { merge: true });
}

async function fetchUserVisitsReal(uid) {
  if (!db) return [];
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().showroomVisits || [];
  }
  return [];
}

async function cancelShowroomVisitReal(uid, bookingId) {
  if (!db) return;
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const currentVisits = docSnap.data().showroomVisits || [];
    const updatedVisits = currentVisits.filter(v => v.id !== bookingId);
    await setDoc(docRef, { showroomVisits: updatedVisits }, { merge: true });
  }
}

// -------------------------------------------------------------------------
// MOCK/SIMULATED FALLBACK IMPLEMENTATION HELPERS (LocalStorage based)
// -------------------------------------------------------------------------

const authListeners = new Set();
// Clean reset of mock users data to start with 0 users
if (typeof localStorage !== 'undefined') {
  localStorage.removeItem("mod_mock_current_user");
}
let currentMockUser = null;

// Trigger mock state listeners
function triggerAuthListeners(user) {
  authListeners.forEach(cb => cb(user));
}

async function registerUserMock(email, password, displayName) {
  const users = JSON.parse(localStorage.getItem("mod_mock_users")) || [];
  if (users.some(u => u.email === email)) {
    throw new Error("Email already registered in local simulated database.");
  }
  const newUser = {
    uid: "mock_uid_" + Date.now(),
    email,
    displayName,
    password // stored in mock plain text for validation
  };
  users.push(newUser);
  localStorage.setItem("mod_mock_users", JSON.stringify(users));
  
  // Set current user
  const userProfile = { uid: newUser.uid, email: newUser.email, displayName: newUser.displayName };
  currentMockUser = userProfile;
  localStorage.setItem("mod_mock_current_user", JSON.stringify(userProfile));
  triggerAuthListeners(userProfile);
  return userProfile;
}

async function loginUserMock(email, password) {
  const users = JSON.parse(localStorage.getItem("mod_mock_users")) || [];
  const foundUser = users.find(u => u.email === email);
  if (!foundUser || foundUser.password !== password) {
    throw new Error("Invalid simulated email or password.");
  }
  const userProfile = { uid: foundUser.uid, email: foundUser.email, displayName: foundUser.displayName };
  currentMockUser = userProfile;
  localStorage.setItem("mod_mock_current_user", JSON.stringify(userProfile));
  triggerAuthListeners(userProfile);
  return userProfile;
}

async function loginWithGoogleMock() {
  const userProfile = {
    uid: "mock_google_uid_9876",
    email: "designer.guest@google.com",
    displayName: "Premium Fashionista"
  };
  // Save to registered users list too
  const users = JSON.parse(localStorage.getItem("mod_mock_users")) || [];
  if (!users.some(u => u.email === userProfile.email)) {
    users.push({ ...userProfile, password: "" });
    localStorage.setItem("mod_mock_users", JSON.stringify(users));
  }
  
  currentMockUser = userProfile;
  localStorage.setItem("mod_mock_current_user", JSON.stringify(userProfile));
  triggerAuthListeners(userProfile);
  return userProfile;
}

async function logoutUserMock() {
  currentMockUser = null;
  localStorage.removeItem("mod_mock_current_user");
  triggerAuthListeners(null);
}

function onAuthStateChangedMock(callback) {
  authListeners.add(callback);
  // Execute immediately with current state
  setTimeout(() => callback(currentMockUser), 0);
  // Return unsubscribe function
  return () => authListeners.delete(callback);
}

async function fetchUserLooksMock(uid) {
  return JSON.parse(localStorage.getItem(`mod_mock_cloud_looks_${uid}`)) || [];
}

async function saveLookToCloudMock(uid, look) {
  const looks = JSON.parse(localStorage.getItem(`mod_mock_cloud_looks_${uid}`)) || [];
  if (!looks.some(l => l.id === look.id)) {
    looks.unshift(look);
    localStorage.setItem(`mod_mock_cloud_looks_${uid}`, JSON.stringify(looks));
  }
}

async function deleteLookFromCloudMock(uid, lookId) {
  let looks = JSON.parse(localStorage.getItem(`mod_mock_cloud_looks_${uid}`)) || [];
  looks = looks.filter(l => l.id !== lookId);
  localStorage.setItem(`mod_mock_cloud_looks_${uid}`, JSON.stringify(looks));
}

async function syncLocalLooksToCloudMock(uid, localLooks) {
  const cloudLooks = JSON.parse(localStorage.getItem(`mod_mock_cloud_looks_${uid}`)) || [];
  const mergedLooks = [...cloudLooks];
  localLooks.forEach(local => {
    if (!mergedLooks.some(c => c.id === local.id)) {
      mergedLooks.push(local);
    }
  });
  localStorage.setItem(`mod_mock_cloud_looks_${uid}`, JSON.stringify(mergedLooks));
  return mergedLooks;
}

async function bookShowroomVisitMock(uid, booking) {
  const visits = JSON.parse(localStorage.getItem(`mod_mock_cloud_visits_${uid}`)) || [];
  visits.unshift(booking);
  localStorage.setItem(`mod_mock_cloud_visits_${uid}`, JSON.stringify(visits));
}

async function fetchUserVisitsMock(uid) {
  return JSON.parse(localStorage.getItem(`mod_mock_cloud_visits_${uid}`)) || [];
}

async function cancelShowroomVisitMock(uid, bookingId) {
  let visits = JSON.parse(localStorage.getItem(`mod_mock_cloud_visits_${uid}`)) || [];
  visits = visits.filter(v => v.id !== bookingId);
  localStorage.setItem(`mod_mock_cloud_visits_${uid}`, JSON.stringify(visits));
}

// -------------------------------------------------------------------------
// EXPORT UNIFIED API LAYER
// -------------------------------------------------------------------------

export const isFirebaseActive = isFirebaseConfigured;

export const registerUser = isFirebaseConfigured ? registerUserReal : registerUserMock;
export const loginUser = isFirebaseConfigured ? loginUserReal : loginUserMock;
export const loginWithGoogle = isFirebaseConfigured ? loginWithGoogleReal : loginWithGoogleMock;
export const logoutUser = isFirebaseConfigured ? logoutUserReal : logoutUserMock;
export const onAuthStateChanged = isFirebaseConfigured ? onAuthStateChangedReal : onAuthStateChangedMock;

export const fetchUserLooks = isFirebaseConfigured ? fetchUserLooksReal : fetchUserLooksMock;
export const saveLookToCloud = isFirebaseConfigured ? saveLookToCloudReal : saveLookToCloudMock;
export const deleteLookFromCloud = isFirebaseConfigured ? deleteLookFromCloudReal : deleteLookFromCloudMock;
export const syncLocalLooksToCloud = isFirebaseConfigured ? syncLocalLooksToCloudReal : syncLocalLooksToCloudMock;

export const bookShowroomVisit = isFirebaseConfigured ? bookShowroomVisitReal : bookShowroomVisitMock;
export const fetchUserVisits = isFirebaseConfigured ? fetchUserVisitsReal : fetchUserVisitsMock;
export const cancelShowroomVisit = isFirebaseConfigured ? cancelShowroomVisitReal : cancelShowroomVisitMock;
