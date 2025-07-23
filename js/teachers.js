/* ======================================================================= */
/* FILE: js/teachers.js (For teachers.html only)                           */
/* ======================================================================= */

// --- Imports from the main script ---
import { db, userId, allTeachersCache, showToast, createModal, openModal, closeModal } from './main.js';
import { doc, setDoc, addDoc, deleteDoc, collection } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Wait for the 'dataReady' event from main.js ---
document.addEventListener('dataReady', () => {
    
    // --- DOM Elements for this page ---
    const teachersListContainer = document.getElementById('teachers-list');
    const addTeacherBtn = document.getElementById('add-teacher-btn');

    // --- Functions for this page ---

    /**
     * Renders a single teacher card.
     * @param {object} teacher - The teacher data object.
     * @returns {HTMLElement} The created div element for the teacher card.
     */
    function renderTeacherItem(teacher) {
        const div = document.createElement('div');
        div.className = 'bg-white rounded-lg shadow p-4 flex flex-col items-center text-center';
        const placeholderImg = `https://placehold.co/100x100/EBF4FF/7F9CF5?text=${teacher.name.charAt(0)}`;
        
        div.innerHTML = `
            <img src="${teacher.photoUrl || placeholderImg}" onerror="this.onerror=null;this.src='${placeholderImg}';" alt="${teacher.name}" class="w-24 h-24 rounded-full object-cover mb-4">
            <h4 class="font-bold text-lg">${teacher.name}</h4>
            <p class="text-gray-600">${teacher.gender === 'ស្រី' ? 'Female' : 'Male'}</p>
            <p class="text-gray-500 text-sm">${teacher.phone || 'N/A'}</p>
            <div class="mt-4">
                <button class="edit-btn text-blue-500 hover:text-blue-700 mr-2"><i class="fas fa-edit"></i></button>
                <button class="delete-btn text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
            </div>`;
        
        div.querySelector('.edit-btn').addEventListener('click', () => openTeacherModal(teacher));
        
        div.querySelector('.delete-btn').addEventListener('click', () => {
            const modalId = 'delete-teacher-modal';
            const content = `<p>Are you sure you want to delete the teacher <strong>${teacher.name}</strong>?</p>`;
            const footer = `<button id="cancel-delete-btn" class="bg-gray-300 text-black px-4 py-2 rounded-lg mr-2">Cancel</button><button id="confirm-delete-btn" class="bg-red-600 text-white px-4 py-2 rounded-lg">Confirm Delete</button>`;
            
            createModal(modalId, 'Confirm Deletion', content, footer);
            openModal(modalId);

            document.getElementById('confirm-delete-btn').onclick = async () => {
                await deleteDoc(doc(db, `artifacts/glckob-school-app/users/${userId}/teachers`, teacher.id));
                showToast('Teacher deleted successfully.');
                closeModal(modalId);
            };
            document.getElementById('cancel-delete-btn').onclick = () => closeModal(modalId);
        });
        return div;
    }

    /**
     * Opens a modal to add or edit a teacher.
     * @param {object|null} teacher - The teacher object to edit, or null for a new teacher.
     */
    function openTeacherModal(teacher = null) {
        const isEditMode = teacher !== null;
        const modalId = 'teacher-modal';
        const title = isEditMode ? 'Edit Teacher Information' : 'Add New Teacher';
        
        const content = `
            <form id="teacher-form">
                <input type="hidden" id="teacher-id" value="${isEditMode ? teacher.id : ''}">
                <div class="mb-4">
                    <label for="teacher-name" class="block mb-2 text-sm font-medium">Teacher Name</label>
                    <input type="text" id="teacher-name" value="${isEditMode ? teacher.name : ''}" class="w-full p-2.5 border rounded-lg" required>
                </div>
                <div class="mb-4">
                    <label for="teacher-gender" class="block mb-2 text-sm font-medium">Gender</label>
                    <select id="teacher-gender" class="w-full p-2.5 border rounded-lg">
                        <option value="ប្រុស" ${isEditMode && teacher.gender === 'ប្រុស' ? 'selected' : ''}>Male</option>
                        <option value="ស្រី" ${isEditMode && teacher.gender === 'ស្រី' ? 'selected' : ''}>Female</option>
                    </select>
                </div>
                <div class="mb-4">
                    <label for="teacher-phone" class="block mb-2 text-sm font-medium">Phone Number</label>
                    <input type="tel" id="teacher-phone" value="${isEditMode ? teacher.phone || '' : ''}" class="w-full p-2.5 border rounded-lg">
                </div>
                <div class="mb-4">
                    <label for="teacher-photo-url" class="block mb-2 text-sm font-medium">Photo URL</label>
                    <input type="url" id="teacher-photo-url" value="${isEditMode ? teacher.photoUrl || '' : ''}" placeholder="https://example.com/photo.jpg" class="w-full p-2.5 border rounded-lg">
                </div>
                 <div class="mb-4">
                    <label for="teacher-signature-url" class="block mb-2 text-sm font-medium">Signature Image URL</label>
                    <input type="url" id="teacher-signature-url" value="${isEditMode ? teacher.signatureUrl || '' : ''}" placeholder="https://example.com/signature.png" class="w-full p-2.5 border rounded-lg">
                </div>
            </form>`;
        
        const footer = `<button type="submit" form="teacher-form" class="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600">Save</button>`;
        
        createModal(modalId, title, content, footer);
        openModal(modalId);

        document.getElementById('teacher-form').onsubmit = async (e) => {
            e.preventDefault();
            const teacherId = document.getElementById('teacher-id').value;
            const name = document.getElementById('teacher-name').value.trim();
            if (!name) { showToast("Please enter the teacher's name.", true); return; }

            const teacherData = {
                name: name,
                gender: document.getElementById('teacher-gender').value,
                phone: document.getElementById('teacher-phone').value,
                photoUrl: document.getElementById('teacher-photo-url').value || '',
                signatureUrl: document.getElementById('teacher-signature-url').value || ''
            };

            try {
                if (teacherId) { // Edit mode
                    await setDoc(doc(db, `artifacts/glckob-school-app/users/${userId}/teachers`, teacherId), teacherData);
                } else { // Add mode
                    await addDoc(collection(db, `artifacts/glckob-school-app/users/${userId}/teachers`), teacherData);
                }
                showToast('Teacher information saved.');
                closeModal(modalId);
            } catch (error) {
                showToast('Error saving teacher data.', true);
                console.error("Error writing document: ", error);
            }
        };
    }

    /**
     * Renders the full list of teachers from the cache.
     */
    function renderTeachers() {
        teachersListContainer.innerHTML = '';
        if (allTeachersCache.length === 0) {
            teachersListContainer.innerHTML = `<p class="text-gray-500 p-4 text-center col-span-3">No teachers found.</p>`;
            return;
        }
        allTeachersCache.forEach(teacher => teachersListContainer.appendChild(renderTeacherItem(teacher)));
    }

    // --- Initial Setup and Event Listeners ---
    renderTeachers();
    addTeacherBtn.addEventListener('click', () => openTeacherModal());
});
