// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, getDocs, onSnapshot, setDoc, deleteDoc, query, where, getDoc, updateDoc, arrayUnion, arrayRemove, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- CONFIGURATION ---
// !!! សំខាន់ !!!
// សូមប្រាកដថាค่าเหล่านี้ตรงกับการตั้งค่าโปรเจกต์ Firebase ของคุณ
// ค่าที่ไม่ถูกต้องនៅទីនេះគឺជាสาเหตุទូទៅនៃปัญหาการเข้าสู่ระบบ/การยืนยันตัวตน
const firebaseConfig = {
    apiKey: "AIzaSyCOo5oxLfCCxNAd78vGEruoPm2ng-7Etmg",
    authDomain: "glckob.firebaseapp.com",
    projectId: "glckob",
    storageBucket: "glckob.appspot.com",
    messagingSenderId: "766670265981",
    appId: "1:766670265981:web:b1d0b0b0b0b0b0b0"
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'glckob-school-app';

// --- GLOBAL STATE ---
let app, auth, db, userId;
let unsubscribeListeners = [];
let currentClassData = null;
let allStudentsCache = [];
let allSubjectsCache = [];
let allTeachersCache = [];
let allClassesCache = [];
let allYearsCache = [];
let schoolSettingsCache = {};
let qrCodeInstance = null;
let studentGenderChart = null;
const khmerMonths = ["", "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];


// --- DOM ELEMENTS ---
const authScreen = document.getElementById('auth-screen');
const appContainer = document.getElementById('app-container');
const mainViewsContainer = document.getElementById('main-views-container');
const classDetailContainer = document.getElementById('class-detail-container');
const backToClassesBtn = document.getElementById('back-to-classes-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authError = document.getElementById('auth-error');
const showRegisterLink = document.getElementById('show-register-link');
const showLoginLink = document.getElementById('show-login-link');
const logoutBtn = document.getElementById('logout-btn');
const userEmailDisplay = document.getElementById('user-email-display');
const navLinks = document.querySelectorAll('.nav-link');
const pageViews = document.querySelectorAll('.page-view');
const addYearBtn = document.getElementById('add-year-btn');
const addClassBtn = document.getElementById('add-class-btn');
const addTeacherBtn = document.getElementById('add-teacher-btn');
const addStudentBtn = document.getElementById('add-student-btn');
const addSubjectBtn = document.getElementById('add-subject-btn');
const studentSearchInput = document.getElementById('student-search-input');
const studentYearFilter = document.getElementById('student-year-filter');
const studentClassFilter = document.getElementById('student-class-filter');
const classYearFilter = document.getElementById('class-year-filter');
const subjectYearFilter = document.getElementById('subject-year-filter');
const studentStatsContainer = document.getElementById('student-stats-container');
const studentSearchContainer = document.getElementById('student-search-container');
const exportStudentsBtn = document.getElementById('export-students-btn');
const sidebarSchoolName = document.getElementById('sidebar-school-name');
const schoolNameInput = document.getElementById('school-name-input');
const directorStampUrlInput = document.getElementById('director-stamp-url');
const qrLinkUrlInput = document.getElementById('qr-link-url');
const saveSchoolInfoBtn = document.getElementById('save-school-info-btn');
const stampPreview = document.getElementById('stamp-preview');
const qrCodePreviewContainer = document.getElementById('qr-code-preview');
const settingsYearSelect = document.getElementById('settings-year-select');
const semesterSettingsForm = document.getElementById('semester-settings-form');
const appTitle = document.getElementById('app-title');
const loginSchoolName = document.getElementById('login-school-name');
// Dashboard elements
const dashCardYears = document.getElementById('dash-card-years');
const dashCardClasses = document.getElementById('dash-card-classes');
const dashCardTeachers = document.getElementById('dash-card-teachers');
const dashCardStudents = document.getElementById('dash-card-students');
const chartYearFilter = document.getElementById('chart-year-filter');
const studentGenderChartCanvas = document.getElementById('studentGenderChart');
// Scores Page elements
const scoresYearFilter = document.getElementById('scores-year-filter');
const scoresClassFilter = document.getElementById('scores-class-filter');
const scoresExamFilter = document.getElementById('scores-exam-filter');
const scoresPageTableContainer = document.getElementById('scores-page-table-container');
const saveScoresPageBtn = document.getElementById('save-scores-page-btn');
// Rankings Page elements
const rankingsYearFilter = document.getElementById('rankings-year-filter');
const rankingsClassFilter = document.getElementById('rankings-class-filter');
const rankingsExamFilter = document.getElementById('rankings-exam-filter');
const rankingsTableContainer = document.getElementById('rankings-table-container');
const exportRankingsBtn = document.getElementById('export-rankings-btn');

// --- UTILITY & NAVIGATION FUNCTIONS ---
function showToast(message, isError = false) { const toast = document.getElementById('toast-notification'); const toastMessage = document.getElementById('toast-message'); toastMessage.textContent = message; toast.className = `toast max-w-xs text-white p-4 rounded-lg shadow-lg ${isError ? 'bg-red-600' : 'bg-green-600'} show`; setTimeout(() => { toast.classList.remove('show'); }, 3000); }
function createModal(id, title, content, footer) { const modalHTML = `<div id="${id}" class="modal fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 opacity-0 pointer-events-none"><div class="modal-content bg-white rounded-lg shadow-xl w-full max-w-lg m-4 transform -translate-y-10 flex flex-col max-h-[90vh]"><div class="flex-shrink-0 flex justify-between items-center p-4 border-b"><h3 class="font-koulen text-xl">${title}</h3><button class="close-modal-btn text-gray-400 hover:text-gray-600">&times;</button></div><div class="flex-grow p-6 overflow-y-auto">${content}</div><div class="flex-shrink-0 flex justify-end p-4 bg-gray-50 border-t rounded-b-lg">${footer}</div></div></div>`; document.getElementById('modal-container').innerHTML = modalHTML; const modal = document.getElementById(id); modal.querySelector('.close-modal-btn').addEventListener('click', () => closeModal(id)); return modal; }
function openModal(id) { const modal = document.getElementById(id); if(modal) { modal.classList.remove('opacity-0', 'pointer-events-none'); modal.querySelector('.modal-content').classList.remove('-translate-y-10'); } }
function closeModal(id) { const modal = document.getElementById(id); if(modal) { modal.classList.add('opacity-0'); modal.querySelector('.modal-content').classList.add('-translate-y-10'); setTimeout(() => { modal.classList.add('pointer-events-none'); document.getElementById('modal-container').innerHTML = ''; }, 250); } }
function switchView(targetId) { mainViewsContainer.classList.remove('hidden'); classDetailContainer.classList.add('hidden'); pageViews.forEach(view => view.classList.add('hidden')); navLinks.forEach(link => link.classList.remove('bg-blue-100')); const targetView = document.getElementById(targetId); const targetLink = document.getElementById(`nav-${targetId.split('-')[1]}`); if (targetView) targetView.classList.remove('hidden'); if (targetLink) targetLink.classList.add('bg-blue-100'); }

// --- PREVIEW UPDATE FUNCTIONS ---
function updatePreviews() {
    // Update Stamp Preview
    const stampUrl = directorStampUrlInput.value;
    stampPreview.src = stampUrl || '';
    stampPreview.classList.toggle('hidden', !stampUrl);

    // Update QR Code Preview
    const qrUrl = qrLinkUrlInput.value.trim();
    qrCodePreviewContainer.innerHTML = ''; // Clear previous QR code
    if (qrUrl) {
        if (qrCodeInstance) {
            qrCodeInstance.clear();
            qrCodeInstance.makeCode(qrUrl);
        } else {
             qrCodeInstance = new QRCode(qrCodePreviewContainer, {
                text: qrUrl,
                width: 120,
                height: 120,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
        }
    }
}

// --- DATA RENDERING & FILTERING ---
function renderList(container, data, renderItemFn, emptyMessage) {
    container.innerHTML = '';
    if (data.length === 0) {
        container.innerHTML = `<p class="text-gray-500 p-4 text-center">${emptyMessage}</p>`;
        return;
    }
    data.forEach(item => {
        const itemEl = renderItemFn(item);
        if (itemEl) container.appendChild(itemEl);
    });
}

function filterAndRenderClasses() {
    const container = document.getElementById('classes-list');
    const selectedYearId = classYearFilter.value;
    const addClassBtn = document.getElementById('add-class-btn');

    if (!selectedYearId) {
        container.innerHTML = `<p class="text-gray-500 p-4 text-center">សូមជ្រើសរើសឆ្នាំសិក្សាដើម្បីបង្ហាញទិន្នន័យ។</p>`;
        addClassBtn.classList.add('hidden');
        return;
    }

    const classesToDisplay = allClassesCache.filter(c => c.academicYearId === selectedYearId);

    if (classesToDisplay.length > 0) {
        addClassBtn.classList.add('hidden');
    } else {
        addClassBtn.classList.remove('hidden');
    }

    const populatedClasses = classesToDisplay.map(c => ({
        ...c,
        yearName: allYearsCache.find(y => y.id === c.academicYearId)?.name || 'N/A',
        teacherName: allTeachersCache.find(t => t.id === c.teacherId)?.name || 'មិនទាន់កំណត់'
    }));
    renderList(container, populatedClasses, renderClassItem, "មិនទាន់មានថ្នាក់រៀនសម្រាប់ឆ្នាំសិក្សានេះ");
}

function filterAndRenderStudents() {
    const selectedYearId = studentYearFilter.value;
    const selectedClassId = studentClassFilter.value;
    const searchTerm = studentSearchInput.value.toLowerCase();
    
    const studentsListContainer = document.getElementById('students-list');

    if (!selectedYearId) {
        studentsListContainer.innerHTML = `<p class="text-gray-500 p-4 text-center">សូមជ្រើសរើសឆ្នាំសិក្សាដើម្បីបង្ហាញទិន្នន័យសិស្ស។</p>`;
        studentStatsContainer.classList.add('hidden');
        studentSearchContainer.classList.add('hidden');
        return;
    }

    studentStatsContainer.classList.remove('hidden');
    studentSearchContainer.classList.remove('hidden');

    let studentsToDisplay = [];

    if (selectedClassId === 'unassigned') {
        const allAssignedStudentIds = new Set(allClassesCache.flatMap(c => c.studentIds || []));
        studentsToDisplay = allStudentsCache.filter(s => !allAssignedStudentIds.has(s.id));
    } else if (selectedClassId) {
        const selectedClass = allClassesCache.find(c => c.id === selectedClassId);
        const studentIdsInClass = selectedClass ? (selectedClass.studentIds || []) : [];
        studentsToDisplay = allStudentsCache.filter(s => studentIdsInClass.includes(s.id));
    } else {
        const classesInYear = allClassesCache.filter(c => c.academicYearId === selectedYearId);
        const studentIdsInYear = new Set(classesInYear.flatMap(c => c.studentIds || []));
        studentsToDisplay = allStudentsCache.filter(s => studentIdsInYear.has(s.id));
    }

    let filteredStudents = studentsToDisplay;

    if (searchTerm) {
        filteredStudents = studentsToDisplay.filter(student => {
            const studentClass = allClassesCache.find(c => c.studentIds?.includes(student.id));
            let className = '';
            if (studentClass) {
                className = studentClass.className.toLowerCase();
            }

            return (
                student.studentId.toLowerCase().includes(searchTerm) ||
                student.name.toLowerCase().includes(searchTerm) ||
                student.gender.toLowerCase().includes(searchTerm) ||
                (student.dob && student.dob.toLowerCase().includes(searchTerm)) ||
                (student.phone && student.phone.toLowerCase().includes(searchTerm)) ||
                className.includes(searchTerm)
            );
        });
    }
    
    // --- STATS CALCULATION & DISPLAY ---
    const total = filteredStudents.length;
    const females = filteredStudents.filter(s => s.gender === 'ស្រី').length;

    document.getElementById('student-stats-total').textContent = total;
    document.getElementById('student-stats-female').textContent = females;

    const statsByClassContainer = document.getElementById('student-stats-by-class');
    statsByClassContainer.innerHTML = '';

    const classesToStat = selectedClassId ? [allClassesCache.find(c => c.id === selectedClassId)] : allClassesCache.filter(c => c.academicYearId === selectedYearId);

    if (classesToStat.length > 0 && selectedClassId !== 'unassigned') {
        classesToStat.forEach(c => {
            if (!c) return;
            const studentsInClass = filteredStudents.filter(s => c.studentIds?.includes(s.id));
            
            if (studentsInClass.length > 0) {
                const femalesInClass = studentsInClass.filter(s => s.gender === 'ស្រី').length;
                const statHtml = `
                    <span class="font-medium mr-3">${c.className}: 
                        <span class="font-bold">${studentsInClass.length}</span> នាក់ 
                        (<span class="text-pink-500">ស្រី ${femalesInClass}</span>)
                    </span>`;
                statsByClassContainer.insertAdjacentHTML('beforeend', statHtml);
            }
        });
    }
    
    if (statsByClassContainer.innerHTML === '') {
        statsByClassContainer.innerHTML = '<span class="text-gray-400">គ្មានទិន្នន័យ</span>';
    }

    renderStudentTable(studentsListContainer, filteredStudents, "រកមិនឃើញសិស្សដែលត្រូវនឹងការស្វែងរកទេ។");
}

function filterAndRenderSubjects() {
    const container = document.getElementById('subjects-list');
    const selectedYearId = subjectYearFilter.value;
    const addSubjectBtn = document.getElementById('add-subject-btn');

    if (!selectedYearId) {
        container.innerHTML = `<p class="text-gray-500 p-4 text-center">សូមជ្រើសរើសឆ្នាំសិក្សាដើម្បីបង្ហាញមុខវិជ្ជា។</p>`;
        addSubjectBtn.classList.add('hidden'); 
        return;
    }
    
    addSubjectBtn.classList.remove('hidden'); 

    const subjectsToDisplay = allSubjectsCache.filter(s => s.academicYearId === selectedYearId);
    renderList(container, subjectsToDisplay.sort((a, b) => (a.order || 0) - (b.order || 0)), renderSubjectItem, "មិនទាន់មានមុខវិជ្ជាសម្រាប់ឆ្នាំសិក្សានេះ");
}

function populateYearFilterDropdown() {
    const sortedYears = [...allYearsCache].sort((a,b) => b.startYear - a.startYear);
    const yearOptionsHtml = '<option value="">-- សូមជ្រើសរើសឆ្នាំសិក្សា --</option>' + sortedYears.map(year => `<option value="${year.id}">${year.name}</option>`).join('');
    
    studentYearFilter.innerHTML = yearOptionsHtml;
    settingsYearSelect.innerHTML = yearOptionsHtml;
    scoresYearFilter.innerHTML = yearOptionsHtml;
    rankingsYearFilter.innerHTML = yearOptionsHtml;
    subjectYearFilter.innerHTML = yearOptionsHtml; 
    chartYearFilter.innerHTML = yearOptionsHtml;
}

function populateClassYearFilter() {
    classYearFilter.innerHTML = ''; // Clear existing options
    const sortedYears = [...allYearsCache].sort((a,b) => b.startYear - a.startYear);
    if (sortedYears.length === 0) {
         classYearFilter.innerHTML = '<option value="">មិនមានឆ្នាំសិក្សា</option>';
         return;
    }
    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year.id;
        option.textContent = year.name;
        classYearFilter.appendChild(option);
    });
    // The default selection will be handled by setDefaultFilters()
}

/**
 * Sets the default year on all relevant filter dropdowns.
 * Automatically selects the latest academic year and triggers change events
 * to update dependent dropdowns.
 */
function setDefaultFilters() {
    if (allYearsCache.length === 0) return;

    // The cache is already sorted descending in subscribeToYears
    const latestYearId = allYearsCache[0].id;

    // List of year filter elements to update automatically
    const yearFiltersToAutoSelect = [
        chartYearFilter,
        classYearFilter,
        studentYearFilter,
        subjectYearFilter,
        settingsYearSelect,
    ];

    yearFiltersToAutoSelect.forEach(filterElement => {
        if (filterElement) {
            if (filterElement.querySelector(`option[value="${latestYearId}"]`)) {
                filterElement.value = latestYearId;
                filterElement.dispatchEvent(new Event('change'));
            }
        }
    });

    // Explicitly reset Scores and Rankings pages to placeholder
    if (scoresYearFilter) {
        scoresYearFilter.value = "";
        scoresYearFilter.dispatchEvent(new Event('change'));
    }
    if (rankingsYearFilter) {
        rankingsYearFilter.value = "";
        rankingsYearFilter.dispatchEvent(new Event('change'));
    }
}


function populateClassFilterDropdown() {
    const selectedYearId = studentYearFilter.value;
    studentClassFilter.innerHTML = '<option value="">-- ថ្នាក់ទាំងអស់ --</option><option value="unassigned" class="text-red-600 font-medium">-- សិស្សមិនបានចាត់ថ្នាក់ --</option>';

    if (selectedYearId) {
        const classesInYear = allClassesCache
            .filter(c => c.academicYearId === selectedYearId)
            .sort((a, b) => a.className.localeCompare(b.className));
        
        classesInYear.forEach(c => {
            studentClassFilter.innerHTML += `<option value="${c.id}">${c.className}</option>`;
        });
    }
}

function populateMonthDropdowns() {
    const monthSelects = document.querySelectorAll('select.semester-month-input');
    const monthOptions = khmerMonths.map(month => `<option value="${month}">${month || '-- សូមជ្រើសរើសខែ --'}</option>`).join('');
    monthSelects.forEach(select => {
        select.innerHTML = monthOptions;
    });
}

// --- Chart Rendering Function ---
function renderStudentGenderChart() {
    const selectedYearId = chartYearFilter.value;
    
    if (studentGenderChart) {
        studentGenderChart.destroy(); // Destroy previous chart instance
    }

    if (!selectedYearId || allStudentsCache.length === 0) {
        if (studentGenderChartCanvas.getContext) {
            studentGenderChartCanvas.getContext('2d').clearRect(0, 0, studentGenderChartCanvas.width, studentGenderChartCanvas.height);
        }
        return;
    }

    const classesInYear = allClassesCache.filter(c => c.academicYearId === selectedYearId);
    const studentIdsInYear = new Set(classesInYear.flatMap(c => c.studentIds || []));
    const studentsInYear = allStudentsCache.filter(s => studentIdsInYear.has(s.id));

    const maleCount = studentsInYear.filter(s => s.gender === 'ប្រុស').length;
    const femaleCount = studentsInYear.filter(s => s.gender === 'ស្រី').length;

    const ctx = studentGenderChartCanvas.getContext('2d');
    studentGenderChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['សិស្សប្រុស', 'សិស្សស្រី'],
            datasets: [{
                label: 'ចំនួនសិស្ស',
                data: [maleCount, femaleCount],
                backgroundColor: [
                    'rgba(54, 162, 235, 0.8)', // Blue
                    'rgba(255, 99, 132, 0.8)',  // Pink
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 99, 132, 1)',
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            family: "'Noto Sans Khmer', sans-serif",
                            size: 14
                        }
                    }
                }
            }
        }
    });
}

// --- DATA SUBSCRIPTIONS & UI UPDATES ---
function subscribeToSettings() {
    const settingsRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'general');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
        if (doc.exists()) {
            schoolSettingsCache = doc.data();
            const schoolName = schoolSettingsCache.schoolName || 'ប្រព័ន្ធគ្រប់គ្រងសាលារៀន';
            appTitle.textContent = schoolName;
            loginSchoolName.textContent = schoolName;
            sidebarSchoolName.textContent = "គ្រប់គ្រងបន្ទុកថ្នាក់ " + (schoolSettingsCache.schoolName || 'សាលា');
            schoolNameInput.value = schoolSettingsCache.schoolName || '';
            directorStampUrlInput.value = schoolSettingsCache.directorStampUrl || '';
            qrLinkUrlInput.value = schoolSettingsCache.qrLinkUrl || '';
        } else {
            appTitle.textContent = 'ប្រព័ន្ធគ្រប់គ្រងសាលារៀន';
            loginSchoolName.textContent = 'ប្រព័ន្ធគ្រប់គ្រងសាលារៀន';
            sidebarSchoolName.textContent = 'គ្រប់គ្រងសាលា';
            schoolNameInput.value = '';
            directorStampUrlInput.value = '';
            qrLinkUrlInput.value = '';
        }
        updatePreviews(); // Update previews after loading data
    });
    unsubscribeListeners.push(unsubscribe);
}

function subscribeToYears() {
    const container = document.getElementById('years-list');
    const collectionRef = collection(db, `artifacts/${appId}/users/${userId}/academic_years`);
    const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
        allYearsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        document.getElementById('stats-years').textContent = allYearsCache.length;
        
        // Sort here once for consistency across the app
        allYearsCache.sort((a,b) => b.startYear - a.startYear);

        renderList(container, allYearsCache, renderYearItem, "មិនទាន់មានឆ្នាំសិក្សា");
        
        // Populate all dropdowns with options first
        populateYearFilterDropdown();
        populateClassYearFilter();
        
        // NOW, set the default selections and trigger updates
        setDefaultFilters();
    });
    unsubscribeListeners.push(unsubscribe);
}

function subscribeToTeachers() {
    const container = document.getElementById('teachers-list');
    const collectionRef = collection(db, `artifacts/${appId}/users/${userId}/teachers`);
    const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
        allTeachersCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        document.getElementById('stats-teachers').textContent = allTeachersCache.length;
        renderList(container, allTeachersCache, renderTeacherItem, "មិនទាន់មានទិន្នន័យគ្រូ");
    });
    unsubscribeListeners.push(unsubscribe);
}

function subscribeToStudents() {
    const collectionRef = collection(db, `artifacts/${appId}/users/${userId}/students`);
    const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
        allStudentsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        document.getElementById('stats-students').textContent = allStudentsCache.length;
        filterAndRenderStudents();
        renderStudentGenderChart(); // Update chart when students data changes
    });
    unsubscribeListeners.push(unsubscribe);
}

function subscribeToSubjects() {
    const collectionRef = collection(db, `artifacts/${appId}/users/${userId}/subjects`);
    const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
        allSubjectsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filterAndRenderSubjects(); 
    });
    unsubscribeListeners.push(unsubscribe);
}

function subscribeToClasses() {
    const collectionRef = collection(db, `artifacts/${appId}/users/${userId}/classes`);
    const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
        allClassesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        document.getElementById('stats-classes').textContent = allClassesCache.length;
        filterAndRenderClasses();
        populateClassFilterDropdown();
        filterAndRenderStudents();
        renderStudentGenderChart(); // Update chart when class data changes
    });
    unsubscribeListeners.push(unsubscribe);
}

// --- ITEM RENDERERS (with EDIT functionality) ---
function renderYearItem(year) {
    const div = document.createElement('div');
    div.className = 'flex justify-between items-center p-3 border-b hover:bg-gray-50';
    div.innerHTML = `<span class="font-bold text-lg">${year.name}</span>
                     <div>
                        <button class="edit-btn text-blue-500 hover:text-blue-700 mr-2"><i class="fas fa-edit"></i></button>
                        <button class="delete-btn text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
                     </div>`;
    div.querySelector('.edit-btn').addEventListener('click', () => openYearModal(year));
    div.querySelector('.delete-btn').addEventListener('click', () => {
        const modalId = 'delete-confirm-modal';
        const title = 'បញ្ជាក់ការលុប';
        const content = `<p>តើអ្នកពិតជាចង់លុបឆ្នាំសិក្សា <strong>${year.name}</strong> មែនទេ? ការលុបនេះនឹងលុបថ្នាក់ និងទិន្នន័យពិន្ទុទាំងអស់ដែលពាក់ព័ន្ធ។</p>`;
        const footer = `
            <button id="cancel-delete-btn" class="bg-gray-300 text-black px-4 py-2 rounded-lg mr-2">បោះបង់</button>
            <button id="confirm-delete-btn" class="bg-red-600 text-white px-4 py-2 rounded-lg">យល់ព្រមលុប</button>
        `;

        createModal(modalId, title, content, footer);
        openModal(modalId);

        document.getElementById('confirm-delete-btn').onclick = async () => {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/academic_years`, year.id));
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

function renderTeacherItem(teacher) {
    const div = document.createElement('div');
    div.className = 'bg-white rounded-lg shadow p-4 flex flex-col items-center text-center';
    const placeholderImg = `https://placehold.co/100x100/EBF4FF/7F9CF5?text=${teacher.name.charAt(0)}`;
    div.innerHTML = `<img src="${teacher.photoUrl || placeholderImg}" onerror="this.onerror=null;this.src='${placeholderImg}';" alt="${teacher.name}" class="w-24 h-24 rounded-full object-cover mb-4"><h4 class="font-bold text-lg">${teacher.name}</h4><p class="text-gray-600">${teacher.gender}</p><p class="text-gray-500 text-sm">${teacher.phone || 'N/A'}</p><div class="mt-4"><button class="edit-btn text-blue-500 hover:text-blue-700 mr-2"><i class="fas fa-edit"></i></button><button class="delete-btn text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button></div>`;
    div.querySelector('.edit-btn').addEventListener('click', () => openTeacherModal(teacher));
    div.querySelector('.delete-btn').addEventListener('click', () => {
         const modalId = 'delete-confirm-modal';
        const title = 'បញ្ជាក់ការលុប';
        const content = `<p>តើអ្នកពិតជាចង់លុបគ្រូ <strong>${teacher.name}</strong> មែនទេ?</p>`;
        const footer = `<button id="cancel-delete-btn" class="bg-gray-300 text-black px-4 py-2 rounded-lg mr-2">បោះបង់</button><button id="confirm-delete-btn" class="bg-red-600 text-white px-4 py-2 rounded-lg">យល់ព្រមលុប</button>`;
        createModal(modalId, title, content, footer);
        openModal(modalId);
        document.getElementById('confirm-delete-btn').onclick = async () => {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/teachers`, teacher.id));
            showToast('បានលុបគ្រូ');
            closeModal(modalId);
        };
        document.getElementById('cancel-delete-btn').onclick = () => closeModal(modalId);
    });
    return div;
}

function renderStudentTable(container, data, emptyMessage) {
    container.innerHTML = '';
    if (data.length === 0) {
        container.innerHTML = `<p class="text-gray-500 p-4 text-center">${emptyMessage}</p>`;
        return;
    }
    const table = document.createElement('table');
    table.className = 'w-full text-sm text-left';
    table.innerHTML = `<thead class="text-xs text-gray-700 uppercase bg-gray-50"><tr><th class="p-3">ល.រ</th><th class="p-3">អត្តលេខសិស្ស</th><th class="p-3">ឈ្មោះ</th><th class="p-3">ភេទ</th><th class="p-3">ថ្នាក់/ឆ្នាំសិក្សា</th><th class="p-3">ថ្ងៃខែឆ្នាំកំណើត</th><th class="p-3">ទូរស័ព្ទ</th><th class="p-3"></th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    data.forEach((student, index) => tbody.appendChild(renderStudentItem(student, index)));
    container.appendChild(table);
}

function renderStudentItem(student, index) {
    const tr = document.createElement('tr');
    tr.className = 'border-b hover:bg-gray-50';
    
    const studentClass = allClassesCache.find(c => c.studentIds?.includes(student.id));
    let classInfo = '<span class="text-gray-400">មិនបានចាត់ថ្នាក់</span>';
    if (studentClass) {
        const yearInfo = allYearsCache.find(y => y.id === studentClass.academicYearId);
        const yearName = yearInfo ? yearInfo.name : '';
        classInfo = `<span class="font-medium text-green-700">ថ្នាក់ទី ${studentClass.className}</span> <span class="text-sm text-gray-500">(${yearName})</span>`;
    }

    const placeholderImg = `https://placehold.co/40x40/EBF4FF/7F9CF5?text=${student.name.charAt(0)}`;
    tr.innerHTML = `
        <td class="p-3">${index + 1}</td>
        <td class="p-3 font-mono">${student.studentId}</td>
        <td class="p-3 flex items-center">
            <img src="${student.photoUrl || placeholderImg}" onerror="this.onerror=null;this.src='${placeholderImg}';" alt="${student.name}" class="w-10 h-10 rounded-full object-cover mr-3">
            <span class="font-medium">${student.name}</span>
        </td>
        <td class="p-3">${student.gender}</td>
        <td class="p-3">${classInfo}</td>
        <td class="p-3">${student.dob || 'N/A'}</td>
        <td class="p-3">${student.phone || 'N/A'}</td>
        <td class="p-3 text-right">
            <button class="edit-btn text-blue-500 hover:text-blue-700 mr-2"><i class="fas fa-edit"></i></button>
            <button class="delete-btn text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
        </td>`;
    tr.querySelector('.edit-btn').addEventListener('click', () => openStudentModal(student));
    tr.querySelector('.delete-btn').addEventListener('click', () => {
        const modalId = 'delete-confirm-modal';
        const title = 'បញ្ជាក់ការលុបសិស្ស';
        const content = `<p>តើអ្នកពិតជាចង់លុបសិស្ស <strong>${student.name}</strong> មែនទេ?</p>
                         <p class="mt-2 text-sm text-red-600">
                            <strong>ចំណាំ៖</strong> ទិន្នន័យពិន្ទុទាំងអស់របស់សិស្សនេះនឹងត្រូវបានលុបជាអចិន្ត្រៃយ៍ផងដែរ។
                         </p>`;
        const footer = `<button id="cancel-delete-btn" class="bg-gray-300 text-black px-4 py-2 rounded-lg mr-2">បោះបង់</button><button id="confirm-delete-btn" class="bg-red-600 text-white px-4 py-2 rounded-lg">យល់ព្រមលុប</button>`;
        createModal(modalId, title, content, footer);
        openModal(modalId);

        document.getElementById('confirm-delete-btn').onclick = async () => {
            try {
                const studentId = student.id;
                const studentClass = allClassesCache.find(c => c.studentIds?.includes(studentId));

                const batch = writeBatch(db);

                const studentDocRef = doc(db, `artifacts/${appId}/users/${userId}/students`, studentId);
                batch.delete(studentDocRef);

                if (studentClass) {
                    const classId = studentClass.id;
                    const scoreDocRef = doc(db, `artifacts/${appId}/users/${userId}/classes/${classId}/scores`, studentId);
                    batch.delete(scoreDocRef);
                    
                    const classDocRef = doc(db, `artifacts/${appId}/users/${userId}/classes`, classId);
                    batch.update(classDocRef, { studentIds: arrayRemove(studentId) });
                }

                await batch.commit();
                
                showToast(`បានលុបសិស្ស ${student.name} និងទិន្នន័យពាក់ព័ន្ធ`);
            } catch (error) {
                console.error("Error deleting student and their data:", error);
                showToast('ការលុបសិស្សមានបញ្ហា', true);
            } finally {
                closeModal(modalId);
            }
        };
        document.getElementById('cancel-delete-btn').onclick = () => closeModal(modalId);
    });
    return tr;
}

function renderSubjectItem(subject) {
    const div = document.createElement('div');
    div.className = 'flex justify-between items-center p-3 border-b hover:bg-gray-50';
    div.innerHTML = `<div>
                        <span class="font-bold text-gray-600 mr-3">${subject.order}.</span>
                        <span class="font-medium">${subject.name}</span>
                        <span class="text-sm text-gray-500 ml-2">(ពិន្ទុ: ${subject.maxScore || 'N/A'}, មេគុណ: ${subject.coefficient || 'N/A'})</span>
                     </div>
                     <div>
                        <button class="edit-btn text-blue-500 hover:text-blue-700 mr-2"><i class="fas fa-edit"></i></button>
                        <button class="delete-btn text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
                     </div>`;
    div.querySelector('.edit-btn').addEventListener('click', () => openSubjectModal(subject));
    div.querySelector('.delete-btn').addEventListener('click', () => {
        const modalId = 'delete-confirm-modal';
        const title = 'បញ្ជាក់ការលុប';
        const content = `<p>តើអ្នកពិតជាចង់លុបមុខវិជ្ជា <strong>${subject.name}</strong> មែនទេ?</p>`;
        const footer = `<button id="cancel-delete-btn" class="bg-gray-300 text-black px-4 py-2 rounded-lg mr-2">បោះបង់</button><button id="confirm-delete-btn" class="bg-red-600 text-white px-4 py-2 rounded-lg">យល់ព្រមលុប</button>`;
        createModal(modalId, title, content, footer);
        openModal(modalId);
        document.getElementById('confirm-delete-btn').onclick = async () => {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/subjects`, subject.id));
            showToast('បានលុបមុខវិជ្ជា');
            closeModal(modalId);
        };
        document.getElementById('cancel-delete-btn').onclick = () => closeModal(modalId);
    });
    return div;
}

function renderClassItem(classData) {
    const div = document.createElement('div');
    div.className = 'bg-white rounded-lg shadow-sm p-4 mb-4';
    div.innerHTML = `<div class="flex justify-between items-start">
                        <div>
                            <h3 class="font-bold text-xl text-green-700">ថ្នាក់ទី ${classData.className}</h3>
                            <p class="text-gray-600">ឆ្នាំសិក្សា: ${classData.yearName}</p>
                            <p class="text-gray-600">គ្រូបន្ទុកថ្នាក់: ${classData.teacherName}</p>
                            <p class="text-gray-600">ចំនួនសិស្ស: ${classData.studentIds?.length || 0} នាក់</p>
                        </div>
                        <div class="flex flex-col items-end space-y-2">
                            <button class="manage-btn w-full bg-blue-500 text-white px-3 py-1 rounded-md text-sm"><i class="fas fa-cog"></i> គ្រប់គ្រងថ្នាក់</button>
                            <div class="flex">
                                <button class="edit-btn text-yellow-500 hover:text-yellow-700 mr-2"><i class="fas fa-edit"></i> កែប្រែ</button>
                                <button class="delete-btn text-red-500 hover:text-red-700"><i class="fas fa-trash"></i> លុប</button>
                            </div>
                        </div>
                    </div>`;
    div.querySelector('.edit-btn').addEventListener('click', () => {
         const fullClassData = allClassesCache.find(c => c.id === classData.id);
         openClassModal(fullClassData);
    });
    div.querySelector('.delete-btn').addEventListener('click', () => {
        const modalId = 'delete-confirm-modal';
        const title = 'បញ្ជាក់ការលុបថ្នាក់';
        const content = `<p>តើអ្នកពិតជាចង់លុបថ្នាក់ <strong>${classData.className}</strong> មែនទេ?</p>
                         <p class="mt-2 text-sm text-red-600">
                            <strong>ចំណាំ៖</strong> ការលុបនេះនឹងលុបទិន្នន័យពិន្ទុទាំងអស់របស់សិស្សក្នុងថ្នាក់នេះជាអចិន្ត្រៃយ៍ ប៉ុន្តែទិន្នន័យសិស្សនឹងនៅដដែល ហើយក្លាយជា "មិនបានចាត់ថ្នាក់"។
                         </p>`;
        const footer = `<button id="cancel-delete-btn" class="bg-gray-300 text-black px-4 py-2 rounded-lg mr-2">បោះបង់</button><button id="confirm-delete-btn" class="bg-red-600 text-white px-4 py-2 rounded-lg">យល់ព្រមលុប</button>`;
        createModal(modalId, title, content, footer);
        openModal(modalId);

        document.getElementById('confirm-delete-btn').onclick = async () => {
            try {
                const classId = classData.id;
                const batch = writeBatch(db);

                const scoresCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/classes/${classId}/scores`);
                const scoresSnapshot = await getDocs(scoresCollectionRef);
                scoresSnapshot.forEach(scoreDoc => {
                    batch.delete(scoreDoc.ref);
                });

                const classDocRef = doc(db, `artifacts/${appId}/users/${userId}/classes`, classId);
                batch.delete(classDocRef);

                await batch.commit();

                showToast(`បានលុបថ្នាក់ ${classData.className} និងទិន្នន័យពិន្ទុពាក់ព័ន្ធ`);
            } catch (error) {
                console.error("Error deleting class and scores:", error);
                showToast('ការលុបថ្នាក់មានបញ្ហា', true);
            } finally {
                closeModal(modalId);
            }
        };
        document.getElementById('cancel-delete-btn').onclick = () => closeModal(modalId);
    });
    div.querySelector('.manage-btn').addEventListener('click', () => {
        const fullClassData = allClassesCache.find(c => c.id === classData.id);
        showClassDetailView({ ...fullClassData, teacherName: classData.teacherName });
    });
    return div;
}

// --- MODAL OPENER FUNCTIONS (with DUPLICATION CHECK) ---
function openYearModal(year = null) {
    if (!userId) return;
    const isEditMode = year !== null;
    const currentYear = new Date().getFullYear();
    const modalId = 'year-modal';
    const title = isEditMode ? 'កែប្រែឆ្នាំសិក្សា' : 'បន្ថែមឆ្នាំសិក្សាថ្មី';
    const content = `<form id="year-form">
        <input type="hidden" id="year-id" value="${isEditMode ? year.id : ''}">
        <div class="mb-4">
            <label for="start-year" class="block mb-2 text-sm font-medium">ឆ្នាំចាប់ផ្តើម</label>
            <input type="number" id="start-year" value="${isEditMode ? year.startYear : currentYear}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" required>
        </div>
        <div class="mb-4">
            <label for="end-year" class="block mb-2 text-sm font-medium">ឆ្នាំបញ្ចប់</label>
            <input type="number" id="end-year" value="${isEditMode ? year.endYear : currentYear + 1}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" required>
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
            if (yearId) {
                await setDoc(doc(db, `artifacts/${appId}/users/${userId}/academic_years`, yearId), yearData);
                showToast('បានកែប្រែឆ្នាំសិក្សា');
            } else {
                await addDoc(collection(db, `artifacts/${appId}/users/${userId}/academic_years`), yearData);
                showToast('បានបន្ថែមឆ្នាំសិក្សាដោយជោគជ័យ');
            }
            closeModal(modalId);
        } else {
            showToast('ទិន្នន័យមិនត្រឹមត្រូវ', true);
        }
    };
}

function openTeacherModal(teacher = null) {
    if (!userId) return;
    const isEditMode = teacher !== null;
    const modalId = 'teacher-modal';
    const title = isEditMode ? 'កែប្រែព័ត៌មានគ្រូ' : 'បន្ថែមគ្រូថ្មី';
    const content = `<form id="teacher-form">
        <input type="hidden" id="teacher-id" value="${isEditMode ? teacher.id : ''}">
        <div class="mb-4"><label for="teacher-name" class="block mb-2 text-sm font-medium">ឈ្មោះគ្រូ</label><input type="text" id="teacher-name" value="${isEditMode ? teacher.name : ''}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" required></div>
        <div class="mb-4"><label for="teacher-gender" class="block mb-2 text-sm font-medium">ភេទ</label><select id="teacher-gender" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"><option value="ប្រុស" ${isEditMode && teacher.gender === 'ប្រុស' ? 'selected' : ''}>ប្រុស</option><option value="ស្រី" ${isEditMode && teacher.gender === 'ស្រី' ? 'selected' : ''}>ស្រី</option></select></div>
        <div class="mb-4"><label for="teacher-phone" class="block mb-2 text-sm font-medium">លេខទូរស័ព្ទ</label><input type="tel" id="teacher-phone" value="${isEditMode ? teacher.phone || '' : ''}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"></div>
        <div class="mb-4"><label for="teacher-photo-url" class="block mb-2 text-sm font-medium">Link រូបថត (URL)</label><input type="url" id="teacher-photo-url" value="${isEditMode ? teacher.photoUrl || '' : ''}" placeholder="https://example.com/photo.jpg" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"></div>
        <div class="mb-4"><label for="teacher-signature-url" class="block mb-2 text-sm font-medium">Link រូបហត្ថលេខ (URL)</label><input type="url" id="teacher-signature-url" value="${isEditMode ? teacher.signatureUrl || '' : ''}" placeholder="https://example.com/signature.png" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"></div>
    </form>`;
    const footer = `<button type="submit" form="teacher-form" class="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600">រក្សាទុក</button>`;
    
    createModal(modalId, title, content, footer);
    openModal(modalId);
    
    document.getElementById('teacher-form').onsubmit = async (e) => {
        e.preventDefault();
        const teacherId = document.getElementById('teacher-id').value;
        const name = document.getElementById('teacher-name').value.trim();
        const gender = document.getElementById('teacher-gender').value;
        const phone = document.getElementById('teacher-phone').value;
        const photoUrl = document.getElementById('teacher-photo-url').value;
        const signatureUrl = document.getElementById('teacher-signature-url').value;
        if (!name) { showToast("សូមបញ្ចូលឈ្មោះគ្រូ", true); return; }

        const isDuplicate = allTeachersCache.some(t => t.name.trim().toLowerCase() === name.toLowerCase() && t.id !== teacherId);
        if (isDuplicate) {
            showToast('ឈ្មោះគ្រូនេះមានរួចហើយ។', true);
            return;
        }

        const teacherData = { name, gender, phone, photoUrl: photoUrl || '', signatureUrl: signatureUrl || '' };
        if (teacherId) {
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/teachers`, teacherId), teacherData);
            showToast('បានកែប្រែព័ត៌មានគ្រូ');
        } else {
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/teachers`), teacherData);
            showToast('បានបន្ថែមគ្រូថ្មីដោយជោគជ័យ');
        }
        closeModal(modalId);
    };
}

function openStudentModal(student = null) {
    if (!userId) return;
    const isEditMode = student !== null;
    const modalId = 'student-modal';
    const title = isEditMode ? 'កែប្រែព័ត៌មានសិស្ស' : 'បន្ថែមសិស្សថ្មី';
    const selectedYearId = studentYearFilter.value;

    let currentClassId = null;
    if (isEditMode) {
        const currentClass = allClassesCache.find(c => c.studentIds?.includes(student.id));
        if (currentClass) {
            currentClassId = currentClass.id;
        }
    }

    const classesForSelectedYear = allClassesCache.filter(c => c.academicYearId === selectedYearId);
    const classOptions = classesForSelectedYear.map(c => 
        `<option value="${c.id}" ${currentClassId === c.id ? 'selected' : ''}>ថ្នាក់ទី ${c.className}</option>`
    ).join('');
    
    const classSelectorHtml = `
        <div class="mb-4 col-span-2">
            <label for="student-class-select" class="block mb-2 text-sm font-medium">${isEditMode ? 'ផ្លាស់ប្តូរថ្នាក់' : 'ជ្រើសរើសថ្នាក់ដើម្បីបង្កើតអត្តលេខ'}</label>
            <select id="student-class-select" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5">
                <option value="">-- មិនបានចាត់ថ្នាក់ --</option>
                ${classOptions}
            </select>
        </div>`;

    const femaleAvatar = 'https://i.ibb.co/pBsS6BrR/graduating-student.png';
    const maleAvatar = 'https://i.ibb.co/JwpwpdDW/student-1.png';

    const content = `<form id="student-form">
        <input type="hidden" id="student-doc-id" value="${isEditMode ? student.id : ''}">
        ${classSelectorHtml}
        <div class="grid grid-cols-2 gap-4">
            <div class="mb-4"><label for="student-id" class="block mb-2 text-sm font-medium">អត្តលេខសិស្ស</label><input type="text" id="student-id" value="${isEditMode ? student.studentId : ''}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" required></div>
            <div class="mb-4"><label for="student-name" class="block mb-2 text-sm font-medium">ឈ្មោះសិស្ស</label><input type="text" id="student-name" value="${isEditMode ? student.name : ''}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" required></div>
            <div class="mb-4"><label for="student-gender" class="block mb-2 text-sm font-medium">ភេទ</label><select id="student-gender-select" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"><option value="ប្រុស" ${isEditMode && student.gender === 'ប្រុស' ? 'selected' : ''}>ប្រុស</option><option value="ស្រី" ${isEditMode && student.gender === 'ស្រី' ? 'selected' : ''}>ស្រី</option></select></div>
            <div class="mb-4"><label for="student-dob" class="block mb-2 text-sm font-medium">ថ្ងៃខែឆ្នាំកំណើត</label><input type="date" id="student-dob" value="${isEditMode ? student.dob || '' : ''}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"></div>
            <div class="mb-4 col-span-2"><label for="student-phone" class="block mb-2 text-sm font-medium">លេខទូរស័ព្ទ</label><input type="tel" id="student-phone" value="${isEditMode ? student.phone || '' : ''}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"></div>
            <div class="mb-4 col-span-2">
                <label for="student-photo-url" class="block mb-2 text-sm font-medium">Link រូបថត (URL)</label>
                <div class="relative">
                    <input type="url" id="student-photo-url" value="${isEditMode ? student.photoUrl || '' : ''}" placeholder="https://example.com/photo.jpg" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 pr-10">
                    <button type="button" id="paste-student-photo-btn" class="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-blue-600">
                        <i class="fas fa-paste"></i>
                    </button>
                </div>
            </div>
        </div>
    </form>`;
    const footer = `<button type="submit" form="student-form" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">រក្សាទុក</button>`;
    
    createModal(modalId, title, content, footer);
    openModal(modalId);

    const genderSelect = document.getElementById('student-gender-select');
    const photoUrlInput = document.getElementById('student-photo-url');
    const classSelect = document.getElementById('student-class-select');
    const studentIdInput = document.getElementById('student-id');

    document.getElementById('paste-student-photo-btn').addEventListener('click', () => {
        const targetInput = document.getElementById('student-photo-url');
        targetInput.focus();
        try {
            // Using execCommand is deprecated but avoids the permission prompt.
            document.execCommand('paste');
        } catch (err) {
            console.error('Paste command failed: ', err);
            showToast('ការបិទភ្ជាប់ដោយស្វ័យប្រវត្តិមិនដំណើរការទេ។ សូមប្រើ Ctrl+V។', true);
        }
    });

    if (!isEditMode) {
         classSelect.addEventListener('change', () => {
            const selectedClassId = classSelect.value;
            if (!selectedClassId) {
                studentIdInput.value = '';
                return;
            }
            const selectedClass = allClassesCache.find(c => c.id === selectedClassId);
            const year = allYearsCache.find(y => y.id === selectedClass.academicYearId);
            const yearPrefix = year.startYear.toString().slice(-2);
            const classPrefix = `${selectedClass.className}${yearPrefix}`;

            const studentsInClass = allStudentsCache.filter(s => s.studentId.startsWith(classPrefix));
            let nextNum = 1;
            if (studentsInClass.length > 0) {
                const highestNum = studentsInClass.reduce((max, s) => {
                    const numPart = parseInt(s.studentId.slice(classPrefix.length), 10);
                    return numPart > max ? numPart : max;
                }, 0);
                nextNum = highestNum + 1;
            }
            
            const paddedNum = nextNum.toString().padStart(2, '0');
            studentIdInput.value = `${classPrefix}${paddedNum}`;
        });
    }


    genderSelect.addEventListener('change', (e) => {
        const currentValue = photoUrlInput.value.trim();
        if (currentValue === '' || currentValue === maleAvatar || currentValue === femaleAvatar) {
            if (e.target.value === 'ស្រី') {
                photoUrlInput.value = femaleAvatar;
            } else {
                photoUrlInput.value = maleAvatar;
            }
        }
    });

    if (!isEditMode) {
        genderSelect.dispatchEvent(new Event('change'));
    }

    document.getElementById('student-form').onsubmit = async (e) => {
        e.preventDefault();
        const studentDocId = document.getElementById('student-doc-id').value;
        const studentId = document.getElementById('student-id').value.trim();
        const name = document.getElementById('student-name').value;
        const gender = document.getElementById('student-gender-select').value;
        const dob = document.getElementById('student-dob').value;
        const phone = document.getElementById('student-phone').value;
        const photoUrl = document.getElementById('student-photo-url').value;
        
        if (!studentId || !name) { showToast("សូមបញ្ចូលអត្តលេខ និងឈ្មោះសិស្ស", true); return; }

        const isDuplicate = allStudentsCache.some(s => s.studentId === studentId && s.id !== studentDocId);
        if (isDuplicate) {
            showToast('អត្តលេខសិស្សនេះមានរួចហើយ។', true);
            return;
        }

        const studentData = { studentId, name, gender, dob, phone, photoUrl: photoUrl || '' };
        const newClassId = document.getElementById('student-class-select').value;

        if (studentDocId) { // Edit Mode
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/students`, studentDocId), studentData);
            showToast('បានកែប្រែព័ត៌មានសិស្ស');

            const originalClass = allClassesCache.find(c => c.studentIds?.includes(studentDocId));
            const originalClassId = originalClass ? originalClass.id : null;

            if (newClassId !== originalClassId) {
                if (originalClassId) {
                    const originalClassRef = doc(db, `artifacts/${appId}/users/${userId}/classes`, originalClassId);
                    await updateDoc(originalClassRef, { studentIds: arrayRemove(studentDocId) });
                }
                if (newClassId) {
                    const newClassRef = doc(db, `artifacts/${appId}/users/${userId}/classes`, newClassId);
                    await updateDoc(newClassRef, { studentIds: arrayUnion(newClassId) });
                }
                showToast('បានផ្លាស់ប្តូរថ្នាក់សិស្សเรียบร้อยแล้ว');
            }

        } else { // Add Mode
            const newStudentRef = await addDoc(collection(db, `artifacts/${appId}/users/${userId}/students`), studentData);
            showToast('បានបន្ថែមសិស្សថ្មី');
            if (newClassId) {
                const classDocRef = doc(db, `artifacts/${appId}/users/${userId}/classes`, newClassId);
                await updateDoc(classDocRef, { studentIds: arrayUnion(newStudentRef.id) });
                showToast(`បានបន្ថែមសិស្សទៅក្នុងថ្នាក់ដោយជោគជ័យ`);
            }
        }
        closeModal(modalId);
    };
}

async function openSubjectModal(subject = null) {
    if (!userId) return;
    const isEditMode = subject !== null;
    const modalId = 'subject-modal';
    const title = isEditMode ? 'កែប្រែមុខវិជ្ជា' : 'បន្ថែមមុខវិជ្ជាថ្មី';

    const selectedYearId = subjectYearFilter.value;
    if (!selectedYearId) {
        showToast('សូមជ្រើសរើសឆ្នាំសិក្សាសិន!', true);
        return;
    }

    let nextOrder = '';
    if (!isEditMode) {
        const existingOrders = allSubjectsCache
            .filter(s => s.academicYearId === selectedYearId) 
            .map(s => s.order)
            .filter(o => typeof o === 'number')
            .sort((a, b) => a - b);
        
        let smartOrder = 1;
        for (const order of existingOrders) {
            if (order === smartOrder) {
                smartOrder++;
            } else {
                break;
            }
        }
        nextOrder = smartOrder;
    }

    const classesInYear = allClassesCache.filter(c => c.academicYearId === selectedYearId).sort((a,b) => a.className.localeCompare(b.className));
    let classCheckboxesHtml = '';
    if (classesInYear.length > 0) {
         classCheckboxesHtml = classesInYear.map(c => {
            const isChecked = isEditMode && c.subjectIds?.includes(subject.id);
            return `<label class="flex items-center p-1 hover:bg-gray-100 rounded">
                        <input type="checkbox" value="${c.id}" class="subject-class-checkbox h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" ${isChecked ? 'checked' : ''}>
                        <span class="ml-3 text-sm">${c.className}</span>
                   </label>`;
        }).join('');
    } else {
        classCheckboxesHtml = '<p class="text-sm text-gray-500">មិនមានថ្នាក់សម្រាប់ឆ្នាំសិក្សានេះទេ។</p>';
    }

    const content = `<form id="subject-form">
        <input type="hidden" id="subject-id" value="${isEditMode ? subject.id : ''}">
        <div class="grid grid-cols-3 gap-4">
            <div class="col-span-2">
                <label for="subject-name" class="block mb-2 text-sm font-medium">ឈ្មោះមុខវិជ្ជា</label>
                <input type="text" id="subject-name" value="${isEditMode ? subject.name : ''}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" required>
            </div>
            <div>
                <label for="subject-order" class="block mb-2 text-sm font-medium">លេខរៀង</label>
                <input type="number" id="subject-order" value="${isEditMode ? subject.order : nextOrder}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" required>
            </div>
        </div>
        <div class="grid grid-cols-2 gap-4 mt-4">
            <div>
                <label for="subject-max-score" class="block mb-2 text-sm font-medium">ពិន្ទុអតិបរមា</label>
                <input type="number" id="subject-max-score" value="${isEditMode && subject.maxScore ? subject.maxScore : '100'}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5">
            </div>
            <div>
                <label for="subject-coefficient" class="block mb-2 text-sm font-medium">មេគុណ (ស្វ័យប្រវត្តិ)</label>
                <input type="number" id="subject-coefficient" value="${isEditMode && subject.coefficient ? subject.coefficient : '2'}" class="bg-gray-200 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" readonly>
            </div>
        </div>
        <div class="mt-4">
            <label class="block mb-2 text-sm font-medium">អនុវត្តន៍សម្រាប់ថ្នាក់</label>
            <div id="subject-classes-list" class="max-h-40 overflow-y-auto border p-2 rounded-md">${classCheckboxesHtml}</div>
        </div>
    </form>`;
    const footer = `<button type="submit" form="subject-form" class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">រក្សាទុក</button>`;
    
    createModal(modalId, title, content, footer);
    openModal(modalId);

    const maxScoreInput = document.getElementById('subject-max-score');
    const coefficientInput = document.getElementById('subject-coefficient');

    const calculateCoefficient = () => {
        const maxScore = parseFloat(maxScoreInput.value);
        if (!isNaN(maxScore) && maxScore > 0) {
            coefficientInput.value = maxScore / 50;
        } else {
            coefficientInput.value = '';
        }
    };
    
    calculateCoefficient();
    maxScoreInput.addEventListener('input', calculateCoefficient);
    
    document.getElementById('subject-form').onsubmit = async (e) => {
        e.preventDefault();
        try {
            let subjectId = document.getElementById('subject-id').value;
            const name = document.getElementById('subject-name').value.trim();
            const maxScore = document.getElementById('subject-max-score').value;
            const coefficient = document.getElementById('subject-coefficient').value;
            
            const orderInput = document.getElementById('subject-order').value;
            const order = parseInt(orderInput, 10);

            if (!name || !maxScore || !orderInput) {
                showToast('សូមបញ្ចូលឈ្មោះ, លេខរៀង, និងពិន្ទុអតិបរមា', true);
                return;
            }
            
            if (isNaN(order) || order <= 0) {
                showToast('សូមបញ្ចូលលេខរៀងជាលេខវិជ្ជមាន។', true);
                return;
            }

            const isDuplicateOrder = allSubjectsCache.some(
                s => s.academicYearId === selectedYearId && s.order === order && s.id !== subjectId
            );

            if (isDuplicateOrder) {
                showToast(`លេខរៀង ${order} មានរួចហើយ។ សូមជ្រើសរើសលេខផ្សេង។`, true);
                return;
            }

            const subjectData = { 
                name, 
                maxScore: parseInt(maxScore), 
                coefficient: parseFloat(coefficient),
                order: order,
                academicYearId: selectedYearId 
            };

            if (isEditMode) {
                subjectId = subject.id;
                await setDoc(doc(db, `artifacts/${appId}/users/${userId}/subjects`, subjectId), subjectData);
                showToast('បានកែប្រែមុខវិជ្ជា');
            } else {
                const newDocRef = await addDoc(collection(db, `artifacts/${appId}/users/${userId}/subjects`), subjectData);
                subjectId = newDocRef.id;
                showToast('បានបន្ថែមមុខវិជ្ជា');
            }
            
            const batch = writeBatch(db);
            const newlySelectedClassIds = Array.from(document.querySelectorAll('.subject-class-checkbox:checked')).map(cb => cb.value);
            const allClassIdsInYear = classesInYear.map(c => c.id);

            allClassIdsInYear.forEach(classId => {
                const classRef = doc(db, `artifacts/${appId}/users/${userId}/classes`, classId);
                if (newlySelectedClassIds.includes(classId)) {
                    batch.update(classRef, { subjectIds: arrayUnion(subjectId) });
                } else {
                    batch.update(classRef, { subjectIds: arrayRemove(subjectId) });
                }
            });

            await batch.commit();
            showToast('បានធ្វើបច្ចុប្បន្នភាពមុខវិជ្ជាក្នុងថ្នាក់');
            
            closeModal(modalId);
        } catch (error) {
            console.error("Error saving subject:", error);
            showToast('ការរក្សាទុកមានបញ្ហា សូមពិនិត្យ Console។', true);
        }
    };
}

function openClassModal(classData = null) {
    if (!userId) return;
    const isEditMode = classData !== null;
    const modalId = 'class-modal';
    const title = isEditMode ? 'កែប្រែព័ត៌មានថ្នាក់' : 'បង្កើតថ្នាក់ថ្មី';
    const yearOptions = allYearsCache.map(y => `<option value="${y.id}" ${isEditMode && classData.academicYearId === y.id ? 'selected' : ''}>${y.name}</option>`).join('');
    const teacherOptions = allTeachersCache.map(t => `<option value="${t.id}" ${isEditMode && classData.teacherId === t.id ? 'selected' : ''}>${t.name}</option>`).join('');
    const gradeOptions = Array.from({length: 6}, (_, i) => 7 + i).map(g => `<option value="${g}" ${isEditMode && classData.grade == g ? 'selected' : ''}>${g}</option>`).join('');
    const sectionOptions = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(s => `<option value="${s}" ${isEditMode && classData.section === s ? 'selected' : ''}>${s}</option>`).join('');
    
    const content = `<form id="class-form">
        <input type="hidden" id="class-id" value="${isEditMode ? classData.id : ''}">
        <div class="grid grid-cols-2 gap-4">
            <div><label for="class-year" class="block mb-2 text-sm font-medium">ឆ្នាំសិក្សា</label><select id="class-year" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" required>${yearOptions}</select></div>
            <div><label for="class-teacher" class="block mb-2 text-sm font-medium">គ្រូបន្ទុកថ្នាក់</label><select id="class-teacher" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" required>${teacherOptions}</select></div>
            <div><label for="class-grade" class="block mb-2 text-sm font-medium">កម្រិតថ្នាក់</label><select id="class-grade" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" required>${gradeOptions}</select></div>
            <div><label for="class-section" class="block mb-2 text-sm font-medium">ផ្នែក</label><select id="class-section" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" required>${sectionOptions}</select></div>
        </div>
        <div class="mt-4">
            <label for="class-qr-link" class="block mb-2 text-sm font-medium">QR Link ប្រចាំថ្នាក់</label>
            <input type="url" id="class-qr-link" value="${isEditMode && classData.qrLink ? classData.qrLink : ''}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" placeholder="https://t.me/exampleclass">
        </div>
    </form>`;
    const footer = `<button type="submit" form="class-form" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">${isEditMode ? 'រក្សាទុកការផ្លាស់ប្តូរ' : 'បង្កើតថ្នាក់'}</button>`;
    
    createModal(modalId, title, content, footer);
    openModal(modalId);
    
    document.getElementById('class-form').onsubmit = async (e) => {
        e.preventDefault();
        const classId = document.getElementById('class-id').value;
        const academicYearId = document.getElementById('class-year').value;
        const teacherId = document.getElementById('class-teacher').value;
        const grade = document.getElementById('class-grade').value;
        const section = document.getElementById('class-section').value;
        const qrLink = document.getElementById('class-qr-link').value;

        if (academicYearId && teacherId && grade && section) {
            const isDuplicate = allClassesCache.some(c => 
                c.academicYearId === academicYearId && 
                c.grade == grade && 
                c.section === section && 
                c.id !== classId
            );
            if (isDuplicate) {
                showToast('ថ្នាក់នេះមានរួចហើយសម្រាប់ឆ្នាំសិក្សានេះ។', true);
                return;
            }

            const classUpdateData = { academicYearId, teacherId, grade, section, className: `${grade}${section}`, qrLink: qrLink || '' };
            if (classId) {
                await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/classes`, classId), classUpdateData);
                showToast('បានកែប្រែព័ត៌មានថ្នាក់');
            } else {
                await addDoc(collection(db, `artifacts/${appId}/users/${userId}/classes`), { ...classUpdateData, studentIds: [], subjectIds: [], examMonths: 0 });
                showToast('បានបង្កើតថ្នាក់ថ្មី');
            }
            closeModal(modalId);
        } else {
            showToast('សូមបំពេញគ្រប់ប្រអប់', true);
        }
    };
}

// --- CLASS DETAIL VIEW LOGIC ---
function showClassDetailView(classData) {
    currentClassData = classData;
    mainViewsContainer.classList.add('hidden');
    classDetailContainer.classList.remove('hidden');

    document.getElementById('class-detail-title').textContent = `ថ្នាក់ទី ${classData.className}`;
    document.getElementById('class-detail-teacher').textContent = `គ្រូបន្ទុកថ្នាក់: ${classData.teacherName}`;

    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabContents.forEach(c => c.classList.add('hidden'));
            document.getElementById(`tab-content-${tab.dataset.tab}`).classList.remove('hidden');
        });
    });
    tabs[0].click(); 

    populateClassSettings();
    populateClassStudents();
    setupScoreEntryTab();
}

function populateClassSettings() {
    const subjectsListContainer = document.getElementById('class-subjects-list');
    subjectsListContainer.innerHTML = '';
    
    const relevantSubjects = allSubjectsCache.filter(s => s.academicYearId === currentClassData.academicYearId);
    const sortedSubjects = relevantSubjects.sort((a,b) => (a.order || 0) - (b.order || 0));

    if (sortedSubjects.length === 0) {
        subjectsListContainer.innerHTML = '<p class="text-sm text-gray-500">មិនមានមុខវិជ្ជាសម្រាប់ឆ្នាំសិក្សានេះទេ។ សូមបង្កើតមុខវិជ្ជាជាមុនសិន។</p>';
        return;
    }

    sortedSubjects.forEach(subject => {
        const isChecked = currentClassData.subjectIds?.includes(subject.id);
        const checkboxHtml = `<label class="flex items-center p-2 hover:bg-gray-100 rounded"><input type="checkbox" value="${subject.id}" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" ${isChecked ? 'checked' : ''}><span class="ml-3 text-sm">${subject.order}. ${subject.name}</span></label>`;
        subjectsListContainer.insertAdjacentHTML('beforeend', checkboxHtml);
    });
}

/**
 * Populates the student list for the current class management view.
 * It filters the global student list to only show students who are either:
 * 1. Already assigned to the current class.
 * 2. Not assigned to ANY class within the same academic year, making them available.
 */
function populateClassStudents() {
    const studentsListContainer = document.getElementById('class-students-list');
    studentsListContainer.innerHTML = '';

    // Get the academic year of the current class.
    const currentYearId = currentClassData.academicYearId;
    if (!currentYearId) {
        studentsListContainer.innerHTML = '<p class="text-gray-500 text-sm p-4">មិនអាចកំណត់ឆ្នាំសិក្សាសម្រាប់ថ្នាក់នេះបានទេ។</p>';
        return;
    }

    // Find all student IDs already assigned to ANY class in the CURRENT academic year.
    const assignedStudentIdsInYear = new Set(
        allClassesCache
            .filter(c => c.academicYearId === currentYearId)
            .flatMap(c => c.studentIds || [])
    );

    // Filter the master student list (allStudentsCache).
    // A student is eligible to be shown in the list if:
    // a) They are already a member of the CURRENT class.
    // b) They are not assigned to any other class in this academic year.
    const eligibleStudents = allStudentsCache.filter(student => {
        const isAlreadyInThisClass = currentClassData.studentIds?.includes(student.id);
        const isAssignedToAnyClassInYear = assignedStudentIdsInYear.has(student.id);

        // Show the student if they are already in THIS class,
        // OR if they are not assigned to ANY class in this year at all.
        return isAlreadyInThisClass || !isAssignedToAnyClassInYear;
    });

    if (eligibleStudents.length === 0) {
        studentsListContainer.innerHTML = '<p class="text-sm text-gray-500 text-center p-4">រកមិនឃើញសិស្សដែលទំនេរសម្រាប់ឆ្នាំសិក្សានេះ ឬសិស្សក្នុងថ្នាក់នេះទេ។</p>';
        return;
    }

    // Sort and render the list
    eligibleStudents.sort((a, b) => a.name.localeCompare(b.name, 'km')).forEach(student => {
        const isChecked = currentClassData.studentIds?.includes(student.id);
        const checkboxHtml = `
            <label class="flex items-center p-2 hover:bg-gray-100 rounded">
                <input type="checkbox" value="${student.id}" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" ${isChecked ? 'checked' : ''}>
                <span class="ml-3 text-sm">${student.name} (អត្តលេខ: ${student.studentId})</span>
            </label>`;
        studentsListContainer.insertAdjacentHTML('beforeend', checkboxHtml);
    });
}

async function setupScoreEntryTab() {
    const monthSelect = document.getElementById('score-month-select');
    const scoreEntryContainer = document.getElementById('score-entry-table-container');
    monthSelect.innerHTML = '';

    const yearId = currentClassData.academicYearId;
    if (!yearId) {
        scoreEntryContainer.innerHTML = '<p class="text-gray-500">ថ្នាក់នេះមិនទាន់មានឆ្នាំសិក្សាកំណត់។</p>';
        return;
    }

    const settingsRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, yearId);
    const docSnap = await getDoc(settingsRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        const scoreEntryOptions = [];

        if (data.startOfYearTestName) scoreEntryOptions.push({ key: 'start_year_test', name: data.startOfYearTestName });
        if (data.semester1) {
            for (let i = 1; i <= 6; i++) { if (data.semester1[`month${i}`]) scoreEntryOptions.push({ key: `sem1_month_${i}`, name: data.semester1[`month${i}`] }); }
            if (data.semester1.monthExamName) scoreEntryOptions.push({ key: 'sem1_month_exam', name: data.semester1.monthExamName });
            if (data.semester1.examName) scoreEntryOptions.push({ key: 'sem1_exam', name: data.semester1.examName });
            if (data.semester1.reportName) scoreEntryOptions.push({ key: 'sem1_report', name: data.semester1.reportName });
        }
        if (data.semester2) {
            for (let i = 1; i <= 6; i++) { if (data.semester2[`month${i}`]) scoreEntryOptions.push({ key: `sem2_month_${i}`, name: data.semester2[`month${i}`] }); }
            if (data.semester2.monthExamName) scoreEntryOptions.push({ key: 'sem2_month_exam', name: data.semester2.monthExamName });
            if (data.semester2.examName) scoreEntryOptions.push({ key: 'sem2_exam', name: data.semester2.examName });
            if (data.semester2.reportName) scoreEntryOptions.push({ key: 'sem2_report', name: data.semester2.reportName });
        }
        if (data.endOfYearResultName) scoreEntryOptions.push({ key: 'end_year_result', name: data.endOfYearResultName });

        if (scoreEntryOptions.length > 0) {
            monthSelect.innerHTML = scoreEntryOptions.map(opt => `<option value="${opt.key}">${opt.name}</option>`).join('');
            monthSelect.removeEventListener('change', generateScoreTable);
            monthSelect.addEventListener('change', generateScoreTable);
            monthSelect.dispatchEvent(new Event('change'));
        } else {
            scoreEntryContainer.innerHTML = '<p class="text-gray-500">សូមកំណត់ខែ/ការប្រឡងសម្រាប់បញ្ចូលពិន្ទុក្នុងផ្ទាំង "កំណត់" ជាមុនសិន។</p>';
        }
    } else {
        scoreEntryContainer.innerHTML = '<p class="text-gray-500">មិនទាន់មានការកំណត់ឆមាសសម្រាប់ឆ្នាំសិក្សានេះទេ។</p>';
    }
}

async function generateScoreTable() {
    const container = document.getElementById('score-entry-table-container');
    const selectedKey = document.getElementById('score-month-select').value;
    
    const assignedSubjectIds = currentClassData.subjectIds || [];
    const assignedSubjects = allSubjectsCache.filter(s => assignedSubjectIds.includes(s.id)).sort((a,b) => (a.order || 0) - (b.order || 0));
    const assignedStudentIds = currentClassData.studentIds || [];
    const assignedStudents = allStudentsCache.filter(s => assignedStudentIds.includes(s.id)).sort((a,b) => a.name.localeCompare(b.name, 'km'));

    if (assignedStudents.length === 0 || assignedSubjects.length === 0) {
        container.innerHTML = '<p class="text-gray-500">សូមបន្ថែមសិស្ស និងមុខវិជ្ជាទៅក្នុងថ្នាក់នេះជាមុនសិន។</p>';
        return;
    }

    const scorePromises = assignedStudents.map(student => getDoc(doc(db, `artifacts/${appId}/users/${userId}/classes/${currentClassData.id}/scores`, student.id)));
    const scoreSnapshots = await Promise.all(scorePromises);
    const studentScoresMap = scoreSnapshots.reduce((acc, snap) => {
        if (snap.exists()) {
            acc[snap.id] = snap.data();
        }
        return acc;
    }, {});

    let tableHtml = '<table class="min-w-full divide-y divide-gray-200"><thead><tr><th class="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ឈ្មោះសិស្ស</th>';
    assignedSubjects.forEach(subject => {
        tableHtml += `<th class="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${subject.name}</th>`;
    });
    tableHtml += '</tr></thead><tbody class="bg-white divide-y divide-gray-200">';

    assignedStudents.forEach(student => {
        tableHtml += `<tr data-student-id="${student.id}"><td>${student.name}</td>`;
        assignedSubjects.forEach(subject => {
            const examData = studentScoresMap[student.id]?.[selectedKey] || {};
            const scoresData = examData.scores !== undefined ? examData.scores : examData;
            const existingScore = scoresData[subject.id] || '';
            tableHtml += `<td><input type="number" class="score-input w-20 border-gray-300 rounded-md" data-subject-id="${subject.id}" value="${existingScore}"></td>`;
        });
        tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table>';
    container.innerHTML = tableHtml;
}

// --- NEW SCORES PAGE LOGIC ---

function setupScoresPageView() {
    scoresYearFilter.addEventListener('change', () => {
        const yearId = scoresYearFilter.value;
        // Clear dependent dropdowns
        scoresClassFilter.innerHTML = '<option value="">-- សូមជ្រើសរើសថ្នាក់ --</option>';
        scoresExamFilter.innerHTML = '<option value="">-- សូមជ្រើសរើសការប្រឡង --</option>';
        scoresPageTableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">សូមជ្រើសរើសថ្នាក់ និងការប្រឡង។</p>';
        saveScoresPageBtn.classList.add('hidden');

        if (yearId) {
            const classesInYear = allClassesCache
                .filter(c => c.academicYearId === yearId)
                .sort((a, b) => a.className.localeCompare(b.className));
            
            classesInYear.forEach(c => {
                scoresClassFilter.innerHTML += `<option value="${c.id}">${c.className}</option>`;
            });

            // Automatically select the first class if available
            if (classesInYear.length > 0) {
                scoresClassFilter.value = classesInYear[0].id;
                scoresClassFilter.dispatchEvent(new Event('change'));
            }
        }
    });

    scoresClassFilter.addEventListener('change', async () => {
        const yearId = scoresYearFilter.value;
        const classId = scoresClassFilter.value;
        // Clear dependent dropdown
        scoresExamFilter.innerHTML = '<option value="">-- សូមជ្រើសរើសការប្រឡង --</option>';
        scoresPageTableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">សូមជ្រើសរើសការប្រឡង។</p>';
        saveScoresPageBtn.classList.add('hidden');

        if (yearId && classId) {
            const settingsRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, yearId);
            const docSnap = await getDoc(settingsRef);
            let scoreEntryOptions = [];
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.startOfYearTestName) scoreEntryOptions.push({ key: 'start_year_test', name: data.startOfYearTestName });
                if (data.semester1) {
                    for (let i = 1; i <= 6; i++) { if (data.semester1[`month${i}`]) scoreEntryOptions.push({ key: `sem1_month_${i}`, name: data.semester1[`month${i}`] }); }
                    if (data.semester1.monthExamName) scoreEntryOptions.push({ key: 'sem1_month_exam', name: data.semester1.monthExamName });
                    if (data.semester1.examName) scoreEntryOptions.push({ key: 'sem1_exam', name: data.semester1.examName });
                    if (data.semester1.reportName) scoreEntryOptions.push({ key: 'sem1_report', name: data.semester1.reportName });
                }
                if (data.semester2) {
                    for (let i = 1; i <= 6; i++) { if (data.semester2[`month${i}`]) scoreEntryOptions.push({ key: `sem2_month_${i}`, name: data.semester2[`month${i}`] }); }
                    if (data.semester2.monthExamName) scoreEntryOptions.push({ key: 'sem2_month_exam', name: data.semester2.monthExamName });
                    if (data.semester2.examName) scoreEntryOptions.push({ key: 'sem2_exam', name: data.semester2.examName });
                    if (data.semester2.reportName) scoreEntryOptions.push({ key: 'sem2_report', name: data.semester2.reportName });
                }
                if (data.endOfYearResultName) scoreEntryOptions.push({ key: 'end_year_result', name: data.endOfYearResultName });
                
                scoresExamFilter.innerHTML += scoreEntryOptions.map(opt => `<option value="${opt.key}">${opt.name}</option>`).join('');
            }
            
            // Automatically select the first exam if available
            if (scoreEntryOptions.length > 0) {
                scoresExamFilter.value = scoreEntryOptions[0].key;
                scoresExamFilter.dispatchEvent(new Event('change'));
            }
        }
    });

    scoresExamFilter.addEventListener('change', generateScoresPageTable);

    scoresPageTableContainer.addEventListener('keydown', (e) => {
        if (!e.target.matches('input.score-input, input.absence-input')) return;

        // Prevent default for up/down arrows to stop value change
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
        }

        const currentRow = parseInt(e.target.dataset.row);
        const currentCol = parseInt(e.target.dataset.col);
        let nextRow = currentRow;
        let nextCol = currentCol;

        switch (e.key) {
            case 'Enter':
            case 'ArrowDown':
                nextRow++;
                break;
            case 'ArrowUp':
                nextRow--;
                break;
            case 'ArrowLeft':
                nextCol--;
                break;
            case 'ArrowRight':
                nextCol++;
                break;
            default:
                return; // Not a navigation key, do nothing
        }
        
        e.preventDefault(); // Prevent default for all handled navigation keys

        const nextInput = scoresPageTableContainer.querySelector(`input[data-row="${nextRow}"][data-col="${nextCol}"]`);
        if (nextInput) {
            nextInput.focus();
            nextInput.select();
        }
    });

    scoresPageTableContainer.addEventListener('input', (e) => {
        const input = e.target;
        if (input.matches('input.score-input, input.absence-input')) {
            // Limit to 3 digits
            if (input.value.length > 3) {
                input.value = input.value.slice(0, 3);
            }
            
            updateStudentScoreSummary(input.dataset.studentId);
        }
    });

    saveScoresPageBtn.addEventListener('click', async () => {
        const classId = scoresClassFilter.value;
        const selectedKey = scoresExamFilter.value;
        if (!classId || !selectedKey) {
            showToast('មានបញ្ហា សូមព្យាយាមម្តងទៀត', true);
            return;
        }

        const batch = writeBatch(db);
        const scoreRows = scoresPageTableContainer.querySelectorAll('tr[data-student-id]');
        
        for (const row of scoreRows) {
            const studentId = row.dataset.studentId;
            const scoreDocRef = doc(db, `artifacts/${appId}/users/${userId}/classes/${classId}/scores`, studentId);
            
            const scoresForMonth = {};
            const attendance = {};
            
            row.querySelectorAll('.score-input').forEach(input => {
                const subjectId = input.dataset.subjectId;
                const scoreValue = input.value;
                if (scoreValue !== '') scoresForMonth[subjectId] = parseFloat(scoreValue);
            });

            const absenceP = row.querySelector('input.absence-input[data-type="p"]');
            const absenceUp = row.querySelector('input.absence-input[data-type="up"]');
            if (absenceP.value) attendance.withPermission = parseInt(absenceP.value);
            if (absenceUp.value) attendance.withoutPermission = parseInt(absenceUp.value);

            const updatePayload = {};
            updatePayload[selectedKey] = {
                scores: scoresForMonth,
                attendance: attendance
            };

            batch.set(scoreDocRef, updatePayload, { merge: true });
        }
        
        try {
            await batch.commit();
            showToast(`បានរក្សាទុកពិន្ទុសម្រាប់ "${scoresExamFilter.options[scoresExamFilter.selectedIndex].text}" ដោយជោគជ័យ`);
        } catch (error) {
            console.error("Error saving scores:", error);
            showToast('ការរក្សាទុកពិន្ទុមានបញ្ហា', true);
        }
    });
}

function getGrade(average) {
    if (average >= 45) return "A";
    if (average >= 40) return "B";
    if (average >= 35) return "C";
    if (average >= 30) return "D";
    if (average >= 25) return "E";
    return "F";
}

function updateAllRanksAndGrades() {
    const studentRows = Array.from(scoresPageTableContainer.querySelectorAll('tr[data-student-id]'));
    if (studentRows.length === 0) return;

    const studentData = studentRows.map(row => {
        const studentId = row.dataset.studentId;
        const average = parseFloat(row.querySelector(`#average-score-${studentId}`).textContent) || 0;
        return { studentId, average };
    });

    // Sort by average score, descending
    studentData.sort((a, b) => b.average - a.average);

    let rank = 1;
    for (let i = 0; i < studentData.length; i++) {
        // Handle ties: if the current student's score is the same as the previous one, they get the same rank.
        if (i > 0 && studentData[i].average < studentData[i-1].average) {
            rank = i + 1;
        }
        
        const studentId = studentData[i].studentId;
        const grade = getGrade(studentData[i].average);

        const rankCell = document.getElementById(`rank-${studentId}`);
        const gradeCell = document.getElementById(`grade-${studentId}`);

        if (rankCell) rankCell.textContent = rank;
        if (gradeCell) gradeCell.textContent = grade;
    }
}

function updateStudentScoreSummary(studentId) {
    const studentRow = scoresPageTableContainer.querySelector(`tr[data-student-id="${studentId}"]`);
    if (!studentRow) return;

    const classId = scoresClassFilter.value;
    const selectedClass = allClassesCache.find(c => c.id === classId);
    if (!selectedClass) return;

    const assignedSubjectIds = selectedClass.subjectIds || [];
    const assignedSubjects = allSubjectsCache.filter(s => assignedSubjectIds.includes(s.id));
    const totalCoefficient = assignedSubjects.reduce((sum, subject) => sum + (subject.coefficient || 0), 0);
    
    let totalScore = 0;
    studentRow.querySelectorAll('input.score-input').forEach(input => {
        totalScore += parseFloat(input.value) || 0;
    });

    const averageScore = totalCoefficient > 0 ? (totalScore / totalCoefficient) : 0;

    const absenceP = parseFloat(studentRow.querySelector('input.absence-input[data-type="p"]').value) || 0;
    const absenceUp = parseFloat(studentRow.querySelector('input.absence-input[data-type="up"]').value) || 0;
    const totalAbsence = absenceP + absenceUp;

    studentRow.querySelector(`#total-score-${studentId}`).textContent = totalScore.toFixed(2);
    studentRow.querySelector(`#average-score-${studentId}`).textContent = averageScore.toFixed(2);
    studentRow.querySelector(`#total-absence-${studentId}`).textContent = totalAbsence;
    
    // After updating one student, we need to re-calculate ranks for everyone
    updateAllRanksAndGrades();
}

async function generateScoresPageTable() {
    const classId = scoresClassFilter.value;
    const selectedKey = scoresExamFilter.value;

    if (!classId || !selectedKey) {
        scoresPageTableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">សូមជ្រើសរើសឲ្យបានពេញលេញ។</p>';
        saveScoresPageBtn.classList.add('hidden');
        return;
    }
    
    const isMonthlySemesterExam = selectedKey === 'sem1_month_exam' || selectedKey === 'sem2_month_exam';
    const isFinalReport = selectedKey === 'sem1_report' || selectedKey === 'sem2_report';
    const isAnnualResult = selectedKey === 'end_year_result';

    saveScoresPageBtn.classList.toggle('hidden', isMonthlySemesterExam || isFinalReport || isAnnualResult);


    const selectedClass = allClassesCache.find(c => c.id === classId);
    if (!selectedClass) return;

    const assignedSubjectIds = selectedClass.subjectIds || [];
    const assignedSubjects = allSubjectsCache.filter(s => assignedSubjectIds.includes(s.id)).sort((a,b) => (a.order || 0) - (b.order || 0));
    const assignedStudentIds = selectedClass.studentIds || [];
    const assignedStudents = allStudentsCache.filter(s => assignedStudentIds.includes(s.id)).sort((a,b) => a.name.localeCompare(b.name, 'km'));

    if (assignedStudents.length === 0 || assignedSubjects.length === 0) {
        scoresPageTableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">សូមបន្ថែមសិស្ស និងមុខវិជ្ជាទៅក្នុងថ្នាក់នេះជាមុនសិន។</p>';
        saveScoresPageBtn.classList.add('hidden');
        return;
    }

    scoresPageTableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">កំពុងទាញយកទិន្នន័យ...</p>';

    const scorePromises = assignedStudents.map(student => getDoc(doc(db, `artifacts/${appId}/users/${userId}/classes/${classId}/scores`, student.id)));
    const scoreSnapshots = await Promise.all(scorePromises);
    const studentScoresMap = scoreSnapshots.reduce((acc, snap) => {
        if (snap.exists()) {
            acc[snap.id] = snap.data();
        }
        return acc;
    }, {});
    
    let tableHtml = `<table class="min-w-full divide-y divide-gray-200"><thead><tr>
                        <th class="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 left-0 bg-gray-50 z-30">ឈ្មោះសិស្ស</th>`;
    assignedSubjects.forEach(subject => {
        tableHtml += `<th class="p-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center sticky top-0 bg-gray-50 z-20">
                        <div>${subject.name}</div>
                        <div class="font-normal normal-case text-gray-400 text-xs">(ពិន្ទុ: ${subject.maxScore || 'N/A'}, មេគុណ: ${subject.coefficient || 'N/A'})</div>
                      </th>`;
    });
    tableHtml += `<th class="p-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center sticky top-0 bg-gray-50 z-20">ពិន្ទុសរុប</th>
                  <th class="p-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center sticky top-0 bg-gray-50 z-20">មធ្យមភាគ</th>
                  <th class="p-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center sticky top-0 bg-gray-50 z-20">ចំណាត់ថ្នាក់</th>
                  <th class="p-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center sticky top-0 bg-gray-50 z-20">និទ្ទេស</th>
                  <th class="p-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center sticky top-0 bg-gray-50 z-20">អ. មានច្បាប់</th>
                  <th class="p-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center sticky top-0 bg-gray-50 z-20">អ. អត់ច្បាប់</th>
                  <th class="p-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center sticky top-0 bg-gray-50 z-20">អ. សរុប</th>
                  </tr></thead><tbody class="bg-white divide-y divide-gray-200">`;

    assignedStudents.forEach((student, studentIndex) => {
        tableHtml += `<tr data-student-id="${student.id}"><td class="p-3 whitespace-nowrap sticky left-0 bg-white z-10">${student.name}</td>`;
        
        let subjectColIndex = 0;
        assignedSubjects.forEach((subject) => {
            let scoreValue = '';
            let isReadOnly = false;

            const finalScore = getFinalScoreForSubject(student.id, subject.id, selectedKey, studentScoresMap);
            if (finalScore !== null) {
                scoreValue = finalScore.toFixed(2);
            }
            
            const isCalculatedField = selectedKey.includes('_exam') || selectedKey.includes('_report') || selectedKey.includes('_result');
            if (isCalculatedField) {
                isReadOnly = true;
            }


            tableHtml += `<td class="p-1"><input type="number" class="score-input w-24 p-2 border-gray-300 rounded-md text-center ${isReadOnly ? 'bg-gray-100' : ''}" 
                            max="${subject.maxScore || 100}"
                            data-row="${studentIndex}" data-col="${subjectColIndex}" 
                            data-student-id="${student.id}" data-subject-id="${subject.id}" 
                            value="${scoreValue}" ${isReadOnly ? 'readonly' : ''}></td>`;
            subjectColIndex++;
        });

        const examData = studentScoresMap[student.id]?.[selectedKey] || {};
        const attendanceData = examData.attendance || {};
        const absenceP = attendanceData.withPermission || '';
        const absenceUp = attendanceData.withoutPermission || '';

        tableHtml += `<td id="total-score-${student.id}" class="p-3 font-bold text-center align-middle">0.00</td>
                      <td id="average-score-${student.id}" class="p-3 font-bold text-center align-middle">0.00</td>
                      <td id="rank-${student.id}" class="p-3 font-bold text-center align-middle text-blue-600"></td>
                      <td id="grade-${student.id}" class="p-3 font-bold text-center align-middle text-green-600"></td>
                      <td class="p-1"><input type="number" class="absence-input w-20 p-2 border-gray-300 rounded-md text-center" data-type="p" data-row="${studentIndex}" data-col="${subjectColIndex}" data-student-id="${student.id}" value="${absenceP}"></td>
                      <td class="p-1"><input type="number" class="absence-input w-20 p-2 border-gray-300 rounded-md text-center" data-type="up" data-row="${studentIndex}" data-col="${subjectColIndex + 1}" data-student-id="${student.id}" value="${absenceUp}"></td>
                      <td id="total-absence-${student.id}" class="p-3 font-bold text-center align-middle">0</td>
                      </tr>`;
    });
    tableHtml += '</tbody></table>';
    scoresPageTableContainer.innerHTML = tableHtml;
    
    // Initial calculation for all students
    assignedStudents.forEach(student => {
        updateStudentScoreSummary(student.id);
    });
}

// --- NEW RANKINGS PAGE LOGIC ---
function setupRankingsPageView() {
    rankingsYearFilter.addEventListener('change', () => {
        const yearId = rankingsYearFilter.value;
        rankingsClassFilter.innerHTML = '<option value="">-- សូមជ្រើសរើសថ្នាក់ --</option>';
        rankingsExamFilter.innerHTML = '<option value="">-- សូមជ្រើសរើសការប្រឡង --</option>';
        rankingsTableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">សូមជ្រើសរើសថ្នាក់ និងការប្រឡង។</p>';
        exportRankingsBtn.classList.add('hidden');

        if (yearId) {
            const classesInYear = allClassesCache
                .filter(c => c.academicYearId === yearId)
                .sort((a, b) => a.className.localeCompare(b.className));
            
            classesInYear.forEach(c => {
                rankingsClassFilter.innerHTML += `<option value="${c.id}">${c.className}</option>`;
            });

            // Automatically select the first class if available
            if (classesInYear.length > 0) {
                rankingsClassFilter.value = classesInYear[0].id;
                rankingsClassFilter.dispatchEvent(new Event('change'));
            }
        }
    });

    rankingsClassFilter.addEventListener('change', async () => {
        const yearId = rankingsYearFilter.value;
        const classId = rankingsClassFilter.value;
        rankingsExamFilter.innerHTML = '<option value="">-- សូមជ្រើសរើសការប្រឡង --</option>';
        rankingsTableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">សូមជ្រើសរើសការប្រឡង។</p>';
        exportRankingsBtn.classList.add('hidden');

        if (yearId && classId) {
            const settingsRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, yearId);
            const docSnap = await getDoc(settingsRef);
            let scoreEntryOptions = [];
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.startOfYearTestName) scoreEntryOptions.push({ key: 'start_year_test', name: data.startOfYearTestName });
                if (data.semester1) {
                    for (let i = 1; i <= 6; i++) { if (data.semester1[`month${i}`]) scoreEntryOptions.push({ key: `sem1_month_${i}`, name: data.semester1[`month${i}`] }); }
                    if (data.semester1.monthExamName) scoreEntryOptions.push({ key: 'sem1_month_exam', name: data.semester1.monthExamName });
                    if (data.semester1.examName) scoreEntryOptions.push({ key: 'sem1_exam', name: data.semester1.examName });
                    if (data.semester1.reportName) scoreEntryOptions.push({ key: 'sem1_report', name: data.semester1.reportName });
                }
                if (data.semester2) {
                    for (let i = 1; i <= 6; i++) { if (data.semester2[`month${i}`]) scoreEntryOptions.push({ key: `sem2_month_${i}`, name: data.semester2[`month${i}`] }); }
                    if (data.semester2.monthExamName) scoreEntryOptions.push({ key: 'sem2_month_exam', name: data.semester2.monthExamName });
                    if (data.semester2.examName) scoreEntryOptions.push({ key: 'sem2_exam', name: data.semester2.examName });
                    if (data.semester2.reportName) scoreEntryOptions.push({ key: 'sem2_report', name: data.semester2.reportName });
                }
                if (data.endOfYearResultName) scoreEntryOptions.push({ key: 'end_year_result', name: data.endOfYearResultName });
                
                rankingsExamFilter.innerHTML += scoreEntryOptions.map(opt => `<option value="${opt.key}">${opt.name}</option>`).join('');
            }

            // Automatically select the first exam if available
            if (scoreEntryOptions.length > 0) {
                rankingsExamFilter.value = scoreEntryOptions[0].key;
                rankingsExamFilter.dispatchEvent(new Event('change'));
            }
        }
    });

    rankingsExamFilter.addEventListener('change', displayRankings);
    exportRankingsBtn.addEventListener('click', exportRankingsToExcel);
}

async function displayRankings() {
    const classId = rankingsClassFilter.value;
    const selectedKey = rankingsExamFilter.value;

    if (!classId || !selectedKey) {
        rankingsTableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">សូមជ្រើសរើសឲ្យបានពេញលេញ។</p>';
        exportRankingsBtn.classList.add('hidden');
        return;
    }

    rankingsTableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">កំពុងគណនាចំណាត់ថ្នាក់...</p>';

    const selectedClass = allClassesCache.find(c => c.id === classId);
    if (!selectedClass) return;

    const assignedSubjectIds = selectedClass.subjectIds || [];
    const assignedSubjects = allSubjectsCache.filter(s => assignedSubjectIds.includes(s.id));
    const assignedStudentIds = selectedClass.studentIds || [];
    const assignedStudents = allStudentsCache.filter(s => assignedStudentIds.includes(s.id));

    if (assignedStudents.length === 0) {
        rankingsTableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">ថ្នាក់នេះមិនមានសិស្សទេ។</p>';
        exportRankingsBtn.classList.add('hidden');
        return;
    }

    const scorePromises = assignedStudents.map(student => getDoc(doc(db, `artifacts/${appId}/users/${userId}/classes/${classId}/scores`, student.id)));
    const scoreSnapshots = await Promise.all(scorePromises);
    const studentScoresMap = scoreSnapshots.reduce((acc, snap) => {
        if (snap.exists()) {
            acc[snap.id] = snap.data();
        }
        return acc;
    }, {});

    const studentResults = [];

    for (const student of assignedStudents) {
        let totalScore = 0;
        let totalCoefficient = 0;

        for (const subject of assignedSubjects) {
            const finalScore = getFinalScoreForSubject(student.id, subject.id, selectedKey, studentScoresMap);
            if (finalScore !== null) {
                totalScore += finalScore * (subject.coefficient || 0); // Multiply by coefficient here
                totalCoefficient += (subject.coefficient || 0);
            }
        }

        const average = totalCoefficient > 0 ? (totalScore / totalCoefficient) : 0;
        studentResults.push({
            id: student.id,
            name: student.name,
            gender: student.gender,
            totalScore: totalScore,
            average: average,
            grade: getGrade(average),
            rank: 0 
        });
    }

    studentResults.sort((a, b) => b.average - a.average);

    let rank = 1;
    for (let i = 0; i < studentResults.length; i++) {
        if (i > 0 && studentResults[i].average < studentResults[i - 1].average) {
            rank = i + 1;
        }
        studentResults[i].rank = rank;
    }

    renderRankingsTable(studentResults);
    exportRankingsBtn.classList.remove('hidden');
}

function getFinalScoreForSubject(studentId, subjectId, periodKey, scoresMap) {
    const studentAllScores = scoresMap[studentId] || {};

    const isMonthlySemesterExam = periodKey === 'sem1_month_exam' || periodKey === 'sem2_month_exam';
    const isFinalReport = periodKey === 'sem1_report' || periodKey === 'sem2_report';
    const isAnnualResult = periodKey === 'end_year_result';

    if (isMonthlySemesterExam) {
        const semester = periodKey.startsWith('sem1') ? 1 : 2;
        const monthKeys = Array.from({ length: 6 }, (_, i) => `sem${semester}_month_${i + 1}`);
        let totalScore = 0;
        let monthCount = 0;
        monthKeys.forEach(monthKey => {
            const monthScoreData = studentAllScores[monthKey]?.scores;
            if (monthScoreData && monthScoreData[subjectId] !== undefined) {
                totalScore += parseFloat(monthScoreData[subjectId]);
                monthCount++;
            }
        });
        return monthCount > 0 ? (totalScore / monthCount) : null;
    }

    if (isFinalReport) {
        const semester = periodKey.startsWith('sem1') ? 1 : 2;
        const monthExamKey = `sem${semester}_month_exam`;
        const finalExamKey = `sem${semester}_exam`;

        const monthExamAvg = getFinalScoreForSubject(studentId, subjectId, monthExamKey, scoresMap);
        const finalExamScoreData = studentAllScores[finalExamKey]?.scores;
        const finalExamScore = (finalExamScoreData && finalExamScoreData[subjectId] !== undefined) ? parseFloat(finalExamScoreData[subjectId]) : null;

        if (monthExamAvg !== null && finalExamScore !== null) {
            return (monthExamAvg + finalExamScore) / 2;
        }
        return null;
    }

    if (isAnnualResult) {
        const sem1ReportScore = getFinalScoreForSubject(studentId, subjectId, 'sem1_report', scoresMap);
        const sem2ReportScore = getFinalScoreForSubject(studentId, subjectId, 'sem2_report', scoresMap);

        if (sem1ReportScore !== null && sem2ReportScore !== null) {
            return (sem1ReportScore + sem2ReportScore) / 2;
        }
        return null;
    }

    const examData = studentAllScores[periodKey] || {};
    const scoresData = examData.scores || {};
    if (scoresData[subjectId] !== undefined) {
        return parseFloat(scoresData[subjectId]);
    }

    return null;
}

function renderRankingsTable(results) {
    if (results.length === 0) {
        rankingsTableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">រកមិនឃើញទិន្នន័យសម្រាប់បង្ហាញទេ។</p>';
        return;
    }

    let tableHtml = `<table class="w-full text-sm text-left">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
                <th class="p-3">ចំណាត់ថ្នាក់</th>
                <th class="p-3">ឈ្មោះសិស្ស</th>
                <th class="p-3">ភេទ</th>
                <th class="p-3">ពិន្ទុសរុប</th>
                <th class="p-3">មធ្យមភាគ</th>
                <th class="p-3">និទ្ទេស</th>
            </tr>
        </thead>
        <tbody>`;

    results.forEach(student => {
        tableHtml += `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3 font-bold text-lg text-blue-600 text-center">${student.rank}</td>
                <td class="p-3 font-medium">${student.name}</td>
                <td class="p-3">${student.gender}</td>
                <td class="p-3">${student.totalScore.toFixed(2)}</td>
                <td class="p-3 font-semibold">${student.average.toFixed(2)}</td>
                <td class="p-3 font-bold text-green-600 text-center">${student.grade}</td>
            </tr>`;
    });

    tableHtml += '</tbody></table>';
    rankingsTableContainer.innerHTML = tableHtml;
}

function exportRankingsToExcel() {
    const table = rankingsTableContainer.querySelector('table');
    if (!table) {
        showToast('គ្មានទិន្នន័យសម្រាប់នាំចេញទេ', true);
        return;
    }
    
    const yearName = rankingsYearFilter.options[rankingsYearFilter.selectedIndex].text;
    const className = rankingsClassFilter.options[rankingsClassFilter.selectedIndex].text;
    const examName = rankingsExamFilter.options[rankingsExamFilter.selectedIndex].text;

    const workbook = XLSX.utils.table_to_book(table, {sheet: "ចំណាត់ថ្នាក់"});
    const fileName = `ចំណាត់ថ្នាក់_${className}_${examName}_${yearName}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}

function exportToExcel() {
    const selectedYearId = studentYearFilter.value;
    if (!selectedYearId) {
        showToast('សូមជ្រើសរើសឆ្នាំសិក្សាដើម្បីនាំចេញទិន្នន័យ។', true);
        return;
    }

    const selectedYear = allYearsCache.find(y => y.id === selectedYearId);
    const selectedClass = allClassesCache.find(c => c.id === studentClassFilter.value);
    const searchTerm = studentSearchInput.value.toLowerCase();

    const classesInYear = allClassesCache.filter(c => c.academicYearId === selectedYearId);
    let studentIdsInYear = classesInYear.flatMap(c => c.studentIds || []);
    
    if (selectedClass) {
        studentIdsInYear = selectedClass.studentIds || [];
    }

    let studentsToExport = allStudentsCache.filter(s => studentIdsInYear.includes(s.id));

    if (searchTerm) {
        studentsToExport = studentsToExport.filter(student => {
            const studentClass = allClassesCache.find(c => c.studentIds?.includes(student.id));
            let className = studentClass ? studentClass.className.toLowerCase() : '';
            return (
                student.studentId.toLowerCase().includes(searchTerm) ||
                student.name.toLowerCase().includes(searchTerm) ||
                student.gender.toLowerCase().includes(searchTerm) ||
                (student.dob && student.dob.toLowerCase().includes(searchTerm)) ||
                (student.phone && student.phone.toLowerCase().includes(searchTerm)) ||
                className.includes(searchTerm)
            );
        });
    }

    if (studentsToExport.length === 0) {
        showToast('គ្មានទិន្នន័យសិស្សសម្រាប់នាំចេញទេ។', true);
        return;
    }

    const dataForSheet = studentsToExport.map((student, index) => {
        const studentClass = allClassesCache.find(c => c.studentIds?.includes(student.id));
        return {
            'ល.រ': index + 1,
            'អត្តលេខសិស្ស': student.studentId,
            'ឈ្មោះសិស្ស': student.name,
            'ភេទ': student.gender,
            'ថ្នាក់': studentClass ? studentClass.className : 'N/A',
            'ថ្ងៃខែឆ្នាំកំណើត': student.dob || '',
            'លេខទូរស័ព្ទ': student.phone || ''
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'បញ្ជីឈ្មោះសិស្ស');

    const fileName = `បញ្ជីសិស្ស_${selectedYear.name}${selectedClass ? '_' + selectedClass.className : ''}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}

// --- EVENT LISTENERS (STABLE SETUP) ---
function setupEventListeners() {
    // Navigation
    navLinks.forEach(link => { link.addEventListener('click', (e) => { e.preventDefault(); const targetId = `view-${link.id.split('-')[1]}`; switchView(targetId); }); });
    backToClassesBtn.addEventListener('click', () => switchView('view-classes'));

    // Authentication
    showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('login-form-container').classList.add('hidden'); document.getElementById('register-form-container').classList.remove('hidden'); authError.textContent = ''; });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('register-form-container').classList.add('hidden'); document.getElementById('login-form-container').classList.remove('hidden'); authError.textContent = ''; });
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        authError.textContent = '';
        try {
            await signInWithEmailAndPassword(auth, email, password);
            showToast('ការចូលប្រើប្រាស់បានជោគជ័យ!');
        } catch (error) {
            console.error("Login Error:", error.code, error.message); // Log detailed error
            authError.textContent = 'អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។';
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        authError.textContent = '';
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            showToast('ការបង្កើតគណនីបានជោគជ័យ!');
        } catch (error) {
            console.error("Register Error:", error.code, error.message); // Log detailed error
            if (error.code === 'auth/email-already-in-use') {
                authError.textContent = 'អ៊ីមែលនេះត្រូវបានប្រើប្រាស់រួចហើយ។';
            } else {
                authError.textContent = 'មានបញ្ហាក្នុងការបង្កើតគណនី។';
            }
        }
    });

    logoutBtn.addEventListener('click', async () => { await signOut(auth); showToast('បានចាកចេញពីប្រព័ន្ធ។'); });

    // Add Buttons now call modal openers
    addYearBtn.addEventListener('click', () => openYearModal());
    addTeacherBtn.addEventListener('click', () => openTeacherModal());
    addStudentBtn.addEventListener('click', () => {
        const selectedYearId = studentYearFilter.value;
        if (!selectedYearId) {
            showToast('សូមជ្រើសរើសឆ្នាំសិក្សាសិន ទើបអាចបន្ថែមសិស្សបាន។', true);
            return;
        }
        openStudentModal();
    });
    addSubjectBtn.addEventListener('click', () => openSubjectModal());
    addClassBtn.addEventListener('click', () => openClassModal());

    // Dashboard Listeners
    dashCardYears.addEventListener('click', () => switchView('view-years'));
    dashCardClasses.addEventListener('click', () => switchView('view-classes'));
    dashCardTeachers.addEventListener('click', () => switchView('view-teachers'));
    dashCardStudents.addEventListener('click', () => switchView('view-students'));
    chartYearFilter.addEventListener('change', renderStudentGenderChart);

    // Search and Filter listeners
    studentSearchInput.addEventListener('input', filterAndRenderStudents);
    studentYearFilter.addEventListener('change', () => {
        populateClassFilterDropdown();
        filterAndRenderStudents();
    });
    studentClassFilter.addEventListener('change', filterAndRenderStudents);
    classYearFilter.addEventListener('change', filterAndRenderClasses);
    subjectYearFilter.addEventListener('change', filterAndRenderSubjects);
    exportStudentsBtn.addEventListener('click', exportToExcel);

    // Settings Listeners
    saveSchoolInfoBtn.addEventListener('click', async () => {
        const newSchoolName = schoolNameInput.value.trim();
        const newStampUrl = directorStampUrlInput.value.trim();
        const newQrLinkUrl = qrLinkUrlInput.value.trim();
        if (newSchoolName) {
            const settingsRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'general');
            await setDoc(settingsRef, { 
                schoolName: newSchoolName,
                directorStampUrl: newStampUrl,
                qrLinkUrl: newQrLinkUrl
            }, { merge: true });
            showToast('បានរក្សាទុកព័ត៌មានសាលាដោយជោគជ័យ');
        } else {
            showToast('សូមបញ្ចូលឈ្មោះសាលា', true);
        }
    });

    directorStampUrlInput.addEventListener('input', updatePreviews);
    qrLinkUrlInput.addEventListener('input', updatePreviews);

    settingsYearSelect.addEventListener('change', async (e) => {
        const yearId = e.target.value;
        if (yearId) {
            semesterSettingsForm.classList.remove('hidden');
            const settingsRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, yearId);
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                document.getElementById('start-year-test-input').value = data.startOfYearTestName || 'តេស្តដើមឆ្នាំ';
                document.querySelectorAll('select.semester-month-input').forEach(input => {
                    const sem = input.dataset.semester;
                    const month = input.dataset.month;
                    input.value = data[`semester${sem}`]?.[`month${month}`] || '';
                });
                document.querySelector('[data-semester="1"][data-month="7"]').value = data.semester1?.monthExamName || 'ខែឆមាស១';
                document.getElementById('semester1-exam-input').value = data.semester1?.examName || 'ប្រឡងឆមាស១';
                document.getElementById('semester1-report-name').value = data.semester1?.reportName || 'សៀវភៅប្រចាំឆមាសទី១';
                document.querySelector('[data-semester="2"][data-month="7"]').value = data.semester2?.monthExamName || 'ខែឆមាស២';
                document.getElementById('semester2-exam-input').value = data.semester2?.examName || 'ប្រឡងឆមាស២';
                document.getElementById('semester2-report-name').value = data.semester2?.reportName || 'សៀវភៅប្រចាំឆមាសទី២';
                document.getElementById('end-year-result-input').value = data.endOfYearResultName || 'លទ្ធផលប្រចាំឆ្នាំ';
            } else {
                semesterSettingsForm.reset();
                document.getElementById('start-year-test-input').value = 'តេស្តដើមឆ្នាំ';
                document.querySelector('[data-semester="1"][data-month="7"]').value = 'ខែឆមាស១';
                document.getElementById('semester1-exam-input').value = 'ប្រឡងឆមាស១';
                document.getElementById('semester1-report-name').value = 'សៀវភៅប្រចាំឆមាសទី១';
                document.querySelector('[data-semester="2"][data-month="7"]').value = 'ខែឆមាស២';
                document.getElementById('semester2-exam-input').value = 'ប្រឡងឆមាស២';
                document.getElementById('semester2-report-name').value = 'សៀវភៅប្រចាំឆមាសទី២';
                document.getElementById('end-year-result-input').value = 'លទ្ធផលប្រចាំឆ្នាំ';
            }
        } else {
            semesterSettingsForm.classList.add('hidden');
        }
    });

    semesterSettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const yearId = settingsYearSelect.value;
        if (!yearId) return;

        const settingsData = {
            startOfYearTestName: document.getElementById('start-year-test-input').value,
            endOfYearResultName: document.getElementById('end-year-result-input').value,
            semester1: {
                examName: document.getElementById('semester1-exam-input').value,
                monthExamName: document.querySelector('[data-semester="1"][data-month="7"]').value,
                reportName: document.getElementById('semester1-report-name').value,
            },
            semester2: {
                examName: document.getElementById('semester2-exam-input').value,
                monthExamName: document.querySelector('[data-semester="2"][data-month="7"]').value,
                reportName: document.getElementById('semester2-report-name').value,
            }
        };

        document.querySelectorAll('select.semester-month-input').forEach(input => {
            const sem = input.dataset.semester;
            const month = input.dataset.month;
            if (!settingsData[`semester${sem}`]) {
                settingsData[`semester${sem}`] = {};
            }
            settingsData[`semester${sem}`][`month${month}`] = input.value;
        });

        const settingsRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, yearId);
        await setDoc(settingsRef, settingsData);
        showToast('បានរក្សាទុកការកំណត់ឆមាស');
    });


    // Class Detail View Form Submissions
    document.getElementById('class-settings-form').addEventListener('submit', async (e) => { e.preventDefault(); const classDocRef = doc(db, `artifacts/${appId}/users/${userId}/classes`, currentClassData.id); const selectedSubjectIds = Array.from(document.querySelectorAll('#class-subjects-list input:checked')).map(cb => cb.value); await updateDoc(classDocRef, { subjectIds: selectedSubjectIds }); currentClassData.subjectIds = selectedSubjectIds; setupScoreEntryTab(); showToast('បានរក្សាទុកការកំណត់ថ្នាក់'); });
    document.getElementById('class-students-form').addEventListener('submit', async (e) => { e.preventDefault(); const classDocRef = doc(db, `artifacts/${appId}/users/${userId}/classes`, currentClassData.id); const selectedStudentIds = Array.from(document.querySelectorAll('#class-students-list input:checked')).map(cb => cb.value); await updateDoc(classDocRef, { studentIds: selectedStudentIds }); currentClassData.studentIds = selectedStudentIds; showToast('បានធ្វើបច្ចុប្បន្នភាពបញ្ជីសិស្ស'); });
    document.getElementById('save-scores-btn').addEventListener('click', async () => { 
        const selectedKey = document.getElementById('score-month-select').value;
        const batch = writeBatch(db);
        const scoreRows = document.querySelectorAll('#score-entry-table-container tr[data-student-id]'); 
        for (const row of scoreRows) { 
            const studentId = row.dataset.studentId; 
            const scoreDocRef = doc(db, `artifacts/${appId}/users/${userId}/classes/${currentClassData.id}/scores`, studentId); 
            const scoresForMonth = {}; 
            const scoreInputs = row.querySelectorAll('.score-input'); 
            scoreInputs.forEach(input => { 
                const subjectId = input.dataset.subjectId; 
                const scoreValue = input.value; 
                if (scoreValue !== '') { 
                    scoresForMonth[subjectId] = parseFloat(scoreValue); 
                } 
            }); 
            const updatePayload = {}; 
            updatePayload[selectedKey] = { scores: scoresForMonth }; 
            batch.set(scoreDocRef, updatePayload, { merge: true }); 
        } 
        await batch.commit();
        showToast(`បានរក្សាទុកពិន្ទុ`); 
    });

    setupScoresPageView(); // Initialize new page listeners
    setupRankingsPageView(); // Initialize rankings page listeners
}

// --- MAIN APP START ---
function initializeDataSubscriptions() {
    // Clear previous listeners to avoid memory leaks
    unsubscribeListeners.forEach(unsub => unsub());
    unsubscribeListeners = [];
    
    // Initialize all data subscriptions
    subscribeToSettings();
    subscribeToYears();
    subscribeToTeachers();
    subscribeToStudents();
    subscribeToSubjects();
    subscribeToClasses();
    
    switchView('view-dashboard');
}

async function main() {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        
        populateMonthDropdowns();
        setupEventListeners();

        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                userEmailDisplay.textContent = user.email;
                authScreen.classList.add('hidden');
                appContainer.classList.remove('hidden');
                initializeDataSubscriptions();
            } else {
                userId = null;
                // Clear caches
                allYearsCache = [];
                allClassesCache = [];
                allTeachersCache = [];
                allStudentsCache = [];
                allSubjectsCache = [];
                
                // Detach listeners
                unsubscribeListeners.forEach(unsub => unsub());
                unsubscribeListeners = [];

                authScreen.classList.remove('hidden');
                appContainer.classList.add('hidden');
            }
        });

    } catch (error) {
        console.error("Initialization Error:", error);
        document.body.innerHTML = `<div class="p-8 text-center text-red-600"><h1 class="text-2xl font-bold">Initialization Failed</h1><p>Could not connect to Firebase services.</p><p class="mt-4 text-sm text-gray-500">${error.message}</p></div>`;
    }
}

main();
