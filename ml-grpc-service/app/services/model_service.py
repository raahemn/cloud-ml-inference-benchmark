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
from app.core.telemetry import get_tracer
from app.infrastructure.gcs_utils import get_latest_model_blob, fetch_model_bytes
import threading
import os

tracer = get_tracer(__name__)

class ResNetService:
    def __init__(self):
        self.model = None
        self._current_model_blob = None
        
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
        with tracer.start_as_current_span("grpc_model.bootstrap_model") as span:
            try:
                latest_blob_name = get_latest_model_blob(settings.GCS_BUCKET)
                
                if not latest_blob_name:
                    raise Exception("No model files found in GCS bucket!")

                span.set_attribute("gcs.model_blob", latest_blob_name)

                # Load from GCS directly to RAM
                model_buffer = fetch_model_bytes(settings.GCS_BUCKET, latest_blob_name)
                
                self.model = self.load_model_from_stream(model_buffer)
                self._current_model_blob = latest_blob_name

                print(f"Bootstrap complete. Model loaded in memory: {latest_blob_name}")
            except Exception as e:
                span.record_exception(e)
                span.set_attribute("error", True)
                print(f"CRITICAL: Bootstrap failed: {e}")
                raise e

    def _start_polling_worker(self):
        """Spawns a daemon thread to check for model updates every few minutes."""
        def low_priority_wrapper():
            try:
                os.nice(10)     # Makes our thread a low priority so we dont compromise inference
            except AttributeError:
                pass
            self._run_polling_loop()

        thread = threading.Thread(target=low_priority_wrapper, daemon=True)
        thread.start()
        
    def _run_polling_loop(self):
        """
        The background loop. 
        Uses 'jitter' to prevent all horizontally scaled instances 
        from hitting GCS at the exact same millisecond.
        """
        # Poll every 5 minutes by default
        base_interval = settings.INTERVAL
        
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
        """Downloads weights into RAM and swaps the live model reference."""
        with tracer.start_as_current_span("grpc_model.trigger_model_update") as span:
            span.set_attribute("gcs.model_blob", gcs_blob_name)
            try:
                # Phase 1: Background Work (Network to RAM)
                model_buffer = fetch_model_bytes(settings.GCS_BUCKET, gcs_blob_name)
                new_model_object = self.load_model_from_stream(model_buffer)

                # Phase 2: The Swap
                self.model = new_model_object
                self._current_model_blob = gcs_blob_name

                print(f"Successfully swapped to {gcs_blob_name} in memory.")
            except Exception as e:
                span.record_exception(e)
                span.set_attribute("error", True)
                print(f"Background update failed: {e}")

    def load_model_from_stream(self, model_stream):
        """
        Instantiates the ResNet shell and loads weights from a memory stream.
        """
        with tracer.start_as_current_span("grpc_model.load_model_from_stream") as span:
            try:
                # Create the architecture shell
                new_model = resnet18(weights=None)
                num_ftrs = new_model.fc.in_features
                new_model.fc = nn.Linear(num_ftrs, 10)
                
                state_dict = torch.load(model_stream, map_location=torch.device('cpu'))
                new_model.load_state_dict(state_dict)
                
                # Prepare for inference
                new_model.eval()
                
                return new_model
            except Exception as e:
                span.record_exception(e)
                span.set_attribute("error", True)
                print(f"Error loading model from memory stream: {e}")
                raise

    def predict(self, image_bytes: bytes):
        with tracer.start_as_current_span("grpc_model.run_inference") as span:
            span.set_attribute("request.image_bytes", len(image_bytes))
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
            span.set_attribute("prediction.class_id", class_id)
            span.set_attribute("prediction.label", label)

            return class_id, confidence, label

model_service = ResNetService()
