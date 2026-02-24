import google.generativeai as genai

# Pon tu clave real aquí
genai.configure(api_key="AIzaSyAgHBUcZlViWmtrA1efOKkj-7P1ezeh2tM")

print("Consultando modelos disponibles...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
    print("¡Consulta finalizada!")
except Exception as e:
    print(f"Error al consultar: {e}")