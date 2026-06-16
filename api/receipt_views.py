import base64
import json
import os
import requests
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from app1.models import Product, Handbag, Clothes, InventoryTransaction

RECEIPT_PROMPT = (
    "Extract all line items from this supplier receipt image. "
    "Return ONLY a JSON object with this exact structure:\n"
    '{"items": [{"name": "...", "quantity": 1, "unit_cost": 0.00}]}\n'
    "Rules:\n"
    "- name: product/item name as written on the receipt\n"
    "- quantity: number of units purchased (integer, default 1 if not stated)\n"
    "- unit_cost: price per single unit as a plain number (no currency symbols)\n"
    "- If the receipt shows a line total for multiple units, divide to get unit_cost\n"
    "- Skip header lines, store name, tax lines, subtotals, grand totals\n"
    "- Assume KES (Kenyan Shillings) if currency is ambiguous\n"
    "- Return ONLY the JSON object, no markdown fences, no explanation"
)

_DEFAULT_MODEL = 'openai/gpt-4o-mini'
_MODEL_MAP = {'product': Product, 'handbag': Handbag, 'clothes': Clothes}


def _call_vision_api(image_data: bytes, mime_type: str) -> list:
    api_key = os.getenv('OPENROUTER_API_KEY') or getattr(settings, 'OPENROUTER_API_KEY', None)
    if not api_key:
        raise RuntimeError('OPENROUTER_API_KEY is not configured')

    b64 = base64.b64encode(image_data).decode('utf-8')
    model = getattr(settings, 'RECEIPT_SCAN_MODEL', _DEFAULT_MODEL)

    resp = requests.post(
        'https://openrouter.ai/api/v1/chat/completions',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        json={
            'model': model,
            'messages': [{
                'role': 'user',
                'content': [
                    {
                        'type': 'image_url',
                        'image_url': {'url': f'data:{mime_type};base64,{b64}'},
                    },
                    {'type': 'text', 'text': RECEIPT_PROMPT},
                ],
            }],
        },
        timeout=45,
    )
    try:
        resp.raise_for_status()
    except requests.HTTPError as exc:
        body = exc.response.text[:500] if exc.response is not None else ''
        raise requests.RequestException(f"{exc} — {body}") from exc

    content = resp.json()['choices'][0]['message']['content'].strip()
    if content.startswith('```'):
        content = '\n'.join(content.split('\n')[1:])
        content = content.rsplit('```', 1)[0].strip()

    data = json.loads(content)
    items = []
    for it in data.get('items', []):
        name = str(it.get('name', '')).strip()
        if not name:
            continue
        try:
            qty = max(1, int(it.get('quantity', 1)))
        except (TypeError, ValueError):
            qty = 1
        try:
            unit_cost = float(it.get('unit_cost', 0))
        except (TypeError, ValueError):
            unit_cost = 0.0
        items.append({'name': name, 'quantity': qty, 'unit_cost': unit_cost})
    return items


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def receipt_parse(request):
    if not request.user.is_staff:
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    image = request.FILES.get('image')
    if not image:
        return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)

    mime_type = getattr(image, 'content_type', None) or 'image/jpeg'
    image_data = image.read()

    try:
        items = _call_vision_api(image_data, mime_type)
    except requests.RequestException as exc:
        return Response({'error': f'AI service unavailable: {exc}'}, status=status.HTTP_502_BAD_GATEWAY)
    except (json.JSONDecodeError, KeyError) as exc:
        return Response({'error': f'Could not parse receipt response: {exc}'}, status=status.HTTP_502_BAD_GATEWAY)
    except RuntimeError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({'items': items})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def receipt_confirm(request):
    if not request.user.is_staff:
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    items = request.data.get('items', [])
    if not items:
        return Response({'error': 'No items provided'}, status=status.HTTP_400_BAD_REQUEST)

    added = 0
    created = 0
    drafts = []
    errors = []

    for item in items:
        try:
            action = item.get('action', 'link')
            item_type = item.get('item_type', 'product')
            quantity = int(item.get('quantity', 1))
            unit_cost = float(item.get('unit_cost', 0))
            price = float(item.get('price', 0))

            if quantity <= 0:
                continue

            ModelClass = _MODEL_MAP.get(item_type)
            if ModelClass is None:
                errors.append({'name': item.get('name'), 'error': f'Unknown item_type: {item_type}'})
                continue

            if action == 'link':
                product_id = item.get('product_id')
                if not product_id:
                    continue
                obj = ModelClass.objects.get(pk=int(product_id))
                obj.cost_price = unit_cost
                if price > 0:
                    obj.price = price
                obj.save()
                added += 1

            elif action == 'create':
                name = str(item.get('name', '')).strip()
                if not name:
                    continue
                obj = ModelClass.objects.create(
                    name=name,
                    description='',
                    price=price if price > 0 else unit_cost,
                    cost_price=unit_cost,
                    stock_quantity=0,
                    is_published=False,
                )
                created += 1
                drafts.append({'id': obj.id, 'item_type': item_type, 'name': obj.name})
            else:
                continue

            InventoryTransaction.objects.create(
                **{item_type: obj},
                transaction_type='IN',
                quantity=quantity,
                unit_cost=unit_cost,
                notes='Receipt scan',
                created_by=request.user,
            )

        except Exception as exc:
            errors.append({'name': item.get('name'), 'error': str(exc)})

    return Response({'added': added, 'created': created, 'drafts': drafts, 'errors': errors})
