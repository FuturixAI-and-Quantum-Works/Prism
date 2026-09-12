import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  type Workflow,
  useDeleteWorkflowMutation,
  useGetWorkflowsQuery,
} from '../../store/api/workflowsApi'
import { type RulebookModalState, selectRulebooks } from './rulebookModel'

export function useRulebookListSession() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [rulebookModal, setRulebookModal] = useState<RulebookModalState | null>(null)
  const [reviewWorkflow, setReviewWorkflow] = useState<Workflow | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    workflow: Workflow
  } | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const contextMenuTriggerRef = useRef<HTMLButtonElement | null>(null)
  const { data: workflows = [], isLoading, isError } = useGetWorkflowsQuery({ type: 'tabular' })
  const [deleteWorkflow] = useDeleteWorkflowMutation()
  const filteredWorkflows = useMemo(
    () => selectRulebooks(workflows, searchQuery),
    [searchQuery, workflows],
  )

  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (!(event.target as HTMLElement).closest('[data-context-menu]')) {
        setContextMenu(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!contextMenu) return
    requestAnimationFrame(() => {
      contextMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
    })
  }, [contextMenu])

  const removeWorkflow = async (workflow: Workflow) => {
    if (!workflow.allow_edit) return
    if (!window.confirm(`Delete "${workflow.title}"?`)) return
    await deleteWorkflow(workflow.id).unwrap()
  }

  const openPointerContextMenu = (event: MouseEvent<HTMLDivElement>, workflow: Workflow) => {
    event.preventDefault()
    contextMenuTriggerRef.current = event.currentTarget.querySelector('button')
    setContextMenu({ x: event.clientX, y: event.clientY, workflow })
  }

  const openKeyboardContextMenu = (event: KeyboardEvent<HTMLDivElement>, workflow: Workflow) => {
    if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return
    event.preventDefault()
    const trigger =
      event.target instanceof HTMLButtonElement
        ? event.target
        : event.currentTarget.querySelector<HTMLButtonElement>('button')
    contextMenuTriggerRef.current = trigger
    const rect = trigger?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect()
    setContextMenu({ x: rect.left, y: rect.bottom, workflow })
  }

  const handleContextMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setContextMenu(null)
      requestAnimationFrame(() => contextMenuTriggerRef.current?.focus())
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
    )
    if (items.length === 0) return
    event.preventDefault()
    const currentIndex = Math.max(0, items.indexOf(document.activeElement as HTMLButtonElement))
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowDown'
            ? (currentIndex + 1) % items.length
            : (currentIndex - 1 + items.length) % items.length
    items[nextIndex].focus()
  }

  const focusContextTrigger = () => contextMenuTriggerRef.current?.focus()

  return {
    searchQuery,
    rulebookModal,
    reviewWorkflow,
    contextMenu,
    workflows: filteredWorkflows,
    isLoading,
    isError,
    refs: { contextMenuRef },
    actions: {
      setSearchQuery,
      setRulebookModal,
      setReviewWorkflow,
      setContextMenu,
      removeWorkflow,
      openPointerContextMenu,
      openKeyboardContextMenu,
      handleContextMenuKeyDown,
      focusContextTrigger,
      openCreatedReview: (reviewId: string) => navigate(`/review/${reviewId}`),
    },
  }
}

export type RulebookListSession = ReturnType<typeof useRulebookListSession>
