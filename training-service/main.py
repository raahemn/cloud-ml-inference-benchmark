import uuid
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from google.cloud import pubsub_v1
from config import settings
from utils import gcs
from trainer import ResNetTrainer

# Lock ensures we don't start two training jobs simultaneously
training_lock = threading.Lock()

def train_cycle():
    if training_lock.locked():
        return

    with training_lock:
        print("Checking queue count...")
        count = gcs.get_queue_count()
        print(f"Queue count: {count}")
        if count < settings.THRESHOLD:
            return

        batch_id = str(uuid.uuid4())[:8]
        print(f"--- Starting Fine-Tuning Batch: {batch_id} ---")

        try:
            # 1. Fetch Resources
            model_stream = gcs.fetch_latest_model_stream()
            gcs.download_training_data()

            # 2. Execute Training
            trainer = ResNetTrainer(model_stream)
            new_model_stream = trainer.run_finetuning()

            # 3. Persistence & Cleanup
            new_model_name = f"model_finetuned_{batch_id}.pth"
            gcs.upload_model_stream(new_model_stream, new_model_name)
            gcs.archive_data(batch_id)
            gcs.cleanup_local_data()
            
            print(f"--- Batch {batch_id} Successful. New model live. ---")

        except Exception as e:
            print(f"Training failed: {e}")

def callback(message):
    message.ack()
    train_cycle()

def run_subscriber():
    subscriber = pubsub_v1.SubscriberClient()
    sub_path = subscriber.subscription_path(settings.PROJECT_ID, settings.TRAINING_SUB)
    
    print(f"Training Service active. Watching {sub_path}...")
    future = subscriber.subscribe(sub_path, callback=callback)
    
    try:
        future.result()
    except KeyboardInterrupt:
        future.cancel()

class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            body = b'{"service":"training-service","status":"ok"}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        return

if __name__ == "__main__":
    subscriber_thread = threading.Thread(target=run_subscriber, daemon=True)
    subscriber_thread.start()

    server = ThreadingHTTPServer(("0.0.0.0", settings.PORT), HealthHandler)
    print(f"Training Service health endpoint listening on port {settings.PORT}...")
    server.serve_forever()
