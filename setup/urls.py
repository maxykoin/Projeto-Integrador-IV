from django.urls import path, include

urlpatterns = [
    path('', include('dashboard.urls')),    # todas URLs '' vão para dashboard.urls
]