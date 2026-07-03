import { useState } from 'react'
import { TICKER_PDF } from '../data/pdfs'

const CRITERIA = [
  { key: 'akurasi',     label: 'i. Akurasi Faktual' },
  { key: 'kelengkapan', label: 'ii. Kelengkapan Jawaban' },
  { key: 'kualitas',    label: 'iii. Kualitas Bukti' },
]

const OPTIONS = [
  { value: 'erta',     label: 'FENRIR' },
  { value: 'baseline', label: 'Baseline' },
  { value: 'sama',     label: 'Remis' },
]

export default function SampleCard({ sample, scores, onChange, id }) {
  const [ertaOpen, setErtaOpen] = useState(false)
  const [baseOpen, setBaseOpen] = useState(false)
  const [pdfOpen,  setPdfOpen]  = useState(false)

  const pdfUrl = TICKER_PDF[sample.ticker]

  // scores[key] is now just a string: 'erta' | 'baseline' | 'sama' | undefined
  const getWinner = (key) => scores?.[key] ?? null

  const ertaWins = CRITERIA.filter(c => getWinner(c.key) === 'erta').length
  const baseWins = CRITERIA.filter(c => getWinner(c.key) === 'baseline').length
  const filled   = CRITERIA.filter(c => getWinner(c.key) !== null).length
  const overallW = filled === 3
    ? (ertaWins > baseWins ? 'erta' : baseWins > ertaWins ? 'baseline' : 'sama')
    : null

  return (
    <div className="sample-card" id={id}>
      <div className="sample-header">
        <span className="sample-no">#{String(sample.no).padStart(2, '0')}</span>
        <span className="sample-ticker">{sample.ticker}</span>
        <span className="sample-company">{sample.company}</span>
        <span className="sample-q">{sample.q}</span>
        <span className="tier-pill">{sample.tierLabel}</span>

        {pdfUrl && (
          <button className="btn-pdf" onClick={() => setPdfOpen(v => !v)}>
            {pdfOpen ? 'Tutup' : 'Buka'} Lapkeu
          </button>
        )}
      </div>

      {pdfOpen && pdfUrl && (
        <div className="pdf-viewer">
          <div className="pdf-toolbar">
            <span>Laporan Keuangan — {sample.company} ({sample.ticker})</span>
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="pdf-newtab">Tab Baru</a>
            <button className="pdf-close" onClick={() => setPdfOpen(false)}>Tutup</button>
          </div>
          <iframe src={pdfUrl} title={`Lapkeu ${sample.ticker}`} className="pdf-frame" />
        </div>
      )}

      <div className="sample-body">
        <div className="question-box">{sample.question}</div>

        <div className="answer-panels">
          <div className="answer-panel">
            <div className="ap-header" onClick={() => setErtaOpen(v => !v)}>
              <span>JAWABAN SISTEM A — FENRIR</span>
              <span className={`ap-toggle ${ertaOpen ? 'open' : ''}`}>{ertaOpen ? 'Tutup' : 'Buka'}</span>
            </div>
            {ertaOpen && <div className="ap-body" dangerouslySetInnerHTML={{ __html: sample.ertaAnswer }} />}
          </div>

          <div className="answer-panel">
            <div className="ap-header" onClick={() => setBaseOpen(v => !v)}>
              <span>JAWABAN SISTEM B — BASELINE</span>
              <span className={`ap-toggle ${baseOpen ? 'open' : ''}`}>{baseOpen ? 'Tutup' : 'Buka'}</span>
            </div>
            {baseOpen && <div className="ap-body" dangerouslySetInnerHTML={{ __html: sample.baselineAnswer }} />}
          </div>
        </div>

        <table className="criteria-table">
          <thead>
            <tr>
              <th style={{ width: 150 }}>Kriteria</th>
              <th style={{ width: 220 }}>Pemenang per Kriteria</th>
              <th>Alasan Kualitatif</th>
            </tr>
          </thead>
          <tbody>
            {CRITERIA.map(({ key, label }) => {
              const w = getWinner(key)
              const alasanKey = `${key}_alasan`
              return (
                <tr key={key}>
                  <td>{label}</td>
                  <td>
                    <div className="winner-radio-group">
                      {OPTIONS.map(opt => (
                        <label key={opt.value} className={`winner-radio ${w === opt.value ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name={`${id}-${key}`}
                            value={opt.value}
                            checked={w === opt.value}
                            onChange={() => onChange(key, opt.value)}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td>
                    <textarea
                      className="alasan-textarea"
                      placeholder="Tuliskan alasan singkat..."
                      value={scores?.[alasanKey] ?? ''}
                      onChange={e => onChange(alasanKey, e.target.value)}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="conc-row">
          <div className="score-display">
            <div className="sd-label">KRITERIA FENRIR UNGGUL</div>
            <span className="sd-val">{ertaWins}</span>
            <span className="sd-denom">/ 3</span>
          </div>
          <div className="conc-divider" />
          <div className="score-display">
            <div className="sd-label">KRITERIA BASELINE UNGGUL</div>
            <span className="sd-val">{baseWins}</span>
            <span className="sd-denom">/ 3</span>
          </div>
          <div className="conc-divider" />
          <div className="score-display" style={{ minWidth: 100 }}>
            <div className="sd-label">PEMENANG SAMPEL</div>
            <div style={{ marginTop: 6 }}>
              {overallW ? (
                <span className="winner-chip" style={{ fontSize: 14, padding: '4px 14px' }}>
                  {overallW === 'erta' ? 'FENRIR' : overallW === 'baseline' ? 'Baseline' : 'Remis'}
                </span>
              ) : (
                <span style={{ color: '#aaa', fontSize: 12 }}>Belum lengkap</span>
              )}
            </div>
          </div>
          <div className="conc-divider" />
          <div className="conc-notes">
            <label>CATATAN TAMBAHAN (opsional):</label>
            <textarea
              placeholder="Catatan atau temuan kunci..."
              value={scores?.__notes__ ?? ''}
              onChange={e => onChange('__notes__', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
