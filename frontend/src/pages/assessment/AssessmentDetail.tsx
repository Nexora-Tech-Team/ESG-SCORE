import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Award, BarChart3, CheckCircle2, ClipboardCheck, ClipboardList, FileCheck2, LayoutDashboard, LogOut, Save, Send, Upload, X } from 'lucide-react'
import { api, getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import RoleSidebar from '@/components/RoleSidebar'
import type { AwardLevel, ChecklistItem, EvidenceItem, Role, ScoreItem, User } from '@/types'

interface ScoreSummary {
  environmental: number
  social: number
  governance: number
  total: number
  percentage: number
  recommendedAwardLevel?: AwardLevel
  effectiveAwardLevel?: AwardLevel
  eligibleForAward?: boolean
  scoredCount?: number
  totalItems?: number
  activeRedFlags?: number
  eligibilityNote?: string
  profileCode?: string
}

interface JuryAssessment {
  assessmentId: string
  participantName: string
  assessmentStatus: string
  percentage: number
  total: number
  recommendedAwardLevel?: AwardLevel
  effectiveAwardLevel?: AwardLevel
  eligibleForAward?: boolean
  activeRedFlags?: number
  eligibilityNote?: string
  awardLevel?: AwardLevel
  decisionNote?: string
}

interface AssessmentDetailMeta {
  id: string
  organizationId: string
  title: string
  status: string
  periodYear: number
  submittedAt?: string
  finalizedAt?: string
  createdAt: string
  organizationName: string
  organizationStatus: string
  assessorId?: string
  assessorName?: string
  assessorEmail?: string
}

interface RedFlagRow {
  id: string
  assessmentId: string
  type: 'fatality_or_tailing_failure' | 'severe_regulatory_sanction' | 'false_evidence'
  description: string
  isActive: boolean
  createdAt: string
}

const emptySummary: ScoreSummary = { environmental: 0, social: 0, governance: 0, total: 0, percentage: 0 }
const awardLevels: AwardLevel[] = ['foundation', 'integration', 'leadership', 'grand_champion', 'not_eligible']

const roleLabels: Record<Role, string> = {
  admin: 'Admin',
  asesor: 'Asesor',
  juri: 'Juri',
  peserta: 'Peserta',
}

function statusLabel(value?: string) {
  return (value || '-').replaceAll('_', ' ')
}

function areaCode(questionNumber: string) {
  return questionNumber.split('.')[0] || questionNumber
}

function formatPct(value: number) {
  return `${Number(value || 0).toFixed(1)}%`
}

function awardLabel(level: AwardLevel) {
  const labels: Record<AwardLevel, string> = {
    foundation: 'ESG Foundation & Compliance Award',
    integration: 'ESG Integration & Performance Award',
    leadership: 'ESG Leadership & Transformation Award',
    grand_champion: 'Grand ESG Mining Champion',
    not_eligible: 'Not Eligible',
  }
  return labels[level]
}

function eligibilityLabel(item: { eligibleForAward?: boolean; activeRedFlags?: number; scoredCount?: number; totalItems?: number }) {
  if ((item.totalItems ?? 0) > 0 && (item.scoredCount ?? 0) < (item.totalItems ?? 0)) return 'Belum lengkap'
  if ((item.activeRedFlags ?? 0) > 0) return 'Locked'
  if (item.eligibleForAward === false) return 'Not Eligible'
  return 'Eligible'
}

function recommendAward(percentage: number): AwardLevel {
  if (percentage >= 85) return 'grand_champion'
  if (percentage >= 80) return 'leadership'
  if (percentage >= 60) return 'integration'
  if (percentage >= 40) return 'foundation'
  return 'not_eligible'
}

function scoreFor(scoreItems: ScoreItem[], checklistItemId: string) {
  return scoreItems.find((item) => item.checklistItemId === checklistItemId)
}

function publicFileUrl(fileUrl: string) {
  if (!fileUrl || fileUrl === '#') return fileUrl
  if (fileUrl.startsWith('/')) return `${import.meta.env.BASE_URL.replace(/\/$/, '')}${fileUrl}`
  return fileUrl
}

function evidencesFor(evidenceItems: EvidenceItem[], checklistItemId: string) {
  return evidenceItems.filter((item) => item.checklistItemId === checklistItemId)
}

function completedEvidenceCount(checklist: ChecklistItem[], evidenceItems: EvidenceItem[]) {
  return checklist.filter((item) => evidenceItems.some((evidence) => evidence.checklistItemId === item.id)).length
}

export default function AssessmentDetail() {
  const { assessmentId = '' } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const role = user?.role ?? 'peserta'

  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [meta, setMeta] = useState<AssessmentDetailMeta | null>(null)
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([])
  const [scoreItems, setScoreItems] = useState<ScoreItem[]>([])
  const [summary, setSummary] = useState<ScoreSummary>(emptySummary)
  const [juryRow, setJuryRow] = useState<JuryAssessment | null>(null)
  const [assessors, setAssessors] = useState<User[]>([])
  const [selectedAssessor, setSelectedAssessor] = useState('')
  const [redFlags, setRedFlags] = useState<RedFlagRow[]>([])
  const [redFlagType, setRedFlagType] = useState<RedFlagRow['type']>('fatality_or_tailing_failure')
  const [redFlagDescription, setRedFlagDescription] = useState('')
  const [uploadingId, setUploadingId] = useState('')
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})
  const [scores, setScores] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [scoreSaveState, setScoreSaveState] = useState<Record<string, 'saving' | 'saved' | 'error'>>({})
  const [award, setAward] = useState<AwardLevel>('not_eligible')
  const [juryNote, setJuryNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const title = useMemo(() => {
    if (meta?.organizationName) return meta.organizationName
    if (juryRow?.participantName) return juryRow.participantName
    if (role === 'peserta') return user?.name ?? 'Assessment Peserta'
    return `Assessment ${assessmentId.slice(0, 8)}`
  }, [assessmentId, juryRow?.participantName, meta?.organizationName, role, user?.name])
  const sidebarItems = useMemo(() => {
    const shared = [
      { id: 'summary', label: 'Ringkasan', description: 'Status assessment dan skor ESG', icon: <LayoutDashboard size={18} /> },
      { id: 'checklist', label: 'Checklist', description: 'Evidence, skor, dan review item', icon: <ClipboardCheck size={18} /> },
    ]
    if (role === 'admin') {
      return [
        shared[0],
        { id: 'status', label: 'Status & Aksi', description: 'Verifikasi dan assign asesor', icon: <FileCheck2 size={18} /> },
        shared[1],
      ]
    }
    if (role === 'asesor') {
      return [
        shared[0],
        { id: 'status', label: 'Status & Aksi', description: 'Submit ke juri dan pantau progres', icon: <ClipboardList size={18} /> },
        shared[1],
      ]
    }
    if (role === 'juri') {
      return [
        shared[0],
        { id: 'status', label: 'Keputusan', description: 'Eligibility, red flag, dan finalisasi', icon: <Award size={18} /> },
        shared[1],
      ]
    }
    return [
      shared[0],
      { id: 'status', label: 'Submit', description: 'Kirim assessment ke asesor', icon: <Send size={18} /> },
      shared[1],
    ]
  }, [role])

  async function loadDetail() {
    if (!assessmentId) return
    setLoading(true)
    setError('')
    try {
      const [metaRes, evidenceRes, scoreRes, summaryRes] = await Promise.all([
        api.get(`/assessments/${assessmentId}`),
        api.get(`/assessments/${assessmentId}/evidence`),
        api.get(`/assessments/${assessmentId}/scores`),
        api.get(`/assessments/${assessmentId}/summary`),
      ])
      const summaryData = summaryRes.data.data ?? emptySummary
      const checklistRes = await api.get('/checklist', {
        params: summaryData.profileCode && summaryData.profileCode !== 'BELUM DIPILIH' ? { profileCode: summaryData.profileCode } : undefined,
      })
      const redFlagsRes = await api.get(`/assessments/${assessmentId}/red-flags`)
      setMeta(metaRes.data.data ?? null)
      setChecklist(checklistRes.data.data ?? [])
      setEvidenceItems(evidenceRes.data.data ?? [])
      setScoreItems(scoreRes.data.data ?? [])
      setSummary(summaryData)
      setRedFlags(redFlagsRes.data.data ?? [])

      if (role === 'juri') {
        const juryRes = await api.get('/jury/assessments')
        const row = (juryRes.data.data ?? []).find((item: JuryAssessment) => item.assessmentId === assessmentId) ?? null
        setJuryRow(row)
        const nextAward = row?.effectiveAwardLevel ?? row?.awardLevel ?? summaryRes.data.data?.effectiveAwardLevel ?? recommendAward(row?.percentage ?? summaryRes.data.data?.percentage ?? 0)
        setAward(nextAward)
        setJuryNote(row?.decisionNote ?? '')
      }

      if (role === 'admin' && metaRes.data.data?.organizationId) {
        const assessorsRes = await api.get('/admin/assessors')
        const nextAssessors: User[] = assessorsRes.data.data ?? []
        setAssessors(nextAssessors)
        setSelectedAssessor((current) => current || nextAssessors[0]?.id || '')
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDetail()
  }, [assessmentId])

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  const MAX_EVIDENCE = 3

  async function uploadEvidence(item: ChecklistItem, file: File) {
    setError('')
    setUploadingId(item.id)
    try {
      const form = new FormData()
      form.append('checklistItemId', item.id)
      form.append('file', file)
      await api.post(`/assessments/${assessmentId}/evidence/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await loadDetail()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setUploadingId('')
    }
  }

  async function deleteEvidence(evidenceId: string) {
    setError('')
    try {
      await api.delete(`/assessments/${assessmentId}/evidence/${evidenceId}`)
      await loadDetail()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function submitParticipant() {
    try {
      await api.patch(`/assessments/${assessmentId}/submit`)
      await loadDetail()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function saveScore(item: ChecklistItem) {
    if (scoreSaveState[item.id] === 'saving') return
    setScoreSaveState((state) => ({ ...state, [item.id]: 'saving' }))
    try {
      await api.post(`/assessments/${assessmentId}/scores`, {
        checklistItemId: item.id,
        score: scores[item.id] ?? scoreFor(scoreItems, item.id)?.score ?? 0,
        note: notes[item.id] ?? scoreFor(scoreItems, item.id)?.note ?? '',
      })
      await loadDetail()
      setScoreSaveState((state) => ({ ...state, [item.id]: 'saved' }))
      window.setTimeout(() => {
        setScoreSaveState((state) => {
          if (state[item.id] !== 'saved') return state
          const next = { ...state }
          delete next[item.id]
          return next
        })
      }, 1800)
    } catch (err) {
      setScoreSaveState((state) => ({ ...state, [item.id]: 'error' }))
      setError(getErrorMessage(err))
    }
  }

  async function submitToJury() {
    try {
      await api.patch(`/assessments/${assessmentId}/submit-to-jury`)
      await loadDetail()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function finalizeAward() {
    try {
      await api.post(`/assessments/${assessmentId}/jury-decision`, {
        awardLevel: summary.effectiveAwardLevel ?? award,
        note: juryNote || 'Approved by jury.',
      })
      await loadDetail()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function verifyAssessment() {
    if (!meta?.organizationId) return
    try {
      await api.patch(`/admin/participants/${meta.organizationId}/verify`)
      await loadDetail()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function assignAssessor() {
    if (!meta?.id || !selectedAssessor) return
    try {
      await api.post(`/admin/assessments/${meta.id}/assign`, { assessorId: selectedAssessor })
      await loadDetail()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function saveRedFlag() {
    try {
      await api.post(`/assessments/${assessmentId}/red-flags`, {
        type: redFlagType,
        description: redFlagDescription,
        isActive: true,
      })
      setRedFlagDescription('')
      await loadDetail()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="app-page">
      <header className="app-topbar">
        <div className="brand-block">
          <img src="/assets/oneconnect/cbqa-logo.png" alt="CBQA" />
          <div className="brand-divider" />
          <div><strong>ESG Score</strong><span>Assessment Detail</span></div>
        </div>
        <div className="topbar-user">
          <button onClick={() => navigate(`/${role}/dashboard`)}><ArrowLeft size={16} />Kembali ke Dashboard</button>
          <div><strong>{user?.name}</strong><span>{roleLabels[role]}</span></div>
          <button onClick={handleLogout}><LogOut size={16} />Logout</button>
        </div>
      </header>

      <main className="app-wrap app-shell">
        <RoleSidebar role={role} title={roleLabels[role]} subtitle="Navigasi assessment detail" items={sidebarItems} />

        <div className="page-content">
          <section className="hero-panel" id="summary">
            <button className="icon-command" onClick={() => navigate(`/${role}/dashboard`)} title="Kembali ke dashboard"><ArrowLeft size={20} /></button>
            <div>
              <button className="back-link" onClick={() => navigate(`/${role}/dashboard`)}><ArrowLeft size={14} />Kembali ke Dashboard</button>
              <span className="section-kicker">{roleLabels[role]} Assessment</span>
              <h1>{title}</h1>
              <p>Evidence, scoring, dan keputusan award untuk assessment ini.</p>
            </div>
          </section>

          {error && <p className="panel-error">{error}</p>}
          {loading ? (
            <section className="panel panel-wide empty-panel">
              <ClipboardCheck size={28} />
              <h2>Loading assessment</h2>
              <p>Mengambil checklist, evidence, dan score dari backend.</p>
            </section>
          ) : (
            <section className="content-grid">
              <article className="panel" id="score">
                <PanelTitle kicker="Score" title="Ringkasan ESG" icon={<BarChart3 size={22} />} />
                <ScoreStrip score={summary} />
              </article>

              <article className="panel" id="status">
                <PanelTitle kicker="Action" title="Status & Aksi" icon={<Award size={22} />} />
                <div className="score-list">
                  <div><span>Mode</span><strong>{roleLabels[role]}</strong></div>
                  <div><span>Status</span><strong>{statusLabel(meta?.status ?? juryRow?.assessmentStatus)}</strong></div>
                  <div><span>Peserta</span><strong>{meta?.organizationName ?? juryRow?.participantName ?? '-'}</strong></div>
                  <div><span>Asesor</span><strong>{meta?.assessorName ?? '-'}</strong></div>
                  <div><span>Progress Evidence</span><strong>{completedEvidenceCount(checklist, evidenceItems)}/{checklist.length}</strong></div>
                  <div><span>Progress Score</span><strong>{scoreItems.length}/{checklist.length}</strong></div>
                  <div><span>Red Flag</span><strong>{redFlags.filter((item) => item.isActive).length}</strong></div>
                  <div><span>Eligibility</span><strong>{eligibilityLabel(summary)}</strong></div>
                </div>
                {summary.eligibilityNote && <p className="panel-muted">{summary.eligibilityNote}</p>}
                {role === 'admin' && meta && (
                  <div className="jury-decision-box">
                    <div className="score-list">
                      <div><span>Organisasi</span><strong>{meta.organizationName}</strong></div>
                      <div><span>Org Status</span><strong>{statusLabel(meta.organizationStatus)}</strong></div>
                      <div><span>Period</span><strong>{meta.periodYear}</strong></div>
                    </div>
                  </div>
                )}
                {role === 'peserta' && <button className="wide-command" onClick={submitParticipant}><Send size={16} />Submit ke Asesor</button>}
                {role === 'asesor' && <button className="wide-command" onClick={submitToJury} disabled={scoreItems.length < checklist.length}><Send size={16} />Submit ke Juri</button>}
                {role === 'juri' && (
                  <div className="jury-decision-box">
                    <select
                      value={summary.effectiveAwardLevel ?? award}
                      onChange={(e) => setAward(e.target.value as AwardLevel)}
                      disabled={summary.eligibleForAward === false}
                    >
                      {awardLevels.map((level) => <option key={level} value={level}>{awardLabel(level)}</option>)}
                    </select>
                    <textarea value={juryNote} onChange={(e) => setJuryNote(e.target.value)} placeholder="Catatan keputusan juri" />
                    <button className="wide-command" onClick={finalizeAward}><Save size={16} />Finalisasi Award</button>
                  </div>
                )}
                {role === 'admin' && (
                  <div className="jury-decision-box">
                    <select value={selectedAssessor} onChange={(e) => setSelectedAssessor(e.target.value)} disabled={assessors.length === 0}>
                      {assessors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <button className="wide-command" onClick={verifyAssessment}><ClipboardCheck size={16} />Verifikasi Peserta</button>
                    <button className="wide-command" onClick={assignAssessor} disabled={!selectedAssessor}><Send size={16} />Assign ke Asesor</button>
                  </div>
                )}
                {(role === 'admin' || role === 'juri') && (
                  <div className="jury-decision-box">
                    <select value={redFlagType} onChange={(e) => setRedFlagType(e.target.value as RedFlagRow['type'])}>
                      <option value="fatality_or_tailing_failure">Fatality / Tailing Failure</option>
                      <option value="severe_regulatory_sanction">Severe Regulatory Sanction</option>
                      <option value="false_evidence">False Evidence</option>
                    </select>
                    <textarea value={redFlagDescription} onChange={(e) => setRedFlagDescription(e.target.value)} placeholder="Deskripsi red flag" />
                    <button className="wide-command" onClick={saveRedFlag} disabled={!redFlagDescription.trim()}><Award size={16} />Tambahkan Red Flag</button>
                  </div>
                )}
                {redFlags.length > 0 && (
                  <div className="jury-decision-box">
                    <div className="score-list">
                      {redFlags.map((flag) => (
                        <div key={flag.id}>
                          <span>{statusLabel(flag.type)}</span>
                          <strong>{flag.description}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>

              <article className="panel panel-wide" id="checklist">
                <PanelTitle kicker="Checklist" title="Evidence & Scoring" icon={<ClipboardCheck size={22} />} />
                <div className="table-wrap">
                  <table className="data-table checklist-table">
                    <thead>
                      <tr>
                        <th>Area</th>
                        <th>Kategori</th>
                        <th>Sub-Kategori</th>
                        <th>No</th>
                        <th>Kriteria Pertanyaan / Asesmen</th>
                        <th>Bukti Diperlukan</th>
                        <th>Bobot</th>
                        <th>Dokumen</th>
                        <th>Skor</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checklist.map((item) => {
                        const evidences = evidencesFor(evidenceItems, item.id)
                        const score = scoreFor(scoreItems, item.id)
                        const isFull = evidences.length >= MAX_EVIDENCE
                        const uploading = uploadingId === item.id
                        const saveState = scoreSaveState[item.id]
                        return (
                          <tr key={item.id}>
                            <td><strong>{areaCode(item.questionNumber)}</strong></td>
                            <td><strong>{item.category}</strong></td>
                            <td><strong>{item.subCategory}</strong></td>
                            <td><strong>{item.questionNumber}</strong></td>
                            <td><span>{item.question}</span></td>
                            <td><small>{item.evidenceRequired}</small></td>
                            <td>{formatPct(item.weight * 100)}</td>
                            <td>
                              {evidences.length > 0 ? (
                                <ul className="evidence-list">
                                  {evidences.map((ev) => (
                                    <li key={ev.id} className="evidence-list-item">
                                      {ev.fileUrl && ev.fileUrl !== '#' ? (
                                        <a href={publicFileUrl(ev.fileUrl)} target="_blank" rel="noopener noreferrer" className="status-pill evidence-doc-link">{ev.fileName}</a>
                                      ) : (
                                        <span className="status-pill">{ev.fileName}</span>
                                      )}
                                      {role === 'peserta' && (
                                        <button type="button" className="evidence-delete" title="Hapus dokumen" onClick={() => deleteEvidence(ev.id)}>
                                          <X size={13} />
                                        </button>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="evidence-empty">Belum upload</span>
                              )}
                              {role === 'peserta' && (
                                <div className="evidence-upload-cell">
                                  <input
                                    ref={(el) => { fileInputs.current[item.id] = el }}
                                    type="file"
                                    className="evidence-file-hidden"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) uploadEvidence(item, file)
                                      e.target.value = ''
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="evidence-browse-button"
                                    onClick={() => fileInputs.current[item.id]?.click()}
                                    disabled={uploading || isFull}
                                  >
                                    <Upload size={14} />
                                    {uploading ? 'Mengunggah...' : isFull ? 'Maks 3 dokumen' : evidences.length > 0 ? `Tambah Dokumen (${evidences.length}/${MAX_EVIDENCE})` : 'Pilih Dokumen'}
                                  </button>
                                </div>
                              )}
                            </td>
                            <td>
                              {role === 'asesor' ? (
                                <select value={scores[item.id] ?? score?.score ?? 0} onChange={(e) => setScores((state) => ({ ...state, [item.id]: Number(e.target.value) }))}>
                                  {[0, 1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                                </select>
                              ) : (
                                <strong>{score ? `${score.score} (${score.weightedScore.toFixed(2)})` : '-'}</strong>
                              )}
                            </td>
                            <td>
                              {role === 'peserta' && (
                                <span className="evidence-status-hint">
                                  {evidences.length > 0 ? <span className="evidence-status-ok"><CheckCircle2 size={14} /> {evidences.length} dokumen</span> : 'Pilih dokumen untuk mengunggah'}
                                </span>
                              )}
                              {role === 'asesor' && (
                                <div className="score-action">
                                  <textarea rows={3} value={notes[item.id] ?? score?.note ?? ''} onChange={(e) => setNotes((state) => ({ ...state, [item.id]: e.target.value }))} placeholder="Catatan asesor" />
                                  <button onClick={() => saveScore(item)} disabled={saveState === 'saving'}>
                                    <Save size={15} />{saveState === 'saving' ? 'Menyimpan...' : saveState === 'saved' ? 'Tersimpan' : saveState === 'error' ? 'Coba Lagi' : 'Simpan Skor'}
                                  </button>
                                  {saveState === 'saved' && <span className="score-save-feedback score-save-feedback-ok"><CheckCircle2 size={14} /> Skor tersimpan</span>}
                                  {saveState === 'error' && <span className="score-save-feedback score-save-feedback-error">Gagal menyimpan</span>}
                                </div>
                              )}
                              {(role === 'admin' || role === 'juri') && <span className="panel-muted">Read-only</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

function PanelTitle({ kicker, title, icon }: { kicker: string; title: string; icon: React.ReactNode }) {
  return (
    <div className="panel-head">
      <div><span className="section-kicker">{kicker}</span><h2>{title}</h2></div>
      {icon}
    </div>
  )
}

function ScoreStrip({ score }: { score: ScoreSummary }) {
  return (
    <div className="score-strip">
      <div><span>Environmental</span><strong>{Number(score.environmental || 0).toFixed(2)}</strong></div>
      <div><span>Social</span><strong>{Number(score.social || 0).toFixed(2)}</strong></div>
      <div><span>Governance</span><strong>{Number(score.governance || 0).toFixed(2)}</strong></div>
      <div><span>Total</span><strong>{formatPct(score.percentage || 0)}</strong></div>
    </div>
  )
}
