/* ======================================================================= */
/* FILE: js/rankings.js (For rankings.html only)                           */
/* ======================================================================= */

// --- Imports from the main script ---
import { db, userId, allYearsCache, allClassesCache, allStudentsCache, allSubjectsCache } from './main.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Wait for the 'dataReady' event from main.js ---
document.addEventListener('dataReady', () => {
    
    // --- DOM Elements for this page ---
    const rankingsYearFilter = document.getElementById('rankings-year-filter');
    const rankingsClassFilter = document.getElementById('rankings-class-filter');
    const rankingsExamFilter = document.getElementById('rankings-exam-filter');
    const rankingsTableContainer = document.getElementById('rankings-table-container');
    const exportRankingsBtn = document.getElementById('export-rankings-btn');

    // --- Functions for this page ---

    function populateYearFilter() {
        rankingsYearFilter.innerHTML = '<option value="">-- Select a Year --</option>' + allYearsCache.map(year => `<option value="${year.id}">${year.name}</option>`).join('');
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
        if (periodKey.includes('_report')) {
            const semester = periodKey.startsWith('sem1') ? 1 : 2;
            const monthExamKey = `sem${semester}_month_exam`;
            const finalExamKey = `sem${semester}_exam`;
            const monthExamAvg = getFinalScoreForSubject(studentId, subjectId, monthExamKey, scoresMap);
            const finalExamScoreData = studentAllScores[finalExamKey]?.scores;
            const finalExamScore = (finalExamScoreData && finalExamScoreData[subjectId] !== undefined) ? parseFloat(finalExamScoreData[subjectId]) : null;
            return (monthExamAvg !== null && finalExamScore !== null) ? (monthExamAvg + finalExamScore) / 2 : null;
        }
        const examData = studentAllScores[periodKey] || {};
        const scoresData = examData.scores || {};
        return scoresData[subjectId] !== undefined ? parseFloat(scoresData[subjectId]) : null;
    }

    async function displayRankings() {
        const classId = rankingsClassFilter.value;
        const selectedKey = rankingsExamFilter.value;

        if (!classId || !selectedKey) {
            rankingsTableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Please make a complete selection.</p>';
            exportRankingsBtn.classList.add('hidden');
            return;
        }

        rankingsTableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Calculating rankings...</p>';
        const selectedClass = allClassesCache.find(c => c.id === classId);
        const assignedStudents = allStudentsCache.filter(s => selectedClass?.studentIds?.includes(s.id));

        if (assignedStudents.length === 0) {
            rankingsTableContainer.innerHTML = '<p class="text-center text-gray-500 py-8">This class has no students.</p>';
            exportRankingsBtn.classList.add('hidden');
            return;
        }

        const scorePromises = assignedStudents.map(student => getDoc(doc(db, `artifacts/glckob-school-app/users/${userId}/classes/${classId}/scores`, student.id)));
        const scoreSnapshots = await Promise.all(scorePromises);
        const studentScoresMap = scoreSnapshots.reduce((acc, snap) => {
            if (snap.exists()) acc[snap.id] = snap.data();
            return acc;
        }, {});

        const studentResults = [];
        for (const student of assignedStudents) {
            let totalScore = 0, totalCoefficient = 0;
            const assignedSubjects = allSubjectsCache.filter(s => selectedClass?.subjectIds?.includes(s.id));
            for (const subject of assignedSubjects) {
                const finalScore = getFinalScoreForSubject(student.id, subject.id, selectedKey, studentScoresMap);
                if (finalScore !== null) {
                    totalScore += finalScore * (subject.coefficient || 0);
                    totalCoefficient += (subject.coefficient || 0);
                }
            }
            const average = totalCoefficient > 0 ? totalScore / totalCoefficient : 0;
            studentResults.push({ id: student.id, name: student.name, gender: student.gender, totalScore, average, grade: getGrade(average), rank: 0 });
        }

        studentResults.sort((a, b) => b.average - a.average);
        let rank = 1;
        for (let i = 0; i < studentResults.length; i++) {
            if (i > 0 && studentResults[i].average < studentResults[i - 1].average) rank = i + 1;
            studentResults[i].rank = rank;
        }
        renderRankingsTable(studentResults);
        exportRankingsBtn.classList.remove('hidden');
    }

    function renderRankingsTable(results) {
        let tableHtml = `<table class="w-full text-sm text-left"><thead class="text-xs text-gray-700 uppercase bg-gray-50"><tr><th class="p-3">Rank</th><th class="p-3">Student Name</th><th class="p-3">Gender</th><th class="p-3">Total Score</th><th class="p-3">Average</th><th class="p-3">Grade</th></tr></thead><tbody>`;
        results.forEach(student => {
            tableHtml += `<tr class="border-b hover:bg-gray-50"><td class="p-3 font-bold text-lg text-blue-600 text-center">${student.rank}</td><td class="p-3 font-medium">${student.name}</td><td class="p-3">${student.gender === 'ស្រី' ? 'Female' : 'Male'}</td><td class="p-3">${student.totalScore.toFixed(2)}</td><td class="p-3 font-semibold">${student.average.toFixed(2)}</td><td class="p-3 font-bold text-green-600 text-center">${student.grade}</td></tr>`;
        });
        tableHtml += '</tbody></table>';
        rankingsTableContainer.innerHTML = tableHtml;
    }

    function exportRankingsToExcel() {
        const table = rankingsTableContainer.querySelector('table');
        const yearName = rankingsYearFilter.options[rankingsYearFilter.selectedIndex].text;
        const className = rankingsClassFilter.options[rankingsClassFilter.selectedIndex].text;
        const examName = rankingsExamFilter.options[rankingsExamFilter.selectedIndex].text;
        const workbook = XLSX.utils.table_to_book(table, {sheet: "Rankings"});
        XLSX.writeFile(workbook, `Rankings_${className}_${examName}_${yearName}.xlsx`);
    }

    // --- Event Listeners ---
    rankingsYearFilter.addEventListener('change', () => {
        const yearId = rankingsYearFilter.value;
        rankingsClassFilter.innerHTML = '<option value="">-- Select a Class --</option>';
        rankingsExamFilter.innerHTML = '<option value="">-- Select an Exam --</option>';
        if (yearId) {
            const classesInYear = allClassesCache.filter(c => c.academicYearId === yearId).sort((a, b) => a.className.localeCompare(b.className));
            classesInYear.forEach(c => { rankingsClassFilter.innerHTML += `<option value="${c.id}">${c.className}</option>`; });
            if (classesInYear.length > 0) {
                rankingsClassFilter.value = classesInYear[0].id;
                rankingsClassFilter.dispatchEvent(new Event('change'));
            }
        }
    });

    rankingsClassFilter.addEventListener('change', async () => {
        const yearId = rankingsYearFilter.value;
        const classId = rankingsClassFilter.value;
        rankingsExamFilter.innerHTML = '<option value="">-- Select an Exam --</option>';
        if (yearId && classId) {
            const settingsRef = doc(db, `artifacts/glckob-school-app/users/${userId}/settings`, yearId);
            const docSnap = await getDoc(settingsRef);
            let scoreEntryOptions = [];
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.semester1?.reportName) scoreEntryOptions.push({ key: 'sem1_report', name: data.semester1.reportName });
                if (data.semester2?.reportName) scoreEntryOptions.push({ key: 'sem2_report', name: data.semester2.reportName });
                if (data.endOfYearResultName) scoreEntryOptions.push({ key: 'end_year_result', name: data.endOfYearResultName });
            }
            rankingsExamFilter.innerHTML += scoreEntryOptions.map(opt => `<option value="${opt.key}">${opt.name}</option>`).join('');
            if (scoreEntryOptions.length > 0) {
                rankingsExamFilter.value = scoreEntryOptions[0].key;
                rankingsExamFilter.dispatchEvent(new Event('change'));
            }
        }
    });

    rankingsExamFilter.addEventListener('change', displayRankings);
    exportRankingsBtn.addEventListener('click', exportRankingsToExcel);

    // --- Initial Setup ---
    populateYearFilter();
});
