
from djongo import models
from django.utils import timezone

# Choices para status do pedido
PEDIDO_STATUS_CHOICES = [
    ('pendente', 'Pendente'),
    ('em_andamento', 'Em Andamento'),
    ('pausado', 'Pausado'),
    ('cancelado', 'Cancelado'),
    ('concluido', 'Concluído'),
]

# Choices comuns para Tipos de Forma (usado em Peca e Pedido)
TIPO_FORMA_CHOICES = [
    ('circulo', 'Círculo'),
    ('hexagono', 'Hexágono'),
    ('quadrado', 'Quadrado'),
]

# Modelo para "Peça" (agora com ID Fixo e Quantidade em Estoque)
class Peca(models.Model):
    # Definimos 'id' como PrimaryKey, mas ele NÃO será auto-incrementado automaticamente por Django/Djongo.
    # Você terá que DEFINIR o ID (1, 2, 3) manualmente ao criar a peça no admin ou via script.
    id = models.IntegerField(primary_key=True, verbose_name="ID da Peça (1=Círculo, 2=Hexágono, 3=Quadrado)")
    
    name = models.CharField(max_length=100, unique=True, verbose_name="Nome da Peça")
    # 'tipo' é o identificador visual/geométrico (e.g., 'circulo')
    tipo = models.CharField(max_length=50, choices=TIPO_FORMA_CHOICES, unique=True, verbose_name="Tipo de Forma")
    
    # Quantidade em Estoque agora está diretamente no modelo Peca
    qtd = models.IntegerField(default=0, verbose_name="Quantidade em Estoque")
    
    color_hex = models.CharField(max_length=7, default="#CCCCCC", verbose_name="Cor Hexadecimal")

    def __str__(self):
        return f"{self.name} ({self.get_tipo_display()}): {self.qtd} em estoque"

    class Meta:
        verbose_name = "Peça em Estoque"
        verbose_name_plural = "Peças em Estoque"


# Modelo para Pedido
class Pedido(models.Model):
    data = models.DateTimeField(default=timezone.now, verbose_name="Data e Hora do Pedido")
    # 'pecas' armazena os IDs das peças do modelo Peca (IDs fixos 1, 2, 3)
    pecas = models.JSONField(verbose_name="IDs das Peças nas Montagens")
    status = models.CharField(max_length=50, choices=PEDIDO_STATUS_CHOICES, default='pendente', verbose_name="Status do Pedido")

    def __str__(self):
        return f"Pedido {self.id} - Status: {self.get_status_display()}"

    def get_pecas_nomes(self):
        """Retorna uma lista plana dos nomes das peças no pedido."""
        flat_list_ids = [item for sublist in self.pecas for item in sublist]
        pecas_obj = Peca.objects.filter(id__in=flat_list_ids)
        peca_map = {p.id: p.name for p in pecas_obj}
        return [peca_map.get(peca_id, "Desconhecido") for peca_id in flat_list_ids]

    def get_pecas_shape_types(self): # Mantido o nome para compatibilidade com o JS/Frontend
        """Retorna uma lista plana dos tipos de forma das peças no pedido."""
        flat_list_ids = [item for sublist in self.pecas for item in sublist]
        pecas_obj = Peca.objects.filter(id__in=flat_list_ids)
        peca_map = {p.id: p.tipo for p in pecas_obj} # Usa p.tipo aqui
        return [peca_map.get(peca_id, "unknown") for peca_id in flat_list_ids]

    class Meta:
        verbose_name = "Pedido de Montagem"
        verbose_name_plural = "Pedidos de Montagem"


# Modelo para "Estoque"
# Este modelo armazena a quantidade de cada tipo de peça em estoque
class Estoque(models.Model):
    # O 'id' do Estoque será o mesmo ID da Peca à qual ele se refere (OneToOneField)
    # Isso garante que cada Peca tenha apenas uma entrada de estoque.
    peca = models.OneToOneField(Peca, on_delete=models.CASCADE, primary_key=True, verbose_name="Peça")
    # 'tipo' agora é redundante se já temos 'peca', mas se você quer, podemos manter.
    # No entanto, é melhor usar peca.shape_type diretamente para consistência.
    # Se você *realmente* quer um campo 'tipo' separado aqui, ele seria:
    tipo = models.CharField(max_length=50, choices=TIPO_FORMA_CHOICES, verbose_name="Tipo de Forma (do Estoque)")
    qtd = models.IntegerField(default=0, verbose_name="Quantidade em Estoque")

    def __str__(self):
        # Usamos peca.name para um display mais amigável
        return f"{self.peca.name}: {self.qtd} em estoque"

    class Meta:
        verbose_name = "Estoque de Peça"
        verbose_name_plural = "Estoque de Peças"