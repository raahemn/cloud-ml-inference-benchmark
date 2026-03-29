fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_build::configure().compile_protos(&["proto/inference.proto"], &["proto"])?;
    println!("cargo:rerun-if-changed=proto/inference.proto");
    Ok(())
}
