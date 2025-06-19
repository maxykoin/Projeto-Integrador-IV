from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('pedidos/', views.novoPedido, name='novoPedido'),
    path('pedidos/historico', views.historico, name='historico'), 
    path('api/graficoPedidos/', views.getGraficoPedidos, name='graficoPedidos'),
    path('api/notificacoes/', views.getNotificacoes, name='getNotificacoes'),
    path('api/notificacoes/lidas/<int:notification_id>/', views.marcarComoLida, name='marcarComoLida'),
    path('api/notificacoes/lidas/all/', views.marcarTodasComoLida, name='marcarTodasComoLida'), 
    path('api/pedidos/<int:pedido_id>/updateStatus/', views.updateStatusPedido, name='updateStatusPedido')
]

    