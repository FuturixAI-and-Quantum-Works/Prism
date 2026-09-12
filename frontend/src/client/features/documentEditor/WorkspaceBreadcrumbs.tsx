import { HomeIcon, LibraryIcon, ProjectsIcon } from '../../components/icons'
import { ProjectIcon } from '../../components/icons/ProjectIcon'
import { getWorkspaceBreadcrumbs, type WorkspaceLocationState } from './workspaceViewModel'

const breadcrumbIcons = {
  home: <HomeIcon />,
  library: <LibraryIcon />,
  projects: <ProjectsIcon />,
  project: <ProjectIcon />,
}

export function buildWorkspaceBreadcrumbs(
  locationState: WorkspaceLocationState | null,
  documentName: string,
) {
  return getWorkspaceBreadcrumbs(locationState, documentName).map(({ icon, ...breadcrumb }) => ({
    ...breadcrumb,
    icon: icon ? breadcrumbIcons[icon] : undefined,
  }))
}
