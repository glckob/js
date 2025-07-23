/* ======================================================================= */
/* FILE: js/scores.js (For scores.html only)                               */
/* ======================================================================= */

// --- Imports from the main script ---
import { db, userId, allYearsCache, allClassesCache, allStudentsCache, allSubjectsCache, showToast } from './main.js';
import { doc, getDoc, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Wait for the 'dataReady' event from main.js ---
document.addEventListener('dataReady', () => {
    
    // --- DOM Elements for this page ---
    const scoresYearFilter = document.getElementById('scores-year-filter');
    const scoresClassFilter = document.getElementById('scores-class-filter');
    const scoresExamFilter = document.getElementById('scores-exam-filter');
    const scoresPageTableContainer = document.getElementById('scores-page-table-container');
    const saveScoresPageBtn = document.getElementById('save-scores-page-btn');

    // --- Functions for this page ---

    function populateYearFilter() {
        scoresYearFilter.innerHTML = '<option value="">-- Select a Year --</option>' + allYearsCache.map(year => `<option value="${year.id}">${year.name}</option>`).join('');
    }

    // Chained filter logic
    scoresYearFilter.addEventListener('change', () => {
        const yearId = scoresYearFilter.value;
        scoresClassFilter.innerHTML = '<option value="">-- Select a Class --</option>';
        scoresExamFilter.innerHTML = '<option value="">-- Select an Exam --</option>';
        scoresPageTableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Please select a class and exam.</p>';
        saveScoresPageBtn.classList.add('hidden');

        if (yearId) {
            const classesInYear = allClassesCache
                .filter(c => c.academicYearId === yearId)
                .sort((a, b) => a.className.localeCompare(b.className));
            
            classesInYear.forEach(c => {
                scoresClassFilter.innerHTML += `<option value="${c.id}">${c.className}</option>`;
            });

            if (classesInYear.length > 0) {
                scoresClassFilter.value = classesInYear[0].id;
                scoresClassFilter.dispatchEvent(new Event('change'));
            }
        }
    });

    scoresClassFilter.addEventListener('change', async () => {
        const yearId = scoresYearFilter.value;
        const classId = scoresClassFilter.value;
        scoresExamFilter.innerHTML = '<option value="">-- Select an Exam --</option>';
        scoresPageTableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Please select an exam.</p>';
        saveScoresPageBtn.classList.add('hidden');

        if (yearId && classId) {
            const settingsRef = doc(db, `artifacts/glckob-school-app/users/${userId}/settings`, yearId);
            const docSnap = await getDoc(settingsRef);
            let scoreEntryOptions = [];
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Build options array from settings
                if (data.startOfYearTestName) scoreEntryOptions.push({ key: 'start_year_test', name: data.startOfYearTestName });
                if (data.semester1) {
                    for (let i = 1; i <= 6; i++) { if (data.semester1[`month${i}`]) scoreEntryOptions.push({ key: `sem1_month_${i}`, name: data.semester1[`month${i}`] }); }
                    if (data.semester1.monthExamName) scoreEntryOptions.push({ key: 'sem1_month_exam', name: data.semester1.monthExamName });
                    if (data.semester1.examName) scoreEntryOptions.push({ key: 'sem1_exam', name: data.semester1.examName });
                }
                if (data.semester2) {
                    for (let i = 1; i <= 6; i++) { if (data.semester2[`month${i}`]) scoreEntryOptions.push({ key: `sem2_month_${i}`, name: data.semester2[`month${i}`] }); }
                    if (data.semester2.monthExamName) scoreEntryOptions.push({ key: 'sem2_month_exam', name: data.semester2.monthExamName });
                    if (data.semester2.examName) scoreEntryOptions.push({ key: 'sem2_exam', name: data.semester2.examName });
                }
                if (data.endOfYearResultName) scoreEntryOptions.push({ key: 'end_year_result', name: data.endOfYearResultName });
                
                scoresExamFilter.innerHTML += scoreEntryOptions.map(opt => `<option value="${opt.key}">${opt.name}</option>`).join('');
            }
            
            if (scoreEntryOptions.length > 0) {
                scoresExamFilter.value = scoreEntryOptions[0].key;
                scoresExamFilter.dispatchEvent(new Event('change'));
            }
        }
    });

    scoresExamFilter.addEventListener('change', generateScoresPageTable);
    
    async function generateScoresPageTable() { /* ... Logic to generate table ... */ }
    function updateStudentScoreSummary(studentId) { /* ... Logic to update totals ... */ }
    function updateAllRanksAndGrades() { /* ... Logic to update ranks ... */ }
    function getGrade(average) { /* ... Logic to get grade ... */ }
    function getFinalScoreForSubject(studentId, subjectId, periodKey, scoresMap) { /* ... Logic to calculate final scores ... */ }

    saveScoresPageBtn.addEventListener('click', async () => { /* ... Logic to save scores ... */ });

    // --- Initial Setup ---
    populateYearFilter();
});
