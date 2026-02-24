import React, { useState } from "react";
import { getSelectedRowData, writeOptimizedData } from "../../services/excelService";
import { fetchOptimization } from "../../services/apiService";
import "./AssistantPanel.css"; 
    
export const AssistantPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("Selecciona una fila en Excel y presiona Optimizar.");
  const [suggestion, setSuggestion] = useState<any>(null);

  const handleOptimize = async () => {
    try {
      setLoading(true);
      setStatus("Leyendo datos de Excel...");
      const data = await getSelectedRowData();

      if (!data.title) {
        setStatus("Error: No se detectó un título en la celda seleccionada.");
        setLoading(false);
        return;
      }

      setStatus("Analizando con Gemini...");
      const aiResponse = await fetchOptimization(data.title, data.description);
      
      if (!aiResponse) {
        throw new Error("La IA devolvió una respuesta vacía.");
      }

      // Mapeamos los datos de Gemini al estado del panel
      setSuggestion({
        nuevo_titulo: aiResponse.nuevo_titulo || "Sin título",
        nueva_descripcion: aiResponse.nueva_descripcion || "Sin descripción",
        sugerencias_adicionales: aiResponse.sugerencias_adicionales || "Sin tips",
        rowIndex: data.rowIndex
      });
      
      setStatus("¡Sugerencia generada con éxito!");
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!suggestion) return;
    try {
      await writeOptimizedData(suggestion.rowIndex, suggestion.nuevo_titulo, suggestion.nueva_descripcion);
      setStatus("¡Cambios aplicados en Excel!");
      setSuggestion(null);
    } catch (error) {
      setStatus("Error al escribir en Excel.");
    }
  };

  return (
    <div className="assistant-container">
      <h2>Asistente Mercado Libre</h2>
      <p className="status-text">{status}</p>
      
      <button className="primary-btn" onClick={handleOptimize} disabled={loading}>
        {loading ? "Procesando..." : "Analizar Fila Actual"}
      </button>

      {suggestion && (
        <div className="suggestion-card">
          <h3>Sugerencia de IA</h3>
          <div className="field">
            {/* El ?.length evita que se rompa si el título falla */}
            <strong>Nuevo Título ({(suggestion.nuevo_titulo?.length) || 0}/60):</strong>
            <p>{suggestion.nuevo_titulo}</p>
          </div>
          <div className="field">
            <strong>Nueva Descripción:</strong>
            <p className="desc-preview">{suggestion.nueva_descripcion}</p>
          </div>
          <div className="tips">
            <strong>Tips:</strong> {suggestion.sugerencias_adicionales}
          </div>
          
          <button className="success-btn" onClick={handleApply}>
            Aplicar a la hoja
          </button>
        </div>
      )}
    </div>
  );
};