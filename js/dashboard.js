/* ======================================================================= */
/* FILE: js/dashboard.js (For index.html only)                             */
/* ======================================================================= */

// --- Imports from the main script ---
import { allYearsCache, allTeachersCache, allStudentsCache, allClassesCache } from './main.js';

// --- Wait for the 'dataReady' event from main.js ---
document.addEventListener('dataReady', () => {
    
    // --- DOM Elements specific to the dashboard ---
    const statsYears = document.getElementById('stats-years');
    const statsClasses = document.getElementById('stats-classes');
    const statsTeachers = document.getElementById('stats-teachers');
    const statsStudents = document.getElementById('stats-students');
    const chartYearFilter = document.getElementById('chart-year-filter');
    const studentGenderChartCanvas = document.getElementById('studentGenderChart');
    let studentGenderChart = null;

    // --- Functions for this page ---
    function updateDashboardStats() { 
        statsYears.textContent = allYearsCache.length; 
        statsClasses.textContent = allClassesCache.length; 
        statsTeachers.textContent = allTeachersCache.length; 
        statsStudents.textContent = allStudentsCache.length; 
    }

    function populateChartYearFilter() { 
        chartYearFilter.innerHTML = allYearsCache.map(year => `<option value="${year.id}">${year.name}</option>`).join(''); 
        if (allYearsCache.length > 0) { 
            chartYearFilter.value = allYearsCache[0].id; 
        } 
    }

    function renderStudentGenderChart() { 
        const selectedYearId = chartYearFilter.value; 
        if (studentGenderChart) { 
            studentGenderChart.destroy(); 
        } 
        if (!selectedYearId) return; 

        const classesInYear = allClassesCache.filter(c => c.academicYearId === selectedYearId); 
        const studentIdsInYear = new Set(classesInYear.flatMap(c => c.studentIds || [])); 
        const studentsInYear = allStudentsCache.filter(s => studentIdsInYear.has(s.id)); 

        const maleCount = studentsInYear.filter(s => s.gender === 'ប្រុស').length; 
        const femaleCount = studentsInYear.filter(s => s.gender === 'ស្រី').length; 

        const ctx = studentGenderChartCanvas.getContext('2d'); 
        studentGenderChart = new Chart(ctx, { 
            type: 'pie', 
            data: { 
                labels: ['Male Students', 'Female Students'], 
                datasets: [{ 
                    data: [maleCount, femaleCount], 
                    backgroundColor: ['rgba(54, 162, 235, 0.8)', 'rgba(255, 99, 132, 0.8)'], 
                }] 
            }, 
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { position: 'top' } } 
            } 
        }); 
    }

    // --- Initial Setup and Event Listeners ---
    updateDashboardStats(); 
    populateChartYearFilter(); 
    renderStudentGenderChart();
    
    chartYearFilter.addEventListener('change', renderStudentGenderChart);
    document.getElementById('dash-card-years').addEventListener('click', () => window.location.href = 'years.html');
    document.getElementById('dash-card-classes').addEventListener('click', () => window.location.href = 'classes.html');
    document.getElementById('dash-card-teachers').addEventListener('click', () => window.location.href = 'teachers.html');
    document.getElementById('dash-card-students').addEventListener('click', () => window.location.href = 'students.html');
});