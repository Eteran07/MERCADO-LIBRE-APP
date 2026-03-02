import React, { useState } from "react";
import { getMultipleSmartRowsData, writeApprovedSmartData } from "../../services/excelService";
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

  // === MODO CLÁSICO MASIVO ===
  const handleOptimizeBulk = async () => { 
    try {
      setLoading(true); setStatus("Leyendo selección...");
      const { rowsData, headerColMap } = await getMultipleSmartRowsData();
      if (rowsData.length === 0) { setStatus("No hay datos."); setLoading(false); return; }

      const titleKey = Object.keys(headerColMap).find(k => k.toLowerCase().includes('título') || k.toLowerCase().includes('titulo'));
      const descKey = Object.keys(headerColMap).find(k => k.toLowerCase().includes('descripción') || k.toLowerCase().includes('descripcion'));
      if (!titleKey || !descKey) { setStatus("Error: Columnas Título/Descripción no encontradas."); setLoading(false); return; }

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
              datos_actualizados: { [titleKey]: aiResponse.nuevo_titulo, [descKey]: aiResponse.nueva_descripcion },
              sugerencias: aiResponse.sugerencias_adicionales 
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

  // === MODO CHAT LOTE MASIVO ===
  const handleSmartEditBulk = async () => {
    if (!chatCommand.trim()) { setStatus("Por favor, escribe una instrucción."); return; }

    try {
      setLoading(true); setStatus("Leyendo toda la selección...");
      const { rowsData, headerColMap } = await getMultipleSmartRowsData();
      if (rowsData.length === 0) { setStatus("No hay datos."); setLoading(false); return; }

      setHeaderMapRef(headerColMap);
      
      const loteParaIA = rowsData.map((row, index) => ({
         id_fila: index,
         datos: row.datos_fila
      }));

      setStatus(`Enviando ${rowsData.length} filas a Gemini en UN SOLO viaje...`);
      const response = await fetchSmartEditBulk(loteParaIA, chatCommand);
      
      const results: any[] = [];
      if (response.resultados && Array.isArray(response.resultados)) {
        response.resultados.forEach((res: any) => {
           const originalRow = rowsData[res.id_fila];
           if (originalRow && res.datos_actualizados) {
             results.push({
               id: res.id_fila,
               rowIndex: originalRow.rowIndex,
               datos_actualizados: res.datos_actualizados
             });
           }
        });
      }

      setBulkResults(results);
      setSelectedResultIds(new Set(results.map(r => r.id)));
      setStatus(`¡Procesamiento masivo completado! Revisa las ${results.length} propuestas.`);
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedResultIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedResultIds(newSet);
  };

  const handleApplyApproved = async () => {
    try {
      setStatus("Escribiendo cambios aprobados en Excel...");
      const approvedChanges = bulkResults.filter(res => selectedResultIds.has(res.id));
      await writeApprovedSmartData(approvedChanges, headerMapRef);
      setStatus(`¡${approvedChanges.length} filas actualizadas con éxito!`);
      setBulkResults([]); 
    } catch (error) { setStatus("Error al escribir los cambios."); }
  };

  return (
    <div className="assistant-container">
      <h2>Asistente Mercado Libre</h2>
      <p className="status-text">{status}</p>
      
      <button className="primary-btn" onClick={handleOptimizeBulk} disabled={loading} style={{ marginBottom: "15px" }}>
        {loading ? "Procesando..." : "Optimizar Títulos Seleccionados"}
      </button>

      <div className="chat-section" style={{ borderTop: "1px solid #ccc", paddingTop: "15px" }}>
        <h3>Edición Masiva con IA</h3>
        <textarea 
          placeholder="Ej: Usa el SKU para llenar Color, Marca y Modelo."
          value={chatCommand}
          onChange={(e) => setChatCommand(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()} 
          onKeyUp={(e) => e.stopPropagation()}
          onKeyPress={(e) => e.stopPropagation()}
          rows={3}
          style={{ width: "100%", marginBottom: "10px", padding: "5px" }}
        />
        <button className="primary-btn" onClick={handleSmartEditBulk} disabled={loading || !chatCommand}>
          {loading ? "Analizando lote..." : "Ejecutar en Toda la Selección"}
        </button>
      </div>

      {bulkResults.length > 0 && (
        <div className="bulk-results-card" style={{ marginTop: "15px", padding: "10px", backgroundColor: "#f9f9f9", borderRadius: "5px", border: "1px solid #ddd" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Cambios Propuestos</h3>
          <div style={{ maxHeight: "300px", overflowY: "auto", marginBottom: "15px" }}>
            {bulkResults.map((res) => (
              <div key={res.id} style={{ display: "flex", alignItems: "flex-start", marginBottom: "10px", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>
                <input type="checkbox" checked={selectedResultIds.has(res.id)} onChange={() => toggleSelection(res.id)} style={{ marginTop: "4px", marginRight: "10px", cursor: "pointer" }}/>
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => toggleSelection(res.id)}>
                  <strong style={{ display: "block", fontSize: "0.9em", color: "#0078d4" }}>Fila Excel: {res.rowIndex + 1}</strong>
                  {Object.entries(res.datos_actualizados).map(([columna, valor]) => (
                    <div key={columna} style={{ fontSize: "0.85em", marginTop: "2px" }}>
                      <strong>{columna}:</strong> <span style={{ color: "#333" }}>{String(valor)}</span>
                    </div>
                  ))}
                  {res.sugerencias && <div style={{ fontSize: "0.8em", color: "#666", marginTop: "4px", fontStyle: "italic" }}>💡 {res.sugerencias}</div>}
                </div>
              </div>
            ))}
          </div>
          <button className="success-btn" onClick={handleApplyApproved} disabled={selectedResultIds.size === 0} style={{ width: "100%", backgroundColor: "#ffc107", color: "#000", fontWeight: "bold" }}>
            Aplicar {selectedResultIds.size} seleccionados (Amarillo)
          </button>
        </div>
      )}
    </div>
  );
};