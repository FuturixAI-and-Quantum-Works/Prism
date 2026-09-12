import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import templatePreviewIcon from '../../assets/template-preview-icon.svg'
import templateFileIcon from '../../assets/template-file-icon.svg'
import templateMoreDots from '../../assets/template-more-dots.svg'
import { Button, IconButton } from '../../components/ui/Button'
import { useMenuFocus } from '../../hooks/useMenuFocus'
import { templateFontFamily, type TemplateCardModel } from './templateLibraryModel'

export interface TemplateCardProps {
  template: TemplateCardModel
  apiTemplate: TemplateCardModel['apiTemplate']
  onClick?: () => void
  onContextMenu?: (event: MouseEvent<HTMLButtonElement>) => void
  onContextMenuKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void
  onPreview?: () => void
}

function DropdownMenuItem({
  icon,
  label,
  onClick,
}: {
  icon: string
  label: string
  onClick: () => void
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Button
      role="menuitem"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        height: '40px',
        padding: '10px 12px',
        backgroundColor: isHovered ? '#F7F7F7' : '#FFFFFF',
        border: 'none',
        cursor: 'pointer',
        fontFamily: templateFontFamily,
        transition: 'background-color 0.1s ease',
      }}
    >
      <img src={icon} alt="" style={{ width: '18px', height: '18px' }} />
      <span
        style={{
          fontSize: '14px',
          fontWeight: 510,
          color: '#454545',
          letterSpacing: '-0.7px',
          lineHeight: '16px',
        }}
      >
        {label}
      </span>
    </Button>
  )
}

export function TemplateCard({
  template,
  apiTemplate,
  onClick,
  onContextMenu,
  onContextMenuKeyDown,
  onPreview,
}: TemplateCardProps) {
  const navigate = useNavigate()
  const [isHovered, setIsHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const menuContentRef = useMenuFocus({
    open: menuOpen,
    onClose: () => setMenuOpen(false),
    onOpen: () => setMenuOpen(true),
    triggerRef: menuButtonRef,
  })

  useEffect(() => {
    function handleClickOutside(event: globalThis.MouseEvent) {
      if (menuRef.current && !event.composedPath().includes(menuRef.current)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const handlePreview = () => {
    setMenuOpen(false)
    if (onPreview) {
      onPreview()
      return
    }
    navigate(`/template-preview/${apiTemplate.id}`)
  }

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '11px',
        padding: '10px 11px',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s ease',
        overflow: 'visible',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '197px',
        minHeight: '178px',
        boxSizing: 'border-box',
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsHovered(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsHovered(false)
      }}
    >
      <Button
        aria-label={`Open ${template.title}`}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onKeyDown={onContextMenuKeyDown}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          border: 'none',
          borderRadius: '11px',
          background: 'transparent',
          cursor: 'pointer',
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <div
          style={{
            width: '39px',
            height: '39px',
            borderRadius: '50%',
            backgroundColor: '#EDEDED',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          <div style={{ width: '21px', height: '21px', position: 'relative' }}>
            <img
              src={templateFileIcon}
              alt=""
              style={{
                width: '15.58px',
                height: '20.78px',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
            <span
              style={{
                position: 'absolute',
                top: '55%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '4.68px',
                fontWeight: 700,
                color: '#FFFFFF',
                fontFamily: 'Poppins, sans-serif',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {template.category.label.substring(0, 3).toUpperCase()}
            </span>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 2 }} ref={menuRef}>
          <IconButton
            ref={menuButtonRef}
            label={`More actions for ${template.title}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? `template-actions-${template.id}` : undefined}
            onClick={(event) => {
              event.stopPropagation()
              setMenuOpen(!menuOpen)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #FFFFFF',
              borderRadius: '59px',
              cursor: 'pointer',
              flexShrink: 0,
              opacity: isHovered || menuOpen ? 1 : 0,
              transition: 'opacity 0.15s ease',
              pointerEvents: isHovered || menuOpen ? 'auto' : 'none',
            }}
          >
            <img src={templateMoreDots} alt="" style={{ width: '19px', height: '5px' }} />
          </IconButton>

          {menuOpen && (
            <div
              ref={menuContentRef}
              id={`template-actions-${template.id}`}
              role="menu"
              aria-label={`Actions for ${template.title}`}
              style={{
                position: 'absolute',
                top: '44px',
                right: '0',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                boxShadow: '0px 0px 6.1px rgba(0, 0, 0, 0.14)',
                zIndex: 100,
                minWidth: '150px',
                overflow: 'hidden',
              }}
            >
              <DropdownMenuItem
                icon={templatePreviewIcon}
                label="Preview"
                onClick={handlePreview}
              />
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        <p
          style={{
            margin: 0,
            fontFamily: templateFontFamily,
            fontSize: '14px',
            fontWeight: 510,
            color: '#272727',
            letterSpacing: '-0.7px',
            lineHeight: '16px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {template.title}
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '14px',
            fontWeight: 400,
            color: '#999898',
            letterSpacing: '-0.392px',
            lineHeight: '1.2',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {template.description}
        </p>
      </div>

      <p
        style={{
          margin: 0,
          fontFamily: templateFontFamily,
          fontSize: '14px',
          fontWeight: 510,
          color: '#999898',
          letterSpacing: '-0.7px',
          lineHeight: '16px',
        }}
      >
        {template.createdAt}
      </p>
    </div>
  )
}
