import { useEffect, useState } from 'react'
import {
  isNavigationGroupRoute,
  navigationGroupsById,
  type NavigationGroupId,
} from './navigationModel'

type ExpandedGroups = Record<NavigationGroupId, boolean>

function groupsForPath(pathname: string): ExpandedGroups {
  return {
    documents: isNavigationGroupRoute(navigationGroupsById.documents, pathname),
    projects: isNavigationGroupRoute(navigationGroupsById.projects, pathname),
    review: isNavigationGroupRoute(navigationGroupsById.review, pathname),
  }
}

export function useSidebarNavigation(collapsed: boolean, pathname: string) {
  const [expandedGroups, setExpandedGroups] = useState<ExpandedGroups>(() =>
    groupsForPath(pathname),
  )

  useEffect(() => {
    setExpandedGroups((current) => {
      const matchingGroups = groupsForPath(pathname)
      return {
        documents: current.documents || matchingGroups.documents,
        projects: current.projects || matchingGroups.projects,
        review: current.review || matchingGroups.review,
      }
    })
  }, [pathname])

  useEffect(() => {
    if (collapsed) {
      setExpandedGroups({ documents: false, projects: false, review: false })
    }
  }, [collapsed])

  const toggleGroup = (groupId: NavigationGroupId) => {
    setExpandedGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }))
  }

  return { expandedGroups, toggleGroup }
}
