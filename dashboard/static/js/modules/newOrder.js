import { showToast, showLoader, hideLoader } from './utils.js';

// Constantes e Elementos DOM específicos de novo pedido
const MONTAGE_COLORS = { // Redefinido aqui para evitar importações cruzadas desnecessárias se não for global
    '1': 'bg-blue-500',
    '2': 'bg-purple-600',
    '3': 'bg-green-600'
};

const PIECE_ID_TO_DETAILS = { // Redefinido aqui ou importado de um arquivo de 'constants' global
    '1': { type: 'circulo', name: 'Círculo' },
    '2': { type: 'hexagono', name: 'Hexágono' },
    '3': { type: 'quadrado', name: 'Quadrado' }
};

export const newOrderForm = document.getElementById('pedidoForm');
export const confirmOrderButton = document.getElementById('confirmarBtn');


// Funções auxiliares (se usadas apenas por este módulo)
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

/**
 * Atualiza a pré-visualização de uma peça individual no formulário de novo pedido.
 * @param {string} selectName - O atributo 'name' do elemento <select> (ex: 'peca1').
 */
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

/**
 * Lida com o envio do formulário de novo pedido.
 * @param {Event} event - O evento de clique.
 */
export async function handleConfirmOrderClick(event) {
    event.preventDefault();

    if (!newOrderForm) return;

    const orderData = {};
    let allPiecesSelected = true;

    for (let i = 1; i <= 9; i++) {
        const select = newOrderForm.querySelector(`select[name="peca${i}"]`);
        if (select && select.value) {
            const pieceId = parseInt(select.value); // Parse to int immediately
            if (isNaN(pieceId)) { // Check if parsing resulted in NaN
                allPiecesSelected = false;
                console.error(`Invalid piece ID for peca${i}: ${select.value}`);
                break;
            }
            orderData[`peca${i}`] = pieceId; // Assign the parsed integer
        } else {
            allPiecesSelected = false;
            console.warn(`Peca${i} is not selected or has an empty value.`);
            break;
        }
    }

    if (!allPiecesSelected) {
        showToast('Por favor, selecione todas as 9 peças para o pedido.', 'warning');
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
            showToast(responseData.message || 'Erro ao criar pedido.', 'error');
            throw new Error(responseData.message || 'Erro ao criar pedido.');
        }

        newOrderForm.reset();
        // Atualiza a pré-visualização após o reset
        for (let i = 1; i <= 9; i++) {
            updatePiecePreview(`peca${i}`);
        }

    } catch (error) {
        if (!error.message.startsWith('Erro ao criar pedido')) {
            showToast(`❌ Erro de comunicação: ${error.message}`, 'error');
        }
        console.error('Detailed error confirming order:', error);
    }
}

/**
 * Inicializa os seletores de peças do formulário de novo pedido.
 * Adiciona listeners para atualizar a pré-visualização.
 */
export function initializeNewOrderPieceSelectors() {
    for (let i = 1; i <= 9; i++) {
        const select = document.querySelector(`select[name="peca${i}"]`);
        if (select) {
            select.addEventListener('change', () => updatePiecePreview(`peca${i}`));
            // Chama uma vez para configurar o estado inicial
            updatePiecePreview(`peca${i}`); 
        }
    }
}