// dashboard/static/js/modules/modals.js

import { showToast, showLoader, hideLoader, setupGlobalTooltips } from './utils.js';
import { MONTAGE_COLORS, PIECE_ID_TO_DETAILS } from './constants.js'; // Importando as constantes

// DOM elements
export let orderDetailsModal;
export let closeModalButton;
let modalOrderId;
let modalOrderStatus;
let searchInput;
let orderList;
let noResultsMessage;
let historicalOrderItems;

function renderShape(elementId, pieceIdentifier, montageNumber, statusClass = 'border-status-default') {
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
    switch (status) {
        case "em_andamento": return 'font-semibold text-yellow-600';
        case "concluido": return 'font-semibold text-green-600';
        default: return 'font-semibold text-gray-600';
    }
}

export function showOrderDetailsModal(id, status, piecesIdsString) {
    if (!modalOrderId || !modalOrderStatus || !orderDetailsModal) {
        console.error("showOrderDetailsModal: Modal elements not initialized.");
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
        piecesIds.forEach((pieceId, i) => {
            const globalPieceIndex = i + 1;
            const montageNumber = Math.ceil(globalPieceIndex / 3);
            const pieceInMontageIndex = (globalPieceIndex - 1) % 3 + 1;

            const previewId = `modal_peca_pedido${montageNumber}_peca${pieceInMontageIndex}`;
            const labelId = `modal_label_pedido${montageNumber}_peca${pieceInMontageIndex}`;
            const pieceDetails = PIECE_ID_TO_DETAILS[pieceId.toString()];

            if (pieceDetails) {
                renderShape(previewId, pieceId, montageNumber.toString(), 'border-status-selected');
                const labelElement = document.getElementById(labelId);
                if (labelElement) {
                    labelElement.textContent = `Peça ${pieceInMontageIndex}: ${pieceDetails.name}`;
                }
            } else {
                renderShape(previewId, 'unknown', montageNumber.toString());
                const labelElement = document.getElementById(labelId);
                if (labelElement) {
                    labelElement.textContent = `Peça ${pieceInMontageIndex}: Unknown`;
                }
            }
        });
    }

    orderDetailsModal.classList.remove('hidden');
    orderDetailsModal.classList.add('flex');
}

export function hideOrderDetailsModal() {
    if (orderDetailsModal) {
        orderDetailsModal.classList.add('hidden');
        orderDetailsModal.classList.remove('flex');
    }
}

export function initializeHistoricalOrderItems() {
    if (!historicalOrderItems) {
        console.error("initializeHistoricalOrderItems: historicalOrderItems not initialized.");
        return;
    }
    historicalOrderItems.forEach(item => {
        item.addEventListener('click', function() {
            const { id, status, pecas } = this.dataset;
            showOrderDetailsModal(id, status, pecas);
        });
    });
}

function filterOrders() {
    const query = searchInput.value.trim().toLowerCase();
    let found = false;

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

export function setupOrderSearch() {
    if (!searchInput || !orderList || !noResultsMessage) {
        console.warn("setupOrderSearch: Search elements or order list not found, skipping setup.");
        return;
    }

    if (noResultsMessage.parentNode !== orderList.parentNode) {
        orderList.parentNode.appendChild(noResultsMessage);
    }
    noResultsMessage.style.display = 'none';

    searchInput.addEventListener('input', filterOrders);
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            filterOrders();
        }
    });
}

export function initializeModals() {
    orderDetailsModal = document.getElementById('pedido-modal');
    closeModalButton = document.getElementById('close-modal-btn');
    modalOrderId = document.getElementById('modal-pedido-id');
    modalOrderStatus = document.getElementById('modal-pedido-status');
    searchInput = document.getElementById('searchInput');
    orderList = document.getElementById('pedidoLista');
    noResultsMessage = document.getElementById('avisoNenhumPedido');
    historicalOrderItems = document.querySelectorAll('.pedido-item');

    if (closeModalButton) { 
        closeModalButton.addEventListener('click', hideOrderDetailsModal);
    } else {
        console.warn("initializeModals: Close modal button not found.");
    }
    
    if (orderDetailsModal) {
        orderDetailsModal.addEventListener('click', (event) => {
            if (event.target === orderDetailsModal) {
                hideOrderDetailsModal();
            }
        });
    } else {
        console.warn("initializeModals: Order details modal not found.");
    }

    setupOrderSearch();
    initializeHistoricalOrderItems();
}