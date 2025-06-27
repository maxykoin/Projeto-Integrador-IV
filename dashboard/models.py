from djongo import models
from django.utils import timezone

PEDIDO_STATUS_CHOICES = [
    (3, 'Cancelado'),
    (2, 'Pendente'),
    (1, 'Em Andamento'),
    (0, 'Concluído'),
]

TIPO_FORMA_CHOICES = [
    ('circulo', 'Círculo'),
    ('quadrado', 'Quadrado'),
    ('hexagono', 'Hexágono'),
]

# Modelo para "Peça"
class Peca(models.Model):
    id = models.IntegerField(primary_key=True, verbose_name="ID da Peça (1=Círculo, 3=Quadrado, 3=Hexágono)")
    
    name = models.CharField(max_length=100, unique=True, verbose_name="Nome da Peça")
    tipo = models.CharField(max_length=50, choices=TIPO_FORMA_CHOICES, unique=True, verbose_name="Tipo de Forma")
    
    qtd = models.IntegerField(default=0, verbose_name="Quantidade em Estoque")
    
    color_hex = models.CharField(max_length=7, default="#CCCCCC", verbose_name="Cor Hexadecimal")

    def __str__(self):
        return f"{self.name} ({self.get_tipo_display()}): {self.qtd} em estoque"

    class Meta:
        verbose_name = "Peça em Estoque"
        verbose_name_plural = "Peças em Estoque"

class Estoque(models.Model):
    pass

# Modelo para Pedido
class Pedido(models.Model):
    data = models.DateTimeField(default=timezone.now, verbose_name="Data e Hora do Pedido")
    pecas = models.JSONField(verbose_name="IDs das Peças nas Montagens")
    status = models.IntegerField(choices=PEDIDO_STATUS_CHOICES, default=2, verbose_name="Status do Pedido")

    def __str__(self):
        return f"Pedido {self.pk} - Status: {self.get_status_display()}"

    def get_pecas_nomes(self):
        flat_list_ids = [item for sublist in self.pecas for item in sublist]
        pecas_obj = Peca.objects.filter(id__in=flat_list_ids)
        peca_map = {p.id: p.name for p in pecas_obj}
        return [peca_map.get(peca_id, "Desconhecido") for peca_id in flat_list_ids]

    def get_pecas_shape_types(self):
        flat_list_ids = [item for sublist in self.pecas for item in sublist]
        pecas_obj = Peca.objects.filter(id__in=flat_list_ids)
        peca_map = {p.id: p.tipo for p in pecas_obj}
        return [peca_map.get(peca_id, "unknown") for peca_id in flat_list_ids]

    class Meta:
        verbose_name = "Pedido de Montagem"
        verbose_name_plural = "Pedidos de Montagem"


# Modelo para Notificação
class Notificacao(models.Model):
    titulo = models.CharField(max_length=200, verbose_name="Título da Notificação")
    mensagem = models.TextField(verbose_name="Mensagem Completa")
    data_criacao = models.DateTimeField(default=timezone.now, verbose_name="Data de Criação")
    lida = models.BooleanField(default=False, verbose_name="Lida")
    tipo = models.CharField(max_length=50, default='info', verbose_name="Tipo")
    link = models.CharField(max_length=255, blank=True, null=True, verbose_name="Link de Destino")

    def __str__(self):
        return f"[{'Lida' if self.lida else 'Não Lida'}] {self.titulo} ({self.data_criacao.strftime('%d/%m %H:%M')})"

    class Meta:
        verbose_name = "Notificação"
        verbose_name_plural = "Notificações"
        ordering = ['-data_criacao']