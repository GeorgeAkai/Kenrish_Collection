from django.urls import path
from .views import start_conversation, send_message, chat_page, quick_chat


urlpatterns = [
    path("chat/", chat_page, name="chat_page"),
    path("conversations/", start_conversation, name="start_conversation"),
    path("conversations/<int:cid>/messages/", send_message, name="send_message"),
    path("quick-chat/", quick_chat, name="quick_chat"),
]
