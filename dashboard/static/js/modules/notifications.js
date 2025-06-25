import { showToast, showLoader, hideLoader } from './utils.js';

const notificationBell = document.getElementById('notification-bell');
const notificationCount = document.getElementById('notification-count');
const notificationsDropdown = document.getElementById('notifications-dropdown');
const notificationsList = document.getElementById('notifications-list');
const noNotificationsMessageElem = document.getElementById('no-notifications-message');
const markAllReadBtn = document.getElementById('mark-all-read');

let websocket = null;

export function connectWebSocket(forceNew = false) {
    if (!notificationBell && window.location.pathname !== '/' && !forceNew) return;
    if (websocket && websocket.readyState === WebSocket.OPEN && !forceNew) return;
    if (websocket && websocket.readyState !== WebSocket.CLOSED) websocket.close();

    const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const wsURL = wsProtocol + window.location.host + '/ws/dashboard/';

    websocket = new WebSocket(wsURL);

    websocket.onopen = () => console.log("WebSocket connected!");

    websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
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
                updateNotificationCountUI(data.unread_count);
                break;
            case 'notification.new':
                showToast(data.notification.titulo, 'info', 5000);
                updateNotificationCountUI(data.unread_count);
                break;
            case 'notifications.list':
                renderNotificationsList(data.notifications, data.unread_count);
                break;
            default:
                console.log('Unknown WebSocket message type:', data.type);
        }
    };

    websocket.onclose = (event) => {
        console.warn("WebSocket disconnected. Reconnecting in 3s...", event.code, event.reason);
        if (event.code !== 1000) setTimeout(() => connectWebSocket(true), 3000);
    };

    websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) websocket.close();
    };
}

function updateNotificationCountUI(count) {
    if (!notificationCount) return;
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

function renderNotificationsList(notifications, unreadCount) {
    if (!notificationsList) return;
    notificationsList.innerHTML = '';
    if (notifications.length === 0) {
        if (noNotificationsMessageElem) {
            noNotificationsMessageElem.classList.remove('hidden');
            notificationsList.appendChild(noNotificationsMessageElem);
        }
    } else {
        noNotificationsMessageElem?.classList.add('hidden');
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
    if (!notif.lida && websocket?.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({ type: 'mark_notification_read', notification_id: notif.id }));
    } else if (!notif.lida) {
        showToast("WebSocket não conectado. Tente recarregar a página.", "error");
    }
    notificationsDropdown?.classList.add('hidden');
    if (notif.link) window.location.href = notif.link;
}

export async function markAllNotificationsAsRead() {
    showLoader();
    if (websocket?.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({ type: 'mark_all_notifications_read' }));
        showToast("Todas as notificações marcadas como lidas.", "success");
    } else {
        showToast("WebSocket não conectado. Tente recarregar a página.", "error");
        hideLoader();
    }
}

export function initializeNotifications() {
    if (!notificationBell) return;

    notificationBell.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!notificationsDropdown) return;
        notificationsDropdown.classList.toggle('hidden');
        if (!notificationsDropdown.classList.contains('hidden') && websocket?.readyState === WebSocket.OPEN) {
            showLoader();
            websocket.send(JSON.stringify({ type: 'fetch_notifications' }));
        } else if (!notificationsDropdown.classList.contains('hidden')) {
            showToast("WebSocket não conectado. Tente recarregar a página.", "error");
        }
    });

    document.addEventListener('click', (e) => {
        if (notificationsDropdown && notificationBell && !notificationsDropdown.contains(e.target) && !notificationBell.contains(e.target)) {
            notificationsDropdown.classList.add('hidden');
        }
    });

    markAllReadBtn?.addEventListener('click', markAllNotificationsAsRead);
}