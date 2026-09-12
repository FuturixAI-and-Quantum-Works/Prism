import { useCallback, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { bottleneckHighlightPluginKey } from '../../components/bottleneckHighlightPluginKey'
import type { ParsedBottleneck } from './messageParsing'
import { getRejectionFixPrompt } from './commentsModel'
import { findTextMatchesInDoc } from './editorUtilities'

type RejectionComment = Parameters<typeof getRejectionFixPrompt>[0]

function findTextTargetElement(root: HTMLElement, text: string) {
  const normalizedNeedle = text.replace(/\s+/g, ' ').trim().toLowerCase()
  if (!normalizedNeedle) return null

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    const normalizedText = (node.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const exactMatch = normalizedText.includes(normalizedNeedle)
    const partialLongMatch =
      normalizedNeedle.length >= 20 &&
      normalizedText.length >= 20 &&
      normalizedNeedle.includes(normalizedText)
    if (exactMatch || partialLongMatch) {
      const parentElement = node.parentElement
      const blockElement = parentElement?.closest(
        'h1,h2,h3,h4,p,li,td,th,blockquote,section,article,div',
      )
      return (blockElement as HTMLElement | null) || parentElement
    }
    node = walker.nextNode()
  }

  return null
}

function flashCanvasTarget(element: HTMLElement) {
  const previousOutline = element.style.outline
  const previousBackground = element.style.backgroundColor
  const previousTransition = element.style.transition
  element.style.transition = 'background-color 0.2s ease, outline-color 0.2s ease'
  element.style.outline = '2px solid #C83A2D'
  element.style.backgroundColor = '#FFF2F0'
  window.setTimeout(() => {
    element.style.outline = previousOutline
    element.style.backgroundColor = previousBackground
    element.style.transition = previousTransition
  }, 1800)
}

interface UseEditorNavigationOptions {
  editor: Editor | null
  rejectionComment: RejectionComment | null
  setActiveStatusTab: (tab: string) => void
  setActiveTab: (tab: 'canvas' | 'tabular') => void
  setInputText: (text: string) => void
}

export function useEditorNavigation({
  editor,
  rejectionComment,
  setActiveStatusTab,
  setActiveTab,
  setInputText,
}: UseEditorNavigationOptions) {
  const [bottleneckToast, setBottleneckToast] = useState('')
  const [bottleneckMatchIndexes, setBottleneckMatchIndexes] = useState<Record<string, number>>({})
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const goToFlaggedSection = useCallback(() => {
    if (!rejectionComment) return

    setActiveTab('canvas')
    setActiveStatusTab('prism')
    setInputText(getRejectionFixPrompt(rejectionComment))

    window.setTimeout(() => {
      const editorRoot = document.querySelector('.tiptap') as HTMLElement | null
      const scrollRoot = document.querySelector('.tiptap-editor-scroll') as HTMLElement | null
      const candidates = [
        rejectionComment.anchorText,
        rejectionComment.sectionRef,
        rejectionComment.clauseRef,
      ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)

      let targetElement: HTMLElement | null = null
      if (editorRoot) {
        for (const candidate of candidates) {
          targetElement = findTextTargetElement(editorRoot, candidate)
          if (targetElement) break
        }
      }

      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        flashCanvasTarget(targetElement)
      } else {
        scrollRoot?.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }, 160)
  }, [rejectionComment, setActiveStatusTab, setActiveTab, setInputText])

  const scrollAndHighlightBottleneck = useCallback(
    (bottleneck: ParsedBottleneck, matchIndex = 0) => {
      if (!editor) return

      let matches = findTextMatchesInDoc(editor.state.doc, bottleneck.bottleneck)
      if (matches.length === 0 && bottleneck.heading) {
        matches = findTextMatchesInDoc(editor.state.doc, bottleneck.heading)
      }

      if (matches.length === 0) {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
        setBottleneckToast('Could not locate this section in the document')
        toastTimeoutRef.current = setTimeout(() => setBottleneckToast(''), 3000)
        return
      }

      const range = matches[matchIndex] ?? matches[0]
      editor.chain().focus().setTextSelection(range).scrollIntoView().run()
      editor.view.dispatch(
        editor.state.tr.setMeta(bottleneckHighlightPluginKey, {
          from: range.from,
          to: range.to,
          clearAfter: 3000,
        }),
      )
    },
    [editor],
  )

  return {
    bottleneckMatchIndexes,
    bottleneckToast,
    goToFlaggedSection,
    scrollAndHighlightBottleneck,
    setBottleneckMatchIndexes,
  }
}
