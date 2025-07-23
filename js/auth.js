/* ======================================================================= */
/* FILE: js/auth.js (Handles logic for login.html)                         */
/* ======================================================================= */

// --- Firebase Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- Firebase Configuration ---
// This configuration connects your app to your Firebase project.
const firebaseConfig = { 
    apiKey: "AIzaSyCOo5oxLfCCxNAd78vGEruoPm2ng-7Etmg", 
    authDomain: "glckob.firebaseapp.com", 
    projectId: "glckob", 
    storageBucket: "glckob.appspot.com", 
    messagingSenderId: "766670265981", 
    appId: "1:766670265981:web:b1d0b0b0b0b0b0b0" 
};

// --- Initialize Firebase Services ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- DOM Element References ---
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authError = document.getElementById('auth-error');
const showRegisterLink = document.getElementById('show-register-link');
const showLoginLink = document.getElementById('show-login-link');

// --- Utility Function for Notifications ---
function showToast(message, isError = false) { 
    const toast = document.getElementById('toast-notification'); 
    const toastMessage = document.getElementById('toast-message'); 
    toastMessage.textContent = message; 
    toast.className = `toast max-w-xs text-white p-4 rounded-lg shadow-lg ${isError ? 'bg-red-600' : 'bg-green-600'} show`; 
    setTimeout(() => { toast.classList.remove('show'); }, 3000); 
}

// --- Firebase Authentication State Observer ---
// This function checks if the user is already logged in.
// If they are, it automatically redirects them to the main application page.
onAuthStateChanged(auth, (user) => { 
    if (user) { 
        window.location.href = 'index.html'; 
    }
});

// --- Event Listeners for Form Switching ---
showRegisterLink.addEventListener('click', (e) => { 
    e.preventDefault(); 
    document.getElementById('login-form-container').classList.add('hidden'); 
    document.getElementById('register-form-container').classList.remove('hidden'); 
    authError.textContent = ''; 
});

showLoginLink.addEventListener('click', (e) => { 
    e.preventDefault(); 
    document.getElementById('register-form-container').classList.add('hidden'); 
    document.getElementById('login-form-container').classList.remove('hidden'); 
    authError.textContent = ''; 
});

// --- Event Listener for Login Form Submission ---
loginForm.addEventListener('submit', async (e) => { 
    e.preventDefault(); 
    const email = document.getElementById('login-email').value; 
    const password = document.getElementById('login-password').value; 
    authError.textContent = ''; 
    try { 
        await signInWithEmailAndPassword(auth, email, password); 
        showToast('Login successful!'); 
        // Redirect is handled by onAuthStateChanged
    } catch (error) { 
        authError.textContent = 'Incorrect email or password.'; 
    }
});

// --- Event Listener for Registration Form Submission ---
registerForm.addEventListener('submit', async (e) => { 
    e.preventDefault(); 
    const email = document.getElementById('register-email').value; 
    const password = document.getElementById('register-password').value; 
    authError.textContent = ''; 
    try { 
        await createUserWithEmailAndPassword(auth, email, password); 
        showToast('Account created successfully!'); 
        // Redirect is handled by onAuthStateChanged
    } catch (error) { 
        if (error.code === 'auth/email-already-in-use') { 
            authError.textContent = 'This email is already in use.'; 
        } else { 
            authError.textContent = 'Error creating account.'; 
        } 
    }
});
