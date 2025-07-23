/* ======================================================================= */
/* FILE: js/main.js (Shared code for all pages except login.html)          */
/* ======================================================================= */

// --- Firebase Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Configuration ---
const firebaseConfig = { 
    apiKey: "AIzaSyCOo5oxLfCCxNAd78vGEruoPm2ng-7Etmg", 
    authDomain: "glckob.firebaseapp.com", 
    projectId: "glckob", 
    storageBucket: "glckob.appspot.com", 
    messagingSenderId: "766670265981", 
    appId: "1:766670265981:web:b1d0b0b0b0b0b0b0" 
};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'glckob-school-app';

// --- Initialize and Export Firebase Services ---
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- Global State & Caches (Exported for other modules) ---
export let userId;
export let allStudentsCache = [], allSubjectsCache = [], allTeachersCache = [], allClassesCache = [], allYearsCache = [], schoolSettingsCache = {};
let unsubscribeListeners = [];

// --- Common DOM Elements ---
const appContainer = document.getElementById('app-container');
const userEmailDisplay = document.getElementById('user-email-display');
const logoutBtn = document.getElementById('logout-btn');

// --- Exportable Utility Functions ---
export function showToast(message, isError = false) { 
    const toast = document.getElementById('toast-notification'); 
    const toastMessage = toast.querySelector('p'); 
    toastMessage.textContent = message; 
    toast.className = `toast max-w-xs text-white p-4 rounded-lg shadow-lg ${isError ? 'bg-red-600' : 'bg-green-600'} show`; 
    setTimeout(() => { toast.classList.remove('show'); }, 3000); 
}

export function createModal(id, title, content, footer) { 
    const container = document.getElementById('modal-container'); 
    const modalHTML = `<div id="${id}" class="modal fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 opacity-0 pointer-events-none"><div class="modal-content bg-white rounded-lg shadow-xl w-full max-w-lg m-4 transform -translate-y-10 flex flex-col max-h-[90vh]"><div class="flex-shrink-0 flex justify-between items-center p-4 border-b"><h3 class="font-koulen text-xl">${title}</h3><button class="close-modal-btn text-gray-400 hover:text-gray-600">&times;</button></div><div class="flex-grow p-6 overflow-y-auto">${content}</div><div class="flex-shrink-0 flex justify-end p-4 bg-gray-50 border-t rounded-b-lg">${footer}</div></div></div>`; 
    container.innerHTML = modalHTML; 
    const modal = document.getElementById(id); 
    modal.querySelector('.close-modal-btn').addEventListener('click', () => closeModal(id)); 
    return modal; 
}

export function openModal(id) { 
    const modal = document.getElementById(id); 
    if (modal) { 
        modal.classList.remove('opacity-0', 'pointer-events-none'); 
        modal.querySelector('.modal-content').classList.remove('-translate-y-10'); 
    } 
}

export function closeModal(id) { 
    const modal = document.getElementById(id); 
    if (modal) { 
        modal.classList.add('opacity-0'); 
        modal.querySelector('.modal-content').classList.add('-translate-y-10'); 
        setTimeout(() => { 
            modal.classList.add('pointer-events-none'); 
            document.getElementById('modal-container').innerHTML = ''; 
        }, 250); 
    } 
}

// --- Core Application Logic ---
function setActiveNav() { 
    const path = window.location.pathname.split("/").pop() || "index.html"; 
    const navLinks = document.querySelectorAll('.nav-link'); 
    navLinks.forEach(link => { 
        link.classList.remove('bg-blue-100'); 
        if (link.getAttribute('href') === path) { 
            link.classList.add('bg-blue-100'); 
            link.querySelector('i').classList.replace('text-gray-500', 'text-blue-500'); 
        } 
    }); 
}

function initializeDataSubscriptions(uid) {
    // Detach any old listeners
    unsubscribeListeners.forEach(unsub => unsub());
    unsubscribeListeners = [];

    const collectionsToFetch = {
        academic_years: (data) => allYearsCache = data.sort((a, b) => b.startYear - a.startYear),
        teachers: (data) => allTeachersCache = data,
        classes: (data) => allClassesCache = data,
        students: (data) => allStudentsCache = data,
        subjects: (data) => allSubjectsCache = data
    };

    const promises = Object.keys(collectionsToFetch).map(key => new Promise(resolve => {
        const ref = collection(db, `artifacts/${appId}/users/${uid}/${key}`);
        const unsub = onSnapshot(ref, snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            collectionsToFetch[key](data);
            resolve();
        });
        unsubscribeListeners.push(unsub);
    }));

    // After all data is fetched, notify the page-specific scripts
    Promise.all(promises).then(() => {
        console.log("All initial data loaded.");
        document.dispatchEvent(new CustomEvent('dataReady'));
    });
}

// --- Authentication Check and App Initialization ---
onAuthStateChanged(auth, (user) => { 
    if (user) { 
        userId = user.uid; 
        userEmailDisplay.textContent = user.email; 
        appContainer.classList.remove('hidden'); 
        setActiveNav(); 
        initializeDataSubscriptions(user.uid); 
    } else { 
        // If user is not logged in and not on the login page, redirect them.
        if (!window.location.pathname.endsWith('login.html')) { 
            window.location.href = 'login.html'; 
        } 
    }
});

logoutBtn.addEventListener('click', () => { 
    signOut(auth).then(() => showToast('Logged out successfully.')); 
});