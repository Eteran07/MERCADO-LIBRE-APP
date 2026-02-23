/* global Excel */

export async function getSelectedRowData() {
  return Excel.run(async (context) => {
    const range = context.workbook.getSelectedRange();
    range.load("values, rowIndex");
    await context.sync();

    // Basado en tu plantilla, asumimos que la columna A (0) es el Título
    // y la columna I (8) es la Descripción. Esto se puede parametrizar.
    const title = range.values[0][0]; 
    const description = range.values[0][8]; 

    return { title, description, rowIndex: range.rowIndex };
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