document.addEventListener('DOMContentLoaded', () => {

    // ===============================
    //           CONSTANTES
    // ===============================

    // Cores específicas para cada montagem (mantidas para consistência visual)
    const MONTAGE_COLORS = {
        '1': 'bg-blue-500',
        '2': 'bg-purple-600',
        '3': 'bg-green-600'
    };

    // ===============================
    //        ELEMENTOS DO DOM
    // ===============================

    // Elementos da página "Novo Pedido"
    const newOrderForm = document.getElementById('pedidoForm');
    const confirmOrderButton = document.getElementById('confirmarBtn');

    // Elementos do Modal de Detalhes do Pedido (usado na página "Histórico")
    const orderDetailsModal = document.getElementById('pedido-modal');
    const closeModalButton = document.getElementById('close-modal-btn');
    const modalOrderId = document.getElementById('modal-pedido-id');
    const modalOrderStatus = document.getElementById('modal-pedido-status');
    const historicalOrderItems = document.querySelectorAll('.pedido-item'); // Itens da lista no histórico

    // Elementos da Busca no Histórico
    const searchInput = document.getElementById('searchInput');
    const orderList = document.getElementById('pedidoLista'); // A ul que contém os items do pedido
    let noResultsMessage = document.getElementById('avisoNenhumPedido'); // Pode ser nulo inicialmente


    // ===============================
    //    FUNÇÕES GENÉRICAS / HELPERS
    // ===============================

    /**
     * Renderiza a forma (círculo, quadrado, hexágono) dentro de um elemento HTML,
     * aplicando a cor e o ícone/SVG corretos.
     * @param {string} elementId - O ID do elemento HTML onde a forma será renderizada.
     * @param {string} shapeType - O tipo de forma ('circle', 'square', 'hexagon').
     * @param {string} montageNumber - O número da montagem (ex: '1', '2', '3') para determinar a cor base.
     */
    function renderShape(elementId, shapeType, montageNumber) {
        const element = document.getElementById(elementId);
        if (!element) return; // Retorna se o elemento não for encontrado

        // Redefine as classes básicas e limpa o conteúdo HTML
        element.className = 'w-16 h-16 flex items-center justify-center shadow-md transition-all duration-300';
        element.innerHTML = '';

        let shapeClass = '';
        let iconHtml = '';
        const colorClass = MONTAGE_COLORS[montageNumber] || 'bg-gray-100'; // Cor da montagem ou cinza padrão

        switch (shapeType) {
            case 'circle':
                shapeClass = 'rounded-full';
                iconHtml = '<i class="fas fa-circle text-white text-xl"></i>';
                break;
            case 'square':
                shapeClass = 'rounded'; // Tailwind: arredondamento padrão
                iconHtml = '<i class="fas fa-square text-white text-xl"></i>';
                break;
            case 'hexagon':
                shapeClass = 'hexagon-shape'; // Classe CSS customizada para clip-path
                iconHtml = `<svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <polygon points="12,2 22,7 22,17 12,22 2,17 2,7"/>
                            </svg>`;
                break;
            default: // Caso 'Escolha...' ou valor inválido, define como círculo cinza padrão
                element.classList.add('bg-gray-100', 'rounded-full');
                return;
        }
        element.classList.add(shapeClass, colorClass);
        element.innerHTML = iconHtml;
    }

    /**
     * Atualiza a pré-visualização de uma peça individual no formulário de novo pedido.
     * @param {string} selectName - O atributo 'name' do elemento <select> (ex: 'peca1').
     */
    function updatePiecePreview(selectName) {
        const selectElement = document.querySelector(`select[name="${selectName}"]`);
        if (!selectElement) return;

        const globalPieceIndex = parseInt(selectName.replace('peca', '')); // Extrai o número (1-9)
        const montageNumber = Math.ceil(globalPieceIndex / 3); // Calcula a montagem (1, 2 ou 3)
        const pieceInMontageIndex = (globalPieceIndex - 1) % 3 + 1; // Posição da peça dentro da montagem (1, 2 ou 3)

        const previewId = `peca_pedido${montageNumber}_peca${pieceInMontageIndex}`;
        const selectedShape = selectElement.value;

        renderShape(previewId, selectedShape, montageNumber.toString());
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
    //    FUNÇÕES "NOVO PEDIDO"
    // ===============================

    /**
     * Inicializa os event listeners para todos os seletores de peças no formulário de novo pedido.
     */
    function initializeNewOrderPieceSelectors() {
        for (let i = 1; i <= 9; i++) {
            const select = document.querySelector(`select[name="peca${i}"]`);
            if (select) {
                select.addEventListener('change', () => updatePiecePreview(`peca${i}`));
            }
        }
    }

    /**
     * Lida com o clique no botão de confirmar pedido.
     * @param {Event} event - O evento de clique.
     */
    async function handleConfirmOrderClick(event) {
        event.preventDefault(); // Previne o envio padrão do formulário

        if (!newOrderForm) return;

        const orderData = {};
        let allPiecesSelected = true;

        // Coleta os valores de todas as 9 peças
        for (let i = 1; i <= 9; i++) {
            const select = newOrderForm.querySelector(`select[name="peca${i}"]`);
            if (select && select.value) {
                orderData[`peca${i}`] = select.value;
            } else {
                allPiecesSelected = false;
                break; // Sai do loop se alguma peça não for selecionada
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
            newOrderForm.reset(); // Limpa o formulário após o sucesso
            // Reseta os previews para o estado inicial
            for (let i = 1; i <= 9; i++) {
                updatePiecePreview(`peca${i}`);
            }

        } catch (error) {
            alert(`❌ Erro: ${error.message}`);
            console.error('Erro detalhado ao confirmar pedido:', error);
        }
    }


    // ===============================
    //    FUNÇÕES "HISTÓRICO DE PEDIDOS" (MODAL E BUSCA)
    // ===============================

    /**
     * Exibe o modal de detalhes do pedido com os dados fornecidos.
     * @param {string} id - O ID do pedido.
     * @param {string} status - O status do pedido.
     * @param {string} piecesString - Uma string das peças separadas por vírgulas (ex: "circle,square,hexagon,...").
     */
    function showOrderDetailsModal(id, status, piecesString) {
        modalOrderId.textContent = id;
        modalOrderStatus.textContent = status;
        modalOrderStatus.className = getStatusClasses(status); // Aplica classes de cor

        // Limpar visualizações existentes no pop-up antes de preencher
        for (let m = 1; m <= 3; m++) {
            for (let p = 1; p <= 3; p++) {
                renderShape(`modal_peca_pedido${m}_peca${p}`, '', ''); // Limpa com cor padrão
            }
        }

        const pieces = piecesString.split(','); // Converte string para array de formas
        
        if (pieces.length === 9) { // Garante que temos as 9 peças
            for (let i = 0; i < pieces.length; i++) {
                const globalPieceIndex = i + 1; // De 1 a 9
                const montageNumber = Math.ceil(globalPieceIndex / 3); // Montagem 1, 2 ou 3
                
                // Posição da peça dentro da visualização da montagem (1, 2 ou 3)
                // Se o objetivo é que a 1ª selecionada apareça na 1ª posição da visualização,
                // a 2ª na 2ª, e a 3ª na 3ª.
                const pieceInDisplayIndex = (globalPieceIndex - 1) % 3 + 1; 
                
                const previewId = `modal_peca_pedido${montageNumber}_peca${pieceInDisplayIndex}`;
                renderShape(previewId, pieces[i], montageNumber.toString());
            }
        }

        // Exibe o modal
        orderDetailsModal.classList.remove('hidden');
        orderDetailsModal.classList.add('flex');
    }

    /**
     * Esconde o modal de detalhes do pedido.
     */
    function hideOrderDetailsModal() {
        orderDetailsModal.classList.add('hidden');
        orderDetailsModal.classList.remove('flex');
    }

    /**
     * Adiciona event listeners para os itens da lista de pedidos no histórico
     * para abrir o modal de detalhes.
     */
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

    /**
     * Configura a funcionalidade de busca no histórico de pedidos.
     */
    function setupOrderSearch() {
        // Se não há input de busca ou lista de pedidos, não inicializa a busca
        if (!searchInput || !orderList) return; 

        // Cria a mensagem "Pedido não encontrado" se ela ainda não existir
        if (!noResultsMessage) {
            noResultsMessage = document.createElement('p');
            noResultsMessage.id = 'avisoNenhumPedido';
            noResultsMessage.className = 'text-center text-red-600 mt-4 font-semibold';
            noResultsMessage.textContent = 'Pedido não encontrado.';
            // Encontrar o pai para inserir a mensagem (acima do footer, abaixo da lista)
            orderList.parentNode.appendChild(noResultsMessage);
        }
        noResultsMessage.style.display = 'none'; // Garante que esteja escondida por padrão


        function filterOrders() {
            const query = searchInput.value.trim().toLowerCase();
            let found = false;

            historicalOrderItems.forEach(item => {
                const id = item.dataset.id.toLowerCase();
                const status = item.dataset.status.toLowerCase();

                if (id.includes(query) || status.includes(query)) {
                    item.style.display = 'flex'; // Exibe o item
                    found = true;
                } else {
                    item.style.display = 'none'; // Esconde o item
                }
            });

            noResultsMessage.style.display = found ? 'none' : 'block'; // Mostra/esconde a mensagem
        }

        searchInput.addEventListener('input', filterOrders);
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Previne o envio do formulário
                filterOrders();
            }
        });
    }


    // ===============================
    //      INICIALIZAÇÃO GERAL
    // ===============================

    // Lógica para a página "Novo Pedido"
    if (newOrderForm) { 
        initializeNewOrderPieceSelectors();
        // Atualiza previews iniciais para todos os 9 campos (se houver valores pré-selecionados)
        for (let i = 1; i <= 9; i++) {
            updatePiecePreview(`peca${i}`); 
        }
        confirmOrderButton.addEventListener('click', handleConfirmOrderClick);
    }

    // Lógica para o Modal de Detalhes do Pedido
    if (orderDetailsModal) { // Verifica se o modal está presente na página
        closeModalButton.addEventListener('click', hideOrderDetailsModal);
        orderDetailsModal.addEventListener('click', (event) => {
            if (event.target === orderDetailsModal) { // Clicou no overlay
                hideOrderDetailsModal();
            }
        });
        initializeHistoricalOrderItems(); // Inicializa listeners para itens do histórico
    }

    // Lógica para a Busca no Histórico
    setupOrderSearch();
});
