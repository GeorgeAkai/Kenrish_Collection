from django.db import models

# Create your models here.
from django.db import models

class Conversation(models.Model):
    user = models.ForeignKey("auth.User", on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    title = models.CharField(max_length=200, blank=True, default="")

class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=10, choices=[("user","user"),("assistant","assistant"),("system","system")])
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    token_count = models.IntegerField(default=0)

