# dashboard/views.py

from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from django.utils import timezone 

# Importa as ferramentas do Channels
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

# Importa todos os modelos necessários
from .models import Pedido, Estoque, Peca, PEDIDO_STATUS_CHOICES 

def home(request):
    # NOTA: Estes dados ainda são usados para a renderização inicial da página
    # O JavaScript no frontend se conectará ao WebSocket e fará as atualizações em tempo real.

    em_andamento_count = Pedido.objects.filter(status='em_andamento').count()
    pedidos_concluidos_count = Pedido.objects.filter(status='concluido').count()

    LOW_STOCK_THRESHOLD = 2 

    stock_data = {}
    for peca_obj in Peca.objects.all():
        current_quantity = 0
        is_low_stock = False
        try:
            estoque_item = Estoque.objects.get(peca=peca_obj)
            current_quantity = estoque_item.qtd
            if current_quantity < LOW_STOCK_THRESHOLD:
                is_low_stock = True
        except Estoque.DoesNotExist:
            is_low_stock = (0 < LOW_STOCK_THRESHOLD) 

        stock_data[peca_obj.tipo] = { 
            'name': peca_obj.name,
            'quantity': current_quantity,
            'is_low_stock': is_low_stock
        }
    
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
        channel_layer = get_channel_layer() # Obtém a instância do Channel Layer

        try:
            data_json = json.loads(request.body)

            pecas_convertidas_ids = []
            for i in range(1, 10):
                peca_id_frontend_str = data_json.get(f'peca{i}')

                if peca_id_frontend_str is None:
                    return JsonResponse({'message': f'Peça {i} não fornecida.'}, status=400)

                try:
                    peca_id = int(peca_id_frontend_str) 
                    peca_obj = Peca.objects.get(id=peca_id) 
                    pecas_convertidas_ids.append(peca_obj.id)
                except ValueError:
                    return JsonResponse({'message': f'ID de peça inválido: "{peca_id_frontend_str}". Deve ser um número.'}, status=400)
                except Peca.DoesNotExist:
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

            # Cria o pedido. O estoque não é afetado aqui.
            pedido = Pedido.objects.create(pecas=matriz_pecas_ids, status='pendente')

            # Notifica o dashboard via WebSocket que um novo pedido foi criado
            async_to_sync(channel_layer.group_send)(
                'dashboard_updates', # Nome do grupo do consumer
                {
                    'type': 'dashboard.message', # Tipo de handler no consumer
                    'message_type': 'new_order_created', # Tipo da sua mensagem customizada
                    'order_id': str(pedido.id)
                }
            )
            
            # NOTIFICAÇÃO TOAST para o novo pedido
            async_to_sync(channel_layer.group_send)(
                'dashboard_updates',
                {
                    'type': 'dashboard.message',
                    'message_type': 'show_toast',
                    'toast_message': f'✅ Pedido #{pedido.id} criado com sucesso!',
                    'toast_type': 'success'
                }
            )

            return JsonResponse({'message': 'Pedido criado com sucesso!', 'pedido_id': str(pedido.id)}, status=201)

        except json.JSONDecodeError:
            return JsonResponse({'message': 'Corpo da requisição JSON inválido.'}, status=400)
        except Exception as e:
            print(f"Erro inesperado em novoPedido: {e}")
            # NOTIFICAÇÃO TOAST para erro
            async_to_sync(channel_layer.group_send)(
                'dashboard_updates',
                {
                    'type': 'dashboard.message',
                    'message_type': 'show_toast',
                    'toast_message': f'❌ Erro ao criar pedido: {str(e)}',
                    'toast_type': 'error'
                }
            )
            return JsonResponse({'message': f'Ocorreu um erro interno: {str(e)}'}, status=500)

    pecas_cadastradas = Peca.objects.all()
    pecas_para_template = [{'id': p.id, 'name': p.name, 'tipo': p.tipo} for p in pecas_cadastradas] 
    return render(request, 'novoPedido.html', {'pecas_cadastradas': pecas_para_template})


def historico(request):
    pedidos_db = Pedido.objects.all().order_by('-id')
    pedidos_para_template = []

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

# Exemplo de view para atualização de status de pedido (para consumir estoque e disparar atualizações)
@csrf_exempt
def update_order_status(request, order_id):
    channel_layer = get_channel_layer() # Obtém a instância do Channel Layer
    try:
        if request.method == 'POST':
            pedido = get_object_or_404(Pedido, id=order_id)
            data = json.loads(request.body)
            new_status = data.get('status')

            if new_status not in [s[0] for s in PEDIDO_STATUS_CHOICES]:
                return JsonResponse({'message': 'Status inválido fornecido.'}, status=400)

            # Lógica para consumir estoque quando o pedido entra em 'em_andamento'
            # (assumindo que 'pendente' -> 'em_andamento' é o consumo)
            if new_status == 'em_andamento' and pedido.status == 'pendente':
                pecas_a_consumir = {}
                flat_list_ids = [item for sublist in pedido.pecas for item in sublist]
                for peca_id in flat_list_ids:
                    pecas_a_consumir[peca_id] = pecas_a_consumir.get(peca_id, 0) + 1

                for peca_id, quantidade_requerida in pecas_a_consumir.items():
                    try:
                        estoque_item = Estoque.objects.get(peca_id=peca_id)
                        if estoque_item.qtd < quantidade_requerida:
                            # Caso o estoque seja insuficiente no momento da transição (ex: outro pedido consumiu)
                            peca_obj_name = Peca.objects.get(id=peca_id).name
                            async_to_sync(channel_layer.group_send)(
                                'dashboard_updates',
                                {'type': 'dashboard.message', 'message_type': 'show_toast', 
                                 'toast_message': f'❌ ERRO: Estoque insuficiente para {peca_obj_name} para pedido #{order_id}. Transição negada.', 
                                 'toast_type': 'error'}
                            )
                            return JsonResponse(
                                {'message': f'Estoque insuficiente para {peca_obj_name}.'}, status=400
                            )
                        estoque_item.qtd -= quantidade_requerida
                        estoque_item.save()
                    except Estoque.DoesNotExist:
                        peca_obj_name = Peca.objects.get(id=peca_id).name
                        async_to_sync(channel_layer.group_send)(
                            'dashboard_updates',
                            {'type': 'dashboard.message', 'message_type': 'show_toast', 
                             'toast_message': f'❌ ERRO: Peça "{peca_obj_name}" não tem entrada de estoque para pedido #{order_id}.', 
                             'toast_type': 'error'}
                        )
                        return JsonResponse({'message': f'Estoque para a peça "{peca_obj_name}" não encontrado.'}, status=400)
                
                # Dispara a atualização do dashboard via WebSocket após consumir o estoque
                async_to_sync(channel_layer.group_send)(
                    'dashboard_updates',
                    {'type': 'dashboard.message', 'message_type': 'stock_updated'}
                )
                async_to_sync(channel_layer.group_send)(
                    'dashboard_updates',
                    {'type': 'dashboard.message', 'message_type': 'show_toast', 
                     'toast_message': f'📦 Pedido #{order_id} em andamento. Estoque atualizado!', 
                     'toast_type': 'info'}
                )

            # Lógica para reverter estoque ao cancelar
            elif new_status == 'cancelado' and pedido.status != 'cancelado':
                if pedido.status == 'em_andamento': # Só devolve se o estoque já foi consumido
                    pecas_a_devolver = {}
                    flat_list_ids = [item for sublist in pedido.pecas for item in sublist]
                    for peca_id in flat_list_ids:
                        pecas_a_devolver[peca_id] = pecas_a_devolver.get(peca_id, 0) + 1

                    for peca_id, quantidade_devolver in pecas_a_devolver.items():
                        try:
                            estoque_item = Estoque.objects.get(peca_id=peca_id)
                            estoque_item.qtd += quantidade_devolver
                            estoque_item.save()
                        except Estoque.DoesNotExist:
                            print(f"ALERTA: Peça com ID {peca_id} não encontrada no estoque para devolução do pedido {order_id}.")
                    
                    async_to_sync(channel_layer.group_send)(
                        'dashboard_updates',
                        {'type': 'dashboard.message', 'message_type': 'stock_updated'}
                    )
                    async_to_sync(channel_layer.group_send)(
                        'dashboard_updates',
                        {'type': 'dashboard.message', 'message_type': 'show_toast', 
                         'toast_message': f'↩️ Pedido #{order_id} cancelado. Estoque devolvido!', 
                         'toast_type': 'warning'}
                    )


            pedido.status = new_status
            pedido.save()

            # Notificar dashboard sobre mudança de status do pedido (atualiza contadores)
            async_to_sync(channel_layer.group_send)(
                'dashboard_updates',
                {'type': 'dashboard.message', 'message_type': 'order_status_updated'}
            )
            
            # Notificar toast de conclusão de pedido
            if new_status == 'concluido':
                 async_to_sync(channel_layer.group_send)(
                    'dashboard_updates',
                    {'type': 'dashboard.message', 'message_type': 'show_toast', 
                     'toast_message': f'🎉 Pedido #{order_id} concluído!', 
                     'toast_type': 'success'}
                )


            return JsonResponse({'message': f'Status do pedido {order_id} atualizado para {new_status}.'}, status=200)

    except Pedido.DoesNotExist:
            async_to_sync(channel_layer.group_send)(
                'dashboard_updates',
                {'type': 'dashboard.message', 'message_type': 'show_toast', 
                 'toast_message': f'❌ Erro: Pedido #{order_id} não encontrado para atualização.', 
                 'toast_type': 'error'}
            )
            return JsonResponse({'message': 'Pedido não encontrado.'}, status=404)
    except json.JSONDecodeError:
            async_to_sync(channel_layer.group_send)(
                'dashboard_updates',
                {'type': 'dashboard.message', 'message_type': 'show_toast', 
                 'toast_message': '❌ Erro: Requisição JSON inválida para atualização de status.', 
                 'toast_type': 'error'}
            )
            return JsonResponse({'message': 'Corpo da requisição JSON inválido.'}, status=400)
    except Exception as e:
            print(f"Erro inesperado em update_order_status: {e}")
            async_to_sync(channel_layer.group_send)(
                'dashboard_updates',
                {'type': 'dashboard.message', 'message_type': 'show_toast', 
                 'toast_message': f'❌ Erro interno ao atualizar status: {str(e)}', 
                 'toast_type': 'error'}
            )
            return JsonResponse({'message': f'Ocorreu um erro interno: {str(e)}'}, status=500)
    return JsonResponse({'message': 'Método não permitido.'}, status=405)