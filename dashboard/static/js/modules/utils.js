// ELEMENTOS DO DOM (apenas os que são globais e usados por utils)
const toastContainer = document.getElementById('toast-container');

/**
 * Exibe uma notificação toast na tela.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de toast ('success', 'error', 'info', 'warning').
 * @param {number} duration - Duração em milissegundos (padrão: 3000ms).
 */
export function showToast(message, type, duration = 3000) {
    if (!toastContainer) {
        console.warn("Contêiner de Toast não encontrado!");
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    void toast.offsetWidth; // Força o reflow para garantir a transição

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        }, { once: true });
    }, duration);
}

/**
 * Mostra um loader/spinner global na tela.
 */
export function showLoader() {
    const loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.className = 'fixed inset-0 flex items-center justify-center bg-gray-200 bg-opacity-75 z-[9999]';
    loader.innerHTML = `
        <div class="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-purple-500"></div>
        <p class="ml-4 text-gray-700 text-lg">Carregando...</p>
    `;
    document.body.appendChild(loader);
}

/**
 * Esconde o loader/spinner global da tela.
 */
export function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.remove();
    }
}

/**
 * Obtém o valor de um cookie pelo nome.
 * Necessário para enviar o CSRF token em requisições POST.
 * @param {string} name - O nome do cookie.
 * @returns {string|null} O valor do cookie ou null se não encontrado.
 */
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

// Tooltip Global (Para aprimorar a exibição do tooltip e evitar cortes)
// Certifique-se de que esta div exista no seu HTML, no final do <body>:
// <div id="global-tooltip" class="fixed hidden bg-gray-900 text-white p-2 rounded text-sm z-[9999]" aria-hidden="true"></div>
const globalTooltip = document.getElementById('global-tooltip');

/**
 * Configura os event listeners para todos os elementos com data-tooltip,
 * gerenciando a exibição e posicionamento do tooltip global.
 */
export function setupGlobalTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(element => {
        element.addEventListener('mouseenter', (e) => {
            const tooltipText = e.target.getAttribute('data-tooltip');
            if (tooltipText && globalTooltip) {
                globalTooltip.textContent = tooltipText;
                const rect = e.target.getBoundingClientRect();
                
                let tooltipTop = rect.bottom + window.scrollY + 10; // 10px de espaçamento abaixo
                let tooltipLeft = rect.left + window.scrollX + (rect.width / 2);

                globalTooltip.classList.remove('hidden'); // Exibe para pegar a largura
                
                // Ajustar se o tooltip sair da tela à direita/esquerda
                if (tooltipLeft + globalTooltip.offsetWidth / 2 > window.innerWidth) {
                    tooltipLeft = window.innerWidth - (globalTooltip.offsetWidth / 2) - 10;
                }
                if (tooltipLeft - globalTooltip.offsetWidth / 2 < 0) {
                    tooltipLeft = (globalTooltip.offsetWidth / 2) + 10;
                }
                
                globalTooltip.style.left = `${tooltipLeft}px`;
                globalTooltip.style.transform = `translateX(-50%)`;

                // Ajustar se o tooltip sair da tela na parte inferior (tentar posicionar acima)
                if (tooltipTop + globalTooltip.offsetHeight > window.innerHeight + window.scrollY) {
                    tooltipTop = rect.top + window.scrollY - globalTooltip.offsetHeight - 10;
                }
                
                globalTooltip.style.top = `${tooltipTop}px`;
                globalTooltip.setAttribute('aria-hidden', 'false');
            }
        });

        element.addEventListener('mouseleave', () => {
            if (globalTooltip) {
                globalTooltip.classList.add('hidden');
                globalTooltip.setAttribute('aria-hidden', 'true');
            }
        });

        element.addEventListener('focus', (e) => { // Para acessibilidade via teclado
             const tooltipText = e.target.getAttribute('data-tooltip');
             if (tooltipText && globalTooltip) {
                 globalTooltip.textContent = tooltipText;
                 const rect = e.target.getBoundingClientRect();
                 let tooltipTop = rect.bottom + window.scrollY + 10;
                 let tooltipLeft = rect.left + window.scrollX + (rect.width / 2);

                 globalTooltip.classList.remove('hidden');
                 
                 if (tooltipLeft + globalTooltip.offsetWidth / 2 > window.innerWidth) {
                     tooltipLeft = window.innerWidth - (globalTooltip.offsetWidth / 2) - 10;
                 }
                 if (tooltipLeft - globalTooltip.offsetWidth / 2 < 0) {
                     tooltipLeft = (globalTooltip.offsetWidth / 2) + 10;
                 }
                 
                 globalTooltip.style.left = `${tooltipLeft}px`;
                 globalTooltip.style.transform = `translateX(-50%)`;
                 
                 if (tooltipTop + globalTooltip.offsetHeight > window.innerHeight + window.scrollY) {
                     tooltipTop = rect.top + window.scrollY - globalTooltip.offsetHeight - 10;
                 }
                 globalTooltip.style.top = `${tooltipTop}px`;
                 globalTooltip.setAttribute('aria-hidden', 'false');
             }
        });

        element.addEventListener('blur', () => { // Para acessibilidade via teclado
            if (globalTooltip) {
                globalTooltip.classList.add('hidden');
                globalTooltip.setAttribute('aria-hidden', 'true');
            }
        });
    });
}