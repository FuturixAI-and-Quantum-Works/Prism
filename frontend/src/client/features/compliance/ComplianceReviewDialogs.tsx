import { useNavigate } from 'react-router-dom'
import BrowseFilesModal from '../files/BrowseFilesDialog'
import FilePreviewModal from '../../components/FilePreviewModal'
import { ReviewSetupChoiceDialog } from './ReviewSetupChoiceDialog'
import { RulebookPickerDialog } from './RulebookPickerDialog'
import type { ComplianceParameters } from './useComplianceParameters'
import type { ComplianceSources } from './useComplianceSources'

interface ComplianceReviewDialogsProps {
  sources: ComplianceSources['dialogs']
  parameters: ComplianceParameters['dialogs']
}

export function ComplianceReviewDialogs({ sources, parameters }: ComplianceReviewDialogsProps) {
  const navigate = useNavigate()

  return (
    <>
      <input
        ref={sources.fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp,.bmp"
        style={{ display: 'none' }}
        onChange={sources.upload}
      />
      <input
        ref={(input) => {
          sources.folderInputRef.current = input
          input?.setAttribute('webkitdirectory', '')
        }}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={sources.upload}
      />

      <BrowseFilesModal
        isOpen={sources.browseFilesOpen}
        files={sources.browseFiles}
        error={sources.error}
        onClose={sources.closeBrowse}
        onImport={() => sources.fileInputRef.current?.click()}
        onUploadFolder={() => sources.folderInputRef.current?.click()}
        onSelectFile={sources.select}
        onDeleteFiles={sources.deleteFiles}
        onRenameFile={sources.renameFile}
      />
      <FilePreviewModal
        file={sources.previewFile}
        onClose={sources.closePreview}
        onEdit={(file) => navigate(`/documents/${file.id}`)}
      />

      <RulebookPickerDialog
        open={parameters.rulebookPickerOpen}
        onClose={() => parameters.setRulebookPickerOpen(false)}
        onSelect={parameters.selectRulebook}
        onAddEmpty={() => {
          void parameters.addEmptyRule()
        }}
      />
      <RulebookPickerDialog
        open={parameters.questionRulebookPickerOpen}
        onClose={() => parameters.setQuestionRulebookPickerOpen(false)}
        onSelect={parameters.selectRulebookForQuestions}
        onAddEmpty={() => {
          void parameters.addEmptyQuestion()
        }}
        title="Select Rulebook"
        subtitle="Choose a rulebook to add its questions"
        emptyButtonLabel="Add Empty Question"
        accentColor="#247BFF"
        itemLabel="questions"
      />
      <ReviewSetupChoiceDialog
        open={parameters.reviewSetupChoiceOpen}
        onClose={() => parameters.setReviewSetupChoiceOpen(false)}
        onSelectPreset={() => parameters.chooseSetup('preset')}
        onSelectBlank={() => parameters.chooseSetup('blank')}
      />
    </>
  )
}
