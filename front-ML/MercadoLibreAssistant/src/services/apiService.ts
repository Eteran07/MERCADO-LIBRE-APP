export async function fetchOptimization(title: string, description: string) {
  const response = await fetch("https://localhost:8000/api/optimize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      titulo_actual: title,
      descripcion_actual: description,
      categoria: "Antenas Inalámbricas"
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Error desconocido de red" }));
    const errorMessage = typeof errorData.detail === 'string' 
      ? errorData.detail 
      : JSON.stringify(errorData.detail || errorData);
    throw new Error(errorMessage);
  }

  // ESTA LÍNEA ES LA QUE FALTABA:
  return await response.json();
}