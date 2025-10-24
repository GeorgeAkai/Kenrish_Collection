from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from django.contrib.auth.decorators import login_required, user_passes_test
from django.utils.decorators import method_decorator
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from django.http import JsonResponse, HttpResponseForbidden
from django.views import View
from .models import Product, Rating, Wishlist, Handbag, HandbagRating, Service, GalleryImage, Offer
from .forms import ProductForm, RatingForm, HandbagForm, GalleryImageForm, OfferForm, SignUpForm, CustomPasswordChangeForm, CustomPasswordResetForm, CustomSetPasswordForm
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UserProfile
from django.contrib.auth.signals import user_logged_in
from django.contrib.admin.views.decorators import staff_member_required

def is_admin(user):
    return user.is_staff

def about(request):
    return render(request, "about.html")


@login_required
@user_passes_test(is_admin)
def admin_product_view(request):
    """ Admin-only product management page """
    products = Product.objects.all()
    return render(request, "admin_product.html", {"products": products})

@login_required
@user_passes_test(is_admin)
def add_product(request):
    """ Admin can add a product """
    if request.method == "POST":
        form = ProductForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            return redirect("admin-product")
    else:
        form = ProductForm()
    return render(request, "add_product.html", {"form": form})

@login_required
@user_passes_test(is_admin)
def edit_product(request, product_id):
    """ Admin can edit a product """
    product = get_object_or_404(Product, id=product_id)
    if request.method == "POST":
        form = ProductForm(request.POST, request.FILES, instance=product)
        if form.is_valid():
            form.save()
            return redirect("admin-product")
    else:
        form = ProductForm(instance=product)
    return render(request, "edit_product.html", {"form": form, "product": product})

@login_required
@user_passes_test(is_admin)
def delete_product(request, product_id):
    """ Admin can delete a product """
    product = get_object_or_404(Product, id=product_id)
    product.delete()
    return redirect("admin-product")

def home(request):
    """Render the home page"""
    products = Product.objects.all()
    return render(request, "home_modern.html", {"products": products})

def product_detail(request, product_id):
    product = get_object_or_404(Product, id=product_id)
    user_rating = None
    if request.user.is_authenticated:
        user_rating = Rating.objects.filter(product=product, user=request.user).first()

    if request.method == 'POST':
        if not request.user.is_authenticated:
            return redirect('login') # Or wherever your login URL is named
        form = RatingForm(request.POST)
        if form.is_valid():
            rating_value = form.cleaned_data['rating']
            obj, created = Rating.objects.update_or_create(
                product=product,
                user=request.user,
                defaults={'rating': rating_value}
            )
            return redirect('product-detail', product_id=product.id) # Assuming URL name
    else:
        form = RatingForm()

    context = {
        'product': product,
        'form': form,
        'user_rating': user_rating,
        # 'average_rating' is accessed via product.average_rating in template
    }
    return render(request, 'app1/product_detail.html', context) # Assuming template path

class ProductView(View):
    def get(self, request, product_id=None):
        """Retrieve a single product or all products"""
        if product_id:
            product = get_object_or_404(Product, id=product_id)
            data = {
                "id": product.id,
                "name": product.name,
                "description": product.description,
                "price": str(product.price),  # Ensure decimal compatibility
                "image": product.image,
                "created": product.created.strftime("%Y-%m-%d %H:%M:%S"),
            }
        else:
            products = Product.objects.all().values("id", "name", "description", "price", "image", "created")
            data = list(products)
        return JsonResponse(data, safe=False)

    def post(self, request):
        """Create a new product"""
        try:
            data = request.POST
            product = Product.objects.create(
                name=data.get("name"),
                description=data.get("description"),
                price=data.get("price"),
                image=data.get("image")
            )
            return JsonResponse({"message": "Product created successfully", "id": product.id}, status=201)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
from django.shortcuts import render

# Join 
class RegisterView(View):
    def get(self, request):
        form = SignUpForm()
        return render(request, "signup.html", {"form": form})

    def post(self, request):
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()                      # creates user + hashes password
            UserProfile.objects.get_or_create(user=user)

            # authenticate to attach a backend
            raw_password = form.cleaned_data["password1"]

            # If your backend uses username:
            auth_user = authenticate(request, username=user.username, password=raw_password)

            # If you log in by email instead, use:
            # auth_user = authenticate(request, email=user.email, password=raw_password)

            if auth_user is not None:
                login(request, auth_user)
                messages.success(request, "Welcome! Your account has been created.")
                return redirect("home")
            else:
                # Fallback: don’t auto-login; send them to the login page instead
                messages.success(request, "Account created. Please sign in.")
                return redirect("login")

        # Invalid form: re-render with errors
        return render(request, "signup.html", {"form": form})

# login view
class LoginView(View):
    def get(self, request):
        """Render login page"""
        return render(request, "login.html")

    def post(self, request):
        """User login"""
        data = request.POST
        user = authenticate(username=data.get("username"), password=data.get("password"))
        if user:
            login(request, user)
            return redirect("home")  # Redirect to home.html after login
        return JsonResponse({"error": "Invalid credentials"}, status=401)

# logout view
class LogoutView(View):
    def get(self, request):
        """User logout via GET"""
        logout(request)
        return render(request, "login.html")  # Redirect to login page after logout

    def post(self, request):
        """User logout via POST"""
        logout(request)
        return render(request, "login.html")  # Redirect to login page after logout

# Password change view
@method_decorator(login_required, name='dispatch')
class PasswordChangeView(View):
    def get(self, request):
        """Display password change form"""
        form = CustomPasswordChangeForm(request.user)
        return render(request, "password_change.html", {
            "form": form,
            "user": request.user
        })

    def post(self, request):
        """Handle password change form submission"""
        form = CustomPasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Your password has been changed successfully!")
            return redirect("home")  # Redirect to home instead of login
        return render(request, "password_change.html", {
            "form": form,
            "user": request.user
        })

# Password reset views
class PasswordResetView(View):
    def get(self, request):
        """Display password reset form"""
        form = CustomPasswordResetForm()
        return render(request, "password_reset.html", {"form": form})

    def post(self, request):
        """Handle password reset form submission"""
        form = CustomPasswordResetForm(request.POST)
        if form.is_valid():
            form.save(
                request=request,
                use_https=request.is_secure(),
                from_email=None,
                email_template_name='password_reset_email.html',
                subject_template_name='password_reset_subject.txt',
            )
            messages.success(request, "Password reset email sent! Check your inbox.")
            return redirect("password_reset_done")
        return render(request, "password_reset.html", {"form": form})

class PasswordResetDoneView(View):
    def get(self, request):
        """Display password reset done page"""
        return render(request, "password_reset_done.html")

class PasswordResetConfirmView(View):
    def get(self, request, uidb64, token):
        """Display password reset confirm form"""
        form = CustomSetPasswordForm()
        return render(request, "password_reset_confirm.html", {"form": form, "uidb64": uidb64, "token": token})

    def post(self, request, uidb64, token):
        """Handle password reset confirm form submission"""
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_decode
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, token):
            form = CustomSetPasswordForm(user, request.POST)
            if form.is_valid():
                form.save()
                messages.success(request, "Your password has been reset successfully!")
                return redirect("login")
        else:
            messages.error(request, "Invalid or expired reset link.")
            return redirect("password_reset")
        
        return render(request, "password_reset_confirm.html", {"form": form, "uidb64": uidb64, "token": token})

@method_decorator(login_required, name='dispatch')
class ProductDetailView(View):
    def get(self, request, product_id):
        """Display product details and user's rating"""
        product = get_object_or_404(Product, id=product_id)
        user_rating = Rating.objects.filter(product=product, user=request.user).first()
        form = RatingForm(initial={'rating': user_rating.value if user_rating else None})
        wishlisted = product.wishlisted_by.filter(id=request.user.id).exists() if request.user.is_authenticated else False # Check if product is wishlisted
        return render(request, "product_detail.html", {
            "product": product,
            "form": form,
            "user_rating": user_rating,
            "average_rating": product.average_rating,  # Show stored rating
            "rating_range": range(1, 6), #rate from 1 to 5
            "wishlisted": wishlisted, # adding wishlisted status to the product  
        })

    def post(self, request, product_id):
        """Handle rating submission and update product's average rating"""
        product = get_object_or_404(Product, id=product_id)
        form = RatingForm(request.POST)
        if form.is_valid():
            rating_value = int(form.cleaned_data['value'])
            Rating.objects.update_or_create(
                product=product, user=request.user,
                defaults={'value': rating_value}
            )
            product.update_average_rating()  # Update stored rating
        return redirect("product-detail", product_id=product.id)

@staff_member_required
def user_login_list(request):
    users = User.objects.select_related('userprofile').order_by('-userprofile__login_count')
    return render(request, 'user_login_list.html', {'users': users})

from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from .models import Wishlist

@login_required
def wishlist_checkout(request):
    wishlist, created = Wishlist.objects.get_or_create(user=request.user)
    products = wishlist.products.all()
    handbags = wishlist.handbags.all()
    total = sum(p.price for p in products) + sum(h.price for h in handbags)
    return render(request, "wishlist_checkout.html", {
        "products": products,
        "handbags": handbags,
        "total": total
    })

@login_required
def add_to_wishlist(request, product_id):
    product = get_object_or_404(Product, id=product_id)
    wishlist, created = Wishlist.objects.get_or_create(user=request.user)
    wishlist.products.add(product)
    return redirect('user-wishlist')

@login_required
def remove_from_wishlist(request, product_id):
    product = get_object_or_404(Product, id=product_id)
    wishlist = get_object_or_404(Wishlist, user=request.user)
    if request.method == "POST":
        wishlist.products.remove(product)
        wishlist.save()
    return redirect('user-wishlist')

@login_required
def user_wishlist(request):
    wishlist, created = Wishlist.objects.get_or_create(user=request.user)
    return render(request, "wishlist.html", {"wishlist": wishlist})

@staff_member_required
def admin_user_wishlist(request, user_id):
    user = get_object_or_404(User, id=user_id)
    wishlist, created = Wishlist.objects.prefetch_related('products', 'handbags').get_or_create(user=user)
    wishlist_products = wishlist.products.all()
    wishlist_handbags = wishlist.handbags.all()
    return render(request, 'admin_user_wishlist.html', {'wishlist_user': user, 'wishlist_products': wishlist_products, 'wishlist_handbags': wishlist_handbags})

def handbags_list(request):
    handbags = Handbag.objects.all()
    return render(request, "handbags.html", {"handbags": handbags})

def handbag_detail(request, handbag_id):
    handbag = get_object_or_404(Handbag, id=handbag_id)
    user_rating = None
    if request.user.is_authenticated:
        user_rating = HandbagRating.objects.filter(handbag=handbag, user=request.user).first()
    if request.method == "POST" and request.user.is_authenticated:
        rating = int(request.POST.get("rating", 0))
        obj, created = HandbagRating.objects.update_or_create(
            handbag=handbag, user=request.user, defaults={"rating": rating}
        )
        handbag.update_average_rating()
        return redirect("handbag-detail", handbag_id=handbag.id)
    return render(request, "handbag_detail.html", {
        "handbag": handbag,
        "user_rating": user_rating,
    })

@method_decorator(user_passes_test(lambda u: u.is_staff), name='dispatch')
class AddHandbagView(View):
    def get(self, request):
        form = HandbagForm()
        return render(request, "add_handbag.html", {"form": form})

    def post(self, request):
        form = HandbagForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            return redirect("handbags")
        return render(request, "add_handbag.html", {"form": form})

@method_decorator(user_passes_test(lambda u: u.is_staff), name='dispatch')
class EditHandbagView(View):
    def get(self, request, handbag_id):
        handbag = get_object_or_404(Handbag, id=handbag_id)
        form = HandbagForm(instance=handbag)
        return render(request, "edit_handbag.html", {"form": form, "handbag": handbag})

    def post(self, request, handbag_id):
        handbag = get_object_or_404(Handbag, id=handbag_id)
        form = HandbagForm(request.POST, request.FILES, instance=handbag)
        if form.is_valid():
            form.save()
            return redirect("handbags")
        return render(request, "edit_handbag.html", {"form": form, "handbag": handbag})

@method_decorator(user_passes_test(lambda u: u.is_staff), name='dispatch')
class DeleteHandbagView(View):
    def post(self, request, handbag_id):
        handbag = get_object_or_404(Handbag, id=handbag_id)
        handbag.delete()
        return redirect("handbags")

from .models import Handbag

@login_required
def add_handbag_to_wishlist(request, handbag_id):
    handbag = get_object_or_404(Handbag, id=handbag_id)
    wishlist, created = Wishlist.objects.get_or_create(user=request.user)
    wishlist.handbags.add(handbag)
    return redirect('user-wishlist')

@login_required
def remove_handbag_from_wishlist(request, handbag_id):
    wishlist, created = Wishlist.objects.get_or_create(user=request.user)
    handbag = get_object_or_404(Handbag, id=handbag_id)
    wishlist.handbags.remove(handbag)
    return redirect('user-wishlist')

@user_passes_test(lambda u: u.is_staff)
def admin_handbag_view(request):
    handbags = Handbag.objects.all()
    return render(request, "admin_handbag.html", {"handbags": handbags})

@login_required
def wishlist_checkout(request):
    wishlist, created = Wishlist.objects.get_or_create(user=request.user)
    product_items = wishlist.products.all()
    handbag_items = wishlist.handbags.all()
    total = sum(p.price for p in product_items) + sum(h.price for h in handbag_items)
    return render(request, "wishlist_checkout.html", {
        "products": product_items,
        "handbags": handbag_items,
        "total": total
    })


# @login_required
def services(request):
    """Display available services"""
    services = Service.objects.all()
    return render(request, "services.html", {"services": services})

def gallery(request):
    # Get images grouped by service
    services = [
        ('hairdressing', 'Hairdressing'),
        ('barber', 'Barber'),
        ('nails', 'Nails'),
        ('manicure', 'Manicure'),
        ('pedicure', 'Pedicure'),
    ]
    gallery_sections = []
    for key, label in services:
        images = GalleryImage.objects.filter(service=key).order_by('-uploaded_at')
        gallery_sections.append({
            'service_key': key,
            'service_label': label,
            'images': images,
        })
    return render(request, "gallery.html", {"gallery_sections": gallery_sections})

@staff_member_required
def add_gallery_image(request):
    if request.method == "POST":
        form = GalleryImageForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            return redirect('gallery')
    else:
        form = GalleryImageForm()
    return render(request, "add_gallery_image.html", {"form": form, "action": "Add"})

@staff_member_required
def edit_gallery_image(request, image_id):
    image = get_object_or_404(GalleryImage, id=image_id)
    if request.method == "POST":
        form = GalleryImageForm(request.POST, request.FILES, instance=image)
        if form.is_valid():
            form.save()
            return redirect('gallery')
    else:
        form = GalleryImageForm(instance=image)
    return render(request, "edit_gallery_image.html", {"form": form, "action": "Edit"})

@staff_member_required
def delete_gallery_image(request, image_id):
    image = get_object_or_404(GalleryImage, id=image_id)
    if request.method == "POST":
        image.delete()
        return redirect('gallery')
    return render(request, "delete_gallery_image.html", {"image": image})

def offers(request):
    offers = Offer.objects.all().order_by('-created_at')
    return render(request, "offers.html", {"offers": offers})

@staff_member_required
def add_offer(request):
    if request.method == "POST":
        form = OfferForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            return redirect('offers')
    else:
        form = OfferForm()
    return render(request, "add_offer.html", {"form": form, "action": "Add"})

@staff_member_required
def delete_offer(request, offer_id):
    offer = get_object_or_404(Offer, id=offer_id)
    if request.method == "POST":
        offer.delete()
        return redirect('offers')
    return render(request, "delete_offer.html", {"offer": offer})

from django.contrib.auth.decorators import user_passes_test
from django.contrib.auth.models import User
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages

@user_passes_test(lambda u: u.is_superuser or u.is_staff)
def promote_to_admin(request):
    admins = User.objects.filter(is_staff=True)
    users = User.objects.filter(is_staff=False)
    if request.method == "POST":
        user_id = request.POST.get("user_id")
        user = get_object_or_404(User, id=user_id)
        if admins.count() >= 3:
            messages.error(request, "There can only be 3 admins.")
        else:
            user.is_staff = True
            user.save()
            profile, created = UserProfile.objects.get_or_create(user=user)
            profile.added_by = request.user
            profile.save()
            messages.success(request, f"{user.username} is now an admin.")
        return redirect("promote-to-admin")
    return render(request, "promote_to_admin.html", {"admins": admins, "users": users})

@user_passes_test(lambda u: u.is_superuser or u.is_staff)
def remove_admin(request, user_id):
    user = get_object_or_404(User, id=user_id, is_staff=True)
    profile = getattr(user, 'userprofile', None)
    # Only allow if current user is superuser or the one who added this admin
    if request.user.is_superuser or (profile and profile.added_by == request.user):
        if request.method == "POST":
            user.is_staff = False
            user.save()
            if profile:
                profile.added_by = None
                profile.save()
            messages.success(request, f"{user.username} is no longer an admin.")
            return redirect("promote-to-admin")
        return render(request, "remove_admin_confirm.html", {"admin_user": user})
    else:
        messages.error(request, "You do not have permission to remove this admin.")
        return redirect("promote-to-admin")

from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import render, redirect, get_object_or_404
from .models import Service
from .forms import ServiceForm

@staff_member_required
def add_service(request):
    if request.method == 'POST':
        form = ServiceForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            return redirect('services')
    else:
        form = ServiceForm()
    return render(request, 'add_service.html', {'form': form})

@staff_member_required
def edit_service(request, service_id):
    service = get_object_or_404(Service, id=service_id)
    if request.method == 'POST':
        form = ServiceForm(request.POST, request.FILES, instance=service)
        if form.is_valid():
            form.save()
            return redirect('services')
    else:
        form = ServiceForm(instance=service)
    return render(request, 'edit_service.html', {'form': form, 'service': service})

def custom_404(request, exception):
    return render(request, '404.html', status=404)

def custom_500(request):
    return render(request, '500.html', status=500)
def privacy_policy(request):
    return render(request, 'privacy_policy.html')

def terms_of_service(request):
    return render(request, 'terms_of_service.html')
@login_required
def toggle_gallery_like(request, image_id):
    """Toggle like for gallery image or get like status"""
    from .models import GalleryLike
    image = get_object_or_404(GalleryImage, id=image_id)
    
    if request.method == 'GET':
        # Return current like status
        liked = image.is_liked_by(request.user)
        return JsonResponse({
            'liked': liked,
            'like_count': image.like_count
        })
    
    elif request.method == 'POST':
        # Toggle like
        like, created = GalleryLike.objects.get_or_create(user=request.user, gallery_image=image)
        
        if not created:
            like.delete()
            liked = False
        else:
            liked = True
        
        return JsonResponse({
            'liked': liked,
            'like_count': image.like_count
        })
from .ai_chatbot import ai_chatbot_response
