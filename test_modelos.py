import os
from dotenv import load_dotenv
import google.generativeai as genai

# 1. Cargar las variables ocultas del archivo .env
load_dotenv()

# 2. Leer la clave de forma segura
api_key = os.getenv("GEMINI_API_KEY")

# 3. Configurar Gemini
genai.configure(api_key=api_key)

print("Consultando modelos disponibles...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
    print("¡Consulta finalizada!")
except Exception as e:
    print(f"Error al consultar: {e}")
    