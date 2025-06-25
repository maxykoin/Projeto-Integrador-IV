import { showLoader, hideLoader, setupGlobalTooltips } from '/static/js/modules/utils.js';
import { connectWebSocket, initializeNotifications } from '/static/js/modules/notifications.js';
import { initializeModals } from '/static/js/modules/modals.js';
import { updateOrdersChart } from '/static/js/modules/charts.js';
import { newOrderForm, confirmOrderButton, initializeNewOrderPieceSelectors, handleConfirmOrderClick } from '/static/js/modules/newOrder.js';

const totalPedidosEl = document.getElementById('total-pedidos');
const pedidosEmAndamentoEl = document.getElementById('pedidos-em-andamento');
const circuloQtdEl = document.getElementById('circulo-qtd');
const hexagonoQtdEl = document.getElementById('hexagono-qtd');
const quadradoQtdEl = document.getElementById('quadrado-qtd');
const lowStockAlertEl = document.querySelector('section[role="alert"]');

function updateDashboardUI(data) {
    if (!totalPedidosEl || !pedidosEmAndamentoEl || !circuloQtdEl || !hexagonoQtdEl || !quadradoQtdEl) return;

    totalPedidosEl.textContent = data.em_andamento_count + data.concluido_count;
    pedidosEmAndamentoEl.textContent = data.em_andamento_count;

    for (const shapeType in data.stock_info) {
        const stockItem = data.stock_info[shapeType];
        let element, parentDiv;

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
                if (lowStockAlertEl) lowStockAlertEl.style.display = 'block';
            } else {
                parentDiv.classList.remove('border-4', 'border-red-500');
            }
        }
    }
}

function updateHistoricoUI(pedidos) {
    if (window.location.pathname !== '/pedidos/historico') return;
    const pedidosContainer = document.getElementById('pedidos-container');
    if (!pedidosContainer) return;

    pedidosContainer.innerHTML = '';

    pedidos.forEach(pedido => {
        const div = document.createElement('div');
        div.classList.add('pedido-item');
        div.innerHTML = `
            <h3>Pedido #${pedido.id} - Status: ${pedido.status}</h3>
            <p>Data: ${pedido.data}</p>
            <p>Peças: ${pedido.pecas_list_names.join(', ')}</p>
        `;
        pedidosContainer.appendChild(div);
    });
}

document.addEventListener('dashboardUpdate', (event) => {
    updateDashboardUI(event.detail);

    if (window.location.pathname === '/pedidos/historico') {
        fetch('/pedidos/json/')
            .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch'))
            .then(data => updateHistoricoUI(data.pedidos))
            .catch(console.error);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    setupGlobalTooltips();
    connectWebSocket();
    initializeNotifications();

    if (newOrderForm) {
        initializeNewOrderPieceSelectors();
        if (confirmOrderButton) {
            confirmOrderButton.addEventListener('click', async (e) => {
                showLoader();
                await handleConfirmOrderClick(e);
                hideLoader();
            });
        }
    }

    initializeModals();

    if (window.location.pathname === '/pedidos/historico') {
        updateOrdersChart('7days');
        document.getElementById('filter7Days')?.addEventListener('click', () => updateOrdersChart('7days'));
        document.getElementById('filter30Days')?.addEventListener('click', () => updateOrdersChart('30days'));
        document.getElementById('filterThisMonth')?.addEventListener('click', () => updateOrdersChart('this_month'));
    }
});
