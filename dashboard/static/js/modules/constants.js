export const MONTAGE_COLORS = {
    '1': 'bg-blue-500',
    '2': 'bg-purple-600',
    '3': 'bg-green-600'
};

export const PIECE_ID_TO_DETAILS = {
    '1': { type: 'circulo', name: 'Círculo' },
    '2': { type: 'hexagono', name: 'Hexágono' },
    '3': { type: 'quadrado', name: 'Quadrado' }
};

// New API Endpoints
export const API_ENDPOINTS = {
    NOTIFICATIONS: '/api/notificacoes/',
    MARK_NOTIFICATION_READ: (id) => `/api/notificacoes/lidas/${id}/`,
    MARK_ALL_NOTIFICATIONS_READ: '/api/notificacoes/lidas/all/',
    DASHBOARD_WEBSOCKET: '/ws/dashboard/'
};