import { TemplateContextMenu } from './TemplateContextMenu'
import { TemplateDialogs } from './TemplateDialogs'
import { TemplateGrid } from './TemplateGrid'
import { TemplateLibraryToolbar } from './TemplateLibraryToolbar'
import { templateFontFamily } from './templateLibraryModel'
import { useTemplateLibrary } from './useTemplateLibrary'

export default function TemplateLibraryFeature() {
  const session = useTemplateLibrary()

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        fontFamily: templateFontFamily,
      }}
    >
      <TemplateLibraryToolbar session={session} />
      <TemplateGrid session={session} />
      <TemplateDialogs session={session} />
      <TemplateContextMenu session={session} />
    </div>
  )
}
