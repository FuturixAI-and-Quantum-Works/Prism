import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { appRoutes } from '../../appRoutes'
import { getRequestErrorMessage } from '../../lib/requestErrors'
import { useInviteWorkspaceMemberMutation } from '../../store/api/drive/driveInvitationsApi'
import { useCreateDriveWorkspaceMutation } from '../../store/api/drive/driveWorkspaceApi'
import {
  buildCreateWorkspaceRequest,
  buildWorkspaceInvitationRequests,
  invitedMemberColors,
  isValidWorkspaceEmail,
} from './workspaceModels'
import type {
  CreateWorkspaceStep,
  WorkspaceInviteDraft,
  WorkspaceMemberRole,
} from './workspaceModels'

interface UseCreateWorkspaceSessionOptions {
  onClose: () => void
}

interface InvitationFailure {
  email: string
  message: string
}

export function useCreateWorkspaceSession({ onClose }: UseCreateWorkspaceSessionOptions) {
  const navigate = useNavigate()
  const [createWorkspace, { isLoading: isCreating }] = useCreateDriveWorkspaceMutation()
  const [inviteWorkspaceMember] = useInviteWorkspaceMemberMutation()
  const [step, setStep] = useState<CreateWorkspaceStep>('basic')
  const [workspaceName, setWorkspaceName] = useState('')
  const [description, setDescription] = useState('')
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null)
  const [invites, setInvites] = useState<WorkspaceInviteDraft[]>([])
  const [invitationFailures, setInvitationFailures] = useState<InvitationFailure[]>([])
  const [emailInput, setEmailInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const workspaceNameId = useId()
  const descriptionId = useId()
  const inviteEmailId = useId()
  const workspaceNameRef = useRef<HTMLInputElement>(null)
  const inviteEmailRef = useRef<HTMLInputElement>(null)
  const continueButtonRef = useRef<HTMLButtonElement>(null)
  const focusInviteOnRenderRef = useRef(false)
  const submissionSequenceRef = useRef(0)
  const activeSubmissionRef = useRef<number | null>(null)

  useEffect(() => {
    if (step === 'success') continueButtonRef.current?.focus()
  }, [step])

  useLayoutEffect(() => {
    if (step !== 'access' || !focusInviteOnRenderRef.current) return
    focusInviteOnRenderRef.current = false
    inviteEmailRef.current?.focus()
  }, [step])

  const reset = () => {
    activeSubmissionRef.current = null
    setStep('basic')
    setWorkspaceName('')
    setDescription('')
    setCreatedWorkspaceId(null)
    setInvites([])
    setInvitationFailures([])
    setEmailInput('')
    setError(null)
    setIsSubmitting(false)
  }

  const close = () => {
    reset()
    onClose()
  }

  const openAccessStep = () => {
    focusInviteOnRenderRef.current = true
    setStep('access')
  }

  const changeStep = (value: string) => {
    if (value !== 'basic' && value !== 'access') return
    if (value === 'access') focusInviteOnRenderRef.current = true
    setStep(value)
  }

  const addInvite = () => {
    const email = emailInput.trim().toLowerCase()
    if (email && !isValidWorkspaceEmail(email)) {
      setError('Enter a valid email address.')
      return
    }
    if (!email || invites.some((invite) => invite.email === email)) return
    setInvites((current) => [
      ...current,
      {
        email,
        role: 'Editor',
        color: invitedMemberColors[current.length % invitedMemberColors.length],
      },
    ])
    setEmailInput('')
    setError(null)
  }

  const setInviteRole = (email: string, role: WorkspaceMemberRole) => {
    setInvites((current) =>
      current.map((invite) => (invite.email === email ? { ...invite, role } : invite)),
    )
  }

  const create = async () => {
    if (isCreating || activeSubmissionRef.current !== null || createdWorkspaceId) return
    const submissionId = ++submissionSequenceRef.current
    activeSubmissionRef.current = submissionId
    setError(null)
    setInvitationFailures([])
    setIsSubmitting(true)
    try {
      const workspace = await createWorkspace(
        buildCreateWorkspaceRequest(workspaceName, description),
      ).unwrap()
      if (activeSubmissionRef.current !== submissionId) return
      setCreatedWorkspaceId(workspace.id)
      if (invites.length > 0) {
        const requests = buildWorkspaceInvitationRequests(workspace.id, invites)
        const results = await Promise.allSettled(
          requests.map((request) => inviteWorkspaceMember(request).unwrap()),
        )
        if (activeSubmissionRef.current !== submissionId) return
        const failures = results.flatMap((result, index): InvitationFailure[] => {
          const request = requests[index]
          if (result.status === 'rejected') {
            return [
              {
                email: request.email,
                message: getRequestErrorMessage(
                  result.reason,
                  'The invitation request could not be completed.',
                ),
              },
            ]
          }
          if (result.value.delivery.status !== 'sent') {
            return [
              {
                email: request.email,
                message:
                  result.value.delivery.error ||
                  `Email delivery was ${result.value.delivery.status}.`,
              },
            ]
          }
          return []
        })
        if (failures.length > 0) {
          setInvitationFailures(failures)
          setError(
            `Workspace created, but ${failures.length} invitation${failures.length === 1 ? '' : 's'} could not be delivered.`,
          )
          return
        }
      }
      setStep('success')
    } catch (requestError) {
      if (activeSubmissionRef.current === submissionId) {
        setError(getRequestErrorMessage(requestError, 'Failed to create workspace'))
      }
    } finally {
      if (activeSubmissionRef.current === submissionId) {
        activeSubmissionRef.current = null
        setIsSubmitting(false)
      }
    }
  }

  const continueToWorkspace = () => {
    if (!createdWorkspaceId) return
    const workspaceId = createdWorkspaceId
    close()
    navigate(appRoutes.workspace(workspaceId))
  }

  return {
    step,
    fields: {
      workspaceName,
      description,
      emailInput,
      invites,
      invitationFailures,
      error,
      isCreating: isCreating || isSubmitting,
    },
    ids: { workspaceNameId, descriptionId, inviteEmailId },
    refs: { workspaceNameRef, inviteEmailRef, continueButtonRef },
    actions: {
      close,
      changeStep,
      openAccessStep,
      setWorkspaceName,
      setDescription,
      setEmailInput,
      addInvite,
      setInviteRole,
      create,
      continueToWorkspace,
      continueWithoutFailedInvitations: continueToWorkspace,
    },
  }
}

export type CreateWorkspaceSession = ReturnType<typeof useCreateWorkspaceSession>
