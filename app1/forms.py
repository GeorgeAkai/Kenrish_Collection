from django import forms
from django.contrib.auth.forms import UserCreationForm, PasswordChangeForm, PasswordResetForm, SetPasswordForm
from django.contrib.auth.models import User
from datetime import date
from .models import Product, Rating, Handbag, GalleryImage, Offer, Service, Clothes, Reservation

class SignUpForm(UserCreationForm):
    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'Email address'})
    )

    class Meta:
        model = User
        fields = ["username", "email", "password1", "password2"]

    def __init__(self, *args, **kwargs):
        super(SignUpForm, self).__init__(*args, **kwargs)
        self.fields['username'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': 'Username'
        })
        self.fields['password1'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': 'Password'
        })
        self.fields['password2'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': 'Confirm Password'
        })


class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = ["name", "description", "price", "image"]

# Clothes form here
class ClothesForm(forms.ModelForm):
    class Meta:
        model = Clothes
        fields = ['name', 'description', 'price', 'image', 'stock_quantity', 'cost_price', 'reorder_level']


class RatingForm(forms.ModelForm):
    value = forms.ChoiceField(
        choices=[(i, i) for i in range(1, 6)],
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    class Meta:
        model = Rating
        fields = ['value']


class HandbagForm(forms.ModelForm):
    class Meta:
        model = Handbag
        fields = ['name', 'description', 'price', 'image']


class GalleryImageForm(forms.ModelForm):
    class Meta:
        model = GalleryImage
        fields = ['service', 'file', 'description']


class OfferForm(forms.ModelForm):
    class Meta:
        model = Offer
        fields = ['name', 'image', 'description', 'offer_price']


class ServiceForm(forms.ModelForm):
    class Meta:
        model = Service
        fields = ['name', 'short_description', 'full_description', 'price', 'image']


class CustomPasswordChangeForm(PasswordChangeForm):
    def __init__(self, *args, **kwargs):
        super(CustomPasswordChangeForm, self).__init__(*args, **kwargs)
        self.fields['old_password'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': 'Current Password'
        })
        self.fields['new_password1'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': 'New Password'
        })
        self.fields['new_password2'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': 'Confirm New Password'
        })


class CustomPasswordResetForm(PasswordResetForm):
    def __init__(self, *args, **kwargs):
        super(CustomPasswordResetForm, self).__init__(*args, **kwargs)
        self.fields['email'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': 'Enter your email address'
        })


class CustomSetPasswordForm(SetPasswordForm):
    def __init__(self, *args, **kwargs):
        super(CustomSetPasswordForm, self).__init__(*args, **kwargs)
        self.fields['new_password1'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': 'New Password'
        })
        self.fields['new_password2'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': 'Confirm New Password'
        })


class ReservationForm(forms.ModelForm):
    class Meta:
        model = Reservation
        fields = ['service', 'reservation_date', 'reservation_time', 'notes']
        widgets = {
            'service': forms.Select(attrs={'class': 'form-select'}),
            'reservation_date': forms.DateInput(
                attrs={'type': 'date', 'class': 'form-control', 'min': date.today().isoformat()}
            ),
            'reservation_time': forms.TimeInput(attrs={'type': 'time', 'class': 'form-control'}),
            'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Any special requests or notes...'}),
        }


class AdminReservationForm(forms.ModelForm):
    class Meta:
        model = Reservation
        fields = ['customer', 'service', 'reservation_date', 'reservation_time', 'notes', 'status', 'admin_notes']
        widgets = {
            'customer': forms.Select(attrs={'class': 'form-select'}),
            'service': forms.Select(attrs={'class': 'form-select'}),
            'reservation_date': forms.DateInput(attrs={'type': 'date', 'class': 'form-control'}),
            'reservation_time': forms.TimeInput(attrs={'type': 'time', 'class': 'form-control'}),
            'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'status': forms.Select(attrs={'class': 'form-select'}),
            'admin_notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 2, 'placeholder': 'Internal notes (visible to admin only)...'}),
        }

