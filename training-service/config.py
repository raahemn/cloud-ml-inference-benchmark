import os

class Settings:
    PORT = int(os.getenv("PORT", "8080"))
    PROJECT_ID = os.getenv("PROJECT_ID", "project-aa99c865-21ed-430c-aac")
    DATA_BUCKET = os.getenv("DATA_BUCKET", "inference-cloudrun-training-data")
    MODEL_BUCKET = os.getenv("MODEL_BUCKET", "cmpt756-resnet-models")
    TRAINING_SUB = os.getenv("TRAINING_SUB", "model-training-trigger-sub")
    
    # GCS Pathing
    QUEUE_PREFIX = "training-samples/"
    ARCHIVE_PREFIX = "archive/"
    
    # Thresholds
    THRESHOLD = int(os.getenv("TRAINING_THRESHOLD", "100"))
    
    # Local Processing Paths
    LOCAL_DATA_DIR = "/tmp/training_data"
    
    # Model Metadata
    LABELS = ["airplane", "automobile", "bird", "cat", "deer", 
              "dog", "frog", "horse", "ship", "truck"]

settings = Settings()
