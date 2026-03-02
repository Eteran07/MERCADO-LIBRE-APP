import google.generativeai as genai
from google.api_core import exceptions as google_exceptions
import json
import os
import time
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("No se encontró la clave GEMINI_API_KEY en el archivo .env")

genai.configure(api_key=api_key)

MODELOS_DISPONIBLES = [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-flash-latest',
]

MAX_REINTENTOS = 3
REINTENTO_BASE_DELAY = 2

def crear_modelo(modelo_nombre: str):
    return genai.GenerativeModel(modelo_nombre)

def limpiar_json_response(texto: str) -> str:
    texto = texto.strip()
    # Usar chr para evitar problemas con los backticks
    backtick = chr(96)
    marker_json = backtick * 3 + "json"
    marker_close = backtick * 3
    
    if texto.startswith(marker_json):
        texto = texto[len(marker_json):]
    if texto.startswith(marker_close):
        texto = texto[len(marker_close):]
    if texto.endswith(marker_close):
        texto = texto[:-len(marker_close)]
    return texto.strip()

def generar_con_reintentos(prompt: str, modelo_nombre: str = None) -> dict:
    if modelo_nombre is None:
        modelo_nombre = MODELOS_DISPONIBLES[0]
    
    modelos_a_probar = MODELOS_DISPONIBLES[MODELOS_DISPONIBLES.index(modelo_nombre):] if modelo_nombre in MODELOS_DISPONIBLES else MODELOS_DISPONIBLES
    
    ultimo_error = None
    
    for modelo_actual in modelos_a_probar:
        model = crear_modelo(modelo_actual)
        
        for intento in range(MAX_REINTENTOS):
            try:
                print(f"Intentando con modelo: {modelo_actual} (intento {intento + 1}/{MAX_REINTENTOS})")
                response = model.generate_content(prompt)
                print(f"Exito con modelo: {modelo_actual}")
                return {
                    'modelo_usado': modelo_actual,
                    'response': response
                }
                
            except google_exceptions.ResourceExhausted as e:
                print(f"Cuota agotada para {modelo_actual}")
                ultimo_error = {
                    'tipo': 'CUOTA_AGOTADA',
                    'mensaje': 'Has exceeded your current quota.',
                    'modelo': modelo_actual,
                    'siguiente_accion': 'Cambiando de modelo...' if len(modelos_a_probar) > 1 else 'No hay mas modelos disponibles'
                }
                
                if len(modelos_a_probar) > 1:
                    break
                else:
                    if intento < MAX_REINTENTOS - 1:
                        time.sleep(5)
                        continue
                    else:
                        raise Exception("Cuota agotada y sin modelos alternativos disponibles")
                        
            except google_exceptions.RetryError as e:
                print(f"Error de conexion (intento {intento + 1})")
                if intento < MAX_REINTENTOS - 1:
                    delay = REINTENTO_BASE_DELAY * (2 ** intento)
                    print(f"Esperando {delay} segundos...")
                    time.sleep(delay)
                    continue
                    
            except Exception as e:
                print(f"Error inesperado: {str(e)[:200]}")
                raise Exception(f"Error al procesar solicitud: {str(e)}")
    
    raise Exception(f"Error de cuota: {ultimo_error}")

def optimize_listing(titulo: str, descripcion: str, categoria: str) -> dict:
    prompt = f"""
    Eres un experto en SEO y posicionamiento en Mercado Libre. 
    Tu objetivo es optimizar publicaciones para aumentar la conversion.
    
    Reglas de Mercado Libre:
    - Titulo: Maximo 60 caracteres. Debe incluir Producto + Marca + Modelo + Especificacion principal.
    - Descripcion: Texto plano, sin HTML. Clara y estructurada.
    
    Datos actuales:
    - Categoria sugerida: {categoria}
    - Titulo: {titulo}
    - Descripcion: {descripcion}
    
    Devuelve UNICAMENTE un objeto JSON valido:
    {{
        "nuevo_titulo": "...",
        "nueva_descripcion": "...",
        "sugerencias_adicionales": "..."
    }}
    """
    
    try:
        resultado = generar_con_reintentos(prompt)
        raw_text = limpiar_json_response(resultado['response'].text)
        
        print(f"\n=== RESPUESTA DE GEMINI ===")
        print(raw_text[:500] + "..." if len(raw_text) > 500 else raw_text)
        print("===========================\n")
        
        respuesta_json = json.loads(raw_text)
        respuesta_json['_modelo_usado'] = resultado.get('modelo_usado', 'unknown')
        return respuesta_json
        
    except Exception as e:
        return {
            "error": "Error de API de Gemini",
            "details": str(e),
            "tipo": "CUOTA_AGOTADA" if "cuota" in str(e).lower() else "ERROR_GENERAL",
            "solucion": "Espera hasta manana para el reset de cuota, o usa una nueva API key"
        }

def procesar_fila_inteligente(datos_fila: dict, comando_usuario: str) -> dict:
    prompt = f"""
    Eres un experto en e-commerce y Mercado Libre.
    Datos del producto en JSON: {json.dumps(datos_fila, ensure_ascii=False)}
    Instruccion: {comando_usuario}
    
    Devuelve solo JSON con los campos modificados. Ejemplo: {{"Color": "Negro", "Marca": "Sony"}}
    """
    
    try:
        resultado = generar_con_reintentos(prompt)
        raw_text = limpiar_json_response(resultado['response'].text)
        
        print(f"\n=== RESPUESTA DE GEMINI ===")
        print(raw_text)
        print("===========================\n")
        
        respuesta_json = json.loads(raw_text)
        respuesta_json['_modelo_usado'] = resultado.get('modelo_usado', 'unknown')
        return respuesta_json
        
    except Exception as e:
        return {"error": "Error de API de Gemini", "details": str(e)}

def procesar_lote_inteligente(filas: list, comando_usuario: str) -> dict:
    prompt = f"""
    Eres un experto en bases de datos para Mercado Libre.
    Tienes {len(filas)} productos. Cada uno tiene id_fila y datos.
    
    Productos: {json.dumps(filas, ensure_ascii=False)}
    Instruccion: {comando_usuario}
    
    Devuelve un arreglo JSON con: [{{"id_fila": 0, "datos_actualizados": {{...}}}}]
    """
    
    try:
        resultado = generar_con_reintentos(prompt)
        raw_text = limpiar_json_response(resultado['response'].text)
        
        print(f"\n=== RESPUESTA GEMINI ({len(filas)} FILAS) ===")
        print(raw_text[:500] + "..." if len(raw_text) > 500 else raw_text)
        print("========================================================\n")
        
        return {"resultados": json.loads(raw_text), "_modelo_usado": resultado.get('modelo_usado', 'unknown')}
            
    except Exception as e:
        return {"error": "Error de API de Gemini", "details": str(e)}

def verificar_estado_api() -> dict:
    try:
        model = crear_modelo(MODELOS_DISPONIBLES[0])
        model.generate_content("Hello")
        return {
            "estado": "OK",
            "mensaje": "API funcionando correctamente",
            "modelo_principal": MODELOS_DISPONIBLES[0]
        }
    except google_exceptions.ResourceExhausted:
        return {
            "estado": "CUOTA_AGOTADA",
            "mensaje": "Has exceeded your daily quota.",
            "modelo_principal": MODELOS_DISPONIBLES[0],
            "modelos_alternativos": MODELOS_DISPONIBLES[1:]
        }
    except Exception as e:
        return {
            "estado": "ERROR",
            "mensaje": str(e),
            "modelo_principal": MODELOS_DISPONIBLES[0]
        }
