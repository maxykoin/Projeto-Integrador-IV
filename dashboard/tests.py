from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from unittest.mock import patch, AsyncMock, ANY
from django.db.utils import IntegrityError
from django.db import DatabaseError
import json

from .models import Peca, Estoque, Pedido


def criar_pecas_base():
    return {
        "circulo": Peca.objects.update_or_create(
            id=1, defaults={'name': 'Círculo', 'tipo': 'circulo', 'qtd': 0, 'color_hex': '#111'}
        )[0],
        "hexagono": Peca.objects.update_or_create(
            id=2, defaults={'name': 'Hexágono', 'tipo': 'hexagono', 'qtd': 0, 'color_hex': '#222'}
        )[0],
        "quadrado": Peca.objects.update_or_create(
            id=3, defaults={'name': 'Quadrado', 'tipo': 'quadrado', 'qtd': 0, 'color_hex': '#333'}
        )[0],
    }


class PecaModelTest(TestCase):
    def setUp(self):
        self.pecas = criar_pecas_base()

    def tearDown(self):
        Pedido.objects.all().delete()
        Estoque.objects.all().delete()
        Peca.objects.all().delete()

    def test_peca_creation(self):
        peca = Peca.objects.create(
            id=4, name="Nova Forma", tipo="Pentágono", qtd=5, color_hex="#ABCDEF"
        )
        self.assertEqual(str(peca), "Nova Forma (Pentágono): 5 em estoque")

    def test_peca_unique_constraints(self):
    # Tentando criar peça com 'tipo' já existente
        with self.assertRaises(DatabaseError):
            Peca.objects.create(id=100, name="Peça Única", tipo='circulo', qtd=1, color_hex="#111111")

        # Tentando criar peça com 'name' já existente
        with self.assertRaises(DatabaseError):
            Peca.objects.create(id=101, name="Círculo", tipo='quadrado', qtd=1, color_hex="#222222")



class EstoqueModelTest(TestCase):
    def setUp(self):
        self.pecas = criar_pecas_base()

    def tearDown(self):
        Pedido.objects.all().delete()
        Estoque.objects.all().delete()
        Peca.objects.all().delete()

    def test_estoque_creation(self):
        estoque = Estoque.objects.create(peca=self.pecas["circulo"], qtd=10)
        self.assertEqual(str(estoque), "Círculo: 10 em estoque")

    def test_estoque_one_to_one(self):
        Estoque.objects.all().delete()
        Estoque.objects.create(peca=self.pecas["circulo"], qtd=10)

        with self.assertRaises(DatabaseError):
            Estoque.objects.create(peca=self.pecas["circulo"], qtd=5)


class PedidoModelTest(TestCase):
    def setUp(self):
        self.pecas = criar_pecas_base()
        self.pecas["circulo"].qtd = 10
        self.pecas["hexagono"].qtd = 5
        self.pecas["quadrado"].qtd = 7
        for p in self.pecas.values():
            p.save()

    def tearDown(self):
        Pedido.objects.all().delete()
        Estoque.objects.all().delete()
        Peca.objects.all().delete()

    def test_pedido_creation(self):
        pecas_ids_json = [[1, 2, 3], [1, 3, 2]]
        pedido = Pedido.objects.create(pecas=pecas_ids_json, status='pendente')
        self.assertEqual(pedido.status, 'pendente')
        self.assertEqual(pedido.pecas, pecas_ids_json)
        self.assertTrue(timezone.is_aware(pedido.data))

    def test_get_pecas_nomes(self):
        pedido = Pedido.objects.create(pecas=[[1, 2], [3]])
        nomes = pedido.get_pecas_nomes()
        self.assertEqual(nomes, ['Círculo', 'Hexágono', 'Quadrado'])

    def test_get_pecas_shape_types(self):
        pedido = Pedido.objects.create(pecas=[[1, 2], [3]])
        tipos = pedido.get_pecas_shape_types()
        self.assertEqual(tipos, ['circulo', 'hexagono', 'quadrado'])


class ViewsTest(TestCase):
    def setUp(self):
        self.pecas = criar_pecas_base()

        Estoque.objects.create(peca=self.pecas["circulo"], qtd=5)
        Estoque.objects.create(peca=self.pecas["hexagono"], qtd=1)
        Estoque.objects.create(peca=self.pecas["quadrado"], qtd=10)

        self.pedido1_pecas = [[1, 2, 3]]
        self.pedido1 = Pedido.objects.create(pecas=self.pedido1_pecas, status='pendente')
        self.pedido2 = Pedido.objects.create(pecas=self.pedido1_pecas, status='em_andamento')
        self.pedido3 = Pedido.objects.create(pecas=self.pedido1_pecas, status='concluido')

    def tearDown(self):
        Pedido.objects.all().delete()
        Estoque.objects.all().delete()
        Peca.objects.all().delete()

    @patch('dashboard.views.get_channel_layer')
    def test_novo_pedido_post(self, mock_get_channel_layer):
        mock_layer = AsyncMock()
        mock_get_channel_layer.return_value = mock_layer

        payload = {
            'peca1': '1', 'peca2': '2', 'peca3': '3',
            'peca4': '1', 'peca5': '3', 'peca6': '2',
            'peca7': '1', 'peca8': '2', 'peca9': '3',
        }

        response = self.client.post(reverse('novoPedido'), json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertIn('Pedido criado com sucesso!', response.json()['message'])
        self.assertEqual(Pedido.objects.count(), 4)

        mock_layer.group_send.assert_any_call(
            'dashboard_updates',
            {'type': 'dashboard.message', 'message_type': 'new_order_created', 'order_id': ANY}
        )

    @patch('dashboard.views.get_channel_layer')
    def test_novo_pedido_post_invalid_peca(self, mock_get_channel_layer):
        mock_layer = AsyncMock()
        mock_get_channel_layer.return_value = mock_layer

        payload = {
            'peca1': '99', 'peca2': '2', 'peca3': '3',
            'peca4': '1', 'peca5': '3', 'peca6': '2',
            'peca7': '1', 'peca8': '2', 'peca9': '3',
        }

        response = self.client.post(reverse('novoPedido'), json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('Peça com ID "99" não encontrada', response.json()['message'])

        mock_layer.group_send.assert_any_call(
            'dashboard_updates',
            {'type': 'dashboard.message', 'message_type': 'show_toast', 'toast_message': ANY, 'toast_type': 'error'}
        )

    def test_home_view(self):
        response = self.client.get(reverse('home'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'home.html')
        self.assertEqual(response.context['em_andamento'], 1)
        self.assertEqual(response.context['concluido'], 1)
        self.assertEqual(response.context['circulo'], 5)
        self.assertEqual(response.context['hexagono'], 1)
        self.assertTrue(response.context['hexagono_low_stock'])

    def test_historico_view(self):
        response = self.client.get(reverse('historico'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'historico.html')
        self.assertEqual(len(response.context['pedidos']), 3)

        primeiro = response.context['pedidos'][0]
        self.assertEqual(primeiro['status'], 'concluido')
        self.assertEqual(len(primeiro['pecas_list_ids']), 3)
        self.assertEqual(primeiro['pecas_list_names'], ['Círculo', 'Hexágono', 'Quadrado'])
        self.assertEqual(primeiro['pecas_list_shapes'], ['circulo', 'hexagono', 'quadrado'])

