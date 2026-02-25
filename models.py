from pydantic import BaseModel
from typing import Dict, Any

# ==========================================
# MODELOS PARA EL MODO CLÁSICO (Originales)
# ==========================================
class ListingRequest(BaseModel):
    titulo_actual: str
    descripcion_actual: str
    categoria: str = "General" # Opcional, extraído de la plantilla

class ListingResponse(BaseModel):
    nuevo_titulo: str
    nueva_descripcion: str
    sugerencias_adicionales: str


# ==========================================
# MODELOS PARA EL MODO INTELIGENTE MASIVO (Nuevos)
# ==========================================
class SmartRowRequest(BaseModel):
    # Recibe toda la fila como un diccionario dinámico (Ej: {"SKU": "123", "Color": "", ...})
    datos_fila: Dict[str, Any]
    # Recibe lo que escribas en el nuevo buscador/chat
    comando_usuario: str

class SmartRowResponse(BaseModel):
    # Devuelve solo las columnas que la IA modificó
    datos_actualizados: Dict[str, Any]