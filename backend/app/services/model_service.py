import io
import torch
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image
import pillow_avif
from torchvision.models import resnet18
from app.core.config import settings

class ResNetService:
    def __init__(self):
        self.model = None
        # CIFAR-10 specific normalization
        self.preprocess = transforms.Compose([
            transforms.Resize(224),
            transforms.ToTensor(),
            transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5)),
        ])
        # Human-readable labels for CIFAR-10
        self.labels = [
            "airplane", "automobile", "bird", "cat", "deer", 
            "dog", "frog", "horse", "ship", "truck"
        ]

    def load_model(self):
        try:
            # Create the shell
            self.model = resnet18(weights=None)
            
            # Customize to 10 classes
            num_ftrs = self.model.fc.in_features
            self.model.fc = nn.Linear(num_ftrs, 10)
            
            # Load the weights
            state_dict = torch.load(settings.MODEL_PATH, map_location=torch.device('cpu'))
            self.model.load_state_dict(state_dict)
            
            # Set to evaluation mode
            self.model.eval()
            print(f"Successfully loaded custom model from {settings.MODEL_PATH}")
            
        except FileNotFoundError:
            print(f"Error: Model file not found at {settings.MODEL_PATH}")
            raise
        except Exception as e:
            print(f"Error loading model: {e}")
            raise

    async def predict(self, image_bytes: bytes):
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        input_tensor = self.preprocess(image).unsqueeze(0)

        with torch.no_grad():
            output = self.model(input_tensor)
        
        probabilities = torch.nn.functional.softmax(output[0], dim=0)
        class_id = torch.argmax(probabilities).item()
        confidence = probabilities[class_id].item()
        label = self.labels[class_id]

        return class_id, confidence, label

# Singleton instance
model_service = ResNetService()