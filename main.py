from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import gemini_service

# Importamos solo los modelos que existen actualmente en models.py
from models import ListingRequest, ListingResponse, SmartBatchRequest, SmartBatchResponse

app = FastAPI(title="ML Excel Assistant API")

# Habilitar CORS para que el Add-in de Excel (Frontend) pueda comunicarse
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False, # <-- ESTO ES VITAL QUE SEA FALSE
    allow_methods=["*"],
    allow_headers=["*"],
)

# === 1. RUTA CLÁSICA (Optimizar Título/Desc) ===
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


# === 2. NUEVA RUTA MASIVA (Lotes/Batch) ===
@app.post("/api/smart-edit-bulk", response_model=SmartBatchResponse)
async def smart_edit_bulk_endpoint(request: SmartBatchRequest):
    # Convertimos los modelos a diccionarios normales para enviarlos a Gemini
    filas_dict = [{"id_fila": f.id_fila, "datos": f.datos} for f in request.filas]
    
    result = gemini_service.procesar_lote_inteligente(filas_dict, request.comando_usuario)
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
        
    return SmartBatchResponse(resultados=result["resultados"])


# === 3. RUTA DE ESTADO DE API (Verificar cuota) ===
@app.get("/api/status")
async def status_endpoint():
    """
    Verifica el estado de la API de Gemini y la cuota disponible
    """
    estado = gemini_service.verificar_estado_api()
    
    if estado["estado"] == "CUOTA_AGOTADA":
        raise HTTPException(
            status_code=429, 
            detail={
                "mensaje": "Cuota de API agotada",
                "estado": "CUOTA_AGOTADA",
                "modelo_principal": estado["modelo_principal"],
                "modelos_alternativos": estado.get("modelos_alternativos", []),
                "solucion": "Espera hasta manana para el reset de cuota, o usa una nueva API key"
            }
        )
    elif estado["estado"] == "ERROR":
        raise HTTPException(status_code=500, detail=estado)
    
    return {
        "estado": "OK",
        "mensaje": "API funcionando correctamente",
        "modelo": estado["modelo_principal"]
    }


# === ARRANQUE DEL SERVIDOR ===
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