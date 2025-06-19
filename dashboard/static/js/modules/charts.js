import { showToast, showLoader, hideLoader } from './utils.js';

// ELEMENTOS DO DOM
export const ordersChartCanvas = document.getElementById('ordersChart');
export const filter7DaysBtn = document.getElementById('filter7Days');
export const filter30DaysBtn = document.getElementById('filter30Days');
export const filterThisMonthBtn = document.getElementById('filterThisMonth');
let ordersChart; // Variável para armazenar a instância do gráfico Chart.js


/**
 * Busca dados de pedidos (criados e concluídos) para o gráfico.
 * @param {string} period - O período para buscar os dados ('7days', '30days', 'this_month').
 * @returns {Promise<object>} Dados do gráfico.
 */
async function fetchOrdersChartData(period) {
    showLoader();
    try {
        const response = await fetch(`/api/graficoPedidos/?period=${period}`); // URL ATUALIZADA
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Erro ao buscar dados do gráfico de pedidos:", error);
        showToast("Erro ao carregar dados do gráfico de pedidos.", "error");
        return { labels: [], created_counts: [], completed_counts: [] };
    } finally {
        hideLoader();
    }
}

/**
 * Renderiza ou atualiza o gráfico de linha de pedidos.
 * @param {object} chartData - Os dados a serem usados no gráfico (labels, created_counts, completed_counts).
 */
function renderOrdersChart(chartData) {
    if (!ordersChartCanvas) return;

    const ctx = ordersChartCanvas.getContext('2d');

    if (ordersChart) {
        ordersChart.destroy(); // Destroi a instância anterior do gráfico se existir
    }

    ordersChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [
                {
                    label: 'Pedidos Criados',
                    data: chartData.created_counts,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1,
                    fill: false
                },
                {
                    label: 'Pedidos Concluídos',
                    data: chartData.completed_counts,
                    borderColor: 'rgb(153, 102, 255)',
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    tension: 0.1,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Importante para controle de altura via CSS
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Data'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Número de Pedidos'
                    },
                    beginAtZero: true,
                    ticks: {
                        precision: 0 // Garante que os valores no eixo Y sejam inteiros
                    }
                }
            }
        }
    });
}

/**
 * Atualiza o gráfico de pedidos com base no período selecionado.
 * Também atualiza o estilo dos botões de filtro.
 * @param {string} period - O período a ser exibido no gráfico.
 */
export async function updateOrdersChart(period) {
    const data = await fetchOrdersChartData(period);
    renderOrdersChart(data);

    // Atualizar estilos dos botões de filtro
    const buttons = [filter7DaysBtn, filter30DaysBtn, filterThisMonthBtn];
    buttons.forEach(button => {
        if (button) {
            button.classList.remove('bg-purple-500', 'text-white');
            button.classList.add('bg-gray-200', 'text-gray-700');
        }
    });

    let activeButton;
    if (period === '7days' && filter7DaysBtn) activeButton = filter7DaysBtn;
    else if (period === '30days' && filter30DaysBtn) activeButton = filter30DaysBtn;
    else if (period === 'this_month' && filterThisMonthBtn) activeButton = filterThisMonthBtn;

    if (activeButton) {
        activeButton.classList.remove('bg-gray-200', 'text-gray-700');
        activeButton.classList.add('bg-purple-500', 'text-white');
    }
}