// This module contains shared UI functions like modals and toasts.

// --- TOAST NOTIFICATION ---
export function showToast(message, isError = false) {
    const toast = document.getElementById('toast-notification');
    const toastMessage = document.getElementById('toast-message');
    if (!toast || !toastMessage) return;
    
    toastMessage.textContent = message;
    toast.className = `toast max-w-xs text-white p-4 rounded-lg shadow-lg ${isError ? 'bg-red-600' : 'bg-green-600'} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// --- MODAL DIALOGS ---
export function createModal(id, title, content, footer) {
    const modalHTML = `
        <div id="${id}" class="modal fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 opacity-0 pointer-events-none">
            <div class="modal-content bg-white rounded-lg shadow-xl w-full max-w-lg m-4 transform -translate-y-10 flex flex-col max-h-[90vh]">
                <div class="flex-shrink-0 flex justify-between items-center p-4 border-b">
                    <h3 class="font-koulen text-xl">${title}</h3>
                    <button class="close-modal-btn text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
                </div>
                <div class="flex-grow p-6 overflow-y-auto">
                    ${content}
                </div>
                <div class="flex-shrink-0 flex justify-end p-4 bg-gray-50 border-t rounded-b-lg">
                    ${footer}
                </div>
            </div>
        </div>`;
    document.getElementById('modal-container').innerHTML = modalHTML;
    const modal = document.getElementById(id);
    modal.querySelector('.close-modal-btn').addEventListener('click', () => closeModal(id));
    return modal;
}

export function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modal.querySelector('.modal-content').classList.remove('-translate-y-10');
    }
}

export function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('opacity-0');
        modal.querySelector('.modal-content').classList.add('-translate-y-10');
        setTimeout(() => {
            modal.classList.add('pointer-events-none');
            // Check if the modal still exists before clearing the container
            if (document.getElementById(id)) {
                 document.getElementById('modal-container').innerHTML = '';
            }
        }, 250);
    }
}

// --- GENERIC LIST RENDERER ---
export function renderList(container, data, renderItemFn, emptyMessage) {
    if (!container) return;
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
