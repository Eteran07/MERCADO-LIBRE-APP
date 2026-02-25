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

// ... (tu código anterior se queda igual) ...

// LEER TODA LA FILA DINÁMICAMENTE
// LEER TODA LA FILA Y BUSCAR LOS ENCABEZADOS DINÁMICAMENTE (HASTA LA FILA 8)
export async function getSmartRowData() {
  return Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getActiveWorksheet();
    
    // 1. Obtener la fila seleccionada por el usuario
    const activeCell = context.workbook.getActiveCell();
    activeCell.load("rowIndex");
    await context.sync();
    const rowIndex = activeCell.rowIndex;

    // 2. Leer las primeras 8 filas para encontrar los verdaderos encabezados (ML suele usar la fila 4 o 5)
    const headerRange = sheet.getRange("A1:DZ8");
    headerRange.load("values");
    
    // 3. Leer los datos de la fila seleccionada
    const dataRange = sheet.getRangeByIndexes(rowIndex, 0, 1, 130); // 130 columnas (hasta DZ)
    dataRange.load("values");
    await context.sync();

    const allHeaderRows = headerRange.values;
    const rowData = dataRange.values[0];

    let headers: any[] = [];

    // 4. Buscar cuál es la verdadera fila de encabezados
    // (Buscamos la fila que contenga la palabra "Título", "SKU" o "Características")
    for (let r = 0; r < allHeaderRows.length; r++) {
      const row = allHeaderRows[r];
      if (row.some(c => typeof c === 'string' && (c.toLowerCase().includes('título') || c.toLowerCase().includes('sku')))) {
        headers = row;
        break; // Encontramos la fila correcta, detenemos la búsqueda
      }
    }

    // Si por alguna razón no encuentra nada, usa la primera fila como respaldo
    if (headers.length === 0) {
      headers = allHeaderRows[0];
    }

    const datos_fila: Record<string, any> = {};
    const headerColMap: Record<string, number> = {};

    // 5. Mapear cada encabezado con su valor actual
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (header && String(header).trim() !== "") {
        const headerStr = String(header).trim();
        // Guardamos el dato que se le enviará a la IA
        datos_fila[headerStr] = rowData[i] ? String(rowData[i]) : "";
        // Guardamos en qué índice (columna) está para luego escribir ahí
        headerColMap[headerStr] = i; 
      }
    }

    return { datos_fila, headerColMap, rowIndex };
  });
}

// ESCRIBIR LOS CAMBIOS (A PRUEBA DE ESPACIOS Y MAYÚSCULAS)
export async function writeSmartData(rowIndex: number, headerColMap: Record<string, number>, datosActualizados: Record<string, any>) {
  return Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getActiveWorksheet();
    
    // FUNCIÓN DE LIMPIEZA EXTREMA (Quita espacios, mayúsculas y saltos de línea)
    const normalize = (str: string) => String(str).trim().toLowerCase().replace(/[\r\n]+/g, '');

    for (const [colName, newValue] of Object.entries(datosActualizados)) {
      
      // Buscamos usando la función de limpieza extrema en ambos lados
      const targetKey = Object.keys(headerColMap).find(
        k => normalize(k) === normalize(colName)
      );
      
      if (targetKey !== undefined) {
        const colIndex = headerColMap[targetKey];
        const cell = sheet.getCell(rowIndex, colIndex);
        
        cell.values = [[newValue]];
        cell.format.fill.color = "#FFFF99"; 
      } else {
        console.warn(`La IA sugirió la columna "${colName}", pero no se encontró en el Excel.`);
      }
    }
    
    await context.sync();
  });
}

// LEER MÚLTIPLES FILAS SELECCIONADAS
export async function getMultipleSmartRowsData() {
  return Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getActiveWorksheet();
    
    // 1. Obtener el rango completo que seleccionaste con el mouse
    const range = context.workbook.getSelectedRange();
    range.load(["rowIndex", "rowCount"]);
    await context.sync();

    const startRow = range.rowIndex;
    const rowCount = range.rowCount;

    // 2. Buscar los encabezados (igual que antes, en las primeras 8 filas)
    const headerRange = sheet.getRange("A1:DZ8");
    headerRange.load("values");
    
    // 3. Cargar los datos específicos del bloque que seleccionaste
    const dataRange = sheet.getRangeByIndexes(startRow, 0, rowCount, 130);
    dataRange.load("values");
    await context.sync();

    const allHeaderRows = headerRange.values;
    const allRowsData = dataRange.values;

    let headers: any[] = [];
    for (let r = 0; r < allHeaderRows.length; r++) {
      const row = allHeaderRows[r];
      if (row.some(c => typeof c === 'string' && (c.toLowerCase().includes('título') || c.toLowerCase().includes('sku')))) {
        headers = row; break;
      }
    }
    if (headers.length === 0) headers = allHeaderRows[0];

    const headerColMap: Record<string, number> = {};
    for (let i = 0; i < headers.length; i++) {
      if (headers[i] && String(headers[i]).trim() !== "") {
        headerColMap[String(headers[i]).trim()] = i;
      }
    }

    // 4. Armar un arreglo con todas las filas válidas
    const rowsData = [];
    for (let r = 0; r < rowCount; r++) {
      const rowData = allRowsData[r];
      const datos_fila: Record<string, any> = {};
      
      for (const [headerStr, colIndex] of Object.entries(headerColMap)) {
        datos_fila[headerStr] = rowData[colIndex] ? String(rowData[colIndex]) : "";
      }
      
      // Evitar procesar filas que estén totalmente en blanco
      if (Object.values(datos_fila).some(v => String(v).trim() !== "")) {
        rowsData.push({ rowIndex: startRow + r, datos_fila });
      }
    }

    return { rowsData, headerColMap };
  });
}

// ESCRIBIR SOLO LAS FILAS QUE APROBASTE EN EL CHECKLIST
export async function writeApprovedSmartData(approvedChanges: any[], headerColMap: Record<string, number>) {
  return Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getActiveWorksheet();
    const normalize = (str: string) => String(str).trim().toLowerCase().replace(/[\r\n]+/g, '');

    // Iteramos solo sobre las filas que el usuario dejó marcadas con el check
    for (const change of approvedChanges) {
      const { rowIndex, datos_actualizados } = change;
      
      for (const [colName, newValue] of Object.entries(datos_actualizados)) {
        const targetKey = Object.keys(headerColMap).find(k => normalize(k) === normalize(colName));
        
        if (targetKey !== undefined) {
          const colIndex = headerColMap[targetKey];
          const cell = sheet.getCell(rowIndex, colIndex);
          cell.values = [[newValue]];
          cell.format.fill.color = "#FFFF99"; 
        }
      }
    }
    await context.sync();
  });
}