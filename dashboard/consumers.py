# dashboard/consumers.py

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async # Para acesso síncrono ao DB em async
from .models import Peca, Estoque, Pedido # Importe seus modelos

class DashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # O nome do grupo de sala (como um canal de rádio)
        self.room_group_name = 'dashboard_updates'

        # Adiciona o canal atual (este cliente) ao grupo
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        print(f"WebSocket Connected: {self.scope['client']} to {self.room_group_name}")

        # Envia os dados iniciais do dashboard (estoque e pedidos) ao conectar
        await self.send_dashboard_update()

    async def disconnect(self, close_code):
        print(f"WebSocket Disconnected: {self.scope['client']} from {self.room_group_name} (Code: {close_code})")
        # Remove o canal do grupo
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Recebe mensagens do WebSocket (frontend), se houver alguma lógica para isso
    async def receive(self, text_data):
        # Normalmente, este consumidor APENAS ENVIA atualizações, não recebe comandos complexos.
        # Se quiser um refresh manual, poderia ser:
        # text_data_json = json.loads(text_data)
        # if text_data_json.get('action') == 'manual_refresh':
        #    await self.send_dashboard_update()
        pass

    # Função para buscar os dados do DB (síncrona, roda em um thread separado)
    @database_sync_to_async
    def get_dashboard_data(self):
        # Lógica da sua view home para pegar os dados do estoque
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
        
        # Lógica da sua view home para pegar os dados de pedidos
        em_andamento_count = Pedido.objects.filter(status='em_andamento').count()
        pedidos_concluidos_count = Pedido.objects.filter(status='concluido').count()

        return {
            'stock_info': stock_data,
            'em_andamento_count': em_andamento_count,
            'concluido_count': pedidos_concluidos_count,
        }

    # Envia o estado completo do dashboard para o cliente WebSocket
    async def send_dashboard_update(self, event=None):
        dashboard_data = await self.get_dashboard_data()
        await self.send(text_data=json.dumps({
            'type': 'dashboard_update', # Tipo de mensagem para o JS identificar
            'data': dashboard_data
        }))

    # Handler para mensagens recebidas pelo grupo 'dashboard_updates' do Channel Layer
    # Isso é chamado quando uma view Django (ou outro consumer) envia uma mensagem para este grupo
    async def dashboard_message(self, event):
        message_type = event['message_type']
        print(f"Received message in group: {message_type}")
        if message_type == 'stock_updated' or message_type == 'order_status_updated' or message_type == 'new_order_created':
            await self.send_dashboard_update() # Re-busca e envia todos os dados atualizados
        # Você pode ter tipos de mensagem mais específicos aqui, se quiser granularidade
        # Ex: if message_type == 'new_order_created': await self.send_new_order_notification(event['order_id'])