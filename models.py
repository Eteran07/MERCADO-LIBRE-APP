from pydantic import BaseModel

class ListingRequest(BaseModel):
    titulo_actual: str
    descripcion_actual: str
    categoria: str = "General" # Opcional, extraído de la plantilla

class ListingResponse(BaseModel):
    nuevo_titulo: str
    nueva_descripcion: str
    sugerencias_adicionales: str