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
    circulo = Estoque.objects.get(id=1).qtd
    hexagono = Estoque.objects.get(id=2).qtd
    quadrado = Estoque.objects.get(id=3).qtd

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
        try:
            data = json.loads(request.body)

            forma_para_valor = {
                'circle': 1,
                'hexagon': 2,
                'square': 3
            }

            pecas_convertidas = []
            for i in range(1, 10):
                nome_peca = data.get(f'peca{i}')
            
                if nome_peca is None:
                    return JsonResponse({'message': f'Peça {i} não fornecida.'}, status=400)
                
                valor = forma_para_valor.get(nome_peca)
                if valor is None:
                    return JsonResponse({'message': f'Peça {i} inválida: "{nome_peca}". Valores esperados: circle, hexagon, square.'}, status=400)
                
                pecas_convertidas.append(valor)

            matriz_pecas = [pecas_convertidas[i:i+3] for i in range(0, 9, 3)]

            pedido = Pedido.objects.create(
                pecas=matriz_pecas,
                status='em_andamento'
            )

            return JsonResponse({'message': 'Pedido criado com sucesso!', 'pedido_id': str(pedido.id)}, status=201)

        except json.JSONDecodeError:
            return JsonResponse({'message': 'Corpo da requisição JSON inválido.'}, status=400)
        except Exception as e:
            print(f"Erro inesperado: {e}")
            return JsonResponse({'message': f'Ocorreu um erro interno: {str(e)}'}, status=500)

    return render(request, 'novoPedido.html')


def historico(request):
    pedidos = Pedido.objects.all().order_by('-id')
    return render(request, 'historico.html', {'pedidos': pedidos})