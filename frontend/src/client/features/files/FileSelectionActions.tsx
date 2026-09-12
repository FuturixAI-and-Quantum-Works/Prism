import deleteIcon from '../../assets/delete-icon.svg'
import deselectIcon from '../../assets/deselect-icon.svg'
import renameIcon from '../../assets/rename-icon.svg'
import selectAllIcon from '../../assets/select-all-icon.svg'
import tickCircleIcon from '../../assets/tick-circle-icon.svg'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

interface FileSelectionActionsProps {
  busy?: boolean
  selectedCount: number
  singleSelectMode?: boolean
  onConfirm: () => Promise<void>
  onDelete: () => void
  onDeselectAll: () => void
  onRename: () => void
  onSelectAll: () => void
}

export function FileSelectionActions({
  busy = false,
  selectedCount,
  singleSelectMode,
  onConfirm,
  onDelete,
  onDeselectAll,
  onRename,
  onSelectAll,
}: FileSelectionActionsProps) {
  const actions = [
    { icon: renameIcon, label: 'Rename', onClick: onRename },
    { icon: selectAllIcon, label: 'Select All', onClick: onSelectAll },
    { icon: deselectIcon, label: 'Deselect', onClick: onDeselectAll },
    { icon: deleteIcon, label: 'Delete', onClick: onDelete },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            disabled={busy}
            onClick={action.onClick}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              padding: '12px',
              width: '72px',
              cursor: busy ? 'not-allowed' : 'pointer',
              border: 'none',
              background: 'transparent',
              fontFamily,
            }}
          >
            <img src={action.icon} alt="" style={{ width: '24px', height: '24px' }} />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 510,
                color: '#454545',
                textAlign: 'center',
              }}
            >
              {action.label}
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void onConfirm()}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          height: '44px',
          padding: '10px 20px',
          backgroundColor: '#272727',
          border: 'none',
          borderRadius: '12px',
          cursor: busy ? 'not-allowed' : 'pointer',
          opacity: busy ? 0.7 : 1,
          fontSize: '14px',
          fontWeight: 510,
          color: '#FFFFFF',
          fontFamily,
          width: '100%',
        }}
      >
        <img
          src={tickCircleIcon}
          alt=""
          style={{ width: '18px', height: '18px', filter: 'brightness(0) invert(1)' }}
        />
        {busy ? 'Working...' : 'Confirm Selection'}{' '}
        {!singleSelectMode ? `(${selectedCount} file${selectedCount !== 1 ? 's' : ''})` : ''}
      </button>
    </div>
  )
}
