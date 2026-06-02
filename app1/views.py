# =========================
# Django Views (Kenrish)
# Notes:
# - Behavior intentionally unchanged. Only comments were added.
# - Duplicated imports and duplicate view names are left intact (called out below).
# - Security decorators (login_required, user_passes_test, staff_member_required) remain as-is.
# - Consider consolidating duplicate views and imports in a future cleanup pass.
# =========================

from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from django.contrib.auth.decorators import login_required, user_passes_test
from django.utils.decorators import method_decorator
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from django.http import JsonResponse, HttpResponseForbidden
from django.views import View
from .models import Product, Rating, Wishlist, Handbag, HandbagRating, Service, GalleryImage, Offer, Clothes
from .forms import ProductForm, RatingForm, HandbagForm, GalleryImageForm, OfferForm, SignUpForm, CustomPasswordChangeForm, CustomPasswordResetForm, CustomSetPasswordForm, ClothesForm
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User  # NOTE: Duplicate import; harmless but redundant.
from .models import UserProfile
from django.contrib.auth.signals import user_logged_in
from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Q

def is_admin(user):
    """Helper for user_passes_test: returns True if user is staff (admin)."""
    return user.is_staff


@login_required
@user_passes_test(is_admin)
def admin_view_all_wishlists(request):
    """Admin view to see all user wishlists"""
    # Use select_related/prefetch_related to minimize queries when rendering user and related items.
    wishlists = Wishlist.objects.select_related('user').prefetch_related('products', 'handbags').all()
    
    # Calculate totals for the badges. Casting to list to avoid evaluating queryset multiple times.
    total_users = wishlists.count()
    total_items = sum(
        len(list(w.products.all())) + len(list(w.handbags.all()))
        for w in wishlists
    )
    
    context = {
        'wishlists': wishlists,
        'total_users': total_users,
        'total_items': total_items,
    }
    
    return render(request, "admin_user_wishlist.html", context)


@login_required
@user_passes_test(is_admin)
def admin_user_wishlist(request, user_id):
    """
    Admin view to see a specific user's wishlist
    NOTE: There is another function named `admin_user_wishlist` further below with a different signature/template.
    Keeping both for parity with existing behavior; consider consolidating to avoid confusion.
    """
    user = get_object_or_404(User, id=user_id)
    wishlist = get_object_or_404(Wishlist, user=user)
    
    context = {
        'wishlist': wishlist,
        'viewed_user': user
    }
    
    return render(request, "admin_single_user_wishlist.html", context)


def about(request):
    """Public 'About' page."""
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
    """Render the home page with a list of products. Template uses 'home_modern.html'."""
    products = Product.objects.all()
    return render(request, "home_modern.html", {"products": products})


def product_detail(request, product_id):
    """
    Public product detail with optional rating submission.
    NOTE:
    - For unauthenticated POST, we redirect to 'login'.
    - Rating model here uses field 'rating'; in ProductDetailView below, the Rating form uses 'value'.
      Keeping as-is to preserve behavior; consider normalizing field names later.
    """
    product = get_object_or_404(Product, id=product_id)
    user_rating = None
    if request.user.is_authenticated:
        user_rating = Rating.objects.filter(product=product, user=request.user).first()

    if request.method == 'POST':
        if not request.user.is_authenticated:
            return redirect('login')  # Ensure only authenticated users can rate.
        form = RatingForm(request.POST)
        if form.is_valid():
            rating_value = form.cleaned_data['rating']
            obj, created = Rating.objects.update_or_create(
                product=product,
                user=request.user,
                defaults={'rating': rating_value}
            )
            return redirect('product-detail', product_id=product.id)
    else:
        form = RatingForm()

    context = {
        'product': product,
        'form': form,
        'user_rating': user_rating,
        # 'average_rating' is accessed via product.average_rating in template
    }
    return render(request, 'app1/product_detail.html', context)  # Template path per comment

# clothes views
@login_required
def clothes_list(request):
    """Display all clothes."""
    clothes = Clothes.objects.all().order_by('-created_at')
    return render(request, 'clothes/clothes_list.html', {'clothes': clothes})


@login_required
def clothes_detail(request, pk):
    """Show details of a specific clothing item."""
    item = get_object_or_404(Clothes, pk=pk)
    return render(request, 'clothes/clothes_detail.html', {'item': item})


@login_required
@user_passes_test(is_admin)
def add_clothes(request):
    """Add a new clothing item."""
    if request.method == 'POST':
        form = ClothesForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            messages.success(request, "Clothing item added successfully!")
            return redirect('clothes-list')
    else:
        form = ClothesForm()
    return render(request, 'clothes/clothes_form.html', {'form': form, 'title': 'Add Clothes'})


@login_required
@user_passes_test(is_admin)
def edit_clothes(request, pk):
    """Edit an existing clothing item."""
    item = get_object_or_404(Clothes, pk=pk)
    if request.method == 'POST':
        form = ClothesForm(request.POST, request.FILES, instance=item)
        if form.is_valid():
            form.save()
            messages.success(request, "Clothing item updated successfully!")
            return redirect('clothes-list')
    else:
        form = ClothesForm(instance=item)
    return render(request, 'clothes/clothes_form.html', {'form': form, 'title': 'Edit Clothes'})


@login_required
@user_passes_test(is_admin)
def delete_clothes(request, pk):
    """Delete a clothing item."""
    item = get_object_or_404(Clothes, pk=pk)
    if request.method == 'POST':
        item.delete()
        messages.success(request, "Clothing item deleted successfully!")
        return redirect('clothes-list')
    return render(request, 'clothes/clothes_confirm_delete.html', {'item': item})


@login_required
@user_passes_test(is_admin)
def admin_clothes(request):
    """
    Admin-only page for managing clothes inventory.
    Shows all clothes with search functionality.
    """
    query = request.GET.get("q", "")
    clothes = Clothes.objects.all().order_by("-created_at")

    if query:
        clothes = clothes.filter(
            Q(name__icontains=query) | Q(description__icontains=query)
        )

    context = {
        "clothes": clothes,
        "query": query,
    }
    return render(request, "clothes/admin_clothes.html", context)

class ProductView(View):
    """
    Simple JSON API for Product.
    GET /products/<id> -> single product
    GET /products/ -> list
    POST -> create product (uses request.POST; images assumed to be simple field reference)
    """
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
            # values() for lightweight serialization
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
            # Return 400 with error details (no stack trace exposed)
            return JsonResponse({"error": str(e)}, status=400)


# Join 
class RegisterView(View):
    """
    Registration view using SignUpForm.
    - Creates User + UserProfile.
    - Attempts auto-login via authenticate -> login.
    - Falls back to redirect to login with message if backend rejects.
    """
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
    """
    Basic username/password login.
    Renders login page with error messages for invalid credentials or non-existent users.
    """

    def get(self, request):
        """Render login page"""
        return render(request, "login.html")

    def post(self, request):
        """User login"""
        username = request.POST.get("username")
        password = request.POST.get("password")

        # Check if user exists
        if not User.objects.filter(username=username).exists():
            return render(request, "login.html", {
                "error": "User does not exist. Please check your username or Sign up using the link below."
            })

        # Authenticate user
        user = authenticate(username=username, password=password)
        if user:
            login(request, user)
            return redirect("home")  # Redirect to home.html after login

        return render(request, "login.html", {
            "error": "Incorrect password. Please try again."
        })

# logout view
class LogoutView(View):
    """
    Logout supported for both GET and POST.
    NOTE: Using GET for logout is convenient but can be CSRF-sensitive in some setups.
    """
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
    """
    Authenticated password change using CustomPasswordChangeForm.
    On success -> success message -> redirect home.
    """
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
    """
    Starts the password reset flow:
    - Sends email using CustomPasswordResetForm configuration.
    - Redirects to password_reset_done on success.
    """
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
    """Simple confirmation page after initiating password reset."""
    def get(self, request):
        """Display password reset done page"""
        return render(request, "password_reset_done.html")


class PasswordResetConfirmView(View):
    """
    Handles token/uid link from email to set a new password.
    On success -> redirect to login.
    """
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
    """
    Authenticated product detail view with rating submission.
    NOTE: Uses 'value' for rating field, unlike product_detail which uses 'rating'.
    """
    def get(self, request, product_id):
        """Display product details and user's rating"""
        product = get_object_or_404(Product, id=product_id)
        user_rating = Rating.objects.filter(product=product, user=request.user).first()
        form = RatingForm(initial={'rating': user_rating.value if user_rating else None})
        # Check if product is wishlisted for current user (guard for anonymous already ensured by login_required)
        wishlisted = product.wishlisted_by.filter(id=request.user.id).exists() if request.user.is_authenticated else False
        return render(request, "product_detail.html", {
            "product": product,
            "form": form,
            "user_rating": user_rating,
            "average_rating": product.average_rating,  # Show stored rating
            "rating_range": range(1, 6),  # rate from 1 to 5
            "wishlisted": wishlisted,  # adding wishlisted status to the product  
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
    """
    Admin: show users ordered by login_count (from related UserProfile).
    Assumes UserProfile has 'login_count' field and select_related('userprofile') is valid.
    """
    users = User.objects.select_related('userprofile').order_by('-userprofile__login_count')
    return render(request, 'user_login_list.html', {'users': users})


from django.contrib.auth.decorators import login_required  # NOTE: Duplicate import.
from django.shortcuts import render, redirect  # NOTE: Duplicate import.
from .models import Wishlist  # NOTE: Duplicate import.


@login_required
def wishlist_checkout(request):
    """
    User checkout summary for wishlist.
    NOTE: There is another function named `wishlist_checkout` further below. Keeping both.
    """
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
    """Add a Product to the current user's wishlist."""
    product = get_object_or_404(Product, id=product_id)
    wishlist, created = Wishlist.objects.get_or_create(user=request.user)
    wishlist.products.add(product)
    return redirect('user-wishlist')


@login_required
def remove_from_wishlist(request, product_id):
    """Remove a Product from the current user's wishlist (POST-guarded)."""
    product = get_object_or_404(Product, id=product_id)
    wishlist = get_object_or_404(Wishlist, user=request.user)
    if request.method == "POST":
        wishlist.products.remove(product)
        wishlist.save()
    return redirect('user-wishlist')


@login_required
def user_wishlist(request):
    """Render current user's wishlist page."""
    wishlist, created = Wishlist.objects.get_or_create(user=request.user)
    return render(request, "wishlist.html", {"wishlist": wishlist})


@staff_member_required
def admin_user_wishlist(request, user_id):
    """
    Admin: View a specific user's wishlist items (products + handbags).
    NOTE: This duplicates the name of a previous view; Django will route to the last defined function with this name if both are imported into urls. Keep intact.
    """
    user = get_object_or_404(User, id=user_id)
    wishlist, created = Wishlist.objects.prefetch_related('products', 'handbags').get_or_create(user=user)
    wishlist_products = wishlist.products.all()
    wishlist_handbags = wishlist.handbags.all()
    return render(request, 'admin_user_wishlist.html', {'wishlist_user': user, 'wishlist_products': wishlist_products, 'wishlist_handbags': wishlist_handbags})


def handbags_list(request):
    """Public listing of handbags."""
    handbags = Handbag.objects.all()
    return render(request, "handbags.html", {"handbags": handbags})


def handbag_detail(request, handbag_id):
    """
    Public handbag detail with optional rating on POST for authenticated users.
    """
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
    """Admin: Create a new Handbag via HandbagForm."""
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
    """Admin: Edit an existing Handbag."""
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
    """Admin: Delete a Handbag via POST."""
    def post(self, request, handbag_id):
        handbag = get_object_or_404(Handbag, id=handbag_id)
        handbag.delete()
        return redirect("handbags")


@login_required
def add_handbag_to_wishlist(request, handbag_id):
    """Add a Handbag to the current user's wishlist."""
    handbag = get_object_or_404(Handbag, id=handbag_id)
    wishlist, created = Wishlist.objects.get_or_create(user=request.user)
    wishlist.handbags.add(handbag)
    return redirect('user-wishlist')


@login_required
def remove_handbag_from_wishlist(request, handbag_id):
    """Remove a Handbag from the current user's wishlist."""
    wishlist, created = Wishlist.objects.get_or_create(user=request.user)
    handbag = get_object_or_404(Handbag, id=handbag_id)
    wishlist.handbags.remove(handbag)
    return redirect('user-wishlist')


@user_passes_test(lambda u: u.is_staff)
def admin_handbag_view(request):
    """Admin: List all handbags."""
    handbags = Handbag.objects.all()
    return render(request, "admin_handbag.html", {"handbags": handbags})


# clothes details
def clothes_detail(request, pk):
    clothes = get_object_or_404(Clothes, pk=pk)

    if request.method == "POST" and request.user.is_authenticated:
        rating_val = int(request.POST.get("rating", 0))
        if 1 <= rating_val <= 5:
            from .models import ClothesRating
            ClothesRating.objects.update_or_create(
                clothes=clothes, user=request.user,
                defaults={"rating": rating_val}
            )
            clothes.update_average_rating()

    return render(request, "clothes/clothes_detail.html", {"clothes": clothes})

#clothes wishlist actions
@login_required
def add_clothes_to_wishlist(request, pk):
    if request.method != "POST":
        messages.error(request, "Invalid request method.")
        return redirect("clothes-detail", pk=pk)

    item = get_object_or_404(Clothes, pk=pk)
    wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
    wishlist.clothes.add(item)  # idempotent
    messages.success(request, f"Added “{item.name}” to your wishlist.")
    next_url = request.POST.get("next") or reverse("clothes-detail", kwargs={"pk": pk})
    return redirect(next_url)

@login_required
def remove_clothes_from_wishlist(request, pk):
    if request.method != "POST":
        messages.error(request, "Invalid request method.")
        return redirect("clothes-detail", pk=pk)

    item = get_object_or_404(Clothes, pk=pk)
    wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
    wishlist.clothes.remove(item)
    messages.success(request, f"Removed “{item.name}” from your wishlist.")
    next_url = request.POST.get("next") or reverse("clothes-detail", kwargs={"pk": pk})
    return redirect(next_url)


@login_required
def wishlist_checkout(request):
    """
    DUPLICATE NAME: wishlist_checkout
    Computes totals for wishlist products + handbags and renders checkout.
    """
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
    """Display available services (public)."""
    services = Service.objects.all()
    return render(request, "services.html", {"services": services})


def gallery(request):
    """
    Public gallery page grouped by service key.
    Uses a fixed set of services; consider driving from DB if dynamic categories are needed.
    """
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
    """Admin: Add a new gallery image."""
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
    """Admin: Edit an existing gallery image."""
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
    """Admin: Delete a gallery image (POST-confirmed)."""
    image = get_object_or_404(GalleryImage, id=image_id)
    if request.method == "POST":
        image.delete()
        return redirect('gallery')
    return render(request, "delete_gallery_image.html", {"image": image})


def offers(request):
    """Public: List all current offers in reverse chronological order."""
    offers = Offer.objects.all().order_by('-created_at')
    return render(request, "offers.html", {"offers": offers})


@staff_member_required
def add_offer(request):
    """Admin: Create a new Offer."""
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
    """Admin: Delete an Offer after POST confirmation."""
    offer = get_object_or_404(Offer, id=offer_id)
    if request.method == "POST":
        offer.delete()
        return redirect('offers')
    return render(request, "delete_offer.html", {"offer": offer})


from django.contrib.auth.decorators import user_passes_test  # NOTE: Duplicate import.
from django.contrib.auth.models import User  # NOTE: Duplicate import.
from django.shortcuts import render, redirect, get_object_or_404  # NOTE: Duplicate import.
from django.contrib import messages  # NOTE: Duplicate import.


@user_passes_test(lambda u: u.is_superuser or u.is_staff)
def promote_to_admin(request):
    """
    Admin/Superuser: Promote a user to staff with a max cap of 3 admins.
    Tracks 'added_by' in UserProfile.
    """
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
    """
    Admin/Superuser: Remove staff status with permission check:
    - Allowed if current user is superuser OR originally added the admin (via UserProfile.added_by).
    """
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


@staff_member_required
def add_service(request):
    """Admin: Create a new Service."""
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
    """Admin: Edit an existing Service."""
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
    """Custom 404 handler; returns 404.html with status=404."""
    return render(request, '404.html', status=404)


# =========================
# Reservation Views
# =========================
import json
from django.views.decorators.http import require_POST
from .models import Reservation
from .forms import ReservationForm, AdminReservationForm


@login_required
def reservation_calendar(request):
    """Public calendar showing approved reservations; customers also see their own pending ones."""
    if request.user.is_staff:
        reservations = Reservation.objects.select_related('customer', 'service').exclude(
            status=Reservation.STATUS_CANCELLED
        )
    else:
        reservations = Reservation.objects.select_related('service').filter(
            status=Reservation.STATUS_APPROVED
        ) | Reservation.objects.select_related('service').filter(
            customer=request.user
        )
        reservations = reservations.distinct()

    events = []
    color_map = {
        Reservation.STATUS_APPROVED: '#198754',
        Reservation.STATUS_PENDING: '#ffc107',
        Reservation.STATUS_REJECTED: '#dc3545',
        Reservation.STATUS_CANCELLED: '#6c757d',
    }
    for r in reservations:
        label = r.service.name if r.service else 'Reservation'
        if request.user.is_staff:
            label = f"{label} — {r.customer.get_full_name() or r.customer.username}"
        events.append({
            'id': r.pk,
            'title': label,
            'start': f"{r.reservation_date}T{str(r.reservation_time)[:5]}",
            'color': color_map.get(r.status, '#0b3e64'),
            'extendedProps': {
                'status': r.get_status_display(),
                'notes': r.notes,
            },
        })

    return render(request, 'reservations/calendar.html', {
        'events_json': json.dumps(events),
        'pending_count': Reservation.objects.filter(status=Reservation.STATUS_PENDING).count() if request.user.is_staff else 0,
    })


@login_required
def request_reservation(request):
    """Customer submits a new reservation request."""
    if request.method == 'POST':
        form = ReservationForm(request.POST)
        if form.is_valid():
            reservation = form.save(commit=False)
            reservation.customer = request.user
            reservation.status = Reservation.STATUS_PENDING
            reservation.save()
            messages.success(request, 'Your reservation request has been submitted. We will confirm shortly.')
            return redirect('my-reservations')
    else:
        form = ReservationForm()
    return render(request, 'reservations/request.html', {'form': form})


@login_required
def my_reservations(request):
    """Customer views their own reservations."""
    reservations = Reservation.objects.filter(customer=request.user).select_related('service')
    return render(request, 'reservations/my_reservations.html', {'reservations': reservations})


@require_POST
@login_required
def cancel_reservation(request, reservation_id):
    """Customer cancels their own pending reservation."""
    reservation = get_object_or_404(Reservation, pk=reservation_id, customer=request.user)
    if reservation.status == Reservation.STATUS_PENDING:
        reservation.status = Reservation.STATUS_CANCELLED
        reservation.save()
        messages.success(request, 'Reservation cancelled.')
    else:
        messages.error(request, 'Only pending reservations can be cancelled.')
    return redirect('my-reservations')


@login_required
@user_passes_test(is_admin)
def admin_reservations(request):
    """Admin: list and filter all reservations."""
    status_filter = request.GET.get('status', '')
    qs = Reservation.objects.select_related('customer', 'service').all()
    if status_filter:
        qs = qs.filter(status=status_filter)
    pending_count = Reservation.objects.filter(status=Reservation.STATUS_PENDING).count()
    return render(request, 'reservations/admin_list.html', {
        'reservations': qs,
        'status_filter': status_filter,
        'pending_count': pending_count,
        'status_choices': Reservation.STATUS_CHOICES,
    })


@login_required
@user_passes_test(is_admin)
def admin_add_reservation(request):
    """Admin: add a reservation directly (status set in form, defaults approved)."""
    if request.method == 'POST':
        form = AdminReservationForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Reservation added successfully.')
            return redirect('admin-reservations')
    else:
        form = AdminReservationForm(initial={'status': Reservation.STATUS_APPROVED})
    return render(request, 'reservations/admin_add.html', {'form': form})


@require_POST
@login_required
@user_passes_test(is_admin)
def admin_approve_reservation(request, reservation_id):
    """Admin: approve or reject a reservation."""
    reservation = get_object_or_404(Reservation, pk=reservation_id)
    action = request.POST.get('action')
    reservation.admin_notes = request.POST.get('admin_notes', reservation.admin_notes)
    if action == 'approve':
        reservation.status = Reservation.STATUS_APPROVED
        messages.success(request, f'Reservation for {reservation.customer.username} approved.')
    elif action == 'reject':
        reservation.status = Reservation.STATUS_REJECTED
        messages.warning(request, f'Reservation for {reservation.customer.username} rejected.')
    reservation.save()
    return redirect('admin-reservations')


def custom_500(request):
    """Custom 500 handler; returns 500.html with status=500."""
    return render(request, '500.html', status=500)


def privacy_policy(request):
    """Public: Privacy Policy page."""
    return render(request, 'privacy_policy.html')


def terms_of_service(request):
    """Public: Terms of Service page."""
    return render(request, 'terms_of_service.html')


@login_required
def toggle_gallery_like(request, image_id):
    """
    Toggle like for gallery image or return like status.
    GET  -> returns current liked state and like_count
    POST -> toggles like for current user
    """
    from .models import GalleryLike  # Local import to avoid circulars/import cost globally.
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


from .ai_chatbot import ai_chatbot_response  # NOTE: Imported but unused in this file; keep if used elsewhere via side-effects.
