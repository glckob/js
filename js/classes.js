/* ======================================================================= */
/* FILE: js/classes.js (For classes.html only)                             */
/* ======================================================================= */

// --- Imports from the main script ---
import { db, userId, allYearsCache, allClassesCache, allTeachersCache, showToast, createModal, openModal, closeModal } from './main.js';
import { doc, setDoc, addDoc, deleteDoc, collection } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Wait for the 'dataReady' event from main.js ---
document.addEventListener('dataReady', () => {
    
    // --- DOM Elements for this page ---
    const classesListContainer = document.getElementById('classes-list');
    const addClassBtn = document.getElementById('add-class-btn');
    const classYearFilter = document.getElementById('class-year-filter');

    // --- Functions for this page ---

    /**
     * Renders a single class item.
     * @param {object} classData - The combined class data with teacher and year names.
     * @returns {HTMLElement} The created div element for the class item.
     */
    function renderClassItem(classData) {
        const div = document.createElement('div');
        div.className = 'bg-white rounded-lg shadow-sm p-4 mb-4';
        div.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-bold text-xl text-green-700">Class ${classData.className}</h3>
                    <p class="text-gray-600">Academic Year: ${classData.yearName}</p>
                    <p class="text-gray-600">Teacher: ${classData.teacherName}</p>
                    <p class="text-gray-600">Number of Students: ${classData.studentIds?.length || 0}</p>
                </div>
                <div class="flex flex-col items-end space-y-2">
                    <button class="manage-btn w-full bg-blue-500 text-white px-3 py-1 rounded-md text-sm"><i class="fas fa-cog"></i> Manage Class</button>
                    <div class="flex">
                        <button class="edit-btn text-yellow-500 hover:text-yellow-700 mr-2"><i class="fas fa-edit"></i> Edit</button>
                        <button class="delete-btn text-red-500 hover:text-red-700"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
            </div>`;
        
        div.querySelector('.edit-btn').addEventListener('click', () => openClassModal(classData));
        
        div.querySelector('.delete-btn').addEventListener('click', () => {
            const modalId = 'delete-class-modal';
            const content = `<p>Are you sure you want to delete class <strong>${classData.className}</strong>?</p><p class="mt-2 text-sm text-red-600"><strong>Note:</strong> This will permanently delete all associated scores, but student data will remain.</p>`;
            const footer = `<button id="cancel-delete-btn" class="bg-gray-300 text-black px-4 py-2 rounded-lg mr-2">Cancel</button><button id="confirm-delete-btn" class="bg-red-600 text-white px-4 py-2 rounded-lg">Confirm Delete</button>`;
            
            createModal(modalId, 'Confirm Deletion', content, footer);
            openModal(modalId);

            document.getElementById('confirm-delete-btn').onclick = async () => {
                await deleteDoc(doc(db, `artifacts/glckob-school-app/users/${userId}/classes`, classData.id));
                showToast('Class deleted successfully.');
                closeModal(modalId);
            };
            document.getElementById('cancel-delete-btn').onclick = () => closeModal(modalId);
        });

        // Note: The manage button functionality will be added in a future step when we create the class detail page.
        div.querySelector('.manage-btn').addEventListener('click', () => {
            showToast('Manage Class page is not yet implemented.');
        });

        return div;
    }

    /**
     * Opens a modal to add or edit a class.
     * @param {object|null} classData - The class object to edit, or null for a new class.
     */
    function openClassModal(classData = null) {
        const isEditMode = classData !== null;
        const modalId = 'class-modal';
        const title = isEditMode ? 'Edit Class Information' : 'Create New Class';
        
        const yearOptions = allYearsCache.map(y => `<option value="${y.id}" ${isEditMode && classData.academicYearId === y.id ? 'selected' : ''}>${y.name}</option>`).join('');
        const teacherOptions = allTeachersCache.map(t => `<option value="${t.id}" ${isEditMode && classData.teacherId === t.id ? 'selected' : ''}>${t.name}</option>`).join('');
        const gradeOptions = Array.from({length: 6}, (_, i) => 7 + i).map(g => `<option value="${g}" ${isEditMode && classData.grade == g ? 'selected' : ''}>${g}</option>`).join('');
        const sectionOptions = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(s => `<option value="${s}" ${isEditMode && classData.section === s ? 'selected' : ''}>${s}</option>`).join('');

        const content = `
            <form id="class-form">
                <input type="hidden" id="class-id" value="${isEditMode ? classData.id : ''}">
                <div class="grid grid-cols-2 gap-4">
                    <div><label for="class-year" class="block mb-2 text-sm font-medium">Academic Year</label><select id="class-year" class="w-full p-2.5 border rounded-lg" required>${yearOptions}</select></div>
                    <div><label for="class-teacher" class="block mb-2 text-sm font-medium">Teacher</label><select id="class-teacher" class="w-full p-2.5 border rounded-lg" required>${teacherOptions}</select></div>
                    <div><label for="class-grade" class="block mb-2 text-sm font-medium">Grade</label><select id="class-grade" class="w-full p-2.5 border rounded-lg" required>${gradeOptions}</select></div>
                    <div><label for="class-section" class="block mb-2 text-sm font-medium">Section</label><select id="class-section" class="w-full p-2.5 border rounded-lg" required>${sectionOptions}</select></div>
                </div>
            </form>`;
        
        const footer = `<button type="submit" form="class-form" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">${isEditMode ? 'Save Changes' : 'Create Class'}</button>`;
        
        createModal(modalId, title, content, footer);
        openModal(modalId);

        document.getElementById('class-form').onsubmit = async (e) => {
            e.preventDefault();
            const classId = document.getElementById('class-id').value;
            const academicYearId = document.getElementById('class-year').value;
            const teacherId = document.getElementById('class-teacher').value;
            const grade = document.getElementById('class-grade').value;
            const section = document.getElementById('class-section').value;

            if (!academicYearId || !teacherId || !grade || !section) {
                showToast('Please fill out all fields.', true);
                return;
            }

            const classDataToSave = {
                academicYearId,
                teacherId,
                grade,
                section,
                className: `${grade}${section}`,
                studentIds: isEditMode ? classData.studentIds || [] : [],
                subjectIds: isEditMode ? classData.subjectIds || [] : []
            };

            try {
                if (classId) { // Edit mode
                    await setDoc(doc(db, `artifacts/glckob-school-app/users/${userId}/classes`, classId), classDataToSave);
                } else { // Add mode
                    await addDoc(collection(db, `artifacts/glckob-school-app/users/${userId}/classes`), classDataToSave);
                }
                showToast('Class saved successfully.');
                closeModal(modalId);
            } catch (error) {
                showToast('Error saving class data.', true);
                console.error("Error writing document: ", error);
            }
        };
    }

    /**
     * Populates the year filter dropdown and sets a default value.
     */
    function populateAndSetYearFilter() {
        classYearFilter.innerHTML = allYearsCache.map(year => `<option value="${year.id}">${year.name}</option>`).join('');
        if (allYearsCache.length > 0) {
            classYearFilter.value = allYearsCache[0].id;
        }
    }

    /**
     * Filters and renders the list of classes based on the selected year.
     */
    function filterAndRenderClasses() {
        const selectedYearId = classYearFilter.value;
        classesListContainer.innerHTML = '';

        if (!selectedYearId) {
            classesListContainer.innerHTML = `<p class="text-gray-500 p-4 text-center">Please select an academic year.</p>`;
            return;
        }

        const classesToDisplay = allClassesCache.filter(c => c.academicYearId === selectedYearId);

        if (classesToDisplay.length === 0) {
            classesListContainer.innerHTML = `<p class="text-gray-500 p-4 text-center">No classes found for this academic year.</p>`;
            return;
        }

        const populatedClasses = classesToDisplay.map(c => ({
            ...c,
            yearName: allYearsCache.find(y => y.id === c.academicYearId)?.name || 'N/A',
            teacherName: allTeachersCache.find(t => t.id === c.teacherId)?.name || 'Not Assigned'
        }));

        populatedClasses.forEach(c => classesListContainer.appendChild(renderClassItem(c)));
    }

    // --- Initial Setup and Event Listeners ---
    populateAndSetYearFilter();
    filterAndRenderClasses();

    addClassBtn.addEventListener('click', () => openClassModal());
    classYearFilter.addEventListener('change', filterAndRenderClasses);
});
