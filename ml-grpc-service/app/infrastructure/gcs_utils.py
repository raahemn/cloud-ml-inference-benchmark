from google.cloud import storage
import uuid
from app.core.config import settings
import io

def fetch_model_bytes(bucket_name, source_blob_name):
    print(f"Fetching {source_blob_name} from GCS into memory...")
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(source_blob_name)

    # Downloads the entire file into a bytes object in RAM
    model_data = blob.download_as_bytes()
    
    # Wrap it in a file-like object for PyTorch
    return io.BytesIO(model_data)

def get_latest_model_blob(bucket_name):
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    
    # List all blobs in the bucket
    blobs = bucket.list_blobs()
    
    # Filter for model files and sort by updated time
    model_blobs = [b for b in blobs if b.name.endswith('.pth')]
    if not model_blobs:
        return None
        
    # Sort by the 'updated' attribute (descending)
    latest_blob = sorted(model_blobs, key=lambda b: b.updated, reverse=True)[0]

    print(f"Latest model blob: {latest_blob.name}")
    return latest_blob.name