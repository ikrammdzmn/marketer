This documentation is split into two parts: a User Guide for daily operations and a Technical Manual for setup and maintenance.

📖 User Guide: HIM WELLNESS Sales System
1. Overview
This system automatically processes your daily shop exports. It calculates Total Sales, Total Orders, and Unique Customers while automatically ignoring canceled orders. It is designed to allow "updates"—if you upload a newer file for the same day, the system will simply overwrite the old numbers with the latest data.
2. The "Must-Follow" Naming Rule
For the system to know which day it is processing, you must put the date inside square brackets [ ] at the end of your filename.
Correct Format: All order-2025-12-31-16_39 [2025-12-31].csv
Update Format: All order-2025-12-31-22_00 [2025-12-31-updated].csv
Note: The script looks for the first 10 characters after the [.
3. Daily Workflow
Export: Download your "All Order" CSV from your seller portal.
Rename (Optional): Ensure the date is in brackets as shown above.
Upload: Drop the file into the Google Drive folder named HIM_Upload.
View Results: Open your Google Sheet.
If the "Trigger" is set, the data will appear automatically within the hour.
To see results immediately, go to Extensions > Apps Script and click Run.


Check Archive: Once processed, the file will move to the HIM_Archive folder automatically.
4. Reading the Report
Total Sales (RM): The sum of all item prices after discounts.
Total Orders: The number of unique packages sold (ignores duplicate rows for free gifts).
Total Customers: The number of unique people who bought (ignores if one person bought multiple times).
Last Updated: Shows you exactly when the data was last refreshed.

🛠 Developer Manual: HIM WELLNESS Data Engine
1. Technical Stack
Storage: Google Drive (Blob storage for CSVs).
Processor: Google Apps Script (JavaScript 1.6+ / V8 Engine).
Database/UI: Google Sheets.
2. Data Mapping (CSV Columns)
The script relies on fixed column indices. If the export format changes, these must be updated:
Index 0 (Order ID): Used to identify unique orders via Set().
Index 1 (Order Status): Logic gate. Rows matching "Canceled" are ignored.
Index 15 (SKU Subtotal After Discount): Parsed as a Float for math.
Index 38 (Buyer Username): Used to identify unique customers via Set().
3. Core Logic Functions
Date Extraction: Uses RegEx /\[(\d{4}-\d{2}-\d{2})/ to capture the date within brackets.
Uniqueness: Uses the Set object to handle the "One Order = Multiple Rows" problem inherent in SKU-level exports.
Override Mechanism: The script iterates through Column A of the Google Sheet. If fileDateKey === sheetDate, it retrieves that row index and performs a .setValues() instead of .appendRow().
4. The Code
code JavaScript
downloadcontent_copy
expand_less
   const FOLDER_INPUT_ID = 'YOUR_UPLOAD_FOLDER_ID'; 
const FOLDER_ARCHIVE_ID = 'YOUR_ARCHIVE_FOLDER_ID';
const SHEET_NAME = 'Daily_Report';

function processDailyCSVs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const header = [["Date", "Total Sales (RM)", "Total Orders", "Total Customers", "Last Updated", "Source Filename"]];
    sheet.getRange(1, 1, 1, 6).setValues(header).setFontWeight("bold");
  }

  const inputFolder = DriveApp.getFolderById(FOLDER_INPUT_ID);
  const archiveFolder = DriveApp.getFolderById(FOLDER_ARCHIVE_ID);
  const files = inputFolder.getFiles();

  while (files.hasNext()) {
    let file = files.next();
    let fileName = file.getName();
    let dateMatch = fileName.match(/\[(\d{4}-\d{2}-\d{2})/);
    
    if (!dateMatch) continue;
    let fileDateKey = dateMatch[1]; 

    let csvData = Utilities.parseCsv(file.getBlob().getDataAsString());
    let totalSales = 0;
    let uniqueOrders = new Set();
    let uniqueCustomers = new Set();

    for (let i = 1; i < csvData.length; i++) {
      let row = csvData[i];
      if (row.length < 38) continue;

      if (row[1].trim() !== "Canceled") {
        let salesVal = parseFloat(row[15].replace(/[^0-9.]/g, '')) || 0;
        totalSales += salesVal;
        uniqueOrders.add(row[0].trim());
        uniqueCustomers.add(row[38].trim());
      }
    }

    let finalRowData = [fileDateKey, Number(totalSales.toFixed(2)), uniqueOrders.size, uniqueCustomers.size, new Date(), fileName];
    let sheetData = sheet.getDataRange().getValues();
    let targetRowIndex = -1;

    for (let j = 1; j < sheetData.length; j++) {
      let rowDateStr = (sheetData[j][0] instanceof Date) ? Utilities.formatDate(sheetData[j][0], Session.getScriptTimeZone(), "yyyy-MM-dd") : sheetData[j][0].toString().trim();
      if (rowDateStr === fileDateKey) { targetRowIndex = j + 1; break; }
    }

    if (targetRowIndex > -1) {
      sheet.getRange(targetRowIndex, 1, 1, 6).setValues([finalRowData]);
    } else {
      sheet.appendRow(finalRowData);
    }
    file.moveTo(archiveFolder);
  }
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).sort({column: 1, ascending: false});
}
 
5. Troubleshooting
Error: "Folder not found": Verify the Folder IDs in the variables match the URL of the Google Drive folders.
Wrong Totals: Check if the CSV export has added or removed columns. The script expects the sales value at column 16 (Index 15).
Script Timeouts: If processing 100+ files at once, the script may hit the 6-minute Google limit. Process files daily to avoid this.

