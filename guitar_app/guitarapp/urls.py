from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path('login/', auth_views.LoginView.as_view(template_name='registration/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('signup/', auth_views.LoginView.as_view(template_name='registration/signup.html'), name='signup'),
    path("learn_chords/", views.learn_chords, name="learn_chords"),
    path("compose/", views.compose_music, name="compose"),
    path("compositions/", views.my_compositions, name="compositions"),
    path('compositions/', views.my_compositions, name='my_compositions'),
]
