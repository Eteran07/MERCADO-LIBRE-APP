import React, { useState } from "react";
// Ya no necesitamos las funciones de una sola fila, usamos las masivas para todo
import { getMultipleSmartRowsData, writeApprovedSmartData } from "../../services/excelService";
import { fetchOptimization, fetchSmartEdit } from "../../services/apiService";
import "./AssistantPanel.css"; 
    
export const AssistantPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("Selecciona una o varias filas en Excel.");
  
  const [chatCommand, setChatCommand] = useState<string>("");
  
  // ESTADOS COMPARTIDOS PARA EL CHECKLIST MASIVO
  const [bulkResults, setBulkResults] = useState<any[]>([]);
  const [selectedResultIds, setSelectedResultIds] = useState<Set<number>>(new Set());
  const [headerMapRef, setHeaderMapRef] = useState<Record<string, number>>({});

  // ==========================================
  // 1. MODO CLÁSICO MASIVO (Optimizar Títulos)
  // ==========================================
  const handleOptimizeBulk = async () => { 
    try {
      setLoading(true); 
      setStatus("Leyendo selección para optimizar...");
      const { rowsData, headerColMap } = await getMultipleSmartRowsData();
      
      if (rowsData.length === 0) {
        setStatus("No se encontraron datos en la selección.");
        setLoading(false); return;
      }

      // Buscar cómo se llaman exactamente las columnas de título y descripción en este Excel
      const titleKey = Object.keys(headerColMap).find(k => k.toLowerCase().includes('título') || k.toLowerCase().includes('titulo'));
      const descKey = Object.keys(headerColMap).find(k => k.toLowerCase().includes('descripción') || k.toLowerCase().includes('descripcion'));

      if (!titleKey || !descKey) {
        setStatus("Error: No se encontraron las columnas 'Título' y 'Descripción'.");
        setLoading(false); return;
      }

      setHeaderMapRef(headerColMap);
      const results: any[] = [];

      // Procesar cada fila
      for (let i = 0; i < rowsData.length; i++) {
        setStatus(`Optimizando... Fila ${i + 1} de ${rowsData.length}`);
        const row = rowsData[i];
        const currentTitle = row.datos_fila[titleKey] || "";
        const currentDesc = row.datos_fila[descKey] || "";

        if (!currentTitle && !currentDesc) continue;

        try {
          const aiResponse: any = await fetchOptimization(currentTitle, currentDesc);
          if (aiResponse.nuevo_titulo || aiResponse.nueva_descripcion) {
            results.push({
              id: i,
              rowIndex: row.rowIndex,
              datos_actualizados: {
                [titleKey]: aiResponse.nuevo_titulo || currentTitle,
                [descKey]: aiResponse.nueva_descripcion || currentDesc
              },
              // Guardamos los tips para mostrarlos en el checklist
              sugerencias: aiResponse.sugerencias_adicionales 
            });
          }
        } catch (error) {
          console.error(`Error optimizando fila ${row.rowIndex}`, error);
        }
      }

      setBulkResults(results);
      setSelectedResultIds(new Set(results.map(r => r.id)));
      setStatus(`¡Optimización completa! Revisa las ${results.length} propuestas.`);
    } catch (error: any) { 
      setStatus(`Error: ${error.message}`); 
    } finally { 
      setLoading(false); 
    }
  };


  // ==========================================
  // 2. MODO CHAT MASIVO (Cualquier columna)
  // ==========================================
  const handleSmartEditBulk = async () => {
    if (!chatCommand.trim()) {
      setStatus("Por favor, escribe una instrucción en el chat."); return;
    }

    try {
      setLoading(true);
      setStatus("Leyendo selección...");
      const { rowsData, headerColMap } = await getMultipleSmartRowsData();
      
      if (rowsData.length === 0) {
        setStatus("No se encontraron datos en la selección.");
        setLoading(false); return;
      }

      setHeaderMapRef(headerColMap);
      const results: any[] = [];

      for (let i = 0; i < rowsData.length; i++) {
        setStatus(`Pensando... Fila ${i + 1} de ${rowsData.length}`);
        const row = rowsData[i];
        
        try {
          const response = await fetchSmartEdit(row.datos_fila, chatCommand);
          if (response.datos_actualizados && Object.keys(response.datos_actualizados).length > 0) {
            results.push({
              id: i, 
              rowIndex: row.rowIndex,
              datos_actualizados: response.datos_actualizados
            });
          }
        } catch (error) {
          console.error(`Error procesando fila ${row.rowIndex}`, error);
        }
      }

      setBulkResults(results);
      setSelectedResultIds(new Set(results.map(r => r.id)));
      setStatus(`¡Análisis completo! Revisa las ${results.length} propuestas.`);
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };


  // ==========================================
  // LÓGICA COMPARTIDA DEL CHECKLIST
  // ==========================================
  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedResultIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedResultIds(newSet);
  };

  const handleApplyApproved = async () => {
    try {
      setStatus("Escribiendo cambios aprobados en Excel...");
      const approvedChanges = bulkResults.filter(res => selectedResultIds.has(res.id));
      await writeApprovedSmartData(approvedChanges, headerMapRef);
      setStatus(`¡${approvedChanges.length} filas actualizadas con éxito!`);
      setBulkResults([]); // Limpiar la ventana tras aplicar
    } catch (error) {
      setStatus("Error al escribir los cambios masivos.");
    }
  };

  return (
    <div className="assistant-container">
      <h2>Asistente Mercado Libre</h2>
      <p className="status-text">{status}</p>
      
      {/* BOTÓN MODO CLÁSICO MASIVO */}
      <button className="primary-btn" onClick={handleOptimizeBulk} disabled={loading} style={{ marginBottom: "15px" }}>
        {loading ? "Procesando Selección..." : "Optimizar Títulos Seleccionados"}
      </button>

      {/* SECCIÓN MODO CHAT MASIVO */}
      <div className="chat-section" style={{ borderTop: "1px solid #ccc", paddingTop: "15px" }}>
        <h3>Edición Libre con IA</h3>
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
          {loading ? "Procesando Selección..." : "Ejecutar Comando"}
        </button>
      </div>

      {/* VENTANA UNIFICADA DE PREVISUALIZACIÓN Y CHECKLIST */}
      {bulkResults.length > 0 && (
        <div className="bulk-results-card" style={{ marginTop: "15px", padding: "10px", backgroundColor: "#f9f9f9", borderRadius: "5px", border: "1px solid #ddd" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Cambios Propuestos</h3>
          
          <div style={{ maxHeight: "300px", overflowY: "auto", marginBottom: "15px" }}>
            {bulkResults.map((res) => (
              <div key={res.id} style={{ display: "flex", alignItems: "flex-start", marginBottom: "10px", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>
                
                <input 
                  type="checkbox" 
                  checked={selectedResultIds.has(res.id)}
                  onChange={() => toggleSelection(res.id)}
                  style={{ marginTop: "4px", marginRight: "10px", cursor: "pointer" }}
                />
                
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => toggleSelection(res.id)}>
                  <strong style={{ display: "block", fontSize: "0.9em", color: "#0078d4" }}>
                    Fila Excel: {res.rowIndex + 1}
                  </strong>
                  
                  {Object.entries(res.datos_actualizados).map(([columna, valor]) => (
                    <div key={columna} style={{ fontSize: "0.85em", marginTop: "2px" }}>
                      <strong>{columna}:</strong> <span style={{ color: "#333" }}>{String(valor)}</span>
                    </div>
                  ))}

                  {/* Si hay tips/sugerencias (del modo clásico), los mostramos aquí */}
                  {res.sugerencias && (
                    <div style={{ fontSize: "0.8em", color: "#666", marginTop: "4px", fontStyle: "italic" }}>
                      💡 {res.sugerencias}
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>

          <button 
            className="success-btn" 
            onClick={handleApplyApproved} 
            disabled={selectedResultIds.size === 0}
            style={{ width: "100%", backgroundColor: "#ffc107", color: "#000", fontWeight: "bold" }}
          >
            Aplicar {selectedResultIds.size} seleccionados (Amarillo)
          </button>
        </div>
      )}
    </div>
  );
};