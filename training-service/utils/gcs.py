import io
import os
import shutil
from google.cloud import storage
from config import settings

client = storage.Client()

def get_queue_count():
    """Counts files in the queue prefix."""
    blobs = client.list_blobs(settings.DATA_BUCKET, prefix=settings.QUEUE_PREFIX)
    return sum(1 for b in blobs if not b.name.endswith('/'))

def fetch_latest_model_stream():
    """Downloads the latest .pth file into a memory buffer."""
    bucket = client.bucket(settings.MODEL_BUCKET)
    blobs = list(bucket.list_blobs())
    pth_blobs = [b for b in blobs if b.name.endswith('.pth')]
    
    if not pth_blobs:
        raise Exception("No base model found in GCS!")
    
    latest_blob = max(pth_blobs, key=lambda b: b.updated)
    print(f"Streaming latest model: {latest_blob.name}")
    return io.BytesIO(latest_blob.download_as_bytes())

def upload_model_stream(model_stream, blob_name):
    """Uploads a BytesIO model buffer directly to GCS."""
    bucket = client.bucket(settings.MODEL_BUCKET)
    blob = bucket.blob(blob_name)
    blob.upload_from_file(model_stream, content_type='application/octet-stream')

def download_training_data():
    """Downloads queue images to local /tmp for ImageFolder processing."""
    bucket = client.bucket(settings.DATA_BUCKET)
    blobs = bucket.list_blobs(prefix=settings.QUEUE_PREFIX)
    
    if os.path.exists(settings.LOCAL_DATA_DIR):
        shutil.rmtree(settings.LOCAL_DATA_DIR)

    for blob in blobs:
        if blob.name.endswith('/'): continue
        # queue/dog/123.jpg -> /tmp/training_data/dog/123.jpg
        local_path = os.path.join(settings.LOCAL_DATA_DIR, blob.name.replace(settings.QUEUE_PREFIX, ""))
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        blob.download_to_filename(local_path)

def archive_data(batch_id):
    """Moves processed images from queue/ to archive/{batch_id}/."""
    bucket = client.bucket(settings.DATA_BUCKET)
    blobs = list(bucket.list_blobs(prefix=settings.QUEUE_PREFIX))
    
    for blob in blobs:
        if blob.name.endswith('/'): continue
        new_name = blob.name.replace(settings.QUEUE_PREFIX, f"{settings.ARCHIVE_PREFIX}{batch_id}/")
        bucket.copy_blob(blob, bucket, new_name)
        blob.delete()

def cleanup_local_data():
    if os.path.exists(settings.LOCAL_DATA_DIR):
        shutil.rmtree(settings.LOCAL_DATA_DIR)