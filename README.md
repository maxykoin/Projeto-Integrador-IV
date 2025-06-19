# Projeto Integrador IV

## 📌 Visão Geral

Este projeto é um sistema web desenvolvido com Django para o gerenciamento e visualização de pedidos de montagem de peças, ideal para aplicações em fábricas, oficinas ou centros de montagem automatizados. O sistema permite o cadastro de pedidos, a separação de 3 montagens por pedido, com representações gráficas das peças envolvidas e a visualização detalhada via interface web responsiva. Além de conexão com o banco de dados MongoDB, que conversa com o CLP por meio do Node-Red para receber e enviar informações ao robô colaborativo de montagem. 

---

## 🧰 Tecnologias Utilizadas

- **Backend:**
  - Python 3.13
  - Django 3.1.12
  - Channels 4.2.2
  - Djongo 1.3.7
  - Daphne 4.2.0

- **Frontend:**
  - HTML5
  - TailwindCSS
  - JavaScript (vanilla)

- **Banco de Dados:**
  - MongoDB

---

## 🗂 Estrutura do Projeto

```
piiv/
│
├── manage.py
├── .env                    # Configurações secretas (não versionado)
├── setup/                  # Configurações globais do Django
│   ├── settings.py         # Configurações principais
│   ├── urls.py             # URLs principais
│   └── ...
│
├── dashboard/              # App principal
│   ├── models.py           # Modelos de dados
│   ├── views.py            # Lógica de visualização
│   ├── urls.py             # Rotas locais
│   ├── templates/          # Templates HTML
│   │   ├── home.html
│   │   ├── historico.html
│   │   └── novoPedido.html
│   ├── static/
│   │   └── script.js       # Scripts JS de interação
│   └── migrations/         # Migrações do banco
│
└── README.md               
```

---

## 🚀 Funcionalidades

- 📦 Cadastro de pedidos com múltiplas montagens
- 🧩 Seleção e separação visual de peças por pedido
- 🧾 Dashboard para monitoramento de peças em espera e pedidos
- 🖼 Interface com visualização gráfica dos componentes
- 🔐 Arquivo `.env` para variáveis sensíveis

---

## 📄 Principais Arquivos

### `models.py`
Define as entidades principais:
- `Pedido`: informações básicas do pedido, com cada montagem e as respectivas peças, além do status do pedido.
- `Estoque`: informações sobre quais peças estão em espera.
- `Peca`: informações sobre a quantidade e tipo de peças na linha de montagem.

### `views.py`
- Renderiza os templates `home`, `novoPedido` e `historico`.
- Processa e organiza os dados enviados pelos formulários.
- Gera contextos dinâmicos com listas de peças e pedidos.

### `templates/*.html`
- **`home.html`**: dashboard com dados da quantidade de peças em espera e pedidos.
- **`novoPedido.html`**: formulário interativo para criação de pedidos.
- **`historico.html`**: tabela com pedidos anteriores + detalhes com visual gráfico.

---

## 🧪 Como Rodar o Projeto Localmente

### Pré-requisitos

- Python 3.13
- Pipenv ou virtualenv (opcional, mas recomendado)

### Instalação

```bash
# Clone o repositório
git clone [https://github.com/maxykoin/piiv.git](https://github.com/maxykoin/piiv.git)
cd piiv

# Crie o ambiente virtual
python -m venv venv
source venv/bin/activate # Windows: venv\Scripts\activate

# Instale dependências
pip install -r requirements.txt
pip install python-dotenv # Instale também o python-dotenv para gerenciar variáveis de ambiente
```
#### Configuração do SECRET_KEY e Variáveis de Ambiente
Abra seu terminal na raiz do projeto (piiv/) e execute o comando:

```bash
python manage.py shell -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copie a chave secreta que será exibida e adicione ao arquivo .env
```bash
SECRET_KEY = 'sua_secret_key'
```

Para o banco de dados, adicione a connection string do seu banco no arquivo .env
```bash
MONGODB = 'connection_string'
```

### Rodando a Aplicação
Aplique as migrações do banco de dados:

```bash
# Aplique as migrações
python manage.py migrate

# Rode o servidor
python manage.py runserver
```

---

## 🔍 Exemplos de Uso

1. Acesse `http://127.0.0.1:8000/`
2. Clique em “Novo Pedido”
3. Escolha peças para cada montagem
4. Confirme
5. Acesse o “Histórico” e clique para ver os detalhes gráficos

---

## 🤝 Contribuindo

1. Fork este repositório
2. Crie sua branch: `git checkout -b feature/NovaFuncionalidade`
3. Commit suas mudanças: `git commit -m 'Adiciona nova funcionalidade'`
4. Push para a branch: `git push origin feature/NovaFuncionalidade`
5. Abra um Pull Request

---

## 🧾 Licença

Este projeto está licenciado sob os termos da **MIT License**. Veja o arquivo `LICENSE` para mais detalhes.
