import { showToast, showLoader, hideLoader } from './utils.js';

// DOM Elements
export const ordersChartCanvas = document.getElementById('ordersChart');
export const filter7DaysBtn = document.getElementById('filter7Days');
export const filter30DaysBtn = document.getElementById('filter30Days');
export const filterThisMonthBtn = document.getElementById('filterThisMonth');
let ordersChart; // Chart.js 

async function fetchOrdersChartData(period) {
    showLoader();
    try {
        const response = await fetch(`/api/graficoPedidos/?period=${period}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching chart data:", error);
        showToast("Failed to load chart data.", "error");
        return { labels: [], created_counts: [], completed_counts: [] };
    } finally {
        hideLoader();
    }
}

function renderOrdersChart(chartData) {
    if (!ordersChartCanvas) return;

    const ctx = ordersChartCanvas.getContext('2d');

    if (ordersChart) {
        ordersChart.destroy();
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
            maintainAspectRatio: false,
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
                        precision: 0
                    }
                }
            }
        }
    });
}

function updateFilterButtonStyles(activePeriod) {
    const buttons = [
        { btn: filter7DaysBtn, period: '7days' },
        { btn: filter30DaysBtn, period: '30days' },
        { btn: filterThisMonthBtn, period: 'this_month' }
    ];

    buttons.forEach(({ btn, period }) => {
        if (!btn) return;

        const isActive = period === activePeriod;
        btn.classList.toggle('bg-purple-500', isActive);
        btn.classList.toggle('text-white', isActive);
        btn.classList.toggle('bg-gray-200', !isActive);
        btn.classList.toggle('text-gray-700', !isActive);
    });
}

export async function updateOrdersChart(period) {
    const data = await fetchOrdersChartData(period);
    renderOrdersChart(data);
    updateFilterButtonStyles(period);
}