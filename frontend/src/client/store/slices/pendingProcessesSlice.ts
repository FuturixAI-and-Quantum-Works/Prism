import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit'

export type ProcessType =
  'compliance' | 'tabular_review' | 'analysis' | 'document_generation' | 'chat'
export type ProcessStatus = 'running' | 'completed' | 'error'

export interface PendingProcess {
  id: string
  type: ProcessType
  title: string
  status: ProcessStatus
  progress?: number
  startedAt: number
  workspaceId?: string
  documentId?: string
  reviewId?: string
  chatId?: string
  error?: string
}

export interface PendingProcessesState {
  processes: PendingProcess[]
  dismissedIds: string[]
}

const initialState: PendingProcessesState = {
  processes: [],
  dismissedIds: [],
}

const pendingProcessesSlice = createSlice({
  name: 'pendingProcesses',
  initialState,
  reducers: {
    addProcess: (
      state,
      action: PayloadAction<
        Omit<PendingProcess, 'status' | 'startedAt'> & { status?: ProcessStatus }
      >,
    ) => {
      const existingIndex = state.processes.findIndex((p) => p.id === action.payload.id)
      const process: PendingProcess = {
        ...action.payload,
        status: action.payload.status || 'running',
        startedAt: Date.now(),
      }
      if (existingIndex >= 0) {
        state.processes[existingIndex] = process
      } else {
        state.processes.unshift(process)
      }
      state.dismissedIds = state.dismissedIds.filter((id) => id !== action.payload.id)
    },
    updateProcessStatus: (
      state,
      action: PayloadAction<{
        id: string
        status: ProcessStatus
        progress?: number
        error?: string
      }>,
    ) => {
      const process = state.processes.find((p) => p.id === action.payload.id)
      if (process) {
        process.status = action.payload.status
        if (action.payload.progress !== undefined) {
          process.progress = action.payload.progress
        }
        if (action.payload.error !== undefined) {
          process.error = action.payload.error
        }
      }
    },
    removeProcess: (state, action: PayloadAction<string>) => {
      state.processes = state.processes.filter((p) => p.id !== action.payload)
      state.dismissedIds = state.dismissedIds.filter((id) => id !== action.payload)
    },
    dismissProcess: (state, action: PayloadAction<string>) => {
      if (!state.dismissedIds.includes(action.payload)) {
        state.dismissedIds.push(action.payload)
      }
    },
    clearAllCompleted: (state) => {
      state.processes = state.processes.filter((p) => p.status === 'running')
      state.dismissedIds = []
    },
    clearAll: () => initialState,
  },
})

export const {
  addProcess,
  updateProcessStatus,
  removeProcess,
  dismissProcess,
  clearAllCompleted,
  clearAll,
} = pendingProcessesSlice.actions

const selectProcesses = (state: { pendingProcesses: PendingProcessesState }) =>
  state.pendingProcesses.processes

const selectDismissedIds = (state: { pendingProcesses: PendingProcessesState }) =>
  state.pendingProcesses.dismissedIds

export const selectRunningProcesses = createSelector([selectProcesses], (processes) =>
  processes.filter((p) => p.status === 'running'),
)

export const selectHasRunningProcesses = createSelector([selectProcesses], (processes) =>
  processes.some((p) => p.status === 'running'),
)

export const selectVisibleProcesses = createSelector(
  [selectProcesses, selectDismissedIds],
  (processes, dismissedIds) => processes.filter((p) => !dismissedIds.includes(p.id)),
)

export default pendingProcessesSlice.reducer
