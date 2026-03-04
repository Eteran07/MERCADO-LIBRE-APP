from ddgs import DDGS
import time
import re

def buscar_imagen(termino_busqueda: str) -> list:
    # 1. Limpiamos caracteres raros (comillas, guiones) que confunden al buscador
    texto_limpio = re.sub(r'[^a-zA-Z0-9\s]', ' ', termino_busqueda)
    
    # 2. Tomamos SOLO las primeras 5 o 6 palabras para no saturar al buscador
    palabras = texto_limpio.split()
    busqueda_corta = " ".join(palabras[:6])
    
    # 3. Le agregamos una palabra clave sencilla
    busqueda_optimizada = f"{busqueda_corta} producto"
    
    print(f"🔍 Texto original: {termino_busqueda}")
    print(f"💡 Buscando en DDG: {busqueda_optimizada}")
    
    links_encontrados = []
    try:
        # Pausa de 2 segundos para no ser bloqueados
        time.sleep(2) 
        
        # Buscamos usando el texto acortado
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