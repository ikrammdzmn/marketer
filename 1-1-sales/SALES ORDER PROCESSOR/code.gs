/**
 * HIM WELLNESS - Unified Daily Sales Processor (v3.0)
 * Logic A (Gross): Excludes "Canceled" only (Cols A-F)
 * Logic B (Net): Excludes "Canceled" AND "Return/Refund" (Cols I-N)
 * Spacer: Col G (Last Checked) and Col H (Empty)
 */

const FOLDER_INPUT_ID = '1ti8_yOP2SFyKyiH-D8Fol_rqAcP6zxzo'; 
const FOLDER_ARCHIVE_ID = '1zlH8OAR8sSq_I4bx5XOrtOjbn1eXrgwo';
const SHEET_NAME = 'Daily_Report';

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 HIM Tools')
    .addItem('Process Upload Folder', 'processDailyCSVs')
    .addToUi();
}

function processDailyCSVs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  // 1. Setup Headers if sheet is new
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const header = [
      ["Date", "Total Sales (Gross)", "Total Orders", "Total Customers", "Last Updated", "Source Filename", "SYSTEM STATUS", "", "Date", "Total Sales (Net)", "Total Orders", "Total Customers", "Last Updated", "Source Filename"]
    ];
    sheet.getRange(1, 1, 1, 14).setValues(header).setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.getRange("G1").setBackground("#f3f3f3");
  }

  // 2. Heartbeat (Cell G1)
  sheet.getRange("G1").setValue("Last Checked: " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm:ss"));
  sheet.getRange("G1").setFontColor("#666666").setFontSize(8);

  const inputFolder = DriveApp.getFolderById(FOLDER_INPUT_ID);
  const archiveFolder = DriveApp.getFolderById(FOLDER_ARCHIVE_ID);
  const files = inputFolder.getFiles();

  if (!files.hasNext()) {
    console.log("No files found.");
    return;
  }

  while (files.hasNext()) {
    let file = files.next();
    let fileName = file.getName();
    let dateMatch = fileName.match(/\[(\d{4}-\d{2}-\d{2})/);
    
    if (!dateMatch) continue;
    let fileDateKey = dateMatch[1]; 

    let csvString = file.getBlob().getDataAsString();
    let csvData = safeParseCsv(csvString);
    
    // Logic A Counters (Exclude Cancel Only)
    let salesA = 0;
    let ordersA = new Set();
    let customersA = new Set();

    // Logic B Counters (Exclude Cancel + Return/Refund)
    let salesB = 0;
    let ordersB = new Set();
    let customersB = new Set();

    for (let i = 1; i < csvData.length; i++) {
      let row = csvData[i];
      if (row.length < 39) continue;

      let orderId = (row[0] || "").toString().trim();          // Col A
      let orderStatus = (row[1] || "").toString().trim();      // Col B
      let cancelType = (row[3] || "").toString().trim();       // Col D
      let platformDiscount = cleanNumber(row[13]);             // Col N
      let skuSubtotal = cleanNumber(row[15]);                  // Col P
      let username = (row[38] || "").toString().trim();         // Col AM

      let statusLower = orderStatus.toLowerCase();
      let cancelLower = cancelType.toLowerCase();

      // Flags
      let isCanceled = (statusLower === "canceled" || statusLower === "cancelled" || orderStatus === "");
      let isCancelType = cancelLower.includes("cancel");
      let isReturnOrRefund = (cancelLower.includes("return") || cancelLower.includes("refund"));

      // --- PROCESS LOGIC A (Exclude Canceled Only) ---
      if (!isCanceled) {
        salesA += (platformDiscount + skuSubtotal);
        ordersA.add(orderId);
        customersA.add(username);
      }

      // --- PROCESS LOGIC B (Exclude Canceled AND Return/Refund) ---
      if (!isCanceled && !isCancelType && !isReturnOrRefund) {
        salesB += (platformDiscount + skuSubtotal);
        ordersB.add(orderId);
        customersB.add(username);
      }
    }

    // 3. Prepare full data row (Cols A to N)
    // A-F (Logic A), G (System), H (Empty), I-N (Logic B)
    let now = new Date();
    let finalRowData = [
      fileDateKey, Number(salesA.toFixed(2)), ordersA.size, customersA.size, now, fileName, // A-F
      "UP-TO-DATE", "",                                                                   // G-H
      fileDateKey, Number(salesB.toFixed(2)), ordersB.size, customersB.size, now, fileName  // I-N
    ];

    // 4. Update Existing Date Row or Append New
    let sheetData = sheet.getDataRange().getValues();
    let targetRowIndex = -1;
    for (let j = 1; j < sheetData.length; j++) {
      let rowDateStr = (sheetData[j][0] instanceof Date) 
        ? Utilities.formatDate(sheetData[j][0], Session.getScriptTimeZone(), "yyyy-MM-dd") 
        : sheetData[j][0].toString().trim();

      if (rowDateStr === fileDateKey) {
        targetRowIndex = j + 1; 
        break;
      }
    }

    if (targetRowIndex > -1) {
      sheet.getRange(targetRowIndex, 1, 1, 14).setValues([finalRowData]);
    } else {
      sheet.appendRow(finalRowData);
    }
    
    // 5. Move to Archive
    file.moveTo(archiveFolder);
  }
  
  // Sort by date Descending
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 14).sort({column: 1, ascending: false});
  }
}

/**
 * Robust CSV Parser
 */
function safeParseCsv(data) {
  data = data.replace(/^\uFEFF/, '');
  try {
    return Utilities.parseCsv(data);
  } catch (e) {
    const rows = [];
    const pattern = /(,|\r?\n|\r|^)(?:"([^"]*(?:""[^"]*)*)"|([^",\r\n]*))/gi;
    let currRow = [];
    let matches;
    while (matches = pattern.exec(data)) {
      if (matches[1].length && matches[1] !== ",") rows.push(currRow), currRow = [];
      currRow.push(matches[2] !== undefined ? matches[2].replace(/""/g, '"') : matches[3]);
    }
    rows.push(currRow);
    return rows;
  }
}

/**
 * Currency Cleaner
 */
function cleanNumber(val) {
  if (!val) return 0;
  let cleaned = val.toString().replace(/[^\d.]/g, '');
  return parseFloat(cleaned) || 0;
}