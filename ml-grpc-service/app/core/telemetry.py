import os

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.grpc import GrpcInstrumentorServer
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor


def setup_telemetry(service_name: str):
    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "").strip()
    if not endpoint:
        return None

    configured_service_name = os.getenv("OTEL_SERVICE_NAME", "").strip() or service_name

    resource = Resource.create(
        {
            "service.name": configured_service_name,
            "deployment.environment": os.getenv("OTEL_SERVICE_ENV", "unknown"),
        }
    )
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(
                endpoint=endpoint,
                insecure=endpoint.startswith("http://"),
            )
        )
    )
    trace.set_tracer_provider(provider)
    GrpcInstrumentorServer().instrument()
    return provider


def get_tracer(name: str):
    return trace.get_tracer(name)
