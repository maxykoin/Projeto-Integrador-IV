from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from django.utils import timezone 
from .models import Pedido, Estoque, Peca, PEDIDO_STATUS_CHOICES 


def home(request):
    # Obtém a contagem de pedidos por status
    em_andamento_count = Pedido.objects.filter(status='em_andamento').count()
    pedidos_concluidos_count = Pedido.objects.filter(status='concluido').count()

    # Define um limite de estoque baixo fixo para o dashboard 
    LOW_STOCK_THRESHOLD = 2 

    stock_data = {}
    for peca_obj in Peca.objects.all():
        current_quantity = 0
        is_low_stock = False
        try:
            # Tenta obter o item de Estoque associado a esta Peca
            estoque_item = Estoque.objects.get(peca=peca_obj)
            current_quantity = estoque_item.qtd
            
            # Lógica de estoque baixo
            if current_quantity < LOW_STOCK_THRESHOLD:
                is_low_stock = True
        except Estoque.DoesNotExist:
            is_low_stock = (0 < LOW_STOCK_THRESHOLD) 

        stock_data[peca_obj.tipo] = { 
            'name': peca_obj.name,
            'quantity': current_quantity,
            'is_low_stock': is_low_stock
        }

    # Passa as contagens individuais para os 3 tipos principais para o home.html
    circulo_data = stock_data.get('circulo', {'quantity': 0, 'is_low_stock': True, 'name': 'Círculo'})
    hexagono_data = stock_data.get('hexagono', {'quantity': 0, 'is_low_stock': True, 'name': 'Hexágono'})
    quadrado_data = stock_data.get('quadrado', {'quantity': 0, 'is_low_stock': True, 'name': 'Quadrado'})

    return render(request, 'home.html', {
        'em_andamento': em_andamento_count,
        'concluido': pedidos_concluidos_count,
        'circulo': circulo_data['quantity'],
        'hexagono': hexagono_data['quantity'],
        'quadrado': quadrado_data['quantity'],
        'circulo_low_stock': circulo_data['is_low_stock'],
        'hexagono_low_stock': hexagono_data['is_low_stock'],
        'quadrado_low_stock': quadrado_data['is_low_stock'],
        'all_stock_info': stock_data 
    })

@csrf_exempt
def novoPedido(request):
    if request.method == 'POST':
        try:
            data_json = json.loads(request.body)

            pecas_convertidas_ids = []
            for i in range(1, 10):
                # O frontend envia o ID da peça (ex: "1", "2", "3")
                peca_id_frontend_str = data_json.get(f'peca{i}')

                if peca_id_frontend_str is None:
                    return JsonResponse({'message': f'Peça {i} não fornecida.'}, status=400)

                try:
                    # CONVERTE A STRING DO ID PARA INTEIRO
                    peca_id = int(peca_id_frontend_str) 
                    # BUSCA A PEÇA PELO SEU ID (APENAS PARA VALIDAR QUE A PEÇA EXISTE, NÃO O ESTOQUE)
                    peca_obj = Peca.objects.get(id=peca_id) 
                    pecas_convertidas_ids.append(peca_obj.id)
                except ValueError:
                    return JsonResponse({'message': f'ID de peça inválido: "{peca_id_frontend_str}". Deve ser um número.'}, status=400)
                except Peca.DoesNotExist:
                    # Este erro indica que a Peca com aquele ID (1, 2 ou 3) não existe no modelo Peca.
                    return JsonResponse(
                        {'message': f'Peça com ID "{peca_id_frontend_str}" não encontrada na definição de peças.'},
                        status=400
                    )

            matriz_pecas_ids = [pecas_convertidas_ids[i:i+3] for i in range(0, 9, 3)]

            for idx, montagem_ids in enumerate(matriz_pecas_ids, start=1):
                if len(set(montagem_ids)) != len(montagem_ids):
                    return JsonResponse(
                        {'message': f'Peças repetidas na montagem {idx}. Cada montagem deve ter peças únicas.'},
                        status=400
                    )

            # Cria o pedido. Ele começa no status 'pendente'
            pedido = Pedido.objects.create(pecas=matriz_pecas_ids, status='pendente')

            return JsonResponse({'message': 'Pedido criado com sucesso!', 'pedido_id': str(pedido.id)}, status=201)

        except json.JSONDecodeError:
            return JsonResponse({'message': 'Corpo da requisição JSON inválido.'}, status=400)
        except Exception as e:
            print(f"Erro inesperado em novoPedido: {e}")
            return JsonResponse({'message': f'Ocorreu um erro interno: {str(e)}'}, status=500)

    # Para requisições GET, renderiza o formulário de novo pedido
    pecas_cadastradas = Peca.objects.all()
    # Passa 'id', 'name' e 'tipo' para o frontend
    pecas_para_template = [{'id': p.id, 'name': p.name, 'tipo': p.tipo} for p in pecas_cadastradas] 
    return render(request, 'novoPedido.html', {'pecas_cadastradas': pecas_para_template})


def historico(request):
    pedidos_db = Pedido.objects.all().order_by('-id')
    pedidos_para_template = []

    # Pré-busca todos os objetos Peca para evitar consultas N+1 dentro do loop
    all_pecas = {p.id: p for p in Peca.objects.all()}

    for pedido in pedidos_db:
        pecas_flat_list_ids = [] 
        pecas_flat_list_shapes = [] 
        pecas_flat_list_names = []   

        for montagem_arr_ids in pedido.pecas: 
            for peca_id in montagem_arr_ids: 
                peca_obj = all_pecas.get(peca_id)
                if peca_obj:
                    pecas_flat_list_ids.append(peca_obj.id)
                    pecas_flat_list_shapes.append(peca_obj.tipo)
                    pecas_flat_list_names.append(peca_obj.name) 
                else:
                    pecas_flat_list_ids.append(None)
                    pecas_flat_list_shapes.append('unknown') 
                    pecas_flat_list_names.append('Peça Desconhecida')

        formatted_datetime = pedido.data.strftime("%d/%m/%Y %H:%M")

        pedido_dict = {
            'id': pedido.id,
            'status': pedido.status,
            'pecas_list_ids': pecas_flat_list_ids, 
            'pecas_list_shapes': pecas_flat_list_shapes, 
            'pecas_list_names': pecas_flat_list_names,   
            'data': formatted_datetime 
        }
        pedidos_para_template.append(pedido_dict)

    return render(request, 'historico.html', {'pedidos': pedidos_para_template})