from pydantic import BaseModel
from typing import Dict, Any, List, Optional

# Modelo para el botón de Optimizar Título/Desc
class ListingRequest(BaseModel):
    titulo_actual: str
    descripcion_actual: str
    categoria: str = "General"

class ListingResponse(BaseModel):
    nuevo_titulo: str
    nueva_descripcion: str
    sugerencias_adicionales: str

# Modelo para el Chat Masivo (Lotes)
class FilaBatch(BaseModel):
    id_fila: int
    datos: Dict[str, Any]

class SmartBatchRequest(BaseModel):
    filas: List[FilaBatch]
    comando_usuario: str

class ResultadoBatch(BaseModel):
    id_fila: int
    datos_actualizados: Dict[str, Any]

class SmartBatchResponse(BaseModel):
    resultados: List[ResultadoBatch]