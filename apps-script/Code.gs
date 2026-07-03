/**
 * FENRIR — Formulir Penilaian Bank Risk Analyst
 * Google Apps Script Web App
 *
 * Cara deploy:
 * 1. Buka Google Sheet baru → Extensions → Apps Script
 * 2. Paste seluruh kode ini
 * 3. Klik Deploy → New deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy URL → paste ke SCRIT_URL di App.jsx
 */

function doPost(e) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet()
    let   sheet = ss.getSheetByName('Penilaian')

    if (!sheet) {
      sheet = ss.insertSheet('Penilaian')
      sheet.appendRow([
        'Timestamp', 'Nama', 'Jabatan', 'Institusi', 'Pengalaman', 'Tanggal',
        'No', 'Ticker', 'Perusahaan', 'Q', 'Tipe',
        'Model_Dipilih'
      ])
      sheet.setFrozenRows(1)
    }

    const payload  = JSON.parse(e.postData.contents)
    const identity = payload.identity || {}
    const choices  = payload.choices || {}
    const ts       = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })

    // Write one row per sample
    const SAMPLES = payload.samples || []
    SAMPLES.forEach(s => {
      sheet.appendRow([
        ts,
        identity.nama         || '',
        identity.jabatan      || '',
        identity.instansi     || '',
        identity.lamaJabatan  || '',
        identity.tanggal      || '',
        s.no, s.ticker, s.company, s.q, s.tipe,
        choices[s.no] || ''
      ])
    })

    // Summary sheet
    let summary = ss.getSheetByName('Ringkasan')
    if (!summary) {
      summary = ss.insertSheet('Ringkasan')
      summary.appendRow(['Timestamp', 'Nama', 'Jabatan', 'Institusi', 'Total', 'FENRIR', 'RoBERTa', 'IndoBERT', 'FinBERT', 'FENRIR %'])
      summary.setFrozenRows(1)
    }
    const fenrir = Object.values(choices).filter(c => c === 'FENRIR').length
    const roberta = Object.values(choices).filter(c => c === 'RoBERTa').length
    const indobert = Object.values(choices).filter(c => c === 'IndoBERT').length
    const finbert = Object.values(choices).filter(c => c === 'FinBERT').length
    const total = fenrir + roberta + indobert + finbert
    summary.appendRow([ts, identity.nama, identity.jabatan, identity.instansi, total, fenrir, roberta, indobert, finbert, total > 0 ? (fenrir/total*100).toFixed(1)+'%' : '0%'])

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', saved: SAMPLES.length }))
      .setMimeType(ContentService.MimeType.JSON)

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ready', app: 'FENRIR Bank Risk Analyst Evaluation' }))
    .setMimeType(ContentService.MimeType.JSON)
}
