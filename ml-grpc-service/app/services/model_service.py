import io
import random
import time
import torch
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image
import pillow_avif
from torchvision.models import resnet18
from app.core.config import settings
from app.infrastructure.gcs_utils import download_model, get_latest_model_blob
import threading
import os

class ResNetService:
    def __init__(self):
        self.model = None
        self._current_model_blob = None
        self._current_local_path = None
        
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

        # COLD START: Load the initial model synchronously
        print("Starting initial model bootstrap...")
        self.bootstrap_model()

        # FUTURE UPDATES: Start the background listener
        print("Starting background update listener...")
        self._start_polling_worker()

    def bootstrap_model(self):
        """Finds and loads the latest model. Blocks until complete."""
        try:
            latest_blob_name = get_latest_model_blob(settings.GCS_BUCKET)
            
            if not latest_blob_name:
                raise Exception("No model files found in GCS bucket!")

            local_path = download_model(settings.GCS_BUCKET, latest_blob_name)
            
            self.model = self.load_model_from_path(local_path)
            self._current_model_blob = latest_blob_name
            self._current_local_path = local_path

            print(f"Bootstrap complete. Serving from: {local_path}")
        except Exception as e:
            print(f"CRITICAL: Bootstrap failed: {e}")
            raise e

    def _start_polling_worker(self):
        """Spawns a daemon thread to check for model updates every few minutes."""
        polling_thread = threading.Thread(target=self._run_polling_loop, daemon=True)
        polling_thread.start()
        
    def _run_polling_loop(self):
        """
        The background loop. 
        Uses 'jitter' to prevent all horizontally scaled instances 
        from hitting GCS at the exact same millisecond.
        """
        # Poll every 5 minutes by default
        base_interval = 300 
        
        print(f"Polling worker active. Interval: ~{base_interval}s")
        
        while True:
            try:
                # Fetch the name of the latest model in the bucket
                latest_blob = get_latest_model_blob(settings.GCS_BUCKET)
                
                if latest_blob and latest_blob != self._current_model_blob:
                    print(f"New model version detected in GCS: {latest_blob}")
                    self.trigger_model_update(latest_blob)
                
            except Exception as e:
                print(f"Polling iteration failed: {e}")

            # Add Jitter: Wait 5 mins +/- 30 seconds for horizontal scaling to spread API load
            jitter = random.uniform(-30, 30)
            time.sleep(base_interval + jitter)
        
    def trigger_model_update(self, gcs_blob_name):
        # Phase 1: Background Work
        # This downloads and loads the model into a completely different memory address
        local_path = download_model(settings.GCS_BUCKET, gcs_blob_name)
        new_model_object = self.load_model_from_path(local_path)

        # Phase 2: The Swap
        # Incoming gRPC requests after this line use the new model.
        self.model = new_model_object
        old_path = self._current_local_path
        self._current_local_path = local_path

        # Phase 3: Cleanup
        # Delete the old local file to save disk space
        if old_path and os.path.exists(old_path):
            os.remove(old_path)
        
        print(f"Successfully swapped to {gcs_blob_name}")

    def load_model_from_path(self, local_path):
        try:
            # Create the architecture shell
            new_model = resnet18(weights=None)
            num_ftrs = new_model.fc.in_features
            new_model.fc = nn.Linear(num_ftrs, 10)
            
            # Load the weights into this specific instance
            state_dict = torch.load(local_path, map_location=torch.device('cpu'))
            new_model.load_state_dict(state_dict)
            
            # Prepare for inference
            new_model.eval()
            
            return new_model
        
        except Exception as e:
            print(f"Error loading model from {local_path}: {e}")
            # Clean up the temp file if loading fails
            if os.path.exists(local_path):
                os.remove(local_path)
            raise

    def predict(self, image_bytes: bytes):
        # Create a local reference to the model to avoid issues during model swap
        model_ref = self.model

        #Preprocess image
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        input_tensor = self.preprocess(image).unsqueeze(0)

        # Perform inference
        with torch.no_grad():
            output = model_ref(input_tensor)
        
        # Get prediction
        probabilities = torch.nn.functional.softmax(output[0], dim=0)
        class_id = torch.argmax(probabilities).item()
        confidence = probabilities[class_id].item()
        label = self.labels[class_id]

        return class_id, confidence, label

model_service = ResNetService()