/* ======================================================================= */
/* FILE: js/years.js (For years.html only)                                 */
/* ======================================================================= */

// --- Imports from the main script ---
import { db, userId, allYearsCache, showToast, createModal, openModal, closeModal } from './main.js';
import { doc, setDoc, addDoc, deleteDoc, collection } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Wait for the 'dataReady' event from main.js ---
document.addEventListener('dataReady', () => {
    
    // --- DOM Elements for this page ---
    const yearsListContainer = document.getElementById('years-list');
    const addYearBtn = document.getElementById('add-year-btn');

    // --- Functions for this page ---

    /**
     * Renders a single academic year item in the list.
     * @param {object} year - The academic year data object.
     * @returns {HTMLElement} The created div element for the year item.
     */
    function renderYearItem(year) {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center p-3 border-b hover:bg-gray-50';
        div.innerHTML = `
            <span class="font-bold text-lg">${year.name}</span>
            <div>
                <button class="edit-btn text-blue-500 hover:text-blue-700 mr-2"><i class="fas fa-edit"></i></button>
                <button class="delete-btn text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
            </div>`;
        
        // Attach event listener for the edit button
        div.querySelector('.edit-btn').addEventListener('click', () => openYearModal(year));
        
        // Attach event listener for the delete button
        div.querySelector('.delete-btn').addEventListener('click', () => {
            const modalId = 'delete-confirm-modal';
            const content = `<p>Are you sure you want to delete the academic year <strong>${year.name}</strong>? This action cannot be undone.</p>`;
            const footer = `
                <button id="cancel-delete-btn" class="bg-gray-300 text-black px-4 py-2 rounded-lg mr-2">Cancel</button>
                <button id="confirm-delete-btn" class="bg-red-600 text-white px-4 py-2 rounded-lg">Confirm Delete</button>`;
            
            createModal(modalId, 'Confirm Deletion', content, footer);
            openModal(modalId);

            document.getElementById('confirm-delete-btn').onclick = async () => {
                try {
                    await deleteDoc(doc(db, `artifacts/glckob-school-app/users/${userId}/academic_years`, year.id));
                    showToast('Academic year deleted successfully.');
                } catch (error) {
                    showToast('Error deleting academic year.', true);
                    console.error("Error deleting document: ", error);
                }
                closeModal(modalId);
            };
            document.getElementById('cancel-delete-btn').onclick = () => closeModal(modalId);
        });
        return div;
    }

    /**
     * Opens a modal to add a new academic year or edit an existing one.
     * @param {object|null} year - The year object to edit, or null to add a new one.
     */
    function openYearModal(year = null) {
        const isEditMode = year !== null;
        const currentYear = new Date().getFullYear();
        const modalId = 'year-modal';
        const title = isEditMode ? 'Edit Academic Year' : 'Add New Academic Year';
        
        const content = `
            <form id="year-form">
                <input type="hidden" id="year-id" value="${isEditMode ? year.id : ''}">
                <div class="mb-4">
                    <label for="start-year" class="block mb-2 text-sm font-medium">Start Year</label>
                    <input type="number" id="start-year" value="${isEditMode ? year.startYear : currentYear}" class="w-full p-2.5 border rounded-lg" required>
                </div>
                <div class="mb-4">
                    <label for="end-year" class="block mb-2 text-sm font-medium">End Year</label>
                    <input type="number" id="end-year" value="${isEditMode ? year.endYear : currentYear + 1}" class="w-full p-2.5 border rounded-lg" required>
                </div>
            </form>`;
        
        const footer = `<button type="submit" form="year-form" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Save</button>`;
        
        createModal(modalId, title, content, footer);
        openModal(modalId);

        document.getElementById('year-form').onsubmit = async (e) => {
            e.preventDefault();
            const yearId = document.getElementById('year-id').value;
            const startYear = document.getElementById('start-year').value;
            const endYear = document.getElementById('end-year').value;
            const yearName = `${startYear}-${endYear}`;

            // Check for duplicates
            if (allYearsCache.some(y => y.name === yearName && y.id !== yearId)) {
                showToast('This academic year already exists.', true);
                return;
            }

            const yearData = { 
                startYear: parseInt(startYear), 
                endYear: parseInt(endYear), 
                name: yearName 
            };

            try {
                if (yearId) { // Edit mode
                    await setDoc(doc(db, `artifacts/glckob-school-app/users/${userId}/academic_years`, yearId), yearData);
                } else { // Add mode
                    await addDoc(collection(db, `artifacts/glckob-school-app/users/${userId}/academic_years`), yearData);
                }
                showToast('Saved successfully');
                closeModal(modalId);
            } catch (error) {
                showToast('Error saving data.', true);
                console.error("Error writing document: ", error);
            }
        };
    }

    /**
     * Renders the full list of academic years from the cache.
     */
    function renderYears() {
        yearsListContainer.innerHTML = '';
        if (allYearsCache.length === 0) {
            yearsListContainer.innerHTML = `<p class="text-gray-500 p-4 text-center">No academic years found.</p>`;
            return;
        }
        allYearsCache.forEach(year => yearsListContainer.appendChild(renderYearItem(year)));
    }

    // --- Initial Setup and Event Listeners ---
    renderYears();
    addYearBtn.addEventListener('click', () => openYearModal());
});
