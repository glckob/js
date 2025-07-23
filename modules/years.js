import { collection, onSnapshot, doc, addDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { allYearsCache, setYears } from './store.js';
import { showToast, createModal, openModal, closeModal, renderList } from './ui.js';

// --- DOM ELEMENTS ---
const addYearBtn = document.getElementById('add-year-btn');
const yearsListContainer = document.getElementById('years-list');

// --- RENDERER ---
function renderYearItem(year, { db, appId, getUserId }) {
    const div = document.createElement('div');
    div.className = 'flex justify-between items-center p-3 border-b hover:bg-gray-50';
    div.innerHTML = `
        <span class="font-bold text-lg">${year.name}</span>
        <div>
            <button class="edit-btn text-blue-500 hover:text-blue-700 mr-2"><i class="fas fa-edit"></i></button>
            <button class="delete-btn text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
        </div>`;
    
    div.querySelector('.edit-btn').addEventListener('click', () => openYearModal(year, { db, appId, getUserId }));
    
    div.querySelector('.delete-btn').addEventListener('click', () => {
        const modalId = 'delete-confirm-modal';
        const title = 'បញ្ជាក់ការលុប';
        const content = `<p>តើអ្នកពិតជាចង់លុបឆ្នាំសិក្សា <strong>${year.name}</strong> មែនទេ? ការលុបនេះនឹងលុបថ្នាក់ និងទិន្នន័យពិន្ទុទាំងអស់ដែលពាក់ព័ន្ធ។</p>`;
        const footer = `
            <button id="cancel-delete-btn" class="bg-gray-300 text-black px-4 py-2 rounded-lg mr-2">បោះបង់</button>
            <button id="confirm-delete-btn" class="bg-red-600 text-white px-4 py-2 rounded-lg">យល់ព្រមលុប</button>`;

        createModal(modalId, title, content, footer);
        openModal(modalId);

        document.getElementById('confirm-delete-btn').onclick = async () => {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/users/${getUserId()}/academic_years`, year.id));
                showToast('បានលុបឆ្នាំសិក្សាដោយជោគជ័យ');
            } catch (error) {
                showToast('ការលុបមានបញ្ហា សូមព្យាយាមម្តងទៀត', true);
                console.error("Error deleting year:", error);
            }
            closeModal(modalId);
        };
        document.getElementById('cancel-delete-btn').onclick = () => closeModal(modalId);
    });
    return div;
}

// --- MODAL ---
function openYearModal(year = null, { db, appId, getUserId }) {
    const isEditMode = year !== null;
    const currentYear = new Date().getFullYear();
    const modalId = 'year-modal';
    const title = isEditMode ? 'កែប្រែឆ្នាំសិក្សា' : 'បន្ថែមឆ្នាំសិក្សាថ្មី';
    const content = `
        <form id="year-form">
            <input type="hidden" id="year-id" value="${isEditMode ? year.id : ''}">
            <div class="mb-4">
                <label for="start-year" class="block mb-2 text-sm font-medium">ឆ្នាំចាប់ផ្តើម</label>
                <input type="number" id="start-year" value="${isEditMode ? year.startYear : currentYear}" class="w-full p-2.5 rounded-lg" required>
            </div>
            <div class="mb-4">
                <label for="end-year" class="block mb-2 text-sm font-medium">ឆ្នាំបញ្ចប់</label>
                <input type="number" id="end-year" value="${isEditMode ? year.endYear : currentYear + 1}" class="w-full p-2.5 rounded-lg" required>
            </div>
        </form>`;
    const footer = `<button type="submit" form="year-form" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">រក្សាទុក</button>`;
    
    createModal(modalId, title, content, footer);
    openModal(modalId);

    document.getElementById('year-form').onsubmit = async (e) => {
        e.preventDefault();
        const yearId = document.getElementById('year-id').value;
        const startYear = document.getElementById('start-year').value;
        const endYear = document.getElementById('end-year').value;
        const yearName = `${startYear}-${endYear}`;

        const isDuplicate = allYearsCache.some(y => y.name === yearName && y.id !== yearId);
        if (isDuplicate) {
            showToast('ឆ្នាំសិក្សានេះមានរួចហើយ។', true);
            return;
        }

        if (startYear && endYear && parseInt(endYear) > parseInt(startYear)) {
            const yearData = { startYear: parseInt(startYear), endYear: parseInt(endYear), name: yearName };
            const collectionRef = collection(db, `artifacts/${appId}/users/${getUserId()}/academic_years`);
            try {
                if (yearId) {
                    await setDoc(doc(collectionRef, yearId), yearData);
                    showToast('បានកែប្រែឆ្នាំសិក្សា');
                } else {
                    await addDoc(collectionRef, yearData);
                    showToast('បានបន្ថែមឆ្នាំសិក្សាដោយជោគជ័យ');
                }
                closeModal(modalId);
            } catch (error) {
                showToast('ការរក្សាទុកមានបញ្ហា', true);
                console.error("Error saving year:", error);
            }
        } else {
            showToast('ទិន្នន័យមិនត្រឹមត្រូវ', true);
        }
    };
}

// --- INITIALIZATION ---
export function initYears({ db, appId, getUserId, addUnsubscribeListener }) {
    const collectionRef = collection(db, `artifacts/${appId}/users/${getUserId()}/academic_years`);
    
    const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
        const years = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setYears(years.sort((a, b) => b.startYear - a.startYear));
        
        renderList(
            yearsListContainer, 
            allYearsCache, 
            (item) => renderYearItem(item, { db, appId, getUserId }), 
            "មិនទាន់មានឆ្នាំសិក្សា"
        );
    });

    addUnsubscribeListener(unsubscribe);

    addYearBtn.addEventListener('click', () => openYearModal(null, { db, appId, getUserId }));
}
