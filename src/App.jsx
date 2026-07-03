import { useState, useEffect } from 'react'
import { SAMPLES } from './data/samples'

const STORAGE_KEY = 'fenrir_eval_v3'
const MODELS = ['FENRIR', 'RoBERTa', 'IndoBERT', 'FinBERT']
const SCRIT_URL = 'https://script.google.com/macros/s/AKfycbyNDh9xq2YfnLozBUVlGJi_3MEML-lnUfcmHpkUJQIZQQdtNm2Bks6hkUweCuJcVwjm/exec'

// RAGAS samples are judged on 3 separate criteria; Embedding samples on retrieval accuracy only.
const CRITERIA_BY_TYPE = {
  ragas: [
    { key: 'akurasi', label: 'Akurasi Faktual' },
    { key: 'kelengkapan', label: 'Kelengkapan Jawaban' },
    { key: 'kualitas', label: 'Kualitas Bukti' },
  ],
  embedding: [
    { key: 'akurasi_retrieval', label: 'Akurasi Retrieval' },
  ],
}

function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return null } }
function isSampleDone(s, choices) {
  const c = choices[s.no] || {}
  return CRITERIA_BY_TYPE[s.type].every(({ key }) => !!c[key])
}

export default function App() {
  const saved = load()
  const [identity, setIdentity] = useState(saved?.identity ?? { nama:'', nip:'', jabatan:'', instansi:'', lamaJabatan:'', tanggal:'' })
  const [choices, setChoices] = useState(saved?.choices ?? Object.fromEntries(SAMPLES.map(s => [s.no, {}])))
  const [toast, setToast] = useState(null)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify({ identity, choices })) }, [identity, choices])

  const toastMsg = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800) }
  const setId = (f, v) => setIdentity(p => ({ ...p, [f]: v }))
  const setChoice = (no, key, val) => setChoices(p => ({ ...p, [no]: { ...(p[no]||{}), [key]: val } }))
  const getStat = (s) => isSampleDone(s, choices) ? 'done' : 'empty'
  const done = SAMPLES.filter(s => isSampleDone(s, choices)).length
  const pct = Math.round(done / SAMPLES.length * 100)

  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState(null)

  const handleSubmit = async () => {
    if (!identity.nama.trim()) { toastMsg('Isi Nama terlebih dahulu'); return }
    setSubmitting(true); setSubmitMsg(null)
    const rows = SAMPLES.map(s => {
      const c = choices[s.no] || {}
      return {
        no: s.no, ticker: s.ticker, company: s.company, q: s.q, tipe: s.tierLabel,
        akurasi: c.akurasi || '', kelengkapan: c.kelengkapan || '', kualitas: c.kualitas || '',
        akurasi_retrieval: c.akurasi_retrieval || '',
      }
    })
    try {
      await fetch(SCRIT_URL, { method: 'POST', body: JSON.stringify({ identity, choices, samples: rows }), headers: { 'Content-Type': 'text/plain' }, mode: 'no-cors' })
      setSubmitMsg({ ok: true, text: `Terkirim — ${done}/${SAMPLES.length} sampel` })
      toastMsg('Data terkirim ke Google Sheets')
    } catch (err) {
      setSubmitMsg({ ok: false, text: `Gagal: ${err.message}` })
    } finally { setSubmitting(false) }
  }

  const exportJSON = () => {
    const data = { identity, choices, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `fenrir-eval-${identity.nama||'anon'}.json`; a.click(); URL.revokeObjectURL(a.href)
    toastMsg('Diekspor ke JSON')
  }
  const reset = () => { if (confirm('Hapus semua jawaban?')) { setChoices(Object.fromEntries(SAMPLES.map(s => [s.no, {}]))); toastMsg('Direset') } }

  return (
    <div className="app-wrapper">
      <div className="intro-card">
        <h3>Formulir ini untuk apa?</h3>
        <p>Bank memiliki laporan keuangan yang sangat tebal dan teknis. Untuk membantu mencari informasi di dalamnya secara otomatis, sedang diuji 4 sistem komputer: satu sistem baru yang dirancang khusus untuk laporan keuangan bank, dan tiga sistem pembanding yang sifatnya umum.</p>
        <p>Di bawah ini ada 25 contoh pertanyaan seputar laporan keuangan sebuah bank. Untuk 15 contoh pertama (RAGAS), keempat sistem menampilkan potongan informasi dan jawaban masing-masing — nilai tiap sistem dari 3 sisi: <strong>akurasi faktual</strong>, <strong>kelengkapan jawaban</strong>, dan <strong>kualitas bukti</strong> pendukung. Untuk 10 contoh terakhir (Embedding), keempat sistem hanya menampilkan potongan informasi yang berhasil ditemukan — nilai dari sisi <strong>akurasi retrieval</strong> saja, yaitu sistem mana yang paling berhasil menemukan potongan informasi yang relevan (bisa dicek langsung lewat tombol "Buka Laporan Keuangan" di tiap contoh).</p>
        <p>Tidak perlu latar belakang teknis komputer — cukup gunakan penilaian Anda sebagai analis yang terbiasa membaca laporan keuangan bank. Pengisian memakan waktu sekitar 20–30 menit.</p>
      </div>

      <div className="form-header">
        <div className="sub">INSTRUMEN PENELITIAN — FENRIR: Domain-Specific Embedding for RAG Bank Supervision (BMEB 2026)</div>
        <h1>FORMULIR PENILAIAN AHLI — Bank Risk Analyst</h1>
        <div className="sub">Evaluasi Komparatif 4 Model Embedding: FENRIR vs RoBERTa vs IndoBERT vs FinBERT</div>
        <div className="ahli-badge">25 Sampel · 15 RAGAS + 10 Embedding · 17 Bank Umum FY2025</div>
      </div>

      <div className="identity-card">
        <h3>Data Evaluator — Bank Risk Analyst</h3>
        <div className="identity-grid">
          <span className="lbl required">Nama Lengkap</span>
          <input value={identity.nama} onChange={e => setId('nama', e.target.value)} placeholder="Nama lengkap" autoFocus />
          <span className="lbl">Jabatan</span>
          <input value={identity.jabatan} onChange={e => setId('jabatan', e.target.value)} placeholder="Contoh: Pengawas Bank, Analis Risiko" />
          <span className="lbl">Institusi</span>
          <input value={identity.instansi} onChange={e => setId('instansi', e.target.value)} placeholder="Contoh: OJK, Bank Indonesia, Bank Mandiri" />
          <span className="lbl">Pengalaman (tahun)</span>
          <div style={{display:'flex',alignItems:'center',gap:6}}><input value={identity.lamaJabatan} onChange={e => setId('lamaJabatan', e.target.value)} placeholder="0" style={{width:70}} /><span style={{fontSize:12,color:'#555'}}>tahun</span></div>
          <span className="lbl required">Tanggal Penilaian</span>
          <input type="date" value={identity.tanggal} onChange={e => setId('tanggal', e.target.value)} style={{maxWidth:180}} />
        </div>

        <div className="petunjuk">
          <strong>Petunjuk:</strong> Untuk setiap sampel, bandingkan output keempat model (FENRIR, RoBERTa, IndoBERT, FinBERT). Untuk sampel RAGAS (#1–15), pilih model terbaik untuk masing-masing 3 kriteria: akurasi faktual, kelengkapan jawaban, kualitas bukti. Untuk sampel Embedding (#16–25), pilih model terbaik untuk 1 kriteria: akurasi retrieval. Jawaban tersimpan otomatis.
        </div>

        <div className="progress-wrap">
          <span className="progress-label">Progress: {done}/{SAMPLES.length} sampel selesai ({pct}%)</span>
          <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{width:`${pct}%`}} /></div>
        </div>
      </div>

      <div className="progress-nav">
        <span className="nav-lbl">Sampel:</span>
        {SAMPLES.map(s => <a key={s.no} href={`#sample-${s.no}`} className={`nav-dot ${getStat(s)}`} title={`#${String(s.no).padStart(2,'0')} ${s.ticker} ${s.q}`}>{s.no}</a>)}
        <span className="nav-legend">Selesai / Belum</span>
      </div>

      <div className="section-header-bar">Lembar Penilaian Per Sampel</div>

      {SAMPLES.map(s => (
        <SampleCard key={s.no} s={s} choice={choices[s.no] || {}} onChoose={(key, m) => setChoice(s.no, key, m)} />
      ))}

      <RecapTable choices={choices} />

      <div className="declaration-section">
        <div className="section-title">Pernyataan Evaluator</div>
        <p>Saya menyatakan bahwa penilaian dilakukan secara objektif berdasarkan perbandingan kualitas output keempat model embedding (FENRIR, RoBERTa, IndoBERT, FinBERT) untuk analisis laporan keuangan perbankan Indonesia, dinilai per kriteria (akurasi faktual, kelengkapan jawaban, kualitas bukti untuk sampel RAGAS; akurasi retrieval untuk sampel Embedding).</p>
        <div style={{marginTop:12,fontSize:12,color:'#444'}}>Tanda tangan: ______________</div>
      </div>

      <div className="export-panel">
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Mengirim...' : 'Simpan ke Google Sheets'}</button>
        <button className="btn btn-outline" onClick={exportJSON}>Export JSON</button>
        <button className="btn btn-outline" onClick={reset}>Reset</button>
        <span className="ep-status ok" style={{marginLeft:12}}>{done===SAMPLES.length?'Semua dinilai':`${done}/${SAMPLES.length} sampel`}</span>
        {submitMsg && <span className={`ep-status ${submitMsg.ok?'ok':'err'}`} style={{marginLeft:8}}>{submitMsg.text}</span>}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function SampleCard({ s, choice, onChoose }) {
  const [pdf, setPdf] = useState(false)
  const [fenrirOpen, setFenrirOpen] = useState(true)
  const [robertaOpen, setRobertaOpen] = useState(false)
  const [indobertOpen, setIndoOpen] = useState(false)
  const [finbertOpen, setFinOpen] = useState(false)

  const ctxKey = m => m==='FENRIR'?'fenrir_ctx':m==='RoBERTa'?'roberta_ctx':m==='IndoBERT'?'indobert_ctx':'finbert_ctx'
  const ansKey = m => m==='FENRIR'?'fenrir_answer':m==='RoBERTa'?'roberta_answer':m==='IndoBERT'?'indobert_answer':'finbert_answer'
  const isRagas = s.type === 'ragas'
  const criteria = CRITERIA_BY_TYPE[s.type]
  const filledCount = criteria.filter(c => choice[c.key]).length

  return (
    <div className="sample-card" id={`sample-${s.no}`}>
      <div className="sample-header">
        <span className="sample-no">#{String(s.no).padStart(2,'0')}</span>
        <span className="sample-ticker">{s.ticker}</span>
        <span className="sample-company">{s.company}</span>
        <span className="sample-q">{s.q}</span>
        <span className="tier-pill">{s.tierLabel}</span>
        <button className="btn-pdf" onClick={() => setPdf(v => !v)}>{pdf?'Tutup':'Buka'} Laporan Keuangan</button>
      </div>

      {pdf && <div className="pdf-viewer"><div className="pdf-toolbar"><span>Laporan Keuangan — {s.company} ({s.ticker})</span><a href={`${import.meta.env.BASE_URL}pdf/${s.pdfFile}`} target="_blank" rel="noreferrer" className="pdf-newtab">Buka di Tab Baru</a><button className="pdf-close" onClick={()=>setPdf(false)}>Tutup</button></div><iframe src={`${import.meta.env.BASE_URL}pdf/${s.pdfFile}`} title={`Lapkeu ${s.ticker}`} className="pdf-frame" /></div>}

      <div className="sample-body">
        <div className="question-box">{s.question}</div>

        {/* 4 Model panels — collapsible */}
        {[
          { m:'FENRIR', open:fenrirOpen, setOpen:setFenrirOpen, tag:'Domain-Specific', border:'#222' },
          { m:'RoBERTa', open:robertaOpen, setOpen:setRobertaOpen, tag:'General-Purpose', border:'#666' },
          { m:'IndoBERT', open:indobertOpen, setOpen:setIndoOpen, tag:'Indonesian Language', border:'#888' },
          { m:'FinBERT', open:finbertOpen, setOpen:setFinOpen, tag:'English Finance', border:'#999' },
        ].map(({m, open, setOpen, tag, border}) => (
          <div key={m} className="answer-panel" style={{border:'1px solid #d8d8d8',borderRadius:2,marginBottom:6,background:'#fff'}}>
            <div className="ap-header" onClick={() => setOpen(!open)} style={{background:m==='FENRIR'?'#fafafa':'#fff'}}>
              <span>{m} <span style={{fontSize:9,color:'#888',fontWeight:400}}>{tag}</span></span>
              <span className={`ap-toggle ${open?'open':''}`}>{open?'Tutup':'Buka'}</span>
            </div>
            {open && (
              <div className="ap-body">
                {isRagas ? (
                  <>
                    <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:.4,color:'#888',marginBottom:4}}>Retrieved Context</div>
                    <pre style={{fontSize:11,lineHeight:1.4,whiteSpace:'pre-wrap',fontFamily:'inherit',color:'#444',margin:'0 0 10px',background:'#f9f9f9',padding:8,borderRadius:2}}>{s[ctxKey(m)]}</pre>
                    <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:.4,color:'#888',marginBottom:4}}>Generated Answer</div>
                    <p style={{fontSize:13,lineHeight:1.6,color:'#1a1a1a',margin:0}} dangerouslySetInnerHTML={{__html: s[ansKey(m)]}} />
                  </>
                ) : (
                  <>
                    <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:.4,color:'#888',marginBottom:4}}>Top-3 Retrieved Chunks</div>
                    <pre style={{fontSize:11,lineHeight:1.4,whiteSpace:'pre-wrap',fontFamily:'inherit',color:'#444',margin:0,background:'#f9f9f9',padding:8,borderRadius:2}}>{s[ctxKey(m)]}</pre>
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        <table className="criteria-table" style={{marginTop:10}}>
          <thead>
            <tr>
              <th style={{width:170}}>Kriteria</th>
              <th>Pilih Model Terbaik</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map(({key, label}) => {
              const w = choice[key] || null
              return (
                <tr key={key}>
                  <td>{label}</td>
                  <td>
                    <div className="winner-radio-group">
                      {['FENRIR', 'RoBERTa', 'IndoBERT', 'FinBERT'].map(m => (
                        <label key={m} className={`winner-radio ${w===m?'selected':''}`}>
                          <input type="radio" name={`s${s.no}-${key}`} checked={w===m} onChange={() => onChoose(key, m)} />
                          {m}
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div style={{marginTop:6,fontSize:11,color: filledCount===criteria.length ? '#2a7a2a' : '#999'}}>
          {filledCount===criteria.length ? 'Semua kriteria sampel ini sudah dinilai' : `${filledCount}/${criteria.length} kriteria dinilai`}
        </div>
      </div>
    </div>
  )
}

function RecapTable({ choices }) {
  const counts = {}; for (const m of MODELS) counts[m] = 0
  let totalVotes = 0
  SAMPLES.forEach(s => {
    const c = choices[s.no] || {}
    CRITERIA_BY_TYPE[s.type].forEach(({key}) => { const v = c[key]; if (v) { counts[v]++; totalVotes++ } })
  })
  const fenrirPct = totalVotes > 0 ? (counts['FENRIR'] / totalVotes * 100).toFixed(1) : '0'
  const doneCount = SAMPLES.filter(s => isSampleDone(s, choices)).length

  const cell = (v) => v ? <span style={{display:'inline-block',padding:'2px 8px',border:'1px solid #999',borderRadius:2,fontSize:10,fontWeight:700,background:v==='FENRIR'?'#222':'#fff',color:v==='FENRIR'?'#fff':'#333'}}>{v}</span> : <span style={{color:'#ccc'}}>—</span>

  return (
    <div className="recap-section">
      <div className="section-title">Rekap Hasil Penilaian</div>
      <p style={{fontSize:12,color:'#555',marginTop:4}}>FENRIR dipilih pada <b>{counts['FENRIR']}/{totalVotes}</b> total penilaian kriteria (<b>{fenrirPct}%</b>)</p>

      <table className="recap-table" style={{width:'100%',borderCollapse:'collapse',fontSize:11,marginTop:12}}>
        <thead><tr style={{borderBottom:'2px solid #333'}}>
          <th style={{padding:'4px 6px',textAlign:'left',fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:.3,color:'#555'}}>No</th>
          <th style={{padding:'4px 6px',textAlign:'left'}}>Ticker</th>
          <th style={{padding:'4px 6px',textAlign:'left'}}>Q</th>
          <th style={{padding:'4px 6px',textAlign:'left'}}>Tipe</th>
          <th style={{padding:'4px 6px',textAlign:'center'}}>Akurasi</th>
          <th style={{padding:'4px 6px',textAlign:'center'}}>Kelengkapan</th>
          <th style={{padding:'4px 6px',textAlign:'center'}}>Kualitas</th>
          <th style={{padding:'4px 6px',textAlign:'center'}}>Akurasi Retrieval</th>
        </tr></thead>
        <tbody>
          {SAMPLES.map(s => {
            const c = choices[s.no] || {}
            return (
              <tr key={s.no} style={{borderBottom:'1px solid #e0e0e0'}}>
                <td style={{padding:'3px 6px',fontWeight:600}}>{s.no}</td>
                <td style={{padding:'3px 6px',fontWeight:600}}>{s.ticker}</td>
                <td style={{padding:'3px 6px'}}>{s.q}</td>
                <td style={{padding:'3px 6px',fontSize:10,color:'#888'}}>{s.tierLabel}</td>
                <td style={{padding:'3px 6px',textAlign:'center'}}>{s.type==='ragas' ? cell(c.akurasi) : ''}</td>
                <td style={{padding:'3px 6px',textAlign:'center'}}>{s.type==='ragas' ? cell(c.kelengkapan) : ''}</td>
                <td style={{padding:'3px 6px',textAlign:'center'}}>{s.type==='ragas' ? cell(c.kualitas) : ''}</td>
                <td style={{padding:'3px 6px',textAlign:'center'}}>{s.type==='embedding' ? cell(c.akurasi_retrieval) : ''}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot><tr style={{borderTop:'2px solid #333',fontWeight:700}}><td colSpan={4} style={{padding:'6px'}}>Total sampel selesai</td><td colSpan={4} style={{padding:'6px',textAlign:'center'}}>{doneCount}/{SAMPLES.length}</td></tr></tfoot>
      </table>

      <div style={{marginTop:16,display:'flex',gap:16}}>
        {MODELS.map(m => <div key={m} style={{textAlign:'center',padding:'8px 14px',border:`1px solid ${m==='FENRIR'?'#222':'#ddd'}`,borderRadius:2,background:m==='FENRIR'?'#fafafa':'#fff',flex:1}}><div style={{fontSize:20,fontWeight:900,color:m==='FENRIR'?'#111':'#666'}}>{counts[m]}</div><div style={{fontSize:10,color:'#888'}}>{m}</div><div style={{fontSize:11,fontWeight:600}}>{totalVotes>0?(counts[m]/totalVotes*100).toFixed(1):'0'}%</div></div>)}
      </div>
    </div>
  )
}
