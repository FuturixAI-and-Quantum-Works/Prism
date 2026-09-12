import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useResponsive } from '../../hooks'
import { useMenuFocus } from '../../hooks/useMenuFocus'
import { sanitizeEditorHtml } from '../../lib/sanitizeHtml'
import { type Template as ApiTemplate, useGetTemplatesQuery } from './templatesApi'
import {
  type TemplateCardModel,
  type TemplateSort,
  selectTemplateCards,
  selectTemplateCategories,
  toTemplateCard,
} from './templateLibraryModel'

export function useTemplateLibrary() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [sortOption, setSortOption] = useState<TemplateSort>('newest')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingTemplate, setViewingTemplate] = useState<ApiTemplate | null>(null)
  const [viewContent, setViewContent] = useState('')
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    template: TemplateCardModel
  } | null>(null)
  const sortRef = useRef<HTMLDivElement>(null)
  const sortButtonRef = useRef<HTMLButtonElement>(null)
  const contextMenuTriggerRef = useRef<HTMLElement | null>(null)
  const sortMenuRef = useMenuFocus({
    open: sortOpen,
    onClose: () => setSortOpen(false),
    onOpen: () => {
      setSortOpen(true)
      setFiltersOpen(false)
    },
    triggerRef: sortButtonRef,
  })
  const contextMenuRef = useMenuFocus({
    open: contextMenu !== null,
    onClose: () => setContextMenu(null),
    triggerRef: contextMenuTriggerRef,
  })

  const {
    data: apiTemplates,
    isLoading,
    isError,
    refetch,
  } = useGetTemplatesQuery({
    type: 'system',
  })
  useEffect(() => {
    if (!viewModalOpen && !sortOpen) return

    const handleEscapeKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setViewModalOpen(false)
        setSortOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscapeKey)
    return () => document.removeEventListener('keydown', handleEscapeKey)
  }, [sortOpen, viewModalOpen])

  useEffect(() => {
    if (!sortOpen && !contextMenu) return

    const handleClickOutside = (event: globalThis.MouseEvent) => {
      const eventPath = event.composedPath()
      if (sortRef.current && !eventPath.includes(sortRef.current)) {
        setSortOpen(false)
      }
      if (
        !eventPath.some(
          (target) => target instanceof Element && target.hasAttribute('data-context-menu'),
        )
      ) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [contextMenu, sortOpen])

  const templates = useMemo(() => (apiTemplates ?? []).map(toTemplateCard), [apiTemplates])
  const categories = useMemo(() => selectTemplateCategories(templates), [templates])
  useEffect(() => {
    const availableCategories = new Set(categories.map((category) => category.id))
    setSelectedCategories((current) => {
      const next = current.filter((categoryId) => availableCategories.has(categoryId))
      return next.length === current.length ? current : next
    })
  }, [categories])
  const filteredTemplates = useMemo(
    () => selectTemplateCards(templates, searchQuery, selectedCategories, sortOption),
    [searchQuery, selectedCategories, sortOption, templates],
  )

  const openContextMenu = (
    trigger: HTMLElement,
    x: number,
    y: number,
    template: TemplateCardModel,
  ) => {
    contextMenuTriggerRef.current = trigger
    setContextMenu({ x, y, template })
  }

  const openPointerContextMenu = (event: MouseEvent<HTMLElement>, template: TemplateCardModel) => {
    event.preventDefault()
    openContextMenu(event.currentTarget, event.clientX, event.clientY, template)
  }

  const openKeyboardContextMenu = (
    event: KeyboardEvent<HTMLElement>,
    template: TemplateCardModel,
  ) => {
    if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    openContextMenu(event.currentTarget, rect.left, rect.bottom, template)
  }

  const openView = (template: ApiTemplate) => {
    setViewingTemplate(template)
    setViewContent(sanitizeEditorHtml(template.contentHtml || ''))
    setViewModalOpen(true)
  }

  return {
    isMobile,
    isLoading,
    isError,
    searchQuery,
    selectedCategories,
    sortOption,
    filtersOpen,
    sortOpen,
    viewModalOpen,
    viewingTemplate,
    viewContent,
    contextMenu,
    templates: filteredTemplates,
    categories,
    refs: { sortRef, sortButtonRef, sortMenuRef, contextMenuRef },
    actions: {
      setSearchQuery,
      setFiltersOpen,
      setSortOpen,
      setViewModalOpen,
      setContextMenu,
      toggleCategory: (categoryId: string) =>
        setSelectedCategories((current) =>
          current.includes(categoryId)
            ? current.filter((id) => id !== categoryId)
            : [...current, categoryId],
        ),
      clearCategories: () => setSelectedCategories([]),
      setSort: (sort: TemplateSort) => {
        setSortOption(sort)
        setSortOpen(false)
      },
      toggleFilters: () => {
        setFiltersOpen((open) => !open)
        setSortOpen(false)
      },
      toggleSort: () => {
        setSortOpen((open) => !open)
        setFiltersOpen(false)
      },
      openPointerContextMenu,
      openKeyboardContextMenu,
      openView,
      retry: refetch,
      previewRoute: (template: ApiTemplate) => navigate(`/template-preview/${template.id}`),
    },
  }
}

export type TemplateLibrarySession = ReturnType<typeof useTemplateLibrary>
