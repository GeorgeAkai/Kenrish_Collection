#!/bin/bash

echo "Applying migrations..."
python3 manage.py makemigrations
python3 manage.py migrate

sleep 3

echo "Starting Django server..."
python3 manage.py runserver