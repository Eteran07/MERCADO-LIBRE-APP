import React, { useState } from "react";
import { getSelectedRowData, writeOptimizedData } from "../../services/excelService";
import { fetchOptimization } from "../../services/apiService";
import "./AssistantPanel.css"; // Aquí puedes usar tu propio CSS o Tailwind
    
export const AssistantPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("Selecciona una fila en Excel y presiona Optimizar.");
  const [suggestion, setSuggestion] = useState<any>(null);

  const handleOptimize = async () => {
    try {
      setLoading(true);
      setStatus("Leyendo datos de la celda...");
      const { title, description, rowIndex } = await getSelectedRowData();

      if (!title) {
        setStatus("Error: No se detectó un título en la fila seleccionada.");
        setLoading(false);
        return;
      }

      setStatus("Analizando con Gemini...");
      const aiResponse = await fetchOptimization(title, description);
      
      setSuggestion({ ...aiResponse, rowIndex });
      setStatus("¡Sugerencia generada con éxito!");
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!suggestion) return;
    try {
      await writeOptimizedData(suggestion.rowIndex, suggestion.nuevo_titulo, suggestion.nueva_descripcion);
      setStatus("¡Cambios aplicados en Excel exitosamente!");
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
            <strong>Nuevo Título ({suggestion.nuevo_titulo.length}/60):</strong>
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