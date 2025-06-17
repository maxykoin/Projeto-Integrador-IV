document.addEventListener('DOMContentLoaded', () => {

    // ===============================
    //           CONSTANTES
    // ===============================

    const MONTAGE_COLORS = {
        '1': 'bg-blue-500',
        '2': 'bg-purple-600',
        '3': 'bg-green-600'
    };

    // NOVO: Mapeamento de ID da peça para o seu 'tipo' (shape) e nome de exibição
    const PIECE_ID_TO_DETAILS = {
        '1': { type: 'circulo', name: 'Círculo' },
        '2': { type: 'hexagono', name: 'Hexágono' },
        '3': { type: 'quadrado', name: 'Quadrado' }
    };

    // ===============================
    //         ELEMENTOS DO DOM
    // ===============================

    const newOrderForm = document.getElementById('pedidoForm');
    const confirmOrderButton = document.getElementById('confirmarBtn');

    const orderDetailsModal = document.getElementById('pedido-modal');
    const closeModalButton = document.getElementById('close-modal-btn');
    const modalOrderId = document.getElementById('modal-pedido-id');
    const modalOrderStatus = document.getElementById('modal-pedido-status');
    const historicalOrderItems = document.querySelectorAll('.pedido-item');

    const searchInput = document.getElementById('searchInput');
    const orderList = document.getElementById('pedidoLista');
    let noResultsMessage = document.getElementById('avisoNenhumPedido');


    // ===============================
    //      FUNÇÕES GENÉRICAS / HELPERS
    // ===============================

    /**
     * Renderiza a forma (círculo, quadrado, hexágono) dentro de um elemento HTML.
     * Agora, 'pieceIdentifier' pode ser o ID da peça (1, 2, 3) ou o 'tipo' (circulo, hexagono, quadrado).
     * A função traduz o ID para o 'tipo' para a lógica de forma.
     * @param {string} elementId - O ID do elemento HTML.
     * @param {string|number} pieceIdentifier - O ID da peça (1, 2, 3) ou o tipo de forma ('circulo', 'hexagono', 'quadrado').
     * @param {string} montageNumber - O número da montagem.
     * @param {string} statusClass - Classe CSS para o status da borda.
     */
    function renderShape(elementId, pieceIdentifier, montageNumber, statusClass = 'border-status-default') {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.className = 'w-16 h-16 flex items-center justify-center shadow-md transition-all duration-300';
        element.innerHTML = '';

        let shapeClass = '';
        let iconHtml = '';
        const colorClass = MONTAGE_COLORS[montageNumber] || 'bg-gray-100';

        // Traduz o ID ou usa o tipo diretamente
        let shapeType = '';
        if (typeof pieceIdentifier === 'number' || (typeof pieceIdentifier === 'string' && !isNaN(pieceIdentifier))) {
            const pieceDetails = PIECE_ID_TO_DETAILS[pieceIdentifier.toString()];
            shapeType = pieceDetails ? pieceDetails.type : 'unknown';
        } else {
            shapeType = pieceIdentifier; // Já é o tipo (ex: 'circulo')
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
        const selectedPieceId = selectElement.value; // O valor aqui será o ID (1, 2, 3)

        const statusClass = selectedPieceId ? 'border-status-selected' : 'border-status-default';
        // Passa o ID da peça para renderShape
        renderShape(previewId, selectedPieceId, montageNumber.toString(), statusClass);
    }

    function getStatusClasses(status) {
        switch (status) {
            case "em_andamento": return 'font-semibold text-yellow-600';
            case "concluido": return 'font-semibold text-green-600';
            default: return 'font-semibold text-gray-600';
        }
    }


    // ===============================
    //       FUNÇÕES "NOVO PEDIDO"
    // ===============================

    function initializeNewOrderPieceSelectors() {
        for (let i = 1; i <= 9; i++) {
            const select = document.querySelector(`select[name="peca${i}"]`);
            if (select) {
                select.addEventListener('change', () => updatePiecePreview(`peca${i}`));
            }
        }
    }

    async function handleConfirmOrderClick(event) {
        event.preventDefault();

        if (!newOrderForm) return;

        const orderData = {};
        let allPiecesSelected = true;

        for (let i = 1; i <= 9; i++) {
            const select = newOrderForm.querySelector(`select[name="peca${i}"]`);
            if (select && select.value) {
                // O valor aqui é o ID da peça (string "1", "2", "3")
                orderData[`peca${i}`] = parseInt(select.value); // Converte para int para enviar para o backend
            } else {
                allPiecesSelected = false;
                break;
            }
        }

        if (!allPiecesSelected) {
            alert('Por favor, selecione todas as 9 peças para o pedido.');
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
                throw new Error(responseData.message || 'Erro ao criar pedido. Verifique o console para detalhes.');
            }

            alert(`✅ Pedido criado com ID: ${responseData.pedido_id}`);
            newOrderForm.reset();
            for (let i = 1; i <= 9; i++) {
                updatePiecePreview(`peca${i}`);
            }

        } catch (error) {
            alert(`❌ Erro: ${error.message}`);
            console.error('Detailed error confirming order:', error);
        }
    }


    // ===============================
    //    FUNÇÕES "HISTÓRICO DE PEDIDOS" (MODAL E BUSCA)
    // ===============================

    /**
     * Exibe o modal de detalhes do pedido com os dados fornecidos.
     * Inclui rotulagem clara para as peças.
     * @param {string} id - O ID do pedido.
     * @param {string} status - O status do pedido.
     * @param {string} piecesIdsString - Uma string dos IDs das peças separadas por vírgulas (ex: "1,2,3,...").
     */
    function showOrderDetailsModal(id, status, piecesIdsString) {
        modalOrderId.textContent = id;
        modalOrderStatus.textContent = status;
        modalOrderStatus.className = getStatusClasses(status);

        for (let m = 1; m <= 3; m++) {
            for (let p = 1; p <= 3; p++) {
                renderShape(`modal_peca_pedido${m}_peca${p}`, '', ''); // Limpa com cor padrão
                document.getElementById(`modal_label_pedido${m}_peca${p}`).textContent = ''; // Limpa o rótulo
            }
        }

        const piecesIds = piecesIdsString.split(',').map(Number); // Converte para array de números

        if (piecesIds.length === 9) {
            for (let i = 0; i < piecesIds.length; i++) {
                const globalPieceIndex = i + 1;
                const montageNumber = Math.ceil(globalPieceIndex / 3);
                const pieceInDisplayIndex = (globalPieceIndex - 1) % 3 + 1;

                const previewId = `modal_peca_pedido${montageNumber}_peca${pieceInDisplayIndex}`;
                const labelId = `modal_label_pedido${montageNumber}_peca${pieceInDisplayIndex}`;

                const pieceId = piecesIds[i]; // ID da peça (1, 2, 3)
                const pieceDetails = PIECE_ID_TO_DETAILS[pieceId.toString()]; // Obtém os detalhes pelo ID

                if (pieceDetails) {
                    renderShape(previewId, pieceId, montageNumber.toString(), 'border-status-selected');
                    document.getElementById(labelId).textContent = `Peça ${pieceInDisplayIndex}: ${pieceDetails.name}`;
                } else {
                     renderShape(previewId, 'unknown', montageNumber.toString()); // Renderiza como desconhecido
                     document.getElementById(labelId).textContent = `Peça ${pieceInDisplayIndex}: Desconhecido`;
                }
            }
        }

        orderDetailsModal.classList.remove('hidden');
        orderDetailsModal.classList.add('flex');
    }

    function hideOrderDetailsModal() {
        orderDetailsModal.classList.add('hidden');
        orderDetailsModal.classList.remove('flex');
    }

    function initializeHistoricalOrderItems() {
        historicalOrderItems.forEach(item => {
            item.addEventListener('click', function() {
                const id = this.dataset.id;
                const status = this.dataset.status;
                const pieces = this.dataset.pecas; // Agora contém IDs separados por vírgula
                showOrderDetailsModal(id, status, pieces);
            });
        });
    }

    function setupOrderSearch() {
        if (!searchInput || !orderList) return;

        if (!noResultsMessage) {
            noResultsMessage = document.createElement('p');
            noResultsMessage.id = 'avisoNenhumPedido';
            noResultsMessage.className = 'text-center text-red-600 mt-4 font-semibold';
            noResultsMessage.textContent = 'Pedido não encontrado.';
            orderList.parentNode.appendChild(noResultsMessage);
        }
        noResultsMessage.style.display = 'none';

        function filterOrders() {
            const query = searchInput.value.trim().toLowerCase();
            let found = false;

            historicalOrderItems.forEach(item => {
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

    // ===============================
    //         INICIALIZAÇÃO GERAL
    // ===============================

    if (newOrderForm) {
        initializeNewOrderPieceSelectors();
        for (let i = 1; i <= 9; i++) {
            updatePiecePreview(`peca${i}`);
        }
        confirmOrderButton.addEventListener('click', handleConfirmOrderClick);
    }

    if (orderDetailsModal) {
        closeModalButton.addEventListener('click', hideOrderDetailsModal);
        orderDetailsModal.addEventListener('click', (event) => {
            if (event.target === orderDetailsModal) {
                hideOrderDetailsModal();
            }
        });
        initializeHistoricalOrderItems();
    }

    setupOrderSearch();
});