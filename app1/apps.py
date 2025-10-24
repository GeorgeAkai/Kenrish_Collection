from django.apps import AppConfig


# class App1Config(AppConfig):
#     default_auto_field = "django.db.models.BigAutoField"
#     name = "app1"

class App1Config(AppConfig):
    name = 'app1'
    verbose_name = 'Application 1'

    def ready(self):
        # Import signals to ensure they are registered
        import app1.signals  
