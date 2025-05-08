from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login, authenticate
from .models import Composition
from django.contrib.auth.forms import UserCreationForm
from django.urls import reverse_lazy
from django.views.generic.edit import CreateView

class SignupView(CreateView):
    form_class = UserCreationForm
    template_name = 'registration/signup.html'
    success_url = reverse_lazy('home')

    def form_valid(self, form):
        # Save the user instance
        user = form.save()
        # Log the user in
        login(self.request, user)
        return redirect(self.success_url)

def learn_chords(request):
    return render(request, 'learn_chords.html')

def home(request):
    return render(request, "base.html")

def guitar_tuner(request):
    return render(request, 'guitar_tuner.html')

@login_required(login_url='login')
def compose_music(request):
    if request.method == 'POST':
        title = request.POST.get('title', 'Untitled')
        chords = request.POST.get('chord_sequence', '')
        if chords is None:
            chords = ''
        Composition.objects.create(
            user=request.user,
            title=title.strip(),
            chords=chords.strip()
        )
        return redirect('my_compositions')
    return render(request, 'compose_music.html')

@login_required(login_url='login')
def my_compositions(request):
    user_comps = Composition.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'my_compositions.html', {'compositions': user_comps})
