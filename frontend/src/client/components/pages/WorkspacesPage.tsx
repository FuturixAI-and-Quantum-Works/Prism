import Layout from '../Layout'
import WorkspacesScreen from '../../features/workspaces/WorkspacesFeature'

export default function WorkspacesPage() {
  return (
    <Layout activePage="projects">
      <WorkspacesScreen filter="owned" />
    </Layout>
  )
}
