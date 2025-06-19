import { showToast, showLoader, hideLoader } from './utils.js';
import { MONTAGE_COLORS, PIECE_ID_TO_DETAILS } from './constants.js';

export const newOrderForm = document.getElementById('pedidoForm');
export const confirmOrderButton = document.getElementById('confirmarBtn');

// Ensure renderShape is declared only once and exported.
export function renderShape(elementId, pieceIdentifier, montageNumber, statusClass = 'border-status-default') {
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

function updatePiecePreview(selectName) {
    const selectElement = document.querySelector(`select[name="${selectName}"]`);
    if (!selectElement) return;

    const globalPieceIndex = parseInt(selectName.replace('peca', ''));
    const montageNumber = Math.ceil(globalPieceIndex / 3);
    const pieceInMontageIndex = (globalPieceIndex - 1) % 3 + 1;

    const previewId = `peca_pedido${montageNumber}_peca${pieceInMontageIndex}`;
    const selectedPieceId = selectElement.value;

    const statusClass = selectedPieceId ? 'border-status-selected' : 'border-status-default';
    renderShape(previewId, selectedPieceId, montageNumber.toString(), statusClass);
}

export async function handleConfirmOrderClick(event) {
    event.preventDefault();

    if (!newOrderForm) return;

    const orderData = {};
    let allPiecesSelected = true;

    for (let i = 1; i <= 9; i++) {
        const select = newOrderForm.querySelector(`select[name="peca${i}"]`);
        if (select && select.value) {
            const pieceId = parseInt(select.value);
            if (isNaN(pieceId)) {
                allPiecesSelected = false;
                console.error(`Invalid piece ID for peca${i}: ${select.value}`);
                break;
            }
            orderData[`peca${i}`] = pieceId;
        } else {
            allPiecesSelected = false;
            console.warn(`Peca${i} is not selected or has an empty value.`);
            break;
        }
    }

    if (!allPiecesSelected) {
        showToast('Please select all 9 pieces for the order.', 'warning');
        return;
    }

    try {
        const response = await fetch('/pedidos/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData),
        });

        const responseData = await response.json();

        if (!response.ok) {
            showToast(responseData.message || 'Error creating order.', 'error');
            throw new Error(responseData.message || 'Error creating order.');
        }

        newOrderForm.reset();
        for (let i = 1; i <= 9; i++) {
            updatePiecePreview(`peca${i}`);
        }

    } catch (error) {
        if (!error.message.startsWith('Error creating order')) {
            showToast(`❌ Communication error: ${error.message}`, 'error');
        }
        console.error('Detailed error confirming order:', error);
    }
}

export function initializeNewOrderPieceSelectors() {
    for (let i = 1; i <= 9; i++) {
        const select = document.querySelector(`select[name="peca${i}"]`);
        if (select) {
            select.addEventListener('change', () => updatePiecePreview(`peca${i}`));
            updatePiecePreview(`peca${i}`);
        }
    }
}