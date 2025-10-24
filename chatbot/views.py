from django.shortcuts import render
from django.http import StreamingHttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from .models import Conversation, Message
from .ai_service import KenrishAIService
from django.utils import timezone
import json

@csrf_exempt
def start_conversation(request):
    if request.method != "POST":
        return JsonResponse({"detail": "POST only"}, status=405)
    conv = Conversation.objects.create(user=request.user if request.user.is_authenticated else None)
    return JsonResponse({"id": conv.id})

@csrf_exempt
def send_message(request, cid: int):
    conv = get_object_or_404(Conversation, id=cid)
    if request.method != "POST":
        return JsonResponse({"detail": "POST only"}, status=405)
    
    try:
        payload = json.loads(request.body.decode())
        user_message = payload["message"]
        
        # Save user message
        Message.objects.create(conversation=conv, role="user", content=user_message)
        
        # Get conversation history
        history = [{"role": m.role, "content": m.content} for m in conv.messages.order_by("created_at")]
        
        # Initialize AI service
        ai_service = KenrishAIService()
        
        def event_stream():
            try:
                response_content = ""
                # Get complete response first
                full_response = ai_service.get_response(user_message, history[:-1])
                
                # Stream character by character for visual effect
                for char in full_response:
                    response_content += char
                    yield f"data: {char}\n\n"
                
                # Save assistant message after stream
                if response_content:
                    Message.objects.create(
                        conversation=conv, 
                        role="assistant", 
                        content=response_content, 
                        created_at=timezone.now()
                    )
                yield "data: [DONE]\n\n"
                
            except Exception as e:
                error_msg = f"I apologize, but I'm having trouble right now. Please try again in a moment."
                yield f"data: {error_msg}\n\n"
                Message.objects.create(
                    conversation=conv, 
                    role="assistant", 
                    content=error_msg, 
                    created_at=timezone.now()
                )
                yield "data: [DONE]\n\n"

        resp = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
        resp["Cache-Control"] = "no-cache"
        resp["Connection"] = "keep-alive"
        return resp
        
    except Exception as e:
        return JsonResponse({"error": "Invalid request"}, status=400)

@csrf_exempt
def quick_chat(request):
    """Non-streaming endpoint for quick responses"""
    if request.method != "POST":
        return JsonResponse({"detail": "POST only"}, status=405)
    
    try:
        payload = json.loads(request.body.decode())
        user_message = payload["message"]
        
        ai_service = KenrishAIService()
        response = ai_service.get_response(user_message)
        
        return JsonResponse({"response": response})
        
    except Exception as e:
        return JsonResponse({"error": "Failed to get response"}, status=500)

def chat_page(request):
    return render(request, "chatbot/chat.html")
