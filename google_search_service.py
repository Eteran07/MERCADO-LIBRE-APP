from duckduckgo_search import DDGS

def buscar_imagen(termino_busqueda: str) -> list:
    print(f"🔍 Buscando 4 opciones en DDG: {termino_busqueda}")
    busqueda_optimizada = f"{termino_busqueda} mercadolibre amazon"
    
    links_encontrados = []
    try:
        # CORRECCIÓN: Pasamos el término directamente sin poner "keywords="
        resultados = DDGS().images(
            busqueda_optimizada,
            max_results=10 
        )
        
        for resultado in resultados:
            link = resultado.get("image")
            if link and link.startswith("http"):
                links_encontrados.append(link)
            if len(links_encontrados) == 4:
                break
                
        print(f"✅ Se encontraron {len(links_encontrados)} imágenes.")
        return links_encontrados
        
    except Exception as e:
        print(f"❌ Error al buscar con DDG: {e}")
        return []