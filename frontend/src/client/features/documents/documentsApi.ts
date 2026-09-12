import { baseApi } from '../../store/api/baseApi'
import './api/documentContentApi'
import './api/documentCoreApi'
import './api/documentGovernanceApi'
import './api/documentSharingApi'
import './api/documentVersionsApi'

export * from './api/documentContentApi'
export * from './api/documentCoreApi'
export * from './api/documentGovernanceApi'
export * from './api/documentSharingApi'
export * from './api/documentVersionsApi'

export const documentsApi = baseApi
