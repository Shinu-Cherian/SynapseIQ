import os
import boto3
from fastapi import UploadFile
import uuid
import shutil
from urllib.parse import unquote, urlparse

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_BUCKET_NAME = os.getenv("AWS_BUCKET_NAME", "synapseiq-storage")
# Endpoint URL allows pointing to Cloudflare R2 or DigitalOcean Spaces instead of AWS S3
AWS_ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL")

class StorageService:
    def __init__(self):
        self.use_s3 = AWS_ACCESS_KEY_ID is not None
        if self.use_s3:
            self.s3 = boto3.client(
                's3',
                aws_access_key_id=AWS_ACCESS_KEY_ID,
                aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                region_name=AWS_REGION,
                endpoint_url=AWS_ENDPOINT_URL
            )
        else:
            self.local_storage_path = "app_storage/cloud_simulated"
            os.makedirs(self.local_storage_path, exist_ok=True)

    def upload_bytes(self, file_bytes: bytes, filename: str, content_type: str, prefix: str = "") -> str:
        file_extension = os.path.splitext(filename)[1]
        unique_filename = f"{prefix}{uuid.uuid4().hex}{file_extension}"
        
        if self.use_s3:
            self.s3.put_object(
                Bucket=AWS_BUCKET_NAME,
                Key=unique_filename,
                Body=file_bytes,
                ContentType=content_type
            )
            if AWS_ENDPOINT_URL:
                return f"{AWS_ENDPOINT_URL}/{AWS_BUCKET_NAME}/{unique_filename}"
            return f"https://{AWS_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{unique_filename}"
        else:
            local_path = os.path.join(self.local_storage_path, unique_filename)
            with open(local_path, "wb") as f:
                f.write(file_bytes)
            return f"/storage/cloud_simulated/{unique_filename}"

    def delete_file_url(self, file_url: str) -> None:
        """Best-effort deletion for files previously returned by upload_bytes."""
        if not file_url:
            return
        if self.use_s3:
            path = unquote(urlparse(file_url).path).lstrip("/")
            bucket_prefix = f"{AWS_BUCKET_NAME}/"
            key = path[len(bucket_prefix):] if path.startswith(bucket_prefix) else path
            if key:
                self.s3.delete_object(Bucket=AWS_BUCKET_NAME, Key=key)
            return

        prefix = "/storage/cloud_simulated/"
        if not file_url.startswith(prefix):
            return
        relative_path = file_url[len(prefix):].replace("/", os.sep)
        root = os.path.abspath(self.local_storage_path)
        target = os.path.abspath(os.path.join(root, relative_path))
        if os.path.commonpath([root, target]) == root and os.path.isfile(target):
            os.remove(target)

storage_service = StorageService()
