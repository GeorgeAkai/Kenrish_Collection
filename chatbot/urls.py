from django.urls import path
from .views import (
    start_conversation,
    send_message,
    chat_page,
    quick_chat,
    ai_chatbot_response  # ✅ Add this import
)

urlpatterns = [
    path("chat/", chat_page, name="chat_page"),
    path("conversations/", start_conversation, name="start_conversation"),
    path("conversations/<int:cid>/messages/", send_message, name="send_message"),
    path("quick-chat/", quick_chat, name="quick_chat"),
    path("api/chat/", ai_chatbot_response, name="ai_chatbot_response"),  # ✅ Add this route
]
