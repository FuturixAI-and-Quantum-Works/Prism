import Layout from '../Layout'
import LibraryDocumentsScreen from '../../features/documents/DocumentsFeature'

export default function LibraryPage() {
  return (
    <Layout activePage="library">
      <LibraryDocumentsScreen />
    </Layout>
  )
}
