from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Pedido, Peca
from datetime import timedelta
from collections import defaultdict
from django.db import transaction
import traceback
import json
from django.conf import settings
from pymongo import MongoClient

def home(request):
    em_andamento_count = Pedido.objects.filter(status=1).count()
    pedidos_concluidos_count = Pedido.objects.filter(status=0).count()
    total_pedidos = em_andamento_count + pedidos_concluidos_count
    pedido_pendente = Pedido.objects.filter(status=2).first()

    mongo_uri = settings.DATABASES['default'].get('CLIENT', {}).get('host', 'mongodb://localhost:27017/')
    mongo_db_name = settings.DATABASES['default'].get('NAME', 'pi-iv')

    client = MongoClient(mongo_uri)
    db = client[mongo_db_name]
    collection = db['dashboard_robo']

    robo_status_doc = collection.find_one(sort=[('_id', -1)])

    estado_robo = robo_status_doc.get('status', 'Desconhecido') if robo_status_doc else 'Desconhecido'

    client.close()

    return render(request, 'home.html', {
        'em_andamento_count': em_andamento_count,
        'concluido_count': pedidos_concluidos_count,
        'total_pedidos_count': total_pedidos,
        'pedido_pendente': pedido_pendente,
        'estado_robo': estado_robo,
    })


@csrf_exempt
def novoPedido(request):
    channel_layer = get_channel_layer()

    if request.method == 'POST':
        try:
            data_json = json.loads(request.body)
            pecas_ids = []
            for i in range(1, 10):
                peca_str_id = data_json.get(f'peca{i}')
                if peca_str_id is None:
                    return JsonResponse({'message': f'Peça {i} não fornecida.'}, status=400)
                try:
                    peca_id = int(peca_str_id)
                    peca = Peca.objects.get(id=peca_id)
                    pecas_ids.append(peca.id)
                except (ValueError, Peca.DoesNotExist):
                    return JsonResponse({'message': f'Peça inválida ou não encontrada: {peca_str_id}'}, status=400)

            matriz_pecas_ids = [pecas_ids[i:i+3] for i in range(0, 9, 3)]
            for idx, montagem in enumerate(matriz_pecas_ids, 1):
                if len(set(montagem)) < 3:
                    return JsonResponse({'message': f'Montagem {idx} contém peças repetidas.'}, status=400)

            with transaction.atomic():
                if Pedido.objects.filter(status=2).exists():
                    return JsonResponse({'message': '🚨 Já existe um pedido pendente.'}, status=409)
                pedido = Pedido.objects.create(pecas=matriz_pecas_ids, status=2)

            async_to_sync(channel_layer.group_send)(
                'dashboard_updates',
                {
                    'type': 'notification.create',
                    'titulo': f"Novo Pedido Criado!",
                    'mensagem': f"O pedido #{pedido.id} foi criado e está pendente.",
                    'tipo': "pedido_criado",
                    'link': f"/pedidos/historico?search={pedido.id}"
                }
            )
            async_to_sync(channel_layer.group_send)(
                'dashboard_updates',
                {'type': 'dashboard_update_trigger'}
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
            return JsonResponse({'message': 'JSON inválido.'}, status=400)
        except Exception as e:
            traceback.print_exc()
            async_to_sync(channel_layer.group_send)(
                'dashboard_updates',
                {
                    'type': 'dashboard.message',
                    'message_type': 'show_toast',
                    'toast_message': '❌ Erro interno ao criar o pedido.',
                    'toast_type': 'error'
                }
            )
            return JsonResponse({'message': f'Erro interno: {str(e)}'}, status=500)

    elif request.method == 'GET':
        pecas = Peca.objects.all()
        return render(request, 'novoPedido.html', {
            'pecas_cadastradas': [{'id': p.id, 'name': p.name, 'tipo': p.tipo} for p in pecas]
        })

    return JsonResponse({'message': 'Método não permitido.'}, status=405)

def updateStatusPedido(request, pedido_id):
    pedido = get_object_or_404(Pedido, id=pedido_id)

    if pedido.status == 2:
        pedido.status = 1
        msg_status = "Em Andamento"
    elif pedido.status == 1:
        pedido.status = 0
        msg_status = "Concluído"
    else:
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
    async_to_sync(channel_layer.group_send)(
        'dashboard_updates',
        {'type': 'dashboard_update_trigger'}
    )
    async_to_sync(channel_layer.group_send)(
        'dashboard_updates',
        {
            'type': 'dashboard.message',
            'message_type': 'show_toast',
            'toast_message': f'Status do pedido #{pedido.id} atualizado para "{msg_status}".',
            'toast_type': 'success'
        }
    )
    return JsonResponse({'status': 'success', 'message': 'Status atualizado com sucesso!'})

def historico(request):
    pedidos = Pedido.objects.all()
    all_pecas = {p.id: p for p in Peca.objects.all()}

    status_map = {0: "Concluído", 1: "Em Andamento", 2: "Pendente"}
    pedidos_formatados = []

    for pedido in pedidos:
        pecas_ids, pecas_shapes, pecas_names = [], [], []
        if isinstance(pedido.pecas, list):
            for montagem in pedido.pecas:
                if isinstance(montagem, list):
                    for pid in montagem:
                        peca = all_pecas.get(pid)
                        if peca:
                            pecas_ids.append(peca.id)
                            pecas_shapes.append(peca.tipo)
                            pecas_names.append(peca.name)
                        else:
                            pecas_ids.append(None)
                            pecas_shapes.append("desconhecida")
                            pecas_names.append("Peça não encontrada")
        pedidos_formatados.append({
            'id': pedido.id,
            'status': status_map.get(pedido.status, "Desconhecido"),
            'pecas_list_ids': pecas_ids,
            'pecas_list_shapes': pecas_shapes,
            'pecas_list_names': pecas_names,
            'data': pedido.data.strftime("%d/%m/%Y %H:%M") if pedido.data else "Sem data"
        })

    pedidos_formatados.sort(key=lambda p: p['id'], reverse=True)
    return render(request, 'historico.html', {'pedidos': pedidos_formatados})

def pedidos_json(request):
    pedidos = Pedido.objects.all()
    all_pecas = {p.id: p for p in Peca.objects.all()}

    status_map = {0: "Concluído", 1: "Em Andamento", 2: "Pendente"}
    pedidos_formatados = []

    for pedido in pedidos:
        pecas_ids, pecas_shapes, pecas_names = [], [], []
        if isinstance(pedido.pecas, list):
            for montagem in pedido.pecas:
                if isinstance(montagem, list):
                    for pid in montagem:
                        peca = all_pecas.get(pid)
                        if peca:
                            pecas_ids.append(peca.id)
                            pecas_shapes.append(peca.tipo)
                            pecas_names.append(peca.name)
                        else:
                            pecas_ids.append(None)
                            pecas_shapes.append("desconhecida")
                            pecas_names.append("Peça não encontrada")
        pedidos_formatados.append({
            'id': pedido.id,
            'status': status_map.get(pedido.status, "Desconhecido"),
            'pecas_list_ids': pecas_ids,
            'pecas_list_shapes': pecas_shapes,
            'pecas_list_names': pecas_names,
            'data': pedido.data.strftime("%d/%m/%Y %H:%M") if pedido.data else "Sem data"
        })

    pedidos_formatados.sort(key=lambda p: p['id'], reverse=True)
    return JsonResponse({'pedidos': pedidos_formatados})

def getGraficoPedidos(request):
    period = request.GET.get('period', '7days')
    end_date = timezone.now().date()

    if period == '30days':
        start_date = end_date - timedelta(days=29)
    elif period == 'this_month':
        start_date = end_date.replace(day=1)
    else:
        start_date = end_date - timedelta(days=6)

    pedidos = Pedido.objects.all()
    created, completed = defaultdict(int), defaultdict(int)

    for day in (start_date + timedelta(days=i) for i in range((end_date - start_date).days + 1)):
        created[day] = 0
        completed[day] = 0

    for pedido in pedidos:
        pedido_day = pedido.data.date()
        if start_date <= pedido_day <= end_date:
            created[pedido_day] += 1
            if pedido.status == 0:
                completed[pedido_day] += 1

    labels = [d.strftime("%d/%m") for d in sorted(created)]
    return JsonResponse({
        'labels': labels,
        'created_counts': [created[d] for d in sorted(created)],
        'completed_counts': [completed[d] for d in sorted(completed)],
    })
