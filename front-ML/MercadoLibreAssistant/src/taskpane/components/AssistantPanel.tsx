import React, { useState } from "react";
import { 
  getMultipleSmartRowsData, 
  writeApprovedSmartData, 
  fetchImageOptionsFromExcel, 
  downloadSelectedImageFinal 
} from "../../services/excelService";
import { fetchOptimization, fetchSmartEditBulk } from "../../services/apiService";
import "./AssistantPanel.css"; 

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const AssistantPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("Selecciona una o varias filas en Excel.");
  const [chatCommand, setChatCommand] = useState<string>("");
  
  const [bulkResults, setBulkResults] = useState<any[]>([]);
  const [selectedResultIds, setSelectedResultIds] = useState<Set<number>>(new Set());
  const [headerMapRef, setHeaderMapRef] = useState<Record<string, number>>({});

  // === ESTADOS PARA LA COLA DE IMÁGENES MASIVA ===
  const [imageOptions, setImageOptions] = useState<string[]>([]);
  const [imageContext, setImageContext] = useState<any>(null);
  const [imageQueue, setImageQueue] = useState<any[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(-1);

  // ==========================================
  // LÓGICA DE IMÁGENES (CON REINTENTO Y HOISTING)
  // ==========================================

  async function processNextImageInQueue(queue: any[], index: number) {
    if (!queue || index >= queue.length) {
      setStatus("✅ ¡Proceso de imágenes finalizado!");
      resetImageState();
      setLoading(false);
      return;
    }

    setCurrentQueueIndex(index);
    setLoading(true);
    const row = queue[index];
    setStatus(`Buscando imágenes para Fila ${row.rowIndex + 1}...`);

    try {
      setImageOptions([]); // Limpiar galería previa
      const result = await fetchImageOptionsFromExcel(row);
      
      if (!result || !result.opciones || result.opciones.length === 0) {
        throw new Error("No se encontraron imágenes");
      }

      setImageOptions(result.opciones);
      setImageContext(result.contexto);
      setStatus(`Fila ${index + 1}/${queue.length}: Elige una imagen.`);
    } catch (error: any) {
      console.error("Fila fallida:", error);
      
      // Marcar en Rojo en Excel
      await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getActiveWorksheet();
        const range = sheet.getRangeByIndexes(row.rowIndex, 0, 1, 5);
        range.format.fill.color = "#FFC7CE"; 
        await context.sync();
      });

      setStatus(`⚠️ Sin resultados en fila ${row.rowIndex + 1}. Saltando...`);
      await delay(1500);
      await processNextImageInQueue(queue, index + 1);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartImageBulk() {
    try {
      setLoading(true);
      setStatus("Obteniendo selección para imágenes...");
      const { rowsData } = await getMultipleSmartRowsData();
      
      if (!rowsData || rowsData.length === 0) {
        setStatus("No hay filas seleccionadas.");
        setLoading(false);
        return;
      }

      setImageQueue(rowsData);
      await processNextImageInQueue(rowsData, 0);
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
      setLoading(false);
    }
  }

  async function handleSearchAgain() {
    if (currentQueueIndex === -1) return;
    try {
      setLoading(true);
      setStatus("Buscando nuevas opciones...");
      setImageOptions([]);
      const currentRow = imageQueue[currentQueueIndex];
      const result = await fetchImageOptionsFromExcel(currentRow);
      
      if (!result.opciones || result.opciones.length === 0) {
        setStatus("Sigue sin haber resultados.");
        await delay(1000);
      } else {
        setImageOptions(result.opciones);
        setStatus("Nuevas opciones cargadas.");
      }
    } catch (e) {
      setStatus("Error al reintentar búsqueda.");
    } finally {
      setLoading(false);
    }
  }

  const handleSelectImage = async (url: string) => {
    if (!imageContext) return;
    try {
      setLoading(true);
      setStatus(`Guardando imagen para SKU ${imageContext.sku}...`);
      // Aquí se pasan los 4 argumentos:
      await downloadSelectedImageFinal(url, imageContext.sku, imageContext.categoria, imageContext.nombre_hoja);
      
      await processNextImageInQueue(imageQueue, currentQueueIndex + 1);
    } catch (error: any) {
      setStatus(`Error al procesar: ${error.message}`);
      setLoading(false);
    }
  };

  const skipCurrentImage = async () => {
    await processNextImageInQueue(imageQueue, currentQueueIndex + 1);
  };

  const resetImageState = () => {
    setImageQueue([]);
    setCurrentQueueIndex(-1);
    setImageOptions([]);
    setImageContext(null);
  };

  // ==========================================
  // MODOS DE TEXTO (OPTIMIZACIÓN Y CHAT IA)
  // ==========================================

  const handleOptimizeBulk = async () => { 
    try {
      setLoading(true); setStatus("Leyendo selección...");
      const { rowsData, headerColMap } = await getMultipleSmartRowsData();
      if (rowsData.length === 0) { setStatus("No hay datos."); setLoading(false); return; }

      const titleKey = Object.keys(headerColMap).find(k => k.toLowerCase().includes('título') || k.toLowerCase().includes('titulo'));
      const descKey = Object.keys(headerColMap).find(k => k.toLowerCase().includes('descripción') || k.toLowerCase().includes('descripcion'));
      
      if (!titleKey || !descKey) { 
        setStatus("Error: Columnas Título/Descripción no encontradas."); 
        setLoading(false); 
        return; 
      }

      setHeaderMapRef(headerColMap);
      const results: any[] = [];

      for (let i = 0; i < rowsData.length; i++) {
        setStatus(`Optimizando Títulos... Fila ${i + 1} de ${rowsData.length}`);
        const row = rowsData[i];
        if (!row.datos_fila[titleKey] && !row.datos_fila[descKey]) continue;

        try {
          const aiResponse: any = await fetchOptimization(row.datos_fila[titleKey] || "", row.datos_fila[descKey] || "");
          if (aiResponse.nuevo_titulo || aiResponse.nueva_descripcion) {
            results.push({
              id: i, rowIndex: row.rowIndex,
              datos_actualizados: { [titleKey]: aiResponse.nuevo_titulo, [descKey]: aiResponse.nueva_descripcion }
            });
          }
        } catch (error) { console.error("Error en fila", error); }
        
        if (i < rowsData.length - 1) await delay(2000); 
      }

      setBulkResults(results);
      setSelectedResultIds(new Set(results.map(r => r.id)));
      setStatus(`¡Optimización completa!`);
    } catch (error: any) { setStatus(`Error: ${error.message}`); } finally { setLoading(false); }
  };

  const handleSmartEditBulk = async () => {
    if (!chatCommand.trim()) { setStatus("Por favor, escribe una instrucción."); return; }
    try {
      setLoading(true); setStatus("Leyendo toda la selección...");
      const { rowsData, headerColMap } = await getMultipleSmartRowsData();
      if (rowsData.length === 0) { setStatus("No hay datos."); setLoading(false); return; }
      
      setHeaderMapRef(headerColMap);
      const loteParaIA = rowsData.map((row, index) => ({ id_fila: index, datos: row.datos_fila }));
      
      setStatus(`Enviando ${rowsData.length} filas a Gemini...`);
      const response = await fetchSmartEditBulk(loteParaIA, chatCommand);
      
      const results: any[] = [];
      if (response.resultados) {
        response.resultados.forEach((res: any) => {
           const originalRow = rowsData[res.id_fila];
           if (originalRow && res.datos_actualizados) {
             results.push({ id: res.id_fila, rowIndex: originalRow.rowIndex, datos_actualizados: res.datos_actualizados });
           }
        });
      }
      setBulkResults(results);
      setSelectedResultIds(new Set(results.map(r => r.id)));
      setStatus(`¡Procesamiento masivo completado!`);
    } catch (error: any) { setStatus(`Error: ${error.message}`); } finally { setLoading(false); }
  };

  const handleApplyApproved = async () => {
    try {
      setStatus("Escribiendo cambios en Excel...");
      const approvedChanges = bulkResults.filter(res => selectedResultIds.has(res.id));
      await writeApprovedSmartData(approvedChanges, headerMapRef);
      setStatus(`¡${approvedChanges.length} filas actualizadas!`);
      setBulkResults([]); 
    } catch (error) { setStatus("Error al escribir los cambios."); }
  };

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedResultIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedResultIds(newSet);
  };

  return (
    <div className="assistant-container">
      <h2>Asistente Mercado Libre</h2>
      <p className="status-text" style={{ fontWeight: 'bold' }}>{status}</p>
      
      <div className="image-section" style={{ border: "2px solid #107c41", padding: "10px", borderRadius: "8px", marginBottom: "15px" }}>
        <h3>📷 Buscador Masivo de Fotos</h3>
        
        {imageQueue.length > 0 && (
          <div style={{ marginBottom: "10px", fontSize: "0.85em", color: "#107c41" }}>
            Progreso: <strong>{currentQueueIndex + 1} de {imageQueue.length}</strong>
            <div style={{ width: '100%', backgroundColor: '#eee', height: '4px', marginTop: '4px' }}>
              <div style={{ width: `${((currentQueueIndex + 1) / imageQueue.length) * 100}%`, backgroundColor: '#107c41', height: '100%', transition: 'width 0.3s' }}></div>
            </div>
          </div>
        )}

        {imageOptions && imageOptions.length > 0 ? (
          <div style={{ backgroundColor: "#f0f8ff", padding: "10px", borderRadius: "5px" }}>
            <p style={{ fontSize: "0.8em", marginBottom: "5px" }}>
              Fila: <strong>{imageContext?.rowIndex + 1}</strong> - SKU: <strong>{imageContext?.sku}</strong>
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {imageOptions.map((url, idx) => (
                <div key={idx} onClick={() => handleSelectImage(url)} style={{ border: "2px solid #ccc", cursor: "pointer", borderRadius: "5px", overflow: "hidden", backgroundColor: "white" }}>
                  <img src={url} alt="opcion" style={{ width: "100%", height: "80px", objectFit: "contain" }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
              <button onClick={handleSearchAgain} disabled={loading} style={{ flex: 1, fontSize: "0.7em" }}>🔄 Reintentar</button>
              <button onClick={skipCurrentImage} style={{ flex: 1, fontSize: "0.7em" }}>Saltar ➔</button>
              <button onClick={resetImageState} style={{ flex: 1, fontSize: "0.7em", backgroundColor: "#d83b01", color: "white", border: "none" }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button className="primary-btn" onClick={handleStartImageBulk} disabled={loading} style={{ width: "100%", backgroundColor: "#107c41" }}>
            {loading ? "Buscando..." : "Iniciar Búsqueda en Selección"}
          </button>
        )}
      </div>

      <hr />
      <button className="primary-btn" onClick={handleOptimizeBulk} disabled={loading} style={{ marginBottom: "15px", width: "100%" }}>
        {loading ? "Procesando..." : "Optimizar Títulos Seleccionados"}
      </button>

      <div className="chat-section" style={{ borderTop: "1px solid #ccc", paddingTop: "15px" }}>
        <h3>Edición Masiva con IA</h3>
        <textarea 
          placeholder="Ej: Usa el SKU para llenar Color, Marca y Modelo."
          value={chatCommand}
          onChange={(e) => setChatCommand(e.target.value)}
          rows={3}
          style={{ width: "100%", marginBottom: "10px", padding: "5px" }}
        />
        <button className="primary-btn" onClick={handleSmartEditBulk} disabled={loading || !chatCommand} style={{ width: "100%" }}>
          {loading ? "Analizando lote..." : "Ejecutar IA en Selección"}
        </button>
      </div>

      {bulkResults.length > 0 && (
        <div className="bulk-results-card" style={{ marginTop: "15px", padding: "10px", backgroundColor: "#f9f9f9", borderRadius: "5px", border: "1px solid #ddd" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Cambios Propuestos</h3>
          <div style={{ maxHeight: "250px", overflowY: "auto", marginBottom: "15px" }}>
            {bulkResults.map((res) => (
              <div key={res.id} style={{ display: "flex", alignItems: "flex-start", marginBottom: "10px", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>
                <input type="checkbox" checked={selectedResultIds.has(res.id)} onChange={() => toggleSelection(res.id)} />
                <div style={{ flex: 1, marginLeft: "10px" }}>
                  <strong style={{ fontSize: "0.85em" }}>Fila: {res.rowIndex + 1}</strong>
                  {Object.entries(res.datos_actualizados).map(([col, val]) => (
                    <div key={col} style={{ fontSize: "0.8em" }}><strong>{col}:</strong> {String(val)}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button className="success-btn" onClick={handleApplyApproved} disabled={selectedResultIds.size === 0} style={{ width: "100%", backgroundColor: "#ffc107", color: "#000", fontWeight: "bold" }}>
            Aplicar Cambios de Texto
          </button>
        </div>
      )}
    </div>
  );
};