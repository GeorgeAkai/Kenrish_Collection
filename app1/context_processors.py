from .models import Offer

def offers_exist(request):
    return {'offers_exist': Offer.objects.exists()}