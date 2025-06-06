from django.shortcuts import render
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from .models import Pedido, Estoque

def home(request):
    em_andamento = Pedido.objects.filter(status='em_andamento').count()
    pedidos_entregues = Pedido.objects.filter(status='entregue').count()

    # Pegando os objetos e seus campos qtd
    circulo = Estoque.objects.get(id=0).qtd
    hexagono = Estoque.objects.get(id=1).qtd
    quadrado = Estoque.objects.get(id=2).qtd

    return render(request, 'home.html', {
        'em_andamento': em_andamento,
        'entregue': pedidos_entregues,
        'circulo': circulo,
        'hexagono': hexagono,
        'quadrado': quadrado,
    })


@csrf_exempt
def novoPedido(request):
    if request.method == 'POST':
        data = json.loads(request.body)

        peca1 = data.get('peca1')
        peca2 = data.get('peca2')
        peca3 = data.get('peca3')

        pedido = Pedido.objects.create(
            pecas=[peca1, peca2, peca3],
            status='em_andamento'
        )

        return JsonResponse({'message': 'Pedido criado com sucesso!', 'pedido_id': str(pedido.id)})

    return render(request, 'novoPedido.html')

def historico(request):
    pedidos = Pedido.objects.all().order_by('-id')
    return render(request, 'historico.html', {'pedidos': pedidos})