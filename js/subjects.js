/* ======================================================================= */
/* FILE: js/subjects.js (For subjects.html only)                           */
/* ======================================================================= */

// --- Imports from the main script ---
import { db, userId, allYearsCache, allSubjectsCache, showToast, createModal, openModal, closeModal } from './main.js';
import { doc, setDoc, addDoc, deleteDoc, collection } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Wait for the 'dataReady' event from main.js ---
document.addEventListener('dataReady', () => {
    
    // --- DOM Elements for this page ---
    const subjectsListContainer = document.getElementById('subjects-list');
    const addSubjectBtn = document.getElementById('add-subject-btn');
    const subjectYearFilter = document.getElementById('subject-year-filter');

    // --- Functions for this page ---

    function renderSubjectItem(subject) {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center p-3 border-b hover:bg-gray-50';
        div.innerHTML = `
            <div>
                <span class="font-bold text-gray-600 mr-3">${subject.order}.</span>
                <span class="font-medium">${subject.name}</span>
                <span class="text-sm text-gray-500 ml-2">(Max Score: ${subject.maxScore || 'N/A'}, Coefficient: ${subject.coefficient || 'N/A'})</span>
            </div>
            <div>
                <button class="edit-btn text-blue-500 hover:text-blue-700 mr-2"><i class="fas fa-edit"></i></button>
                <button class="delete-btn text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
            </div>`;
        
        div.querySelector('.edit-btn').addEventListener('click', () => openSubjectModal(subject));
        
        div.querySelector('.delete-btn').addEventListener('click', () => {
            const modalId = 'delete-subject-modal';
            const content = `<p>Are you sure you want to delete the subject <strong>${subject.name}</strong>?</p>`;
            const footer = `<button id="cancel-delete-btn" class="bg-gray-300 text-black px-4 py-2 rounded-lg mr-2">Cancel</button><button id="confirm-delete-btn" class="bg-red-600 text-white px-4 py-2 rounded-lg">Confirm Delete</button>`;
            
            createModal(modalId, 'Confirm Deletion', content, footer);
            openModal(modalId);

            document.getElementById('confirm-delete-btn').onclick = async () => {
                await deleteDoc(doc(db, `artifacts/glckob-school-app/users/${userId}/subjects`, subject.id));
                showToast('Subject deleted successfully.');
                closeModal(modalId);
            };
            document.getElementById('cancel-delete-btn').onclick = () => closeModal(modalId);
        });
        return div;
    }

    function openSubjectModal(subject = null) {
        const isEditMode = subject !== null;
        const modalId = 'subject-modal';
        const title = isEditMode ? 'Edit Subject' : 'Add New Subject';
        const selectedYearId = subjectYearFilter.value;

        const content = `
            <form id="subject-form">
                <input type="hidden" id="subject-id" value="${isEditMode ? subject.id : ''}">
                <div class="grid grid-cols-3 gap-4">
                    <div class="col-span-2">
                        <label for="subject-name" class="block mb-2 text-sm font-medium">Subject Name</label>
                        <input type="text" id="subject-name" value="${isEditMode ? subject.name : ''}" class="w-full p-2.5 border rounded-lg" required>
                    </div>
                    <div>
                        <label for="subject-order" class="block mb-2 text-sm font-medium">Order</label>
                        <input type="number" id="subject-order" value="${isEditMode ? subject.order : ''}" class="w-full p-2.5 border rounded-lg" required>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4 mt-4">
                    <div>
                        <label for="subject-max-score" class="block mb-2 text-sm font-medium">Max Score</label>
                        <input type="number" id="subject-max-score" value="${isEditMode ? subject.maxScore || '100' : '100'}" class="w-full p-2.5 border rounded-lg">
                    </div>
                    <div>
                        <label for="subject-coefficient" class="block mb-2 text-sm font-medium">Coefficient (Auto)</label>
                        <input type="number" id="subject-coefficient" value="${isEditMode ? subject.coefficient || '2' : '2'}" class="w-full p-2.5 border rounded-lg bg-gray-200" readonly>
                    </div>
                </div>
            </form>`;
        
        const footer = `<button type="submit" form="subject-form" class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">Save</button>`;
        
        createModal(modalId, title, content, footer);
        openModal(modalId);

        const maxScoreInput = document.getElementById('subject-max-score');
        const coefficientInput = document.getElementById('subject-coefficient');
        const calculateCoefficient = () => {
            const maxScore = parseFloat(maxScoreInput.value);
            coefficientInput.value = !isNaN(maxScore) && maxScore > 0 ? maxScore / 50 : '';
        };
        maxScoreInput.addEventListener('input', calculateCoefficient);

        document.getElementById('subject-form').onsubmit = async (e) => {
            e.preventDefault();
            const subjectId = document.getElementById('subject-id').value;
            const subjectData = {
                name: document.getElementById('subject-name').value.trim(),
                order: parseInt(document.getElementById('subject-order').value),
                maxScore: parseInt(maxScoreInput.value),
                coefficient: parseFloat(coefficientInput.value),
                academicYearId: selectedYearId
            };

            if (!subjectData.name || !subjectData.order) {
                showToast('Please provide a name and order for the subject.', true);
                return;
            }

            try {
                if (subjectId) { // Edit mode
                    await setDoc(doc(db, `artifacts/glckob-school-app/users/${userId}/subjects`, subjectId), subjectData);
                } else { // Add mode
                    await addDoc(collection(db, `artifacts/glckob-school-app/users/${userId}/subjects`), subjectData);
                }
                showToast('Subject saved successfully.');
                closeModal(modalId);
            } catch (error) {
                showToast('Error saving subject.', true);
                console.error("Error writing document: ", error);
            }
        };
    }

    function populateAndSetYearFilter() {
        subjectYearFilter.innerHTML = allYearsCache.map(year => `<option value="${year.id}">${year.name}</option>`).join('');
        if (allYearsCache.length > 0) {
            subjectYearFilter.value = allYearsCache[0].id;
        }
    }

    function filterAndRenderSubjects() {
        const selectedYearId = subjectYearFilter.value;
        subjectsListContainer.innerHTML = '';
        if (!selectedYearId) {
            subjectsListContainer.innerHTML = `<p class="text-gray-500 p-4 text-center">Please select an academic year.</p>`;
            return;
        }

        const subjectsToDisplay = allSubjectsCache
            .filter(s => s.academicYearId === selectedYearId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

        if (subjectsToDisplay.length === 0) {
            subjectsListContainer.innerHTML = `<p class="text-gray-500 p-4 text-center">No subjects found for this academic year.</p>`;
            return;
        }
        subjectsToDisplay.forEach(subject => subjectsListContainer.appendChild(renderSubjectItem(subject)));
    }

    // --- Initial Setup and Event Listeners ---
    populateAndSetYearFilter();
    filterAndRenderSubjects();

    addSubjectBtn.addEventListener('click', () => openSubjectModal());
    subjectYearFilter.addEventListener('change', filterAndRenderSubjects);
});
