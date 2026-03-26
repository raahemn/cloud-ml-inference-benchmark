from pydantic import BaseModel

class PredictionResponse(BaseModel):
    class_id: int
    confidence: float
    label: str = "N/A" 
    status: str = "success"