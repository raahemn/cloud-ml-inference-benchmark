from fastapi import APIRouter, File, UploadFile, HTTPException
from app.services.model_service import model_service
from app.schemas.response import PredictionResponse

router = APIRouter()

@router.post("/predict", response_model=PredictionResponse)
async def predict_image(file: UploadFile = File(...)):
    # Basic Validation
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail=f"File is {file.content_type}, not an image.")

    # Read bytes
    image_bytes = await file.read()
    
    # DEBUG: Check if bytes are actually arriving
    print(f"--- INCOMING REQUEST ---")
    print(f"Filename: {file.filename}")
    print(f"Byte count: {len(image_bytes)}") 

    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="The image file is empty.")

    try:
        class_id, confidence, label = await model_service.predict(image_bytes)
    except Exception as e:
        print(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail="Inference engine error.")

    print("Returning: ", label)
    
    # Return the full response
    return PredictionResponse(
        class_id=class_id,
        confidence=round(confidence, 4),
        label=label
    )