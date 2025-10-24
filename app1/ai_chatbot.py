import json
import requests
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

@csrf_exempt
@require_http_methods(["POST"])
def ai_chatbot_response(request):
    try:
        data = json.loads(request.body)
        user_message = data.get('message', '')
        
        # OpenRouter API configuration
        api_key = "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"
        
        # Kenrish Collection context for AI
        system_prompt = """You are a helpful assistant for Kenrish Collection, a beauty salon and products store in Shabaab, Nakuru, Kenya. 

BUSINESS INFO:
- Location: Shabaab, Nakuru, Kenya
- Phone: 0708440390
- Hours: Monday-Saturday 8AM-8PM, Closed Sundays

PRODUCTS & PRICES:
- Cocoa Butter Cream: KSh 1,200 (for dry skin, moisturizing)
- Shea Butter: KSh 900 (sensitive skin, unrefined)
- Foundation: KSh 1,800 (8 shades, all-day coverage)
- Lipstick: KSh 800 (matte/glossy, red/pink/nude/brown)
- Mascara: KSh 1,000 (waterproof, volume & length)
- Hair Care Set: KSh 1,200 (shampoo & conditioner)
- Body Lotions: KSh 600-1,500

SERVICES & PRICES:
- Hair cutting: KSh 800
- Hair styling: KSh 600
- Manicure: KSh 500
- Nail stickons: KSh 300 (last 2-3 weeks)

HANDBAGS:
- Leather handbags: KSh 2,500-6,000
- Colors: Black, Brown, Tan
- Styles: Small purse, Large tote, Professional bags

Always be helpful, friendly, and provide specific pricing. Use emojis appropriately. Keep responses concise but informative."""

        # API request to OpenRouter
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "microsoft/wizardlm-2-8x22b",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                "max_tokens": 300,
                "temperature": 0.7
            }
        )
        
        if response.status_code == 200:
            ai_response = response.json()
            bot_message = ai_response['choices'][0]['message']['content']
            return JsonResponse({'response': bot_message})
        else:
            # Fallback response if API fails
            return JsonResponse({'response': "I'm having trouble connecting right now. Please call us at 0708440390 for immediate assistance!"})
            
    except Exception as e:
        return JsonResponse({'response': "Sorry, I'm having technical difficulties. Please call 0708440390 for help!"})
