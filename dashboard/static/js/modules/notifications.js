import { showToast, showLoader, hideLoader, getCookie } from './utils.js';
// API_ENDPOINTS não será mais usado diretamente para notificações no front-end
// import { API_ENDPOINTS } from './constants.js'; // REMOVIDO: Não precisamos mais importar a API_ENDPOINTS para notificações

// DOM Elements
export const notificationBell = document.getElementById('notification-bell');
export const notificationCount = document.getElementById('notification-count');
export const notificationsDropdown = document.getElementById('notifications-dropdown');
export const notificationsList = document.getElementById('notifications-list');
const noNotificationsMessageElem = document.getElementById('no-notifications-message');
export const markAllReadBtn = document.getElementById('mark-all-read');

let websocket = null;

export function connectWebSocket(forceNew = false) {
    if (!notificationBell && window.location.pathname !== '/' && !forceNew) {
        console.log("Page does not require WebSocket for notifications/dashboard. Skipping connection.");
        return;
    }

    if (websocket && websocket.readyState === WebSocket.OPEN && !forceNew) {
        console.log("WebSocket already connected.");
        return;
    }

    if (websocket && websocket.readyState !== WebSocket.CLOSED) {
        console.log("Closing existing WebSocket connection before reconnecting.");
        websocket.close();
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    // A URL do WebSocket é direta para o consumer
    const wsURL = wsProtocol + window.location.host + '/ws/dashboard/'; // Ajuste para a URL real do seu consumer

    console.log("Attempting to connect WebSocket to:", wsURL);

    try {
        websocket = new WebSocket(wsURL);

        websocket.onopen = () => {
            console.log("WebSocket connected!");
            // Ao conectar, o consumer já envia os dados iniciais de notificações e dashboard.
            // Nenhuma chamada fetchHTTP é necessária aqui.
        };

        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("WebSocket message received:", data);

            switch (data.type) {
                case 'dashboard_update':
                    document.dispatchEvent(new CustomEvent('dashboardUpdate', { detail: data.data }));
                    break;
                case 'dashboard_message':
                    if (data.message_type === 'show_toast') {
                        showToast(data.toast_message, data.toast_type);
                    }
                    break;
                case 'notification.update':
                    // Este tipo é para atualizar apenas a contagem de não lidas
                    updateNotificationCountUI(data.unread_count);
                    break;
                case 'notification.new':
                    // Este tipo é para uma nova notificação (com dados completos)
                    showToast(data.notification.titulo, 'info', 5000);
                    updateNotificationCountUI(data.unread_count); // Atualiza a contagem também
                    // A lista de notificações será atualizada quando o dropdown for aberto ou em outra ação
                    break;
                case 'notifications.list': // Tipo para receber a lista completa de notificações
                    renderNotificationsList(data.notifications, data.unread_count);
                    break;
                default:
                    console.log('Unknown WebSocket message type:', data.type);
            }
        };

        websocket.onclose = (event) => {
            console.warn("WebSocket disconnected. Attempting to reconnect in 3 seconds...", event.code, event.reason);
            if (event.code !== 1000) {
                setTimeout(() => connectWebSocket(true), 3000);
            }
        };

        websocket.onerror = (error) => {
            console.error("WebSocket error:", error);
            if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
                websocket.close();
            }
        };

    } catch (error) {
        console.error("Failed to establish WebSocket connection:", error);
        websocket = null;
    }
}

// REMOVIDO: A função fetchUnreadNotificationsCount não é mais necessária, pois
// a contagem inicial e as atualizações vêm via WebSocket do consumer.
/*
export async function fetchUnreadNotificationsCount() {
    showLoader();
    try {
        const response = await fetch(API_ENDPOINTS.NOTIFICATIONS);
        if (!response.ok) throw new Error(`Failed to fetch notifications: ${response.statusText}`);
        const data = await response.json();
        updateNotificationCountUI(data.unread_count);
    } catch (error) {
        console.error("Error fetching notification count:", error);
    } finally {
        hideLoader();
    }
}
*/

function updateNotificationCountUI(count) {
    if (notificationCount) {
        if (count > 0) {
            notificationCount.textContent = count;
            notificationCount.classList.remove('hidden');
            notificationBell.setAttribute('aria-label', `View ${count} new notifications`);
            notificationCount.setAttribute('title', `${count} new notifications`);
        } else {
            notificationCount.classList.add('hidden');
            notificationCount.textContent = '0';
            notificationBell.setAttribute('aria-label', 'View notifications');
            notificationCount.setAttribute('title', 'No notifications');
        }
    }
}

function renderNotificationsList(notifications, unreadCount) {
    notificationsList.innerHTML = ''; // Limpa a lista existente

    if (notifications.length === 0) {
        if (noNotificationsMessageElem) {
            noNotificationsMessageElem.classList.remove('hidden');
            notificationsList.appendChild(noNotificationsMessageElem);
        }
    } else {
        if (noNotificationsMessageElem) {
            noNotificationsMessageElem.classList.add('hidden');
        }
        notifications.forEach(notif => {
            const notifItem = document.createElement('div');
            notifItem.className = `px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${notif.lida ? 'text-gray-500' : 'text-gray-800 font-semibold'}`;
            notifItem.setAttribute('role', 'listitem');
            notifItem.setAttribute('aria-label', `${notif.lida ? 'Read' : 'Unread'}: ${notif.titulo}. ${notif.mensagem}`);
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
    updateNotificationCountUI(unreadCount);
    hideLoader();
}

async function handleNotificationClick(notif) {
    if (!notif.lida) {
        // Envia mensagem para o WebSocket marcar como lida
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
                type: 'mark_notification_read',
                notification_id: notif.id
            }));
        } else {
            console.error("WebSocket not open. Cannot mark notification as read.");
            showToast("WebSocket não conectado. Tente recarregar a página.", "error");
        }
    }
    if (notificationsDropdown) {
        notificationsDropdown.classList.add('hidden');
    }
    if (notif.link) {
        window.location.href = notif.link;
    }
}

// REMOVIDO: A função markNotificationAsRead não é mais necessária,
// a ação é enviada via WebSocket.
/*
async function markNotificationAsRead(notificationId) {
    showLoader();
    try {
        const response = await fetch(API_ENDPOINTS.MARK_NOTIFICATION_READ(notificationId), {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error(`Failed to mark as read: ${response.statusText}`);
        const data = await response.json();
        updateNotificationCountUI(data.unread_count);
        fetchNotifications();
    } catch (error) {
        console.error("Error marking notification as read:", error);
        showToast("Error marking notification as read.", "error");
    } finally {
        hideLoader();
    }
}
*/

export async function markAllNotificationsAsRead() {
    showLoader();
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
            type: 'mark_all_notifications_read'
        }));
        showToast("Todas as notificações marcadas como lidas.", "success");
        // Não precisa de fetchNotifications() aqui, o WS enviará a atualização.
    } else {
        console.error("WebSocket not open. Cannot mark all notifications as read.");
        showToast("WebSocket não conectado. Tente recarregar a página.", "error");
        hideLoader();
    }
}

export function initializeNotifications() {
    if (notificationBell) {
        notificationBell.addEventListener('click', (event) => {
            event.stopPropagation();
            if (notificationsDropdown) {
                notificationsDropdown.classList.toggle('hidden');
                if (!notificationsDropdown.classList.contains('hidden')) {
                    // Ao abrir o dropdown, solicitamos ao WebSocket a lista completa
                    if (websocket && websocket.readyState === WebSocket.OPEN) {
                        showLoader();
                        websocket.send(JSON.stringify({ type: 'fetch_notifications' }));
                    } else {
                        console.error("WebSocket not open. Cannot fetch notifications.");
                        showToast("WebSocket não conectado. Tente recarregar a página.", "error");
                    }
                }
            }
        });

        document.addEventListener('click', (event) => {
            if (notificationsDropdown && notificationBell && !notificationsDropdown.contains(event.target) && !notificationBell.contains(event.target)) {
                notificationsDropdown.classList.add('hidden');
            }
        });

        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', markAllNotificationsAsRead);
        }
        // REMOVIDO: A contagem inicial será enviada pelo consumer no connect.
        // fetchUnreadNotificationsCount(); // Initial fetch
    }
}
