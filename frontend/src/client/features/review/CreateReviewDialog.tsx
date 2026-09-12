import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AccessibleDialog } from '../../components/ui/AccessibleDialog'
import { useGetDocumentsQuery } from '../documents/documentsApi'
import { useCreateTabularReviewMutation } from '../../store/api/tabularReviewApi'
import type { Project } from '../../store/types'
import type { Workflow } from '../../store/api/workflowsApi'
import { AddColumnDialog } from './AddColumnDialog'
import {
  COLUMN_PRESETS,
  normalizeColumns,
  reviewFontFamily as fontFamily,
  toApiColumns,
  type ColumnConfig,
} from './reviewModel'

export function CreateReviewDialog({
  open,
  workflows,
  projects,
  onClose,
}: {
  open: boolean
  workflows: Workflow[]
  projects: Project[]
  onClose: () => void
}) {
  const navigate = useNavigate()
  const [createReview, { isLoading: isCreating }] = useCreateTabularReviewMutation()
  const [workflowId, setWorkflowId] = useState('')
  const [title, setTitle] = useState('')
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [columns, setColumns] = useState<ColumnConfig[]>([])
  const [columnModalOpen, setColumnModalOpen] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(['no-project']))
  const { data: allDocuments = [], isLoading: docsLoading } = useGetDocumentsQuery({})

  const groupedDocuments = useMemo(() => {
    const groups: {
      projectId: string | null
      projectName: string
      documents: typeof allDocuments
    }[] = []
    const projectMap = new Map(projects.map((p) => [p.id, p.name]))

    const byProject = new Map<string | null, typeof allDocuments>()
    for (const doc of allDocuments) {
      const pid = doc.project_id || null
      const projectDocuments = byProject.get(pid)
      if (projectDocuments) projectDocuments.push(doc)
      else byProject.set(pid, [doc])
    }

    const projectEntries: Array<[string, typeof allDocuments]> = []
    for (const [projectId, documents] of byProject) {
      if (projectId !== null) projectEntries.push([projectId, documents])
    }
    projectEntries.sort(([a], [b]) =>
      (projectMap.get(a) || '').localeCompare(projectMap.get(b) || ''),
    )

    for (const [pid, docs] of projectEntries) {
      groups.push({
        projectId: pid,
        projectName: projectMap.get(pid) || 'Unknown Project',
        documents: docs,
      })
    }

    const noProjectDocs = byProject.get(null)
    if (noProjectDocs && noProjectDocs.length > 0) {
      groups.push({
        projectId: null,
        projectName: 'No Project',
        documents: noProjectDocs,
      })
    }

    return groups
  }, [allDocuments, projects])

  const toggleProjectExpanded = (projectId: string | null) => {
    const key = projectId || 'no-project'
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleSelectAllInProject = (documents: typeof allDocuments) => {
    const docIds = documents.map((d) => d.id)
    const allSelected = docIds.every((id) => selectedDocIds.includes(id))
    if (allSelected) {
      setSelectedDocIds((prev) => prev.filter((id) => !docIds.includes(id)))
    } else {
      setSelectedDocIds((prev) => [...new Set([...prev, ...docIds])])
    }
  }

  const selectedWorkflow = workflows.find((w) => w.id === workflowId)

  useEffect(() => {
    setSelectedDocIds([])
    if (selectedWorkflow?.columnsConfig) {
      setColumns(normalizeColumns(selectedWorkflow.columnsConfig))
    } else {
      setColumns([])
    }
  }, [workflowId, selectedWorkflow])

  useEffect(() => {
    if (open && groupedDocuments.length > 0) {
      setExpandedProjects(new Set(groupedDocuments.map((g) => g.projectId || 'no-project')))
    }
  }, [open, groupedDocuments])

  if (!open) return null

  const addColumns = (newCols: Omit<ColumnConfig, 'id' | 'width'>[]) => {
    setColumns((prev) => [
      ...prev,
      ...newCols.map((col, idx) => ({
        ...col,
        id: `col-${Date.now()}-${idx}`,
        index: prev.length + idx,
        width: 250,
      })),
    ])
  }

  const create = async () => {
    if (selectedDocIds.length === 0 || columns.length === 0 || isCreating) return
    const created = await createReview({
      title: title.trim() || 'Untitled tabular review',
      workflow_id: workflowId || null,
      document_ids: selectedDocIds,
      columns_config: toApiColumns(columns),
    }).unwrap()
    onClose()
    navigate(`/review/${created.id}`)
  }

  return (
    <>
      <AccessibleDialog
        open={open}
        onClose={onClose}
        labelledBy="create-review-title"
        overlayStyle={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
        contentStyle={{
          width: '760px',
          maxHeight: '86vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 18px 44px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily,
        }}
      >
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #EDEDED' }}>
          <h2
            id="create-review-title"
            style={{ margin: 0, fontSize: '19px', fontWeight: 590, color: '#272727' }}
          >
            New tabular review
          </h2>
          <p style={{ margin: '5px 0 0', color: '#797979', fontSize: '13px' }}>
            Select a workflow, documents, and the columns to extract.
          </p>
        </div>
        <div
          style={{
            padding: '18px 20px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '18px',
            overflow: 'auto',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label
              htmlFor="create-review-name"
              style={{ fontSize: '13px', fontWeight: 590, color: '#454545' }}
            >
              Review title
            </label>
            <input
              id="create-review-name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. NDA comparison"
              style={{
                height: '40px',
                border: '1px solid #EDEDED',
                borderRadius: '8px',
                padding: '0 10px',
                fontFamily,
              }}
            />
            <label
              htmlFor="create-review-workflow"
              style={{ fontSize: '13px', fontWeight: 590, color: '#454545' }}
            >
              Workflow
            </label>
            <select
              id="create-review-workflow"
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value)}
              style={{
                height: '40px',
                border: '1px solid #EDEDED',
                borderRadius: '8px',
                padding: '0 10px',
                fontFamily,
              }}
            >
              <option value="">Select workflow (optional)</option>
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.title}
                </option>
              ))}
            </select>
            <div style={{ border: '1px solid #EDEDED', borderRadius: '8px', overflow: 'hidden' }}>
              <div
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid #EDEDED',
                  fontSize: '13px',
                  fontWeight: 590,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Documents</span>
                {selectedDocIds.length > 0 && (
                  <span style={{ fontSize: '12px', color: '#797979', fontWeight: 400 }}>
                    {selectedDocIds.length} selected
                  </span>
                )}
              </div>
              <div style={{ maxHeight: '260px', overflow: 'auto' }}>
                {docsLoading ? (
                  <div
                    role="status"
                    aria-live="polite"
                    style={{ padding: '16px', color: '#797979', fontSize: '13px' }}
                  >
                    Loading documents...
                  </div>
                ) : allDocuments.length === 0 ? (
                  <div
                    role="status"
                    aria-live="polite"
                    style={{ padding: '16px', color: '#797979', fontSize: '13px' }}
                  >
                    No documents available.
                  </div>
                ) : (
                  groupedDocuments.map((group) => {
                    const groupKey = group.projectId || 'no-project'
                    const isExpanded = expandedProjects.has(groupKey)
                    const groupDocIds = group.documents.map((d) => d.id)
                    const selectedInGroup = groupDocIds.filter((id) =>
                      selectedDocIds.includes(id),
                    ).length
                    const allInGroupSelected = selectedInGroup === group.documents.length

                    return (
                      <div key={groupKey}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 12px',
                            backgroundColor: '#F9FAFB',
                            borderBottom: '1px solid #EDEDED',
                            userSelect: 'none',
                          }}
                        >
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            aria-controls={`project-documents-${groupKey}`}
                            onClick={() => toggleProjectExpanded(group.projectId)}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              padding: 0,
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              textAlign: 'left',
                            }}
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              aria-hidden="true"
                              style={{
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.15s',
                              }}
                            >
                              <path
                                d="M4.5 2.5L8 6L4.5 9.5"
                                stroke="#797979"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 14 14"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M1.5 4C1.5 3.17 2.17 2.5 3 2.5H5.09C5.35 2.5 5.6 2.6 5.79 2.79L6.71 3.71C6.9 3.9 7.15 4 7.41 4H11C11.83 4 12.5 4.67 12.5 5.5V10C12.5 10.83 11.83 11.5 11 11.5H3C2.17 11.5 1.5 10.83 1.5 10V4Z"
                                stroke={group.projectId ? '#8B5CF6' : '#797979'}
                                strokeWidth="1.2"
                              />
                            </svg>
                            <span
                              style={{
                                flex: 1,
                                fontSize: '13px',
                                fontWeight: 590,
                                color: '#454545',
                              }}
                            >
                              {group.projectName}
                            </span>
                            <span style={{ fontSize: '11px', color: '#797979' }}>
                              {selectedInGroup > 0 ? `${selectedInGroup}/` : ''}
                              {group.documents.length}
                            </span>
                          </button>
                          <input
                            type="checkbox"
                            aria-label={`Select all documents in ${group.projectName}`}
                            checked={allInGroupSelected && group.documents.length > 0}
                            onChange={() => toggleSelectAllInProject(group.documents)}
                            style={{ marginLeft: '4px' }}
                          />
                        </div>
                        {isExpanded && (
                          <div id={`project-documents-${groupKey}`}>
                            {group.documents.map((doc) => (
                              <label
                                key={doc.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '8px 12px 8px 36px',
                                  borderBottom: '1px solid #F3F3F3',
                                  cursor: 'pointer',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedDocIds.includes(doc.id)}
                                  onChange={() =>
                                    setSelectedDocIds((prev) =>
                                      prev.includes(doc.id)
                                        ? prev.filter((id) => id !== doc.id)
                                        : [...prev, doc.id],
                                    )
                                  }
                                />
                                <span
                                  style={{
                                    fontSize: '13px',
                                    color: '#454545',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {doc.filename}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 590, color: '#454545' }}>Columns</span>
              <button
                type="button"
                onClick={() => setColumnModalOpen(true)}
                style={{
                  height: '32px',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0 10px',
                  backgroundColor: '#F7F7F7',
                  cursor: 'pointer',
                  fontFamily,
                }}
              >
                Add column
              </button>
            </div>
            <div
              style={{
                border: '1px solid #EDEDED',
                borderRadius: '8px',
                overflow: 'hidden',
                minHeight: '260px',
              }}
            >
              {columns.length === 0 ? (
                <div style={{ padding: '16px', color: '#797979', fontSize: '13px' }}>
                  Add at least one extraction column.
                </div>
              ) : (
                columns.map((column) => (
                  <div
                    key={column.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '10px 12px',
                      borderBottom: '1px solid #F3F3F3',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 590, color: '#272727' }}>
                        {column.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#797979', marginTop: '2px' }}>
                        {column.format}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setColumns((prev) =>
                          prev
                            .filter((c) => c.id !== column.id)
                            .map((c, index) => ({ ...c, index })),
                        )
                      }
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#E53935',
                        cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                addColumns(
                  COLUMN_PRESETS.slice(0, 4).map((preset, index) => ({ ...preset, index })),
                )
              }
              style={{
                height: '34px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#F7F7F7',
                cursor: 'pointer',
                fontFamily,
              }}
            >
              Add starter columns
            </button>
          </div>
        </div>
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #EDEDED',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: '38px',
              border: 'none',
              borderRadius: '9px',
              padding: '0 14px',
              backgroundColor: '#F7F7F7',
              cursor: 'pointer',
              fontFamily,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            aria-busy={isCreating}
            onClick={create}
            disabled={selectedDocIds.length === 0 || columns.length === 0 || isCreating}
            style={{
              height: '38px',
              border: 'none',
              borderRadius: '9px',
              padding: '0 14px',
              backgroundColor: '#272727',
              color: '#FFFFFF',
              cursor:
                selectedDocIds.length === 0 || columns.length === 0 || isCreating
                  ? 'default'
                  : 'pointer',
              opacity: selectedDocIds.length === 0 || columns.length === 0 || isCreating ? 0.45 : 1,
              fontFamily,
            }}
          >
            {isCreating ? 'Creating...' : 'Create review'}
          </button>
        </div>
      </AccessibleDialog>
      <AddColumnDialog
        isOpen={columnModalOpen}
        existingCount={columns.length}
        onClose={() => setColumnModalOpen(false)}
        onAdd={addColumns}
      />
    </>
  )
}
