import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authClient } from '../lib/authClient'
import { apiFetch, apiUrl, sessionLostEvent } from '../lib/apiTransport'
import { getRequestErrorMessage } from '../lib/requestErrors'
import type { User } from '../store/types'

interface UserProfile {
  displayName: string | null
  country: string | null
  jurisdiction: string | null
  organization: string | null
  professionalRole: string | null
  role: string
  onboardingCompleted: boolean
}

export interface CompleteProfileRequest {
  fullName: string
  country: string
  jurisdiction?: string | null
  organization: string
  professionalRole?: string | null
}

type ProfileState =
  | { status: 'idle'; profile: null; error: null }
  | { status: 'loading'; profile: null; error: null }
  | { status: 'ready'; profile: UserProfile; error: null }
  | { status: 'error'; profile: null; error: string }

type AuthStatus = 'error' | 'loading' | 'signedOut' | 'authenticated' | 'needsOnboarding'

const profileUpdatedEvent = 'prism:profile-updated'

export function useAuth() {
  const navigate = useNavigate()
  const session = authClient.useSession()
  const [profileState, setProfileState] = useState<ProfileState>({
    status: 'idle',
    profile: null,
    error: null,
  })
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [isCompletingProfile, setIsCompletingProfile] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const refetchSession = session.refetch

  useEffect(() => {
    const refreshSession = () => {
      void refetchSession()
    }
    window.addEventListener(sessionLostEvent, refreshSession)
    return () => window.removeEventListener(sessionLostEvent, refreshSession)
  }, [refetchSession])

  const loadProfile = useCallback(async (signal?: AbortSignal) => {
    setProfileState({ status: 'loading', profile: null, error: null })
    try {
      const response = await apiFetch(apiUrl('/user/profile'), { signal })
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null)
        const detail =
          payload &&
          typeof payload === 'object' &&
          typeof Reflect.get(payload, 'detail') === 'string'
            ? Reflect.get(payload, 'detail')
            : 'Failed to load your profile'
        throw new Error(detail)
      }
      const profile: UserProfile = await response.json()
      setProfileState({ status: 'ready', profile, error: null })
      return profile
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null
      setProfileState({
        status: 'error',
        profile: null,
        error: getRequestErrorMessage(error, 'Failed to load your profile'),
      })
      return null
    }
  }, [])

  useEffect(() => {
    if (!session.data?.user) {
      setProfileState({ status: 'idle', profile: null, error: null })
      return
    }
    const controller = new AbortController()
    void loadProfile(controller.signal)
    return () => controller.abort()
  }, [loadProfile, session.data?.user])

  useEffect(() => {
    const refreshProfile = () => {
      if (session.data?.user) void loadProfile()
    }
    window.addEventListener(profileUpdatedEvent, refreshProfile)
    return () => window.removeEventListener(profileUpdatedEvent, refreshProfile)
  }, [loadProfile, session.data?.user])

  const sendOtp = useCallback(async (email: string) => {
    setIsSendingOtp(true)
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: 'sign-in',
      })
      if (result.error) return { success: false, error: result.error.message }
      return { success: true }
    } catch (error) {
      return { success: false, error: getRequestErrorMessage(error, 'Failed to send OTP') }
    } finally {
      setIsSendingOtp(false)
    }
  }, [])

  const verifyOtp = useCallback(
    async (email: string, code: string) => {
      setIsVerifyingOtp(true)
      try {
        const result = await authClient.signIn.emailOtp({ email: email.trim(), otp: code })
        if (result.error) return { success: false, error: result.error.message }
        await refetchSession()
        return { success: true }
      } catch (error) {
        return { success: false, error: getRequestErrorMessage(error, 'Invalid or expired OTP') }
      } finally {
        setIsVerifyingOtp(false)
      }
    },
    [refetchSession],
  )

  const completeProfile = useCallback(
    async (data: CompleteProfileRequest) => {
      setIsCompletingProfile(true)
      try {
        const response = await apiFetch(apiUrl('/user/onboarding'), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!response.ok) {
          const payload: unknown = await response.json().catch(() => null)
          const detail =
            payload &&
            typeof payload === 'object' &&
            typeof Reflect.get(payload, 'detail') === 'string'
              ? Reflect.get(payload, 'detail')
              : 'Failed to complete signup'
          return { success: false, error: detail }
        }
        const profile: UserProfile = await response.json()
        setProfileState({ status: 'ready', profile, error: null })
        window.dispatchEvent(new Event(profileUpdatedEvent))
        navigate('/', { replace: true })
        return { success: true }
      } catch (error) {
        return { success: false, error: getRequestErrorMessage(error, 'Failed to complete signup') }
      } finally {
        setIsCompletingProfile(false)
      }
    },
    [navigate],
  )

  const initiateGoogleOAuth = useCallback(async () => {
    const result = await authClient.signIn.social({
      provider: 'google',
      callbackURL: `${window.location.origin}/`,
      newUserCallbackURL: `${window.location.origin}/onboarding`,
      errorCallbackURL: `${window.location.origin}/login?auth=failed`,
    })
    if (result.error) return { success: false, error: result.error.message }
    return { success: true }
  }, [])

  const logout = useCallback(async () => {
    setIsLoggingOut(true)
    try {
      const result = await authClient.signOut()
      if (result.error) return { success: false, error: result.error.message }
      setProfileState({ status: 'idle', profile: null, error: null })
      await refetchSession()
      navigate('/login', { replace: true })
      return { success: true }
    } catch (error) {
      return { success: false, error: getRequestErrorMessage(error, 'Failed to sign out') }
    } finally {
      setIsLoggingOut(false)
    }
  }, [navigate, refetchSession])

  const user = useMemo<User | null>(() => {
    const identity = session.data?.user
    if (!identity) return null
    const profile = profileState.status === 'ready' ? profileState.profile : null
    return {
      id: identity.id,
      email: identity.email,
      displayName: profile?.displayName || identity.name,
      avatar: identity.image || undefined,
      role: profile?.role || 'viewer',
      jurisdiction: profile?.jurisdiction || undefined,
      organisation: profile?.organization || undefined,
      emailVerified: identity.emailVerified,
      onboardingCompleted: profile?.onboardingCompleted || false,
      createdAt:
        identity.createdAt instanceof Date
          ? identity.createdAt.toISOString()
          : String(identity.createdAt),
      updatedAt:
        identity.updatedAt instanceof Date
          ? identity.updatedAt.toISOString()
          : String(identity.updatedAt),
    }
  }, [profileState, session.data?.user])

  const isAuthenticated = Boolean(session.data?.user)
  const isLoading =
    session.isPending || (isAuthenticated && ['idle', 'loading'].includes(profileState.status))
  const onboardingCompleted =
    profileState.status === 'ready' && profileState.profile.onboardingCompleted
  let status: AuthStatus = 'needsOnboarding'
  if (session.error) status = 'error'
  else if (isLoading) status = 'loading'
  else if (!isAuthenticated) status = 'signedOut'
  else if (onboardingCompleted) status = 'authenticated'
  else if (profileState.status === 'error') status = 'error'

  return {
    status,
    user,
    isAuthenticated,
    isLoading,
    onboardingCompleted,
    error: session.error?.message || profileState.error,
    isSendingOtp,
    isVerifyingOtp,
    isCompletingProfile,
    isLoggingOut,
    sendOtp,
    verifyOtp,
    completeProfile,
    initiateGoogleOAuth,
    logout,
    refetchUser: loadProfile,
  }
}
