from google.cloud import storage
import os


def download_model(bucket_name, source_blob_name, destination_file_name):
    if os.path.exists(destination_file_name):
        print("Model already exists locally. Skipping download.")
        return

    print("Downloading model from GCS...")
    
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(source_blob_name)

    blob.download_to_filename(destination_file_name)

    print(f"Model downloaded from GCS to {destination_file_name}")