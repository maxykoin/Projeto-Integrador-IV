import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from dashboard.models import Pedido, Estoque, Peca # Adjust import based on your app structure

class DashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = 'dashboard_updates'
        
        # Add client to the group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

        await self.send_dashboard_update()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    # Receive message from channel group (e.g., sent from views.py)
    async def dashboard_update(self, event):
        # Send the dashboard update data to the WebSocket
        await self.send(text_data=json.dumps({
            'type': 'dashboard_update',
            'data': event['data'] # Use 'data' from the event payload
        }))

    # Receive message for showing toasts from channel group
    async def dashboard_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'dashboard_message',
            'message_type': event['message_type'],
            'toast_message': event['toast_message'],
            'toast_type': event['toast_type']
        }))

    # --- NEW: Helper method to fetch and send dashboard data ---
    @sync_to_async
    def get_dashboard_data(self):
        em_andamento_count = Pedido.objects.filter(status='em_andamento').count()
        pedidos_concluidos_count = Pedido.objects.filter(status='concluido').count()

        LOW_STOCK_THRESHOLD = 2 

        stock_info = {}
        for peca_obj in Peca.objects.all():
            current_quantity = 0
            is_low_stock = False
            try:
                estoque_item = Estoque.objects.get(peca=peca_obj)
                current_quantity = estoque_item.qtd
                if current_quantity < LOW_STOCK_THRESHOLD:
                    is_low_stock = True
            except Estoque.DoesNotExist:
                is_low_stock = (0 < LOW_STOCK_THRESHOLD) # If piece doesn't exist in stock, assume 0 qty. Check if 0 is low.

            stock_info[peca_obj.tipo] = {
                'quantity': current_quantity,
                'is_low_stock': is_low_stock
            }
        return {
            'em_andamento_count': em_andamento_count,
            'concluido_count': pedidos_concluidos_count,
            'stock_info': stock_info
        }

    async def send_dashboard_update(self):
        dashboard_data = await self.get_dashboard_data()
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'dashboard_update',
                'data': dashboard_data
            }
        )