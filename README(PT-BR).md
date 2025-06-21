# Projeto Integrador IV
**🌐 Leia em outros idiomas:**
- 🇺🇸 [English (EN)](README.md)
---
## 📌 Visão Geral

Este projeto é um sistema web completo desenvolvido em Django para otimizar o gerenciamento e a visualização de pedidos de montagem de peças. Ideal para ambientes de produção como fábricas, oficinas e centros de montagem automatizados, ele atua como uma ponte crucial entre a gestão de pedidos e a automação industrial.

O sistema permite:
- Cadastro intuitivo de pedidos, com a capacidade de agrupar até três montagens por pedido.
- Representação gráfica interativa das peças envolvidas, oferecendo uma clara visualização do que será montado.
- Interface web responsiva que garante acesso e usabilidade em qualquer dispositivo.
- Integração com MongoDB e Node-RED, estabelecendo comunicação bidirecional com um CLP e, consequentemente, com um robô colaborativo de montagem, para automação do processo.

---

## 🧰 Tecnologias Utilizadas

- **Backend:**
  - Python 3.12: Linguagem de programação principal.
  - Django 3.1.12: Framework web para desenvolvimento rápido e seguro.
  - Channels 4.2.2: Habilita funcionalidades assíncronas e comunicação em tempo real (WebSockets).
  - Djongo 1.3.7: Adaptador para utilizar MongoDB com Django.
  - Daphne 4.2.0: Servidor ASGI para rodar aplicações Channels.

- **Frontend:**
  - HTML5: Estrutura base das páginas web.
  - TailwindCSS: Framework CSS utilitário para estilização rápida e responsiva.
  - JavaScript: Lógica interativa do lado do cliente.

- **Banco de Dados:**
  - MongoDB: Banco de dados NoSQL flexível e escalável.

---

## 🗂 Estrutura do Projeto

```
piiv/
│
├── manage.py                    # Utilitário de linha de comando do Django.
├── .env                         # Variáveis de ambiente sensíveis (não versionado).
├── setup/                       # Configurações globais do projeto Django.
│   ├── settings.py              # Configurações principais do projeto.
│   ├── urls.py                  # Rotas URL globais do projeto.
│   ├── wsgi.py                  # Ponto de entrada WSGI para deploy.
│   └── asgi.py                  # Ponto de entrada ASGI para assincronismo (Channels).
│
├── dashboard/                   # Aplicativo Django principal.
│   ├── models.py                # Modelos de dados da aplicação.
│   ├── views.py                 # Lógica de visualização (controladores).
│   ├── urls.py                  # Rotas URL específicas do app.
│   ├── consumers.py             # Lógica para WebSockets (Django Channels).
│   ├── routing.py               # Definição de rotas ASGI para consumers.
│   ├── tests.py                 # Testes unitários e de integração.
│   ├── templates/               # Templates HTML do aplicativo.
│   │   ├── base.html            # Template HTML base.
│   │   ├── home.html            # Template da página inicial.
│   │   ├── historico.html       # Template da página de histórico.
│   │   └── novoPedido.html      # Template da página de novo pedido.
│   ├── static/                  # Arquivos estáticos (CSS, JS) do aplicativo.
│   │   ├── js/                  # Diretório para arquivos JavaScript.
│   │   ├── main.js              # JavaScript principal do dashboard.
│   │   ├── modules/             # Módulos JavaScript organizados.
│   │   │   ├── notifications.js # Módulo JS para notificações.
│   │   │   ├── modals.js        # Módulo JS para modais.
│   │   │   ├── constants.js     # Módulo JS para constantes.
│   │   │   ├── charts.js        # Módulo JS para gráficos.
│   │   │   └── utils.js         # Módulo JS de funções utilitárias.
│   │   └── style.css            # CSS extra do dashboard, junto com o Tailwind.
│   └── migrations/              # Migrações do banco de dados geradas pelo Django.
│
├── README.md                    # Documentação do projeto.
└── requirements.txt             # Lista de dependências Python. 
```

---

## 🚀 Funcionalidades Principais
O sistema oferece um conjunto de funcionalidades poderosas para a gestão de montagens:

- **Dashboard em Tempo Real:** Tenha uma visão imediata do estoque de peças e acompanhe o status dos pedidos. Inclui alertas visuais para estoque baixo.
- **Criação Intuitiva de Pedidos:** Uma interface amigável permite montar novos pedidos, selecionando até 9 peças (3 por montagem), com pré-visualização gráfica das configurações.
- **Histórico Completo de Pedidos:** Consulte todos os pedidos realizados com opções de busca por ID e status. Detalhes completos do pedido, incluindo a representação das montagens, podem ser visualizados em um modal dedicado.
- **Gráficos de Acompanhamento:** Um gráfico de linha interativo no histórico permite visualizar o volume de pedidos criados e concluídos ao longo do tempo, com opções de filtro diário, semanal e mensal.
- **Sistema de Notificações In-App:** Receba feedback instantâneo com um ícone de sino no cabeçalho, contador de notificações não lidas e um dropdown para acesso rápido aos detalhes.
- **Design Responsivo:** A aplicação se adapta perfeitamente a diferentes tamanhos de tela (mobile, tablet, desktop), garantindo uma experiência de usuário consistente.
- **Feedback Visual Moderno:** Inclui loaders visuais para operações assíncronas e notificações Toast para feedback rápido e contextual ao usuário.
- **Acessibilidade (ARIA):** Implementação de atributos ARIA para garantir que o sistema seja utilizável por pessoas com deficiência, melhorando a experiência com tecnologias assistivas.

---

## 🧪 Como Rodar o Projeto Localmente

### Pré-requisitos

- Python 3.13
- Pipenv ou virtualenv (opcional, mas recomendado)

### Instalação
- Configuração do SECRET_KEY
  - Abra seu terminal na raiz do projeto (piiv/) e execute o comando:
  ```bash
  python manage.py shell -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
  ```
  
  - Copie a chave secreta que será exibida e adicione ao arquivo .env
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
Contribuições são muito bem-vindas! Se você deseja colaborar com o projeto, por favor, siga os passos abaixo:

1. Faça um fork deste repositório.
2. Crie uma nova branch para sua funcionalidade ou correção: 
    ```bash
    git checkout -b feature/minha-nova-funcionalidade (ou bugfix/correcao-do-erro).
    ```
3. Realize suas alterações e faça commits claros e concisos: 
    ```bash
    git commit -m 'feat: Adiciona funcionalidade X' (ou fix: Corrige problema Y).
    ```
4. Envie suas mudanças para a sua branch no seu fork:
    ```bash
    git push origin feature/minha-nova-funcionalidade.
    ```
5. Abra um Pull Request para a branch main deste repositório, descrevendo detalhadamente as mudanças e o problema que elas resolvem.

---

## 🧾 Licença

Este projeto está licenciado sob os termos da **MIT License**. Veja o arquivo `LICENSE` para mais detalhes.
