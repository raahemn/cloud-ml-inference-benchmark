import os

class Settings:
    PROJECT_NAME: str = "ResNet Inference Service"
    MODEL_PATH: str = os.getenv("MODEL_PATH", "/Users/raahemnabeel/Desktop/CMPT756/cloud-ml-inference-benchmark/ml-grpc-service/ml-models/resnet18_cifar10.pth")
    IS_GCP: bool = False 

settings = Settings()