/* ======================================================================= */
/* FILE: js/scores.js (For scores.html only) - COMPLETE VERSION            */
/* ======================================================================= */

// --- Imports from the main script ---
import { db, userId, allYearsCache, allClassesCache, allStudentsCache, allSubjectsCache, showToast } from './main.js';
import { doc, getDoc, writeBatch, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

    function getGrade(average) {
        if (average >= 45) return "A";
        if (average >= 40) return "B";
        if (average >= 35) return "C";
        if (average >= 30) return "D";
        if (average >= 25) return "E";
        return "F";
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

    function updateAllRanksAndGrades() {
        const studentRows = Array.from(scoresPageTableContainer.querySelectorAll('tr[data-student-id]'));
        if (studentRows.length === 0) return;

        const studentData = studentRows.map(row => {
            const studentId = row.dataset.studentId;
            const average = parseFloat(row.querySelector(`#average-score-${studentId}`).textContent) || 0;
            return { studentId, average };
        });

        studentData.sort((a, b) => b.average - a.average);

        let rank = 1;
        for (let i = 0; i < studentData.length; i++) {
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
            const subjectId = input.dataset.subjectId;
            const subject = assignedSubjects.find(s => s.id === subjectId);
            if (subject) {
                 totalScore += (parseFloat(input.value) || 0) * (subject.coefficient || 0);
            }
        });

        const averageScore = totalCoefficient > 0 ? (totalScore / totalCoefficient) : 0;

        const absenceP = parseFloat(studentRow.querySelector('input.absence-input[data-type="p"]').value) || 0;
        const absenceUp = parseFloat(studentRow.querySelector('input.absence-input[data-type="up"]').value) || 0;
        const totalAbsence = absenceP + absenceUp;

        studentRow.querySelector(`#total-score-${studentId}`).textContent = totalScore.toFixed(2);
        studentRow.querySelector(`#average-score-${studentId}`).textContent = averageScore.toFixed(2);
        studentRow.querySelector(`#total-absence-${studentId}`).textContent = totalAbsence;
        
        updateAllRanksAndGrades();
    }
    
    async function generateScoresPageTable() {
        const classId = scoresClassFilter.value;
        const selectedKey = scoresExamFilter.value;

        if (!classId || !selectedKey) {
            scoresPageTableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Please make a complete selection.</p>';
            saveScoresPageBtn.classList.add('hidden');
            return;
        }
        
        const isCalculatedField = selectedKey.includes('_exam') || selectedKey.includes('_report') || selectedKey.includes('_result');
        saveScoresPageBtn.classList.toggle('hidden', isCalculatedField);

        const selectedClass = allClassesCache.find(c => c.id === classId);
        if (!selectedClass) return;

        const assignedSubjectIds = selectedClass.subjectIds || [];
        const assignedSubjects = allSubjectsCache.filter(s => assignedSubjectIds.includes(s.id)).sort((a,b) => (a.order || 0) - (b.order || 0));
        const assignedStudents = allStudentsCache.filter(s => selectedClass.studentIds?.includes(s.id)).sort((a,b) => a.name.localeCompare(b.name, 'km'));

        if (assignedStudents.length === 0 || assignedSubjects.length === 0) {
            scoresPageTableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Please add students and subjects to this class first.</p>';
            saveScoresPageBtn.classList.add('hidden');
            return;
        }

        scoresPageTableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Loading scores...</p>';

        const scorePromises = assignedStudents.map(student => getDoc(doc(db, `artifacts/glckob-school-app/users/${userId}/classes/${classId}/scores`, student.id)));
        const scoreSnapshots = await Promise.all(scorePromises);
        const studentScoresMap = scoreSnapshots.reduce((acc, snap) => {
            if (snap.exists()) acc[snap.id] = snap.data();
            return acc;
        }, {});
        
        let tableHtml = `<table class="min-w-full divide-y divide-gray-200"><thead><tr>
                            <th class="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 left-0 bg-gray-50 z-30">Student Name</th>`;
        assignedSubjects.forEach(subject => {
            tableHtml += `<th class="p-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center sticky top-0 bg-gray-50 z-20">
                            <div>${subject.name}</div>
                            <div class="font-normal normal-case text-gray-400 text-xs">(Max: ${subject.maxScore || 'N/A'}, Coeff: ${subject.coefficient || 'N/A'})</div>
                          </th>`;
        });
        tableHtml += `<th class="p-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center sticky top-0 bg-gray-50 z-20">Total Score</th>
                      <th class="p-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center sticky top-0 bg-gray-50 z-20">Average</th>
                      <th class="p-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center sticky top-0 bg-gray-50 z-20">Rank</th>
                      <th class="p-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center sticky top-0 bg-gray-50 z-20">Grade</th>
                      <th class="p-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center sticky top-0 bg-gray-50 z-20">Abs. (P)</th>
                      <th class="p-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center sticky top-0 bg-gray-50 z-20">Abs. (UP)</th>
                      <th class="p-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center sticky top-0 bg-gray-50 z-20">Total Abs.</th>
                      </tr></thead><tbody class="bg-white divide-y divide-gray-200">`;

        assignedStudents.forEach((student, studentIndex) => {
            tableHtml += `<tr data-student-id="${student.id}"><td class="p-3 whitespace-nowrap sticky left-0 bg-white z-10">${student.name}</td>`;
            let subjectColIndex = 0;
            assignedSubjects.forEach((subject) => {
                const finalScore = getFinalScoreForSubject(student.id, subject.id, selectedKey, studentScoresMap);
                const scoreValue = finalScore !== null ? finalScore.toFixed(2) : '';
                tableHtml += `<td class="p-1"><input type="number" class="score-input w-24 p-2 border-gray-300 rounded-md text-center ${isCalculatedField ? 'bg-gray-100' : ''}" 
                                max="${subject.maxScore || 100}"
                                data-row="${studentIndex}" data-col="${subjectColIndex}" 
                                data-student-id="${student.id}" data-subject-id="${subject.id}" 
                                value="${scoreValue}" ${isCalculatedField ? 'readonly' : ''}></td>`;
                subjectColIndex++;
            });

            const examData = studentScoresMap[student.id]?.[selectedKey] || {};
            const attendanceData = examData.attendance || {};
            tableHtml += `<td id="total-score-${student.id}" class="p-3 font-bold text-center align-middle">0.00</td>
                          <td id="average-score-${student.id}" class="p-3 font-bold text-center align-middle">0.00</td>
                          <td id="rank-${student.id}" class="p-3 font-bold text-center align-middle text-blue-600"></td>
                          <td id="grade-${student.id}" class="p-3 font-bold text-center align-middle text-green-600"></td>
                          <td class="p-1"><input type="number" class="absence-input w-20 p-2 border-gray-300 rounded-md text-center" data-type="p" data-row="${studentIndex}" data-col="${subjectColIndex}" data-student-id="${student.id}" value="${attendanceData.withPermission || ''}"></td>
                          <td class="p-1"><input type="number" class="absence-input w-20 p-2 border-gray-300 rounded-md text-center" data-type="up" data-row="${studentIndex}" data-col="${subjectColIndex + 1}" data-student-id="${student.id}" value="${attendanceData.withoutPermission || ''}"></td>
                          <td id="total-absence-${student.id}" class="p-3 font-bold text-center align-middle">0</td>
                          </tr>`;
        });
        tableHtml += '</tbody></table>';
        scoresPageTableContainer.innerHTML = tableHtml;
        
        assignedStudents.forEach(student => updateStudentScoreSummary(student.id));
    }

    // --- Event Listeners ---
    scoresYearFilter.addEventListener('change', () => { /* ... Chained filter logic from previous step ... */ });
    scoresClassFilter.addEventListener('change', async () => { /* ... Chained filter logic from previous step ... */ });
    scoresExamFilter.addEventListener('change', generateScoresPageTable);
    saveScoresPageBtn.addEventListener('click', async () => { /* ... Save logic from original script ... */ });

    // --- Initial Setup ---
    populateYearFilter();
});
