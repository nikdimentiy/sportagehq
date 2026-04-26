let toastElement = null;
let toastTimeout = null;

function ensureToastElement() {
    if (!toastElement) {
        toastElement = document.getElementById('toast');

        if (!toastElement) {
            toastElement = document.createElement('div');
            toastElement.id = 'toast';
            toastElement.className = 'toast';
            document.body.appendChild(toastElement);
        }
    }
    return toastElement;
}

export function showToast(msg, type = 'info') {
    const toast = ensureToastElement();

    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    toast.textContent = msg;
    toast.classList.add('show');

    if (type === 'error') {
        toast.style.borderColor = 'rgba(255,61,113,0.3)';
        toast.style.backgroundColor = 'rgba(255,61,113,0.1)';
        toast.style.color = '#ff3d71';
    } else if (type === 'warn') {
        toast.style.borderColor = 'rgba(255,171,0,0.3)';
        toast.style.backgroundColor = 'rgba(255,171,0,0.1)';
        toast.style.color = '#ffab00';
    } else {
        toast.style.borderColor = 'rgba(0,229,255,0.3)';
        toast.style.backgroundColor = 'var(--bg-elevated)';
        toast.style.color = 'var(--text-1)';
    }

    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
        toastTimeout = null;
    }, 2400);
}

export function hideToast() {
    const toast = ensureToastElement();
    if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = null;
    }
    toast.classList.remove('show');
}
