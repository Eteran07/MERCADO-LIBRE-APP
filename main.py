from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import ListingRequest, ListingResponse
import gemini_service
from models import ListingRequest, ListingResponse, SmartRowRequest, SmartRowResponse # Asegúrate de importar los nuevos modelos

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

@app.post("/api/smart-edit", response_model=SmartRowResponse)
async def smart_edit_endpoint(request: SmartRowRequest):
    # Llamamos a la nueva función en gemini_service
    result = gemini_service.procesar_fila_inteligente(
        request.datos_fila,
        request.comando_usuario
    )
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
        
    return SmartRowResponse(datos_actualizados=result)

if __name__ == "__main__":
    import uvicorn
    import os

    # Rutas a los certificados generados por Office
    cert_path = r"C:\Users\Edgar\.office-addin-dev-certs\localhost.crt"
    key_path = r"C:\Users\Edgar\.office-addin-dev-certs\localhost.key"

    # Si los certificados existen, levantamos el servidor en HTTPS
    if os.path.exists(cert_path) and os.path.exists(key_path):
        print("🔒 Iniciando servidor de FastAPI con HTTPS...")
        uvicorn.run(app, host="0.0.0.0", port=8000, ssl_certfile=cert_path, ssl_keyfile=key_path)
    else:
        print("⚠️ Iniciando servidor con HTTP normal...")
        uvicorn.run(app, host="0.0.0.0", port=8000)