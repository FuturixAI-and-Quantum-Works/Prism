import docxFileIcon from '../assets/file-types/docx.png'
import pdfFileIcon from '../assets/file-types/pdf.png'

interface FileTypeIconProps {
  filename: string
  size?: string
}

export function DefaultFileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
      <path
        d="M9 1H4C3.46957 1 2.96086 1.21071 2.58579 1.58579C2.21071 1.96086 2 2.46957 2 3V13C2 13.5304 2.21071 14.0391 2.58579 14.4142C2.96086 14.7893 3.46957 15 4 15H12C12.5304 15 13.0391 14.7893 13.4142 14.4142C13.7893 14.0391 14 13.5304 14 13V6L9 1Z"
        stroke="#999999"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="#F5F5F5"
      />
      <path
        d="M9 1V6H14"
        stroke="#999999"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function FileTypeIcon({ filename, size = '20px' }: FileTypeIconProps) {
  const extension = filename.split('.').pop()?.toLowerCase() || ''

  if (extension === 'pdf') {
    return (
      <img
        src={pdfFileIcon}
        alt=""
        style={{ width: size, height: size, flexShrink: 0, objectFit: 'contain' }}
      />
    )
  }

  if (extension === 'doc' || extension === 'docx') {
    return (
      <img
        src={docxFileIcon}
        alt=""
        style={{ width: size, height: size, flexShrink: 0, objectFit: 'contain' }}
      />
    )
  }

  return <DefaultFileIcon />
}
