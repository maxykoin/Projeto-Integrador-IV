document.addEventListener('DOMContentLoaded', () => {
    const pedidoForm = document.getElementById('pedidoForm');
    const confirmarBtn = document.getElementById('confirmarBtn');

    // Inicializa os seletores de peças para TODOS os 9 campos
    initAllPieceSelectors();

    // Setup da função de busca (se aplicável, mantenha ou remova)
    // setupSearch(); // Remova ou ajuste se não houver campo de busca nesta página

    if (confirmarBtn) {
        confirmarBtn.addEventListener('click', handleConfirmClick);
    }

    // Atualiza previews iniciais para todos os 9 campos
    for (let i = 1; i <= 9; i++) {
        updatePiecePreview(`peca${i}`);
    }

    // --- Funções para o formulário de pedido ---

    function initAllPieceSelectors() {
        for (let i = 1; i <= 9; i++) { // Loop para todas as 9 peças
            const select = document.querySelector(`select[name="peca${i}"]`);
            if (select) {
                select.addEventListener('change', () => updatePiecePreview(`peca${i}`));
            }
        }
    }

    // Adapta a função de atualização de preview para os novos IDs e nomes
    function updatePiecePreview(selectName) {
        const select = document.querySelector(`select[name="${selectName}"]`);
        
        // Exemplo: 'peca1' -> ['1', '1'] ; 'peca4' -> ['2', '1']
        // Usamos o nome do select para derivar o ID do preview
        // 'peca1' -> 'peca_pedido1_peca1'
        // 'peca4' -> 'peca_pedido2_peca1'
        const globalPecaIndex = parseInt(selectName.replace('peca', '')); // 1 a 9
        const pedidoIndex = Math.ceil(globalPecaIndex / 3); // 1, 2 ou 3
        const pecaInPedidoIndex = (globalPecaIndex - 1) % 3 + 1; // 1, 2 ou 3

        const previewId = `peca_pedido${pedidoIndex}_peca${pecaInPedidoIndex}`;
        const preview = document.getElementById(previewId);
        
        if (!select || !preview) return;

        const value = select.value;

        // Resetar classes e conteúdo
        preview.className = 'w-16 h-16 flex items-center justify-center shadow-md transition-all duration-300';
        preview.innerHTML = '';

        switch (value) {
            case 'circle':
                preview.classList.add('bg-blue-500', 'rounded-full');
                preview.innerHTML = '<i class="fas fa-circle text-white text-xl"></i>';
                break;

            case 'square':
                preview.classList.add('bg-purple-600', 'rounded'); // Adicionado rounded para consistência visual
                preview.innerHTML = '<i class="fas fa-square text-white text-xl"></i>';
                break;

            case 'hexagon':
                preview.classList.add('bg-green-600', 'hexagon-shape'); // Usando a classe CSS para o clip-path
                preview.innerHTML = `
                    <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <polygon points="12,2 22,7 22,17 12,22 2,17 2,7"/>
                    </svg>`;
                break;
            default: // Caso a opção "Escolha..." esteja selecionada
                preview.classList.add('bg-gray-100', 'rounded-full'); // Retorna ao estado inicial
                break;
        }
    }

    // Mapeamento de 'shape' (do HTML) para 'nome_peca' (para envio ao backend, se necessário, embora agora o backend espere o valor numérico)
    function shapeToNomePeca(shape) {
        switch (shape) {
            case 'circle': return 'circulo';
            case 'hexagon': return 'hexagono';
            case 'square': return 'quadrado';
            default: return null;
        }
    }

    async function handleConfirmClick(event) {
        event.preventDefault();

        if (!pedidoForm) return;

        const pedidoData = {};
        let allPiecesSelected = true;

        // Coleta os valores de todas as 9 peças
        for (let i = 1; i <= 9; i++) {
            const select = pedidoForm.querySelector(`select[name="peca${i}"]`);
            if (select && select.value) {
                // Aqui você pode enviar 'circle', 'hexagon', 'square' como strings
                // O backend (Python) fará a conversão para 0, 1, 2
                pedidoData[`peca${i}`] = select.value;
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
            const response = await fetch('/pedidos/', { // Certifique-se que esta URL está correta
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pedidoData), // Envia todas as 9 peças
            });

            const data = await response.json();

            if (!response.ok) {
                // Se a resposta não for OK (status 4xx ou 5xx), lança um erro
                throw new Error(data.message || 'Erro ao criar pedido. Verifique o console para detalhes.');
            }

            alert(`✅ Pedido criado com ID: ${data.pedido_id}`);
            pedidoForm.reset(); // Limpa o formulário após o sucesso
            for (let i = 1; i <= 9; i++) { // Reseta os previews para o estado inicial
                updatePiecePreview(`peca${i}`);
            }

        } catch (err) {
            alert(`❌ Erro: ${err.message}`);
            console.error('Erro detalhado:', err);
        }
    }


    function setupSearch() {
        const input = document.getElementById('searchInput');
        if (!input) return;

        const items = document.querySelectorAll('.pedido-item');

        let aviso = document.getElementById('avisoNenhumPedido');
        if (!aviso) {
            aviso = document.createElement('p');
            aviso.id = 'avisoNenhumPedido';
            aviso.className = 'text-center text-red-600 mt-4 font-semibold';
            aviso.textContent = 'Pedido não encontrado.';
            aviso.style.display = 'none';
            input.parentNode.parentNode.appendChild(aviso);
        }

        function filtrarPedidos() {
            const query = input.value.trim().toLowerCase();
            let encontrado = false;

            items.forEach(item => {
                const id = item.dataset.id.toLowerCase();
                const status = item.dataset.status.toLowerCase();

                if (id.includes(query) || status.includes(query)) {
                    item.style.display = 'flex';
                    encontrado = true;
                } else {
                    item.style.display = 'none';
                }
            });

            aviso.style.display = encontrado ? 'none' : 'block';
        }

        input.addEventListener('input', filtrarPedidos);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                filtrarPedidos();
            }
        });
    }

  const itensPedido = document.querySelectorAll('.pedido-item');
  const modal = document.getElementById('pedidoModal');
  const fecharBtn = document.getElementById('fecharModal');

  const spanId = document.getElementById('modalPedidoId');
  const spanStatus = document.getElementById('modalPedidoStatus');
  const divPecas = document.getElementById('modalPedidoPecas');

  itensPedido.forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const status = item.dataset.status;

      spanId.textContent = id;
      spanStatus.textContent = formatarStatus(status);

      // Limpa peças antigas do modal
      divPecas.innerHTML = '';

      // Clona as peças do pedido
      const pecas = item.querySelectorAll('.flex.w-8.h-8, .flex.w-8.h-8 svg');
      pecas.forEach(peca => {
        const clone = peca.cloneNode(true);
        divPecas.appendChild(clone);
      });

      // Mostra o modal
      modal.classList.remove('hidden');
    });
  });

  // Fecha modal com botão
  fecharBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  // Fecha modal clicando fora do conteúdo
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });

  function formatarStatus(status) {
    if (status === "em_andamento") return "Em andamento";
    if (status === "entregue") return "Entregue";
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
});
