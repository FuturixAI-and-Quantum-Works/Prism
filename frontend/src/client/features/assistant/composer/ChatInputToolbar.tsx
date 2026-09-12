import type { CSSProperties, KeyboardEvent, RefObject } from 'react'
import create from '../../../assets/create.svg'
import send from '../../../assets/send.svg'
import type { AddOption } from './ChatInputConfig'
import { Button, IconButton } from '../../../components/ui/Button'

const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif'

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 5V19M5 12H19"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const MagicIcon = () => <img src={create} alt="" style={{ width: '16px', height: '16px' }} />

const SparkleIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z" />
    <path d="M19 15L20 17L22 18L20 19L19 21L18 19L16 18L18 17L19 15Z" />
    <path d="M5 3L6 5L8 6L6 7L5 9L4 7L2 6L4 5L5 3Z" />
  </svg>
)

interface ChatInputToolbarProps {
  value: string
  onSend: () => void
  isSending: boolean
  disabled: boolean
  addOptions: readonly AddOption[]
  isAddDropdownOpen: boolean
  addDropdownRef: RefObject<HTMLDivElement | null>
  addTriggerRef: RefObject<HTMLButtonElement | null>
  addDropdownId: string
  onToggleAddDropdown: () => void
  onCloseAddDropdown: () => void
  onAddOptionSelect: (option: AddOption) => void
  showCreateButton: boolean
  onCreateClick?: () => void
  createActive: boolean
  showImprovePrompt: boolean
  onImprovePrompt?: (text: string) => Promise<void>
  isImprovingPrompt: boolean
  dropdownPositionStyle: CSSProperties
  onMenuKeyDown: (event: KeyboardEvent<HTMLDivElement>, closeMenu: () => void) => void
}

export function ChatInputToolbar({
  value,
  onSend,
  isSending,
  disabled,
  addOptions,
  isAddDropdownOpen,
  addDropdownRef,
  addTriggerRef,
  addDropdownId,
  onToggleAddDropdown,
  onCloseAddDropdown,
  onAddOptionSelect,
  showCreateButton,
  onCreateClick,
  createActive,
  showImprovePrompt,
  onImprovePrompt,
  isImprovingPrompt,
  dropdownPositionStyle,
  onMenuKeyDown,
}: ChatInputToolbarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        alignSelf: 'stretch',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {addOptions.length > 0 && (
          <div ref={addDropdownRef} style={{ position: 'relative' }}>
            <IconButton
              ref={addTriggerRef}
              label="Add to message"
              aria-haspopup="menu"
              aria-expanded={isAddDropdownOpen}
              aria-controls={addDropdownId}
              onClick={onToggleAddDropdown}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                padding: 0,
                backgroundColor: isAddDropdownOpen ? '#F0F0F0' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                color: '#454545',
              }}
            >
              <PlusIcon />
            </IconButton>

            {isAddDropdownOpen && (
              <div
                id={addDropdownId}
                role="menu"
                aria-label="Add to message"
                onKeyDown={(event) => onMenuKeyDown(event, onCloseAddDropdown)}
                style={{
                  position: 'absolute',
                  left: '0',
                  ...dropdownPositionStyle,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #F7F7F7',
                  borderRadius: '8px',
                  boxShadow: '0px 0px 11.5px rgba(0, 0, 0, 0.24)',
                  minWidth: '170px',
                  zIndex: 100,
                  overflow: 'hidden',
                }}
              >
                {addOptions.map((option) => (
                  <Button
                    role="menuitem"
                    key={option.id}
                    onClick={() => onAddOptionSelect(option)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      height: '40px',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      backgroundColor: '#FFFFFF',
                      transition: 'background-color 0.15s ease',
                      width: '100%',
                      border: 'none',
                      textAlign: 'left',
                      fontFamily,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F5F5F5'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF'
                    }}
                  >
                    <img src={option.icon} alt="" style={{ width: '14px', height: '14px' }} />
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 510,
                        color: '#454545',
                        letterSpacing: '-0.7px',
                        fontFamily,
                      }}
                    >
                      {option.name}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {showCreateButton && (
          <Button
            onClick={onCreateClick}
            aria-pressed={createActive}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#454545',
              fontSize: '14px',
              fontWeight: 510,
              fontFamily,
            }}
          >
            <MagicIcon />
            Create
          </Button>
        )}

        {showImprovePrompt && value.trim().length > 10 && (
          <Button
            onClick={async () => {
              if (onImprovePrompt && !isImprovingPrompt) {
                await onImprovePrompt(value)
              }
            }}
            disabled={isImprovingPrompt}
            aria-busy={isImprovingPrompt}
            title="Improve your prompt with AI"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: isImprovingPrompt ? '#F0F0F0' : '#F7F7F7',
              border: 'none',
              borderRadius: '20px',
              cursor: isImprovingPrompt ? 'not-allowed' : 'pointer',
              color: '#454545',
              fontSize: '13px',
              fontWeight: 510,
              flexShrink: 0,
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isImprovingPrompt) e.currentTarget.style.backgroundColor = '#EFEFEF'
            }}
            onMouseLeave={(e) => {
              if (!isImprovingPrompt) e.currentTarget.style.backgroundColor = '#F7F7F7'
            }}
          >
            {isImprovingPrompt ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 20 20"
                fill="none"
                style={{ animation: 'spin 1s linear infinite' }}
              >
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  stroke="#454545"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="50"
                  strokeDashoffset="20"
                />
              </svg>
            ) : (
              <SparkleIcon />
            )}
            {isImprovingPrompt ? 'Improving...' : 'Improve'}
          </Button>
        )}
      </div>

      <IconButton
        label={isSending ? 'Sending message' : 'Send message'}
        onClick={onSend}
        disabled={disabled || isSending || !value.trim()}
        aria-busy={isSending}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          backgroundColor: value.trim() && !disabled ? '#272727' : '#a3a3a3',
          border: 'none',
          borderRadius: '50%',
          cursor: value.trim() && !disabled && !isSending ? 'pointer' : 'not-allowed',
          flexShrink: 0,
          transition: 'background-color 0.15s ease',
        }}
      >
        {isSending ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            style={{ animation: 'spin 1s linear infinite' }}
          >
            <circle
              cx="10"
              cy="10"
              r="8"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="50"
              strokeDashoffset="20"
            />
          </svg>
        ) : (
          <img
            src={send}
            alt=""
            style={{
              width: '20px',
              height: '20px',
              opacity: value.trim() && !disabled ? 1 : 0.5,
            }}
          />
        )}
      </IconButton>
    </div>
  )
}
