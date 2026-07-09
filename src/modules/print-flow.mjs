export function shouldStartAutoPrint({ sheetDataUrl, isPrinting, hasAttemptedPrint }) {
  return Boolean(sheetDataUrl) && !isPrinting && !hasAttemptedPrint;
}
