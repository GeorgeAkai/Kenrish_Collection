#!/bin/sh
set -e
# Seed media from image: overwrites volume files that are older than the built-in copies
if [ -d /app/media_seed ]; then
  cp -ru /app/media_seed/. /app/media/
fi
python manage.py migrate --noinput
python manage.py collectstatic --noinput
exec gunicorn kenrish.wsgi:application --bind "0.0.0.0:${PORT:-10000}" --workers 2 --timeout 120
