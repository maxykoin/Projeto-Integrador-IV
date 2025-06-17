document.addEventListener('DOMContentLoaded', () => {

    // ===============================
    //           CONSTANTES
    // ===============================

    const MONTAGE_COLORS = {
        '1': 'bg-blue-500',
        '2': 'bg-purple-600',
        '3': 'bg-green-600'
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
     * Renderiza a forma (círculo, quadrado, hexágono) dentro de um elemento HTML,
     * aplicando a cor e o ícone/SVG corretos, e adicionando bordas de status.
     * @param {string} elementId - O ID do elemento HTML onde a forma será renderizada.
     * @param {string} shapeType - O tipo de forma ('circle', 'square', 'hexagon').
     * @param {string} montageNumber - O número da montagem (ex: '1', '2', '3') para determinar a cor base.
     * @param {string} statusClass - Classe CSS para o status da borda (e.g., 'border-status-available', 'border-status-low').
     */
    function renderShape(elementId, shapeType, montageNumber, statusClass = 'border-status-default') {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.className = 'w-16 h-16 flex items-center justify-center shadow-md transition-all duration-300';
        element.innerHTML = '';

        let shapeClass = '';
        let iconHtml = '';
        const colorClass = MONTAGE_COLORS[montageNumber] || 'bg-gray-100';

        switch (shapeType) {
            case 'circle':
                shapeClass = 'rounded-full';
                iconHtml = '<i class="fas fa-circle text-white text-xl"></i>';
                break;
            case 'square':
                shapeClass = 'rounded';
                iconHtml = '<i class="fas fa-square text-white text-xl"></i>';
                break;
            case 'hexagon':
                shapeClass = 'hexagon-shape';
                iconHtml = `<svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <polygon points="12,2 22,7 22,17 12,22 2,17 2,7"/>
                            </svg>`;
                break;
            default: // Caso 'Escolha...' ou valor inválido
                element.classList.add('bg-gray-100', 'rounded-full', 'border-status-default'); // Usa a borda padrão para não selecionado
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
        const selectedShape = selectElement.value;

        // Determina a classe de status visual (ex: border-status-selected se algo foi escolhido)
        // No futuro, isso poderia vir de uma API de estoque
        const statusClass = selectedShape ? 'border-status-selected' : 'border-status-default';
        renderShape(previewId, selectedShape, montageNumber.toString(), statusClass);
    }

    /**
     * Mapeia o status do pedido para as classes de cor do Tailwind.
     * @param {string} status - O status do pedido (ex: 'em_andamento', 'entregue').
     * @returns {string} As classes CSS para o status.
     */
    function getStatusClasses(status) {
        switch (status) {
            case "em_andamento": return 'font-semibold text-yellow-600';
            case "entregue": return 'font-semibold text-green-600';
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
                orderData[`peca${i}`] = select.value;
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

            // --- FUTURA INTEGRAÇÃO: Notificar Dashboard via WebSocket ---
            // Isso seria onde você enviaria uma mensagem para o WebSocket
            // para que o dashboard atualize em tempo real.
            // Ex: ws.send(JSON.stringify({ type: 'new_order', order_id: responseData.pedido_id }));

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
     * @param {string} piecesString - Uma string das peças separadas por vírgulas (ex: "circle,square,hexagon,...").
     */
    function showOrderDetailsModal(id, status, piecesString) {
        modalOrderId.textContent = id;
        modalOrderStatus.textContent = status;
        modalOrderStatus.className = getStatusClasses(status);

        // Limpar visualizações existentes no pop-up antes de preencher
        for (let m = 1; m <= 3; m++) {
            for (let p = 1; p <= 3; p++) {
                renderShape(`modal_peca_pedido${m}_peca${p}`, '', ''); // Limpa com cor padrão
                document.getElementById(`modal_label_pedido${m}_peca${p}`).textContent = ''; // Limpa o rótulo
            }
        }

        const pieces = piecesString.split(',');

        if (pieces.length === 9) {
            const pieceNames = { 'circle': 'Círculo', 'hexagon': 'Hexágono', 'square': 'Quadrado' };
            for (let i = 0; i < pieces.length; i++) {
                const globalPieceIndex = i + 1;
                const montageNumber = Math.ceil(globalPieceIndex / 3);
                const pieceInDisplayIndex = (globalPieceIndex - 1) % 3 + 1;

                const previewId = `modal_peca_pedido${montageNumber}_peca${pieceInDisplayIndex}`;
                const labelId = `modal_label_pedido${montageNumber}_peca${pieceInDisplayIndex}`;

                const pieceType = pieces[i];
                renderShape(previewId, pieceType, montageNumber.toString(), 'border-status-selected'); // Assume 'selected' para peças existentes
                document.getElementById(labelId).textContent = `Peça ${pieceInDisplayIndex}: ${pieceNames[pieceType] || 'Desconhecido'}`;
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
                const pieces = this.dataset.pecas;
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

    // --- FUTURA INTEGRAÇÃO: WebSockets para Dashboard ---
    // Exemplo de como você iniciaria uma conexão WebSocket:
    /*
    if (window.location.pathname === '/') { // Apenas na página do dashboard
        const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const wsURL = wsProtocol + window.location.host + '/ws/dashboard/'; // Seu endpoint WebSocket
        const ws = new WebSocket(wsURL);

        ws.onopen = (event) => {
            console.log('WebSocket connected:', event);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Received message:', data);
            // Aqui você processaria os dados recebidos (e.g., status de estoque, novos pedidos)
            // e atualizaria os elementos do DOM no dashboard.
            // Ex: updateStockDisplay(data.stock_data);
            // Ex: updateOrderStatus(data.order_data);
        };

        ws.onclose = (event) => {
            console.log('WebSocket closed:', event);
            // Tentar reconectar após um atraso
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }
    */

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
