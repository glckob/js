/* ======================================================================= */
/* FILE: js/settings.js (For settings.html only)                           */
/* ======================================================================= */

// --- Imports from the main script ---
import { db, userId, allYearsCache, showToast } from './main.js';
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Wait for the 'dataReady' event from main.js ---
document.addEventListener('dataReady', async () => {
    
    // --- DOM Elements for this page ---
    const schoolNameInput = document.getElementById('school-name-input');
    const directorStampUrlInput = document.getElementById('director-stamp-url');
    const qrLinkUrlInput = document.getElementById('qr-link-url');
    const saveSchoolInfoBtn = document.getElementById('save-school-info-btn');
    const stampPreview = document.getElementById('stamp-preview');
    const qrCodePreviewContainer = document.getElementById('qr-code-preview');
    const settingsYearSelect = document.getElementById('settings-year-select');
    const semesterSettingsForm = document.getElementById('semester-settings-form');
    let qrCodeInstance = null;
    const khmerMonths = ["", "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];

    // --- Functions for this page ---

    /**
     * Updates the stamp and QR code previews based on input values.
     */
    function updatePreviews() {
        const stampUrl = directorStampUrlInput.value;
        stampPreview.src = stampUrl || '';
        stampPreview.classList.toggle('hidden', !stampUrl);

        const qrUrl = qrLinkUrlInput.value.trim();
        qrCodePreviewContainer.innerHTML = '';
        if (qrUrl) {
            qrCodeInstance = new QRCode(qrCodePreviewContainer, {
                text: qrUrl,
                width: 120,
                height: 120,
            });
        }
    }

    /**
     * Loads general school settings from Firestore.
     */
    async function loadSchoolSettings() {
        const settingsRef = doc(db, `artifacts/glckob-school-app/users/${userId}/settings`, 'general');
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            schoolNameInput.value = data.schoolName || '';
            directorStampUrlInput.value = data.directorStampUrl || '';
            qrLinkUrlInput.value = data.qrLinkUrl || '';
        }
        updatePreviews();
    }
    
    /**
     * Populates the dropdown with Khmer month names.
     */
    function populateMonthDropdowns() {
        const monthSelects = document.querySelectorAll('select.semester-month-input');
        const monthOptions = khmerMonths.map(month => `<option value="${month}">${month || '-- Select Month --'}</option>`).join('');
        monthSelects.forEach(select => {
            select.innerHTML = monthOptions;
        });
    }

    /**
     * Populates the academic year dropdown and sets a default value.
     */
    function populateAndSetYearFilter() {
        const yearOptions = allYearsCache.map(year => `<option value="${year.id}">${year.name}</option>`).join('');
        settingsYearSelect.innerHTML = `<option value="">-- Select a Year --</option>${yearOptions}`;
        if (allYearsCache.length > 0) {
            settingsYearSelect.value = allYearsCache[0].id;
            settingsYearSelect.dispatchEvent(new Event('change'));
        }
    }

    // --- Event Listeners ---

    saveSchoolInfoBtn.addEventListener('click', async () => {
        const settingsRef = doc(db, `artifacts/glckob-school-app/users/${userId}/settings`, 'general');
        try {
            await setDoc(settingsRef, { 
                schoolName: schoolNameInput.value.trim(),
                directorStampUrl: directorStampUrlInput.value.trim(),
                qrLinkUrl: qrLinkUrlInput.value.trim()
            }, { merge: true });
            showToast('School information saved successfully.');
        } catch (error) {
            showToast('Error saving school information.', true);
            console.error(error);
        }
    });

    directorStampUrlInput.addEventListener('input', updatePreviews);
    qrLinkUrlInput.addEventListener('input', updatePreviews);

    settingsYearSelect.addEventListener('change', async (e) => {
        const yearId = e.target.value;
        if (yearId) {
            semesterSettingsForm.classList.remove('hidden');
            const settingsRef = doc(db, `artifacts/glckob-school-app/users/${userId}/settings`, yearId);
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Populate form with existing data
                document.getElementById('start-year-test-input').value = data.startOfYearTestName || '';
                document.querySelectorAll('select.semester-month-input').forEach(input => {
                    const sem = input.dataset.semester;
                    const month = input.dataset.month;
                    input.value = data[`semester${sem}`]?.[`month${month}`] || '';
                });
                document.querySelector('[data-semester="1"][data-month="7"]').value = data.semester1?.monthExamName || '';
                document.getElementById('semester1-exam-input').value = data.semester1?.examName || '';
                document.getElementById('semester1-report-name').value = data.semester1?.reportName || '';
                document.querySelector('[data-semester="2"][data-month="7"]').value = data.semester2?.monthExamName || '';
                document.getElementById('semester2-exam-input').value = data.semester2?.examName || '';
                document.getElementById('semester2-report-name').value = data.semester2?.reportName || '';
                document.getElementById('end-year-result-input').value = data.endOfYearResultName || '';
            } else {
                semesterSettingsForm.reset();
                populateMonthDropdowns(); // Reset dropdowns to default state
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
            semester1: {},
            semester2: {}
        };
        
        document.querySelectorAll('.semester-month-input, .semester-month-exam-input').forEach(input => {
            const sem = input.dataset.semester;
            const month = input.dataset.month;
            if(month === '7') {
                 settingsData[`semester${sem}`].monthExamName = input.value;
            } else {
                 settingsData[`semester${sem}`][`month${month}`] = input.value;
            }
        });
        settingsData.semester1.examName = document.getElementById('semester1-exam-input').value;
        settingsData.semester1.reportName = document.getElementById('semester1-report-name').value;
        settingsData.semester2.examName = document.getElementById('semester2-exam-input').value;
        settingsData.semester2.reportName = document.getElementById('semester2-report-name').value;

        const settingsRef = doc(db, `artifacts/glckob-school-app/users/${userId}/settings`, yearId);
        try {
            await setDoc(settingsRef, settingsData);
            showToast('Semester settings saved successfully.');
        } catch(error) {
            showToast('Error saving semester settings.', true);
            console.error(error);
        }
    });

    // --- Initial Setup ---
    loadSchoolSettings();
    populateMonthDropdowns();
    populateAndSetYearFilter();
});
