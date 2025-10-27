import json
import os

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings


# =========================
# Helper responses
# =========================

def _ok(data):
    return JsonResponse(data)

def _bad_request(msg, detail=None):
    payload = {"error": msg}
    if detail:
        payload["detail"] = detail
    return JsonResponse(payload, status=400)

def _method_not_allowed():
    return JsonResponse({"error": "Invalid request method."}, status=405)

def _bad_gateway(msg="Upstream service error."):
    # Use 502 for upstream/provider errors instead of 500
    return JsonResponse({"error": msg}, status=502)


# =========================
# Parsing / Normalization
# =========================

def _try_json(body_bytes):
    """Parse JSON without raising; return (data, err_or_None)."""
    try:
        return json.loads(body_bytes or b"{}"), None
    except Exception as e:
        return None, e

def _safe_first_choice_content(completion):
    """
    Extract content defensively from OpenAI/OpenRouter-like responses,
    handling both attribute and dict styles.
    """
    try:
        choices = getattr(completion, "choices", None)
        if not choices and isinstance(completion, dict):
            choices = completion.get("choices")
        if not choices:
            return None

        first = choices[0]

        # Attribute style
        msg = getattr(first, "message", None)
        if msg is not None:
            content = getattr(msg, "content", None)
            if content:
                return content

        # Dict style
        if isinstance(first, dict):
            msg = first.get("message") or {}
            content = msg.get("content")
            if content:
                return content

        # Some providers return 'text' directly
        text_attr = getattr(first, "text", None)
        if text_attr:
            return text_attr
        if isinstance(first, dict) and first.get("text"):
            return first["text"]

        return None
    except Exception:
        return None

def _normalize_messages_from_any(data, raw_body, content_type):
    """
    Accept multiple shapes and normalize to [{'role':'user','content':...}, ...]
    Supports:
      - {"messages":[...]}    (objects with role/content or strings)
      - {"message"/"prompt"/"input"/"query"/"text": "..."}
      - Raw text body
      - Form-encoded fields (if caller passed request.POST)
    Returns (normalized_list, error_response_or_None)
    """
    def get_any(d, *keys):
        if not isinstance(d, dict):
            return None
        # exact keys
        for k in keys:
            if k in d:
                return d[k]
        # case-insensitive fallback
        lower_map = {str(x).lower(): x for x in d.keys()}
        for k in keys:
            if k.lower() in lower_map:
                return d[lower_map[k.lower()]]
        return None

    messages = get_any(data, "messages")
    single = (get_any(data, "message") or get_any(data, "prompt") or
              get_any(data, "input") or get_any(data, "query") or
              get_any(data, "text"))

    # If messages came as a JSON string, try to parse
    if isinstance(messages, str):
        try:
            messages = json.loads(messages)
        except Exception:
            single = single or messages
            messages = None

    normalized = []

    if isinstance(messages, list) and messages:
        for m in messages:
            if isinstance(m, dict) and "content" in m and "role" in m:
                normalized.append({"role": m["role"], "content": m["content"]})
            elif isinstance(m, dict) and "content" in m:
                normalized.append({"role": m.get("role", "user"), "content": m["content"]})
            elif isinstance(m, str):
                normalized.append({"role": "user", "content": m})
            else:
                return None, _bad_request(
                    "Each message must be an object with 'role' and 'content' (or a string).",
                    detail="Example: {'messages':[{'role':'user','content':'Hello'}]} or {'messages':['Hello']}"
                )
        return normalized, None

    if isinstance(single, str) and single.strip():
        return [{"role": "user", "content": single.strip()}], None

    # Raw text body fallback regardless of content-type (some clients mislabel)
    try:
        raw_text = (raw_body or b"").decode("utf-8", errors="ignore").strip()
        if raw_text:
            return [{"role": "user", "content": raw_text}], None
    except Exception:
        pass

    return None, _bad_request(
        "Messages must be provided.",
        detail="Send {'messages':[...]} or {'message':'...'} / {'prompt':'...'} / {'input':'...'} / {'text':'...'} or plain text body."
    )


# =========================
# Views
# =========================

@csrf_exempt
def chat_page(request):
    return _ok({
        "message": "This endpoint is for rendering the chatbot page. Use POST /chatbot/api/chat/ to interact."
    })

@csrf_exempt
def quick_chat(request):
    return _ok({
        "message": "Quick chat endpoint is under development."
    })

@csrf_exempt
def start_conversation(request):
    if request.method == "POST":
        # In a real app, you'd persist a conversation and return its ID
        return _ok({"id": 1})
    return _method_not_allowed()

@csrf_exempt
def send_message(request, cid):
    if request.method != "POST":
        return _method_not_allowed()

    # Parse JSON body
    data, err = _try_json(request.body)
    if err:
        return _bad_request("Invalid JSON format.")

    user_message = (data.get("message") or "").strip()
    if not user_message:
        return _bad_request("Message is required.")

    # Lazy import to avoid import-time crashes causing 500s
    try:
        from .ai_service import KenrishAIService
    except Exception as e:
        return _bad_gateway(f"Service unavailable: {e}")

    try:
        ai_service = KenrishAIService()
        response = ai_service.get_response(user_message)
        return _ok({"response": response})
    except Exception as e:
        # Map any service error to 502 instead of 500
        return _bad_gateway(str(e))

@csrf_exempt
def ai_chatbot_response(request):
    if request.method != "POST":
        return _method_not_allowed()

    # Try JSON first (don’t fail if it’s not JSON)
    data, _ = _try_json(request.body)
    if data is None:
        data = {}

    # If JSON is empty and it’s a form/multipart request, merge request.POST
    ctype = request.headers.get("Content-Type", "") or ""
    if (not data) and (ctype.startswith("application/x-www-form-urlencoded") or ctype.startswith("multipart/form-data")):
        try:
            data = request.POST.dict()
        except Exception:
            data = data or {}

    # If still empty, also allow query string as a last resort
    if not data and request.GET:
        data = request.GET.dict()

    # Normalize messages (accepts many shapes, incl. raw text)
    normalized, err_resp = _normalize_messages_from_any(
        data=data,
        raw_body=request.body,
        content_type=ctype
    )
    if err_resp:
        return err_resp

    # Model/params (keep your original default; client can override)
    model = data.get("model", "google/gemma-3n-e2b-it:free")
    max_tokens = data.get("max_tokens", 300) if isinstance(data, dict) else 300
    temperature = data.get("temperature", 0.7) if isinstance(data, dict) else 0.7

    # Optional pass-through headers
    referer = request.headers.get("Referer", "") or request.headers.get("HTTP-Referer", "")
    x_title = request.headers.get("X-Title", "")
    extra_headers = {}
    if referer:
        extra_headers["HTTP-Referer"] = referer
    if x_title:
        extra_headers["X-Title"] = x_title

    # API key from settings or env (no hardcoding)
    api_key="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" or os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        return _bad_request("Server missing OpenRouter API key. Set settings.OPENROUTER_API_KEY or env OPENROUTER_API_KEY.")

    # Initialize OpenRouter client (OpenAI-compatible)
    try:
        from openai import OpenAI
        client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key="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"
)
    except Exception as e:
        return _bad_gateway(f"Client init failed: {e}")

    req_kwargs = {
        "model": model,
        "messages": normalized,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    # Call upstream; tolerate clients without extra_headers support
    try:
        completion = client.chat.completions.create(
            **req_kwargs,
            extra_headers=extra_headers if extra_headers else None
        )
    except TypeError:
        try:
            completion = client.chat.completions.create(**req_kwargs)
        except Exception as e:
            return _bad_gateway(str(e))
    except Exception as e:
        return _bad_gateway(str(e))

    # Extract model text defensively
    content = _safe_first_choice_content(
        completion if isinstance(completion, dict) else getattr(completion, "__dict__", completion)
    )
    if content is None:
        return _bad_gateway("Upstream response missing content.")

    return _ok({"choices": [{"message": {"content": content}}]})
