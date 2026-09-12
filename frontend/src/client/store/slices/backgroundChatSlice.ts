import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface BackgroundChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface BackgroundChatState {
  isActive: boolean
  isStreaming: boolean
  isComplete: boolean
  messages: BackgroundChatMessage[]
  chatId: string | undefined
  projectId: string | undefined
  workspaceId: string | undefined
  lastUserMessage: string
  notificationDismissed: boolean
}

const initialState: BackgroundChatState = {
  isActive: false,
  isStreaming: false,
  isComplete: false,
  messages: [],
  chatId: undefined,
  projectId: undefined,
  workspaceId: undefined,
  lastUserMessage: '',
  notificationDismissed: false,
}

const backgroundChatSlice = createSlice({
  name: 'backgroundChat',
  initialState,
  reducers: {
    startBackgroundChat: (
      state,
      action: PayloadAction<{
        messages: BackgroundChatMessage[]
        chatId: string | undefined
        projectId: string | undefined
        workspaceId: string | undefined
        lastUserMessage: string
      }>,
    ) => {
      state.isActive = true
      state.isStreaming = true
      state.isComplete = false
      state.messages = action.payload.messages
      state.chatId = action.payload.chatId
      state.projectId = action.payload.projectId
      state.workspaceId = action.payload.workspaceId
      state.lastUserMessage = action.payload.lastUserMessage
      state.notificationDismissed = false
    },
    updateBackgroundChatMessage: (state, action: PayloadAction<string>) => {
      const lastIndex = state.messages.length - 1
      if (lastIndex >= 0 && state.messages[lastIndex].role === 'assistant') {
        state.messages[lastIndex].content += action.payload
      }
    },
    setBackgroundChatComplete: (state) => {
      state.isStreaming = false
      state.isComplete = true
    },
    dismissNotification: (state) => {
      state.notificationDismissed = true
    },
    clearBackgroundChat: () => initialState,
    restoreBackgroundChat: (state) => {
      state.isActive = false
    },
  },
})

export const {
  startBackgroundChat,
  updateBackgroundChatMessage,
  setBackgroundChatComplete,
  dismissNotification,
  clearBackgroundChat,
  restoreBackgroundChat,
} = backgroundChatSlice.actions

export default backgroundChatSlice.reducer
