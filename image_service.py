import os
import requests
from io import BytesIO
from PIL import Image

# Carpeta principal donde se guardarán las fotos
BASE_IMG_DIR = "C:/MercadoLibre_Imagenes" 

def procesar_imagen_estandar(url_imagen: str, sku: str, categoria: str, nombre_hoja: str) -> dict:
    """
    Descarga, redimensiona a 500x500 con fondo blanco y guarda la imagen
    en una estructura de carpetas: BASE / NOMBRE_HOJA / CATEGORIA / SKU.jpg
    """
    try:
        # 1. Descargar la imagen
        response = requests.get(url_imagen, timeout=10)
        response.raise_for_status()
        
        # 2. Procesamiento de imagen con PIL
        img_original = Image.open(BytesIO(response.content)).convert("RGBA")

        # Crear lienzo blanco de 500x500
        lienzo_blanco = Image.new("RGBA", (500, 500), (255, 255, 255, 255))

        # Redimensionar producto a 450x450 (mantiene proporciones y deja margen)
        img_original.thumbnail((450, 450), Image.Resampling.LANCZOS)

        # Calcular el centro para pegar la imagen
        x = (500 - img_original.width) // 2
        y = (500 - img_original.height) // 2

        # Pegar la imagen en el lienzo blanco
        lienzo_blanco.paste(img_original, (x, y), img_original)

        # Convertir a RGB (necesario para guardar como JPEG)
        imagen_final = lienzo_blanco.convert("RGB")

        # 3. Gestión de Carpetas Dinámicas
        # Limpiamos los nombres de caracteres que Windows no permite en carpetas (\ / : * ? " < > |)
        def limpiar_nombre(texto):
            return "".join(c for c in texto if c.isalnum() or c in " -_").strip()

        hoja_limpia = limpiar_nombre(nombre_hoja)
        categoria_limpia = limpiar_nombre(categoria)
        sku_limpio = limpiar_nombre(sku)

        # Estructura: C:/MercadoLibre_Imagenes / NombreDeLaHoja / Categoria
        ruta_carpeta = os.path.join(BASE_IMG_DIR, hoja_limpia, categoria_limpia)
        
        # Crear la ruta si no existe (incluyendo carpetas padres)
        os.makedirs(ruta_carpeta, exist_ok=True)

        # Ruta final del archivo
        ruta_archivo = os.path.join(ruta_carpeta, f"{sku_limpio}.jpg")
        
        # 4. Guardar imagen
        imagen_final.save(ruta_archivo, "JPEG", quality=95)

        print(f"✅ Imagen guardada en: {ruta_archivo}")
        return {"estado": "OK", "ruta": ruta_archivo}

    except Exception as e:
        print(f"❌ Error procesando imagen: {str(e)}")
        return {"estado": "ERROR", "mensaje": str(e)}