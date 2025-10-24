# Email Configuration for Password Reset

## Overview
The password reset feature requires email configuration to send reset links to users. This guide explains how to set up email for both development and production environments.

## Development Setup (Console Backend)
For development, emails are displayed in the terminal console instead of being sent via email.

**Current Configuration:**
```python
# In settings.py - already configured
if DEBUG:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

## Production Setup (SMTP Backend)

### 1. Gmail Configuration (Recommended)
Add these environment variables to your production server:

```bash
# Set these environment variables
export EMAIL_HOST_USER="your-email@gmail.com"
export EMAIL_HOST_PASSWORD="your-app-password"  # Use App Password, not regular password
export DEFAULT_FROM_EMAIL="noreply@kenrish.com"
```

**Gmail Setup Steps:**
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. Use the app password (not your regular password) in EMAIL_HOST_PASSWORD

### 2. Other Email Providers

**SendGrid:**
```python
EMAIL_HOST = 'smtp.sendgrid.net'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'apikey'  # This is always 'apikey' for SendGrid
EMAIL_HOST_PASSWORD = 'your-sendgrid-api-key'
```

**Mailgun:**
```python
EMAIL_HOST = 'smtp.mailgun.org'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-mailgun-smtp-username'
EMAIL_HOST_PASSWORD = 'your-mailgun-smtp-password'
```

**Amazon SES:**
```python
EMAIL_HOST = 'email-smtp.us-east-1.amazonaws.com'  # Change region as needed
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-ses-smtp-username'
EMAIL_HOST_PASSWORD = 'your-ses-smtp-password'
```

## Testing Email Configuration

### Test in Development:
1. Start Django server: `python manage.py runserver`
2. Go to `/password-reset/`
3. Enter an email address
4. Check the terminal console for the email content

### Test in Production:
1. Set up your email environment variables
2. Test the password reset flow
3. Check that emails are received

## Security Notes

1. **Never commit email credentials to version control**
2. **Use environment variables for sensitive information**
3. **Use App Passwords for Gmail (not regular passwords)**
4. **Consider using a dedicated email service for production**

## Troubleshooting

### Common Issues:
1. **"Authentication failed"** - Check your email credentials
2. **"Connection refused"** - Check EMAIL_HOST and EMAIL_PORT
3. **"TLS/SSL errors"** - Ensure EMAIL_USE_TLS = True
4. **Emails not received** - Check spam folder, verify email address

### Debug Mode:
To debug email issues, temporarily add this to settings.py:
```python
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

This will print emails to the console instead of sending them.

## AI Service API Key (OPENROUTER_API_KEY)

The chatbot AI service expects its API key to be provided via an environment variable named `OPENROUTER_API_KEY`.
Do NOT hard-code API keys in source code or commit them to version control.

Set the environment variable for your platform:

- Windows (PowerShell, current session):

```powershell
$env:OPENROUTER_API_KEY = "your_api_key_here"
```

- Windows (PowerShell, persist for the current user):

```powershell
setx OPENROUTER_API_KEY "your_api_key_here"
```

- macOS / Linux (bash/zsh):

```bash
export OPENROUTER_API_KEY="your_api_key_here"
```

In production, set `OPENROUTER_API_KEY` through your deployment environment (systemd service file, Docker secret, environment config in your hosting provider, CI/CD secrets, etc.).

If the variable is not set, the application will raise a clear error on startup indicating that `OPENROUTER_API_KEY` is missing.

Security tip: Use a secrets manager (AWS Secrets Manager, Azure Key Vault, GitHub Secrets, etc.) instead of storing credentials in plain text.

