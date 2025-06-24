from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from django.utils import timezone 
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Pedido, Estoque, Peca # Manter Estoque e Peca por enquanto, se ainda usados em outras partes
from datetime import timedelta, date 
from collections import defaultdict 
import traceback
from django.db import transaction

def home(request):
    em_andamento_count = Pedido.objects.filter(status='Em Andamento').count()
    pedidos_concluidos_count = Pedido.objects.filter(status='Concluido').count()
    total_pedidos = em_andamento_count + pedidos_concluidos_count

    # Busca o primeiro pedido pendente, se houver
    # Assumimos que 'pendente' é o estado inicial, e 'Em Andamento' e 'Concluido' são outros
    # Se 'Em Andamento' for o estado inicial, ajuste a consulta abaixo.
    # Baseado nas suas informações anteriores, 'pendente' é o estado inicial.
    pedido_pendente = Pedido.objects.filter(status='pendente').first()

    return render(request, 'home.html', {
        'em_andamento_count': em_andamento_count,
        'concluido_count': pedidos_concluidos_count,
        'total_pedidos_count': total_pedidos, # Passa o total de pedidos
        'pedido_pendente': pedido_pendente, # Passa o objeto do pedido pendente (ou None)
    })

# O restante das views (novoPedido, updateStatusPedido, historico, getGraficoPedidos) permanece o mesmo
# conforme as últimas correções, focando na interação via WebSocket para notificações.

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

            with transaction.atomic():
                if Pedido.objects.filter(status='pendente').exists():
                    return JsonResponse(
                        {'message': '🚨 Já existe um pedido pendente. Conclua-o antes de criar outro.'},
                        status=409
                    )

                pedido = Pedido.objects.create(pecas=matriz_pecas_ids, status='pendente')

            async_to_sync(channel_layer.group_send)(
                'dashboard_updates',
                {
                    'type': 'notification.create',
                    'titulo': f"Novo Pedido Criado!",
                    'mensagem': f"O pedido #{pedido.id} foi criado e está pendente de processamento.",
                    'tipo': "pedido_criado",
                    'link': f"/pedidos/historico?search={pedido.id}"
                }
            )

            # Atualiza o dashboard com os novos contadores e o status do pedido pendente
            # Esta lógica agora é enviada via WebSocket
            async_to_sync(channel_layer.group_send)(
                'dashboard_updates',
                {
                    'type': 'dashboard_update_trigger' # Um novo tipo para triggar o consumer para re-enviar dados do dashboard
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


def updateStatusPedido(request, pedido_id):
    pedido = get_object_or_404(Pedido, id=pedido_id)
    # Lógica para determinar o próximo status
    # Se estiver 'pendente', muda para 'Em Andamento' (ou 'Concluido' se for o fluxo direto)
    # Assumindo que você tem um fluxo de `pendente` -> `Em Andamento` -> `Concluido`
    # Para simplificar aqui, vamos direto para 'Concluido' como você mencionou 2 estados finais.
    # Se o fluxo for `pendente` -> `Em Andamento` -> `Concluido`, você precisaria de mais lógica.
    
    # Se o pedido estava pendente, agora ele está "em andamento" ou "concluído".
    # Vou assumir que ao "processar" um pedido pendente, ele vai para "Em Andamento".
    # E que o método updateStatusPedido é chamado novamente quando ele está pronto para "Concluido".
    # Para o seu caso, se o botão "Processar Pedido" sempre leva a 'Concluido':
    # pedido.status = 'Concluido'
    
    # Ajuste: se o pedido pendente for processado, ele deve ir para 'Em Andamento' primeiro.
    # Se o pedido já está em 'Em Andamento', o próximo clique o conclui.
    if pedido.status == 'pendente':
        pedido.status = 'Em Andamento'
        msg_status = "Em Andamento"
    elif pedido.status == 'Em Andamento':
        pedido.status = 'Concluido'
        msg_status = "Concluido"
    else:
        # Se já estiver concluído, não faz nada ou retorna um erro.
        return JsonResponse({'status': 'error', 'message': 'Pedido já concluído.'}, status=400)


    pedido.save()

    channel_layer = get_channel_layer()

    async_to_sync(channel_layer.group_send)(
        'dashboard_updates',
        {
            'type': 'notification.create',
            'titulo': f"Status do Pedido #{pedido.id} Atualizado!",
            'mensagem': f"O pedido #{pedido.id} foi marcado como '{msg_status}'.",
            'tipo': "pedido_status",
            'link': f"/pedidos/historico?search={pedido.id}"
        }
    )
    
    # Dispara uma atualização completa do dashboard via WebSocket
    async_to_sync(channel_layer.group_send)(
        'dashboard_updates',
        {
            'type': 'dashboard_update_trigger' # Novo tipo para triggar o consumer para re-enviar dados do dashboard
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
            if pedido.status == 'Concluido': # Usar 'Concluido' como string
                completed_counts_dict[pedido_date] += 1

    labels = [d.strftime("%d/%m") for d in dates_in_period]
    created_counts = [created_counts_dict[d] for d in dates_in_period]
    completed_counts = [completed_counts_dict[d] for d in dates_in_period]

    return JsonResponse({
        'labels': labels,
        'created_counts': created_counts,
        'completed_counts': completed_counts
    })
