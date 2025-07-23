import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { showToast } from './ui.js';

// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authError = document.getElementById('auth-error');
const showRegisterLink = document.getElementById('show-register-link');
const showLoginLink = document.getElementById('show-login-link');
const logoutBtn = document.getElementById('logout-btn');

// --- AUTH FUNCTIONS ---
async function handleLogin(auth, email, password) {
    authError.textContent = '';
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('ការចូលប្រើប្រាស់បានជោគជ័យ!');
    } catch (error) {
        console.error("Login Error:", error.code, error.message);
        authError.textContent = 'អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។';
    }
}

async function handleRegister(auth, email, password) {
    authError.textContent = '';
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        showToast('ការបង្កើតគណនីបានជោគជ័យ!');
    } catch (error) {
        console.error("Register Error:", error.code, error.message);
        if (error.code === 'auth/email-already-in-use') {
            authError.textContent = 'អ៊ីមែលនេះត្រូវបានប្រើប្រាស់រួចហើយ។';
        } else {
            authError.textContent = 'មានបញ្ហាក្នុងការបង្កើតគណនី។';
        }
    }
}

async function handleLogout(auth) {
    await signOut(auth);
    showToast('បានចាកចេញពីប្រព័ន្ធ។');
}

// --- INITIALIZATION ---
export function initAuth({ auth }) {
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

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        handleLogin(auth, email, password);
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        handleRegister(auth, email, password);
    });

    logoutBtn.addEventListener('click', () => handleLogout(auth));
}
