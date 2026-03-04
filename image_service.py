import os
import requests
from io import BytesIO
from PIL import Image

# Carpeta principal donde se guardarán las fotos
BASE_IMG_DIR = "C:/MercadoLibre_Imagenes" 

def procesar_imagen_estandar(url_imagen: str, sku: str, categoria: str) -> dict:
    try:
        response = requests.get(url_imagen, timeout=10)
        response.raise_for_status()
        
        # Forzar formato RGBA
        img_original = Image.open(BytesIO(response.content)).convert("RGBA")

        # Crear lienzo blanco de 500x500
        lienzo_blanco = Image.new("RGBA", (500, 500), (255, 255, 255, 255))

        # Redimensionar producto a 450x450 (deja margen)
        img_original.thumbnail((450, 450), Image.Resampling.LANCZOS)

        # Calcular el centro
        x = (500 - img_original.width) // 2
        y = (500 - img_original.height) // 2

        # Pegar en el centro
        lienzo_blanco.paste(img_original, (x, y), img_original)

        # Convertir a RGB (JPG no soporta transparencia)
        imagen_final = lienzo_blanco.convert("RGB")

        # Crear carpetas
        categoria_limpia = "".join(c for c in categoria if c.isalnum() or c in " -_").strip()
        ruta_carpeta = os.path.join(BASE_IMG_DIR, categoria_limpia)
        os.makedirs(ruta_carpeta, exist_ok=True)

        ruta_archivo = os.path.join(ruta_carpeta, f"{sku}.jpg")
        
        # Guardar imagen
        imagen_final.save(ruta_archivo, "JPEG", quality=95)

        return {"estado": "OK", "ruta": ruta_archivo}

    except Exception as e:
        return {"estado": "ERROR", "mensaje": str(e)}