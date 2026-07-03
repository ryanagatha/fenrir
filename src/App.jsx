import { useState, useEffect } from 'react'
import { SAMPLES } from './data/samples'

const STORAGE_KEY = 'fenrir_eval_v2'
const MODELS = ['FENRIR', 'RoBERTa', 'IndoBERT', 'FinBERT']
const SCRIT_URL = 'https://script.google.com/macros/s/AKfycbxe_baUVTdMy8-5mhzeklA5GJyVu0KCFqD984aEiMDSu-afJhzyOtF5XfjHGJwmFwG1/exec'

function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return null } }

export default function App() {
  const saved = load()
  const [identity, setIdentity] = useState(saved?.identity ?? { nama:'', nip:'', jabatan:'', instansi:'', lamaJabatan:'', tanggal:'' })
  const [choices, setChoices] = useState(saved?.choices ?? Object.fromEntries(SAMPLES.map(s => [s.no, null])))
  const [toast, setToast] = useState(null)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify({ identity, choices })) }, [identity, choices])

  const toastMsg = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800) }
  const setId = (f, v) => setIdentity(p => ({ ...p, [f]: v }))
  const getStat = (no) => choices[no] ? 'done' : 'empty'
  const done = Object.values(choices).filter(Boolean).length
  const pct = Math.round(done / SAMPLES.length * 100)

  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState(null)

  const handleSubmit = async () => {
    if (!identity.nama.trim()) { toastMsg('Isi Nama terlebih dahulu'); return }
    setSubmitting(true); setSubmitMsg(null)
    const rows = SAMPLES.map(s => ({ no: s.no, ticker: s.ticker, company: s.company, q: s.q, tipe: s.tierLabel }))
    try {
      await fetch(SCRIT_URL, { method: 'POST', body: JSON.stringify({ identity, choices, samples: rows }), headers: { 'Content-Type': 'text/plain' }, mode: 'no-cors' })
      setSubmitMsg({ ok: true, text: `✓ Terkirim — ${done}/${SAMPLES.length} sampel` })
      toastMsg('Data terkirim ke Google Sheets ✓')
    } catch (err) {
      setSubmitMsg({ ok: false, text: `✗ Gagal: ${err.message}` })
    } finally { setSubmitting(false) }
  }

  const exportJSON = () => {
    const data = { identity, choices, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `fenrir-eval-${identity.nama||'anon'}.json`; a.click(); URL.revokeObjectURL(a.href)
    toastMsg('Diekspor ke JSON')
  }
  const reset = () => { if (confirm('Hapus semua jawaban?')) { setChoices(Object.fromEntries(SAMPLES.map(s => [s.no, null]))); toastMsg('Direset') } }

  return (
    <div className="app-wrapper">
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
          <strong>Petunjuk:</strong> Untuk setiap sampel, bandingkan output keempat model (FENRIR, RoBERTa, IndoBERT, FinBERT). Pilih <strong>satu model terbaik</strong> berdasarkan kualitas retrieved context dan jawaban yang dihasilkan. Jawaban tersimpan otomatis.
        </div>

        <div className="progress-wrap">
          <span className="progress-label">Progress: {done}/{SAMPLES.length} sampel selesai ({pct}%)</span>
          <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{width:`${pct}%`}} /></div>
        </div>
      </div>

      <div className="progress-nav">
        <span className="nav-lbl">Sampel:</span>
        {SAMPLES.map(s => <a key={s.no} href={`#sample-${s.no}`} className={`nav-dot ${getStat(s.no)}`} title={`#${String(s.no).padStart(2,'0')} ${s.ticker} ${s.q}`}>{s.no}</a>)}
        <span className="nav-legend">● Selesai &nbsp; ○ Belum</span>
      </div>

      <div className="section-header-bar">Lembar Penilaian Per Sampel</div>

      {SAMPLES.map(s => (
        <SampleCard key={s.no} s={s} choice={choices[s.no]} onChoose={m => setChoices(p => ({...p, [s.no]: m}))} />
      ))}

      <RecapTable choices={choices} />

      <div className="declaration-section">
        <div className="section-title">Pernyataan Evaluator</div>
        <p>Saya menyatakan bahwa penilaian dilakukan secara objektif berdasarkan perbandingan kualitas output keempat model embedding (FENRIR, RoBERTa, IndoBERT, FinBERT) untuk analisis laporan keuangan perbankan Indonesia.</p>
        <div style={{marginTop:12,fontSize:12,color:'#444'}}>Tanda tangan: ______________</div>
      </div>

      <div className="export-panel">
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Mengirim...' : '↑ Simpan ke Google Sheets'}</button>
        <button className="btn btn-outline" onClick={exportJSON}>↓ Export JSON</button>
        <button className="btn btn-outline" onClick={reset}>✕ Reset</button>
        <span className="ep-status ok" style={{marginLeft:12}}>{done===SAMPLES.length?'✓ Semua dinilai':`${done}/${SAMPLES.length} sampel`}</span>
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

  return (
    <div className="sample-card" id={`sample-${s.no}`}>
      <div className="sample-header">
        <span className="sample-no">#{String(s.no).padStart(2,'0')}</span>
        <span className="sample-ticker">{s.ticker}</span>
        <span className="sample-company">{s.company}</span>
        <span className="sample-q">{s.q}</span>
        <span className="tier-pill">{s.tierLabel}</span>
        <button className="btn-pdf" onClick={() => setPdf(v => !v)}>📄 {pdf?'Tutup':'Buka'} Lapkeu</button>
      </div>

      {pdf && <div className="pdf-viewer"><div className="pdf-toolbar"><span>Laporan Keuangan — {s.company} ({s.ticker})</span><a href={`/pdf/${s.pdfFile}`} target="_blank" rel="noreferrer" className="pdf-newtab">↗ Tab Baru</a><button className="pdf-close" onClick={()=>setPdf(false)}>✕ Tutup</button></div><iframe src={`/pdf/${s.pdfFile}`} title={`Lapkeu ${s.ticker}`} className="pdf-frame" /></div>}

      <div className="sample-body">
        <div className="question-box">{s.question}</div>

        {/* 4 Model panels — collapsible */}
        {[
          { m:'FENRIR', open:fenrirOpen, setOpen:setFenrirOpen, symbol:'🐺', tag:'Domain-Specific', border:'#222' },
          { m:'RoBERTa', open:robertaOpen, setOpen:setRobertaOpen, symbol:'🤖', tag:'General-Purpose', border:'#666' },
          { m:'IndoBERT', open:indobertOpen, setOpen:setIndoOpen, symbol:'🇮🇩', tag:'Indonesian Language', border:'#888' },
          { m:'FinBERT', open:finbertOpen, setOpen:setFinOpen, symbol:'💹', tag:'English Finance', border:'#999' },
        ].map(({m, open, setOpen, symbol, tag, border}) => {
          const sel = choice === m
          return (
            <div key={m} className="answer-panel" style={{border:`1px solid ${sel?'#222':'#d8d8d8'}`,borderRadius:2,marginBottom:6,background:sel?'#fafafa':'#fff'}}>
              <div className="ap-header" onClick={() => setOpen(!open)} style={{background:m==='FENRIR'?'#fafafa':'#fff'}}>
                <span>{symbol} {m} <span style={{fontSize:9,color:'#888',fontWeight:400}}>{tag}</span></span>
                <span className={`ap-toggle ${open?'open':''}`}>▼</span>
              </div>
              {open && (
                <div className="ap-body">
                  {isRagas ? (
                    <>
                      <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:.4,color:'#888',marginBottom:4}}>📎 Retrieved Context</div>
                      <pre style={{fontSize:11,lineHeight:1.4,whiteSpace:'pre-wrap',fontFamily:'inherit',color:'#444',margin:'0 0 10px',background:'#f9f9f9',padding:8,borderRadius:2}}>{s[ctxKey(m)]}</pre>
                      <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:.4,color:'#888',marginBottom:4}}>🤖 Generated Answer</div>
                      <p style={{fontSize:13,lineHeight:1.6,color:'#1a1a1a',margin:0}} dangerouslySetInnerHTML={{__html: s[ansKey(m)]}} />
                    </>
                  ) : (
                    <>
                      <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:.4,color:'#888',marginBottom:4}}>📎 Top-3 Retrieved Chunks</div>
                      <pre style={{fontSize:11,lineHeight:1.4,whiteSpace:'pre-wrap',fontFamily:'inherit',color:'#444',margin:0,background:'#f9f9f9',padding:8,borderRadius:2}}>{s[ctxKey(m)]}</pre>
                    </>
                  )}
                </div>
              )}
              <div style={{padding:'6px 14px',borderTop:'1px solid #e0e0e0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontSize:11,color:'#888'}}>{sel?'✓ Dipilih sebagai model terbaik':''}</span>
                <button className={`winner-radio ${sel?'selected':''}`} onClick={() => onChoose(m)} style={{fontSize:11,padding:'3px 14px',border:'1px solid '+(sel?'#222':'#ccc'),borderRadius:2,background:sel?'#222':'#fff',color:sel?'#fff':'#555',cursor:'pointer',fontWeight:600}}>{sel?'✓ DIPILIH':'Pilih '+m}</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RecapTable({ choices }) {
  const counts = {}; for (const m of MODELS) counts[m] = Object.values(choices).filter(c => c === m).length
  const total = Object.values(choices).filter(Boolean).length
  const fenrirPct = total > 0 ? (counts['FENRIR'] / total * 100).toFixed(1) : '0'

  return (
    <div className="recap-section">
      <div className="section-title">Rekap Hasil Penilaian</div>
      <p style={{fontSize:12,color:'#555',marginTop:4}}>FENRIR dipilih pada <b>{counts['FENRIR']}/{total}</b> sampel (<b>{fenrirPct}%</b>)</p>

      <table className="recap-table" style={{width:'100%',borderCollapse:'collapse',fontSize:11,marginTop:12}}>
        <thead><tr style={{borderBottom:'2px solid #333'}}><th style={{padding:'4px 6px',textAlign:'left',fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:.3,color:'#555'}}>No</th><th style={{padding:'4px 6px',textAlign:'left'}}>Ticker</th><th style={{padding:'4px 6px',textAlign:'left'}}>Q</th><th style={{padding:'4px 6px',textAlign:'left'}}>Tipe</th><th style={{padding:'4px 6px',textAlign:'left'}}>Pertanyaan</th><th style={{padding:'4px 6px',textAlign:'center',width:120}}>Model Terbaik</th></tr></thead>
        <tbody>
          {SAMPLES.map(s => <tr key={s.no} style={{borderBottom:'1px solid #e0e0e0'}}><td style={{padding:'3px 6px',fontWeight:600}}>{s.no}</td><td style={{padding:'3px 6px',fontWeight:600}}>{s.ticker}</td><td style={{padding:'3px 6px'}}>{s.q}</td><td style={{padding:'3px 6px',fontSize:10,color:'#888'}}>{s.tierLabel}</td><td style={{padding:'3px 6px',fontSize:11}}>{s.question.substring(0,50)}…</td><td style={{padding:'3px 6px',textAlign:'center'}}>{choices[s.no]?<span style={{display:'inline-block',padding:'2px 10px',border:'1px solid #999',borderRadius:2,fontSize:11,fontWeight:700,background:choices[s.no]==='FENRIR'?'#222':'#fff',color:choices[s.no]==='FENRIR'?'#fff':'#333'}}>{choices[s.no]}</span>:<span style={{color:'#ccc'}}>—</span>}</td></tr>)}
        </tbody>
        <tfoot><tr style={{borderTop:'2px solid #333',fontWeight:700}}><td colSpan={5} style={{padding:'6px'}}>Total</td><td style={{padding:'6px',textAlign:'center'}}>{total}/{SAMPLES.length}</td></tr></tfoot>
      </table>

      <div style={{marginTop:16,display:'flex',gap:16}}>
        {MODELS.map(m => <div key={m} style={{textAlign:'center',padding:'8px 14px',border:`1px solid ${m==='FENRIR'?'#222':'#ddd'}`,borderRadius:2,background:m==='FENRIR'?'#fafafa':'#fff',flex:1}}><div style={{fontSize:20,fontWeight:900,color:m==='FENRIR'?'#111':'#666'}}>{counts[m]}</div><div style={{fontSize:10,color:'#888'}}>{m}</div><div style={{fontSize:11,fontWeight:600}}>{total>0?(counts[m]/total*100).toFixed(1):'0'}%</div></div>)}
      </div>
    </div>
  )
}
