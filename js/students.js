/* ======================================================================= */
/* FILE: js/students.js (For students.html only)                           */
/* ======================================================================= */

// --- Imports from the main script ---
import { db, userId, allYearsCache, allClassesCache, allStudentsCache, showToast, createModal, openModal, closeModal } from './main.js';
import { doc, setDoc, addDoc, deleteDoc, collection, updateDoc, arrayUnion, arrayRemove, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Wait for the 'dataReady' event from main.js ---
document.addEventListener('dataReady', () => {
    
    // --- DOM Elements for this page ---
    const studentYearFilter = document.getElementById('student-year-filter');
    const studentClassFilter = document.getElementById('student-class-filter');
    const studentSearchInput = document.getElementById('student-search-input');
    const studentsListContainer = document.getElementById('students-list');
    const addStudentBtn = document.getElementById('add-student-btn');
    const exportStudentsBtn = document.getElementById('export-students-btn');
    const studentStatsContainer = document.getElementById('student-stats-container');
    const studentSearchContainer = document.getElementById('student-search-container');

    // --- Functions for this page ---

    function populateAndSetYearFilter() {
        studentYearFilter.innerHTML = allYearsCache.map(year => `<option value="${year.id}">${year.name}</option>`).join('');
        if (allYearsCache.length > 0) {
            studentYearFilter.value = allYearsCache[0].id;
        }
    }

    function populateClassFilter() {
        const selectedYearId = studentYearFilter.value;
        studentClassFilter.innerHTML = '<option value="">-- All Classes --</option><option value="unassigned" class="text-red-600 font-medium">-- Unassigned Students --</option>';
        if (selectedYearId) {
            const classesInYear = allClassesCache
                .filter(c => c.academicYearId === selectedYearId)
                .sort((a, b) => a.className.localeCompare(b.className));
            classesInYear.forEach(c => {
                studentClassFilter.innerHTML += `<option value="${c.id}">${c.className}</option>`;
            });
        }
    }

    function renderStudentItem(student, index) {
        const tr = document.createElement('tr');
        tr.className = 'border-b hover:bg-gray-50';
        const studentClass = allClassesCache.find(c => c.studentIds?.includes(student.id));
        let classInfo = '<span class="text-gray-400">Unassigned</span>';
        if (studentClass) {
            const yearInfo = allYearsCache.find(y => y.id === studentClass.academicYearId);
            classInfo = `<span class="font-medium text-green-700">Class ${studentClass.className}</span> <span class="text-sm text-gray-500">(${yearInfo?.name || ''})</span>`;
        }
        const placeholderImg = `https://placehold.co/40x40/EBF4FF/7F9CF5?text=${student.name.charAt(0)}`;
        tr.innerHTML = `
            <td class="p-3">${index + 1}</td>
            <td class="p-3 font-mono">${student.studentId}</td>
            <td class="p-3 flex items-center">
                <img src="${student.photoUrl || placeholderImg}" onerror="this.onerror=null;this.src='${placeholderImg}';" alt="${student.name}" class="w-10 h-10 rounded-full object-cover mr-3">
                <span class="font-medium">${student.name}</span>
            </td>
            <td class="p-3">${student.gender === 'ស្រី' ? 'Female' : 'Male'}</td>
            <td class="p-3">${classInfo}</td>
            <td class="p-3">${student.dob || 'N/A'}</td>
            <td class="p-3">${student.phone || 'N/A'}</td>
            <td class="p-3 text-right">
                <button class="edit-btn text-blue-500 hover:text-blue-700 mr-2"><i class="fas fa-edit"></i></button>
                <button class="delete-btn text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
            </td>`;
        tr.querySelector('.edit-btn').addEventListener('click', () => openStudentModal(student));
        tr.querySelector('.delete-btn').addEventListener('click', () => { /* ... delete logic ... */ });
        return tr;
    }

    function renderStudentTable(data) {
        studentsListContainer.innerHTML = '';
        if (data.length === 0) {
            studentsListContainer.innerHTML = `<p class="text-gray-500 p-4 text-center">No students found matching the criteria.</p>`;
            return;
        }
        const table = document.createElement('table');
        table.className = 'w-full text-sm text-left';
        table.innerHTML = `<thead class="text-xs text-gray-700 uppercase bg-gray-50"><tr><th class="p-3">#</th><th class="p-3">Student ID</th><th class="p-3">Name</th><th class="p-3">Gender</th><th class="p-3">Class/Year</th><th class="p-3">Date of Birth</th><th class="p-3">Phone</th><th class="p-3"></th></tr></thead><tbody></tbody>`;
        const tbody = table.querySelector('tbody');
        data.forEach((student, index) => tbody.appendChild(renderStudentItem(student, index)));
        studentsListContainer.appendChild(table);
    }

    function filterAndRenderStudents() {
        const selectedYearId = studentYearFilter.value;
        const selectedClassId = studentClassFilter.value;
        const searchTerm = studentSearchInput.value.toLowerCase();
        
        if (!selectedYearId) {
            studentsListContainer.innerHTML = `<p class="text-gray-500 p-4 text-center">Please select an academic year to display students.</p>`;
            studentStatsContainer.classList.add('hidden');
            studentSearchContainer.classList.add('hidden');
            return;
        }

        studentStatsContainer.classList.remove('hidden');
        studentSearchContainer.classList.remove('hidden');

        let studentsToDisplay = [];
        if (selectedClassId === 'unassigned') {
            const assignedIds = new Set(allClassesCache.flatMap(c => c.studentIds || []));
            studentsToDisplay = allStudentsCache.filter(s => !assignedIds.has(s.id));
        } else if (selectedClassId) {
            const selectedClass = allClassesCache.find(c => c.id === selectedClassId);
            studentsToDisplay = allStudentsCache.filter(s => selectedClass?.studentIds?.includes(s.id));
        } else {
            const classesInYear = allClassesCache.filter(c => c.academicYearId === selectedYearId);
            const studentIdsInYear = new Set(classesInYear.flatMap(c => c.studentIds || []));
            studentsToDisplay = allStudentsCache.filter(s => studentIdsInYear.has(s.id));
        }

        let filteredStudents = studentsToDisplay.filter(student => {
            const studentClass = allClassesCache.find(c => c.studentIds?.includes(student.id));
            return (student.studentId.toLowerCase().includes(searchTerm) ||
                    student.name.toLowerCase().includes(searchTerm) ||
                    studentClass?.className.toLowerCase().includes(searchTerm));
        });
        
        document.getElementById('student-stats-total').textContent = filteredStudents.length;
        document.getElementById('student-stats-female').textContent = filteredStudents.filter(s => s.gender === 'ស្រី').length;
        
        renderStudentTable(filteredStudents);
    }
    
    function openStudentModal(student = null) { /* ... modal logic from original script ... */ }
    function exportToExcel() { /* ... export logic from original script ... */ }

    // --- Initial Setup & Event Listeners ---
    populateAndSetYearFilter();
    populateClassFilter();
    filterAndRenderStudents();

    studentYearFilter.addEventListener('change', () => {
        populateClassFilter();
        filterAndRenderStudents();
    });
    studentClassFilter.addEventListener('change', filterAndRenderStudents);
    studentSearchInput.addEventListener('input', filterAndRenderStudents);
    addStudentBtn.addEventListener('click', () => openStudentModal());
    exportStudentsBtn.addEventListener('click', exportToExcel);
});
