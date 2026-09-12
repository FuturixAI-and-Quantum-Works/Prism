import fileTypeDocx from '../../assets/file-types/docx.png'
import fileTypePdf from '../../assets/file-types/pdf.png'
import { DefaultFileIcon } from '../../components/FileTypeIcon'

export function DocumentsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M9 1H4C3.46957 1 2.96086 1.21071 2.58579 1.58579C2.21071 1.96086 2 2.46957 2 3V13C2 13.5304 2.21071 14.0391 2.58579 14.4142C2.96086 14.7893 3.46957 15 4 15H12C12.5304 15 13.0391 14.7893 13.4142 14.4142C13.7893 14.0391 14 13.5304 14 13V6L9 1Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 1V6H14"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function RulebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M1.5 2.25C1.5 2.25 3 1.5 6 1.5C9 1.5 10.5 2.25 10.5 2.25V15.75C10.5 15.75 9 15 6 15C3 15 1.5 15.75 1.5 15.75V2.25Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 2.25C10.5 2.25 12 1.5 15 1.5C18 1.5 16.5 2.25 16.5 2.25V15.75C16.5 15.75 15 15 12 15C9 15 10.5 15.75 10.5 15.75V2.25Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function AnalysisIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M8 4V8L10.5 10.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ActivityIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M15 9C15 12.3137 12.3137 15 9 15C5.68629 15 3 12.3137 3 9C3 5.68629 5.68629 3 9 3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M12 3L15 6L18 3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(-3, 0)"
      />
    </svg>
  )
}

export function GridTableIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      {[2, 11].flatMap((x) =>
        [2, 11].map((y) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width="5"
            height="5"
            rx="1"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        )),
      )}
    </svg>
  )
}

export function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="3" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 7H16" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12 1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

export function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M3 15.5C3 12.7386 5.23858 10.5 8 10.5H10C12.7614 10.5 15 12.7386 15 15.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function StatusIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 19 19" fill="none">
      <circle cx="9.5" cy="9.5" r="7" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M6.5 9.5L8.5 11.5L12.5 7.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function MembersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M1 14C1 11.7909 2.79086 10 5 10H7C9.20914 10 11 11.7909 11 14"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M10 10H13C15.2091 10 17 11.7909 17 14"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function FileAddIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 13.5 14.8334" fill="none">
      <path
        d="M7.41667 0.750001H7.59848C9.77262 0.750001 10.8597 0.750001 11.6146 1.28189C11.8309 1.43429 12.0229 1.61502 12.1849 1.81859C12.75 2.52912 12.75 3.55224 12.75 5.59849V7.29545C12.75 9.2709 12.75 10.2586 12.4374 11.0475C11.9348 12.3157 10.8719 13.3161 9.52443 13.7891C8.68625 14.0833 7.63679 14.0833 5.53788 14.0833C4.3385 14.0833 3.73881 14.0833 3.25985 13.9152C2.48986 13.6449 1.8825 13.0733 1.59531 12.3486C1.41667 11.8978 1.41667 11.3334 1.41667 10.2045V7.41667"
        stroke="#454545"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.75 7.41667C12.75 8.64397 11.7551 9.63889 10.5278 9.63889C10.0839 9.63889 9.56064 9.56112 9.12909 9.67675C8.74565 9.77949 8.44616 10.079 8.34342 10.4624C8.22778 10.894 8.30556 11.4173 8.30556 11.8611C8.30556 13.0884 7.31063 14.0833 6.08333 14.0833"
        stroke="#454545"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.08333 3.41667L0.75 3.41667M3.41667 0.750001V6.08333"
        stroke="#454545"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M14 3.98667C11.78 3.76667 9.54667 3.65333 7.32 3.65333C6 3.65333 4.68 3.72 3.36 3.85333L2 3.98667"
        stroke="#454545"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.66667 3.31333L5.81333 2.44C5.92 1.80667 6 1.33333 7.12667 1.33333H8.87333C10 1.33333 10.0867 1.83333 10.1867 2.44667L10.3333 3.31333"
        stroke="#454545"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5667 6.09333L12.1333 12.8067C12.06 13.8533 12 14.6667 10.14 14.6667H5.86C4 14.6667 3.94 13.8533 3.86667 12.8067L3.43333 6.09333"
        stroke="#454545"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.88667 11H9.10667"
        stroke="#454545"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.33333 8.33333H9.66667"
        stroke="#454545"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8.84 2.4L3.36667 8.19333C3.16 8.41333 2.96 8.84667 2.92 9.14667L2.67333 11.3067C2.58667 12.0867 3.14667 12.62 3.92 12.4867L6.06667 12.12C6.36667 12.0667 6.78667 11.8467 6.99333 11.62L12.4667 5.82667C13.4133 4.82667 13.84 3.68667 12.3667 2.29333C10.9 0.913333 9.78667 1.4 8.84 2.4Z"
        stroke="#454545"
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.92667 3.36667C8.21333 5.20667 9.70667 6.61333 11.56 6.8"
        stroke="#454545"
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 14.6667H14"
        stroke="#454545"
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M14.6667 1.33334H1.33333L6.66667 7.60668V12L9.33333 13.3333V7.60668L14.6667 1.33334Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SortIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M2 8H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M2 12H6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12 6V14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path
        d="M10 12L12 14L14 12"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function FileTypeIcon({
  extension,
  mimeType,
}: {
  extension?: string | null
  mimeType?: string | null
}) {
  const ext = extension?.toLowerCase() || ''
  const mime = mimeType?.toLowerCase() || ''
  if (ext === 'docx' || ext === 'doc' || mime.includes('word')) {
    return (
      <img
        src={fileTypeDocx}
        alt="DOCX"
        style={{ width: '20px', height: '20px', objectFit: 'contain' }}
      />
    )
  }
  if (ext === 'pdf' || mime.includes('pdf')) {
    return (
      <img
        src={fileTypePdf}
        alt="PDF"
        style={{ width: '20px', height: '20px', objectFit: 'contain' }}
      />
    )
  }
  return <DefaultFileIcon />
}

export function CheckboxIcon({ checked }: { checked: boolean }) {
  return checked ? (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="1" width="16" height="16" rx="3" fill="#F36A33" />
      <path
        d="m5 9 2.5 2.5L13 6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect
        x="1"
        y="1"
        width="16"
        height="16"
        rx="3"
        fill="#EDEDED"
        stroke="#EDEDED"
        strokeWidth="1"
      />
    </svg>
  )
}

export function ActivityTypeIcon({ action }: { action: string }) {
  const iconStyle = { width: '18px', height: '18px', flexShrink: 0 }

  switch (action) {
    case 'file_uploaded':
      return (
        <svg style={iconStyle} viewBox="0 0 18 18" fill="none">
          <path
            d="M9 12V3M9 3L5 7M9 3L13 7"
            stroke="#22C55E"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M3 15H15" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case 'files_copied':
      return (
        <svg style={iconStyle} viewBox="0 0 18 18" fill="none">
          <rect x="6" y="6" width="9" height="10" rx="1.5" stroke="#3B82F6" strokeWidth="1.5" />
          <path
            d="M12 6V4.5C12 3.67 11.33 3 10.5 3H4.5C3.67 3 3 3.67 3 4.5V12.5C3 13.33 3.67 14 4.5 14H6"
            stroke="#3B82F6"
            strokeWidth="1.5"
          />
        </svg>
      )
    case 'file_moved_out':
    case 'folder_moved_out':
      return (
        <svg style={iconStyle} viewBox="0 0 18 18" fill="none">
          <path
            d="M12 9H3M12 9L9 6M12 9L9 12"
            stroke="#F59E0B"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M15 4V14" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case 'file_moved_in':
    case 'folder_moved_in':
      return (
        <svg style={iconStyle} viewBox="0 0 18 18" fill="none">
          <path
            d="M6 9H15M6 9L9 6M6 9L9 12"
            stroke="#22C55E"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M3 4V14" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case 'folder_created':
      return (
        <svg style={iconStyle} viewBox="0 0 18 18" fill="none">
          <path
            d="M2 5.5C2 4.67 2.67 4 3.5 4H6.59C6.85 4 7.1 4.1 7.29 4.29L8.41 5.41C8.6 5.6 8.85 5.7 9.11 5.7H14.5C15.33 5.7 16 6.37 16 7.2V13.5C16 14.33 15.33 15 14.5 15H3.5C2.67 15 2 14.33 2 13.5V5.5Z"
            stroke="#8B5CF6"
            strokeWidth="1.5"
          />
          <path d="M9 9V13M7 11H11" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case 'folder_deleted':
      return (
        <svg style={iconStyle} viewBox="0 0 18 18" fill="none">
          <path
            d="M2 5.5C2 4.67 2.67 4 3.5 4H6.59C6.85 4 7.1 4.1 7.29 4.29L8.41 5.41C8.6 5.6 8.85 5.7 9.11 5.7H14.5C15.33 5.7 16 6.37 16 7.2V13.5C16 14.33 15.33 15 14.5 15H3.5C2.67 15 2 14.33 2 13.5V5.5Z"
            stroke="#EF4444"
            strokeWidth="1.5"
          />
          <path d="M7 11H11" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case 'workspace_created':
      return (
        <svg style={iconStyle} viewBox="0 0 18 18" fill="none">
          <rect x="2" y="3" width="14" height="12" rx="2" stroke="#22C55E" strokeWidth="1.5" />
          <path d="M9 7V11M7 9H11" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case 'workspace_updated':
      return (
        <svg style={iconStyle} viewBox="0 0 18 18" fill="none">
          <rect x="2" y="3" width="14" height="12" rx="2" stroke="#3B82F6" strokeWidth="1.5" />
          <path
            d="M6 9L8 11L12 7"
            stroke="#3B82F6"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'member_invited':
    case 'member_upserted':
      return (
        <svg style={iconStyle} viewBox="0 0 18 18" fill="none">
          <circle cx="7" cy="6" r="2.5" stroke="#8B5CF6" strokeWidth="1.5" />
          <path
            d="M2 15C2 12.24 4.24 10 7 10C8.04 10 9 10.32 9.8 10.86"
            stroke="#8B5CF6"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M13 11V15M11 13H15" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case 'member_removed':
      return (
        <svg style={iconStyle} viewBox="0 0 18 18" fill="none">
          <circle cx="7" cy="6" r="2.5" stroke="#EF4444" strokeWidth="1.5" />
          <path
            d="M2 15C2 12.24 4.24 10 7 10C8.04 10 9 10.32 9.8 10.86"
            stroke="#EF4444"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M11 13H15" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    default:
      return (
        <svg style={iconStyle} viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="6" stroke="#9CA3AF" strokeWidth="1.5" />
          <path d="M9 6V10" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="9" cy="12.5" r="0.75" fill="#9CA3AF" />
        </svg>
      )
  }
}
