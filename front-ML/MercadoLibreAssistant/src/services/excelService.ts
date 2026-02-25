/* global Excel */

export async function getSelectedRowData() {
  return Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getActiveWorksheet();
    
    // 1. Obtenemos la fila donde el usuario hizo clic
    const activeCell = context.workbook.getActiveCell();
    activeCell.load("rowIndex");
    await context.sync();
    const selectedRowIndex = activeCell.rowIndex;

    // 2. Cargamos las primeras 5 filas del Excel para buscar los encabezados dinámicamente
    // Usamos hasta la columna DZ para abarcar plantillas muy largas
    const headerRange = sheet.getRange("A1:DZ5");
    headerRange.load("values");
    await context.sync();

    let titleColIndex = -1;
    let descColIndex = -1;

    // 3. Escaneamos para encontrar en qué columna está el Título y la Descripción
    for (let r = 0; r < 5; r++) {
      const row = headerRange.values[r];
      const tempTitleIdx = row.findIndex(c => typeof c === 'string' && c.toLowerCase().includes('título'));
      const tempDescIdx = row.findIndex(c => typeof c === 'string' && c.trim().toLowerCase() === 'descripción');
      
      if (tempTitleIdx !== -1 && tempDescIdx !== -1) {
        titleColIndex = tempTitleIdx;
        descColIndex = tempDescIdx;
        break; // Encontramos los encabezados, dejamos de buscar
      }
    }

    if (titleColIndex === -1 || descColIndex === -1) {
      throw new Error("No se encontraron las columnas 'Título' y 'Descripción' en los encabezados de esta hoja.");
    }

    // 4. Extraemos solo las celdas de la fila seleccionada que nos interesan
    const titleCell = sheet.getCell(selectedRowIndex, titleColIndex);
    const descCell = sheet.getCell(selectedRowIndex, descColIndex);
    titleCell.load("values");
    descCell.load("values");
    await context.sync();

    const rawTitle = titleCell.values[0][0];
    const rawDesc = descCell.values[0][0];

    // Forzamos a que sean cadenas de texto (String) para evitar el error "input: 1" en Python
    const title = rawTitle ? String(rawTitle) : "";
    const description = rawDesc ? String(rawDesc) : "";

    return { 
      title, 
      description, 
      rowIndex: selectedRowIndex,
      titleColIndex,  // Exportamos dónde están para saber dónde escribir después
      descColIndex 
    };
  });
}

// Ahora recibe las coordenadas dinámicas para saber exactamente dónde pintar el resultado
export async function writeOptimizedData(rowIndex: number, titleColIndex: number, descColIndex: number, newTitle: string, newDescription: string) {
  return Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getActiveWorksheet();
    
    const titleCell = sheet.getCell(rowIndex, titleColIndex);
    titleCell.values = [[newTitle]];
    titleCell.format.fill.color = "#E2EFDA"; 
    
    const descCell = sheet.getCell(rowIndex, descColIndex);
    descCell.values = [[newDescription]];
    descCell.format.fill.color = "#E2EFDA";

    await context.sync();
  });
}