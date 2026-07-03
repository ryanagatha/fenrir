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
        'Akurasi_Faktual', 'Kelengkapan_Jawaban', 'Kualitas_Bukti', 'Akurasi_Retrieval'
      ])
      sheet.setFrozenRows(1)
    }

    const payload  = JSON.parse(e.postData.contents)
    const identity = payload.identity || {}
    const ts       = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })

    // Write one row per sample (each row carries its own per-criterion winners)
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
        s.akurasi || '', s.kelengkapan || '', s.kualitas || '', s.akurasi_retrieval || ''
      ])
    })

    // Summary sheet — tally every criterion selection across all samples as one vote
    let summary = ss.getSheetByName('Ringkasan')
    if (!summary) {
      summary = ss.insertSheet('Ringkasan')
      summary.appendRow(['Timestamp', 'Nama', 'Jabatan', 'Institusi', 'Total', 'FENRIR', 'RoBERTa', 'IndoBERT', 'FinBERT', 'FENRIR %'])
      summary.setFrozenRows(1)
    }
    const counts = { FENRIR: 0, RoBERTa: 0, IndoBERT: 0, FinBERT: 0 }
    SAMPLES.forEach(s => {
      [s.akurasi, s.kelengkapan, s.kualitas, s.akurasi_retrieval].forEach(v => {
        if (v && counts.hasOwnProperty(v)) counts[v]++
      })
    })
    const total = counts.FENRIR + counts.RoBERTa + counts.IndoBERT + counts.FinBERT
    summary.appendRow([ts, identity.nama, identity.jabatan, identity.instansi, total, counts.FENRIR, counts.RoBERTa, counts.IndoBERT, counts.FinBERT, total > 0 ? (counts.FENRIR/total*100).toFixed(1)+'%' : '0%'])

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
