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


from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.shortcuts import render
import json
from .models import Pedido  # ajuste conforme necessário

@csrf_exempt
def novoPedido(request):
    if request.method == 'POST':
        data = json.loads(request.body)

        # Mapeamento de forma → número
        forma_para_valor = {
            'circle': 0,
            'hexagon': 1,
            'square': 2
        }

        # Captura as 9 peças e converte
        pecas_convertidas = []
        for i in range(1, 10):
            nome_peca = data.get(f'peca{i}')
            valor = forma_para_valor.get(nome_peca)
            if valor is None:
                return JsonResponse({'error': f'Peça {i} inválida: {nome_peca}'}, status=400)
            pecas_convertidas.append(valor)

        # Converte a lista em uma matriz 3x3
        matriz_pecas = [pecas_convertidas[i:i+3] for i in range(0, 9, 3)]

        pedido = Pedido.objects.create(
            pecas=matriz_pecas,
            status='em_andamento'
        )

        return JsonResponse({'message': 'Pedido criado com sucesso!', 'pedido_id': str(pedido.id)})

    return render(request, 'novoPedido.html')


def historico(request):
    pedidos = Pedido.objects.all().order_by('-id')
    return render(request, 'historico.html', {'pedidos': pedidos})