from ddgs import DDGS
import time

def buscar_imagen(termino_busqueda: str) -> list:
    # 1. Limpieza de seguridad para evitar que caracteres rompan la URL de búsqueda
    # Quitamos comillas, paréntesis y corchetes que confunden al algoritmo de DDG
    texto_base = termino_busqueda.replace('"', '').replace("'", "").replace("(", "").replace(")", "").replace("[", "").replace("]", "").replace("-", " ")
    palabras = texto_base.split()
    
    links_encontrados = []
    
    # === ESTRATEGIA DE BÚSQUEDA DINÁMICA EN CASCADA ===
    # Creamos una lista de intentos de búsqueda, de lo más complejo a lo más simple.
    intentos = []
    
    # Intento 1: Título completo + SKU (Precisión absoluta)
    intentos.append(" ".join(palabras))
    
    # Intento 2: Si el título es largo, quitamos las últimas 2 palabras (suele limpiar códigos de lote)
    if len(palabras) > 5:
        intentos.append(" ".join(palabras[:-2]))
        
    # Intento 3: Mitad del título (Marca + Producto base)
    if len(palabras) > 3:
        intentos.append(" ".join(palabras[:4]))
        
    # Intento 4: Solo las primeras 2 palabras (Marca + Categoría - Último recurso para no fallar)
    if len(palabras) >= 2:
        intentos.append(" ".join(palabras[:2]))

    # Ejecución de la cascada
    for query in intentos:
        if not query: continue
        
        print(f"🔍 Buscando (Nivel de robustez): {query}")
        
        try:
            # Pausa técnica para evitar bloqueos de IP (Ratelimit)
            time.sleep(1.2) 
            
            with DDGS() as ddgs:
                # Usamos DDGS como generador para obtener resultados frescos
                resultados = ddgs.images(
                    query,
                    region="wt-wt", # Búsqueda global
                    safesearch="off",
                    max_results=12
                )
                
                for r in resultados:
                    url = r.get("image")
                    # Validamos que sea una URL real y no una miniatura de base64
                    if url and url.startswith("http"):
                        links_encontrados.append(url)
                    if len(links_encontrados) >= 4:
                        break
            
            if links_encontrados:
                print(f"✅ ¡Éxito total! Se encontraron {len(links_encontrados)} imágenes para: {query}")
                return links_encontrados # Retornamos de inmediato si hay éxito
            else:
                print(f"⚠️ Sin resultados para '{query}'. Probando siguiente nivel de robustez...")
                
        except Exception as e:
            print(f"❌ Error en este intento: {e}")
            # Si hay un error de conexión o bloqueo, esperamos un poco más antes del siguiente nivel
            time.sleep(2)
            continue

    return []