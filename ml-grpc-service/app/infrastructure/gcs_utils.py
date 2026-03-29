from google.cloud import storage
import uuid
from app.core.config import settings


def download_model(bucket_name, source_blob_name):
    unique_id = uuid.uuid4().hex[:8]

    destination_file_name = f"{settings.LOCAL_MODEL_DIRECTORY}/model_{unique_id}.pth"

    print(f"Downloading model {source_blob_name} from GCS...")
    
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(source_blob_name)

    blob.download_to_filename(destination_file_name)

    print(f"Model downloaded from GCS to {destination_file_name}")
    return destination_file_name

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