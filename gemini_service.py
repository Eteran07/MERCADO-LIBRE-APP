import os
import google.generativeai as genai
import json

# Configurar la API Key de Gemini (Asegúrate de tenerla en tus variables de entorno)
genai.configure(api_key=os.environ.get("AIzaSyCeUocQANm9ddwtK1ADwxnJF3tpHVChTaI"))

# Usamos el modelo flash por su rapidez, ideal para asistentes en tiempo real
model = genai.GenerativeModel('gemini-1.5-flash')

def optimize_listing(titulo: str, descripcion: str, categoria: str) -> dict:
    prompt = f"""
    Eres un experto en SEO y posicionamiento en Mercado Libre. 
    Tu objetivo es optimizar publicaciones para aumentar la conversión.
    
    Reglas de Mercado Libre:
    - Título: Máximo 60 caracteres. Debe incluir Producto + Marca + Modelo + Especificación principal. Nada de "Envío gratis" o "Oferta".
    - Descripción: Texto plano, sin HTML. Clara, estructurada, enfocada en los beneficios y características técnicas.
    
    Datos actuales:
    - Categoría sugerida: {categoria}
    - Título: {titulo}
    - Descripción: {descripcion}
    
    Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura, sin formato markdown extra:
    {{
        "nuevo_titulo": "...",
        "nueva_descripcion": "...",
        "sugerencias_adicionales": "..."
    }}
    """
    
    response = model.generate_content(prompt)
    
    try:
        # Limpiar la respuesta por si Gemini incluye bloques de código markdown
        raw_text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(raw_text)
    except Exception as e:
        return {"error": "No se pudo procesar la respuesta de la IA", "details": str(e)}