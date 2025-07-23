import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { allStudentsCache, allYearsCache, allClassesCache, allTeachersCache } from './store.js';

// --- DOM ELEMENTS ---
const statsYears = document.getElementById('stats-years');
const statsClasses = document.getElementById('stats-classes');
const statsTeachers = document.getElementById('stats-teachers');
const statsStudents = document.getElementById('stats-students');
const chartYearFilter = document.getElementById('chart-year-filter');
const studentGenderChartCanvas = document.getElementById('studentGenderChart');

let studentGenderChart = null;

// --- CHART RENDERING ---
function renderStudentGenderChart() {
    const selectedYearId = chartYearFilter.value;
    
    if (studentGenderChart) {
        studentGenderChart.destroy();
    }

    if (!selectedYearId || allStudentsCache.length === 0) {
        const ctx = studentGenderChartCanvas.getContext('2d');
        ctx.clearRect(0, 0, studentGenderChartCanvas.width, studentGenderChartCanvas.height);
        // Optionally show a message in the canvas
        ctx.font = "16px 'Noto Sans Khmer'";
        ctx.fillStyle = 'grey';
        ctx.textAlign = 'center';
        ctx.fillText('សូមជ្រើសរើសឆ្នាំសិក្សា', studentGenderChartCanvas.width / 2, studentGenderChartCanvas.height / 2);
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
                backgroundColor: ['rgba(54, 162, 235, 0.8)', 'rgba(255, 99, 132, 0.8)'],
                borderColor: ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { family: "'Noto Sans Khmer', sans-serif", size: 14 } }
                }
            }
        }
    });
}

// --- UPDATE STATS ---
function updateDashboardStats() {
    if (statsYears) statsYears.textContent = allYearsCache.length;
    if (statsClasses) statsClasses.textContent = allClassesCache.length;
    if (statsTeachers) statsTeachers.textContent = allTeachersCache.length;
    if (statsStudents) statsStudents.textContent = allStudentsCache.length;
    renderStudentGenderChart();
}


function populateChartYearFilter() {
    const sortedYears = [...allYearsCache].sort((a,b) => b.startYear - a.startYear);
    const yearOptionsHtml = '<option value="">-- ជ្រើសរើសឆ្នាំ --</option>' + sortedYears.map(year => `<option value="${year.id}">${year.name}</option>`).join('');
    if(chartYearFilter) {
        chartYearFilter.innerHTML = yearOptionsHtml;
        if(sortedYears.length > 0) {
            chartYearFilter.value = sortedYears[0].id; // Default to latest year
        }
    }
}


// --- INITIALIZATION ---
export function initDashboard({ db, appId, getUserId, addUnsubscribeListener }) {
    // Listeners for dashboard cards to switch views
    document.getElementById('dash-card-years').addEventListener('click', () => document.getElementById('nav-years').click());
    document.getElementById('dash-card-classes').addEventListener('click', () => document.getElementById('nav-classes').click());
    document.getElementById('dash-card-teachers').addEventListener('click', () => document.getElementById('nav-teachers').click());
    document.getElementById('dash-card-students').addEventListener('click', () => document.getElementById('nav-students').click());

    chartYearFilter.addEventListener('change', renderStudentGenderChart);

    // Subscribe to data changes to keep dashboard updated
    const collectionsToWatch = ['academic_years', 'classes', 'teachers', 'students'];
    collectionsToWatch.forEach(coll => {
        const unsubscribe = onSnapshot(collection(db, `artifacts/${appId}/users/${getUserId()}/${coll}`), () => {
             // We don't need the snapshot data here directly, as other modules will update the cache.
             // We just need to trigger a re-render of the dashboard stats.
             populateChartYearFilter();
             updateDashboardStats();
        });
        addUnsubscribeListener(unsubscribe);
    });
}
