from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import ListingRequest, ListingResponse
import gemini_service

app = FastAPI(title="ML Excel Assistant API")

# Habilitar CORS para que el Add-in de Excel (Frontend) pueda comunicarse
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False, # <-- ESTO ES VITAL QUE SEA FALSE
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/optimize", response_model=ListingResponse)
async def optimize_endpoint(request: ListingRequest):
    result = gemini_service.optimize_listing(
        request.titulo_actual, 
        request.descripcion_actual, 
        request.categoria
    )
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
        
    return ListingResponse(**result)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)