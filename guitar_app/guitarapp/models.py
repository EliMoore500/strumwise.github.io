from django.db import models
from django.contrib.auth.models import User

class Composition(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=100)
    chords = models.TextField(help_text="Space-separated chord names")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} by {self.user.username}"