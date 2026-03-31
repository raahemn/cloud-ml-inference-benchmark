use opentelemetry::global;
use opentelemetry::trace::TracerProvider as _;
use opentelemetry::{KeyValue, Value};
use opentelemetry_otlp::{Protocol, SpanExporter, WithExportConfig};
use opentelemetry_sdk::runtime::Tokio;
use opentelemetry_sdk::trace::{BatchSpanProcessor, TracerProvider};
use opentelemetry_sdk::Resource;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::{fmt, EnvFilter, Registry};

pub fn init(
    service_name: &str,
) -> Result<TelemetryGuard, Box<dyn std::error::Error + Send + Sync>> {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,actix_web=info,tonic=info"));

    let fmt_layer = fmt::layer().with_target(true).with_thread_ids(false);

    if let Some(endpoint) = std::env::var("OTEL_EXPORTER_OTLP_ENDPOINT")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
    {
        let exporter = SpanExporter::builder()
            .with_tonic()
            .with_endpoint(endpoint)
            .with_protocol(Protocol::Grpc)
            .build()?;

        let resource = Resource::new([
            KeyValue::new("service.name", service_name.to_string()),
            KeyValue::new("service.version", env!("CARGO_PKG_VERSION").to_string()),
            KeyValue::new("deployment.environment", deployment_environment()),
        ]);

        let provider = TracerProvider::builder()
            .with_span_processor(BatchSpanProcessor::builder(exporter, Tokio).build())
            .with_resource(resource)
            .build();

        let tracer = provider.tracer(service_name.to_string());
        global::set_tracer_provider(provider.clone());

        let telemetry_layer = tracing_opentelemetry::layer().with_tracer(tracer);
        let subscriber = Registry::default()
            .with(env_filter)
            .with(fmt_layer)
            .with(telemetry_layer);

        tracing::subscriber::set_global_default(subscriber)?;

        Ok(TelemetryGuard {
            tracer_provider: Some(provider),
        })
    } else {
        let subscriber = Registry::default().with(env_filter).with(fmt_layer);
        tracing::subscriber::set_global_default(subscriber)?;

        Ok(TelemetryGuard {
            tracer_provider: None,
        })
    }
}

fn deployment_environment() -> Value {
    std::env::var("OTEL_SERVICE_ENV")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "unknown".to_string())
        .into()
}

pub struct TelemetryGuard {
    tracer_provider: Option<TracerProvider>,
}

impl Drop for TelemetryGuard {
    fn drop(&mut self) {
        if let Some(provider) = self.tracer_provider.take() {
            let _ = provider.shutdown();
        }
    }
}
