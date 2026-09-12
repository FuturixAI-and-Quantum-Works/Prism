import askPrismIcon from '../../assets/ask-prism-icon.svg'
import copyIcon from '../../assets/copy-icon.svg'
import exportIcon from '../../assets/export-icon.svg'
import pencilEditIcon from '../../assets/pencil-edit-icon.svg'
import projectOpenIcon from '../../assets/project-open-icon.svg'
import shareIcon from '../../assets/share-icon.svg'
import trashIcon from '../../assets/trash-icon.svg'
import type { DocumentAction } from './documentLibraryModel'

export interface DocumentActionOption {
  id: DocumentAction
  label: string
  icon: string
  danger?: boolean
}

export const documentActionOptions: DocumentActionOption[] = [
  { id: 'open', label: 'Open in Editor', icon: projectOpenIcon },
  { id: 'ask', label: 'Ask Prism', icon: askPrismIcon },
  { id: 'rename', label: 'Rename', icon: pencilEditIcon },
  { id: 'duplicate', label: 'Duplicate', icon: copyIcon },
  { id: 'export', label: 'Export', icon: exportIcon },
  { id: 'share', label: 'Share', icon: shareIcon },
  { id: 'delete', label: 'Delete', icon: trashIcon, danger: true },
]
