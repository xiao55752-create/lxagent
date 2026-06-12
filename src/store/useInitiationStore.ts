import { create } from 'zustand'
import { api } from '../api/client'
import type { ApprovalDecisionPayload } from '../components/agent/ApprovalActionModal'
import type { AutonomyLevel, InitiationProject, PhaseId, SimilarCase } from '../types'
import { getActorRole, setActorRole as persistActorRole, type ActorRole } from '../utils/actorRole'

interface InitiationStore {
  project: InitiationProject | null
  loading: boolean
  isGenerating: boolean
  activeMaterialKey: string | null
  error: string | null

  setProject: (p: InitiationProject | null) => void
  setActiveMaterial: (key: string | null) => void
  loadProject: (id: string) => Promise<void>
  sendMessage: (message: string) => Promise<void>
  setAutonomy: (level: AutonomyLevel) => Promise<void>
  setFocusModule: (phaseId: PhaseId | null) => Promise<void>
  executePlan: () => Promise<void>
  executePlanStep: (stepId: string) => Promise<void>
  skipPlanStep: (stepId: string) => Promise<void>
  dismissPlan: () => Promise<void>
  rollback: () => Promise<void>
  prepareApproval: () => Promise<void>
  assessGoNoGo: () => Promise<void>
  highlightMessageId: string | null
  setHighlightMessageId: (id: string | null) => void
  similarCases: SimilarCase[]
  loadSimilarCases: () => Promise<void>
  confirmMaterial: (materialType: string) => Promise<void>
  submitApproval: () => Promise<void>
  processApproval: (payload: ApprovalDecisionPayload) => Promise<void>
  kbDocRequest: { docId: string; excerpt?: string } | null
  requestKbDoc: (docId: string, excerpt?: string) => void
  clearKbDocRequest: () => void
  actorRole: ActorRole
  setActorRole: (role: ActorRole) => void
}

export const useInitiationStore = create<InitiationStore>((set, get) => ({
  project: null,
  loading: false,
  isGenerating: false,
  activeMaterialKey: null,
  error: null,

  similarCases: [] as SimilarCase[],

  highlightMessageId: null as string | null,
  kbDocRequest: null as { docId: string; excerpt?: string } | null,
  actorRole: getActorRole(),

  setHighlightMessageId: (id) => set({ highlightMessageId: id }),
  requestKbDoc: (docId, excerpt) => set({ kbDocRequest: { docId, excerpt } }),
  clearKbDocRequest: () => set({ kbDocRequest: null }),
  setActorRole: (role) => {
    persistActorRole(role)
    set({ actorRole: role })
  },

  setProject: (p) => set({ project: p }),
  setActiveMaterial: (key) => set({ activeMaterialKey: key }),

  loadProject: async (id) => {
    set({ loading: true, error: null, similarCases: [] })
    try {
      const { project } = await api.getInitiation(id)
      set({ project, loading: false })
      try {
        const { cases } = await api.getSimilarCases(id)
        set({ similarCases: cases })
      } catch {
        /* optional */
      }
    } catch (e) {
      set({ error: String(e), loading: false })
    }
  },

  sendMessage: async (message) => {
    const { project } = get()
    if (!project) return
    set({ isGenerating: true, error: null })
    try {
      const prevMaterialCount = project.materials.length
      const { project: updated } = await api.chat(project.id, message)
      const newMaterials = updated.materials.slice(prevMaterialCount)
      const latestNew = newMaterials[newMaterials.length - 1]
      set({
        project: updated,
        isGenerating: false,
        activeMaterialKey: latestNew ? latestNew.materialType : get().activeMaterialKey,
      })
    } catch (e) {
      set({ error: String(e), isGenerating: false })
    }
  },

  setAutonomy: async (level) => {
    const { project } = get()
    if (!project) return
    try {
      const { project: updated } = await api.setAutonomy(project.id, level)
      set({ project: updated })
    } catch (e) {
      set({ error: String(e) })
    }
  },

  setFocusModule: async (phaseId) => {
    const { project } = get()
    if (!project) return
    try {
      const { project: updated } = await api.setFocus(project.id, phaseId)
      set({ project: updated })
    } catch (e) {
      set({ error: String(e) })
    }
  },

  executePlan: async () => {
    const { project } = get()
    if (!project) return
    set({ isGenerating: true, error: null })
    try {
      const prevMaterialCount = project.materials.length
      const { project: updated } = await api.executePlan(project.id)
      const newMaterials = updated.materials.slice(prevMaterialCount)
      const latestNew = newMaterials[newMaterials.length - 1]
      set({
        project: updated,
        isGenerating: false,
        activeMaterialKey: latestNew ? latestNew.materialType : get().activeMaterialKey,
      })
    } catch (e) {
      set({ error: String(e), isGenerating: false })
    }
  },

  executePlanStep: async (stepId) => {
    const { project } = get()
    if (!project) return
    set({ isGenerating: true, error: null })
    try {
      const prevMaterialCount = project.materials.length
      const { project: updated } = await api.executePlanStep(project.id, stepId)
      const newMaterials = updated.materials.slice(prevMaterialCount)
      const latestNew = newMaterials[newMaterials.length - 1]
      set({
        project: updated,
        isGenerating: false,
        activeMaterialKey: latestNew ? latestNew.materialType : get().activeMaterialKey,
      })
    } catch (e) {
      set({ error: String(e), isGenerating: false })
    }
  },

  skipPlanStep: async (stepId) => {
    const { project } = get()
    if (!project) return
    try {
      const { project: updated } = await api.skipPlanStep(project.id, stepId)
      set({ project: updated })
    } catch (e) {
      set({ error: String(e) })
    }
  },

  dismissPlan: async () => {
    const { project } = get()
    if (!project) return
    try {
      const { project: updated } = await api.dismissPlan(project.id)
      set({ project: updated })
    } catch (e) {
      set({ error: String(e) })
    }
  },

  rollback: async () => {
    const { project } = get()
    if (!project) return
    set({ isGenerating: true, error: null })
    try {
      const { project: updated } = await api.rollback(project.id)
      set({ project: updated, isGenerating: false, activeMaterialKey: null })
    } catch (e) {
      set({ error: String(e), isGenerating: false })
    }
  },

  confirmMaterial: async (materialType) => {
    const { project } = get()
    if (!project) return
    try {
      const { project: updated } = await api.confirmMaterial(project.id, materialType)
      set({ project: updated })
    } catch (e) {
      set({ error: String(e) })
    }
  },

  submitApproval: async () => {
    const { project } = get()
    if (!project) return
    set({ error: null })
    try {
      const { project: updated } = await api.submit(project.id)
      set({ project: updated })
    } catch (e) {
      set({ error: String(e) })
    }
  },

  prepareApproval: async () => {
    const { project } = get()
    if (!project) return
    set({ isGenerating: true, error: null })
    try {
      const { project: updated } = await api.prepareApproval(project.id)
      set({ project: updated, isGenerating: false })
    } catch (e) {
      set({ error: String(e), isGenerating: false })
    }
  },

  assessGoNoGo: async () => {
    const { project } = get()
    if (!project) return
    set({ isGenerating: true, error: null })
    try {
      const { project: updated } = await api.assessGoNoGo(project.id)
      set({ project: updated, isGenerating: false })
    } catch (e) {
      set({ error: String(e), isGenerating: false })
    }
  },

  loadSimilarCases: async () => {
    const { project } = get()
    if (!project) return
    try {
      const { cases } = await api.getSimilarCases(project.id)
      set({ similarCases: cases })
    } catch (e) {
      set({ error: String(e) })
    }
  },

  processApproval: async (payload) => {
    const { project } = get()
    if (!project) return
    try {
      const { project: updated } = await api.approve(project.id, payload)
      set({ project: updated })
    } catch (e) {
      set({ error: String(e) })
    }
  },

  runCompliance: async () => {
    const { project } = get()
    if (!project) return
    const { project: updated } = await api.compliance(project.id)
    set({ project: updated })
  },
}))
