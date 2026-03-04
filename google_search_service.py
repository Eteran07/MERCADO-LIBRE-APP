from ddgs import DDGS
import time
import random

def buscar_imagen(termino_busqueda: str) -> list:
    """
    Buscador Híbrido: Combina la potencia de DuckDuckGo con filtros de 
    Google para obtener imágenes de catálogos específicos.
    """
    
    # 1. Definimos los dominios de alta confianza (Google los prioriza)
    sitios_sugeridos = (
        "site:zmart.la OR site:mercadolibre.com OR site:amazon.com OR "
        "site:maxiprintla.com OR site:walmart.com OR site:ebay.com OR "
        "site:falabella.com OR site:homedepot.com"
    )

    # 2. Limpieza de texto
    texto_base = termino_busqueda.replace('"', '').replace("'", "").replace("(", "").replace(")", "").replace("[", "").replace("]", "").replace("-", " ")
    palabras = texto_base.split()
    
    links_encontrados = []
    
    # === ESTRATEGIA DE BÚSQUEDA HÍBRIDA ===
    # El primer intento usa los sitios sugeridos. 
    # El segundo simula una búsqueda de 'Producto + Catálogo' que es donde Google brilla.
    intentos = [
        f"{' '.join(palabras)} {sitios_sugeridos}",           # 1. Específico en fuentes sugeridas
        f"{' '.join(palabras[:6])} product gallery",           # 2. Búsqueda de galería profesional
        " ".join(palabras),                                   # 3. Búsqueda abierta
        " ".join(palabras[:4])                                # 4. Búsqueda simplificada
    ]
    
    for query in intentos:
        if not query or len(query) < 3:
            continue
        
        print(f"🔍 Buscando en red: {query}")
        
        try:
            # Pausa aleatoria para parecer un humano usando Google/DDG
            time.sleep(random.uniform(1.0, 2.5)) 
            
            with DDGS() as ddgs:
                # Solicitamos resultados globales
                resultados = ddgs.images(
                    query,
                    region="wt-wt", 
                    safesearch="off",
                    max_results=20 # Aumentamos el buffer para filtrar calidad
                )
                
                if resultados:
                    for r in resultados:
                        url = r.get("image")
                        if url and url.startswith("http"):
                            # Filtro de extensiones para asegurar que Google nos da archivos reales
                            if any(ext in url.lower() for ext in [".jpg", ".jpeg", ".png", ".webp"]):
                                links_encontrados.append(url)
                        
                        if len(links_encontrados) >= 4:
                            break
            
            if links_encontrados:
                print(f"✅ ¡Éxito! Encontradas {len(links_encontrados)} imágenes.")
                return links_encontrados 
            else:
                print(f"⚠️ Sin resultados para: {query}. Reintentando nivel...")
                
        except Exception as e:
            print(f"❌ Error en búsqueda: {e}")
            if "403" in str(e):
                print("🛑 Bloqueo detectado. Esperando enfriamiento...")
                time.sleep(10)
            continue

    return []