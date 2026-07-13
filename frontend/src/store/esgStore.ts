import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AssessorAssignment,
  Assessment,
  AwardLevel,
  ChecklistItem,
  EvidenceItem,
  JuryDecision,
  Organization,
  RedFlag,
  ScoreItem,
} from '@/types'

export const ASSESSORS = [
  { id: 'demo-asesor', name: 'Asesor ESG 1', email: 'asesor@esg-score.local' },
  { id: 'demo-asesor-2', name: 'Asesor ESG 2', email: 'asesor2@esg-score.local' },
]

export const CHECKLIST: ChecklistItem[] = [
  {
    id: 'env-tailings-water',
    pillar: 'environmental',
    category: 'Environmental',
    subCategory: 'Tailings & Water Stewardship',
    questionNumber: 'E1',
    question: 'Apakah perusahaan memiliki rencana manajemen tailing yang komprehensif, diaudit pihak ketiga, dan sesuai protokol TSM?',
    evidenceRequired: 'Dokumen Tailings Management Plan, Laporan Audit Independen (TSM), Sertifikat/Dokumen ISO 14001.',
    weight: 0.15,
  },
  {
    id: 'env-biodiversity-closure',
    pillar: 'environmental',
    category: 'Environmental',
    subCategory: 'Biodiversity & Mine Closure',
    questionNumber: 'E2',
    question: 'Apakah perusahaan memiliki rencana penutupan tambang yang didanai dan strategi restorasi biodiversitas?',
    evidenceRequired: 'Dokumen Mine Closure Plan, bukti escrow account dana penutupan, laporan baseline biodiversitas.',
    weight: 0.1,
  },
  {
    id: 'env-decarbonization-energy',
    pillar: 'environmental',
    category: 'Environmental',
    subCategory: 'Decarbonization & Energy',
    questionNumber: 'E3',
    question: 'Bagaimana strategi dan realisasi pengurangan emisi GRK Scope 1 & 2 serta transisi ke energi terbarukan?',
    evidenceRequired: 'Inventarisasi GRK ISO 14064, laporan audit energi ISO 50001, data konsumsi EBT.',
    weight: 0.1,
  },
  {
    id: 'soc-zero-harm',
    pillar: 'social',
    category: 'Social',
    subCategory: 'Zero Harm & Occupational Health',
    questionNumber: 'S1',
    question: 'Bagaimana kinerja keselamatan kerja dan implementasi sistem manajemen K3?',
    evidenceRequired: 'Data statistik kecelakaan, laporan audit K3, sertifikat ISO 45001.',
    weight: 0.15,
  },
  {
    id: 'soc-community',
    pillar: 'social',
    category: 'Social',
    subCategory: 'SLO & Community Prosperity',
    questionNumber: 'S2',
    question: 'Apakah perusahaan menerapkan FPIC dan memiliki mekanisme grievance yang efektif?',
    evidenceRequired: 'Dokumen kesepakatan masyarakat, grievance log, laporan ISO 26000.',
    weight: 0.15,
  },
  {
    id: 'soc-human-rights',
    pillar: 'social',
    category: 'Social',
    subCategory: 'Supply Chain & Human Rights',
    questionNumber: 'S3',
    question: 'Bagaimana perusahaan memastikan rantai pasok bebas dari pelanggaran HAM dan kerja paksa?',
    evidenceRequired: 'Supplier Code of Conduct, laporan audit sosial kontraktor, pernyataan anti-perbudakan modern.',
    weight: 0.1,
  },
  {
    id: 'gov-anti-corruption',
    pillar: 'governance',
    category: 'Governance',
    subCategory: 'Transparency & Anti-Corruption',
    questionNumber: 'G1',
    question: 'Apakah perusahaan memiliki sistem manajemen anti-suap tersertifikasi dan mempublikasikan pembayaran ke pemerintah?',
    evidenceRequired: 'Sertifikat ISO 37001, laporan EITI jika berlaku, kebijakan whistleblowing.',
    weight: 0.15,
  },
  {
    id: 'gov-board-risk',
    pillar: 'governance',
    category: 'Governance',
    subCategory: 'Board Oversight & ESG Risk',
    questionNumber: 'G2',
    question: 'Bagaimana dewan mengawasi risiko ESG dan mengaitkan remunerasi eksekutif dengan target ESG?',
    evidenceRequired: 'Notulensi rapat dewan, ESG Risk Register, kebijakan remunerasi dengan KPI ESG.',
    weight: 0.1,
  },
]

interface EsgState {
  organizations: Organization[]
  assessments: Assessment[]
  assignments: AssessorAssignment[]
  evidenceItems: EvidenceItem[]
  scoreItems: ScoreItem[]
  redFlags: RedFlag[]
  juryDecisions: JuryDecision[]
  registerParticipant: (payload: { company: string; picName: string; email: string }) => { organizationId: string; assessmentId: string }
  verifyParticipant: (organizationId: string) => void
  assignAssessor: (assessmentId: string, assessorId: string, adminId: string) => void
  saveEvidence: (assessmentId: string, checklistItemId: string, fileName: string, uploadedBy: string) => void
  submitParticipantAssessment: (assessmentId: string) => void
  saveScore: (assessmentId: string, checklistItemId: string, score: ScoreItem['score'], note: string, assessorId: string) => void
  submitToJury: (assessmentId: string) => void
  setRedFlag: (assessmentId: string, type: RedFlag['type'], isActive: boolean, description: string) => void
  decideAward: (assessmentId: string, awardLevel: AwardLevel, note: string, juryId: string) => void
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function now() {
  return new Date().toISOString()
}

function makeAssessment(organizationId: string): Assessment {
  const time = now()
  return {
    id: id('asm'),
    organizationId,
    title: 'ESG Mining Award Assessment 2026',
    status: 'draft',
    periodYear: 2026,
    createdAt: time,
    updatedAt: time,
  }
}

export function calculateScore(scoreItems: ScoreItem[]) {
  const byPillar = { environmental: 0, social: 0, governance: 0 }

  for (const item of scoreItems) {
    const checklist = CHECKLIST.find((entry) => entry.id === item.checklistItemId)
    if (checklist) byPillar[checklist.pillar] += item.weightedScore
  }

  const total = byPillar.environmental + byPillar.social + byPillar.governance
  const percentage = (total / 5) * 100
  return { ...byPillar, total, percentage }
}

export function recommendAward(percentage: number): AwardLevel {
  if (percentage >= 85) return 'grand_champion'
  if (percentage >= 80) return 'leadership'
  if (percentage >= 60) return 'integration'
  if (percentage >= 40) return 'foundation'
  return 'not_eligible'
}

export function awardLabel(level: AwardLevel) {
  const labels: Record<AwardLevel, string> = {
    foundation: 'ESG Foundation & Compliance Award',
    integration: 'ESG Integration & Performance Award',
    leadership: 'ESG Leadership & Transformation Award',
    grand_champion: 'Grand ESG Mining Champion',
    not_eligible: 'Not Eligible',
  }
  return labels[level]
}

const seededOrg: Organization = {
  id: 'org-demo-mining',
  name: 'PT Demo Mining ESG',
  slug: 'pt-demo-mining-esg',
  industry: 'Mining',
  status: 'registered',
  email: 'pic@demo-mining.local',
  createdAt: now(),
}

const seededAssessment = makeAssessment(seededOrg.id)
seededAssessment.id = 'asm-demo-mining'

export const useEsgStore = create<EsgState>()(
  persist(
    (set) => ({
      organizations: [seededOrg],
      assessments: [seededAssessment],
      assignments: [],
      evidenceItems: [],
      scoreItems: [],
      redFlags: [],
      juryDecisions: [],

      registerParticipant: ({ company, email }) => {
        const organizationId = id('org')
        const assessment = makeAssessment(organizationId)
        const organization: Organization = {
          id: organizationId,
          name: company,
          slug: slugify(company),
          industry: 'Mining',
          status: 'registered',
          email,
          createdAt: now(),
        }
        set((state) => ({
          organizations: [organization, ...state.organizations],
          assessments: [assessment, ...state.assessments],
        }))
        return { organizationId, assessmentId: assessment.id }
      },

      verifyParticipant: (organizationId) => set((state) => ({
        organizations: state.organizations.map((org) => org.id === organizationId ? { ...org, status: 'verified' } : org),
      })),

      assignAssessor: (assessmentId, assessorId, adminId) => set((state) => {
        const assessment = state.assessments.find((item) => item.id === assessmentId)
        if (!assessment) return state
        const assignment: AssessorAssignment = {
          id: id('asg'),
          assessmentId,
          participantId: assessment.organizationId,
          assessorId,
          assignedBy: adminId,
          assignedAt: now(),
          status: 'assigned',
        }
        return {
          assignments: [assignment, ...state.assignments.filter((item) => item.assessmentId !== assessmentId)],
          organizations: state.organizations.map((org) => org.id === assessment.organizationId ? { ...org, status: 'assessing' } : org),
          assessments: state.assessments.map((item) => item.id === assessmentId ? { ...item, status: 'in_review', updatedAt: now() } : item),
        }
      }),

      saveEvidence: (assessmentId, checklistItemId, fileName, uploadedBy) => set((state) => {
        const evidence: EvidenceItem = {
          id: id('evd'),
          assessmentId,
          checklistItemId,
          fileName,
          fileUrl: '#',
          status: 'uploaded',
          uploadedBy,
          createdAt: now(),
        }
        return {
          evidenceItems: [evidence, ...state.evidenceItems.filter((item) => !(item.assessmentId === assessmentId && item.checklistItemId === checklistItemId))],
        }
      }),

      submitParticipantAssessment: (assessmentId) => set((state) => ({
        assessments: state.assessments.map((item) => item.id === assessmentId ? { ...item, status: 'submitted', submittedAt: now(), updatedAt: now() } : item),
      })),

      saveScore: (assessmentId, checklistItemId, score, note, assessorId) => set((state) => {
        const checklist = CHECKLIST.find((item) => item.id === checklistItemId)
        if (!checklist) return state
        const scoreItem: ScoreItem = {
          id: id('scr'),
          assessmentId,
          checklistItemId,
          score,
          weightedScore: score * checklist.weight,
          note,
          assessedBy: assessorId,
          assessedAt: now(),
        }
        return {
          scoreItems: [scoreItem, ...state.scoreItems.filter((item) => !(item.assessmentId === assessmentId && item.checklistItemId === checklistItemId))],
          assignments: state.assignments.map((item) => item.assessmentId === assessmentId ? { ...item, status: 'in_review' } : item),
        }
      }),

      submitToJury: (assessmentId) => set((state) => ({
        assessments: state.assessments.map((item) => item.id === assessmentId ? { ...item, status: 'jury_review', updatedAt: now() } : item),
        assignments: state.assignments.map((item) => item.assessmentId === assessmentId ? { ...item, status: 'submitted_to_jury' } : item),
      })),

      setRedFlag: (assessmentId, type, isActive, description) => set((state) => {
        const redFlag: RedFlag = { id: id('rf'), assessmentId, type, description, isActive }
        return {
          redFlags: [redFlag, ...state.redFlags.filter((item) => !(item.assessmentId === assessmentId && item.type === type))],
        }
      }),

      decideAward: (assessmentId, awardLevel, note, juryId) => set((state) => {
        const decision: JuryDecision = { id: id('jury'), assessmentId, awardLevel, note, decidedBy: juryId, decidedAt: now() }
        const assessment = state.assessments.find((item) => item.id === assessmentId)
        return {
          juryDecisions: [decision, ...state.juryDecisions.filter((item) => item.assessmentId !== assessmentId)],
          assessments: state.assessments.map((item) => item.id === assessmentId ? { ...item, status: 'finalized', finalizedAt: now(), updatedAt: now() } : item),
          organizations: assessment
            ? state.organizations.map((org) => org.id === assessment.organizationId ? { ...org, status: 'completed' } : org)
            : state.organizations,
        }
      }),
    }),
    { name: 'esg-score-workflow' },
  ),
)
