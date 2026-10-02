from .models import AuditEntry


def record_audit(actor, kind, obj, action, before, after=None):
    """Write a permanent audit row. `before`/`after` are plain dicts of the fields that matter."""
    return AuditEntry.objects.create(
        kind=kind, object_ref=obj.pk, object_label=str(getattr(obj, 'description', None) or getattr(obj, 'name', None) or obj)[:255],
        action=action, actor=actor, actor_username=actor.username, before=before, after=after,
    )
