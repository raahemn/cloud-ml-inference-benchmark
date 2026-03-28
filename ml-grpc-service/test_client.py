import grpc
import inference_pb2
import inference_pb2_grpc

def run():
    # Load image
    with open("/Users/raahemnabeel/Downloads/131019910.jpg.avif", "rb") as f:
        image_bytes = f.read()

    # Connect to server
    channel = grpc.insecure_channel("localhost:50051")

    # Create stub (client)
    stub = inference_pb2_grpc.ModelInferenceStub(channel)

    # Create request
    request = inference_pb2.PredictRequest(image_data=image_bytes)

    # Call RPC
    response = stub.Predict(request)

    print("\n--- RESPONSE ---")
    print(f"Class ID: {response.class_id}")
    print(f"Confidence: {response.confidence}")
    print(f"Label: {response.label}")


if __name__ == "__main__":
    run()