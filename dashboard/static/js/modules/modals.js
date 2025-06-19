// dashboard/static/js/modules/modals.js

// Importe showToast, showLoader, hideLoader de utils.js
import { showToast, showLoader, hideLoader, setupGlobalTooltips } from './utils.js'; 

// Constantes e elementos DOM específicos para renderização de peças dentro do modal
const MONTAGE_COLORS = {
    '1': 'bg-blue-500',
    '2': 'bg-purple-600',
    '3': 'bg-green-600'
};

const PIECE_ID_TO_DETAILS = {
    '1': { type: 'circulo', name: 'Círculo' },
    '2': { type: 'hexagono', name: 'Hexágono' },
    '3': { type: 'quadrado', name: 'Quadrado' }
};


// --- ELEMENTOS DO DOM (DECLARADOS AQUI, MAS INICIALIZADOS EM initializeModals) ---
// Estes serão preenchidos (capturados do DOM) dentro de initializeModals
export let orderDetailsModal; // Usamos 'let' porque será atribuído depois
export let closeModalButton; // Usamos 'let' porque será atribuído depois
let modalOrderId;
let modalOrderStatus;
let searchInput;
let orderList;
let noResultsMessage;
let historicalOrderItems; // NodeList, capturada dentro de initializeHistoricalOrderItems

// --- Funções Auxiliares (privadas a este módulo) ---

function renderShape(elementId, pieceIdentifier, montageNumber, statusClass = 'border-status-default') {
    // ... (sua função renderShape intacta) ...
    const element = document.getElementById(elementId);
    if (!element) return;

    element.className = 'w-16 h-16 flex items-center justify-center shadow-md transition-all duration-300';
    element.innerHTML = '';

    let shapeClass = '';
    let iconHtml = '';
    const colorClass = MONTAGE_COLORS[montageNumber] || 'bg-gray-100';

    let shapeType = '';
    if (typeof pieceIdentifier === 'number' || (typeof pieceIdentifier === 'string' && !isNaN(pieceIdentifier))) {
        const pieceDetails = PIECE_ID_TO_DETAILS[pieceIdentifier.toString()];
        shapeType = pieceDetails ? pieceDetails.type : 'unknown';
    } else {
        shapeType = pieceIdentifier;
    }

    switch (shapeType) {
        case 'circulo':
            shapeClass = 'rounded-full';
            iconHtml = '<i class="fas fa-circle text-white text-xl"></i>';
            break;
        case 'quadrado':
            shapeClass = 'rounded';
            iconHtml = '<i class="fas fa-square text-white text-xl"></i>';
            break;
        case 'hexagono':
            shapeClass = 'hexagon-shape';
            iconHtml = `<svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <polygon points="12,2 22,7 22,17 12,22 2,17 2,7"/>
                        </svg>`;
            break;
        default:
            element.classList.add('bg-gray-100', 'rounded-full', 'border-status-default');
            return;
    }
    element.classList.add(shapeClass, colorClass, statusClass);
    element.innerHTML = iconHtml;
}

function getStatusClasses(status) {
    // ... (sua função getStatusClasses intacta) ...
    switch (status) {
        case "em_andamento": return 'font-semibold text-yellow-600';
        case "concluido": return 'font-semibold text-green-600';
        default: return 'font-semibold text-gray-600';
    }
}


// --- Funções Exportadas (API do Módulo) ---

/**
 * Exibe o modal de detalhes do pedido com os dados fornecidos.
 * Assume que os elementos do modal já foram capturados por initializeModals.
 * @param {string} id - O ID do pedido.
 * @param {string} status - O status do pedido.
 * @param {string} piecesIdsString - Uma string dos IDs das peças separadas por vírgulas (ex: "1,2,3,...").
 */
export function showOrderDetailsModal(id, status, piecesIdsString) {
    if (!modalOrderId || !modalOrderStatus || !orderDetailsModal) {
        console.error("showOrderDetailsModal: Elementos do modal não inicializados.");
        return;
    }

    modalOrderId.textContent = id;
    modalOrderStatus.textContent = status;
    modalOrderStatus.className = getStatusClasses(status);

    for (let m = 1; m <= 3; m++) {
        for (let p = 1; p <= 3; p++) {
            renderShape(`modal_peca_pedido${m}_peca${p}`, '', '');
            const labelElement = document.getElementById(`modal_label_pedido${m}_peca${p}`);
            if (labelElement) {
                labelElement.textContent = '';
            }
        }
    }

    const piecesIds = piecesIdsString.split(',').map(Number);

    if (piecesIds.length === 9) {
        for (let i = 0; i < piecesIds.length; i++) {
            const globalPieceIndex = i + 1;
            const montageNumber = Math.ceil(globalPieceIndex / 3);
            const pieceInDisplayIndex = (globalPieceIndex - 1) % 3 + 1;

            const previewId = `modal_peca_pedido${montageNumber}_peca${pieceInDisplayIndex}`;
            const labelId = `modal_label_pedido${montageNumber}_peca${pieceInDisplayIndex}`;

            const pieceId = piecesIds[i];
            const pieceDetails = PIECE_ID_TO_DETAILS[pieceId.toString()];

            if (pieceDetails) {
                renderShape(previewId, pieceId, montageNumber.toString(), 'border-status-selected');
                const labelElement = document.getElementById(labelId);
                if (labelElement) {
                    labelElement.textContent = `Peça ${pieceInDisplayIndex}: ${pieceDetails.name}`;
                }
            } else {
                renderShape(previewId, 'unknown', montageNumber.toString());
                const labelElement = document.getElementById(labelId);
                if (labelElement) {
                    labelElement.textContent = `Peça ${pieceInDisplayIndex}: Desconhecido`;
                }
            }
        }
    }

    orderDetailsModal.classList.remove('hidden');
    orderDetailsModal.classList.add('flex');
}

/**
 * Esconde o modal de detalhes do pedido.
 * Assume que orderDetailsModal já foi capturado.
 */
export function hideOrderDetailsModal() {
    if (orderDetailsModal) {
        orderDetailsModal.classList.add('hidden');
        orderDetailsModal.classList.remove('flex');
    }
}

/**
 * Inicializa os event listeners para os itens do histórico de pedidos para abrir o modal.
 * Assume que historicalOrderItems já foi capturado por initializeModals.
 */
export function initializeHistoricalOrderItems() {
    if (!historicalOrderItems) { // Verificar se foi capturado
        console.error("initializeHistoricalOrderItems: historicalOrderItems não inicializado.");
        return;
    }
    historicalOrderItems.forEach(item => {
        item.addEventListener('click', function() {
            const id = this.dataset.id;
            const status = this.dataset.status;
            const pieces = this.dataset.pecas;
            showOrderDetailsModal(id, status, pieces);
        });
    });
}

/**
 * Configura a funcionalidade de busca para a lista de pedidos históricos.
 * Assume que searchInput, orderList e noResultsMessage já foram capturados por initializeModals.
 */
export function setupOrderSearch() {
    if (!searchInput || !orderList || !noResultsMessage) {
        console.warn("setupOrderSearch: Elementos de busca ou lista de pedidos não encontrados, setupOrderSearch ignorado.");
        return;
    }

    if (noResultsMessage.parentNode !== orderList.parentNode) { // Garante que a mensagem não seja duplicada
        orderList.parentNode.appendChild(noResultsMessage);
    }
    noResultsMessage.style.display = 'none';

    function filterOrders() {
        const query = searchInput.value.trim().toLowerCase();
        let found = false;

        // Captura historicalOrderItems aqui novamente para garantir que está atualizado se o DOM mudar
        const currentHistoricalOrderItems = document.querySelectorAll('.pedido-item'); 
        currentHistoricalOrderItems.forEach(item => {
            const id = item.dataset.id.toLowerCase();
            const status = item.dataset.status.toLowerCase();

            if (id.includes(query) || status.includes(query)) {
                item.style.display = 'flex';
                found = true;
            } else {
                item.style.display = 'none';
            }
        });

        noResultsMessage.style.display = found ? 'none' : 'block';
    }

    searchInput.addEventListener('input', filterOrders);
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            filterOrders();
        }
    });
}

/**
 * Inicializa todos os listeners e elementos relacionados aos modais e busca.
 * Esta é a função principal para ser chamada do main.js, garantindo que o DOM esteja pronto.
 */
export function initializeModals() {
    // CAPTURAR OS ELEMENTOS DOM AQUI DENTRO DA FUNÇÃO
    orderDetailsModal = document.getElementById('pedido-modal');
    closeModalButton = document.getElementById('close-modal-btn');
    modalOrderId = document.getElementById('modal-pedido-id');
    modalOrderStatus = document.getElementById('modal-pedido-status');
    searchInput = document.getElementById('searchInput');
    orderList = document.getElementById('pedidoLista');
    noResultsMessage = document.getElementById('avisoNenhumPedido'); // Ou crie se não existir
    historicalOrderItems = document.querySelectorAll('.pedido-item'); // Capturar aqui também


    // Verificações e adição de listeners
    if (closeModalButton) { 
        closeModalButton.addEventListener('click', hideOrderDetailsModal);
    } else {
        console.warn("initializeModals: Botão de fechar modal não encontrado.");
    }
    
    if (orderDetailsModal) {
        orderDetailsModal.addEventListener('click', (event) => {
            if (event.target === orderDetailsModal) {
                hideOrderDetailsModal();
            }
        });
    } else {
        console.warn("initializeModals: Modal de detalhes do pedido não encontrado.");
    }

    // Inicializa a funcionalidade de busca, passando os elementos se necessário, ou confiando no escopo
    setupOrderSearch();

    // Inicializa os listeners para os itens da lista de histórico
    initializeHistoricalOrderItems();
}