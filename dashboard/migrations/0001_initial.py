# Generated by Django 3.1.12 on 2025-06-25 12:04

from django.db import migrations, models
import django.utils.timezone
import djongo.models.fields


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Estoque',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ],
        ),
        migrations.CreateModel(
            name='Notificacao',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('titulo', models.CharField(max_length=200, verbose_name='Título da Notificação')),
                ('mensagem', models.TextField(verbose_name='Mensagem Completa')),
                ('data_criacao', models.DateTimeField(default=django.utils.timezone.now, verbose_name='Data de Criação')),
                ('lida', models.BooleanField(default=False, verbose_name='Lida')),
                ('tipo', models.CharField(default='info', max_length=50, verbose_name='Tipo')),
                ('link', models.CharField(blank=True, max_length=255, null=True, verbose_name='Link de Destino')),
            ],
            options={
                'verbose_name': 'Notificação',
                'verbose_name_plural': 'Notificações',
                'ordering': ['-data_criacao'],
            },
        ),
        migrations.CreateModel(
            name='Peca',
            fields=[
                ('id', models.IntegerField(primary_key=True, serialize=False, verbose_name='ID da Peça (1=Círculo, 2=Hexágono, 3=Quadrado)')),
                ('name', models.CharField(max_length=100, unique=True, verbose_name='Nome da Peça')),
                ('tipo', models.CharField(choices=[('circulo', 'Círculo'), ('hexagono', 'Hexágono'), ('quadrado', 'Quadrado')], max_length=50, unique=True, verbose_name='Tipo de Forma')),
                ('qtd', models.IntegerField(default=0, verbose_name='Quantidade em Estoque')),
                ('color_hex', models.CharField(default='#CCCCCC', max_length=7, verbose_name='Cor Hexadecimal')),
            ],
            options={
                'verbose_name': 'Peça em Estoque',
                'verbose_name_plural': 'Peças em Estoque',
            },
        ),
        migrations.CreateModel(
            name='Pedido',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('data', models.DateTimeField(default=django.utils.timezone.now, verbose_name='Data e Hora do Pedido')),
                ('pecas', djongo.models.fields.JSONField(verbose_name='IDs das Peças nas Montagens')),
                ('status', models.IntegerField(choices=[(2, 'Pendente'), (1, 'Em Andamento'), (0, 'Concluído')], default=2, verbose_name='Status do Pedido')),
            ],
            options={
                'verbose_name': 'Pedido de Montagem',
                'verbose_name_plural': 'Pedidos de Montagem',
            },
        ),
    ]
