from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from django.utils import timezone 
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Pedido, Estoque, Peca, Notificacao
from .consumers import DashboardConsumer
from datetime import timedelta, date 
from collections import defaultdict 
import traceback # Importe traceback para depuração

def home(request):
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
            is_low_stock = (0 < LOW_STOCK_THRESHOLD) # Considera 0 itens como baixo estoque se 0 < threshold

        stock_data[peca_obj.tipo] = {
            'name': peca_obj.name,
            'quantity': current_quantity,
            'is_low_stock': is_low_stock
        }

    circulo_data = stock_data.get('circulo', {'quantity': 0, 'is_low_stock': (0 < LOW_STOCK_THRESHOLD), 'name': 'Círculo'})
    hexagono_data = stock_data.get('hexagono', {'quantity': 0, 'is_low_stock': (0 < LOW_STOCK_THRESHOLD), 'name': 'Hexágono'})
    quadrado_data = stock_data.get('quadrado', {'quantity': 0, 'is_low_stock': (0 < LOW_STOCK_THRESHOLD), 'name': 'Quadrado'})

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
    channel_layer = get_channel_layer() 

    if request.method == 'POST':
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
                    async_to_sync(channel_layer.group_send)(
                        'dashboard_updates',
                        {
                            'type': 'dashboard.message',
                            'message_type': 'show_toast',
                            'toast_message': f'Peça com ID "{peca_id_frontend_str}" não encontrada na definição de peças.',
                            'toast_type': 'error'
                        }
                    )
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

            pedido = Pedido.objects.create(pecas=matriz_pecas_ids, status='pendente')

            Notificacao.objects.create(
                titulo=f"Novo Pedido Criado!",
                mensagem=f"O pedido #{pedido.id} foi criado e está pendente de processamento.",
                tipo="pedido_criado",
                link=f"/pedidos/historico?search={pedido.id}"
            )

            async_to_sync(channel_layer.group_send)(
                'dashboard_updates',
                {
                    'type': 'dashboard_update',
                    'data': {
                        'em_andamento_count': Pedido.objects.filter(status='em_andamento').count(),
                        'concluido_count': Pedido.objects.filter(status='concluido').count(),
                        'stock_info': {
                            p.tipo: {
                                'quantity': Estoque.objects.get(peca=p).qtd if Estoque.objects.filter(peca=p).exists() else 0,
                                'is_low_stock': (Estoque.objects.get(peca=p).qtd < 2) if Estoque.objects.filter(peca=p).exists() else (0 < 2)
                            } for p in Peca.objects.all()
                        }
                    }
                }
            )
            
            # CORREÇÃO: Busca todas as notificações e conta em Python
            all_notifications_for_count = Notificacao.objects.all()
            unread_count = sum(1 for n in all_notifications_for_count if not n.lida)
            
            async_to_sync(channel_layer.group_send)(
                'dashboard_updates',
                {
                    'type': 'notification.update',
                    'unread_count': unread_count
                }
            )
            async_to_sync(channel_layer.group_send)(
                'dashboard_updates',
                {
                    'type': 'notification.new',
                    'notification': {
                        'titulo': f"Novo Pedido Criado!",
                        'mensagem': f"O pedido #{pedido.id} foi criado e está pendente de processamento.",
                        'tipo': "pedido_criado",
                        'link': f"/pedidos/historico?search={pedido.id}"
                    }
                }
            )

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
            traceback.print_exc() 
            print(f"Erro inesperado em novoPedido (POST): {e}")
            async_to_sync(channel_layer.group_send)(
                'dashboard_updates',
                {
                    'type': 'dashboard.message',
                    'message_type': 'show_toast',
                    'toast_message': f'❌ Erro interno no servidor ao criar pedido. Por favor, tente novamente mais tarde.',
                    'toast_type': 'error'
                }
            )
            return JsonResponse({'message': f'Ocorreu um erro interno: {str(e)}'}, status=500)

    elif request.method == 'GET':
        pecas_cadastradas = Peca.objects.all()
        pecas_para_template = [{'id': p.id, 'name': p.name, 'tipo': p.tipo} for p in pecas_cadastradas]
        return render(request, 'novoPedido.html', {'pecas_cadastradas': pecas_para_template})

    return JsonResponse({'message': 'Método HTTP não permitido.'}, status=405)


# Nova View: API para Notificações
def getNotificacoes(request):
    # CORREÇÃO: Busca todas as notificações e filtra/ordena/conta em Python
    notifications = Notificacao.objects.all() # Remove .order_by('-data_criacao') aqui
    
    notifications_list = list(notifications) # Converte o QuerySet para lista
    notifications_list.sort(key=lambda x: x.data_criacao, reverse=True) # Ordena em Python
    
    unread_count = sum(1 for n in notifications_list if not n.lida) # Contagem em Python

    display_notifications = notifications_list[:10] # Limita para exibição

    data = [{
        'id': n.id,
        'titulo': n.titulo,
        'mensagem': n.mensagem,
        'data_criacao': n.data_criacao.strftime("%d/%m/%Y %H:%M"),
        'lida': n.lida,
        'tipo': n.tipo,
        'link': n.link
    } for n in display_notifications]

    return JsonResponse({'notifications': data, 'unread_count': unread_count})

@csrf_exempt
def marcarComoLida(request, notification_id):
    if request.method == 'POST':
        try:
            notification = Notificacao.objects.get(id=notification_id)
            notification.lida = True
            notification.save()

            channel_layer = get_channel_layer()
            
            # CORREÇÃO: Recalcula a contagem de não lidas buscando e contando em Python
            all_notifications_for_count = Notificacao.objects.all()
            unread_count = sum(1 for n in all_notifications_for_count if not n.lida)

            async_to_sync(channel_layer.group_send)(
                'dashboard_updates',
                {
                    'type': 'notification.update',
                    'unread_count': unread_count
                }
            )
            return JsonResponse({'status': 'success', 'unread_count': unread_count})
        except Notificacao.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Notificação não encontrada'}, status=404)
        except Exception as e:
            traceback.print_exc()
            print(f"Erro em marcarComoLida: {e}")
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    return JsonResponse({'message': 'Método não permitido.'}, status=405)


@csrf_exempt
def marcarTodasComoLida(request):
    if request.method == 'POST':
        try:
            # CORREÇÃO: Busca todas as notificações, filtra em Python e salva individualmente.
            all_notifications = Notificacao.objects.all() # Busca todas sem filtro no DB
            
            for notification in all_notifications:
                if not notification.lida: # Filtra em Python
                    notification.lida = True
                    notification.save() # Salva cada objeto individualmente

            channel_layer = get_channel_layer()
            unread_count = 0 # Todas foram marcadas como lidas
            async_to_sync(channel_layer.group_send)(
                'dashboard_updates',
                {
                    'type': 'notification.update',
                    'unread_count': unread_count
                }
            )
            return JsonResponse({'status': 'success', 'unread_count': unread_count})
        except Exception as e:
            traceback.print_exc()
            print(f"Erro inesperado em marcarTodasComoLida: {e}")
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    return JsonResponse({'message': 'Método não permitido.'}, status=405)


def updateStatusPedido(request, pedido_id):
    pedido = get_object_or_404(Pedido, id=pedido_id)
    pedido.status = 'concluido'
    pedido.save()

    Notificacao.objects.create(
        titulo=f"Status do Pedido #{pedido.id} Atualizado!",
        mensagem=f"O pedido #{pedido.id} foi marcado como '{pedido.get_status_display()}'.",
        tipo="pedido_status",
        link=f"/pedidos/historico?search={pedido.id}"
    )

    channel_layer = get_channel_layer()
    # CORREÇÃO: Busca todas as notificações e conta em Python
    all_notifications_for_count = Notificacao.objects.all()
    unread_count = sum(1 for n in all_notifications_for_count if not n.lida)
    
    async_to_sync(channel_layer.group_send)(
        'dashboard_updates',
        {
            'type': 'notification.update',
            'unread_count': unread_count
        }
    )
    return JsonResponse({'status': 'success', 'message': 'Status atualizado com sucesso!'})

def historico(request):
    pedidos_db = Pedido.objects.all() 

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

    pedidos_para_template.sort(key=lambda x: x['id'], reverse=True)

    return render(request, 'historico.html', {'pedidos': pedidos_para_template})

def getGraficoPedidos(request):
    period = request.GET.get('period', '7days')

    end_date_obj = timezone.now().date()
    if period == '7days':
        start_date_obj = end_date_obj - timedelta(days=6)
    elif period == '30days':
        start_date_obj = end_date_obj - timedelta(days=29)
    elif period == 'this_month':
        start_date_obj = end_date_obj.replace(day=1)
    else:
        start_date_obj = end_date_obj - timedelta(days=6)

    all_pedidos = Pedido.objects.all()

    created_counts_dict = defaultdict(int)
    completed_counts_dict = defaultdict(int)

    dates_in_period = [start_date_obj + timedelta(days=i) for i in range((end_date_obj - start_date_obj).days + 1)]
    dates_in_period.sort()

    for d_obj in dates_in_period:
        created_counts_dict[d_obj] = 0
        completed_counts_dict[d_obj] = 0

    for pedido in all_pedidos:
        pedido_date = pedido.data.date()
        
        if start_date_obj <= pedido_date <= end_date_obj:
            created_counts_dict[pedido_date] += 1
            if pedido.status == 'concluido':
                completed_counts_dict[pedido_date] += 1

    labels = [d.strftime("%d/%m") for d in dates_in_period]
    created_counts = [created_counts_dict[d] for d in dates_in_period]
    completed_counts = [completed_counts_dict[d] for d in dates_in_period]

    return JsonResponse({
        'labels': labels,
        'created_counts': created_counts,
        'completed_counts': completed_counts
    })