// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Import local modules
import { initAuth } from './modules/auth.js';
import { initDashboard } from './modules/dashboard.js';
import { initYears } from './modules/years.js';
import { initTeachers } from './modules/teachers.js';
import { initClasses } from './modules/classes.js';
import { initStudents } from './modules/students.js';
import { initSubjects } from './modules/subjects.js';
import { initScores } from './modules/scores.js';
import { initRankings } from './modules/rankings.js';
import { initSettings } from './modules/settings.js';
import { clearAllCaches, setUserId, getUserId, clearUnsubscribeListeners, addUnsubscribeListener } from './modules/store.js';

// --- CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyCOo5oxLfCCxNAd78vGEruoPm2ng-7Etmg",
    authDomain: "glckob.firebaseapp.com",
    projectId: "glckob",
    storageBucket: "glckob.appspot.com",
    messagingSenderId: "766670265981",
    appId: "1:766670265981:web:b1d0b0b0b0b0b0b0"
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'glckob-school-app';

// --- GLOBAL APP REFERENCES ---
let app, auth, db;

// --- DOM ELEMENTS ---
const authScreen = document.getElementById('auth-screen');
const appContainer = document.getElementById('app-container');
const userEmailDisplay = document.getElementById('user-email-display');
const navLinks = document.querySelectorAll('.nav-link');
const pageViews = document.querySelectorAll('.page-view');
const mainViewsContainer = document.getElementById('main-views-container');
const classDetailContainer = document.getElementById('class-detail-container');

// --- NAVIGATION ---
function switchView(targetId) {
    mainViewsContainer.classList.remove('hidden');
    classDetailContainer.classList.add('hidden');
    pageViews.forEach(view => view.classList.add('hidden'));
    navLinks.forEach(link => {
        link.classList.remove('bg-blue-100');
        link.querySelector('i').classList.add('text-gray-500');
        link.querySelector('i').classList.remove('text-blue-500');
    });

    const targetView = document.getElementById(targetId);
    const targetLink = document.getElementById(`nav-${targetId.split('-')[1]}`);
    
    if (targetView) targetView.classList.remove('hidden');
    if (targetLink) {
        targetLink.classList.add('bg-blue-100');
        targetLink.querySelector('i').classList.remove('text-gray-500');
        targetLink.querySelector('i').classList.add('text-blue-500');
    }
}

// --- INITIALIZATION ---
function initializeDataSubscriptions() {
    clearUnsubscribeListeners();
    
    const commonDeps = { db, appId, getUserId, addUnsubscribeListener };

    // Initialize all data subscriptions from modules
    initDashboard(commonDeps);
    initYears(commonDeps);
    initTeachers(commonDeps);
    initClasses(commonDeps);
    initStudents(commonDeps);
    initSubjects(commonDeps);
    initScores(commonDeps);
    initRankings(commonDeps);
    initSettings(commonDeps);
    
    switchView('view-dashboard');
}

function setupNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = `view-${link.id.split('-')[1]}`;
            switchView(targetId);
        });
    });
}

async function main() {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        
        setupNavigation();
        initAuth({ auth, db, appId }); // Initialize auth event listeners

        onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
                userEmailDisplay.textContent = user.email;
                authScreen.classList.add('hidden');
                appContainer.classList.remove('hidden');
                initializeDataSubscriptions();
            } else {
                setUserId(null);
                clearAllCaches();
                clearUnsubscribeListeners();
                authScreen.classList.remove('hidden');
                appContainer.classList.add('hidden');
            }
        });

    } catch (error) {
        console.error("Initialization Error:", error);
        document.body.innerHTML = `<div class="p-8 text-center text-red-600"><h1 class="text-2xl font-bold">Initialization Failed</h1><p>Could not connect to Firebase services.</p><p class="mt-4 text-sm text-gray-500">${error.message}</p></div>`;
    }
}

// --- APP START ---
main();
