document.addEventListener('DOMContentLoaded', () => {
    const pedidoForm = document.getElementById('pedidoForm');
    const confirmarBtn = document.getElementById('confirmarBtn');

    if (pedidoForm) {
        pedidoForm.addEventListener('submit', handleFormSubmit);
    }

    if (confirmarBtn) {
        confirmarBtn.addEventListener('click', handleConfirmClick);
    }

    function handleFormSubmit(event) {
        event.preventDefault();

        const peca1 = pedidoForm.peca1.value;
        const peca2 = pedidoForm.peca2.value;
        const peca3 = pedidoForm.peca3.value;

        setShape('peca1', peca1);
        setShape('peca2', peca2);
        setShape('peca3', peca3);
    }

    function setShape(elementId, shape) {
        const el = document.getElementById(elementId);
        if (!el) return;

        el.className = 'shape';
        switch (shape) {
            case 'circle':
                el.classList.add('circle', 'blue');
                break;
            case 'hexagon':
                el.classList.add('hexagon', 'green');
                break;
            case 'square':
                el.classList.add('square', 'purple');
                break;
        }
    }

    function shapeToNumber(shape) {
        switch (shape) {
            case 'circle': return 0;
            case 'hexagon': return 1;
            case 'square': return 2;
            default: return null; // caso inesperado
        }
    }

    async function handleConfirmClick(event) {
        event.preventDefault();

        const formPeca1 = pedidoForm.peca1.value;
        const formPeca2 = pedidoForm.peca2.value;
        const formPeca3 = pedidoForm.peca3.value;

        if (!formPeca1 || !formPeca2 || !formPeca3) {
            alert('Por favor, preencha todas as peças antes de confirmar o pedido.');
            return;
        }

        const pedido = {
            peca1: shapeToNumber(formPeca1),
            peca2: shapeToNumber(formPeca2),
            peca3: shapeToNumber(formPeca3)
        };

        try {
            const response = await fetch('/pedidos/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(pedido)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Erro: ${response.status}`);
            }

            const data = await response.json();
            alert(`✅ Pedido enviado com sucesso! ID: ${data.pedido_id}`);

            // ✅ Atualizar o contador se o status for "em andamento"
            if (data.status === 'em_andamento') {
                const andamentoSpan = document.getElementById('pedidosAndamento');
                if (andamentoSpan) {
                    const currentCount = parseInt(andamentoSpan.textContent, 10);
                    andamentoSpan.textContent = currentCount + 1;
                }
            }

        } catch (error) {
            alert(`❌ Erro ao enviar o pedido: ${error.message || 'Um erro desconhecido ocorreu.'}`);
        }
    }
});


