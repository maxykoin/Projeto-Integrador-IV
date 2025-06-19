import { showToast, showLoader, hideLoader, getCookie } from './utils.js';
import { API_ENDPOINTS } from './constants.js'; // Importando as URLs da API

// DOM Elements
export const notificationBell = document.getElementById('notification-bell');
export const notificationCount = document.getElementById('notification-count');
export const notificationsDropdown = document.getElementById('notifications-dropdown');
export const notificationsList = document.getElementById('notifications-list');
const noNotificationsMessageElem = document.getElementById('no-notifications-message');
export const markAllReadBtn = document.getElementById('mark-all-read');

let websocket = null; // Initialize to null

export function connectWebSocket(forceNew = false) {
    // Only proceed if the page requires websocket (e.g., dashboard or explicit notification bell)
    // or if forceNew is true to ensure a connection attempt regardless
    if (!notificationBell && window.location.pathname !== '/' && !forceNew) {
        console.log("Page does not require WebSocket for notifications/dashboard. Skipping connection.");
        return;
    }

    // If WebSocket is already open, and we're not forcing a new connection, just return.
    if (websocket && websocket.readyState === WebSocket.OPEN && !forceNew) {
        console.log("WebSocket already connected.");
        return;
    }

    // Close existing socket if it's not closed but not open (e.g., CONNECTING, CLOSING)
    if (websocket && websocket.readyState !== WebSocket.CLOSED) {
        console.log("Closing existing WebSocket connection before reconnecting.");
        websocket.close();
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const wsURL = wsProtocol + window.location.host + API_ENDPOINTS.DASHBOARD_WEBSOCKET; // wsURL is defined here

    console.log("Attempting to connect WebSocket to:", wsURL);

    try {
        websocket = new WebSocket(wsURL); // WebSocket instance is created here!

        websocket.onopen = () => {
            console.log("WebSocket connected!");
            if (notificationBell) {
                fetchUnreadNotificationsCount();
            }
        };

        // This onmessage handler is correctly placed AFTER the websocket is initialized
        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("WebSocket message received:", data);

            switch (data.type) {
                case 'dashboard_update':
                    // DISPATCHES A CUSTOM EVENT FOR THE MAIN DASHBOARD
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
                    showToast(data.notification.titulo, 'info', 5000); // Using the imported showToast
                    fetchNotifications();
                    break;
                default:
                    console.log('Unknown WebSocket message type:', data.type);
            }
        };

        websocket.onclose = (event) => {
            console.warn("WebSocket disconnected. Attempting to reconnect in 3 seconds...", event.code, event.reason);
            // Only attempt reconnect if the close was not initiated by an explicit close() call (code 1000 is normal closure)
            // or if it was an abnormal closure. Check if we really want to auto-reconnect on ALL closes.
            if (event.code !== 1000) { // 1000 is Normal Closure
                setTimeout(() => connectWebSocket(true), 3000);
            }
        };

        websocket.onerror = (error) => {
            console.error("WebSocket error:", error);
            // Close the socket to trigger onclose handler for potential reconnect
            if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
                websocket.close();
            }
        };

    } catch (error) {
        console.error("Failed to establish WebSocket connection:", error);
        // Ensure websocket is null if construction failed
        websocket = null;
    }
}

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

export async function fetchNotifications() {
    showLoader();
    try {
        const response = await fetch(API_ENDPOINTS.NOTIFICATIONS);
        if (!response.ok) throw new Error(`Failed to fetch notifications: ${response.statusText}`);
        const data = await response.json();

        notificationsList.innerHTML = '';

        if (data.notifications.length === 0) {
            // Ensure the message element is shown when there are no notifications
            if (noNotificationsMessageElem) {
                 noNotificationsMessageElem.classList.remove('hidden');
                 notificationsList.appendChild(noNotificationsMessageElem); // Append it to the list
            }
        } else {
            if (noNotificationsMessageElem) {
                noNotificationsMessageElem.classList.add('hidden');
            }
            data.notifications.forEach(notif => {
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
        updateNotificationCountUI(data.unread_count);
    } catch (error) {
        console.error("Error loading notification list:", error);
        if (notificationsList) {
            notificationsList.innerHTML = `<div class="px-4 py-3 text-red-500">Error loading notifications.</div>`;
        }
    } finally {
        hideLoader();
    }
}

async function handleNotificationClick(notif) {
    if (!notif.lida) {
        await markNotificationAsRead(notif.id);
    }
    // Ensure dropdown exists before trying to hide it
    if (notificationsDropdown) {
        notificationsDropdown.classList.add('hidden');
    }
    if (notif.link) {
        window.location.href = notif.link;
    }
}

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

export async function markAllNotificationsAsRead() {
    showLoader();
    try {
        const response = await fetch(API_ENDPOINTS.MARK_ALL_NOTIFICATIONS_READ, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error(`Failed to mark all as read: ${response.statusText}`);
        const data = await response.json();
        updateNotificationCountUI(data.unread_count);
        fetchNotifications();
        showToast("All notifications marked as read.", "success");
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        showToast("Error marking all notifications as read.", "error");
    } finally {
        hideLoader();
    }
}

export function initializeNotifications() {
    if (notificationBell) {
        notificationBell.addEventListener('click', (event) => {
            event.stopPropagation();
            if (notificationsDropdown) { // Check if dropdown exists before toggling
                notificationsDropdown.classList.toggle('hidden');
                if (!notificationsDropdown.classList.contains('hidden')) {
                    fetchNotifications();
                }
            }
        });

        document.addEventListener('click', (event) => {
            // Check if dropdown and bell exist before trying to access their contains method
            if (notificationsDropdown && notificationBell && !notificationsDropdown.contains(event.target) && !notificationBell.contains(event.target)) {
                notificationsDropdown.classList.add('hidden');
            }
        });

        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', markAllNotificationsAsRead);
        }
        fetchUnreadNotificationsCount(); // Initial fetch
    }
}