#!/bin/bash

# restart_services.sh
# A script to restart Gunicorn and Nginx services

echo "Restarting Gunicorn..."
sudo systemctl restart gunicorn

if [ $? -eq 0 ]; then
  echo "Gunicorn restarted successfully."
else
  echo "Failed to restart Gunicorn."
  exit 1
fi

echo "Restarting Nginx..."
sudo systemctl restart nginx

if [ $? -eq 0 ]; then
  echo "Nginx restarted successfully."
else
  echo "Failed to restart Nginx."
  exit 1
fi

echo "All services restarted successfully."

