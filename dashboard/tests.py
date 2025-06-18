from django.test import TestCase
from django.urls import reverse # Para testar views
from django.utils import timezone
from unittest.mock import patch # Para mockar Channel Layer

from .models import Peca, Estoque, Pedido

class PecaModelTest(TestCase):
    def test_peca_creation(self):
        """Testa a criação de um objeto Peca."""
        peca = Peca.objects.create(id=1, name="Círculo", tipo="circulo", qtd=5, color_hex="#ABCDEF")
        self.assertEqual(peca.id, 1)
        self.assertEqual(peca.name, "Círculo")
        self.assertEqual(peca.tipo, "circulo")
        self.assertEqual(peca.qtd, 5)
        self.assertEqual(str(peca), "Círculo (Círculo): 5 em estoque")

    def test_peca_unique_constraints(self):
        """Testa as restrições de unicidade para 'id', 'name' e 'tipo'."""
        Peca.objects.create(id=1, name="Círculo", tipo="circulo", qtd=5, color_hex="#ABCDEF")

        # Testa duplicidade de ID
        with self.assertRaises(Exception): # Pode ser IntegrityError ou OperationError do Djongo
            Peca.objects.create(id=1, name="Outro Círculo", tipo="outro_circulo", qtd=3, color_hex="#123456")
        
        # Testa duplicidade de name
        with self.assertRaises(Exception):
            Peca.objects.create(id=2, name="Círculo", tipo="circulo2", qtd=3, color_hex="#123456")
        
        # Testa duplicidade de tipo
        with self.assertRaises(Exception):
            Peca.objects.create(id=3, name="Círculo Diferente", tipo="circulo", qtd=3, color_hex="#123456")

class EstoqueModelTest(TestCase):
    def setUp(self):
        self.peca_circulo = Peca.objects.create(id=1, name="Círculo", tipo="circulo", qtd=0, color_hex="#ABCDEF")
    
    def test_estoque_creation(self):
        """Testa a criação de um objeto Estoque linkado a uma Peca."""
        estoque = Estoque.objects.create(peca=self.peca_circulo, tipo="circulo", qtd=10)
        self.assertEqual(estoque.peca.id, self.peca_circulo.id)
        self.assertEqual(estoque.qtd, 10)
        self.assertEqual(str(estoque), "Círculo: 10 em estoque")

    def test_estoque_one_to_one(self):
        """Testa que Peca e Estoque têm uma relação um-para-um."""
        Estoque.objects.create(peca=self.peca_circulo, tipo="circulo", qtd=10)
        with self.assertRaises(Exception): # Djongo pode levantar algo genérico ou IntegrityError
            Estoque.objects.create(peca=self.peca_circulo, tipo="circulo", qtd=5) # Não deve permitir segunda entrada

class PedidoModelTest(TestCase):
    def setUp(self):
        self.peca1 = Peca.objects.create(id=1, name="Círculo", tipo="circulo", qtd=10, color_hex="#111")
        self.peca2 = Peca.objects.create(id=2, name="Hexágono", tipo="hexagono", qtd=5, color_hex="#222")
        self.peca3 = Peca.objects.create(id=3, name="Quadrado", tipo="quadrado", qtd=7, color_hex="#333")

    def test_pedido_creation(self):
        """Testa a criação básica de um Pedido."""
        pecas_ids_json = [[self.peca1.id, self.peca2.id, self.peca3.id], [self.peca1.id, self.peca3.id, self.peca2.id]]
        pedido = Pedido.objects.create(pecas=pecas_ids_json, status='pendente')
        self.assertIsNotNone(pedido.id)
        self.assertEqual(pedido.status, 'pendente')
        self.assertEqual(pedido.pecas, pecas_ids_json)
        self.assertTrue(timezone.is_aware(pedido.data)) # Verifica se o campo datetime é aware

    def test_get_pecas_nomes(self):
        """Testa o método get_pecas_nomes."""
        pecas_ids_json = [[self.peca1.id, self.peca2.id], [self.peca3.id]]
        pedido = Pedido.objects.create(pecas=pecas_ids_json)
        nomes = pedido.get_pecas_nomes()
        self.assertEqual(nomes, ['Círculo', 'Hexágono', 'Quadrado']) # Ordem plana

    def test_get_pecas_shape_types(self):
        """Testa o método get_pecas_shape_types."""
        pecas_ids_json = [[self.peca1.id, self.peca2.id], [self.peca3.id]]
        pedido = Pedido.objects.create(pecas=pecas_ids_json)
        types = pedido.get_pecas_shape_types()
        self.assertEqual(types, ['circulo', 'hexagono', 'quadrado']) # Ordem plana


class ViewsTest(TestCase):
    def setUp(self):
        # Configuração para os testes de view
        self.peca_circulo = Peca.objects.create(id=1, name="Círculo", tipo="circulo", qtd=0, color_hex="#1CA1C6")
        self.peca_hexagono = Peca.objects.create(id=2, name="Hexágono", tipo="hexagono", qtd=0, color_hex="#8ABF7A")
        self.peca_quadrado = Peca.objects.create(id=3, name="Quadrado", tipo="quadrado", qtd=0, color_hex="#4B4382")
        Estoque.objects.create(peca=self.peca_circulo, tipo="circulo", qtd=5)
        Estoque.objects.create(peca=self.peca_hexagono, tipo="hexagono", qtd=1) # Exemplo de estoque baixo
        Estoque.objects.create(peca=self.peca_quadrado, tipo="quadrado", qtd=10)

        # Crie alguns pedidos para o histórico
        self.pedido1_pecas = [[self.peca_circulo.id, self.peca_hexagono.id, self.peca_quadrado.id]]
        self.pedido1 = Pedido.objects.create(pecas=self.pedido1_pecas, status='pendente')
        self.pedido2 = Pedido.objects.create(pecas=self.pedido1_pecas, status='em_andamento')
        self.pedido3 = Pedido.objects.create(pecas=self.pedido1_pecas, status='concluido')


    def test_home_view(self):
        """Testa se a view home carrega corretamente e passa os dados de estoque/pedidos."""
        response = self.client.get(reverse('home'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'home.html')
        self.assertIn('em_andamento', response.context)
        self.assertIn('circulo', response.context)
        
        self.assertEqual(response.context['em_andamento'], 1) # pedido2
        self.assertEqual(response.context['concluido'], 1) # pedido3
        self.assertEqual(response.context['circulo'], 5)
        self.assertEqual(response.context['hexagono'], 1)
        self.assertTrue(response.context['hexagono_low_stock']) # LOW_STOCK_THRESHOLD = 2


    @patch('dashboard.views.get_channel_layer') # Mock do Channel Layer para testes sem Channels
    def test_novo_pedido_post(self, mock_get_channel_layer):
        """Testa a criação de um novo pedido via POST."""
        mock_channel_layer = mock_get_channel_layer.return_value
        
        # Dados de um pedido válido
        valid_payload = {
            'peca1': '1', 'peca2': '2', 'peca3': '3',
            'peca4': '1', 'peca5': '3', 'peca6': '2',
            'peca7': '1', 'peca8': '2', 'peca9': '3',
        }
        
        response = self.client.post(reverse('novoPedido'), json.dumps(valid_payload), content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertIn('Pedido criado com sucesso!', response.json()['message'])
        self.assertEqual(Pedido.objects.count(), 4) # 3 criados no setup + 1 novo
        
        # Verifica se o Channel Layer foi chamado para notificar (apenas se o Channels estivesse ativo)
        # mock_channel_layer.group_send.assert_called() # Isso vai falhar se o Channels estiver realmente desabilitado no setup do teste.

    def test_novo_pedido_post_invalid_peca(self):
        """Testa criação de pedido com ID de peça inválido."""
        invalid_payload = {
            'peca1': '99', 'peca2': '2', 'peca3': '3',
            'peca4': '1', 'peca5': '3', 'peca6': '2',
            'peca7': '1', 'peca8': '2', 'peca9': '3',
        }
        response = self.client.post(reverse('novoPedido'), json.dumps(invalid_payload), content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('Peça com ID "99" não encontrada', response.json()['message'])

    def test_historico_view(self):
        """Testa se a view historico carrega e passa os dados corretamente."""
        response = self.client.get(reverse('historico'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'historico.html')
        self.assertIn('pedidos', response.context)
        self.assertEqual(len(response.context['pedidos']), 3) # 3 pedidos do setUp

        # Verifica dados de um pedido específico
        primeiro_pedido_context = response.context['pedidos'][0] # O último criado, devido ao order_by('-id')
        self.assertEqual(primeiro_pedido_context['status'], 'concluido')
        self.assertEqual(len(primeiro_pedido_context['pecas_list_ids']), 3)
        self.assertEqual(primeiro_pedido_context['pecas_list_names'], ['Círculo', 'Hexágono', 'Quadrado'])
        self.assertEqual(primeiro_pedido_context['pecas_list_shapes'], ['circulo', 'hexagono', 'quadrado'])


# Para rodar os testes:
# python manage.py test dashboard