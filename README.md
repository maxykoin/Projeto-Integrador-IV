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

- **Dashboard em Tempo Real:** Visão geral do estoque de peças (Círculo, Hexágono, Quadrado) e contagem de pedidos (total, em andamento). Alertas visuais para estoque baixo.
- **Criação de Pedidos:** Interface para montar novos pedidos, selecionando 9 peças (3 por montagem), com pré-visualização das peças.
- **Histórico de Pedidos:** Lista de todos os pedidos realizados, com busca por ID/status e detalhes completos do pedido em um modal.
- **Gráficos de Pedidos:** Gráfico de linha interativo no histórico para visualizar o volume de pedidos criados e concluídos ao longo do tempo (diário/semanal/mensal).
- **Sistema de Notificações In-App:** Ícone de sino no cabeçalho com contador de notificações não lidas e um dropdown para ver detalhes.
- **Responsividade:** Layout adaptável para diferentes tamanhos de tela (mobile, tablet, desktop).
- **Loaders Visuais:** Indicadores de carregamento para operações assíncronas.
- **Acessibilidade (ARIA):** Implementação de atributos ARIA para melhorar a experiência de usuários com tecnologias assistivas.
- **Notificações Toast:** Mensagens pop-up para feedback ao usuário.

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
- Configuração do SECRET_KEY
Abra seu terminal na raiz do projeto (piiv/) e execute o comando:
```bash
python manage.py shell -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copie a chave secreta que será exibida e adicione ao arquivo .env
```bash
SECRET_KEY = 'sua_secret_key'
```

1.  **Clone o Repositório:**
    ```bash
    git clone <URL_DO_SEU_REPOSITORIO>
    cd pi-iv
    ```
2.  **Crie e Ative um Ambiente Virtual:**
    ```bash
    python -m venv venv
    # No Windows:
    venv\Scripts\activate
    # No macOS/Linux:
    source venv/bin/activate
    ```
3.  **Instale as Dependências do Python:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Configuração do Banco de Dados (MongoDB):**
    Abra `setup/settings.py` e configure as credenciais do seu MongoDB:
    ```python
    DATABASES = {
        'default': {
            'ENGINE': 'djongo',
            'NAME': 'pi-iv', # Nome do seu banco de dados
            'HOST': 'localhost', # Ou a URL do seu MongoDB Atlas
            'PORT': 27017,       # Porta padrão do MongoDB
            # 'USER': 'seu_usuario', # Se houver autenticação
            # 'PASSWORD': 'sua_senha', # Se houver autenticação
        }
    }
    ```
5.  **Executar Migrações:**
    ```bash
    python manage.py makemigrations dashboard
    python manage.py migrate
    ```
6.  **Criar um Superusuário (para acesso ao Admin):**
    ```bash
    python manage.py createsuperuser
    ```
7.  **Popular Dados Iniciais (Opcional, mas Recomendado):**
    Para ter peças e estoque inicial:
    - Acesse o admin (`http://127.0.0.1:8000/admin`).
    - Adicione 3 tipos de `Peca` (ID 1: Círculo, ID 2: Hexágono, ID 3: Quadrado) com suas cores.
    - Adicione itens de `Estoque` para cada `Peca`.

8.  **Rodar o Servidor de Desenvolvimento:**
    ```bash
    python manage.py runserver
    ```
    Acesse `http://127.0.0.1:8000/` no seu navegador.

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
