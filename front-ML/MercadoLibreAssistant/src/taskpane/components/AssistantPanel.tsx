import React, { useState } from "react";
import { getSelectedRowData, writeOptimizedData, getSmartRowData, writeSmartData } from "../../services/excelService";
import { fetchOptimization, fetchSmartEdit } from "../../services/apiService";
import "./AssistantPanel.css"; 
    
export const AssistantPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("Selecciona una fila en Excel.");
  const [suggestion, setSuggestion] = useState<any>(null); // Para el modo clásico
  
  // NUEVOS ESTADOS PARA EL CHAT INTELIGENTE
  const [chatCommand, setChatCommand] = useState<string>("");
  const [smartResult, setSmartResult] = useState<any>(null);

  // --- MODO CLÁSICO (Se mantiene intacto) ---
  const handleOptimize = async () => { /* ... tu código handleOptimize original ... */ 
    try {
      setLoading(true); setStatus("Leyendo datos de Excel...");
      const data = await getSelectedRowData();
      if (!data.title && !data.description) { setStatus("Error: Título y descripción vacíos."); setLoading(false); return; }
      setStatus("Analizando con Gemini...");
      const aiResponse: any = await fetchOptimization(data.title, data.description);
      setSuggestion({
        nuevo_titulo: aiResponse.nuevo_titulo || "", nueva_descripcion: aiResponse.nueva_descripcion || "",
        sugerencias_adicionales: aiResponse.sugerencias_adicionales || "",
        rowIndex: data.rowIndex, titleColIndex: data.titleColIndex, descColIndex: data.descColIndex
      });
      setSmartResult(null); // Ocultar resultados del otro modo
      setStatus("¡Sugerencia generada con éxito!");
    } catch (error: any) { setStatus(`Error: ${error.message}`); } finally { setLoading(false); }
  };

  const handleApply = async () => { /* ... tu código handleApply original ... */ 
    if (!suggestion) return;
    try {
      await writeOptimizedData(suggestion.rowIndex, suggestion.titleColIndex, suggestion.descColIndex, suggestion.nuevo_titulo, suggestion.nueva_descripcion);
      setStatus("¡Cambios aplicados!"); setSuggestion(null);
    } catch (error) { setStatus("Error al escribir."); }
  };

  // --- NUEVO MODO INTELIGENTE (Chat + Todas las columnas) ---
  const handleSmartEdit = async () => {
    if (!chatCommand.trim()) {
      setStatus("Por favor, escribe una instrucción en el chat.");
      return;
    }

    try {
      setLoading(true);
      setStatus("Leyendo toda la fila...");
      const { datos_fila, headerColMap, rowIndex } = await getSmartRowData();

      setStatus("Procesando comando con Gemini...");
      const response = await fetchSmartEdit(datos_fila, chatCommand);

      if (!response.datos_actualizados || Object.keys(response.datos_actualizados).length === 0) {
        setStatus("La IA no modificó ninguna columna.");
        setLoading(false);
        return;
      }

      setSmartResult({
        datos_actualizados: response.datos_actualizados,
        headerColMap,
        rowIndex
      });
      setSuggestion(null); // Ocultar resultados del otro modo
      setStatus("Cambios generados, listos para aplicar.");

    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySmart = async () => {
    if (!smartResult) return;
    try {
      await writeSmartData(smartResult.rowIndex, smartResult.headerColMap, smartResult.datos_actualizados);
      setStatus("¡Cambios inteligentes aplicados en Excel!");
      setSmartResult(null);
    } catch (error) {
      setStatus("Error al escribir cambios masivos.");
    }
  };

  return (
    <div className="assistant-container">
      <h2>Asistente Mercado Libre</h2>
      <p className="status-text">{status}</p>
      
      {/* SECCIÓN MODO CLÁSICO */}
      <button className="primary-btn" onClick={handleOptimize} disabled={loading}>
        {loading ? "Procesando..." : "Optimizar Título/Desc"}
      </button>

      {/* NUEVA SECCIÓN: CHAT INTELIGENTE */}
      <div className="chat-section" style={{ marginTop: "20px", borderTop: "1px solid #ccc", paddingTop: "15px" }}>
        <h3>Edición Masiva con IA</h3>
        <textarea 
          placeholder="Ej: Usa el SKU para llenar Color, Marca y Modelo. Traduce el título."
          value={chatCommand}
          onChange={(e) => setChatCommand(e.target.value)}
          rows={3}
          style={{ width: "100%", marginBottom: "10px", padding: "5px" }}
        />
        <button className="primary-btn" onClick={handleSmartEdit} disabled={loading || !chatCommand}>
          {loading ? "Pensando..." : "Ejecutar Comando"}
        </button>
      </div>

      {/* RENDERIZADO: SUGERENCIAS CLÁSICAS */}
      {suggestion && (
        <div className="suggestion-card">
          {/* ... (Tu código de sugerencias anterior se mantiene) ... */}
          <h3>Sugerencia de IA</h3>
          <p><strong>Título:</strong> {suggestion.nuevo_titulo}</p>
          <button className="success-btn" onClick={handleApply}>Aplicar a la hoja</button>
        </div>
      )}

      {/* RENDERIZADO: RESULTADOS DEL CHAT MASIVO */}
      {smartResult && (
        <div className="suggestion-card">
          <h3>Cambios Propuestos:</h3>
          {Object.entries(smartResult.datos_actualizados).map(([columna, valor]) => (
            <div className="field" key={columna}>
              <strong>{columna}:</strong>
              <p>{String(valor)}</p>
            </div>
          ))}
          <button className="success-btn" onClick={handleApplySmart} style={{ backgroundColor: "#ffc107", color: "#000" }}>
            Aplicar Cambios (Amarillo)
          </button>
        </div>
      )}
    </div>
  );
};