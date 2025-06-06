from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('pedidos/', views.novoPedido, name='novoPedido'),
    path('pedidos/historico', views.historico, name='historico'),
]

    