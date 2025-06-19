// dashboard/static/js/main.js

// Importe as funções e elementos DOM necessários de cada módulo.
// Certifique-se de que os caminhos são absolutos a partir da raiz de STATIC_URL
// para garantir a resolução correta dos módulos no navegador.

import { showToast, showLoader, hideLoader, getCookie, setupGlobalTooltips } from '/static/js/modules/utils.js';
import { connectWebSocket, initializeNotifications, notificationBell } from '/static/js/modules/notifications.js';
import { setupOrderSearch, initializeHistoricalOrderItems, orderDetailsModal, closeModalButton, initializeModals, hideOrderDetailsModal } from '/static/js/modules/modals.js';
import { updateOrdersChart, ordersChartCanvas, filter7DaysBtn, filter30DaysBtn, filterThisMonthBtn } from '/static/js/modules/charts.js';
import { newOrderForm, confirmOrderButton, initializeNewOrderPieceSelectors, handleConfirmOrderClick } from '/static/js/modules/newOrder.js';

// ===============================
// ELEMENTOS DO DOM DO DASHBOARD (HOME.HTML)
// Estes elementos são específicos da página principal do dashboard ('/').
// Se a lógica do dashboard for mais complexa, poderia ser movida para um 'dashboard.js'
// e importada aqui, mas para elementos simples, podem ser capturados aqui.
// Removi 'themeToggleBtn' daqui.
const totalPedidosEl = document.getElementById('total-pedidos');
const pedidosEmAndamentoEl = document.getElementById('pedidos-em-andamento');
const circuloQtdEl = document.getElementById('circulo-qtd');
const hexagonoQtdEl = document.getElementById('hexagono-qtd');
const quadradoQtdEl = document.getElementById('quadrado-qtd');
const lowStockAlertEl = document.querySelector('section[role="alert"]');

// Mapeamento de Cores e Detalhes de Peças (repetido de outros módulos para simplicidade, mas idealmente seria um módulo 'constants.js')
const MONTAGE_COLORS = { '1': 'bg-blue-500', '2': 'bg-purple-600', '3': 'bg-green-600' };
const PIECE_ID_TO_DETAILS = { '1': { type: 'circulo', name: 'Círculo' }, '2': { type: 'hexagono', name: 'Hexágono' }, '3': { type: 'quadrado', name: 'Quadrado' } };

/**
 * Atualiza a UI do dashboard com os dados recebidos via WebSocket.
 * Esta função está aqui no main.js porque lida com elementos específicos do home.html.
 * Para melhor componentização, poderia ser um módulo 'dashboardUI.js'.
 * @param {object} data - Os dados de atualização do dashboard.
 */
function updateDashboardUI(data) {
    if (totalPedidosEl && pedidosEmAndamentoEl && circuloQtdEl && hexagonoQtdEl && quadradoQtdEl) {
        totalPedidosEl.textContent = data.em_andamento_count + data.concluido_count;
        pedidosEmAndamentoEl.textContent = data.em_andamento_count;

        // Função auxiliar renderShape, duplicada aqui para a tela inicial
        // Idealmente, seria um utilitário comum se necessário em vários lugares.
        function renderShape(elementId, pieceIdentifier, montageNumber, statusClass = 'border-status-default') {
            const element = document.getElementById(elementId);
            if (!element) return;
            element.className = 'w-16 h-16 flex items-center justify-center shadow-md transition-all duration-300';
            element.innerHTML = '';
            let shapeClass = ''; let iconHtml = '';
            const colorClass = MONTAGE_COLORS[montageNumber] || 'bg-gray-100';
            let shapeType = '';
            if (typeof pieceIdentifier === 'number' || (typeof pieceIdentifier === 'string' && !isNaN(pieceIdentifier))) {
                const pieceDetails = PIECE_ID_TO_DETAILS[pieceIdentifier.toString()];
                shapeType = pieceDetails ? pieceDetails.type : 'unknown';
            } else { shapeType = pieceIdentifier; }
            switch (shapeType) {
                case 'circulo': shapeClass = 'rounded-full'; iconHtml = '<i class="fas fa-circle text-white text-xl"></i>'; break;
                case 'quadrado': shapeClass = 'rounded'; iconHtml = '<i class="fas fa-square text-white text-xl"></i>'; break;
                case 'hexagono': shapeClass = 'hexagon-shape'; iconHtml = `<svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><polygon points="12,2 22,7 22,17 12,22 2,17 2,7"/></svg>`; break;
                default: element.classList.add('bg-gray-100', 'rounded-full', 'border-status-default'); return;
            }
            element.classList.add(shapeClass, colorClass, statusClass);
            element.innerHTML = iconHtml;
        }

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
                    if (lowStockAlertEl) lowStockAlertEl.style.display = 'block';
                } else {
                    parentDiv.classList.remove('border-4', 'border-red-500');
                }
            }
        }
    }
}

// Escute por eventos personalizados do dashboard.
// notifications.js pode despachar este evento via WebSocket.
document.addEventListener('dashboardUpdate', (event) => {
    updateDashboardUI(event.detail);
});

// ===============================
// INICIALIZAÇÃO GERAL DA APLICAÇÃO (após o DOM carregar)
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa o tema (mesmo sem botão, a classe no <html>/<body> ainda pode ser controlada)
    // Se não há botão, pode remover a lógica de initializeTheme ou deixá-la para um valor padrão.
    // initializeTheme(); // Removida a chamada, pois o botão foi removido.

    // Inicializa tooltips globais (necessita da div #global-tooltip no HTML)
    setupGlobalTooltips();

    // Conecta o WebSocket para notificações e dashboard updates
    // A função connectWebSocket no módulo notifications.js já contém a lógica de decisão se deve conectar
    connectWebSocket(); 

    // Lógica para a página de criação de novo pedido ('/pedidos/')
    // newOrderForm é exportado de newOrder.js
    if (newOrderForm) {
        initializeNewOrderPieceSelectors(); // Inicializa os seletores e pré-visualizações
        // confirmOrderButton é exportado de newOrder.js
        if (confirmOrderButton) { 
             confirmOrderButton.addEventListener('click', async (event) => {
                 showLoader(); // Mostrar loader antes da requisição
                 await handleConfirmOrderClick(event); // Lida com o envio do formulário
                 hideLoader(); // Esconder loader após a requisição
             });
        }
    }

    // Lógica para o modal de detalhes do histórico de pedidos e sua busca
    // initializeModals é exportado de modals.js e cuida da inicialização de listeners do modal.
    initializeModals(); 
    // setupOrderSearch e initializeHistoricalOrderItems são chamados dentro de initializeModals.

    // Lógica para o gráfico de pedidos no histórico (se estiver na página correta '/pedidos/historico')
    // ordersChartCanvas é exportado de charts.js
    if (window.location.pathname === '/pedidos/historico') {
        updateOrdersChart('7days'); // Carrega o gráfico com dados dos últimos 7 dias por padrão

        // Adiciona listeners aos botões de filtro do gráfico (exportados de charts.js)
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

    // Inicializa os listeners para o sino de notificações
    // initializeNotifications é exportado de notifications.js
    initializeNotifications();

    // Se estiver na página inicial do dashboard ('/'), e precisar de mais alguma lógica específica
    // além das atualizações via WebSocket já gerenciadas por connectWebSocket() e initializeNotifications().
    if (window.location.pathname === '/') {
        // Exemplo: se houver outros elementos específicos do dashboard que precisam de JS aqui.
    }
});