import io
import torch
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image
import pillow_avif
from torchvision.models import resnet18
from app.core.config import settings
from app.infrastructure.gcs_utils import download_model, get_latest_model_blob
import threading
from google.cloud import pubsub_v1

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

        # 1. COLD START: Load the initial model synchronously
        print("Starting initial model bootstrap...")
        self.bootstrap_model()

        # 2. FUTURE UPDATES: Start the background listener
        print("Starting background update listener...")
        # self._start_subscriber()


    def bootstrap_model(self):
        """Finds and loads the latest model. Blocks until complete."""
        try:
            latest_blob_name = get_latest_model_blob(settings.GCS_BUCKET)
            
            if not latest_blob_name:
                raise Exception("No model files found in GCS bucket!")

            local_path = download_model(settings.GCS_BUCKET, latest_blob_name)
            self.model = self.load_model_from_path(local_path)
            
            print(f"Bootstrap complete. Serving from: {local_path}")
        except Exception as e:
            print(f"CRITICAL: Bootstrap failed: {e}")
            raise e


    def _start_subscriber(self):
        """Spawns the background thread to listen for new models."""
        subscriber_thread = threading.Thread(target=self._listen_for_updates, daemon=True)
        subscriber_thread.start()


    def _listen_for_updates(self):
        subscriber = pubsub_v1.SubscriberClient()
        # This is the 'model-deployments' subscription
        subscription_path = subscriber.subscription_path(settings.PROJECT_ID, settings.MODEL_UPDATES_SUB)

        def callback(message):
            try:
                blob_name = message.attributes.get("objectId")
                
                if blob_name and blob_name.endswith(".pth"):
                    print(f"Update detected: {blob_name}. Starting warm swap...")
                    self.trigger_model_update(blob_name)
                
                message.ack()
            except Exception as e:
                print(f"Failed to process update message: {e}")

        # Limit to 1 message at a time to prevent memory spikes during swap
        flow_control = pubsub_v1.types.FlowControl(max_messages=1)
        streaming_pull_future = subscriber.subscribe(
            subscription_path, callback=callback, flow_control=flow_control
        )
        
        print(f"Listening for model updates on {subscription_path}...")
        try:
            streaming_pull_future.result()
        except Exception as e:
            streaming_pull_future.cancel()
            print(f"Subscriber error: {e}")

    def trigger_model_update(self, gcs_blob_name):
        # Phase 1: Background Work
        # This downloads and loads the model into a completely different memory address
        local_path = download_model(settings.GCS_BUCKET, gcs_blob_name)
        new_model_object = self.load_model_from_path(local_path)

        # Phase 2: The Swap
        # Incoming gRPC requests after this line use the new model.
        self.model = new_model_object

        # Phase 3: Cleanup
        # Delete the old local file to save disk space

        
        print(f"Successfully swapped to {gcs_blob_name}")


    def load_model(self):
        try:
            # Download the model from GCS
            download_model(
                settings.GCS_BUCKET,
                settings.GCS_MODEL_PATH,
                settings.LOCAL_MODEL_PATH
            )

            # Create the shell
            self.model = resnet18(weights=None)
            
            # Customize to 10 classes
            num_ftrs = self.model.fc.in_features
            self.model.fc = nn.Linear(num_ftrs, 10)
            
            # Load the weights
            state_dict = torch.load(settings.LOCAL_MODEL_PATH, map_location=torch.device('cpu'))
            self.model.load_state_dict(state_dict)
            
            # Set to evaluation mode
            self.model.eval()
            print(f"Successfully loaded custom model from {settings.LOCAL_MODEL_PATH}")
            
        except FileNotFoundError:
            print(f"Error: Model file not found at {settings.LOCAL_MODEL_PATH}")
            raise
        except Exception as e:
            print(f"Error loading model: {e}")
            raise


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
            
            print(f"Model at {local_path} is ready for swap.")
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