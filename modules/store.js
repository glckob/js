// This module holds the global state (caches) for the application.

// --- STATE VARIABLES (CACHES) ---
export let userId = null;
export let schoolSettingsCache = {};
export let allYearsCache = [];
export let allTeachersCache = [];
export let allClassesCache = [];
export let allStudentsCache = [];
export let allSubjectsCache = [];
export let currentClassData = null; // For class detail view

let unsubscribeListeners = [];

// --- STATE MUTATORS ---
export function setUserId(id) {
    userId = id;
}

export function getUserId() {
    return userId;
}

export function setSchoolSettings(settings) {
    schoolSettingsCache = settings;
}

export function setYears(years) {
    allYearsCache = years;
}

export function setTeachers(teachers) {
    allTeachersCache = teachers;
}

export function setClasses(classes) {
    allClassesCache = classes;
}

export function setStudents(students) {
    allStudentsCache = students;
}

export function setSubjects(subjects) {
    allSubjectsCache = subjects;
}

export function setCurrentClassData(data) {
    currentClassData = data;
}

export function addUnsubscribeListener(listener) {
    unsubscribeListeners.push(listener);
}

export function clearUnsubscribeListeners() {
    unsubscribeListeners.forEach(unsub => unsub());
    unsubscribeListeners = [];
}

export function clearAllCaches() {
    schoolSettingsCache = {};
    allYearsCache = [];
    allTeachersCache = [];
    allClassesCache = [];
    allStudentsCache = [];
    allSubjectsCache = [];
    currentClassData = null;
}
