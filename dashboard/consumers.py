import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from dashboard.models import Pedido, Estoque, Peca, Notificacao
from django.db import transaction
from django.utils import timezone
from django.db.models import Q, Count

class DashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = 'dashboard_updates'
        
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()
        print("WebSocket conectado!")

        await self.send_dashboard_update() # Envia dados do dashboard na conexão
        await self.send_initial_notifications_data() # Envia dados de notificação na conexão

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        print("WebSocket desconectado!")

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        print(f"Mensagem recebida do cliente: {message_type}")

        if message_type == 'mark_notification_read':
            notification_id = data.get('notification_id')
            await self.mark_notification_as_read(notification_id)
        elif message_type == 'mark_all_notifications_read':
            await self.mark_all_notifications_as_read()
        elif message_type == 'fetch_notifications':
            await self.send_notifications_list()
        elif message_type == 'fetch_unread_count':
            await self.send_unread_count()
        elif message_type == 'process_pending_order': # Novo tipo de mensagem do frontend
            pedido_id = data.get('pedido_id')
            await self.process_pending_order(pedido_id)

    async def dashboard_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'dashboard_update',
            'data': event['data']
        }))

    async def dashboard_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'dashboard_message',
            'message_type': event['message_type'],
            'toast_message': event['toast_message'],
            'toast_type': event['toast_type']
        }))

    async def notification_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'notification.update',
            'unread_count': event['unread_count']
        }))

    async def notification_new(self, event):
        await self.send(text_data=json.dumps({
            'type': 'notification.new',
            'notification': event['notification'],
            'unread_count': event['unread_count']
        }))

    async def notification_create(self, event):
        titulo = event['titulo']
        mensagem = event['mensagem']
        tipo = event['tipo']
        link = event['link']

        notification_info = await self._create_notification_and_get_data(titulo, mensagem, tipo, link)
        
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'notification.new',
                'notification': notification_info['notification_data'],
                'unread_count': notification_info['unread_count']
            }
        )
    
    async def dashboard_update_trigger(self, event):
        """
        Handler para um trigger de atualização do dashboard vindo de outras partes do backend.
        Chama send_dashboard_update para recalcular e enviar os dados.
        """
        print("Recebendo dashboard_update_trigger, re-enviando dados do dashboard.")
        await self.send_dashboard_update()

    # --- Synchronous Database Operations (run via sync_to_async) ---
    @sync_to_async
    def get_dashboard_data_from_db(self): # Renomeado para maior clareza
        em_andamento_count = Pedido.objects.filter(status='Em Andamento').count()
        pedidos_concluidos_count = Pedido.objects.filter(status='Concluido').count()
        total_pedidos_count = em_andamento_count + pedidos_concluidos_count
        
        pending_order_obj = Pedido.objects.filter(status='pendente').first()
        
        pending_order_data = None
        if pending_order_obj:
            pending_order_data = {
                'id': pending_order_obj.id,
                'data': pending_order_obj.data.strftime("%d/%m/%Y %H:%M") # Adiciona data, se útil
            }
        
        return {
            'em_andamento_count': em_andamento_count,
            'concluido_count': pedidos_concluidos_count,
            'total_pedidos_count': total_pedidos_count,
            'pending_order': pending_order_data, # Retorna o objeto completo ou None
        }

    @sync_to_async
    def _create_notification_and_get_data(self, titulo, mensagem, tipo, link):
        notification = Notificacao.objects.create(
            titulo=titulo,
            mensagem=mensagem,
            tipo=tipo,
            link=link
        )
        all_notifications = list(Notificacao.objects.all())
        unread_count = sum(1 for n in all_notifications if not n.lida)
        return {
            'notification_data': {
                'id': notification.id,
                'titulo': notification.titulo,
                'mensagem': notification.mensagem,
                'data_criacao': notification.data_criacao.strftime("%d/%m/%Y %H:%M"),
                'lida': notification.lida,
                'tipo': notification.tipo,
                'link': notification.link
            },
            'unread_count': unread_count
        }

    @sync_to_async
    def _get_notifications_data_from_db(self):
        all_notifications_qs = Notificacao.objects.all()
        notifications_list_raw = list(all_notifications_qs)
        
        notifications_list_raw.sort(key=lambda x: x.data_criacao, reverse=True)
        
        display_notifications = notifications_list_raw[:10]

        unread_count = sum(1 for n in notifications_list_raw if not n.lida)

        notifications_list = [
            {
                'id': n.id,
                'titulo': n.titulo,
                'mensagem': n.mensagem,
                'data_criacao': n.data_criacao.strftime("%d/%m/%Y %H:%M"),
                'lida': n.lida,
                'tipo': n.tipo,
                'link': n.link
            } for n in display_notifications
        ]
        return {'notifications': notifications_list, 'unread_count': unread_count}

    @sync_to_async
    def _mark_notification_as_read_in_db(self, notification_id):
        try:
            notification = Notificacao.objects.get(id=notification_id)
            if not notification.lida:
                notification.lida = True
                notification.save()
            
            all_notifications = list(Notificacao.objects.all())
            unread_count = sum(1 for n in all_notifications if not n.lida)
            return {'status': 'success', 'unread_count': unread_count}
        except Notificacao.DoesNotExist:
            return {'status': 'error', 'message': 'Notificação não encontrada'}

    @sync_to_async
    def _mark_all_notifications_as_read_in_db(self):
        with transaction.atomic():
            Notificacao.objects.filter(lida=False).update(lida=True) 
        return {'status': 'success', 'unread_count': 0}

    @sync_to_async
    def _process_pending_order_in_db(self, pedido_id):
        try:
            pedido = Pedido.objects.get(id=pedido_id)
            msg_status = ""
            if pedido.status == 'pendente':
                pedido.status = 'Em Andamento'
                msg_status = "Em Andamento"
            elif pedido.status == 'Em Andamento':
                pedido.status = 'Concluido'
                msg_status = "Concluido"
            else:
                return {'status': 'error', 'message': 'Pedido não está em estado processável.'}
            
            pedido.save()
            return {'status': 'success', 'message': f'Pedido #{pedido.id} atualizado para "{msg_status}".', 'pedido_status': msg_status}
        except Pedido.DoesNotExist:
            return {'status': 'error', 'message': 'Pedido não encontrado.'}
        except Exception as e:
            return {'status': 'error', 'message': f'Erro ao processar pedido: {str(e)}'}

    # --- Métodos para Enviar Dados para Clientes ---
    async def send_dashboard_update(self):
        """
        Busca dados do dashboard e os transmite para o grupo.
        """
        dashboard_data = await self.get_dashboard_data_from_db()
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'dashboard_update',
                'data': dashboard_data
            }
        )
    
    async def send_initial_notifications_data(self):
        notifications_data = await self._get_notifications_data_from_db()
        await self.send(text_data=json.dumps({
            'type': 'notification.update',
            'unread_count': notifications_data['unread_count']
        }))
        await self.send(text_data=json.dumps({
            'type': 'notifications.list',
            'notifications': notifications_data['notifications'],
            'unread_count': notifications_data['unread_count']
        }))

    async def send_notifications_list(self):
        notifications_data = await self._get_notifications_data_from_db()
        await self.send(text_data=json.dumps({
            'type': 'notifications.list',
            'notifications': notifications_data['notifications'],
            'unread_count': notifications_data['unread_count']
        }))

    async def send_unread_count(self):
        all_notifications = await sync_to_async(list)(Notificacao.objects.all())
        unread_count = sum(1 for n in all_notifications if not n.lida)
        await self.send(text_data=json.dumps({
            'type': 'notification.update',
            'unread_count': unread_count
        }))

    async def process_pending_order(self, pedido_id):
        result = await self._process_pending_order_in_db(pedido_id)
        if result['status'] == 'success':
            # Cria a notificação para a atualização do status do pedido
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'notification.create',
                    'titulo': f"Status do Pedido #{pedido_id} Atualizado!",
                    'mensagem': f"O pedido #{pedido_id} foi marcado como '{result['pedido_status']}'.",
                    'tipo': "pedido_status",
                    'link': f"/pedidos/historico?search={pedido_id}"
                }
            )
            # Aciona uma atualização completa do dashboard
            await self.send_dashboard_update()
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'dashboard.message',
                    'message_type': 'show_toast',
                    'toast_message': result['message'],
                    'toast_type': 'success'
                }
            )
        else:
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'dashboard.message',
                    'message_type': 'show_toast',
                    'toast_message': result['message'],
                    'toast_type': 'error'
                }
            )