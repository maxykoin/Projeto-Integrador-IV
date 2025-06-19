import { showLoader, hideLoader, setupGlobalTooltips } from '/static/js/modules/utils.js';
import { connectWebSocket, initializeNotifications } from '/static/js/modules/notifications.js';
import { initializeModals } from '/static/js/modules/modals.js';
import { updateOrdersChart } from '/static/js/modules/charts.js';
import { newOrderForm, confirmOrderButton, initializeNewOrderPieceSelectors, handleConfirmOrderClick } from '/static/js/modules/newOrder.js';
// ===============================
// DOM ELEMENTS FOR DASHBOARD (HOME.HTML)
// ===============================
const totalPedidosEl = document.getElementById('total-pedidos');
const pedidosEmAndamentoEl = document.getElementById('pedidos-em-andamento');
const circuloQtdEl = document.getElementById('circulo-qtd');
const hexagonoQtdEl = document.getElementById('hexagono-qtd');
const quadradoQtdEl = document.getElementById('quadrado-qtd');
const lowStockAlertEl = document.querySelector('section[role="alert"]');

// ===============================
// UI UPDATE FUNCTIONS
// ===============================

function updateDashboardUI(data) {
    if (!totalPedidosEl || !pedidosEmAndamentoEl || !circuloQtdEl || !hexagonoQtdEl || !quadradoQtdEl) {
        console.warn("Dashboard UI elements not found. Skipping UI update.");
        return;
    }

    totalPedidosEl.textContent = data.em_andamento_count + data.concluido_count;
    pedidosEmAndamentoEl.textContent = data.em_andamento_count;

    for (const shapeType in data.stock_info) {
        const stockItem = data.stock_info[shapeType];
        let element;
        let parentDiv;

        if (shapeType === 'circulo') {
            element = circuloQtdEl;
            parentDiv = element.closest('.bg-[#1CA1C6]');
        } else if (shapeType === 'hexagono') {
            element = hexagonoQtdEl;
            parentDiv = element.closest('.bg-[#8ABF7A]');
        } else if (shapeType === 'quadrado') {
            element = quadradoQtdEl;
            parentDiv = element.closest('.bg-[#4B4382]');
        }

        if (element && parentDiv) {
            element.textContent = stockItem.quantity;
            if (stockItem.is_low_stock) {
                parentDiv.classList.add('border-4', 'border-red-500');
                if (lowStockAlertEl) {
                    lowStockAlertEl.style.display = 'block';
                }
            } else {
                parentDiv.classList.remove('border-4', 'border-red-500');
            }
        }
    }
}

// ===============================
// EVENT LISTENERS
// ===============================

document.addEventListener('dashboardUpdate', (event) => {
    updateDashboardUI(event.detail);
});

// ===============================
// APP INITIALIZATION
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    setupGlobalTooltips();
    connectWebSocket();
    initializeNotifications();

    // New Order Page Logic
    if (newOrderForm) {
        initializeNewOrderPieceSelectors();
        // Use an explicit if-check for addEventListener for wider compatibility.
        if (confirmOrderButton) { // This is the corrected part for line 50.
            confirmOrderButton.addEventListener('click', async (event) => {
                showLoader();
                await handleConfirmOrderClick(event);
                hideLoader();
            });
        }
    }

    // Historical Orders Page Logic (Modals and Search)
    initializeModals();

    // Charts for Historical Orders Page
    if (window.location.pathname === '/pedidos/historico') {
        updateOrdersChart('7days'); // Default to 7 days

        // Filter buttons for chart - also using explicit if-checks.
        const filter7DaysBtn = document.getElementById('filter7Days');
        const filter30DaysBtn = document.getElementById('filter30Days');
        const filterThisMonthBtn = document.getElementById('filterThisMonth');

        if (filter7DaysBtn) {
            filter7DaysBtn.addEventListener('click', () => updateOrdersChart('7days'));
        }
        if (filter30DaysBtn) {
            filter30DaysBtn.addEventListener('click', () => updateOrdersChart('30days'));
        }
        if (filterThisMonthBtn) {
            filterThisMonthBtn.addEventListener('click', () => updateOrdersChart('this_month'));
        }
    }
});