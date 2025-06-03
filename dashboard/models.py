from djongo import models

# Modelo de Peça individual
class Peca(models.Model):
    tipo = models.CharField(max_length=50, choices=[('circulo', 'Círculo'),
        ('hexagono', 'Hexágono'),
        ('quadrado', 'Quadrado'),])
    qtd = models.IntegerField()


# Modelo para Estoque
class Estoque(models.Model):
    tipo = models.CharField(max_length=50)  # Ex: 'círculo', 'hexágono', 'quadrado'
    qtd = models.IntegerField()


# Modelo para Pedido
class Pedido(models.Model):
    pecas = models.JSONField()
    status = models.CharField(max_length=50, choices=[('em_andamento', 'Em Andamento'), ('entregue', 'Entregue')])
