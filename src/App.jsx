import { useState, useEffect, useCallback } from 'react'
import { SAMPLES } from './data/samples'
import SampleCard from './components/SampleCard'
import RecapTable from './components/RecapTable'

const STORAGE_KEY = 'erta_penilaian_ahli'
const SCRIPT_URL  = 'https://script.google.com/macros/s/AKfycby0PqvvPaY1yvj4GeGYcbt2aU48WGW5fO5Ht56Kc6WSliEaVo7r_I90EaA584D-j04r/exec'
const CRITERIA    = ['akurasi', 'kelengkapan', 'kualitas']

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function initScores() {
  return Object.fromEntries(SAMPLES.map(s => [s.no, {}]))
}

function autoWinner(a, b) {
  if (a == null || b == null) return null
  if (a > b) return 'erta'
  if (b > a) return 'baseline'
  if (a === b && a !== '') return 'sama'
  return null
}

export default function App() {
  const saved = loadState()

  const [identity,   setIdentity]   = useState(saved?.identity ?? {
    nama: '', nip: '', jabatan: '', instansi: '', lamaJabatan: '', tanggal: '',
  })
  const [scores,     setScores]     = useState(saved?.scores ?? initScores())
  const [scriptUrl,  setScriptUrl]  = useState(() => localStorage.getItem(URL_KEY) || '')
  const [submitting, setSubmitting] = useState(false)
  const scriptUrl = SCRIPT_URL
  const [submitMsg,  setSubmitMsg]  = useState(null)
  const [toast,      setToast]      = useState(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ identity, scores }))
  }, [identity, scores])

const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  const setId = (field, val) => setIdentity(p => ({ ...p, [field]: val }))

  const handleScoreChange = useCallback((sampleNo, criteriaKey, val) => {
    setScores(prev => ({
      ...prev,
      [sampleNo]: {
        ...prev[sampleNo],
        [criteriaKey]: criteriaKey === '__notes__'
          ? val
          : { ...(prev[sampleNo]?.[criteriaKey] ?? {}), ...val },
      },
    }))
  }, [])

  const getStatus = (no) => {
    const sc = scores[no]
    if (!sc) return 'empty'
    const filled = CRITERIA.filter(k => sc[k]?.winner).length
    if (filled === 3) return 'done'
    if (filled > 0)  return 'partial'
    return 'empty'
  }

  const doneCnt = SAMPLES.filter(s => getStatus(s.no) === 'done').length
  const pct     = Math.round((doneCnt / SAMPLES.length) * 100)

  // Build 25 flat rows for Google Sheets
  const buildRows = () => SAMPLES.map(s => {
    const sc  = scores[s.no] || {}
    const ak_e = sc.akurasi?.erta        ?? ''
    const ak_b = sc.akurasi?.baseline    ?? ''
    const kl_e = sc.kelengkapan?.erta    ?? ''
    const kl_b = sc.kelengkapan?.baseline ?? ''
    const ku_e = sc.kualitas?.erta       ?? ''
    const ku_b = sc.kualitas?.baseline   ?? ''
    const te   = (Number(ak_e)||0) + (Number(kl_e)||0) + (Number(ku_e)||0)
    const tb   = (Number(ak_b)||0) + (Number(kl_b)||0) + (Number(ku_b)||0)
    const pw   = autoWinner(te, tb)
    return {
      no: s.no, ticker: s.ticker, company: s.company, q: s.q, tier: `T${s.tier}`,
      akurasi_erta: ak_e,     akurasi_baseline: ak_b,     akurasi_pemenang: sc.akurasi?.winner     || '',
      kelengkapan_erta: kl_e, kelengkapan_baseline: kl_b, kelengkapan_pemenang: sc.kelengkapan?.winner || '',
      kualitas_erta: ku_e,    kualitas_baseline: ku_b,    kualitas_pemenang: sc.kualitas?.winner    || '',
      total_erta: te, total_baseline: tb,
      pemenang: pw === 'erta' ? 'ERTA' : pw === 'baseline' ? 'Baseline' : pw === 'sama' ? 'Sama' : '',
      catatan: sc.__notes__ || '',
    }
  })

  // Submit to Google Sheets
  const handleSubmit = async () => {
    if (!scriptUrl.trim()) {
      showToast('Isi URL Google Apps Script terlebih dahulu')
      return
    }
    if (!identity.nama.trim() || !identity.nip.trim()) {
      showToast('Isi Nama dan NIP terlebih dahulu')
      return
    }
    setSubmitting(true)
    setSubmitMsg(null)
    try {
      // no-cors: response opaque, but data tetap masuk ke sheet
      await fetch(scriptUrl.trim(), {
        method:  'POST',
        body:    JSON.stringify({ identity, rows: buildRows() }),
        headers: { 'Content-Type': 'text/plain' },
        mode:    'no-cors',
      })
      setSubmitMsg({ ok: true, text: `✓ Berhasil dikirim — ${doneCnt}/25 sampel terkirim` })
      showToast('Data berhasil dikirim ke Google Sheets ✓')
    } catch (err) {
      setSubmitMsg({ ok: false, text: `✗ Gagal: ${err.message}` })
      showToast('Gagal mengirim: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Export JSON lokal
  const handleExport = () => {
    const data = { identity, rows: buildRows(), exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `penilaian_${identity.nama || 'ahli'}_${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('File JSON berhasil diunduh ✓')
  }

  const handleReset = () => {
    if (!window.confirm('Reset semua jawaban? Data yang belum dikirim akan hilang.')) return
    setScores(initScores())
    setIdentity({ nama:'', nip:'', jabatan:'', instansi:'', lamaJabatan:'', tanggal:'' })
    setSubmitMsg(null)
    localStorage.removeItem(STORAGE_KEY)
    showToast('Data direset ✓')
  }

  return (
    <div className="app-wrapper">

      {/* Header */}
      <div className="form-header">
        <div className="sub">INSTRUMEN PENELITIAN — TESIS MAGISTER TEKNIK INFORMATIKA, BINUS UNIVERSITY 2026</div>
        <h1>FORMULIR PENILAIAN AHLI PAJAK</h1>
        <div className="sub">
          Evaluasi Komparatif: ERTA (Sistem A) vs Baseline (Sistem B)<br/>
          Sistem Tanya-Jawab Laporan Keuangan Berbasis Retrieval-Augmented Generation
        </div>
        <div className="ahli-badge">25 Sampel · 3 Kriteria Penilaian</div>
      </div>

      {/* Identity */}
      <div className="identity-card">
        <h3>Data Evaluator</h3>
        <div className="identity-grid">
          <span className="lbl required">Nama Lengkap</span>
          <input value={identity.nama} onChange={e => setId('nama', e.target.value)}
            placeholder="Nama lengkap evaluator" autoFocus />

          <span className="lbl required">NIP</span>
          <input value={identity.nip} onChange={e => setId('nip', e.target.value)}
            placeholder="Nomor Induk Pegawai" style={{ maxWidth: 260 }} />

          <span className="lbl">Jabatan</span>
          <input value={identity.jabatan} onChange={e => setId('jabatan', e.target.value)}
            placeholder="Contoh: Pemeriksa Pajak" />

          <span className="lbl">Instansi</span>
          <input value={identity.instansi} onChange={e => setId('instansi', e.target.value)}
            placeholder="Contoh: DDIP, Direktorat Jenderal Pajak" />

          <span className="lbl">Lama Jabatan</span>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <input value={identity.lamaJabatan} onChange={e => setId('lamaJabatan', e.target.value)}
              placeholder="0" style={{ width:70 }} />
            <span style={{ fontSize:12, color:'#555' }}>tahun</span>
          </div>

          <span className="lbl required">Tanggal Evaluasi</span>
          <input type="date" value={identity.tanggal} onChange={e => setId('tanggal', e.target.value)}
            style={{ maxWidth: 180 }} />
        </div>

        <div className="petunjuk">
          <strong>Petunjuk:</strong> Untuk setiap sampel, pilih skor <strong>1 = Unggul</strong> atau{' '}
          <strong>0 = Tidak Unggul</strong> untuk ERTA dan Baseline pada tiap kriteria.
          Pemenang terisi otomatis. Data tersimpan otomatis di browser.
          Klik <strong>Simpan ke Google Sheets</strong> setelah selesai mengisi semua sampel.
        </div>

        <div className="progress-wrap">
          <span className="progress-label">Progress: {doneCnt}/{SAMPLES.length} sampel selesai ({pct}%)</span>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width:`${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Progress nav */}
      <div className="progress-nav">
        <span className="nav-lbl">Sampel:</span>
        {SAMPLES.map(s => {
          const st = getStatus(s.no)
          return (
            <a key={s.no} href={`#sample-${s.no}`}
              className={`nav-dot ${st}`}
              title={`#${String(s.no).padStart(2,'0')} ${s.ticker} ${s.q}`}>
              {s.no}
            </a>
          )
        })}
        <span className="nav-legend">● Selesai &nbsp; ● Sebagian &nbsp; ○ Belum</span>
      </div>

      <div className="section-header-bar">Lembar Penilaian Per Sampel</div>

      {/* Sample cards */}
      {SAMPLES.map(s => (
        <SampleCard
          key={s.no}
          id={`sample-${s.no}`}
          sample={s}
          scores={scores[s.no]}
          onChange={(criteriaKey, val) => handleScoreChange(s.no, criteriaKey, val)}
        />
      ))}

      <RecapTable allScores={scores} />

      {/* Declaration */}
      <div className="declaration-section">
        <div className="section-title">Pernyataan Evaluator</div>
        <p className="decl-text">
          Saya yang bertanda tangan di bawah ini menyatakan bahwa penilaian dalam formulir ini dilakukan secara
          <strong> mandiri</strong>, <strong>objektif</strong>, dan <strong>profesional</strong> berdasarkan kompetensi saya.
          Penilaian tidak dipengaruhi oleh hasil penilaian evaluator lain maupun oleh hasil evaluasi otomatis sistem.
        </p>
        <p className="decl-text">
          Formulir ini digunakan sebagai instrumen validasi kualitatif dalam penelitian tesis berjudul{' '}
          <em>"ERTA: Enhanced Retrieval-Augmented Generation for Tax Analysis"</em>,
          Program Magister Teknik Informatika, BINUS University, 2026.
        </p>
        <div className="sign-area">
          <div className="sign-box">
            <div style={{ fontSize:12, marginBottom:8 }}>
              Jakarta,{' '}
              <input type="date" value={identity.tanggal}
                onChange={e => setId('tanggal', e.target.value)}
                style={{ border:'none', borderBottom:'1px solid #555', padding:'2px 4px',
                  fontFamily:'inherit', fontSize:12, background:'transparent' }} />
            </div>
            <div className="sign-space" />
            <div className="sign-line" />
            <div className="sign-name-box">
              <div>( {identity.nama || '                              '} )</div>
              <div style={{ marginTop:3 }}>{identity.jabatan || 'Jabatan'}</div>
              <div>NIP: {identity.nip || '_______________________'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action panel */}
      <div className="export-panel">
        <span className="ep-label">Aksi</span>

        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Mengirim...' : '↑ Simpan ke Google Sheets'}
        </button>

        <button className="btn btn-outline" onClick={handleExport}>↓ Unduh JSON</button>

        <button className="btn btn-outline" onClick={() => window.print()}>⎙ Print</button>

        <button className="btn btn-danger" onClick={handleReset}>✕ Reset</button>

        {submitMsg && (
          <span className={`ep-status ${submitMsg.ok ? 'ok' : 'err'}`}>{submitMsg.text}</span>
        )}

        <span style={{ marginLeft:'auto', fontSize:11, color:'#888' }}>
          Tersimpan otomatis · {doneCnt}/{SAMPLES.length} selesai
        </span>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
