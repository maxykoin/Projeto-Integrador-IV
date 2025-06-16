from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from .models import Pedido, Estoque

# Dicionário de mapeamento global para reutilização
FORMA_PARA_VALOR = {'circle': 1, 'hexagon': 2, 'square': 3}
VALOR_PARA_FORMA = {v: k for k, v in FORMA_PARA_VALOR.items()}

def home(request):
    em_andamento = Pedido.objects.filter(status='em_andamento').count()
    pedidos_entregues = Pedido.objects.filter(status='entregue').count()

    # Pegando os objetos e a qtd
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

            pecas_convertidas = []
            for i in range(1, 10):
                nome_peca = data.get(f'peca{i}')
                
                if nome_peca is None:
                    return JsonResponse({'message': f'Peça {i} não fornecida.'}, status=400)
                
                valor = FORMA_PARA_VALOR.get(nome_peca) # Usa o mapeamento global
                if valor is None:
                    return JsonResponse({'message': f'Peça {i} inválida: "{nome_peca}". Valores esperados: circle, hexagon, square.'}, status=400)
                
                pecas_convertidas.append(valor)

            # Cria a matriz 3x3 dos pedidos internos
            matriz_pecas = [pecas_convertidas[i:i+3] for i in range(0, 9, 3)]

            # Verifica se há repetição de peças em algum pedido interno
            for idx, pedido_interno in enumerate(matriz_pecas, start=1):
                if len(set(pedido_interno)) != len(pedido_interno):
                    return JsonResponse(
                        {'message': f'Peças repetidas na montagem {idx}. Por favor, modifique para que não haja repetições.'},
                        status=400
                    )

            # Só cria o pedido se passou na validação
            pedido = Pedido.objects.create(pecas=matriz_pecas, status='em_andamento')

            return JsonResponse({'message': 'Pedido criado com sucesso!', 'pedido_id': str(pedido.id)}, status=201)

        except json.JSONDecodeError:
            return JsonResponse({'message': 'Corpo da requisição JSON inválido.'}, status=400)
        except Exception as e:
            print(f"Erro inesperado: {e}")
            return JsonResponse({'message': f'Ocorreu um erro interno: {str(e)}'}, status=500)

    return render(request, 'novoPedido.html')


def historico(request):
    pedidos_db = Pedido.objects.all().order_by('-id')
    pedidos_para_template = []

    for pedido in pedidos_db:
        pecas_flat_list = [] # Lista plana de 9 peças no formato string
        
        # 'pedido.pecas' é a matriz 3x3: [[p1,p2,p3], [p4,p5,p6], [p7,p8,p9]]
        for montagem_arr in pedido.pecas: # Itera sobre cada montagem (array de 3 peças)
            for peca_val in montagem_arr: # Itera sobre cada peça dentro da montagem (valor numérico)
                # Converte o valor numérico para a string da forma (circle, square, hexagon)
                pecas_flat_list.append(VALOR_PARA_FORMA.get(peca_val, '')) # Usa o mapeamento global

        # Adiciona a lista de strings de peças ao dicionário do pedido para o template
        # Certifique-se de que o objeto 'pedido' é um dicionário ou adicione um atributo dinamicamente
        # Ou, crie um novo dicionário com os dados relevantes
        pedido_dict = {
            'id': pedido.id,
            'status': pedido.status,
            'pecas_list': pecas_flat_list # Esta é a lista de strings que o JS espera
        }
        pedidos_para_template.append(pedido_dict)

    return render(request, 'historico.html', {'pedidos': pedidos_para_template})