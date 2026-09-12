import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store'
import OnboardingScreen from './components/OnboardingScreen'
import BackgroundChatIndicator from './components/BackgroundChatIndicator'
import PendingProcessesIndicator from './components/PendingProcessesIndicator'
import { useAuth } from './hooks/useAuth'
import { useNavigationWarning } from './hooks/useNavigationWarning'
import { baseApi } from './store/api/baseApi'
import { clearBackgroundChat } from './store/slices/backgroundChatSlice'
import { clearAll } from './store/slices/pendingProcessesSlice'
import { routeDefinitions, type RouteAccess } from './routeManifest'
import { clearDurableRunStates, sessionLostEvent } from './lib/apiTransport'

type AuthStatus = ReturnType<typeof useAuth>['status']

const routes = routeDefinitions.map((route) => ({
  ...route,
  Page: lazy(route.load),
}))

type RouteErrorBoundaryProps = Readonly<{
  children: ReactNode
  resetKey: string
}>

type RouteErrorBoundaryState = Readonly<{ error: Error | null }>

export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Route rendering failed', error, info)
  }

  componentDidUpdate(previous: RouteErrorBoundaryProps) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return <RouteErrorScreen />
    }
    return this.props.children
  }
}

function RouteFrame() {
  const location = useLocation()
  return (
    <RouteErrorBoundary resetKey={location.key}>
      <Suspense fallback={<OnboardingScreen />}>
        <Outlet />
      </Suspense>
    </RouteErrorBoundary>
  )
}

function SignedOutOnly({ status }: { status: AuthStatus }) {
  if (status === 'loading') return <OnboardingScreen />
  if (status === 'authenticated') return <Navigate to="/" replace />
  if (status === 'needsOnboarding') return <Navigate to="/onboarding" replace />
  return <Outlet />
}

function OnboardingLayout({ status, error }: { status: AuthStatus; error: string | null }) {
  if (status === 'loading') return <OnboardingScreen />
  if (status === 'signedOut') return <Navigate to="/login" replace />
  if (status === 'authenticated') return <Navigate to="/" replace />
  if (status === 'error') return <AuthErrorScreen message={error} />
  return <RouteFrame />
}

function ProtectedLayout({ status, error }: { status: AuthStatus; error: string | null }) {
  useNavigationWarning()
  if (status === 'loading') return <OnboardingScreen />
  if (status === 'signedOut') return <Navigate to="/login" replace />
  if (status === 'needsOnboarding') return <Navigate to="/onboarding" replace />
  if (status === 'error') return <AuthErrorScreen message={error} />
  return (
    <>
      <RouteFrame />
      <PendingProcessesIndicator />
      <BackgroundChatIndicator />
    </>
  )
}

function AuthErrorScreen({ message }: { message: string | null }) {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
      <section style={{ maxWidth: '460px', textAlign: 'center' }}>
        <h1>Unable to load your account</h1>
        <p>{message || 'Please refresh the page or sign in again.'}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Try again
        </button>
      </section>
    </main>
  )
}

function RouteErrorScreen() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
      <section style={{ maxWidth: '460px', textAlign: 'center' }}>
        <h1>This page could not be loaded</h1>
        <p>Refresh the page to try again.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Refresh
        </button>
      </section>
    </main>
  )
}

function useSessionStateReset(status: AuthStatus) {
  const previousStatus = useRef<AuthStatus>('loading')
  const navigate = useNavigate()
  const resetSessionState = useCallback(() => {
    store.dispatch(baseApi.util.resetApiState())
    store.dispatch(clearBackgroundChat())
    store.dispatch(clearAll())
    clearDurableRunStates()
    try {
      window.localStorage.removeItem('prism_assistant_active_chat')
    } catch {
      return
    }
  }, [])

  useEffect(() => {
    const lostSession =
      status === 'signedOut' &&
      (previousStatus.current === 'authenticated' || previousStatus.current === 'needsOnboarding')
    previousStatus.current = status
    if (!lostSession) return
    resetSessionState()
  }, [resetSessionState, status])

  useEffect(() => {
    const handleSessionLoss = () => {
      resetSessionState()
      navigate('/login', { replace: true })
    }
    window.addEventListener(sessionLostEvent, handleSessionLoss)
    return () => window.removeEventListener(sessionLostEvent, handleSessionLoss)
  }, [navigate, resetSessionState])
}

function routesFor(access: RouteAccess) {
  return routes.filter((route) => route.access === access)
}

export function AppRoutes() {
  const { status, error } = useAuth()
  useSessionStateReset(status)

  return (
    <Routes>
      <Route element={<RouteFrame />}>
        {routesFor('public')
          .filter(({ path }) => path !== '/login')
          .map(({ path, Page }) => (
            <Route key={path} path={path} element={<Page />} />
          ))}
        <Route element={<SignedOutOnly status={status} />}>
          {routesFor('public')
            .filter(({ path }) => path === '/login')
            .map(({ path, Page }) => (
              <Route key={path} path={path} element={<Page />} />
            ))}
        </Route>
      </Route>
      <Route element={<OnboardingLayout status={status} error={error} />}>
        {routesFor('onboarding').map(({ path, Page }) => (
          <Route key={path} path={path} element={<Page />} />
        ))}
      </Route>
      <Route element={<ProtectedLayout status={status} error={error} />}>
        {routesFor('protected').map(({ path, Page }) => (
          <Route key={path} path={path} element={<Page />} />
        ))}
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </Provider>
  )
}

export default App
