export type Role = 'admin' | 'asesor' | 'juri' | 'peserta'

export interface User {
  id: string
  organizationId: string | null
  email: string
  name: string
  position?: string
  affiliation?: string
  phone?: string
  role: Role
  avatarUrl?: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
}

export interface AuthState {
  user: User | null
  accessToken: string | null
}

export type OrganizationStatus = 'draft' | 'registered' | 'verified' | 'assessing' | 'completed' | 'disqualified'

export interface Organization {
  id: string
  name: string
  slug: string
  industry?: string
  sector?: string
  logoUrl?: string
  licenseNumber?: string
  licenseType?: string
  mainServiceType?: string
  size?: string
  status: OrganizationStatus
  entityType?: string
  phone?: string
  email?: string
  taxNumber?: string
  currency?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  website?: string
  createdAt: string
}

export interface ProfileWeightTarget {
  profileCode: string
  environmental: number
  social: number
  governance: number
  rationale: string
  total: number
  createdAt?: string
  updatedAt?: string
}

export interface MaturityLevelRef {
  id: string
  score: number
  level: string
  description: string
  createdAt?: string
  updatedAt?: string
}

export interface MaturityBandRef {
  id: string
  rangeLabel: string
  bandLabel: string
  createdAt?: string
  updatedAt?: string
}

export interface OrgContact {
  id: string
  organizationId: string
  name: string
  position?: string
  email?: string
  phone?: string
  isPrimary: boolean
  createdAt: string
}

export type EsgPillar = 'environmental' | 'social' | 'governance'
export type AssessmentStatus = 'draft' | 'submitted' | 'in_review' | 'revision_requested' | 'jury_review' | 'finalized'
export type EvidenceStatus = 'uploaded' | 'accepted' | 'rejected' | 'revision_requested'
export type AwardLevel = 'foundation' | 'integration' | 'leadership' | 'grand_champion' | 'not_eligible'

export interface Assessment {
  id: string
  organizationId: string
  title: string
  status: AssessmentStatus
  periodYear: number
  submittedAt?: string
  finalizedAt?: string
  revisionNote?: string
  createdAt: string
  updatedAt: string
}

export interface ChecklistItem {
  id: string
  pillar: EsgPillar
  category: string
  subCategory: string
  questionNumber: string
  question: string
  evidenceRequired: string
  applicabilityTag?: string
  weight: number
  sortOrder?: number
}

export interface ScoreItem {
  id: string
  assessmentId: string
  checklistItemId: string
  score: 0 | 1 | 2 | 3 | 4 | 5
  weightedScore: number
  note?: string
  assessedBy?: string
  assessedAt?: string
}

export interface EvidenceItem {
  id: string
  assessmentId: string
  checklistItemId: string
  fileName: string
  fileUrl: string
  status: EvidenceStatus
  reviewerNote?: string
  uploadedBy: string
  createdAt: string
}

export interface AssessorAssignment {
  id: string
  assessmentId: string
  participantId: string
  assessorId: string
  assignedBy: string
  assignedAt: string
  status: 'assigned' | 'in_review' | 'submitted_to_jury'
}

export interface RedFlag {
  id: string
  assessmentId: string
  type: 'fatality_or_tailing_failure' | 'severe_regulatory_sanction' | 'false_evidence'
  description: string
  isActive: boolean
}

export interface JuryDecision {
  id: string
  assessmentId: string
  awardLevel: AwardLevel
  note: string
  decidedBy: string
  decidedAt: string
}

export interface ApiError {
  message: string
  error?: string
  code?: string
}
