import { appRoutes } from '../../appRoutes'

export const navigationFontFamily =
  '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

const navigationPaths = {
  assistant: '/assistant',
  compliance: '/compliance',
  documents: '/documents',
  home: '/',
  library: '/library',
  projects: appRoutes.workspaces,
  review: '/review',
  rulebook: '/rulebook',
  settings: '/settings',
  shared: '/shared',
  sharedDocuments: '/shared-documents',
  sources: '/sources',
  templates: '/templates',
} as const

export type NavigationIconName =
  | 'assistant'
  | 'compliance'
  | 'home'
  | 'library'
  | 'my-projects'
  | 'projects'
  | 'review'
  | 'rulebook'
  | 'shared-projects'

export type NavigationAction = 'open-library'

export type NavigationTarget =
  Readonly<{ kind: 'route'; path: string }> | Readonly<{ kind: 'action'; action: NavigationAction }>

export interface NavigationItemDefinition {
  id: string
  label: string
  icon: NavigationIconName
  target: NavigationTarget
  activePages?: readonly string[]
  activePaths?: readonly string[]
}

export type NavigationGroupId = 'documents' | 'projects' | 'review'

interface NavigationGroupBase {
  id: NavigationGroupId
  label: string
  icon: NavigationIconName
  routes: readonly string[]
  items: readonly NavigationItemDefinition[]
}

export type NavigationGroupDefinition =
  | (NavigationGroupBase &
      Readonly<{
        presentation: 'disclosure'
        defaultRoute: string
      }>)
  | (NavigationGroupBase & Readonly<{ presentation: 'route-only' }>)

export type NavigationEntry =
  | Readonly<{ kind: 'item'; item: NavigationItemDefinition }>
  | Readonly<{ kind: 'group'; group: NavigationGroupDefinition }>

export const primaryNavigationItems: readonly NavigationItemDefinition[] = [
  {
    id: 'home',
    label: 'Home',
    icon: 'home',
    target: { kind: 'route', path: navigationPaths.home },
    activePages: ['home'],
  },
]

const projectNavigationGroup: NavigationGroupDefinition = {
  id: 'projects',
  label: 'Projects',
  icon: 'projects',
  presentation: 'disclosure',
  defaultRoute: navigationPaths.projects,
  routes: [navigationPaths.projects, navigationPaths.shared],
  items: [
    {
      id: 'my-projects',
      label: 'My Projects',
      icon: 'my-projects',
      target: { kind: 'route', path: navigationPaths.projects },
      activePaths: [navigationPaths.projects],
    },
    {
      id: 'shared-projects',
      label: 'Shared projects',
      icon: 'shared-projects',
      target: { kind: 'route', path: navigationPaths.shared },
      activePaths: [navigationPaths.shared],
    },
  ],
}

const documentNavigationGroup: NavigationGroupDefinition = {
  id: 'documents',
  label: 'Documents',
  icon: 'my-projects',
  presentation: 'route-only',
  routes: [navigationPaths.documents, navigationPaths.sharedDocuments],
  items: [
    {
      id: 'my-documents',
      label: 'My Documents',
      icon: 'my-projects',
      target: { kind: 'route', path: navigationPaths.documents },
      activePaths: [navigationPaths.documents],
    },
    {
      id: 'shared-documents',
      label: 'Shared Documents',
      icon: 'shared-projects',
      target: { kind: 'route', path: navigationPaths.sharedDocuments },
      activePaths: [navigationPaths.sharedDocuments],
    },
  ],
}

const reviewNavigationGroup: NavigationGroupDefinition = {
  id: 'review',
  label: 'Review',
  icon: 'review',
  presentation: 'disclosure',
  defaultRoute: navigationPaths.review,
  routes: [navigationPaths.review, navigationPaths.compliance],
  items: [
    {
      id: 'tabular-review',
      label: 'Tabular Review',
      icon: 'my-projects',
      target: { kind: 'route', path: navigationPaths.review },
      activePaths: [navigationPaths.review],
    },
    {
      id: 'compliance',
      label: 'Compliance',
      icon: 'compliance',
      target: { kind: 'route', path: navigationPaths.compliance },
      activePaths: [navigationPaths.compliance],
    },
  ],
}

export const workspaceNavigation: readonly NavigationEntry[] = [
  {
    kind: 'item',
    item: {
      id: 'assistant',
      label: 'Assistant',
      icon: 'assistant',
      target: { kind: 'route', path: navigationPaths.assistant },
      activePages: ['assistant'],
      activePaths: [navigationPaths.assistant],
    },
  },
  {
    kind: 'group',
    group: projectNavigationGroup,
  },
  {
    kind: 'group',
    group: documentNavigationGroup,
  },
  {
    kind: 'item',
    item: {
      id: 'library',
      label: 'Library',
      icon: 'library',
      target: { kind: 'action', action: 'open-library' },
      activePages: ['library'],
    },
  },
  {
    kind: 'group',
    group: reviewNavigationGroup,
  },
]

export const intelligenceNavigationItems: readonly NavigationItemDefinition[] = [
  {
    id: 'rulebook',
    label: 'Rulebook',
    icon: 'rulebook',
    target: { kind: 'route', path: navigationPaths.rulebook },
    activePages: ['rulebook'],
  },
]

export const navigationGroupsById: Readonly<Record<NavigationGroupId, NavigationGroupDefinition>> =
  {
    documents: documentNavigationGroup,
    projects: projectNavigationGroup,
    review: reviewNavigationGroup,
  }

const defaultPagePaths: Readonly<Record<string, string>> = {
  home: navigationPaths.home,
  assistant: navigationPaths.assistant,
  projects: navigationPaths.projects,
  library: navigationPaths.library,
  templates: navigationPaths.templates,
  shared: navigationPaths.shared,
  review: navigationPaths.review,
  compliance: navigationPaths.compliance,
  sources: navigationPaths.sources,
  rulebook: navigationPaths.rulebook,
  settings: navigationPaths.settings,
  documents: navigationPaths.documents,
}

export function isNavigationItemActive(
  item: NavigationItemDefinition,
  activePage: string,
  pathname: string,
) {
  return Boolean(item.activePages?.includes(activePage) || item.activePaths?.includes(pathname))
}

export function isNavigationGroupRoute(group: NavigationGroupDefinition, pathname: string) {
  return group.routes.includes(pathname)
}

export function getDefaultBreadcrumb(activePage: string) {
  return {
    label: activePage.charAt(0).toUpperCase() + activePage.slice(1),
    path: defaultPagePaths[activePage] || '/',
  }
}
