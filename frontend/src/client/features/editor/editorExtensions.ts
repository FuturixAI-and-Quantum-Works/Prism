import { Extension, Mark, mergeAttributes } from '@tiptap/core'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { Plugin } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'
import StarterKit from '@tiptap/starter-kit'
import { bottleneckHighlightPluginKey } from '../../components/bottleneckHighlightPluginKey'

const PreservedDocxStyles = Extension.create({
  name: 'preservedDocxStyles',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'table', 'tableRow', 'tableCell', 'tableHeader'],
        attributes: {
          style: {
            default: null,
            parseHTML: (element) => element.getAttribute('style'),
            renderHTML: (attributes) => {
              if (!attributes.style) return {}
              return { style: attributes.style }
            },
          },
        },
      },
    ]
  },
})

const StyledSpan = Mark.create({
  name: 'styledSpan',
  priority: 1000,

  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => {
          if (!attributes.style) return {}
          return { style: attributes.style }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[style]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0]
  },
})

interface BottleneckHighlightState {
  decorations: DecorationSet
  clearTimeout: ReturnType<typeof setTimeout> | null
}

const BottleneckHighlight = Extension.create({
  name: 'bottleneckHighlight',

  addProseMirrorPlugins() {
    let editorView: EditorView | null = null

    const clearTimer = (timer: ReturnType<typeof setTimeout> | null) => {
      if (timer) clearTimeout(timer)
    }

    return [
      new Plugin<BottleneckHighlightState>({
        key: bottleneckHighlightPluginKey,
        state: {
          init: () => ({
            decorations: DecorationSet.empty,
            clearTimeout: null,
          }),
          apply: (transaction, previous, _oldState, newState) => {
            const meta = transaction.getMeta(bottleneckHighlightPluginKey) as
              { from?: number; to?: number; clear?: boolean; clearAfter?: number } | undefined

            if (transaction.docChanged || meta?.clear) {
              clearTimer(previous.clearTimeout)
              return {
                decorations: DecorationSet.empty,
                clearTimeout: null,
              }
            }

            if (!meta) return previous

            const from = Number(meta.from)
            const to = Number(meta.to)
            if (!Number.isInteger(from) || !Number.isInteger(to) || from >= to) return previous

            clearTimer(previous.clearTimeout)
            const decorations = DecorationSet.create(newState.doc, [
              Decoration.inline(from, to, { class: 'bottleneck-highlight' }),
            ])
            const clearTimeout =
              meta.clearAfter && meta.clearAfter > 0
                ? setTimeout(() => {
                    if (!editorView) return
                    editorView.dispatch(
                      editorView.state.tr.setMeta(bottleneckHighlightPluginKey, { clear: true }),
                    )
                  }, meta.clearAfter)
                : null

            return { decorations, clearTimeout }
          },
        },
        props: {
          decorations(state) {
            return bottleneckHighlightPluginKey.getState(state)?.decorations ?? DecorationSet.empty
          },
        },
        view(view) {
          editorView = view
          return {
            destroy() {
              const state = bottleneckHighlightPluginKey.getState(view.state)
              clearTimer(state?.clearTimeout ?? null)
              editorView = null
            },
          }
        },
      }),
    ]
  },
})

export function createEditorExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
    }),
    Underline,
    Placeholder.configure({ placeholder }),
    TextAlign.configure({
      types: ['heading', 'paragraph', 'tableCell', 'tableHeader'],
    }),
    Highlight.configure({
      multicolor: true,
    }),
    Link.configure({
      openOnClick: false,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    PreservedDocxStyles,
    StyledSpan,
    BottleneckHighlight,
  ]
}
