import grpc
import os
from concurrent import futures

from app.proto import inference_pb2
from app.proto import inference_pb2_grpc

from app.services.model_service import model_service


class ModelInferenceServicer(inference_pb2_grpc.ModelInferenceServicer):

    def Predict(self, request, context):
        try:
            image_bytes = request.image_data

            #basic validation
            if len(image_bytes) == 0:
                context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                context.set_details("Empty image")
                return inference_pb2.PredictResponse()

            class_id, confidence, label = model_service.predict(image_bytes)

            print("Sending response successfully!", class_id, confidence, label)
            return inference_pb2.PredictResponse(
                class_id=class_id,
                confidence=confidence,
                label=label
            )

        except Exception as e:
            print(f"Prediction failed: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details("Inference error")
            return inference_pb2.PredictResponse()


def serve():
    port = int(os.getenv("PORT", "50051"))
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=4))     #set equivalent to no. of CPU cores

    inference_pb2_grpc.add_ModelInferenceServicer_to_server(
        ModelInferenceServicer(), server
    )

    server.add_insecure_port(f'[::]:{port}')  # Cloud Run injects PORT; local runs can still use 50051.
    server.start()
    print(f"gRPC Model Server running on port {port}")

    server.wait_for_termination()
