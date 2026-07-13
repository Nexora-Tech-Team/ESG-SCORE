import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, BarChart3, Bell, CheckCircle2, ClipboardCheck, ClipboardList, Eye, EyeOff, FileCheck2, LayoutDashboard, LogOut, PencilLine, ShieldCheck, SlidersHorizontal, Upload, User as UserIcon, Users, X } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import RoleSidebar from '@/components/RoleSidebar'
import { useAuthStore } from '@/store/authStore'
import { api, getErrorMessage } from '@/lib/api'
import type { Assessment, AwardLevel, ChecklistItem, EvidenceItem, MaturityBandRef, MaturityLevelRef, Organization, ProfileWeightTarget, Role, ScoreItem, User } from '@/types'

interface ApiParticipant {
  id: string
  name: string
  email?: string
  phone?: string
  website?: string
  status: string
  assessmentId?: string
  assessmentStatus?: string
  assessorId?: string
  assessorName?: string
}

interface ApiAssignment {
  assignmentId: string
  assessmentId: string
  participantId: string
  participantName: string
  assessmentStatus: Assessment['status']
  status: string
  assignedAt: string
  profileCode?: string
  scoredCount?: number
  totalItems?: number
}

interface ScoreSummary {
  environmental: number
  social: number
  governance: number
  total: number
  percentage: number
  recommendedAwardLevel?: AwardLevel
  effectiveAwardLevel?: AwardLevel
  eligibleForAward?: boolean
  activeRedFlags?: number
  eligibilityNote?: string
  profileCode?: string
  profileTarget?: ProfileWeightTarget
}

interface JuryAssessment {
  assessmentId: string
  participantId: string
  participantName: string
  assessmentStatus: string
  environmental: number
  social: number
  governance: number
  total: number
  percentage: number
  recommendedAwardLevel?: AwardLevel
  effectiveAwardLevel?: AwardLevel
  eligibleForAward?: boolean
  activeRedFlags?: number
  eligibilityNote?: string
  awardLevel?: AwardLevel
  decisionNote?: string
  decidedAt?: string
}

const emptySummary: ScoreSummary = { environmental: 0, social: 0, governance: 0, total: 0, percentage: 0 }

const roleLabels: Record<Role, string> = {
  admin: 'Admin',
  asesor: 'Asesor',
  juri: 'Juri',
  peserta: 'Peserta',
}

const roleSubtitles: Record<Role, string> = {
  admin: 'Verifikasi peserta, assign asesor, dan monitor seluruh alur ESG Score.',
  asesor: 'Review evidence, input skor maturity 0-5, dan kirim hasil ke juri.',
  juri: 'Review hasil akhir, red flag, rekomendasi award, dan finalisasi keputusan.',
  peserta: 'Lengkapi checklist, upload evidence, dan submit assessment untuk direview asesor.',
}

const awardLevels: AwardLevel[] = ['foundation', 'integration', 'leadership', 'grand_champion', 'not_eligible']

const licenseTypeOptions = [
  { value: 'IUP', label: 'IUP - Izin Usaha Pertambangan' },
  { value: 'IUJP', label: 'IUJP - Izin Usaha Jasa Pertambangan' },
] as const

// Sub-category for IUP. Both IUP and IUPK resolve to profile code "IUP",
// so this choice does not affect scoring — it only makes the profile complete.
const iupSubCategoryOptions = ['IUP', 'IUPK'] as const

const mainServiceOptions = [
  'Mining Support Services',
  'Drilling Services',
  'Hauling & Logistics',
  'Plant / Processing Services',
  'Engineering & Consulting',
  'Construction & Civil Works',
  'Maintenance & Repair',
  'Environmental Services',
  'Security Services',
  'Other',
] as const

const redFlagPolicies = [
  {
    no: 1,
    condition: 'Insiden fatalitas pekerja (kematian akibat kecelakaan kerja) dalam 12 bulan terakhir',
    status: 'Tidak',
    consequence: 'Skor pilar Social dibatasi maksimal 2,0 dan peserta TIDAK ELIGIBLE untuk Grand Award',
  },
  {
    no: 2,
    condition: 'Kegagalan bendungan tailing (tailing dam failure) atau kebocoran bahan berbahaya (B3) ke lingkungan dalam 12 bulan terakhir',
    status: 'Ya',
    consequence: 'Skor pilar Environmental dibatasi maksimal 2,0 dan peserta TIDAK ELIGIBLE untuk Grand Award',
  },
  {
    no: 3,
    condition: 'Sanksi regulator berat: proses hukum berjalan atau sanksi pencabutan izin/teguran keras terkait pelanggaran lingkungan atau HAM yang belum diselesaikan',
    status: 'Ya',
    consequence: 'Skor pilar Governance dibatasi maksimal 2,0 dan peserta TIDAK ELIGIBLE untuk Grand Award',
  },
] as const

const redFlagDisqualifiers = [
  'Temuan pelanggaran HAM berat (kerja paksa dan/atau pekerja anak) yang terverifikasi oleh otoritas atau audit independen',
  'Kasus korupsi/suap yang telah berkekuatan hukum tetap melibatkan manajemen perusahaan',
  'Data material dimanipulasi atau dipalsukan pada dokumen bukti yang diserahkan ke assessor',
] as const

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

function recommendAward(percentage: number): AwardLevel {
  if (percentage >= 85) return 'grand_champion'
  if (percentage >= 80) return 'leadership'
  if (percentage >= 60) return 'integration'
  if (percentage >= 40) return 'foundation'
  return 'not_eligible'
}

function iconForRole(role: Role) {
  if (role === 'admin') return <ShieldCheck size={24} />
  if (role === 'asesor') return <ClipboardCheck size={24} />
  if (role === 'juri') return <Award size={24} />
  return <FileCheck2 size={24} />
}

function formatPct(value: number) {
  return `${Number(value || 0).toFixed(1)}%`
}

function publicFileUrl(fileUrl: string) {
  if (!fileUrl || fileUrl === '#') return fileUrl
  if (fileUrl.startsWith('/')) return `${import.meta.env.BASE_URL.replace(/\/$/, '')}${fileUrl}`
  return fileUrl
}

function statusLabel(value?: string) {
  return (value || '-').replaceAll('_', ' ')
}

function areaCode(questionNumber: string) {
  return questionNumber.split('.')[0] || questionNumber
}

function scoreFor(scoreItems: ScoreItem[], checklistItemId: string) {
  return scoreItems.find((item) => item.checklistItemId === checklistItemId)
}

function evidenceFor(evidenceItems: EvidenceItem[], checklistItemId: string) {
  return evidenceItems.find((item) => item.checklistItemId === checklistItemId)
}

const MAX_EVIDENCE_PER_ITEM = 3

function evidencesFor(evidenceItems: EvidenceItem[], checklistItemId: string) {
  return evidenceItems.filter((item) => item.checklistItemId === checklistItemId)
}

function sectionFromHash() {
  return window.location.hash.replace('#', '') || 'summary'
}

function useChecklist(profileCode?: string) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    // Peserta: backend derives the profile from their org and ignores the query.
    // Asesor/Juri/Admin: pass the reviewed assessment's profileCode to filter.
    const params = profileCode && profileCode !== 'BELUM DIPILIH' ? { profileCode } : undefined
    api.get('/checklist', { params })
      .then((res) => setChecklist(res.data.data ?? []))
      .catch((err) => setError(getErrorMessage(err)))
  }, [profileCode])

  return { checklist, checklistError: error }
}

function participantStatusNote(status: string) {
  switch (status) {
    case 'draft': return 'Lengkapi evidence & submit ke asesor'
    case 'submitted': return 'Menunggu verifikasi admin'
    case 'in_review': return 'Sedang direview asesor'
    case 'revision_requested': return 'Perlu revisi — perbaiki lalu submit ulang'
    case 'jury_review': return 'Menunggu keputusan juri'
    case 'finalized': return 'Penilaian sudah final'
    default: return 'Ikuti arahan admin/asesor'
  }
}

function SummaryCards({ role, section }: { role: Role; section: string }) {
  const [participants, setParticipants] = useState<ApiParticipant[]>([])
  const [assignments, setAssignments] = useState<ApiAssignment[]>([])
  const [juryRows, setJuryRows] = useState<JuryAssessment[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [profileWeights, setProfileWeights] = useState<ProfileWeightTarget[]>([])
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [pInfo, setPInfo] = useState({ total: 0, uploaded: 0, status: '', profileCode: '' })

  useEffect(() => {
    if (role === 'admin') {
      api.get('/admin/participants').then((res) => setParticipants(res.data.data ?? [])).catch(() => {})
      api.get('/admin/users').then((res) => setUsers(res.data.data ?? [])).catch(() => {})
      api.get('/admin/profile-weights').then((res) => setProfileWeights(res.data.data ?? [])).catch(() => {})
      api.get('/admin/checklist-items').then((res) => setChecklistItems(res.data.data ?? [])).catch(() => {})
    }
    if (role === 'asesor') api.get('/assessor/assignments').then((res) => setAssignments(res.data.data ?? [])).catch(() => {})
    if (role === 'juri') api.get('/jury/assessments').then((res) => setJuryRows(res.data.data ?? [])).catch(() => {})
    if (role === 'peserta') {
      (async () => {
        try {
          const [checklistRes, assessmentRes, profileRes] = await Promise.all([
            api.get('/checklist'),
            api.get('/participant/assessment'),
            api.get('/participant/profile'),
          ])
          const total = (checklistRes.data.data ?? []).length
          const assessment = assessmentRes.data.data
          const profileCode = profileRes.data.data?.profileCode ?? ''
          let uploaded = 0
          let status = ''
          if (assessment) {
            status = assessment.status ?? ''
            const evidenceRes = await api.get(`/assessments/${assessment.id}/evidence`)
            // Count distinct checklist items that have at least one document
            // (an item may now hold up to 3 documents).
            const evidences: EvidenceItem[] = evidenceRes.data.data ?? []
            uploaded = new Set(evidences.map((e) => e.checklistItemId)).size
          }
          setPInfo({ total, uploaded, status, profileCode })
        } catch { /* ignore */ }
      })()
    }
  }, [role, section])

  const adminUserMode = section === 'admin-users' || section === 'admin-user-list'
  const adminProfileWeightMode = section === 'admin-profile-weights'
  const adminChecklistMode = section === 'admin-checklist'
  const adminMaturityMode = section === 'admin-maturity'
  const cards: Array<[string, string, string]> = role === 'admin'
    ? (adminUserMode
      ? [
          ['Total User', users.length.toString(), 'Semua admin, asesor, dan juri aktif'],
          ['Admin', users.filter((item) => item.role === 'admin').length.toString(), 'User dengan hak penuh'],
          ['Asesor', users.filter((item) => item.role === 'asesor').length.toString(), 'Akun reviewer'],
          ['Juri', users.filter((item) => item.role === 'juri').length.toString(), 'Akun final decision'],
        ] as Array<[string, string, string]>
      : adminProfileWeightMode
        ? [
            ['Profil Bobot', profileWeights.length.toString(), 'Kode profil aktif di sistem'],
            ['Target Total', '100%', 'Setiap profil harus tetap 100%'],
            ['Acuan Bobot', 'Standar', 'Mengacu standar bobot kategori ESG'],
          ] as Array<[string, string, string]>
      : adminChecklistMode
        ? [
            ['Master Item', checklistItems.length.toString(), 'Semua baris master checklist'],
            ['Pillar', new Set(checklistItems.map((item) => item.pillar)).size.toString(), 'Environmental, Social, Governance'],
            ['Applicability', new Set(checklistItems.map((item) => item.applicabilityTag || '')).size.toString(), 'Tag profil peserta'],
          ] as Array<[string, string, string]>
      : adminMaturityMode
        ? [
            ['Skor Minimum', '0', 'Tidak ada kebijakan, praktik, atau bukti'],
            ['Skor Maksimum', '5', 'Praktik terbaik industri'],
            ['Kategori Level', '4', 'Band skor pilar E/S/G'],
          ] as Array<[string, string, string]>
      : [
          ['Peserta Register', participants.length.toString(), 'Masuk dari form register peserta'],
          ['Menunggu Assign', participants.filter((item) => !item.assessorId).length.toString(), 'Belum punya asesor'],
          ['Jury Review', participants.filter((item) => item.assessmentStatus === 'jury_review').length.toString(), 'Siap keputusan juri'],
        ] as Array<[string, string, string]>)
    : role === 'peserta'
      ? [
          ['Checklist', pInfo.total.toString(), pInfo.profileCode ? `Item wajib untuk profil ${pInfo.profileCode}` : 'Item sesuai profil Anda'],
          ['Evidence', `${pInfo.uploaded}/${pInfo.total}`, pInfo.total > 0 && pInfo.uploaded >= pInfo.total ? 'Semua dokumen terunggah' : 'Dokumen terunggah'],
          ['Status', pInfo.status ? statusLabel(pInfo.status) : 'Draft', participantStatusNote(pInfo.status)],
        ] as Array<[string, string, string]>
      : role === 'asesor'
        ? [
            ['Peserta Saya', assignments.length.toString(), 'Assignment dari admin'],
            ['Butuh Review', assignments.filter((item) => item.assessmentStatus !== 'finalized').length.toString(), 'Siap scoring'],
            ['Scoring', '0-5', 'Maturity per item'],
          ] as Array<[string, string, string]>
        : [
            ['Siap Finalisasi', juryRows.filter((item) => item.assessmentStatus === 'jury_review').length.toString(), 'Dikirim asesor ke juri'],
            ['Finalized', juryRows.filter((item) => item.assessmentStatus === 'finalized').length.toString(), 'Sudah diputuskan'],
            ['Award Model', 'Standar ESG', 'Eligibility otomatis ikut red flag aktif'],
          ] as Array<[string, string, string]>

  // All roles use the colored (header-gradient) summary cards for consistency.
  const cardClass = 'metric-card metric-card--accent'
  // Keep 4-card sets (e.g. admin user stats) on a single row.
  const gridClass = cards.length === 4 ? 'metric-grid metric-grid--4' : 'metric-grid'
  return (
    <section className={gridClass}>
      {cards.map(([title, value, note]) => (
        <article className={cardClass} key={title}>
          <span>{title}</span>
          <strong>{value}</strong>
          <p>{note}</p>
        </article>
      ))}
    </section>
  )
}

function AdminWorkspace() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState(() => window.location.hash.replace('#', '') || 'admin-participants')
  const [participants, setParticipants] = useState<ApiParticipant[]>([])
  const [assessors, setAssessors] = useState<User[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [profileWeights, setProfileWeights] = useState<ProfileWeightTarget[]>([])
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [editingChecklistItem, setEditingChecklistItem] = useState<ChecklistItem | null>(null)
  const [maturityLevels, setMaturityLevels] = useState<MaturityLevelRef[]>([])
  const [maturityBands, setMaturityBands] = useState<MaturityBandRef[]>([])
  const [selectedAssessor, setSelectedAssessor] = useState<Record<string, string>>({})
  const [newProfileWeight, setNewProfileWeight] = useState<ProfileWeightTarget>({
    profileCode: '',
    environmental: 0,
    social: 0,
    governance: 0,
    rationale: '',
    total: 0,
  })
  const [newChecklistItem, setNewChecklistItem] = useState<ChecklistItem>({
    id: '',
    pillar: 'environmental',
    category: '',
    subCategory: '',
    questionNumber: '',
    question: '',
    evidenceRequired: '',
    applicabilityTag: 'IUP',
    weight: 0,
    sortOrder: 0,
  })
  const [newMaturityLevel, setNewMaturityLevel] = useState({ score: 0, level: '', description: '' })
  const [newMaturityBand, setNewMaturityBand] = useState({ rangeLabel: '', bandLabel: '' })
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'asesor' as Role,
    position: '',
    affiliation: '',
    password: '',
    confirmPassword: '',
    isActive: true,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  async function loadAdminData() {
    setLoading(true)
    setError('')
    try {
      const [participantsRes, assessorsRes, usersRes, weightsRes, checklistItemsRes, maturityLevelsRes, maturityBandsRes] = await Promise.all([
        api.get('/admin/participants'),
        api.get('/admin/assessors'),
        api.get('/admin/users'),
        api.get('/admin/profile-weights'),
        api.get('/admin/checklist-items'),
        api.get('/admin/maturity-levels'),
        api.get('/admin/maturity-bands'),
      ])
      setParticipants(participantsRes.data.data ?? [])
      setAssessors(assessorsRes.data.data ?? [])
      setUsers(usersRes.data.data ?? [])
      setProfileWeights(weightsRes.data.data ?? [])
      setChecklistItems(checklistItemsRes.data.data ?? [])
      setMaturityLevels(maturityLevelsRes.data.data ?? [])
      setMaturityBands(maturityBandsRes.data.data ?? [])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  useEffect(() => {
    const syncSection = () => setActiveSection(window.location.hash.replace('#', '') || 'admin-participants')
    window.addEventListener('hashchange', syncSection)
    syncSection()
    return () => window.removeEventListener('hashchange', syncSection)
  }, [])

  async function handleVerify(orgId: string) {
    try {
      await api.patch(`/admin/participants/${orgId}/verify`)
      await loadAdminData()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleEditParticipant(org: ApiParticipant) {
    const name = window.prompt('Company Name', org.name)?.trim()
    if (!name) return
    const email = window.prompt('Work Email', org.email ?? '')?.trim()
    if (!email) return
    const phone = window.prompt('Phone / WhatsApp', org.phone ?? '')?.trim() ?? ''
    const website = window.prompt('Website', org.website ?? '')?.trim() ?? ''
    try {
      await api.patch(`/admin/participants/${org.id}`, {
        name,
        email,
        phone,
        website,
      })
      await loadAdminData()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleDeleteParticipant(org: ApiParticipant) {
    const confirmed = window.confirm(`Delete participant "${org.name}"?\n\nThis will permanently remove:\n- Organization profile\n- Participant account\n- All assessments & evidence\n- All scores & jury decisions\n\nThis action CANNOT be undone!`)
    if (!confirmed) return
    setLoading(true)
    setError('')
    try {
      await api.delete(`/admin/participants/${org.id}`)
      await loadAdminData()
      alert(`✓ Participant "${org.name}" has been deleted successfully.`)
    } catch (err) {
      setError(getErrorMessage(err))
      alert(`✗ Failed to delete participant: ${getErrorMessage(err)}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleUserStatus(user: User) {
    const nextActive = !user.isActive
    const confirmed = window.confirm(`${nextActive ? 'Activate' : 'Deactivate'} user "${user.name}"?`)
    if (!confirmed) return
    try {
      await api.patch(`/admin/users/${user.id}/status`, { isActive: nextActive })
      await loadAdminData()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleAssign(assessmentId: string) {
    const assessorId = selectedAssessor[assessmentId] ?? assessors[0]?.id
    if (!assessorId) return
    try {
      await api.post(`/admin/assessments/${assessmentId}/assign`, { assessorId })
      await loadAdminData()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleSaveProfileWeight(item: ProfileWeightTarget) {
    try {
      await api.patch(`/admin/profile-weights/${item.profileCode}`, {
        environmental: Number(item.environmental),
        social: Number(item.social),
        governance: Number(item.governance),
        rationale: item.rationale,
      })
      await loadAdminData()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleDeleteProfileWeight(item: ProfileWeightTarget) {
    const confirmed = window.confirm(`Delete profile weight "${item.profileCode}"?`)
    if (!confirmed) return
    try {
      await api.delete(`/admin/profile-weights/${item.profileCode}`)
      await loadAdminData()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleCreateProfileWeight(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!newProfileWeight.profileCode.trim()) {
      setError('Profile code is required.')
      return
    }
    const payload = {
      environmental: Number(newProfileWeight.environmental),
      social: Number(newProfileWeight.social),
      governance: Number(newProfileWeight.governance),
      rationale: newProfileWeight.rationale.trim(),
    }
    const total = payload.environmental + payload.social + payload.governance
    if (total < 0.999 || total > 1.001) {
      setError('Profile weights must total 100%.')
      return
    }
    try {
      await api.patch(`/admin/profile-weights/${newProfileWeight.profileCode.trim().toUpperCase()}`, payload)
      setNewProfileWeight({
        profileCode: '',
        environmental: 0,
        social: 0,
        governance: 0,
        rationale: '',
        total: 0,
      })
      await loadAdminData()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleCreateChecklistItem(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!newChecklistItem.id.trim()) {
      setError('Checklist code is required.')
      return
    }
    try {
      await api.post('/admin/checklist-items', {
        id: newChecklistItem.id.trim(),
        pillar: newChecklistItem.pillar,
        category: newChecklistItem.category.trim(),
        subCategory: newChecklistItem.subCategory.trim(),
        questionNumber: newChecklistItem.questionNumber.trim(),
        question: newChecklistItem.question.trim(),
        evidenceRequired: newChecklistItem.evidenceRequired.trim(),
        applicabilityTag: newChecklistItem.applicabilityTag?.trim() || 'IUP',
        weight: Number(newChecklistItem.weight),
        sortOrder: Number(newChecklistItem.sortOrder),
      })
      setNewChecklistItem({
        id: '',
        pillar: 'environmental',
        category: '',
        subCategory: '',
        questionNumber: '',
        question: '',
        evidenceRequired: '',
        applicabilityTag: 'IUP',
        weight: 0,
        sortOrder: 0,
      })
      await loadAdminData()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleUpdateChecklistItem(item: ChecklistItem) {
    try {
      await api.patch(`/admin/checklist-items/${item.id}`, {
        pillar: item.pillar,
        category: item.category,
        subCategory: item.subCategory,
        questionNumber: item.questionNumber,
        question: item.question,
        evidenceRequired: item.evidenceRequired,
        applicabilityTag: item.applicabilityTag || 'IUP',
        weight: Number(item.weight),
        sortOrder: Number(item.sortOrder ?? 0),
      })
      await loadAdminData()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleDeleteChecklistItem(item: ChecklistItem) {
    const confirmed = window.confirm(`Delete checklist item "${item.id}"?`)
    if (!confirmed) return
    try {
      await api.delete(`/admin/checklist-items/${item.id}`)
      await loadAdminData()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  function handleOpenChecklistEditor(item: ChecklistItem) {
    setEditingChecklistItem({ ...item })
  }

  function handleCloseChecklistEditor() {
    setEditingChecklistItem(null)
  }

  async function handleSaveChecklistEditor() {
    if (!editingChecklistItem) return
    try {
      await api.patch(`/admin/checklist-items/${editingChecklistItem.id}`, {
        pillar: editingChecklistItem.pillar,
        category: editingChecklistItem.category,
        subCategory: editingChecklistItem.subCategory,
        questionNumber: editingChecklistItem.questionNumber,
        question: editingChecklistItem.question,
        evidenceRequired: editingChecklistItem.evidenceRequired,
        applicabilityTag: editingChecklistItem.applicabilityTag || 'IUP',
        weight: Number(editingChecklistItem.weight),
        sortOrder: Number(editingChecklistItem.sortOrder ?? 0),
      })
      setEditingChecklistItem(null)
      await loadAdminData()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleCreateMaturityLevel(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await api.post('/admin/maturity-levels', {
        score: Number(newMaturityLevel.score),
        level: newMaturityLevel.level.trim(),
        description: newMaturityLevel.description.trim(),
      })
      setNewMaturityLevel({ score: 0, level: '', description: '' })
      await loadAdminData()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleUpdateMaturityLevel(item: MaturityLevelRef) {
    try {
      await api.patch(`/admin/maturity-levels/${item.id}`, {
        score: Number(item.score),
        level: item.level,
        description: item.description,
      })
      await loadAdminData()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleDeleteMaturityLevel(item: MaturityLevelRef) {
    const confirmed = window.confirm(`Delete maturity level ${item.score}?`)
    if (!confirmed) return
    try {
      await api.delete(`/admin/maturity-levels/${item.id}`)
      await loadAdminData()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleCreateMaturityBand(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await api.post('/admin/maturity-bands', {
        rangeLabel: newMaturityBand.rangeLabel.trim(),
        bandLabel: newMaturityBand.bandLabel.trim(),
      })
      setNewMaturityBand({ rangeLabel: '', bandLabel: '' })
      await loadAdminData()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleUpdateMaturityBand(item: MaturityBandRef) {
    try {
      await api.patch(`/admin/maturity-bands/${item.id}`, {
        rangeLabel: item.rangeLabel,
        bandLabel: item.bandLabel,
      })
      await loadAdminData()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleDeleteMaturityBand(item: MaturityBandRef) {
    const confirmed = window.confirm(`Delete maturity band "${item.rangeLabel}"?`)
    if (!confirmed) return
    try {
      await api.delete(`/admin/maturity-bands/${item.id}`)
      await loadAdminData()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!userForm.name.trim() || !userForm.email.trim() || !userForm.password.trim()) {
      setError('Name, email, and password are required.')
      return
    }
    if (userForm.password !== userForm.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    try {
      await api.post('/admin/users', {
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        phone: userForm.phone.trim(),
        role: userForm.role,
        position: userForm.position.trim(),
        affiliation: userForm.affiliation.trim(),
        password: userForm.password,
        confirmPassword: userForm.confirmPassword,
        isActive: userForm.isActive,
      })
      setUserForm({
        name: '',
        email: '',
        phone: '',
        role: 'asesor',
        position: '',
        affiliation: '',
        password: '',
        confirmPassword: '',
        isActive: true,
      })
      await loadAdminData()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <>
      {activeSection === 'admin-users' && (
        <section className="panel panel-wide" id="admin-users">
          <PanelTitle kicker="Admin Workflow" title="Create Admin / Asesor / Juri" icon={<Users size={22} />} />
          {error && <p className="panel-error">{error}</p>}
          <form className="admin-user-form" onSubmit={handleCreateUser}>
            <label className="auth-field">
              <span>Full Name</span>
              <input value={userForm.name} onChange={(e) => setUserForm((s) => ({ ...s, name: e.target.value }))} placeholder="User full name" />
            </label>
            <label className="auth-field">
              <span>Email</span>
              <input type="email" value={userForm.email} onChange={(e) => setUserForm((s) => ({ ...s, email: e.target.value }))} placeholder="name@company.com" />
            </label>
            <label className="auth-field">
              <span>Phone</span>
              <input value={userForm.phone} onChange={(e) => setUserForm((s) => ({ ...s, phone: e.target.value }))} placeholder="+62 812 0000 0000" />
            </label>
            <label className="auth-field">
              <span>Role</span>
              <select value={userForm.role} onChange={(e) => setUserForm((s) => ({ ...s, role: e.target.value as Role }))}>
                <option value="admin">Admin</option>
                <option value="asesor">Asesor</option>
                <option value="juri">Juri</option>
              </select>
            </label>
            <label className="auth-field">
              <span>Position / Title</span>
              <input value={userForm.position} onChange={(e) => setUserForm((s) => ({ ...s, position: e.target.value }))} placeholder="e.g. Lead Assessor" />
            </label>
            <label className="auth-field">
              <span>Affiliation / Institution</span>
              <input value={userForm.affiliation} onChange={(e) => setUserForm((s) => ({ ...s, affiliation: e.target.value }))} placeholder="Company or institution" />
            </label>
            <label className="auth-field">
              <span>Password</span>
              <div className="password-input">
                <input type={showPassword ? 'text' : 'password'} value={userForm.password} onChange={(e) => setUserForm((s) => ({ ...s, password: e.target.value }))} placeholder="Minimum 8 characters" />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <label className="auth-field">
              <span>Confirm Password</span>
              <div className="password-input">
                <input type={showConfirmPassword ? 'text' : 'password'} value={userForm.confirmPassword} onChange={(e) => setUserForm((s) => ({ ...s, confirmPassword: e.target.value }))} placeholder="Repeat password" />
                <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword((v) => !v)} aria-label={showConfirmPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <label className="auth-field">
              <span>Status</span>
              <select value={userForm.isActive ? 'true' : 'false'} onChange={(e) => setUserForm((s) => ({ ...s, isActive: e.target.value === 'true' }))}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            <div className="admin-form-actions">
              <button type="submit">Create User</button>
            </div>
          </form>
        </section>
      )}

      {activeSection === 'admin-user-list' && (
        <section className="panel panel-wide" id="admin-user-list">
          <PanelTitle kicker="Admin Workflow" title="User Directory" icon={<Users size={22} />} />
          {loading && <p className="panel-muted">Loading users...</p>}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Affiliation</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <span>{item.position || '-'}</span>
                    </td>
                    <td>{roleLabels[item.role]}</td>
                    <td>{item.affiliation || '-'}</td>
                    <td>{item.email}</td>
                    <td><span className="status-pill">{item.isActive ? 'active' : 'inactive'}</span></td>
                    <td>
                      <div className="action-row">
                        <button onClick={() => handleToggleUserStatus(item)}>
                          {item.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeSection === 'admin-profile-weights' && (
        <section className="panel panel-wide" id="admin-profile-weights">
          <PanelTitle kicker="Admin Workflow" title="Bobot Kategori" icon={<SlidersHorizontal size={22} />} />
          {loading && <p className="panel-muted">Loading profile weights...</p>}
          <form className="admin-inline-form" onSubmit={handleCreateProfileWeight}>
            <input
              value={newProfileWeight.profileCode}
              onChange={(e) => setNewProfileWeight((state) => ({ ...state, profileCode: e.target.value.toUpperCase() }))}
              placeholder="Profile Code"
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={newProfileWeight.environmental}
              onChange={(e) => setNewProfileWeight((state) => ({ ...state, environmental: Number(e.target.value) }))}
              placeholder="Environmental"
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={newProfileWeight.social}
              onChange={(e) => setNewProfileWeight((state) => ({ ...state, social: Number(e.target.value) }))}
              placeholder="Social"
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={newProfileWeight.governance}
              onChange={(e) => setNewProfileWeight((state) => ({ ...state, governance: Number(e.target.value) }))}
              placeholder="Governance"
            />
            <input
              value={newProfileWeight.rationale}
              onChange={(e) => setNewProfileWeight((state) => ({ ...state, rationale: e.target.value }))}
              placeholder="Rationale"
            />
            <button type="submit">Add / Save</button>
          </form>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kode Profil</th>
                  <th>Environmental</th>
                  <th>Social</th>
                  <th>Governance</th>
                  <th>Total</th>
                  <th>Rasional Singkat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {profileWeights.map((item, index) => (
                  <tr key={item.profileCode}>
                    <td><strong>{item.profileCode}</strong></td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={item.environmental}
                        onChange={(e) => setProfileWeights((state) => state.map((row, rowIndex) => rowIndex === index ? { ...row, environmental: Number(e.target.value) } : row))}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={item.social}
                        onChange={(e) => setProfileWeights((state) => state.map((row, rowIndex) => rowIndex === index ? { ...row, social: Number(e.target.value) } : row))}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={item.governance}
                        onChange={(e) => setProfileWeights((state) => state.map((row, rowIndex) => rowIndex === index ? { ...row, governance: Number(e.target.value) } : row))}
                      />
                    </td>
                    <td>{((item.environmental + item.social + item.governance) * 100).toFixed(0)}%</td>
                    <td>
                      <input
                        value={item.rationale}
                        onChange={(e) => setProfileWeights((state) => state.map((row, rowIndex) => rowIndex === index ? { ...row, rationale: e.target.value } : row))}
                      />
                    </td>
                    <td>
                      <div className="action-row">
                        <button type="button" onClick={() => handleSaveProfileWeight(item)}>Update</button>
                        <button type="button" onClick={() => handleDeleteProfileWeight(item)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeSection === 'admin-checklist' && (
        <section className="panel panel-wide" id="admin-checklist">
          <PanelTitle kicker="Admin Workflow" title="Master Checklist" icon={<ClipboardList size={22} />} />
          {loading && <p className="panel-muted">Loading master checklist...</p>}
          <div className="admin-checklist-summary">
            <div>
              <span>Items loaded</span>
              <strong>{checklistItems.length}</strong>
            </div>
            <div>
              <span>Sumber data</span>
              <strong>Master Checklist</strong>
            </div>
            <div>
              <span>Editable fields</span>
              <strong>{checklistItems.length} rows</strong>
            </div>
          </div>
          <form className="admin-checklist-form" onSubmit={handleCreateChecklistItem}>
            <label className="auth-field">
              <span>Kode</span>
              <input value={newChecklistItem.id} onChange={(e) => setNewChecklistItem((state) => ({ ...state, id: e.target.value }))} placeholder="env-tailings-water" />
            </label>
            <label className="auth-field">
              <span>Pillar</span>
              <select value={newChecklistItem.pillar} onChange={(e) => setNewChecklistItem((state) => ({ ...state, pillar: e.target.value as ChecklistItem['pillar'] }))}>
                <option value="environmental">Environmental</option>
                <option value="social">Social</option>
                <option value="governance">Governance</option>
              </select>
            </label>
            <label className="auth-field">
              <span>Kategori</span>
              <input value={newChecklistItem.category} onChange={(e) => setNewChecklistItem((state) => ({ ...state, category: e.target.value }))} placeholder="Tailing & Air" />
            </label>
            <label className="auth-field">
              <span>Sub-Kategori</span>
              <input value={newChecklistItem.subCategory} onChange={(e) => setNewChecklistItem((state) => ({ ...state, subCategory: e.target.value }))} placeholder="Tailings Safety" />
            </label>
            <label className="auth-field">
              <span>No</span>
              <input value={newChecklistItem.questionNumber} onChange={(e) => setNewChecklistItem((state) => ({ ...state, questionNumber: e.target.value }))} placeholder="1.1" />
            </label>
            <label className="auth-field">
              <span>Applicability Tag</span>
              <input value={newChecklistItem.applicabilityTag || ''} onChange={(e) => setNewChecklistItem((state) => ({ ...state, applicabilityTag: e.target.value }))} placeholder="IUP,IUJP-OPERASIONAL" />
            </label>
            <label className="auth-field">
              <span>Bobot Dasar</span>
              <input type="number" min="0" step="0.01" value={newChecklistItem.weight} onChange={(e) => setNewChecklistItem((state) => ({ ...state, weight: Number(e.target.value) }))} placeholder="0.02" />
            </label>
            <label className="auth-field">
              <span>Urutan</span>
              <input type="number" min="0" step="1" value={newChecklistItem.sortOrder ?? 0} onChange={(e) => setNewChecklistItem((state) => ({ ...state, sortOrder: Number(e.target.value) }))} placeholder="10" />
            </label>
            <label className="auth-field checklist-full">
              <span>Kriteria Pertanyaan</span>
              <textarea value={newChecklistItem.question} onChange={(e) => setNewChecklistItem((state) => ({ ...state, question: e.target.value }))} placeholder="Desain dan tinjauan independen..." rows={3} />
            </label>
            <label className="auth-field checklist-full">
              <span>Bukti / Evidence</span>
              <textarea value={newChecklistItem.evidenceRequired} onChange={(e) => setNewChecklistItem((state) => ({ ...state, evidenceRequired: e.target.value }))} placeholder="Laporan EoR, sertifikat desain" rows={3} />
            </label>
            <div className="admin-form-actions checklist-submit">
              <button type="submit">Add Item</button>
            </div>
          </form>
          <div className="table-wrap">
            <table className="data-table checklist-admin-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Kategori</th>
                  <th>Sub-Kategori</th>
                  <th>Kode</th>
                  <th>Kriteria Pertanyaan</th>
                  <th>Bukti / Evidence</th>
                  <th>Applicability</th>
                  <th>Bobot Dasar</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {checklistItems.map((item, index) => (
                  <tr key={item.id}>
                    <td><input value={item.questionNumber} onChange={(e) => setChecklistItems((state) => state.map((row, rowIndex) => rowIndex === index ? { ...row, questionNumber: e.target.value } : row))} /></td>
                    <td><input value={item.category} onChange={(e) => setChecklistItems((state) => state.map((row, rowIndex) => rowIndex === index ? { ...row, category: e.target.value } : row))} /></td>
                    <td><input value={item.subCategory} onChange={(e) => setChecklistItems((state) => state.map((row, rowIndex) => rowIndex === index ? { ...row, subCategory: e.target.value } : row))} /></td>
                    <td><strong>{item.id}</strong></td>
                    <td>
                      <div className="checklist-text-cell">
                        <p>{item.question}</p>
                        <button type="button" className="ghost-button" onClick={() => handleOpenChecklistEditor(item)}>
                          <PencilLine size={14} />
                          Edit text
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="checklist-text-cell">
                        <p>{item.evidenceRequired}</p>
                        <button type="button" className="ghost-button" onClick={() => handleOpenChecklistEditor(item)}>
                          <PencilLine size={14} />
                          Edit text
                        </button>
                      </div>
                    </td>
                    <td><input value={item.applicabilityTag || ''} onChange={(e) => setChecklistItems((state) => state.map((row, rowIndex) => rowIndex === index ? { ...row, applicabilityTag: e.target.value } : row))} /></td>
                    <td><input type="number" min="0" step="0.01" value={item.weight} onChange={(e) => setChecklistItems((state) => state.map((row, rowIndex) => rowIndex === index ? { ...row, weight: Number(e.target.value) } : row))} /></td>
                    <td>
                      <div className="action-row">
                        <button type="button" onClick={() => handleUpdateChecklistItem(item)}>Update</button>
                        <button type="button" onClick={() => handleDeleteChecklistItem(item)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editingChecklistItem && (
            <div className="modal-overlay" role="presentation" onClick={handleCloseChecklistEditor}>
              <div className="modal-card checklist-editor-modal" role="dialog" aria-modal="true" aria-label="Edit checklist item" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <span>Master Checklist</span>
                    <h3>{editingChecklistItem.id}</h3>
                  </div>
                  <button type="button" className="modal-close" onClick={handleCloseChecklistEditor} aria-label="Close editor">
                    <X size={18} />
                  </button>
                </div>
                <div className="modal-grid">
                  <label className="auth-field">
                    <span>Kategori</span>
                    <input value={editingChecklistItem.category} onChange={(e) => setEditingChecklistItem((state) => state ? { ...state, category: e.target.value } : state)} />
                  </label>
                  <label className="auth-field">
                    <span>Sub-Kategori</span>
                    <input value={editingChecklistItem.subCategory} onChange={(e) => setEditingChecklistItem((state) => state ? { ...state, subCategory: e.target.value } : state)} />
                  </label>
                  <label className="auth-field">
                    <span>No</span>
                    <input value={editingChecklistItem.questionNumber} onChange={(e) => setEditingChecklistItem((state) => state ? { ...state, questionNumber: e.target.value } : state)} />
                  </label>
                  <label className="auth-field">
                    <span>Applicability Tag</span>
                    <input value={editingChecklistItem.applicabilityTag || ''} onChange={(e) => setEditingChecklistItem((state) => state ? { ...state, applicabilityTag: e.target.value } : state)} />
                  </label>
                  <label className="auth-field">
                    <span>Bobot Dasar</span>
                    <input type="number" min="0" step="0.01" value={editingChecklistItem.weight} onChange={(e) => setEditingChecklistItem((state) => state ? { ...state, weight: Number(e.target.value) } : state)} />
                  </label>
                  <label className="auth-field">
                    <span>Urutan</span>
                    <input type="number" min="0" step="1" value={editingChecklistItem.sortOrder ?? 0} onChange={(e) => setEditingChecklistItem((state) => state ? { ...state, sortOrder: Number(e.target.value) } : state)} />
                  </label>
                  <label className="auth-field checklist-full">
                    <span>Kriteria Pertanyaan</span>
                    <textarea rows={4} value={editingChecklistItem.question} onChange={(e) => setEditingChecklistItem((state) => state ? { ...state, question: e.target.value } : state)} />
                  </label>
                  <label className="auth-field checklist-full">
                    <span>Bukti / Evidence</span>
                    <textarea rows={4} value={editingChecklistItem.evidenceRequired} onChange={(e) => setEditingChecklistItem((state) => state ? { ...state, evidenceRequired: e.target.value } : state)} />
                  </label>
                </div>
                <div className="modal-actions">
                  <button type="button" className="ghost-button" onClick={handleCloseChecklistEditor}>Cancel</button>
                  <button type="button" onClick={handleSaveChecklistEditor}>Save changes</button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {activeSection === 'admin-maturity' && (
        <section className="panel panel-wide" id="admin-maturity">
          <PanelTitle kicker="Admin Workflow" title="Maturity Reference" icon={<FileCheck2 size={22} />} />
          <p className="panel-muted">Reference maturity sekarang tersimpan di database dan bisa ditambah, diubah, atau dihapus.</p>
          <form className="admin-inline-form" onSubmit={handleCreateMaturityLevel}>
            <input
              type="number"
              min="0"
              max="5"
              step="1"
              value={newMaturityLevel.score}
              onChange={(e) => setNewMaturityLevel((state) => ({ ...state, score: Number(e.target.value) }))}
              placeholder="Score"
            />
            <input
              value={newMaturityLevel.level}
              onChange={(e) => setNewMaturityLevel((state) => ({ ...state, level: e.target.value }))}
              placeholder="Level"
            />
            <input
              value={newMaturityLevel.description}
              onChange={(e) => setNewMaturityLevel((state) => ({ ...state, description: e.target.value }))}
              placeholder="Description"
            />
            <button type="submit">Add Level</button>
          </form>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Skor</th>
                  <th>Level</th>
                  <th>Deskripsi</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {maturityLevels.map((item, index) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="1"
                        value={item.score}
                        onChange={(e) => setMaturityLevels((state) => state.map((row, rowIndex) => rowIndex === index ? { ...row, score: Number(e.target.value) } : row))}
                      />
                    </td>
                    <td>
                      <input
                        value={item.level}
                        onChange={(e) => setMaturityLevels((state) => state.map((row, rowIndex) => rowIndex === index ? { ...row, level: e.target.value } : row))}
                      />
                    </td>
                    <td>
                      <input
                        value={item.description}
                        onChange={(e) => setMaturityLevels((state) => state.map((row, rowIndex) => rowIndex === index ? { ...row, description: e.target.value } : row))}
                      />
                    </td>
                      <td>
                        <div className="action-row">
                          <button type="button" onClick={() => handleUpdateMaturityLevel(item)}>Update</button>
                          <button type="button" onClick={() => handleDeleteMaturityLevel(item)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <form className="admin-inline-form" style={{ marginTop: '18px' }} onSubmit={handleCreateMaturityBand}>
            <input
              value={newMaturityBand.rangeLabel}
              onChange={(e) => setNewMaturityBand((state) => ({ ...state, rangeLabel: e.target.value }))}
              placeholder="Range label"
            />
            <input
              value={newMaturityBand.bandLabel}
              onChange={(e) => setNewMaturityBand((state) => ({ ...state, bandLabel: e.target.value }))}
              placeholder="Band label"
            />
            <button type="submit">Add Band</button>
          </form>

          <div className="summary-layout" style={{ marginTop: '18px' }}>
            <div className="summary-table-card">
              <h3>Level Kematangan Kategori</h3>
              <table className="data-table summary-table">
                <thead>
                  <tr>
                    <th>Rentang</th>
                    <th>Level</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {maturityBands.map((item, index) => (
                    <tr key={item.id}>
                      <td>
                        <input
                          value={item.rangeLabel}
                          onChange={(e) => setMaturityBands((state) => state.map((row, rowIndex) => rowIndex === index ? { ...row, rangeLabel: e.target.value } : row))}
                        />
                      </td>
                      <td>
                        <input
                          value={item.bandLabel}
                          onChange={(e) => setMaturityBands((state) => state.map((row, rowIndex) => rowIndex === index ? { ...row, bandLabel: e.target.value } : row))}
                        />
                      </td>
                      <td>
                        <div className="action-row">
                          <button type="button" onClick={() => handleUpdateMaturityBand(item)}>Update</button>
                          <button type="button" onClick={() => handleDeleteMaturityBand(item)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="summary-table-card">
              <h3>Catatan</h3>
              <div className="summary-note" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                <small>Skala maturity dipakai asesor untuk memberi skor 0-5 pada setiap item checklist.</small>
                <small>Data ini sekarang bisa dikelola dari admin tanpa edit kode.</small>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeSection === 'admin-participants' && (
        <section className="panel panel-wide" id="admin-participants">
          <PanelTitle kicker="Admin Workflow" title="List Peserta" icon={<Users size={22} />} />
          {loading && <p className="panel-muted">Loading peserta...</p>}
          {error && <p className="panel-error">{error}</p>}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Peserta</th>
                  <th>Status</th>
                  <th>Assessment</th>
                  <th>Asesor</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((org) => (
                  <tr key={org.id}>
                    <td><strong>{org.name}</strong><span>{org.email}</span></td>
                    <td><span className="status-pill">{statusLabel(org.status)}</span></td>
                    <td>{statusLabel(org.assessmentStatus)}</td>
                    <td>{org.assessorName || '-'}</td>
                    <td>
                      <div className="action-row">
                        <button onClick={() => handleEditParticipant(org)}>Edit</button>
                        <button onClick={() => handleDeleteParticipant(org)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeSection === 'admin-participant-actions' && (
        <section className="panel panel-wide" id="admin-participant-actions">
          <PanelTitle kicker="Admin Workflow" title="Verify & Assign Asesor" icon={<Users size={22} />} />
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Peserta</th>
                  <th>Asesor</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((org) => (
                  <tr key={org.id}>
                    <td>
                      <strong>{org.name}</strong>
                      <span>{org.email}</span>
                      <small>{statusLabel(org.status)} / {statusLabel(org.assessmentStatus)}</small>
                    </td>
                    <td>
                      <select
                        value={selectedAssessor[org.assessmentId ?? ''] ?? org.assessorId ?? assessors[0]?.id ?? ''}
                        onChange={(e) => org.assessmentId && setSelectedAssessor((state) => ({ ...state, [org.assessmentId as string]: e.target.value }))}
                        disabled={!org.assessmentId || assessors.length === 0}
                      >
                        {assessors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                      {org.assessorName && <small>Assigned: {org.assessorName}</small>}
                    </td>
                    <td>
                      <div className="action-row">
                        <button onClick={() => handleVerify(org.id)} disabled={org.status !== 'registered'}>Verifikasi</button>
                        <button onClick={() => org.assessmentId && handleAssign(org.assessmentId)} disabled={!org.assessmentId || org.status === 'registered' || assessors.length === 0}>Assign</button>
                        <button onClick={() => org.assessmentId && navigate(`/admin/assessment/${org.assessmentId}`)} disabled={!org.assessmentId}>Detail</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}

function ProfilPeserta() {
  const user = useAuthStore((s) => s.user)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [profile, setProfile] = useState({
    nomorIzin: '',
    jenisIzin: '' as '' | 'IUP' | 'IUJP',
    subJenisLayanan: '',
    logoUrl: '',
  })
  const [profileCode, setProfileCode] = useState('BELUM DIPILIH')
  const [isProfileComplete, setIsProfileComplete] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      setLoading(true)
      setError('')
      try {
        const res = await api.get('/participant/profile')
        const data = res.data.data as { organization: Organization; isComplete: boolean; profileCode?: string }
        setOrganization(data.organization)
        setProfile({
          nomorIzin: data.organization.licenseNumber ?? '',
          jenisIzin: (data.organization.licenseType as '' | 'IUP' | 'IUJP') ?? '',
          subJenisLayanan: data.organization.mainServiceType ?? '',
          logoUrl: data.organization.logoUrl ?? '',
        })
        setProfileCode(data.profileCode ?? 'BELUM DIPILIH')
        setIsProfileComplete(data.isComplete)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  useEffect(() => {
    const complete = !!(
      profile.nomorIzin.trim()
      && profile.jenisIzin
      && profile.logoUrl.trim()
      && profile.subJenisLayanan.trim() // required for both IUP (IUP/IUPK) and IUJP
    )
    setIsProfileComplete(complete)
  }, [profile])

  async function handleLogoUpload(file?: File) {
    if (!file) return
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/participant/logo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = res.data.data?.logoUrl ?? ''
      setProfile((state) => ({ ...state, logoUrl: url }))
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.patch('/participant/profile', {
        licenseNumber: profile.nomorIzin.trim(),
        licenseType: profile.jenisIzin,
        mainServiceType: profile.subJenisLayanan.trim(), // IUP: IUP/IUPK · IUJP: jenis layanan
        logoUrl: profile.logoUrl.trim(),
      })
      setIsProfileComplete(true)
      const res = await api.get('/participant/profile')
      const data = res.data.data as { organization: Organization; isComplete: boolean; profileCode?: string }
      setOrganization(data.organization)
      setProfile({
        nomorIzin: data.organization.licenseNumber ?? '',
        jenisIzin: (data.organization.licenseType as '' | 'IUP' | 'IUJP') ?? '',
        subJenisLayanan: data.organization.mainServiceType ?? '',
        logoUrl: data.organization.logoUrl ?? '',
      })
      setProfileCode(data.profileCode ?? 'BELUM DIPILIH')
      setIsProfileComplete(data.isComplete)
      setSuccessMessage('Profil berhasil disimpan! Anda sekarang dapat mengakses checklist assessment.')
      setTimeout(() => setSuccessMessage(''), 4000)
      window.dispatchEvent(new Event('participant-profile-updated'))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const companyName = organization?.name ?? user?.name ?? '-'
  const sector = organization?.sector ?? '-'
  const companyLogo = profile.logoUrl

  const contactEmail = organization?.email ?? user?.email ?? '-'
  const contactPhone = organization?.phone ?? user?.phone ?? '-'
  const position = user?.position || '-'
  const statusText = organization?.status || 'registered'

  return (
    <section className="panel panel-wide" id="participant-profile">
      <PanelTitle kicker="Peserta Workflow" title="Profil Peserta" icon={<UserIcon size={22} />} />

      {successMessage && (
        <div className="profile-alert profile-alert-success">
          <CheckCircle2 size={18} />
          <p><strong>{successMessage}</strong></p>
        </div>
      )}

      {!isProfileComplete && !successMessage && (
        <div className="profile-alert">
          <Bell size={18} />
          <p><strong>Profil belum lengkap.</strong> Lengkapi Nomor Izin, Jenis Izin, Sub-Kategori/Sub-Jenis Layanan, dan Logo Perusahaan.</p>
        </div>
      )}

      <div className="profile-layout">
        <article className="profile-panel profile-overview">
          <div className="profile-heading">
            <div>
              <span className="section-kicker">Company Profile</span>
              <h3>{companyName}</h3>
              <p>Data register peserta dan identitas perusahaan.</p>
            </div>
            <div className="profile-logo-card profile-logo-card-compact">
              <div className="profile-logo-preview">
                {companyLogo ? <img src={companyLogo} alt={`${companyName} logo`} /> : <span>{companyName.slice(0, 2).toUpperCase()}</span>}
              </div>
              <button type="button" className="profile-upload-button" onClick={() => logoInputRef.current?.click()}>
                Upload Company Logo
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleLogoUpload(e.target.files?.[0])}
              />
            </div>
          </div>

          <div className="profile-info-grid">
            <div><span>Company Name</span><strong>{companyName}</strong></div>
            <div><span>Full Name</span><strong>{user?.name ?? '-'}</strong></div>
            <div><span>Position</span><strong>{position}</strong></div>
            <div><span>Work Email</span><strong>{contactEmail}</strong></div>
            <div><span>Phone / WhatsApp</span><strong>{contactPhone}</strong></div>
            <div><span>Sector</span><strong>{sector}</strong></div>
            <div><span>Status</span><strong>{statusText}</strong></div>
            <div><span>Kode Profil</span><strong>{profileCode}</strong></div>
          </div>
        </article>

        <article className="profile-panel profile-form-panel">
          <div className="profile-heading">
            <div>
              <span className="section-kicker">Required Data</span>
              <h3>License & Service Details</h3>
              <p>Isi data tambahan yang dipakai untuk menentukan bobot profil dan alur scoring.</p>
            </div>
          </div>

          {error && <p className="panel-error" style={{ marginBottom: 0 }}>{error}</p>}

          <form onSubmit={handleSaveProfile} className="profile-form">
            <div className="profile-form-grid">
              <label className="auth-field">
                <span>Nomor / Kode Izin Usaha *</span>
                <input
                  value={profile.nomorIzin}
                  onChange={(e) => setProfile((s) => ({ ...s, nomorIzin: e.target.value }))}
                  placeholder="Masukkan Kode Usaha (contoh: IUP-001/2024)"
                  required
                />
              </label>

              <label className="auth-field">
                <span>Jenis Izin Usaha *</span>
                <select
                  value={profile.jenisIzin}
                  onChange={(e) => setProfile((s) => ({ ...s, jenisIzin: e.target.value as '' | 'IUP' | 'IUJP', subJenisLayanan: '' }))}
                  required
                >
                  <option value="">Pilih Izin Usaha</option>
                  {licenseTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
            </div>

            {profile.jenisIzin === 'IUP' && (
              <label className="auth-field">
                <span>Pilih Sub Jenis Izin (IUP) *</span>
                <select
                  value={profile.subJenisLayanan}
                  onChange={(e) => setProfile((s) => ({ ...s, subJenisLayanan: e.target.value }))}
                  required
                >
                  <option value="">Pilih Sub Jenis Izin</option>
                  {iupSubCategoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <small style={{ color: '#7d9aa2', fontSize: '12px', marginTop: '4px' }}>
                  IUP atau IUPK — keduanya menghasilkan kode profil <strong>IUP</strong> (tidak memengaruhi penilaian).
                </small>
              </label>
            )}

            {profile.jenisIzin === 'IUJP' && (
              <label className="auth-field">
                <span>Pilih Sub Jenis Layanan (khusus IUJP) *</span>
                <select
                  value={profile.subJenisLayanan}
                  onChange={(e) => setProfile((s) => ({ ...s, subJenisLayanan: e.target.value }))}
                  required
                >
                  <option value="">Pilih Sub Jenis Layanan</option>
                  {mainServiceOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <small style={{ color: '#7d9aa2', fontSize: '12px', marginTop: '4px' }}>
                  Pilih sub-jenis yang paling menggambarkan lingkup usaha utama perusahaan Anda
                </small>
              </label>
            )}

            <div className="footer-actions profile-form-actions">
              <button type="submit" disabled={loading || saving}>
                {saving ? 'Menyimpan...' : 'Simpan Profil'}
              </button>
              {isProfileComplete && <span className="profile-complete">✓ Profil lengkap</span>}
            </div>
          </form>
        </article>
      </div>
    </section>
  )
}

function ParticipantWorkspace() {
  const navigate = useNavigate()
  const { checklist, checklistError } = useChecklist()
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [profileComplete, setProfileComplete] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([])
  const [scoreItems, setScoreItems] = useState<ScoreItem[]>([])
  const [summary, setSummary] = useState<ScoreSummary>(emptySummary)
  const [fileNames, setFileNames] = useState<Record<string, string>>({})
  const [uploadingId, setUploadingId] = useState<string>('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadProfile() {
    setProfileLoading(true)
    try {
      const res = await api.get('/participant/profile')
      const data = res.data.data as { isComplete: boolean }
      setProfileComplete(data.isComplete)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setProfileLoading(false)
    }
  }

  async function loadAssessment() {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/participant/assessment')
      const nextAssessment: Assessment = res.data.data
      setAssessment(nextAssessment)
      const [evidenceRes, scoreRes, summaryRes] = await Promise.all([
        api.get(`/assessments/${nextAssessment.id}/evidence`),
        api.get(`/assessments/${nextAssessment.id}/scores`),
        api.get(`/assessments/${nextAssessment.id}/summary`),
      ])
      setEvidenceItems(evidenceRes.data.data ?? [])
      setScoreItems(scoreRes.data.data ?? [])
      setSummary(summaryRes.data.data ?? emptySummary)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
    loadAssessment()

    // Listen for profile updates
    const handleProfileUpdate = () => {
      loadProfile()
    }
    window.addEventListener('participant-profile-updated', handleProfileUpdate)
    return () => window.removeEventListener('participant-profile-updated', handleProfileUpdate)
  }, [])

  async function handleSaveEvidence(item: ChecklistItem, fileName: string) {
    if (!assessment) return
    try {
      await api.post(`/assessments/${assessment.id}/evidence`, { checklistItemId: item.id, fileName })
      await loadAssessment()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleUploadEvidence(item: ChecklistItem, file: File) {
    if (!assessment) return
    setError('')
    setUploadingId(item.id)
    try {
      const form = new FormData()
      form.append('checklistItemId', item.id)
      form.append('file', file)
      await api.post(`/assessments/${assessment.id}/evidence/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await loadAssessment()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setUploadingId('')
    }
  }

  async function handleDeleteEvidence(evidenceId: string) {
    if (!assessment) return
    setError('')
    try {
      await api.delete(`/assessments/${assessment.id}/evidence/${evidenceId}`)
      await loadAssessment()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleSubmit() {
    if (!assessment) return
    setError('')
    // Count checklist items that have at least one evidence document.
    const itemsWithEvidence = new Set(evidenceItems.map((e) => e.checklistItemId))
    const covered = checklist.filter((item) => itemsWithEvidence.has(item.id)).length
    if (covered === 0) {
      setError('Unggah minimal satu dokumen evidence sebelum submit.')
      return
    }
    if (covered < checklist.length) {
      const ok = window.confirm(
        `Baru ${covered} dari ${checklist.length} item yang memiliki evidence. Tetap submit ke asesor sekarang?`,
      )
      if (!ok) return
    }
    try {
      await api.patch(`/assessments/${assessment.id}/submit`)
      await loadAssessment()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  if (profileLoading || loading) return <EmptyPanel title="Loading assessment" message="Mengambil profil dan checklist dari backend." />
  if (error || checklistError) return <EmptyPanel title="Gagal memuat assessment" message={error || checklistError} />
  if (!assessment) return <EmptyPanel title="Belum ada assessment" message="Silakan register ulang atau hubungi admin." />
  if (!profileComplete) {
    return (
      <section className="panel panel-wide" id="participant-checklist-locked">
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Bell size={64} style={{ margin: '0 auto 24px', color: 'var(--color-warning)' }} />
          <h2 style={{ fontSize: '24px', marginBottom: '12px', color: 'var(--color-text-primary)' }}>Profil Belum Lengkap</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
            Anda harus melengkapi <strong>Profil Peserta</strong> terlebih dahulu sebelum dapat mengakses checklist assessment. Silakan lengkapi Nomor Izin dan Jenis Izin perusahaan Anda.
          </p>
          <a href="#participant-profile" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'var(--color-teal)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
            <UserIcon size={20} />
            Lengkapi Profil Sekarang
          </a>
        </div>
      </section>
    )
  }

  const canSubmit = assessment.status === 'draft' || assessment.status === 'in_review' || assessment.status === 'revision_requested'
  return (
    <section className="panel panel-wide" id="participant-checklist">
      <PanelTitle kicker="Peserta Workflow" title="Checklist ESG & Evidence" icon={<Upload size={22} />} />
      {assessment.status === 'revision_requested' && (
        <div className="revision-banner">
          <strong>Diminta revisi oleh asesor</strong>
          <p>{assessment.revisionNote || 'Perbaiki evidence Anda lalu submit ulang.'}</p>
        </div>
      )}
      <ScoreStrip score={summary} />
      <ChecklistTable
        checklist={checklist}
        mode="participant"
        evidenceItems={evidenceItems}
        scoreItems={scoreItems}
        fileNames={fileNames}
        setFileNames={setFileNames}
        onSaveEvidence={handleSaveEvidence}
        onUploadEvidence={handleUploadEvidence}
        onDeleteEvidence={handleDeleteEvidence}
        uploadingId={uploadingId}
      />
      <div className="footer-actions">
        <button onClick={() => navigate(`/peserta/assessment/${assessment.id}`)}>Buka Detail</button>
        <button onClick={handleSubmit} disabled={!canSubmit}>
          {assessment.status === 'revision_requested' ? 'Submit Ulang' : 'Submit ke Asesor'}
        </button>
        <span>Status: {statusLabel(assessment.status)}</span>
      </div>
    </section>
  )
}

function ParticipantSummary() {
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [profile, setProfile] = useState<{ profileCode?: string; organization?: Organization } | null>(null)
  const [summary, setSummary] = useState<ScoreSummary>(emptySummary)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadSummary() {
      setLoading(true)
      setError('')
      try {
        const [profileRes, assessmentRes] = await Promise.all([
          api.get('/participant/profile'),
          api.get('/participant/assessment'),
        ])
        const profileData = profileRes.data.data as { organization: Organization; isComplete: boolean; profileCode?: string }
        const assessmentData: Assessment = assessmentRes.data.data
        setProfile({ profileCode: profileData.profileCode, organization: profileData.organization })
        setAssessment(assessmentData)
        const summaryRes = await api.get(`/assessments/${assessmentData.id}/summary`)
        setSummary(summaryRes.data.data ?? emptySummary)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    loadSummary()
  }, [])

  if (loading) return <EmptyPanel title="Loading ringkasan" message="Mengambil profil, bobot target, dan summary skor." />
  if (error) return <EmptyPanel title="Gagal memuat ringkasan" message={error} />
  if (!assessment || !profile) return <EmptyPanel title="Ringkasan tidak tersedia" message="Data assessment peserta belum lengkap." />

  const target = summary.profileTarget
  const awardLabelText = summary.effectiveAwardLevel ?? summary.recommendedAwardLevel ?? 'not_eligible'

  return (
    <section className="panel panel-wide" id="participant-summary">
      <PanelTitle kicker="Peserta Workflow" title="Ringkasan ESG Score" icon={<BarChart3 size={22} />} />
      <div className="summary-grid">
        <article className="summary-card">
          <span>Kode Profil</span>
          <strong>{summary.profileCode ?? profile.profileCode ?? 'BELUM DIPILIH'}</strong>
          <p>{profile.organization?.name}</p>
        </article>
        <article className="summary-card">
          <span>Grand Score</span>
          <strong>{summary.percentage.toFixed(1)}</strong>
          <p>Skala 0-100</p>
        </article>
        <article className="summary-card">
          <span>Eligibility</span>
          <strong>{summary.eligibleForAward === false ? 'Locked' : 'Eligible'}</strong>
          <p>{summary.eligibilityNote ?? 'Based on current score.'}</p>
        </article>
      </div>

      <div className="summary-layout">
        <div className="summary-table-card">
          <h3>Bobot Target per Pilar</h3>
          <table className="data-table summary-table">
            <thead>
              <tr>
                <th>Pilar</th>
                <th>Target</th>
                <th>Skor Saat Ini</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Environmental</td>
                <td>{target ? `${(target.environmental * 100).toFixed(0)}%` : '-'}</td>
                <td>{summary.environmental.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Social</td>
                <td>{target ? `${(target.social * 100).toFixed(0)}%` : '-'}</td>
                <td>{summary.social.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Governance</td>
                <td>{target ? `${(target.governance * 100).toFixed(0)}%` : '-'}</td>
                <td>{summary.governance.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="summary-table-card">
          <h3>Award Level</h3>
          <div className="summary-award">
            <strong>{awardLabel(awardLabelText as AwardLevel)}</strong>
            <p>Recommended: {awardLabel(summary.recommendedAwardLevel ?? 'not_eligible')}</p>
            <p>Assessment: {assessment.status.replaceAll('_', ' ')}</p>
          </div>
          <div className="summary-note">
            <span>Red Flag Aktif</span>
            <strong>{summary.activeRedFlags ?? 0}</strong>
          </div>
        </div>
      </div>
    </section>
  )
}

function AssessorWorkspace() {
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState<ApiAssignment[]>([])
  const [activeId, setActiveId] = useState('')
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([])
  const [scoreItems, setScoreItems] = useState<ScoreItem[]>([])
  const [summary, setSummary] = useState<ScoreSummary>(emptySummary)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Filter the checklist to the reviewed participant's profile so the assessor
  // only scores items that are applicable to that license/service type.
  const { checklist, checklistError } = useChecklist(summary.profileCode)

  const activeAssignment = assignments.find((item) => item.assessmentId === activeId) ?? assignments[0]

  async function loadAssignments() {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/assessor/assignments')
      const rows: ApiAssignment[] = res.data.data ?? []
      setAssignments(rows)
      const nextId = activeId || rows[0]?.assessmentId || ''
      setActiveId(nextId)
      if (nextId) await loadAssessmentData(nextId)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function loadAssessmentData(assessmentId: string) {
    const [evidenceRes, scoreRes, summaryRes] = await Promise.all([
      api.get(`/assessments/${assessmentId}/evidence`),
      api.get(`/assessments/${assessmentId}/scores`),
      api.get(`/assessments/${assessmentId}/summary`),
    ])
    setEvidenceItems(evidenceRes.data.data ?? [])
    setScoreItems(scoreRes.data.data ?? [])
    setSummary(summaryRes.data.data ?? emptySummary)
  }

  useEffect(() => {
    loadAssignments()
  }, [])

  async function handleSelect(assessmentId: string) {
    setActiveId(assessmentId)
    try {
      await loadAssessmentData(assessmentId)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleSaveScore(item: ChecklistItem, score: ScoreItem['score'], note: string) {
    if (!activeAssignment) return
    try {
      await api.post(`/assessments/${activeAssignment.assessmentId}/scores`, { checklistItemId: item.id, score, note })
      await loadAssessmentData(activeAssignment.assessmentId)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleSubmitToJury() {
    if (!activeAssignment) return
    try {
      await api.patch(`/assessments/${activeAssignment.assessmentId}/submit-to-jury`)
      await loadAssignments()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleRequestRevision() {
    if (!activeAssignment) return
    const note = window.prompt('Catatan revisi untuk peserta (jelaskan apa yang harus diperbaiki):')
    if (note === null) return
    if (!note.trim()) {
      setError('Catatan revisi wajib diisi.')
      return
    }
    setError('')
    try {
      await api.patch(`/assessments/${activeAssignment.assessmentId}/request-revision`, { note: note.trim() })
      await loadAssignments()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  if (loading) return <EmptyPanel title="Loading assignment" message="Mengambil daftar peserta dari backend." />
  if (error || checklistError) return <EmptyPanel title="Gagal memuat assignment" message={error || checklistError} />
  if (assignments.length === 0) return <EmptyPanel title="Belum ada peserta assigned" message="Admin perlu assign peserta ke asesor ini terlebih dahulu." />

  const assessment: Assessment = {
    id: activeAssignment.assessmentId,
    organizationId: activeAssignment.participantId,
    title: 'ESG Mining Award Assessment 2026',
    status: activeAssignment.assessmentStatus,
    periodYear: 2026,
    createdAt: activeAssignment.assignedAt,
    updatedAt: activeAssignment.assignedAt,
  }

  return (
    <section className="panel panel-wide" id="assessor-assignments">
      <PanelTitle kicker="Asesor Workflow" title="Peserta Saya & Scoring" icon={<ClipboardCheck size={22} />} />
      <div className="selector-row">
        <label>
          Peserta
          <select value={activeAssignment.assessmentId} onChange={(e) => handleSelect(e.target.value)}>
            {assignments.map((assignment) => <option key={assignment.assignmentId} value={assignment.assessmentId}>{assignment.participantName}</option>)}
          </select>
        </label>
        <strong>{activeAssignment.participantName}</strong>
        <span className="status-pill">{statusLabel(activeAssignment.assessmentStatus)}</span>
      </div>
      <ScoreStrip score={summary} />
      <ChecklistTable
        checklist={checklist}
        assessment={assessment}
        mode="assessor"
        evidenceItems={evidenceItems}
        scoreItems={scoreItems}
        onSaveScore={handleSaveScore}
      />
      <div className="footer-actions">
        <button onClick={() => navigate(`/asesor/assessment/${activeAssignment.assessmentId}`)}>Buka Detail</button>
        <button className="btn-warning" onClick={handleRequestRevision} disabled={activeAssignment.assessmentStatus === 'finalized'}>Minta Revisi</button>
        <button onClick={handleSubmitToJury} disabled={scoreItems.length < checklist.length}>Submit ke Juri</button>
        <span>Isi skor untuk semua item sebelum submit, atau minta revisi ke peserta.</span>
      </div>
    </section>
  )
}

function JuryWorkspace() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<JuryAssessment[]>([])
  const [awards, setAwards] = useState<Record<string, AwardLevel>>({})
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadRows() {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/jury/assessments')
      const nextRows: JuryAssessment[] = res.data.data ?? []
      setRows(nextRows)
      setSelectedAssessmentId((current) => current || nextRows[0]?.assessmentId || '')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRows()
  }, [])

  async function handleDecision(row: JuryAssessment) {
    const selected = row.eligibleForAward === false
      ? 'not_eligible'
      : awards[row.assessmentId] ?? row.awardLevel ?? row.effectiveAwardLevel ?? row.recommendedAwardLevel ?? recommendAward(row.percentage)
    try {
      await api.post(`/assessments/${row.assessmentId}/jury-decision`, {
        awardLevel: selected,
        note: row.decisionNote ?? 'Approved by jury.',
      })
      await loadRows()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  if (loading) return <EmptyPanel title="Loading juri review" message="Mengambil assessment siap finalisasi." />
  if (error) return <EmptyPanel title="Gagal memuat juri review" message={error} />
  if (rows.length === 0) return <EmptyPanel title="Belum ada assessment siap juri" message="Asesor perlu submit hasil review ke juri terlebih dahulu." />

  const selectedRow = rows.find((item) => item.assessmentId === selectedAssessmentId) ?? rows[0]
  const selectedAward = selectedRow?.eligibleForAward === false
    ? 'not_eligible'
    : awards[selectedRow.assessmentId] ?? selectedRow?.awardLevel ?? selectedRow?.effectiveAwardLevel ?? selectedRow?.recommendedAwardLevel ?? recommendAward(selectedRow?.percentage ?? 0)

  return (
    <section className="panel panel-wide" id="jury-ranking">
      <PanelTitle kicker="Juri Workflow" title="Review Final & Award Decision" icon={<Award size={22} />} />
      <div className="summary-grid">
        <article className="summary-card">
          <span>Assessment Aktif</span>
          <strong>{selectedRow.participantName}</strong>
          <p>{statusLabel(selectedRow.assessmentStatus)} • {formatPct(selectedRow.percentage)} • {selectedRow.activeRedFlags ?? 0} red flag</p>
        </article>
        <article className="summary-card">
          <span>Award Level</span>
          <strong>{awardLabel(selectedAward)}</strong>
          <p>Rekomendasi: {awardLabel(selectedRow.recommendedAwardLevel ?? recommendAward(selectedRow.percentage))}</p>
        </article>
        <article className="summary-card">
          <span>Eligibility</span>
          <strong>{selectedRow.eligibleForAward === false ? 'Locked' : 'Eligible'}</strong>
          <p>{selectedRow.eligibilityNote ?? 'Eligible by score.'}</p>
        </article>
      </div>

      <div className="summary-layout">
        <div className="summary-table-card">
          <h3>Red Flag Policy</h3>
          <table className="data-table summary-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Kondisi</th>
                <th>Status Asesor</th>
                <th>Konsekuensi Otomatis</th>
              </tr>
            </thead>
            <tbody>
              {redFlagPolicies.map((item) => (
                <tr key={item.no}>
                  <td>{item.no}</td>
                  <td>{item.condition}</td>
                  <td><strong>{item.status}</strong></td>
                  <td><small>{item.consequence}</small></td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ marginTop: '18px' }}>Diskualifikasi Total</h3>
          <div className="summary-note" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
            {redFlagDisqualifiers.map((item) => <small key={item}>{item}</small>)}
          </div>
        </div>

        <div className="summary-table-card">
          <h3>Ranking Juri</h3>
          <div className="table-wrap">
            <table className="data-table jury-rank-table">
              <thead>
                <tr>
                  <th>Ranking</th>
                  <th>Peserta</th>
                  <th>Skor</th>
                  <th>Keputusan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const recommended = row.recommendedAwardLevel ?? recommendAward(row.percentage)
                  const effective = row.effectiveAwardLevel ?? (row.eligibleForAward === false ? 'not_eligible' : recommended)
                  const selected = row.eligibleForAward === false ? 'not_eligible' : awards[row.assessmentId] ?? row.awardLevel ?? effective
                  const active = row.assessmentId === selectedAssessmentId
                  return (
                    <tr key={row.assessmentId} className={active ? 'row-selected' : ''} onClick={() => setSelectedAssessmentId(row.assessmentId)}>
                      <td><strong>{index + 1}</strong></td>
                      <td>
                        <strong>{row.participantName}</strong>
                        <small>{row.activeRedFlags ? `${row.activeRedFlags} red flag aktif` : 'Tanpa red flag aktif'}</small>
                      </td>
                      <td>
                        <strong>{formatPct(row.percentage)}</strong>
                        <small>Rekomendasi: {awardLabel(recommended)}</small>
                      </td>
                      <td>
                        <select
                          value={selected}
                          onChange={(e) => setAwards((state) => ({ ...state, [row.assessmentId]: e.target.value as AwardLevel }))}
                          disabled={row.eligibleForAward === false}
                        >
                          {awardLevels.map((level) => <option key={level} value={level}>{awardLabel(level)}</option>)}
                        </select>
                        <div className="action-row" style={{ marginTop: '8px' }}>
                          <button onClick={() => navigate(`/juri/assessment/${row.assessmentId}`)}>Detail</button>
                          <button onClick={() => handleDecision(row)}>Finalisasi</button>
                        </div>
                        {row.awardLevel && <small>Final: {awardLabel(row.awardLevel)}</small>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}

const pillarOrder = ['environmental', 'social', 'governance'] as const
const pillarMeta: Record<string, { label: string; accent: string }> = {
  environmental: { label: 'Environmental', accent: '#2f9e6f' },
  social: { label: 'Social', accent: '#2f7ea6' },
  governance: { label: 'Governance', accent: '#a6772f' },
}

function ChecklistTable(props: {
  checklist: ChecklistItem[]
  assessment?: Assessment
  mode: 'participant' | 'assessor'
  evidenceItems: EvidenceItem[]
  scoreItems: ScoreItem[]
  fileNames?: Record<string, string>
  setFileNames?: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onSaveEvidence?: (item: ChecklistItem, fileName: string) => void
  onUploadEvidence?: (item: ChecklistItem, file: File) => void
  onDeleteEvidence?: (evidenceId: string) => void
  uploadingId?: string
  onSaveScore?: (item: ChecklistItem, score: ScoreItem['score'], note: string) => void
}) {
  const [scores, setScores] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})

  // Group items by pillar, keeping the fixed E/S/G order.
  const groups = useMemo(() => {
    const byPillar = new Map<string, ChecklistItem[]>()
    for (const item of props.checklist) {
      const key = (item.pillar || '').toLowerCase()
      if (!byPillar.has(key)) byPillar.set(key, [])
      byPillar.get(key)!.push(item)
    }
    const ordered: { pillar: string; items: ChecklistItem[] }[] = pillarOrder
      .filter((p) => byPillar.has(p))
      .map((p) => ({ pillar: p as string, items: byPillar.get(p)! }))
    // Include any unknown pillars at the end (defensive).
    for (const [key, items] of byPillar) {
      if (!pillarOrder.includes(key as (typeof pillarOrder)[number])) ordered.push({ pillar: key, items })
    }
    return ordered
  }, [props.checklist])

  function toggle(pillar: string) {
    setCollapsed((state) => ({ ...state, [pillar]: !state[pillar] }))
  }

  function renderRow(item: ChecklistItem) {
    const evidences = evidencesFor(props.evidenceItems, item.id)
    const score = scoreFor(props.scoreItems, item.id)
    const isFull = evidences.length >= MAX_EVIDENCE_PER_ITEM
    const uploading = props.uploadingId === item.id
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
                  {props.mode === 'participant' && (
                    <button type="button" className="evidence-delete" title="Hapus dokumen" onClick={() => props.onDeleteEvidence?.(ev.id)}>
                      <X size={13} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <span className="evidence-empty">Belum upload</span>
          )}
          {props.mode === 'participant' && (
            <div className="evidence-upload-cell">
              <input
                ref={(el) => { fileInputs.current[item.id] = el }}
                type="file"
                className="evidence-file-hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) props.onUploadEvidence?.(item, file)
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
                {uploading ? 'Mengunggah...' : isFull ? 'Maks 3 dokumen' : evidences.length > 0 ? `Tambah Dokumen (${evidences.length}/${MAX_EVIDENCE_PER_ITEM})` : 'Pilih Dokumen'}
              </button>
            </div>
          )}
        </td>
        <td>
          {props.mode === 'assessor' ? (
            <select value={scores[item.id] ?? score?.score ?? 0} onChange={(e) => setScores((state) => ({ ...state, [item.id]: Number(e.target.value) }))}>
              {[0, 1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          ) : (
            <strong>{score ? `${score.score} (${score.weightedScore.toFixed(2)})` : '-'}</strong>
          )}
        </td>
        <td>
          {props.mode === 'participant' ? (
            <span className="evidence-status-hint">
              {evidences.length > 0 ? <span className="evidence-status-ok"><CheckCircle2 size={14} /> {evidences.length} dokumen</span> : 'Pilih dokumen untuk mengunggah'}
            </span>
          ) : (
            <div className="score-action">
              <textarea rows={3} value={notes[item.id] ?? score?.note ?? ''} onChange={(e) => setNotes((state) => ({ ...state, [item.id]: e.target.value }))} placeholder="Catatan asesor" />
              <button onClick={() => props.onSaveScore?.(item, (scores[item.id] ?? score?.score ?? 0) as ScoreItem['score'], notes[item.id] ?? score?.note ?? '')}>Simpan Skor</button>
            </div>
          )}
        </td>
      </tr>
    )
  }

  return (
    <div className="checklist-groups">
      {groups.map(({ pillar, items }) => {
        const meta = pillarMeta[pillar] ?? { label: pillar, accent: '#5b7178' }
        const done = items.filter((item) =>
          props.mode === 'participant' ? !!evidenceFor(props.evidenceItems, item.id) : !!scoreFor(props.scoreItems, item.id),
        ).length
        const isCollapsed = collapsed[pillar] ?? false
        const complete = done === items.length && items.length > 0
        return (
          <div className="checklist-group" key={pillar}>
            <button
              type="button"
              className="checklist-group-head"
              style={{ borderLeftColor: meta.accent }}
              onClick={() => toggle(pillar)}
              aria-expanded={!isCollapsed}
            >
              <span className="checklist-group-caret" data-open={!isCollapsed}>▸</span>
              <span className="checklist-group-title" style={{ color: meta.accent }}>{meta.label}</span>
              <span className={`checklist-group-progress${complete ? ' is-complete' : ''}`}>
                {complete && <CheckCircle2 size={14} />}
                {done}/{items.length} {props.mode === 'participant' ? 'terunggah' : 'dinilai'}
              </span>
            </button>
            {!isCollapsed && (
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
                    {items.map(renderRow)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const workflowSteps = [
  { title: 'Registrasi Peserta', desc: 'Daftar akun & lengkapi profil perusahaan.', who: 'Peserta' },
  { title: 'Upload Evidence', desc: 'Unggah dokumen bukti tiap item checklist, lalu submit.', who: 'Peserta' },
  { title: 'Verifikasi & Assign Asesor', desc: 'Admin memverifikasi data lalu menugaskan asesor.', who: 'Admin' },
  { title: 'Penilaian Asesor', desc: 'Asesor menilai maturity 0–5 pada setiap item.', who: 'Asesor' },
  { title: 'Finalisasi Award', desc: 'Juri menetapkan keputusan penghargaan akhir.', who: 'Juri' },
] as const

const workflowRoleColor: Record<string, string> = {
  Peserta: '#0e7c66',
  Admin: '#2f7ea6',
  Asesor: '#a6772f',
  Juri: '#8145b5',
}

// Maps the participant's assessment status to the index of the currently active
// workflow step (steps before it are considered done).
function participantActiveStep(status: string): number {
  switch (status) {
    case 'draft': return 1 // registered, now uploading evidence
    case 'revision_requested': return 1 // sent back to participant for fixes
    case 'submitted': return 2 // waiting admin verify/assign
    case 'in_review': return 3 // assessor scoring
    case 'jury_review': return 4 // jury
    case 'finalized': return 5 // all done
    default: return 0
  }
}

function WorkflowCard({ role }: { role: Role }) {
  const [activeStep, setActiveStep] = useState<number | null>(null)

  useEffect(() => {
    if (role !== 'peserta') return
    api.get('/participant/assessment')
      .then((res) => setActiveStep(participantActiveStep(res.data.data?.status ?? '')))
      .catch(() => setActiveStep(null))
  }, [role])

  return (
    <article className="panel" id="workflow">
      <PanelTitle kicker="Alur Penilaian" title="Tahapan ESG Award" icon={<ClipboardCheck size={22} />} />
      <ol className="workflow-timeline">
        {workflowSteps.map((step, index) => {
          const state = activeStep === null
            ? 'plain'
            : index < activeStep ? 'done' : index === activeStep ? 'active' : 'upcoming'
          return (
            <li key={step.title} className={`workflow-step is-${state}`}>
              <div className="workflow-marker">
                {state === 'done' ? <CheckCircle2 size={16} /> : <span>{index + 1}</span>}
              </div>
              <div className="workflow-body">
                <div className="workflow-step-head">
                  <strong>{step.title}</strong>
                  <span className="workflow-role" style={{ color: workflowRoleColor[step.who], borderColor: workflowRoleColor[step.who] }}>{step.who}</span>
                </div>
                <p>{step.desc}</p>
              </div>
            </li>
          )
        })}
      </ol>
      {activeStep !== null && activeStep >= workflowSteps.length && (
        <p className="workflow-done-note"><CheckCircle2 size={14} /> Penilaian sudah selesai difinalisasi.</p>
      )}
    </article>
  )
}

interface ScoreModelData {
  profiles: ProfileWeightTarget[]
  maturityMin: number
  maturityMax: number
}

function ScoreModelCard({ role }: { role: Role }) {
  const isAdmin = role === 'admin'
  const [model, setModel] = useState<ScoreModelData | null>(null)
  const [selected, setSelected] = useState('')
  const [draft, setDraft] = useState({ environmental: 0, social: 0, governance: 0 })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadModel(keepSelection?: string) {
    try {
      const res = await api.get('/score-model')
      const data: ScoreModelData = res.data.data
      setModel(data)
      const codes = data.profiles.map((p) => p.profileCode)
      const next = keepSelection && codes.includes(keepSelection) ? keepSelection : (codes.includes('IUP') ? 'IUP' : codes[0] ?? '')
      setSelected(next)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  useEffect(() => { loadModel() }, [])

  const current = useMemo(
    () => model?.profiles.find((p) => p.profileCode === selected) ?? null,
    [model, selected],
  )

  // Sync the editable draft (in percent) whenever the selected profile changes.
  useEffect(() => {
    if (current) {
      setDraft({
        environmental: Math.round(current.environmental * 100),
        social: Math.round(current.social * 100),
        governance: Math.round(current.governance * 100),
      })
      setMessage('')
      setError('')
    }
  }, [current])

  const total = draft.environmental + draft.social + draft.governance

  async function handleSave() {
    if (!current) return
    if (total !== 100) {
      setError(`Total harus 100% (sekarang ${total}%).`)
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await api.patch(`/admin/profile-weights/${current.profileCode}`, {
        environmental: draft.environmental / 100,
        social: draft.social / 100,
        governance: draft.governance / 100,
        rationale: current.rationale,
      })
      setMessage('Bobot tersimpan.')
      await loadModel(current.profileCode)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const rows: { key: 'environmental' | 'social' | 'governance'; label: string }[] = [
    { key: 'environmental', label: 'Environmental' },
    { key: 'social', label: 'Social' },
    { key: 'governance', label: 'Governance' },
  ]

  return (
    <article className="panel" id="score-model">
      <PanelTitle kicker="Score Model" title="Bobot ESG per Profil" icon={<BarChart3 size={22} />} />

      <label className="score-model-select">
        <span>Profil</span>
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {model?.profiles.map((p) => <option key={p.profileCode} value={p.profileCode}>{p.profileCode}</option>)}
        </select>
      </label>

      <div className="score-list">
        {rows.map((row) => (
          <div key={row.key}>
            <span>{row.label}</span>
            {isAdmin ? (
              <span className="score-model-input">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={draft[row.key]}
                  onChange={(e) => setDraft((s) => ({ ...s, [row.key]: Number(e.target.value) }))}
                />
                <em>%</em>
              </span>
            ) : (
              <strong>{Math.round((current?.[row.key] ?? 0) * 100)}%</strong>
            )}
          </div>
        ))}
        <div className={`score-model-total${isAdmin && total !== 100 ? ' is-invalid' : ''}`}>
          <span>Total</span><strong>{isAdmin ? `${total}%` : '100%'}</strong>
        </div>
        <div><span>Skala Maturity</span><strong>{model ? `${model.maturityMin}-${model.maturityMax}` : '0-5'}</strong></div>
      </div>

      {current?.rationale && <p className="score-model-rationale">{current.rationale}</p>}

      {isAdmin && (
        <div className="score-model-actions">
          <button type="button" onClick={handleSave} disabled={saving || total !== 100}>
            {saving ? 'Menyimpan...' : 'Simpan Bobot'}
          </button>
          {message && <span className="score-model-ok">{message}</span>}
          {error && <span className="score-model-err">{error}</span>}
        </div>
      )}
      {!isAdmin && error && <p className="score-model-err">{error}</p>}
    </article>
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

function PanelTitle({ kicker, title, icon }: { kicker: string; title: string; icon: React.ReactNode }) {
  return (
    <div className="panel-head">
      <div><span className="section-kicker">{kicker}</span><h2>{title}</h2></div>
      {icon}
    </div>
  )
}

function EmptyPanel({ title, message }: { title: string; message: string }) {
  return (
    <section className="panel panel-wide empty-panel">
      <CheckCircle2 size={28} />
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  )
}

const CHART_COLORS = ['#0e7c66', '#2f7ea6', '#c1863b', '#2aa198', '#e07b20', '#2f9e6f', '#d0455f']

function countBy<T>(rows: T[], keyFn: (t: T) => string): { name: string; value: number }[] {
  const map = new Map<string, number>()
  for (const r of rows) {
    const k = keyFn(r) || '-'
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return Array.from(map, ([name, value]) => ({ name, value }))
}

function DashStat({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <article className="metric-card metric-card--accent">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{sub}</p>
    </article>
  )
}

function DashPie({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  const hasData = data.some((d) => d.value > 0)
  return (
    <article className="panel dashboard-chart-card">
      <PanelTitle kicker="Distribusi" title={title} icon={<BarChart3 size={20} />} />
      {hasData ? (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => `${e.name}: ${e.value}`}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      ) : <p className="panel-muted">Belum ada data.</p>}
    </article>
  )
}

function DashBar({ title, data, dataKey = 'value', color = '#0e7c66', multicolor = false }: { title: string; data: Record<string, unknown>[]; dataKey?: string; color?: string; multicolor?: boolean }) {
  return (
    <article className="panel dashboard-chart-card">
      <PanelTitle kicker="Grafik" title={title} icon={<BarChart3 size={20} />} />
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f3" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6d868d' }} interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11, fill: '#6d868d' }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]}>
              {multicolor && data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : <p className="panel-muted">Belum ada data.</p>}
    </article>
  )
}

const DASH_PAGE_SIZE = 30

function TablePagination({ page, pageCount, onChange, total }: { page: number; pageCount: number; onChange: (p: number) => void; total: number }) {
  if (pageCount <= 1) return <div className="table-pagination"><span>{total} baris</span></div>
  return (
    <div className="table-pagination">
      <span>{total} baris · Halaman {page + 1}/{pageCount}</span>
      <div className="table-pagination-controls">
        <button type="button" disabled={page === 0} onClick={() => onChange(page - 1)}>‹ Sebelumnya</button>
        <button type="button" disabled={page >= pageCount - 1} onClick={() => onChange(page + 1)}>Berikutnya ›</button>
      </div>
    </div>
  )
}

function AssignedParticipantsTable({ rows }: { rows: ApiAssignment[] }) {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const statusOptions = Array.from(new Set(rows.map((r) => r.assessmentStatus)))
  const filtered = rows
    .filter((r) => r.participantName.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((r) => statusFilter === 'all' || r.assessmentStatus === statusFilter)

  const pageCount = Math.max(1, Math.ceil(filtered.length / DASH_PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(current * DASH_PAGE_SIZE, current * DASH_PAGE_SIZE + DASH_PAGE_SIZE)

  function goToWorksheet(assessmentId: string) {
    navigate(`/asesor/assessment/${assessmentId}#checklist`)
  }

  return (
    <article className="panel panel-wide">
      <PanelTitle kicker="Peserta" title="Daftar Peserta Ditugaskan" icon={<ClipboardList size={20} />} />

      <div className="assignee-toolbar">
        <input
          className="assignee-search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          placeholder="Cari nama peserta..."
        />
        <select
          className="assignee-status-select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
        >
          <option value="all">Semua Status</option>
          {statusOptions.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Nama Peserta</th>
              <th>Kode Profil</th>
              <th>Status</th>
              <th>Progress Penilaian</th>
              <th>Ditugaskan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={7} className="panel-muted" style={{ textAlign: 'center', padding: '20px' }}>Tidak ada peserta yang cocok.</td></tr>
            ) : pageRows.map((r, i) => {
              const total = r.totalItems ?? 0
              const scored = r.scoredCount ?? 0
              const pct = total > 0 ? Math.round((scored / total) * 100) : 0
              return (
                <tr key={r.assignmentId}>
                  <td>{current * DASH_PAGE_SIZE + i + 1}</td>
                  <td><strong>{r.participantName}</strong></td>
                  <td>{r.profileCode || '-'}</td>
                  <td>
                    <button
                      type="button"
                      className={`assignee-status status-${r.assessmentStatus} is-clickable`}
                      title="Buka kertas kerja checklist"
                      onClick={() => goToWorksheet(r.assessmentId)}
                    >
                      {statusLabel(r.assessmentStatus)}
                    </button>
                  </td>
                  <td>
                    <div className="assignee-progress">
                      <div className="assignee-progress-bar"><span style={{ width: `${pct}%` }} /></div>
                      <small>{scored}/{total} ({pct}%)</small>
                    </div>
                  </td>
                  <td>{new Date(r.assignedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td>
                    <button type="button" className="worksheet-link" onClick={() => goToWorksheet(r.assessmentId)}>Nilai →</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <TablePagination page={current} pageCount={pageCount} onChange={setPage} total={filtered.length} />
    </article>
  )
}

function JuryAssessmentsTable({ rows }: { rows: JuryAssessment[] }) {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const statusOptions = Array.from(new Set(rows.map((r) => r.assessmentStatus)))
  const filtered = rows
    .filter((r) => r.participantName.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((r) => statusFilter === 'all' || r.assessmentStatus === statusFilter)

  const pageCount = Math.max(1, Math.ceil(filtered.length / DASH_PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(current * DASH_PAGE_SIZE, current * DASH_PAGE_SIZE + DASH_PAGE_SIZE)

  function goToWorksheet(assessmentId: string) {
    navigate(`/juri/assessment/${assessmentId}#status`)
  }

  return (
    <article className="panel panel-wide">
      <PanelTitle kicker="Assessment" title="Daftar Assessment untuk Finalisasi" icon={<Award size={20} />} />

      <div className="assignee-toolbar">
        <input
          className="assignee-search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          placeholder="Cari nama peserta..."
        />
        <select
          className="assignee-status-select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
        >
          <option value="all">Semua Status</option>
          {statusOptions.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Nama Peserta</th>
              <th>Grand Score</th>
              <th>Award Level</th>
              <th>Red Flag</th>
              <th>Eligible</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={8} className="panel-muted" style={{ textAlign: 'center', padding: '20px' }}>Tidak ada assessment yang cocok.</td></tr>
            ) : pageRows.map((r, i) => {
              const award = (r.awardLevel ?? r.effectiveAwardLevel ?? r.recommendedAwardLevel) as AwardLevel | undefined
              const flags = r.activeRedFlags ?? 0
              return (
                <tr key={r.assessmentId}>
                  <td>{current * DASH_PAGE_SIZE + i + 1}</td>
                  <td><strong>{r.participantName}</strong></td>
                  <td><strong>{formatPct(r.percentage ?? 0)}</strong></td>
                  <td>{award ? awardLabel(award) : '-'}</td>
                  <td>{flags > 0 ? <span className="redflag-pill">{flags}</span> : <span className="panel-muted">0</span>}</td>
                  <td>{r.eligibleForAward === false ? <span className="panel-muted">Locked</span> : <span className="eligible-pill">Eligible</span>}</td>
                  <td>
                    <button
                      type="button"
                      className={`assignee-status status-${r.assessmentStatus} is-clickable`}
                      title="Buka kertas kerja keputusan juri"
                      onClick={() => goToWorksheet(r.assessmentId)}
                    >
                      {statusLabel(r.assessmentStatus)}
                    </button>
                  </td>
                  <td>
                    <button type="button" className="worksheet-link" onClick={() => goToWorksheet(r.assessmentId)}>
                      {r.assessmentStatus === 'finalized' ? 'Lihat →' : 'Putuskan →'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <TablePagination page={current} pageCount={pageCount} onChange={setPage} total={filtered.length} />
    </article>
  )
}

function AdminParticipantsTable({ rows }: { rows: ApiParticipant[] }) {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const statusOptions = Array.from(new Set(rows.map((r) => r.assessmentStatus || r.status).filter(Boolean))) as string[]
  const filtered = rows
    .filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((r) => statusFilter === 'all' || (r.assessmentStatus || r.status) === statusFilter)

  const pageCount = Math.max(1, Math.ceil(filtered.length / DASH_PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(current * DASH_PAGE_SIZE, current * DASH_PAGE_SIZE + DASH_PAGE_SIZE)

  function goToDetail(assessmentId?: string) {
    if (assessmentId) navigate(`/admin/assessment/${assessmentId}#status`)
  }

  return (
    <article className="panel panel-wide">
      <PanelTitle kicker="Peserta" title="Daftar Semua Peserta" icon={<Users size={20} />} />

      <div className="assignee-toolbar">
        <input
          className="assignee-search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          placeholder="Cari nama peserta..."
        />
        <select
          className="assignee-status-select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
        >
          <option value="all">Semua Status</option>
          {statusOptions.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Nama Peserta</th>
              <th>Email</th>
              <th>Status Assessment</th>
              <th>Asesor</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={6} className="panel-muted" style={{ textAlign: 'center', padding: '20px' }}>Tidak ada peserta yang cocok.</td></tr>
            ) : pageRows.map((r, i) => (
              <tr key={r.id}>
                <td>{current * DASH_PAGE_SIZE + i + 1}</td>
                <td><strong>{r.name}</strong></td>
                <td>{r.email || '-'}</td>
                <td>
                  {r.assessmentStatus ? (
                    <button
                      type="button"
                      className={`assignee-status status-${r.assessmentStatus} is-clickable`}
                      title="Buka detail assessment"
                      onClick={() => goToDetail(r.assessmentId)}
                    >
                      {statusLabel(r.assessmentStatus)}
                    </button>
                  ) : (
                    <span className="assignee-status">{statusLabel(r.status)}</span>
                  )}
                </td>
                <td>{r.assessorName || <span className="panel-muted">Belum di-assign</span>}</td>
                <td>
                  {r.assessmentId
                    ? <button type="button" className="worksheet-link" onClick={() => goToDetail(r.assessmentId)}>Detail →</button>
                    : <span className="panel-muted">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination page={current} pageCount={pageCount} onChange={setPage} total={filtered.length} />
    </article>
  )
}

function DashboardOverview({ role }: { role: Role }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [asesorRows, setAsesorRows] = useState<ApiAssignment[]>([])
  const [participants, setParticipants] = useState<ApiParticipant[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [juryRows, setJuryRows] = useState<JuryAssessment[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        if (role === 'asesor') {
          const res = await api.get('/assessor/assignments')
          setAsesorRows(res.data.data ?? [])
        } else if (role === 'admin') {
          const [p, u] = await Promise.all([api.get('/admin/participants'), api.get('/admin/users')])
          setParticipants(p.data.data ?? [])
          setUsers(u.data.data ?? [])
        } else if (role === 'juri') {
          const res = await api.get('/jury/assessments')
          setJuryRows(res.data.data ?? [])
        }
      } catch (e) {
        setError(getErrorMessage(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [role])

  if (loading) return <EmptyPanel title="Memuat dashboard" message="Mengambil data ringkasan dan statistik..." />
  if (error) return <EmptyPanel title="Gagal memuat dashboard" message={error} />

  // ---------- ASESOR ----------
  if (role === 'asesor') {
    const total = asesorRows.length
    const todo = asesorRows.filter((r) => r.assessmentStatus === 'submitted' || r.assessmentStatus === 'in_review').length
    const done = asesorRows.filter((r) => r.assessmentStatus === 'jury_review' || r.assessmentStatus === 'finalized').length
    const avgProgress = total > 0
      ? Math.round(asesorRows.reduce((s, r) => s + (r.totalItems ? (r.scoredCount ?? 0) / r.totalItems : 0), 0) / total * 100)
      : 0
    const statusData = countBy(asesorRows, (r) => statusLabel(r.assessmentStatus))
    const progressData = asesorRows.map((r) => ({
      name: r.participantName.length > 16 ? r.participantName.slice(0, 16) + '…' : r.participantName,
      value: r.totalItems ? Math.round((r.scoredCount ?? 0) / r.totalItems * 100) : 0,
    }))
    return (
      <div className="dashboard-overview">
        <section className="metric-grid metric-grid--4">
          <DashStat label="Total Peserta" value={total} sub="Assignment dari admin" />
          <DashStat label="Perlu Dinilai" value={todo} sub="Submitted / in review" />
          <DashStat label="Selesai" value={done} sub="Sudah dikirim ke juri" />
          <DashStat label="Rata-rata Progress" value={`${avgProgress}%`} sub="Item dinilai rata-rata" />
        </section>
        <div className="dashboard-charts">
          <DashPie title="Peserta per Status" data={statusData} />
          <DashBar title="Progress Penilaian per Peserta (%)" data={progressData} color="#2f7ea6" />
        </div>
        <AssignedParticipantsTable rows={asesorRows} />
      </div>
    )
  }

  // ---------- ADMIN ----------
  if (role === 'admin') {
    const total = participants.length
    const assigned = participants.filter((p) => p.assessorId).length
    const asesorCount = users.filter((u) => u.role === 'asesor').length
    const juriCount = users.filter((u) => u.role === 'juri').length
    const statusData = countBy(participants, (p) => statusLabel(p.assessmentStatus || p.status))
    const roleData = countBy(users, (u) => u.role).map((d) => ({ name: statusLabel(d.name), value: d.value }))
    return (
      <div className="dashboard-overview">
        <section className="metric-grid metric-grid--4">
          <DashStat label="Total Peserta" value={total} sub="Terdaftar di platform" />
          <DashStat label="Sudah Di-assign" value={assigned} sub="Punya asesor" />
          <DashStat label="Asesor" value={asesorCount} sub="Akun penilai aktif" />
          <DashStat label="Juri" value={juriCount} sub="Akun keputusan final" />
        </section>
        <div className="dashboard-charts">
          <DashPie title="Peserta per Status Assessment" data={statusData} />
          <DashBar title="Jumlah User per Role" data={roleData} multicolor />
        </div>
        <AdminParticipantsTable rows={participants} />
      </div>
    )
  }

  // ---------- JURI ----------
  const totalJ = juryRows.length
  const ready = juryRows.filter((r) => r.assessmentStatus === 'jury_review').length
  const finalized = juryRows.filter((r) => r.assessmentStatus === 'finalized').length
  const redFlags = juryRows.reduce((s, r) => s + (r.activeRedFlags ?? 0), 0)
  const awardData = countBy(
    juryRows.filter((r) => r.effectiveAwardLevel || r.recommendedAwardLevel),
    (r) => awardLabel((r.effectiveAwardLevel ?? r.recommendedAwardLevel) as AwardLevel),
  )
  const scoreData = juryRows.map((r) => ({
    name: r.participantName.length > 16 ? r.participantName.slice(0, 16) + '…' : r.participantName,
    value: Number((r.percentage ?? 0).toFixed(1)),
  }))
  return (
    <div className="dashboard-overview">
      <section className="metric-grid metric-grid--4">
        <DashStat label="Total Assessment" value={totalJ} sub="Dikirim asesor" />
        <DashStat label="Siap Finalisasi" value={ready} sub="Menunggu keputusan" />
        <DashStat label="Finalized" value={finalized} sub="Sudah diputuskan" />
        <DashStat label="Red Flag Aktif" value={redFlags} sub="Perlu perhatian" />
      </section>
      <div className="dashboard-charts">
        <DashPie title="Distribusi Award Level" data={awardData} />
        <DashBar title="Grand Score per Peserta (%)" data={scoreData} color="#0e7c66" />
      </div>
      <JuryAssessmentsTable rows={juryRows} />
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const role = user?.role ?? 'peserta'
  const [participantLogoUrl, setParticipantLogoUrl] = useState('')
  const [activeSection, setActiveSection] = useState(() => {
    const hashSection = sectionFromHash()
    if (hashSection !== 'summary') return hashSection
    return role === 'peserta' ? 'participant-profile' : 'summary'
  })

  useEffect(() => {
    const syncSection = () => setActiveSection(sectionFromHash())
    window.addEventListener('hashchange', syncSection)
    syncSection()
    return () => window.removeEventListener('hashchange', syncSection)
  }, [])

  useEffect(() => {
    if (role !== 'peserta') return
    async function loadParticipantLogo() {
      try {
        const res = await api.get('/participant/profile')
        const data = res.data.data as { organization?: Organization }
        setParticipantLogoUrl(data.organization?.logoUrl ?? '')
      } catch {
        setParticipantLogoUrl('')
      }
    }
    loadParticipantLogo()
    const refresh = () => loadParticipantLogo()
    window.addEventListener('participant-profile-updated', refresh as EventListener)
    return () => window.removeEventListener('participant-profile-updated', refresh as EventListener)
  }, [role])

  const workspace = useMemo(() => {
    if (role === 'admin') return <AdminWorkspace />
    if (role === 'asesor') return <AssessorWorkspace />
    if (role === 'juri') return <JuryWorkspace />
    if (role === 'peserta') {
      return (
        <>
          {activeSection === 'participant-profile' && <ProfilPeserta />}
          {activeSection === 'participant-checklist' && <ParticipantWorkspace />}
          {activeSection === 'participant-summary' && <ParticipantSummary />}
        </>
      )
    }
    return <ParticipantWorkspace />
  }, [role, activeSection])
  const hideScorePanels =
    // For peserta the Score Model & Workflow cards live in the summary/workflow
    // sections only — hide them in the checklist and profile modules.
    (role === 'peserta' && (activeSection === 'participant-profile' || activeSection === 'participant-checklist')) ||
    (role === 'admin' && activeSection.startsWith('admin-'))
  const sidebarItems = useMemo(() => {
    const dashboardItem = { id: 'dashboard', label: 'Dashboard', description: 'Ringkasan data, grafik, dan statistik', icon: <BarChart3 size={18} /> }
    const shared = [
      { id: 'summary', label: 'Ringkasan', description: 'Status awal dan metrik utama', icon: <LayoutDashboard size={18} /> },
      { id: 'workflow', label: 'Alur Kerja', description: 'Urutan proses dari peserta sampai juri', icon: <ClipboardCheck size={18} /> },
    ]
    if (role === 'admin') {
      return [
        dashboardItem,
        shared[0],
        { id: 'admin-users', label: 'Create Users', description: 'Admin, asesor, dan juri', icon: <Users size={18} /> },
        { id: 'admin-user-list', label: 'User Directory', description: 'Daftar user role aktif', icon: <Users size={18} /> },
        { id: 'admin-profile-weights', label: 'Bobot Kategori', description: 'Mapping bobot per profil peserta', icon: <SlidersHorizontal size={18} /> },
        { id: 'admin-checklist', label: 'Master Checklist', description: 'Kelola item master checklist ESG', icon: <ClipboardList size={18} /> },
        { id: 'admin-maturity', label: 'Maturity Reference', description: 'Skala maturity 0-5', icon: <FileCheck2 size={18} /> },
        { id: 'admin-participants', label: 'List Peserta', description: 'Peserta register dan assign asesor', icon: <Users size={18} /> },
        { id: 'admin-participant-actions', label: 'Verify & Assign', description: 'Verifikasi dan assign asesor', icon: <Users size={18} /> },
      ]
    }
    if (role === 'asesor') {
      return [
        dashboardItem,
        shared[0],
        { id: 'assessor-assignments', label: 'Peserta Saya', description: 'Assignment dari admin', icon: <ClipboardList size={18} /> },
        shared[1],
      ]
    }
    if (role === 'juri') {
      return [
        dashboardItem,
        shared[0],
        { id: 'jury-ranking', label: 'Ranking Juri', description: 'Urutan assessment siap finalisasi', icon: <Award size={18} /> },
        shared[1],
      ]
    }
    return [
      { id: 'participant-profile', label: 'Profil Peserta', description: 'Lengkapi data profil untuk assessment', icon: <UserIcon size={18} />, badge: <Bell size={14} /> },
      { id: 'workflow', label: 'Alur Scoring System', description: 'Urutan proses dari peserta sampai juri', icon: <ClipboardCheck size={18} /> },
      { id: 'participant-checklist', label: 'Checklist', description: 'Evidence dan scoring baseline', icon: <FileCheck2 size={18} /> },
      { id: 'participant-summary', label: 'Ringkasan', description: 'Bobot target, skor, dan award level', icon: <LayoutDashboard size={18} /> },
    ]
  }, [role])

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-page">
      <header className="app-topbar">
        <div className="brand-block">
          <img src="/assets/oneconnect/cbqa-logo.png" alt="CBQA" />
          <div className="brand-divider" />
          <div><strong>ESG Score</strong><span>Mining ESG Award Platform</span></div>
        </div>
        <div className="topbar-user">
          <div><strong>{user?.name}</strong><span>{roleLabels[role]}</span></div>
          <button onClick={handleLogout}><LogOut size={16} />Logout</button>
        </div>
      </header>

      <main className="app-wrap app-shell">
        <RoleSidebar
          role={role}
          title={roleLabels[role]}
          subtitle={roleSubtitles[role]}
          items={sidebarItems}
        />

        <div className="page-content">
          <section className="hero-panel" id="summary">
          <div className="role-icon">
            {role === 'peserta' && participantLogoUrl ? <img src={participantLogoUrl} alt="Company logo" /> : iconForRole(role)}
          </div>
          <div><span className="section-kicker">{roleLabels[role]} Workspace</span><h1>Dashboard {roleLabels[role]}</h1><p>{roleSubtitles[role]}</p></div>
          </section>

          {activeSection === 'dashboard' ? (
            <DashboardOverview role={role} />
          ) : (
            <>
              {/* For peserta, the summary cards belong only to the checklist module. */}
              {(role !== 'peserta' || activeSection === 'participant-checklist') && (
                <SummaryCards role={role} section={activeSection} />
              )}

              <section className="content-grid">
                {!hideScorePanels && <ScoreModelCard role={role} />}
                {!hideScorePanels && <WorkflowCard role={role} />}
                {workspace}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
