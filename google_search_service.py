from ddgs import DDGS
import time

def buscar_imagen(termino_busqueda: str) -> list:
    # 1. Limpieza de caracteres para no confundir al buscador
    limpio = termino_busqueda.replace('"', '').replace("'", "").replace("(", "").replace(")", "").replace("-", " ")
    palabras = limpio.split()
    
    # Extraemos el SKU del término (normalmente lo enviamos al final del título en el main.py)
    # Pero para asegurar, haremos una búsqueda combinada.
    
    links_encontrados = []
    
    # === ESTRATEGIA DE BÚSQUEDA BLINDADA (4 NIVELES) ===
    intentos = [
        " ".join(palabras),           # Nivel 1: Título completo + SKU (Máxima precisión)
        " ".join(palabras[-3:]),      # Nivel 2: Solo las últimas palabras (Donde suele estar el SKU/Modelo)
        " ".join(palabras[:4]),       # Nivel 3: Solo el inicio (Marca y Producto)
        palabras[0] if palabras else None # Nivel 4: Palabra clave principal (Último recurso)
    ]
    
    for query in intentos:
        if not query or len(query) < 3: continue
        
        print(f"🔍 Probando búsqueda nivel: {query}")
        
        try:
            time.sleep(1.5) # Pausa para evitar bloqueos
            
            with DDGS() as ddgs:
                resultados = ddgs.images(
                    query,
                    region="wt-wt", 
                    safesearch="off",
                    max_results=10
                )
                
                for r in resultados:
                    url = r.get("image")
                    if url and url.startswith("http"):
                        links_encontrados.append(url)
                    if len(links_encontrados) >= 4:
                        break
            
            if links_encontrados:
                print(f"✅ ¡Encontrado! {len(links_encontrados)} imágenes con: {query}")
                return links_encontrados 
            else:
                print(f"⚠️ Sin resultados para: {query}. Bajando nivel de precisión...")
                
        except Exception as e:
            print(f"❌ Error en intento: {e}")
            if "403" in str(e):
                print("🛑 Bloqueo temporal de DuckDuckGo. Esperando...")
                time.sleep(5)
            continue

    return []