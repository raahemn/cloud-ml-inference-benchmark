import os
from dotenv import load_dotenv

# Load .env variables
load_dotenv()

class Settings:
    PROJECT_NAME: str = "ResNet Inference Service"
    GCS_BUCKET: str = os.getenv("GCS_BUCKET", "cmpt756-resnet-models")
    PROJECT_ID: str = os.getenv("PROJECT_ID", "project-aa99c865-21ed-430c-aac")

settings = Settings()
