import Layout from '../Layout'
import DocumentsScreen from '../../features/documents/DocumentsFeature'

export default function SharedDocumentsPage() {
  return (
    <Layout activePage="shared-documents">
      <DocumentsScreen isShared={true} />
    </Layout>
  )
}
