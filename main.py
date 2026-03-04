from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import uvicorn

# Importaciones de tus servicios
import gemini_service
from google_search_service import buscar_imagen
# CORRECCIÓN 1: El nombre correcto de tu función
from image_service import procesar_imagen_estandar

# Importamos los modelos
from models import ListingRequest, ListingResponse, SmartBatchRequest, SmartBatchResponse, ImageFetchRequest

# ==========================================
# NUEVOS MODELOS DE DATOS PARA IMÁGENES
# ==========================================
class ImageRequest(BaseModel):
    sku: str
    titulo: str
    categoria: str

class SeleccionImagenRequest(BaseModel):
    url_imagen: str
    sku: str
    categoria: str # <-- CORRECCIÓN 2: Añadido para que la foto se guarde en la carpeta correcta


# ========================================================
# 1. DEFINIMOS LA APLICACIÓN
# ========================================================
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
                "solucion": "Espera hasta mañana para el reset de cuota, o usa una nueva API key"
            }
        )
    elif estado["estado"] == "ERROR":
        raise HTTPException(status_code=500, detail=estado)
    
    return {
        "estado": "OK",
        "mensaje": "API funcionando correctamente",
        "modelo": estado["modelo_principal"]
    }


# === 4. RUTAS DE IMÁGENES (DuckDuckGo - 4 Opciones) ===
@app.post("/api/fetch-images")
async def fetch_images_options(request: ImageRequest):
    """Paso 1: Busca opciones y se las muestra al usuario en Excel"""
    termino = f"{request.titulo} {request.sku}"
    opciones_urls = buscar_imagen(termino)
    
    if not opciones_urls:
        raise HTTPException(status_code=404, detail="No se encontraron imágenes para este producto.")
        
    return {"opciones": opciones_urls}

@app.post("/api/download-selected-image")
async def download_selected(request: SeleccionImagenRequest):
    """Paso 2: Descarga la imagen que el usuario eligió y la guarda a 500x500"""
    try:
        # CORRECCIÓN 3: Ajustado para usar el nombre correcto y pasar la categoría
        resultado = procesar_imagen_estandar(request.url_imagen, request.sku, request.categoria)
        
        if resultado["estado"] == "OK":
            return {"mensaje": "Imagen procesada y guardada con éxito", "ruta": resultado["ruta"]}
        else:
            raise HTTPException(status_code=500, detail=resultado["mensaje"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar la imagen elegida: {str(e)}")


# === ARRANQUE DEL SERVIDOR ===
if __name__ == "__main__":
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