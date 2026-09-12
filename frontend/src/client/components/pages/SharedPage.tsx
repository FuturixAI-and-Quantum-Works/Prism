import Layout from '../Layout'
import WorkspacesScreen from '../../features/workspaces/WorkspacesFeature'

export default function SharedPage() {
  return (
    <Layout activePage="shared">
      <WorkspacesScreen filter="shared" />
    </Layout>
  )
}
