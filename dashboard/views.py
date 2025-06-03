from django.shortcuts import render
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from .models import Pedido

def home(request):
    return render(request, 'home.html')

@csrf_exempt
def novoPedido(request):
    if request.method == 'POST':
        data = json.loads(request.body)

        peca1 = data.get('peca1')
        peca2 = data.get('peca2')
        peca3 = data.get('peca3')

        pedido = Pedido.objects.create(
            pecas=[peca1, peca2, peca3],
            status='em_andamento'
        )

        return JsonResponse({'message': 'Pedido criado com sucesso!', 'pedido_id': str(pedido.id)})

    return render(request, 'novoPedido.html')
