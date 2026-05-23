/**
 * Firebase Configuration
 * Configura conexão com Firebase Firestore
 */
const firebaseConfig = {
  apiKey: "AIzaSyBz8gQ6cF6X9vK8YqG3H5jL2mN1oP4qR6s",
  authDomain: "legab-app.firebaseapp.com",
  projectId: "legab-app",
  storageBucket: "legab-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

let firestore = null;
let firebaseReady = false;

async function initFirebase() {
  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const app = initializeApp(firebaseConfig);
    firestore = getFirestore(app);
    firebaseReady = true;
    console.log('✅ Firebase conectado');
  } catch (err) {
    console.warn('⚠️ Firebase offline, usando localStorage');
    firebaseReady = false;
  }
}

async function saveConfig(config) {
  localStorage.setItem('legab_config', JSON.stringify(config));
  
  if (firebaseReady && firestore) {
    try {
      const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      await setDoc(doc(firestore, 'configs', 'main'), { ...config, updatedAt: new Date() });
    } catch (e) {
      console.warn('Erro salvando no Firebase:', e);
    }
  }
}

async function loadConfig() {
  const defaults = {
    name: '',
    title: 'Simulado',
    questions: 60,
    alternatives: 5,
    threshold: 0.4,
    answers: {}
  };
  
  try {
    const local = localStorage.getItem('legab_config');
    if (local) return { ...defaults, ...JSON.parse(local) };
  } catch (e) {}
  
  if (firebaseReady && firestore) {
    try {
      const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      const snap = await getDoc(doc(firestore, 'configs', 'main'));
      if (snap.exists()) return { ...defaults, ...snap.data() };
    } catch (e) {}
  }
  
  return defaults;
}

async function saveResults(data) {
  const results = JSON.parse(localStorage.getItem('legab_results') || '[]');
  results.unshift({ ...data, timestamp: Date.now() });
  localStorage.setItem('legab_results', JSON.stringify(results.slice(0, 50)));
  
  if (firebaseReady && firestore) {
    try {
      const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      await addDoc(collection(firestore, 'results'), { ...data, timestamp: new Date() });
    } catch (e) {}
  }
}

function getResults() {
  try {
    return JSON.parse(localStorage.getItem('legab_results') || '[]');
  } catch (e) { return []; }
}

window.Firebase = { init: initFirebase, saveConfig, loadConfig, saveResults, getResults, isReady: () => firebaseReady };