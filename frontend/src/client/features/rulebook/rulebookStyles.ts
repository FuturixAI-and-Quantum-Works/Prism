import type { CSSProperties } from 'react'
import { rulebookFontFamily } from './rulebookModel'

export const rulebookInputStyle: CSSProperties = {
  height: '38px',
  boxSizing: 'border-box',
  border: '1px solid #E8E8E8',
  borderRadius: '8px',
  padding: '0 10px',
  fontFamily: rulebookFontFamily,
  fontSize: '14px',
  color: '#333333',
  outline: 'none',
  backgroundColor: '#FFFFFF',
}

export const rulebookLabelStyle: CSSProperties = {
  fontSize: '12px',
  fontWeight: 590,
  color: '#454545',
}

export function rulebookTabStyle(active: boolean): CSSProperties {
  return {
    height: '28px',
    border: 'none',
    borderRadius: '7px',
    padding: '0 10px',
    backgroundColor: active ? '#FFFFFF' : 'transparent',
    color: active ? '#272727' : '#797979',
    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
    cursor: 'pointer',
    fontFamily: rulebookFontFamily,
    fontSize: '13px',
  }
}

export function primaryRulebookActionStyle(disabled: boolean): CSSProperties {
  return {
    height: '36px',
    border: 'none',
    borderRadius: '8px',
    padding: '0 14px',
    backgroundColor: '#272727',
    color: '#FFFFFF',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    fontFamily: rulebookFontFamily,
  }
}

export function secondaryRulebookActionStyle(disabled: boolean): CSSProperties {
  return {
    height: '36px',
    border: 'none',
    borderRadius: '8px',
    padding: '0 14px',
    backgroundColor: '#F7F7F7',
    color: '#272727',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    fontFamily: rulebookFontFamily,
  }
}

export function miniRulebookButtonStyle(disabled: boolean): CSSProperties {
  return {
    height: '28px',
    border: 'none',
    borderRadius: '7px',
    padding: '0 9px',
    backgroundColor: '#F7F7F7',
    color: '#454545',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    fontFamily: rulebookFontFamily,
    fontSize: '12px',
  }
}
