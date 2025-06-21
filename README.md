# Projeto Integrador IV
**🌐 Read this in other languages:**
- 🇧🇷 [Português (BR)](README(PT-BR).md)

## 📌 Overview

This project is a full-stack web system developed with Django to optimize the management and visualization of assembly orders. It is ideal for production environments such as factories, workshops, and automated assembly centers. The system acts as a crucial bridge between order management and industrial automation.

The system provides:
- Intuitive order registration, allowing up to three assemblies per order.
- Interactive graphical representation of involved parts, offering a clear visualization of what is being assembled.
- Responsive web interface ensuring usability across all devices.
- Integration with MongoDB and Node-RED, enabling bidirectional communication with a PLC and, consequently, a collaborative assembly robot for automation.

---

## 🧰 Technologies Used

- **Backend:**
  - Python 3.12 – Main programming language.
  - Django 3.1.12 – Secure and rapid web development framework.
  - Channels 4.2.2 – Adds asynchronous and real-time features (WebSockets).
  - Djongo 1.3.7 – Adapter to use MongoDB with Django.
  - Daphne 4.2.0 – ASGI server for running Channels applications.

- **Frontend:**
  - HTML5 – Base structure for web pages.
  - TailwindCSS – Utility-first CSS framework for fast and responsive styling.
  - JavaScript – Client-side interactivity logic.

- **Database:**
  - MongoDB – Flexible and scalable NoSQL database.

---

## 🗂 Project Structure
```
piiv/
│
├── manage.py # Django command-line utility.
├── .env # Environment variables (not versioned).
├── setup/ # Global Django project configuration.
│ ├── settings.py # Main project settings.
│ ├── urls.py # Global URL routing.
│ ├── wsgi.py # WSGI entry point for deployment.
│ └── asgi.py # ASGI entry point for Channels.
│
├── dashboard/ # Main Django app.
│ ├── models.py # Application data models.
│ ├── views.py # View logic (controllers).
│ ├── urls.py # App-specific routes.
│ ├── consumers.py # WebSocket logic (Django Channels).
│ ├── routing.py # ASGI routing for consumers.
│ ├── tests.py # Unit and integration tests.
│ ├── templates/ # HTML templates.
│ │ ├── base.html
│ │ ├── home.html
│ │ ├── historico.html
│ │ └── novoPedido.html
│ ├── static/ # Static files (CSS, JS).
│ │ ├── js/
│ │ ├── main.js
│ │ ├── modules/
│ │ │ ├── notifications.js
│ │ │ ├── modals.js
│ │ │ ├── constants.js
│ │ │ ├── charts.js
│ │ │ └── utils.js
│ │ └── style.css
│ └── migrations/ # Django database migrations.
│
├── README.md # Project documentation.
└── requirements.txt # Python dependencies.
``` 
---

## 🚀 Core Features

The system provides a powerful set of features for assembly management:

- **Real-Time Dashboard:** Get a live overview of part inventory and monitor order statuses. Includes visual alerts for low stock.
- **Intuitive Order Creation:** A user-friendly interface allows for creating new orders by selecting up to 9 parts (3 per assembly), with graphical previews of configurations.
- **Complete Order History:** View all submitted orders with search options by ID and status. Full order details, including graphical representations of each assembly, are available in a dedicated modal.
- **Analytics Dashboard:** An interactive line chart in the order history shows the volume of created and completed orders over time, with daily, weekly, and monthly filters.
- **In-App Notification System:** Receive instant feedback with a bell icon in the header, an unread counter, and a dropdown for quick access to details.
- **Responsive Design:** The application adapts perfectly to different screen sizes (mobile, tablet, desktop), ensuring a consistent user experience.
- **Modern Visual Feedback:** Includes visual loaders for asynchronous operations and Toast notifications for quick, contextual feedback.
- **Accessibility (ARIA):** Implements ARIA attributes to make the system accessible to people with disabilities, enhancing support for assistive technologies.

---

## 🧪 Running the Project Locally

### Pre-Requisites

- Python 3.12
- Pipenv or virtualenv (optional, but recommended)

### Installation

#### 1. Generate a Secret Key

```bash
python manage.py shell -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```
Copy the generated key and add it to your .env file:
```python
SECRET_KEY='your_secret_key_here'
```
2. Clone the Repository
```bash
git clone https://github.com/maxykoin/Projeto-Integrador-IV
cd Projeto-Integrador-IV
```
3. Create and Activate a Virtual Environment
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```
4. Install Dependencies
```bash
pip install -r requirements.txt
```
5. Configure MongoDB
Edit setup/settings.py:
- If using locally:
```python
DATABASES = {
    'default': {
        'ENGINE': 'djongo',
        'NAME': 'pi-iv',
        'HOST': 'localhost',
        'PORT': 27017,
    }
}
```
- If using MongoDB Atlas:
```python
DATABASES = {
    'default': {
        'ENGINE': 'djongo',
        'NAME': '<your_db>',
        'ENFORCE_SCHEMA': False,
        'CLIENT': {
            'host': 'mongodb+srv://<username>:<password>@<cluster_url>/<your_db>?retryWrites=true&w=majority',
            'authMechanism': 'SCRAM-SHA-1',
        }
    }
}
```
6. Run Migrations
```bash
python manage.py makemigrations dashboard
python manage.py migrate
```
7. Create a Superuser
```bash
python manage.py createsuperuser
```
8. Populate Initial Data (Optional)
- Access the Django admin at http://127.0.0.1:8000/admin.
- Add 3 types of Peca (ID 1: Circle, ID 2: Hexagon, ID 3: Square) with their respective colors.
- Add stock entries for each Peca.

9. Start the Development Server
```bash
python manage.py runserver
```
Visit http://127.0.0.1:8000/ in your browser.

---

## 🤝 Contributing
We welcome contributions! To contribute:

1. Fork this repository.
2. Create a branch for your feature or bugfix:
```bash
git checkout -b feature/my-feature-name
```
3. Make your changes with clear and concise commits:
```bash
git commit -m "feat: Add feature X"
```
4. Push your branch:
```bash
git push origin feature/my-feature-name
```
5. Open a Pull Request to the main branch describing your changes.

---

## 🧾 License
This project is licensed under the MIT License. See the LICENSE file for more details.

---
<p align = "center">Built with ❤️ using Django, MongoDB, and Node-RED.</p>