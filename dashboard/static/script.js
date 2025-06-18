document.addEventListener('DOMContentLoaded', () => {

    // ===============================
    //           CONSTANTES
    // ===============================

    const MONTAGE_COLORS = {
        '1': 'bg-blue-500',
        '2': 'bg-purple-600',
        '3': 'bg-green-600'
    };

    // Mapeamento de ID da peça para o seu 'tipo' e nome de exibição
    const PIECE_ID_TO_DETAILS = {
        '1': { type: 'circulo', name: 'Círculo' },
        '2': { type: 'hexagono', name: 'Hexágono' },
        '3': { type: 'quadrado', name: 'Quadrado' }
    };

    // ===============================
    //         ELEMENTOS DO DOM
    // ===============================

    // Dashboard
    const totalPedidosEl = document.getElementById('total-pedidos');
    const pedidosEmAndamentoEl = document.getElementById('pedidos-em-andamento');
    const circuloQtdEl = document.getElementById('circulo-qtd');
    const hexagonoQtdEl = document.getElementById('hexagono-qtd');
    const quadradoQtdEl = document.getElementById('quadrado-qtd');
    const lowStockAlertEl = document.querySelector('section[role="alert"]'); // O alerta de estoque baixo


    // Novo Pedido
    const newOrderForm = document.getElementById('pedidoForm');
    const confirmOrderButton = document.getElementById('confirmarBtn');

    // Histórico de Pedidos
    const orderDetailsModal = document.getElementById('pedido-modal');
    const closeModalButton = document.getElementById('close-modal-btn');
    const modalOrderId = document.getElementById('modal-pedido-id');
    const modalOrderStatus = document.getElementById('modal-pedido-status');
    const historicalOrderItems = document.querySelectorAll('.pedido-item');

    // Busca no Histórico
    const searchInput = document.getElementById('searchInput');
    const orderList = document.getElementById('pedidoLista');
    let noResultsMessage = document.getElementById('avisoNenhumPedido'); // Pode ser nulo inicialmente

    // Toast
    const toastContainer = document.getElementById('toast-container');

    // Modo Escuro
    const themeToggleBtn = document.getElementById('theme-toggle');


    // ===============================
    //      FUNÇÕES GENÉRICAS / HELPERS
    // ===============================

    /**
     * Renderiza a forma (círculo, quadrado, hexágono) dentro de um elemento HTML.
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
    //       FUNÇÕES DE DASHBOARD EM TEMPO REAL (WEBSOCKETS)
    // ===============================
    let websocket;

    function connectWebSocket() {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            console.log("WebSocket já está conectado.");
            return;
        }

        const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const wsURL = wsProtocol + window.location.host + '/ws/dashboard/';
        websocket = new WebSocket(wsURL);

        websocket.onopen = () => {
            console.log("WebSocket conectado ao dashboard!");
        };

        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'dashboard_update') {
                updateDashboardUI(data.data);
            } else if (data.type === 'dashboard_message' && data.message_type === 'show_toast') {
                showToast(data.toast_message, data.toast_type);
            } else {
                console.log("Mensagem WebSocket recebida:", data);
            }
        };

        websocket.onclose = (event) => {
            console.warn("WebSocket desconectado. Tentando reconectar em 3 segundos...", event.code, event.reason);
            setTimeout(connectWebSocket, 3000);
        };

        websocket.onerror = (error) => {
            console.error("Erro no WebSocket:", error);
            websocket.close(); // Tenta fechar para acionar o onclose e reconectar
        };
    }

    function updateDashboardUI(data) {
        if (totalPedidosEl && pedidosEmAndamentoEl && circuloQtdEl && hexagonoQtdEl && quadradoQtdEl) {
            totalPedidosEl.textContent = data.em_andamento_count + data.concluido_count;
            pedidosEmAndamentoEl.textContent = data.em_andamento_count;

            // Atualiza quantidades e bordas de estoque baixo
            for (const shapeType in data.stock_info) {
                const stockItem = data.stock_info[shapeType];
                let element;
                let parentDiv; // O card completo da peça

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
                        // Mostra o alerta geral de estoque baixo se algum estiver baixo
                        if (lowStockAlertEl) lowStockAlertEl.style.display = 'block';
                    } else {
                        parentDiv.classList.remove('border-4', 'border-red-500');
                        // Oculta o alerta geral apenas se NENHUM estiver baixo.
                        // Para um controle mais preciso, seria bom uma lógica que verifica todos os 3.
                    }
                }
            }
            // Lógica para o alerta geral de estoque baixo
            // Isso pode ser mais complexo se a página não recarregar.
            // Por simplicidade, se o alerta é sempre visível, não precisamos fazer muito aqui.
            // Para ocultar, precisaríamos saber se NENHUM está low_stock.
        }
    }


    // ===============================
    //       FUNÇÕES DE NOTIFICAÇÃO TOAST
    // ===============================

    /**
     * Exibe uma notificação toast na tela.
     * @param {string} message - A mensagem a ser exibida.
     * @param {string} type - O tipo de toast ('success', 'error', 'info', 'warning').
     * @param {number} duration - Duração em milissegundos (padrão: 3000ms).
     */
    function showToast(message, type, duration = 3000) {
        if (!toastContainer) {
            console.warn("Contêiner de Toast não encontrado!");
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // Força o reflow para garantir a transição
        void toast.offsetWidth;

        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => {
                toast.remove();
            }, { once: true });
        }, duration);
    }


    // ===============================
    //       FUNÇÕES DE MODO ESCURO
    // ===============================

    function initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (themeToggleBtn) {
                themeToggleBtn.querySelector('i').className = 'fas fa-sun'; // Mudar para ícone de sol
            }
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            if (themeToggleBtn) {
                themeToggleBtn.querySelector('i').className = 'fas fa-moon'; // Mudar para ícone de lua
            }
        }
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        if (themeToggleBtn) {
            themeToggleBtn.querySelector('i').className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
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
                orderData[`peca${i}`] = parseInt(select.value); // Converte para int para enviar para o backend
            } else {
                allPiecesSelected = false;
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

            // O backend já envia um toast, mas podemos ter um local aqui também se quisermos.
            // showToast(`✅ Pedido criado com ID: ${responseData.pedido_id}`, 'success');
            newOrderForm.reset();
            for (let i = 1; i <= 9; i++) {
                updatePiecePreview(`peca${i}`);
            }

        } catch (error) {
            // O backend já envia um toast para erros internos, mas para erros de rede, isso é útil.
            if (!error.message.startsWith('Erro ao criar pedido')) { // Evita duplicidade se o backend já mandou a msg
                showToast(`❌ Erro de comunicação: ${error.message}`, 'error');
            }
            console.error('Detailed error confirming order:', error);
        }
    }


    // ===============================
    //    FUNÇÕES "HISTÓRICO DE PEDIDOS" (MODAL E BUSCA)
    // ===============================

    /**
     * Exibe o modal de detalhes do pedido com os dados fornecidos.
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
                renderShape(`modal_peca_pedido${m}_peca${p}`, '', '');
                document.getElementById(`modal_label_pedido${m}_peca${p}`).textContent = '';
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
                    document.getElementById(labelId).textContent = `Peça ${pieceInDisplayIndex}: ${pieceDetails.name}`;
                } else {
                     renderShape(previewId, 'unknown', montageNumber.toString());
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

    // Inicializa o tema (claro/escuro) ao carregar a página
    initializeTheme();

    // Event Listener para alternar tema
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
    
    // Inicia o WebSocket para o Dashboard se estiver na página home
    if (window.location.pathname === '/') {
        connectWebSocket();
    }


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