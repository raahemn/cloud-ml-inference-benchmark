import os
from dotenv import load_dotenv

# Load .env variables
load_dotenv()

class Settings:
    PROJECT_NAME: str = "ResNet Inference Service"
    LOCAL_MODEL_PATH: str = os.getenv(
        "LOCAL_MODEL_PATH",
        "/Users/raahemnabeel/Desktop/CMPT756/cloud-ml-inference-benchmark/ml-grpc-service/ml-models/resnet18_cifar10.pth"
    )
    GCS_BUCKET: str = os.getenv("GCS_BUCKET", "cmpt756-resnet-models")
    GCS_MODEL_PATH: str = os.getenv("GCS_MODEL_PATH", "resnet_cifar10.pth")

settings = Settings()