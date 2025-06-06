document.addEventListener('DOMContentLoaded', () => {
  // --- Código do seu pedidoForm e filtros ---
  const pedidoForm = document.getElementById('pedidoForm');
  const confirmarBtn = document.getElementById('confirmarBtn');

  initPieceSelectors();
  setupSearch();

  if (confirmarBtn) {
    confirmarBtn.addEventListener('click', handleConfirmClick);
  }

  // Atualiza preview inicial (caso já tenha seleção)
  ['1', '2', '3'].forEach(updatePreview);

  // --- Funções do pedidoForm ---

  function initPieceSelectors() {
    ['1', '2', '3'].forEach(num => {
      const select = document.querySelector(`select[name="peca${num}"]`);
      if (select) {
        select.addEventListener('change', () => updatePreview(num));
      }
    });
  }

  function updatePreview(id) {
    const select = document.querySelector(`select[name="peca${id}"]`);
    const preview = document.getElementById(`peca${id}`);
    if (!select || !preview) return;

    const value = select.value;

    preview.className = 'w-16 h-16 flex items-center justify-center shadow-md transition-all duration-300';
    preview.innerHTML = '';

    switch (value) {
      case 'circle':
        preview.classList.add('bg-blue-500', 'rounded-full');
        preview.innerHTML = '<i class="fas fa-circle text-white text-xl"></i>';
        break;

      case 'square':
        preview.classList.add('bg-purple-600');
        preview.innerHTML = '<i class="fas fa-square text-white text-xl"></i>';
        break;

      case 'hexagon':
        preview.classList.add('bg-green-600', 'rounded');
        preview.innerHTML = `
          <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <polygon points="12,2 22,7 22,17 12,22 2,17 2,7"/>
          </svg>`;
        break;
    }
  }

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

    const p1 = pedidoForm.peca1?.value;
    const p2 = pedidoForm.peca2?.value;
    const p3 = pedidoForm.peca3?.value;

    if (!p1 || !p2 || !p3) {
      alert('Selecione todas as peças.');
      return;
    }

    const pedido = {
      peca1: shapeToNomePeca(p1),
      peca2: shapeToNomePeca(p2),
      peca3: shapeToNomePeca(p3),
    };

    try {
      const response = await fetch('/pedidos/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedido),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar pedido');
      }

      alert(`✅ Pedido criado com ID: ${data.pedido_id}`);
    } catch (err) {
      alert(`❌ ${err.message}`);
    }
  }


  function setupSearch() {
    const input = document.getElementById('searchInput');
    if (!input) return; // Se não encontrar o input, sai da função

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
});