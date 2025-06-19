import { showToast, showLoader, hideLoader, getCookie } from './utils.js';

// ELEMENTOS DO DOM
export const notificationBell = document.getElementById('notification-bell');
export const notificationCount = document.getElementById('notification-count');
export const notificationsDropdown = document.getElementById('notifications-dropdown');
export const notificationsList = document.getElementById('notifications-list');
// Renomeado para evitar conflito com 'noResultsMessage' de outros módulos se eles fossem importados aqui
const noNotificationsMessageElem = document.getElementById('no-notifications-message'); 
export const markAllReadBtn = document.getElementById('mark-all-read');

let websocket; // A instância do WebSocket, gerenciada aqui

/**
 * Conecta ao WebSocket do dashboard para receber atualizações em tempo real.
 * @param {boolean} forceNew - Força uma nova conexão mesmo se já houver uma aberta.
 */
export function connectWebSocket(forceNew = false) {
    // Apenas conecta se a página precisar de notificações ou dashboard updates
    if (!notificationBell && window.location.pathname !== '/') {
        console.log("Página não requer WebSocket para notificações/dashboard.");
        return;
    }

    if (websocket && websocket.readyState === WebSocket.OPEN && !forceNew) {
        console.log("WebSocket já está conectado.");
        return;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const wsURL = wsProtocol + window.location.host + '/ws/dashboard/'; // URL do seu consumer

    websocket = new WebSocket(wsURL);

    websocket.onopen = () => {
        console.log("WebSocket conectado!");
        // Fetch inicial de notificações e contagem após a conexão (se aplicável)
        if (notificationBell) {
            fetchUnreadNotificationsCount();
        }
    };

    websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Mensagem WebSocket recebida:", data);
        if (data.type === 'dashboard_update') {
            // Se esta função estiver em um módulo compartilhado,
            // ou se dashboard_update for de fato um evento global
            // Você pode despachar um evento customizado aqui para o dashboard principal
            // document.dispatchEvent(new CustomEvent('dashboardUpdate', { detail: data.data }));
            // Ou chamar diretamente updateDashboardUI se esse módulo tiver acesso a ela
            // (Para simplicidade, mantive a chamada direta por enquanto, mas componentizar mais isolaria)
            // updateDashboardUI(data.data); // Assumindo que updateDashboardUI será importada ou acessível
        } else if (data.type === 'dashboard_message' && data.message_type === 'show_toast') {
            showToast(data.toast_message, data.toast_type);
        } else if (data.type === 'notification.update') {
            updateNotificationCountUI(data.unread_count);
        } else if (data.type === 'notification.new') {
            showToast(data.notification.titulo, 'info', 5000); // Exibe toast para nova notificação
            fetchNotifications(); // Atualiza a lista de notificações no dropdown
        }
    };

    websocket.onclose = (event) => {
        console.warn("WebSocket desconectado. Tentando reconectar em 3 segundos...", event.code, event.reason);
        setTimeout(() => connectWebSocket(true), 3000); // Tenta reconectar
    };

    websocket.onerror = (error) => {
        console.error("Erro no WebSocket:", error);
        websocket.close();
    };
}

/**
 * Busca a contagem de notificações não lidas e atualiza a UI.
 */
export async function fetchUnreadNotificationsCount() {
    showLoader();
    try {
        const response = await fetch('/api/notificacoes/'); // URL ATUALIZADA
        if (!response.ok) throw new Error('Erro ao buscar notificações');
        const data = await response.json();
        updateNotificationCountUI(data.unread_count);
    } catch (error) {
        console.error("Erro ao buscar contagem de notificações:", error);
    } finally {
        hideLoader();
    }
}

/**
 * Atualiza o contador visual de notificações não lidas no ícone do sino.
 * @param {number} count - O número de notificações não lidas.
 */
function updateNotificationCountUI(count) {
    if (notificationCount) {
        if (count > 0) {
            notificationCount.textContent = count;
            notificationCount.classList.remove('hidden');
            notificationBell.setAttribute('aria-label', `Ver ${count} novas notificações`);
            notificationCount.setAttribute('title', `${count} novas notificações`);
        } else {
            notificationCount.classList.add('hidden');
            notificationCount.textContent = '0';
            notificationBell.setAttribute('aria-label', 'Ver notificações');
            notificationCount.setAttribute('title', 'Nenhuma notificação');
        }
    }
}

/**
 * Busca e renderiza a lista de notificações no dropdown.
 */
export async function fetchNotifications() {
    showLoader();
    try {
        const response = await fetch('/api/notificacoes/'); // URL ATUALIZADA
        if (!response.ok) throw new Error('Erro ao buscar notificações.');
        const data = await response.json();
        
        notificationsList.innerHTML = ''; // Limpa a lista existente

        if (data.notifications.length === 0) {
            noNotificationsMessageElem.classList.remove('hidden');
            notificationsList.appendChild(noNotificationsMessageElem);
        } else {
            noNotificationsMessageElem.classList.add('hidden');
            data.notifications.forEach(notif => {
                const notifItem = document.createElement('div');
                notifItem.className = `px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${notif.lida ? 'text-gray-500' : 'text-gray-800 font-semibold'}`;
                notifItem.setAttribute('role', 'listitem');
                notifItem.setAttribute('aria-label', `${notif.lida ? 'Lida' : 'Não Lida'}: ${notif.titulo}. ${notif.mensagem}`);
                notifItem.dataset.notificationId = notif.id;
                notifItem.innerHTML = `
                    <p class="text-sm">${notif.titulo}</p>
                    <p class="text-xs text-gray-500">${notif.mensagem.substring(0, 50)}...</p>
                    <p class="text-xs text-gray-400 mt-1">${notif.data_criacao}</p>
                `;
                notifItem.addEventListener('click', () => handleNotificationClick(notif));
                notificationsList.appendChild(notifItem);
            });
        }
        updateNotificationCountUI(data.unread_count);
    } catch (error) {
        console.error("Erro ao carregar lista de notificações:", error);
        notificationsList.innerHTML = `<div class="px-4 py-3 text-red-500">Erro ao carregar notificações.</div>`;
    } finally {
        hideLoader();
    }
}

/**
 * Lida com o clique em uma notificação individual, marcando-a como lida e redirecionando.
 * @param {object} notif - O objeto de notificação.
 */
async function handleNotificationClick(notif) {
    if (!notif.lida) {
        await markNotificationAsRead(notif.id);
    }
    notificationsDropdown.classList.add('hidden'); // Fecha o dropdown ao clicar
    if (notif.link) {
        window.location.href = notif.link;
    }
}

/**
 * Marca uma notificação específica como lida no backend.
 * @param {number} notificationId - O ID da notificação a ser marcada.
 */
async function markNotificationAsRead(notificationId) {
    showLoader();
    try {
        const response = await fetch(`/api/notificacoes/lidas/${notificationId}/`, { // URL ATUALIZADA
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Erro ao marcar como lida');
        const data = await response.json();
        updateNotificationCountUI(data.unread_count);
        fetchNotifications();
    } catch (error) {
        console.error("Erro ao marcar notificação como lida:", error);
        showToast("Erro ao marcar notificação como lida.", "error");
    } finally {
        hideLoader();
    }
}

/**
 * Marca todas as notificações como lidas no backend.
 */
export async function markAllNotificationsAsRead() {
    showLoader();
    try {
        const response = await fetch(`/api/notificacoes/lidas/all/`, { // URL ATUALIZADA (endpoint para marcar todas como lidas)
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Erro ao marcar todas como lidas');
        const data = await response.json();
        updateNotificationCountUI(data.unread_count);
        fetchNotifications();
        showToast("Todas as notificações marcadas como lidas.", "success");
    } catch (error) {
        console.error("Erro ao marcar todas as notificações como lidas:", error);
        showToast("Erro ao marcar todas as notificações como lidas.", "error");
    } finally {
        hideLoader();
    }
}

/**
 * Inicializa os event listeners para o sino de notificações e seu dropdown.
 */
export function initializeNotifications() {
    if (notificationBell) {
        notificationBell.addEventListener('click', (event) => {
            event.stopPropagation();
            notificationsDropdown.classList.toggle('hidden');
            if (!notificationsDropdown.classList.contains('hidden')) {
                fetchNotifications();
            }
        });

        document.addEventListener('click', (event) => {
            if (notificationsDropdown && !notificationsDropdown.contains(event.target) && !notificationBell.contains(event.target)) {
                notificationsDropdown.classList.add('hidden');
            }
        });

        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', markAllNotificationsAsRead);
        }
        fetchUnreadNotificationsCount(); // Busca a contagem inicial ao carregar a página
    }
}