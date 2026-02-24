/* global Excel */

export async function getSelectedRowData() {
  return Excel.run(async (context) => {
    // 1. Obtenemos la celda donde el usuario tiene el cursor para saber la fila
    const activeCell = context.workbook.getActiveCell();
    activeCell.load("rowIndex");
    await context.sync();

    // 2. Apuntamos a la hoja activa
    const sheet = context.workbook.worksheets.getActiveWorksheet();
    
    // 3. Seleccionamos el rango exacto: Fila actual, Columna 0 (A), 1 fila de alto, 9 columnas de ancho (hasta la I)
    const rowRange = sheet.getRangeByIndexes(activeCell.rowIndex, 0, 1, 9);
    rowRange.load("values");
    await context.sync();

    // 4. Extraemos los valores. El || "" asegura que si la celda está vacía, envíe un texto en blanco y no un error
    const title = rowRange.values[0][0] || ""; 
    const description = rowRange.values[0][8] || ""; 

    return { title, description, rowIndex: activeCell.rowIndex };
  });
}

export async function writeOptimizedData(rowIndex: number, newTitle: string, newDescription: string) {
  return Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getActiveWorksheet();
    
    // Escribir en la celda del Título (Columna A)
    const titleCell = sheet.getCell(rowIndex, 0);
    titleCell.values = [[newTitle]];
    titleCell.format.fill.color = "#E2EFDA"; // Resaltar en verde que fue optimizado
    
    // Escribir en la celda de Descripción (Columna I)
    const descCell = sheet.getCell(rowIndex, 8);
    descCell.values = [[newDescription]];
    descCell.format.fill.color = "#E2EFDA";

    await context.sync();
  });
}