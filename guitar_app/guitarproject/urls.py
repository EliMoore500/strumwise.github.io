from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import views as auth_views  # Import auth_views
from guitarapp import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('guitarapp.urls')),
    path("login/", auth_views.LoginView.as_view(template_name="registration/login.html"), name="login"),
    path("learn_chords/", views.learn_chords, name="learn_chords"),
    path("compose/", views.compose_music, name="compose"),
    path("compositions/", views.my_compositions, name="compositions"),
    path('guitar-tuner/', views.guitar_tuner, name='guitar_tuner'),
]