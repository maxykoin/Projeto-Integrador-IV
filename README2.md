# Sistema de Gestão de Estoque e Pedidos de Montagem (PI IV)

## Visão Geral
Este projeto é uma aplicação web desenvolvida como parte do Projeto Integrador IV, focada na gestão de estoque de peças e no acompanhamento de pedidos de montagem. Utiliza Django para o backend, MongoDB (via Djongo) como banco de dados, e um frontend moderno com Tailwind CSS e JavaScript puro (com Chart.js para visualizações).

## Funcionalidades Atuais
- **Dashboard em Tempo Real:** Visão geral do estoque de peças (Círculo, Hexágono, Quadrado) e contagem de pedidos (total, em andamento). Alertas visuais para estoque baixo.
- **Criação de Pedidos:** Interface para montar novos pedidos, selecionando 9 peças (3 por montagem), com pré-visualização das peças.
- **Histórico de Pedidos:** Lista de todos os pedidos realizados, com busca por ID/status e detalhes completos do pedido em um modal.
- **Gráficos de Pedidos:** Gráfico de linha interativo no histórico para visualizar o volume de pedidos criados e concluídos ao longo do tempo (diário/semanal/mensal).
- **Sistema de Notificações In-App:** Ícone de sino no cabeçalho com contador de notificações não lidas e um dropdown para ver detalhes.
- **Responsividade:** Layout adaptável para diferentes tamanhos de tela (mobile, tablet, desktop).
- **Loaders Visuais:** Indicadores de carregamento para operações assíncronas.
- **Acessibilidade (ARIA):** Implementação de atributos ARIA para melhorar a experiência de usuários com tecnologias assistivas.
- **Notificações Toast:** Mensagens pop-up para feedback ao usuário.
- **Modo Escuro (Parcial):** Estrutura para alternar entre temas claro e escuro.

## Tecnologias Utilizadas
- **Backend:** Python 3.x, Django 5.x
- **Banco de Dados:** MongoDB (com Djongo ORM)
- **Comunicação em Tempo Real:** Django Channels (WebSockets)
- **Frontend:** HTML5, CSS3 (Tailwind CSS), JavaScript (Vanilla JS), Chart.js
- **Controle de Versão:** Git

## Configuração e Instalação do Projeto

### Pré-requisitos
- Python 3.x
- pip (gerenciador de pacotes Python)
- MongoDB (instalado e rodando localmente ou em um serviço de cloud como MongoDB Atlas)
- Git

### Passos para Configuração
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
    # (Crie um requirements.txt se ainda não tiver, com pip freeze > requirements.txt)
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

## Como Contribuir
1.  Faça um fork do projeto.
2.  Crie uma nova branch para sua feature (`git checkout -b feature/MinhaNovaFeature`).
3.  Faça suas alterações e adicione testes, se aplicável.
4.  Faça commit das suas mudanças (`git commit -m 'feat: Adiciona nova funcionalidade X'`).
5.  Envie para sua branch (`git push origin feature/MinhaNovaFeature`).
6.  Abra um Pull Request.

## Licença
[Selecione uma licença, por exemplo, MIT ou outra de sua preferência]

## Contato
[Seu Nome/GitHub Profile] - [Seu Email]

## Agradecimentos
- Professor(es) do Projeto Integrador IV
- Comunidade Django e Tailwind CSS