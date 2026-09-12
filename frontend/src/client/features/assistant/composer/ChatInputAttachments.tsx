import docxIcon from '../../../assets/file-types/docx.png'
import pdfIcon from '../../../assets/file-types/pdf.png'
import type { AttachedFile } from './ChatInputConfig'
import { IconButton } from '../../../components/ui/Button'

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const getFileIcon = (type: string, filename?: string) => {
  const ext = filename?.split('.').pop()?.toLowerCase() || ''
  const isPdf = type === 'application/pdf' || type.includes('pdf') || ext === 'pdf'
  const isDoc =
    type.includes('word') ||
    type.includes('document') ||
    type === 'application/msword' ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'doc' ||
    ext === 'docx'

  if (isPdf) {
    return <img src={pdfIcon} alt="PDF" style={{ width: '21px', height: '21px' }} />
  }

  if (isDoc) {
    return <img src={docxIcon} alt="DOC" style={{ width: '21px', height: '21px' }} />
  }

  return (
    <svg width="21" height="21" viewBox="0 0 21 21" fill="none">
      <rect width="21" height="21" rx="4" fill="#757575" />
      <text
        x="50%"
        y="55%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="white"
        fontSize="11"
        fontWeight="600"
        fontFamily="Arial, sans-serif"
      >
        F
      </text>
    </svg>
  )
}

const FileCloseIcon = () => (
  <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
    <circle cx="17" cy="17" r="17" />
    <path
      d="M22 12L12 22M12 12L22 22"
      stroke="#454545"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

interface AttachedDocumentProps {
  file: AttachedFile
  onRemove: () => void
}

const isImageFile = (type: string, name?: string): boolean => {
  if (type.startsWith('image/')) return true
  const ext = name?.split('.').pop()?.toLowerCase() || ''
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)
}

export const AttachedDocument = ({ file, onRemove }: AttachedDocumentProps) => {
  const isImage = isImageFile(file.type, file.name)
  const hasPreview = isImage && file.previewUrl

  if (hasPreview) {
    return (
      <div
        style={{
          position: 'relative',
          width: '80px',
          height: '80px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #EDEDED',
        }}
      >
        <img
          src={file.previewUrl!}
          alt={file.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        <IconButton
          label={`Remove ${file.name}`}
          onClick={onRemove}
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '20px',
            height: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M8 2L2 8M2 2L8 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </IconButton>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 14px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #EDEDED',
        borderRadius: '9px',
        height: '43px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '21px',
          height: '21px',
          flexShrink: 0,
        }}
      >
        {getFileIcon(file.type, file.name)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 510,
            color: '#454545',
            letterSpacing: '-0.7px',
            lineHeight: '16px',
            maxWidth: '180px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {file.name}
        </span>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 510,
            color: '#999999',
            letterSpacing: '-0.6px',
            lineHeight: '16px',
          }}
        >
          {formatFileSize(file.size)}
        </span>
      </div>
      <IconButton
        label={`Remove ${file.name}`}
        onClick={onRemove}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '34px',
          height: '34px',
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          padding: 0,
          marginLeft: 'auto',
        }}
      >
        <FileCloseIcon />
      </IconButton>
    </div>
  )
}

export const AttachedDocumentPreviewBox = ({
  file,
  onRemove,
  size = 'default',
}: AttachedDocumentProps & { size?: 'default' | 'small' }) => {
  const isImage = isImageFile(file.type, file.name)
  const hasPreview = isImage && file.previewUrl
  const isSmall = size === 'small'
  const boxSize = isSmall ? '80px' : '120px'
  const borderRadius = isSmall ? '10px' : '16px'
  const innerRadius = isSmall ? '8px' : '14px'
  const closeButtonSize = isSmall ? '18px' : '22px'
  const closeButtonOffset = isSmall ? '-8px' : '-10px'

  return (
    <div
      style={{
        width: boxSize,
        height: boxSize,
        backgroundColor: '#FFFFFF',
        border: '2px dashed #DEDEDE',
        borderRadius,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isSmall ? '6px' : '12px',
        position: 'relative',
      }}
    >
      <IconButton
        label={`Remove ${file.name}`}
        onClick={onRemove}
        style={{
          position: 'absolute',
          top: closeButtonOffset,
          right: closeButtonOffset,
          width: closeButtonSize,
          height: closeButtonSize,
          backgroundColor: '#FFFFFF',
          border: '2px solid #E0E0E0',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666666',
          zIndex: 10,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          transition: 'background-color 0.15s ease, border-color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#FEE2E2'
          e.currentTarget.style.borderColor = '#DC2626'
          e.currentTarget.style.color = '#DC2626'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#FFFFFF'
          e.currentTarget.style.borderColor = '#E0E0E0'
          e.currentTarget.style.color = '#666666'
        }}
      >
        <svg
          width={isSmall ? '8' : '10'}
          height={isSmall ? '8' : '10'}
          viewBox="0 0 10 10"
          fill="none"
        >
          <path
            d="M8 2L2 8M2 2L8 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </IconButton>

      {hasPreview ? (
        <img
          src={file.previewUrl!}
          alt={file.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: innerRadius,
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      ) : (
        <>
          {getFileIcon(file.type, file.name)}
          <span
            style={{
              fontSize: isSmall ? '10px' : '11px',
              fontWeight: 510,
              color: '#454545',
              textAlign: 'center',
              padding: '0 8px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: isSmall ? '70px' : '100px',
            }}
          >
            {file.name}
          </span>
        </>
      )}
    </div>
  )
}
