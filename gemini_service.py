import google.generativeai as genai
import json
import os
from dotenv import load_dotenv

# Carga las variables desde el archivo .env
load_dotenv()

# Recupera la clave de forma segura
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("No se encontró la clave GEMINI_API_KEY en el archivo .env")

# Configuración usando la variable de entorno
genai.configure(api_key=api_key)

# El resto del código permanece igual
model = genai.GenerativeModel('gemini-2.5-flash')

def optimize_listing(titulo: str, descripcion: str, categoria: str) -> dict:
    # ... aquí sigue tu función optimize_listing sin cambios ...
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
        raw_text = response.text.replace("```json", "").replace("```", "").strip()
        
        # Agregamos esto para ver exactamente qué respondió Gemini en la terminal
        print("\n=== RESPUESTA DE GEMINI ===")
        print(raw_text)
        print("===========================\n")
        
        return json.loads(raw_text)
    except Exception as e:
        return {"error": "No se pudo procesar la respuesta de la IA", "details": str(e)}
    
    
def procesar_fila_inteligente(datos_fila: dict, comando_usuario: str) -> dict:
    prompt = f"""
    Eres un experto en e-commerce y bases de datos para Mercado Libre.
    Aquí tienes los datos actuales de un producto en formato JSON extraídos de Excel:
    {json.dumps(datos_fila, ensure_ascii=False)}
    
    Instrucción del usuario: "{comando_usuario}"
    
    TAREAS:
    1. Analiza la instrucción del usuario y aplícala a los datos.
    2. Si el usuario pide completar características, usa el valor de la columna 'SKU' u otras referencias para buscar en tu conocimiento general y llenar los campos vacíos (como Color, Marca, Modelo, etc.).
    3. Devuelve ÚNICAMENTE un objeto JSON válido con las columnas que fueron modificadas o llenadas. No devuelvas las columnas que no tocaste.
    4. El formato debe ser estrictamente JSON, sin formato markdown extra (sin ```json).
    
    Ejemplo de salida esperado: {{"Color": "Negro", "Marca": "Sony"}}
    """
    
    response = model.generate_content(prompt)
    
    try:
        raw_text = response.text.replace("```json", "").replace("```", "").strip()
        
        print("\n=== RESPUESTA DE GEMINI (SMART EDIT) ===")
        print(raw_text)
        print("========================================\n")
        
        return json.loads(raw_text)
    except Exception as e:
        return {"error": "No se pudo procesar la respuesta de la IA", "details": str(e)}
    
    