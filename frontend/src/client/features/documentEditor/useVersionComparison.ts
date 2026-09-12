import { useEffect, useMemo, useState } from 'react'
import type { DocumentVersion } from '../documents/api/documentVersionsApi'
import { compareVersionHtml, type VersionComparisonRow } from './versionComparison'

interface UseVersionComparisonInput {
  active: boolean
  currentHtml: string
  currentVersionId: string | null
  documentId: string | undefined
  loadHtml: (input: { documentId: string; versionId: string }) => {
    unwrap: () => Promise<{ html: string }>
  }
  versions: DocumentVersion[]
}

export function useVersionComparison({
  active,
  currentHtml,
  currentVersionId,
  documentId,
  loadHtml,
  versions,
}: UseVersionComparisonInput) {
  const previousVersions = useMemo(
    () => versions.filter((version) => version.id !== currentVersionId),
    [currentVersionId, versions],
  )
  const [rows, setRows] = useState<VersionComparisonRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)

  useEffect(() => {
    if (!active || !documentId || previousVersions.length === 0) {
      if (previousVersions.length === 0) {
        setRows([])
        setSelectedVersionId(null)
      }
      return
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const comparedHtml = currentVersionId
          ? (await loadHtml({ documentId, versionId: currentVersionId }).unwrap()).html
          : currentHtml
        const nextRows: VersionComparisonRow[] = []
        for (const version of previousVersions) {
          const previousHtml = (await loadHtml({ documentId, versionId: version.id }).unwrap()).html
          nextRows.push({ version, ...compareVersionHtml(previousHtml, comparedHtml) })
        }
        if (!cancelled) {
          setRows(nextRows)
          setSelectedVersionId((current) => current ?? nextRows[0]?.version.id ?? null)
        }
      } catch {
        if (!cancelled) setError('Could not compare the saved versions. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [active, currentHtml, currentVersionId, documentId, loadHtml, previousVersions, refreshKey])

  return {
    currentVersion: versions.find((version) => version.id === currentVersionId) ?? null,
    error,
    loading,
    previousVersions,
    refresh: () => setRefreshKey((value) => value + 1),
    rows,
    select: setSelectedVersionId,
    selectedVersionId,
  }
}
