import os
import requests
from dotenv import load_dotenv

# Esto carga las variables de tu archivo .env
load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_SEARCH_API_KEY") 
SEARCH_ENGINE_ID = os.getenv("GOOGLE_SEARCH_ENGINE_ID")

def buscar_imagen(termino_busqueda: str) -> str:
    # Verificamos que las claves existan para evitar errores silenciosos
    if not GOOGLE_API_KEY or not SEARCH_ENGINE_ID:
        raise ValueError("Faltan las credenciales de Google Search en el archivo .env")

    url = "https://www.googleapis.com/customsearch/v1"
    
    # Configuramos la búsqueda para que pida específicamente 1 sola imagen grande
    parametros = {
        "q": termino_busqueda,
        "cx": SEARCH_ENGINE_ID,
        "key": GOOGLE_API_KEY,
        "searchType": "image",
        "num": 1, 
        "imgSize": "large"
    }

    try:
        response = requests.get(url, params=parametros)
        response.raise_for_status()
        datos = response.json()

        # Extraemos el link directo de la primera imagen encontrada
        if "items" in datos and len(datos["items"]) > 0:
            return datos["items"][0]["link"]
        
        return None
        
    except Exception as e:
        print(f"Error al buscar en Google: {e}")
        return None