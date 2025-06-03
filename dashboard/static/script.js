document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded! Script is running.'); // ADD THIS

    const pedidoForm = document.getElementById('pedidoForm');
    const confirmarBtn = document.getElementById('confirmarBtn');

    if (pedidoForm) {
        console.log('pedidoForm found.'); // ADD THIS
        pedidoForm.addEventListener('submit', handleFormSubmit);
    } else {
        console.error('pedidoForm NOT found!'); // ADD THIS
    }

    if (confirmarBtn) {
        console.log('confirmarBtn found.'); // ADD THIS
        confirmarBtn.addEventListener('click', handleConfirmClick);
    } else {
        console.error('confirmarBtn NOT found!'); // ADD THIS
    }

    function handleFormSubmit(event) {
        event.preventDefault();
        console.log('handleFormSubmit triggered.'); // ADD THIS

        const peca1 = this.peca1.value;
        const peca2 = this.peca2.value;
        const peca3 = this.peca3.value;

        console.log('Form values:', { peca1, peca2, peca3 }); // ADD THIS

        setShape('peca1', peca1);
        setShape('peca2', peca2);
        setShape('peca3', peca3);
    }

    function setShape(elementId, shape) {
        const el = document.getElementById(elementId);
        if (!el) {
            console.warn(`Element with ID '${elementId}' not found in setShape.`); // MODIFIED
            return;
        }
        console.log(`Setting shape for ${elementId} to ${shape}`); // ADD THIS
        el.className = 'shape';
        switch (shape) {
            case 'circle': el.classList.add('circle', 'blue'); break;
            case 'hexagon': el.classList.add('hexagon', 'green'); break;
            case 'square': el.classList.add('square', 'purple'); break;
            default: console.warn(`Unknown shape: '${shape}' for element ID: '${elementId}'.`); break;
        }
    }

    async function handleConfirmClick(event) {
        event.preventDefault();
        console.log('handleConfirmClick triggered. About to send fetch request.'); // ADD THIS

        const peca1 = document.getElementById('peca1')?.value; // Note: These are the *display* divs, not the select inputs
        const peca2 = document.getElementById('peca2')?.value;
        const peca3 = document.getElementById('peca3')?.value;

        // CRITICAL: Your peca1, peca2, peca3 from the DOM are the *divs* you update,
        // not the select inputs. We need to get the values from the *select* inputs.
        // Let's modify this to get the values from the form again.
        const formPeca1 = pedidoForm.peca1.value; // Access directly from the form
        const formPeca2 = pedidoForm.peca2.value;
        const formPeca3 = pedidoForm.peca3.value;

        console.log('Values for POST:', { formPeca1, formPeca2, formPeca3}); // ADD THIS


        if (!formPeca1 || !formPeca2 || !formPeca3) { // Use formPecaX for validation
            alert('Por favor, preencha todas as peças antes de confirmar o pedido.');
            console.warn('Validation failed: Missing pecas.'); // ADD THIS
            return;
        }


        try {
            const response = await fetch('/pedidos/', { // Double check this URL.
                                                         // If your main urls.py is like path('', include('myapp.urls'))
                                                         // and myapp/urls.py is path('', views.myview)
                                                         // then this should be '/'
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ peca1: formPeca1, peca2: formPeca2, peca3: formPeca3 }) // Use formPecaX here
            });
            console.log('Fetch request sent. Waiting for response...'); // ADD THIS

            if (!response.ok) {
                const errorData = await response.json();
                console.error('HTTP Error response:', errorData); // ADD THIS
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Response data:', data);
            alert(`✅ Pedido enviado com sucesso! ID: ${data.pedido_id}`);

        } catch (error) {
            console.error('Erro ao enviar o pedido na fetch:', error); // ADD THIS
            alert(`❌ Erro ao enviar o pedido: ${error.message || 'Um erro desconhecido ocorreu.'}`);
        }
    }
});