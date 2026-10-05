📑 System Documentation: HIM WELLNESS Daily Sales Processor

Version: 3.0 (Unified Dual-Logic)
Purpose: To automate the calculation of "Gross Sales" (excluding only cancels)
and "Net Sales" (excluding cancels, returns, and refunds) from raw e-commerce
CSV exports.

⚙️ How the Script Works

The script operates on a "Dual-Stream" architecture. It processes every row of
an uploaded CSV once but applies two different sets of filters simultaneously to
produce two distinct reports on one sheet.

1. File Handling

  Input: The script monitors the Google Drive folder 1ti8_yOP2SFyKyiH-D8Fol_rqAcP6zxzo.
  Identification: It extracts the date from the filename (e.g., [2026-04-28]) to ensure data is mappe to the correct day.
 Archive: Once processed, the file is moved to  1zlH8OAR8sSq_I4bx5XOrtOjbn1eXrgwo to prevent re-processing.

2. The Data Logic

The script looks at specific columns in your CSV to perform calculations:


Data Point
CSV Column
Index
Logic Used
Order ID
Column A
0
Used for unique Order Count.
Order Status
Column B
1
Checks for "Canceled" or "Cancelled".
Cancel Type
Column D
3
Checks for "Cancel", "Return", or "Refund".
Sales Value
Col N + Col P
13 + 15
Platform Discount + SKU Subtotal.
Customer
Column AM
38
Buyer Username for unique Customer Count.


3. Comparison of Output

  -Columns A–F (Standard/Gross): Only filters out "Canceled" status. This shows the total volume of successful orders created.
  Columns I–N (Strict/Net): Filters out "Canceled" AND any row marked as "Return" or "Refund". This shows the actual finalized revenue you keep.
  -Column G: Displays the "System Status" and last update time.

📊 Comparison: Script vs. Manual Tracking


Feature
Manual Process (Your Current Flow)
Automated Script (v3.0)
Filtering Data
Manually filter Column D and delete rows containing cancels/refunds.
Non-destructive. Script reads the data and skips invalid rows without deleting anything.
Sales Calculation
Create a new column, add =N+P for every row, then =SUM the bottom.
Automatically sums N+P for every valid row in milliseconds.
Order Counting
Filter out "Total" rows in Column Q and count the remaining rows.
Unique ID Count. Uses a Set to count unique Order IDs (Column A).
Customer Counting
Requires using =UNIQUE() or manual de-duplication of Column AM.
Automatically identifies unique usernames (Column AM) using a Set.
Data Integrity
High risk of human error (accidentally deleting a valid row or missing one).
100% Consistent. The same logic is applied to every file every time.
Efficiency
~5-10 minutes per file (multiplied by 2 for both versions).
~5 seconds for both versions simultaneously.


💡 Why the Script is Better (The "Hidden" Advantages)

1. The "Multiple Item" Correction

In Shopee/TikTok exports, if a customer buys 3 different products in one order,
it appears as 3 rows in the CSV.

  Manual Error: If you count rows manually, you would record this as 3 orders.
  Script Accuracy: The script sees the same Order ID on all 3 rows and counts it as 1 order. This gives you a much more accurate "Average Order Value."

2. Time-Gap Protection

If you upload a file for April 28th today, and then realize you need to update
it tomorrow:

  Manual: You have to find the old data, delete it, and re-do the whole process.
  Script: Just upload the new file. The script finds the "April 28" row, overwrites the old numbers, and moves the file.

3. Standardized "Net" Revenue

Manual tracking of returns/refunds is difficult because the "Return" status
might be in a different column than the "Cancel" status. The script uses Fuzzy
Logic (searching for the words "return" or "refund" anywhere in the cell) to
ensure no returned money is accidentally counted as profit.

Final Recommendation for Use

To ensure your data remains clean:

1.  Do not edit Columns A-N manually. Let the script handle all entries.
2.  Use Column G/H as your "Safety Zone." If Column G says "UP-TO-DATE," you can
    trust that both sides of the report are perfectly synced.
3.  Check the Archive Folder. If a file fails to process, it will stay in the
    Input folder, alerting you that something in the CSV format might have
    changed.


