const toastContainer = document.getElementById('toast-container');
const globalTooltip = document.getElementById('global-tooltip');

export function showToast(message, type, duration = 3000) {
    if (!toastContainer) {
        console.warn("Toast container not found!");
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    void toast.offsetWidth; // Force reflow for transition

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duration);
}

export function showLoader() {
    const loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.className = 'fixed inset-0 flex items-center justify-center bg-gray-200 bg-opacity-75 z-[9999]';
    loader.innerHTML = `
        <div class="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-purple-500"></div>
        <p class="ml-4 text-gray-700 text-lg">Loading...</p>
    `;
    document.body.appendChild(loader);
}

export function hideLoader() {
    document.getElementById('global-loader')?.remove();
}

export function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function updateTooltipPosition(targetElement) {
    if (!globalTooltip || !targetElement) return;

    const tooltipText = targetElement.getAttribute('data-tooltip');
    if (!tooltipText) {
        globalTooltip.classList.add('hidden');
        globalTooltip.setAttribute('aria-hidden', 'true');
        return;
    }

    globalTooltip.textContent = tooltipText;
    const rect = targetElement.getBoundingClientRect();

    globalTooltip.classList.remove('hidden');

    let tooltipLeft = rect.left + window.scrollX + (rect.width / 2);
    if (tooltipLeft + globalTooltip.offsetWidth / 2 > window.innerWidth) {
        tooltipLeft = window.innerWidth - (globalTooltip.offsetWidth / 2) - 10;
    }
    if (tooltipLeft - globalTooltip.offsetWidth / 2 < 0) {
        tooltipLeft = (globalTooltip.offsetWidth / 2) + 10;
    }
    
    globalTooltip.style.left = `${tooltipLeft}px`;
    globalTooltip.style.transform = `translateX(-50%)`;

    let tooltipTop = rect.bottom + window.scrollY + 10;
    if (tooltipTop + globalTooltip.offsetHeight > window.innerHeight + window.scrollY) {
        tooltipTop = rect.top + window.scrollY - globalTooltip.offsetHeight - 10;
    }
    
    globalTooltip.style.top = `${tooltipTop}px`;
    globalTooltip.setAttribute('aria-hidden', 'false');
}

export function setupGlobalTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(element => {
        element.addEventListener('mouseenter', (e) => updateTooltipPosition(e.target));
        element.addEventListener('mouseleave', () => {
            if (globalTooltip) {
                globalTooltip.classList.add('hidden');
                globalTooltip.setAttribute('aria-hidden', 'true');
            }
        });
        element.addEventListener('focus', (e) => updateTooltipPosition(e.target));
        element.addEventListener('blur', () => {
            if (globalTooltip) {
                globalTooltip.classList.add('hidden');
                globalTooltip.setAttribute('aria-hidden', 'true');
            }
        });
    });
}