from fastapi import FastAPI
from app.api.routes import router
from app.services.model_service import model_service
from app.core.config import settings
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],           
    allow_credentials=True,
    allow_methods=["*"],              
    allow_headers=["*"],              
)

@app.on_event("startup")
async def startup_event():
    # Load model once when server starts
    model_service.load_model()

app.include_router(router)


@app.get('/')
async def hello_world():
    return {"message": "Hello World"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)