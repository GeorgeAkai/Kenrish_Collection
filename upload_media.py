"""
One-off script: upload local media/ files to Supabase storage, overwriting existing objects.
Run from the project root: python upload_media.py
Reads credentials from .env via the same env vars Django uses.
"""
import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # fall back to env vars already set in shell

import boto3
from botocore.exceptions import ClientError

access_key = os.getenv('S3_ACCESS_KEY')
secret_key = os.getenv('SECRET_ACCESS_KEY')
endpoint_base = os.getenv('S3_ENDPOINT_URL', '').rstrip('/')
endpoint_url = endpoint_base + '/s3'
bucket = 'kenrish-bucket'

if not access_key or not secret_key or not endpoint_base:
    sys.exit('Missing S3_ACCESS_KEY, SECRET_ACCESS_KEY, or S3_ENDPOINT_URL in environment.')

s3 = boto3.client(
    's3',
    endpoint_url=endpoint_url,
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    region_name='us-east-1',
)


def content_type(path: Path) -> str:
    with open(path, 'rb') as f:
        header = f.read(8)
    if header[:8] == b'\x89PNG\r\n\x1a\n':
        return 'image/png'
    if header[:2] == b'\xff\xd8':
        return 'image/jpeg'
    # MP4 / video
    if path.suffix.lower() == '.mp4':
        return 'video/mp4'
    return 'application/octet-stream'


folders = [
    'product_images',
    'handbag_images',
    'clothes_images',
    'service_images',
    'offers',
    'gallery',
]

total = 0
for folder in folders:
    media_dir = Path('media') / folder
    if not media_dir.exists():
        continue
    for file in sorted(media_dir.iterdir()):
        if not file.is_file():
            continue
        key = f'{folder}/{file.name}'
        ct = content_type(file)
        print(f'  {key} ({ct}) ... ', end='', flush=True)
        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=file.read_bytes(),
            ContentType=ct,
        )
        print('done')
        total += 1

print(f'\nUploaded {total} files.')
