/**
 * @swagger
 * /documents:
 *   get:
 *     tags: [Documents]
 *     summary: List user's documents
 *     description: Returns documents owned by the user, or project documents when project_id is provided.
 *     parameters:
 *       - in: query
 *         name: project_id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional project ID to scope documents.
 *     responses:
 *       200:
 *         description: List of documents
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DocumentListResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /documents:
 *   post:
 *     tags: [Documents]
 *     summary: Create a blank document
 *     description: Creates an empty DOCX document that can optionally be linked to a project.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DocumentCreateRequest'
 *     responses:
 *       201:
 *         description: Document created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       400:
 *         description: Invalid file or unsupported file type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /documents/upload:
 *   post:
 *     tags: [Documents]
 *     summary: Upload a document
 *     description: Uploads a document (PDF, DOCX, DOC, TXT, RTF, ODT) or image (JPG, JPEG, PNG, WEBP, BMP). project_id and folder_id are optional multipart fields.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/DocumentUploadRequest'
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       400:
 *         description: Invalid file or unsupported file type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /documents/{documentId}:
 *   delete:
 *     tags: [Documents]
 *     summary: Delete a document
 *     description: Deletes a document and all its versions from storage
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The document ID
 *     responses:
 *       204:
 *         description: Document deleted successfully
 *       404:
 *         description: Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /documents/{documentId}:
 *   patch:
 *     tags: [Documents]
 *     summary: Update document metadata
 *     description: Renames a document, links/unlinks it from a project, or moves it to a project folder.
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DocumentUpdateRequest'
 *     responses:
 *       200:
 *         description: Document updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       404:
 *         description: Document, project, or folder not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /documents/{documentId}/display:
 *   get:
 *     tags: [Documents]
 *     summary: Get document for display
 *     description: Returns the document content for rendering in the viewer. For DOCX files, returns PDF rendition if available.
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The document ID
 *       - in: query
 *         name: version_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional version ID to display a historical version
 *     responses:
 *       200:
 *         description: Document content
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           application/vnd.openxmlformats-officedocument.wordprocessingml.document:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /documents/download-zip:
 *   post:
 *     tags: [Documents]
 *     summary: Download multiple documents as ZIP
 *     description: Creates a ZIP archive containing the specified documents
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [document_ids]
 *             properties:
 *               document_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of document IDs to include in the ZIP
 *     responses:
 *       200:
 *         description: ZIP file containing the documents
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: document_ids is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No documents found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /documents/{documentId}/url:
 *   get:
 *     tags: [Documents]
 *     summary: Get signed download URL
 *     description: Returns a signed URL for downloading the document
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The document ID
 *       - in: query
 *         name: version_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional version ID to download a specific version
 *     responses:
 *       200:
 *         description: Signed download URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   format: uri
 *                 document_id:
 *                   type: string
 *                   format: uuid
 *                 filename:
 *                   type: string
 *                 version_id:
 *                   type: string
 *                   format: uuid
 *                 has_pdf_rendition:
 *                   type: boolean
 *       404:
 *         description: Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         description: Storage not configured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /documents/{documentId}/docx:
 *   get:
 *     tags: [Documents]
 *     summary: Stream raw DOCX bytes
 *     description: Streams the raw DOCX bytes for the document. Bypasses signed URLs to avoid CORS issues for the docx-preview viewer.
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The document ID
 *       - in: query
 *         name: version_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional version ID to get a specific version
 *     responses:
 *       200:
 *         description: DOCX file content
 *         content:
 *           application/vnd.openxmlformats-officedocument.wordprocessingml.document:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /documents/{documentId}/html:
 *   get:
 *     tags: [Documents]
 *     summary: Get document as HTML
 *     description: Converts the DOCX document to HTML for editing in Tiptap
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The document ID
 *       - in: query
 *         name: version_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional version ID
 *     responses:
 *       200:
 *         description: HTML content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 html:
 *                   type: string
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: Document not found
 */

/**
 * @swagger
 * /documents/{documentId}/versions:
 *   get:
 *     tags: [Documents]
 *     summary: List document versions
 *     description: Returns all versions of a document in chronological order
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The document ID
 *     responses:
 *       200:
 *         description: List of versions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 current_version_id:
 *                   type: string
 *                   format: uuid
 *                   nullable: true
 *                 versions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DocumentVersion'
 *       404:
 *         description: Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /documents/{documentId}/versions:
 *   post:
 *     tags: [Documents]
 *     summary: Upload a new version
 *     description: Uploads a new version of an existing document. The uploaded file becomes the current version.
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The document ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The new version file
 *               display_name:
 *                 type: string
 *                 description: Optional display name for the version
 *     responses:
 *       201:
 *         description: Version uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DocumentVersion'
 *       400:
 *         description: Invalid file or type mismatch
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /documents/{documentId}/versions/from-html:
 *   post:
 *     tags: [Documents]
 *     summary: Save HTML content as a new version
 *     description: Converts HTML content to DOCX and saves as a new document version
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [html]
 *             properties:
 *               html:
 *                 type: string
 *                 description: HTML content to save
 *               display_name:
 *                 type: string
 *                 description: Optional display name for the version
 *     responses:
 *       201:
 *         description: Version created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DocumentVersion'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Document not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /documents/{documentId}/export:
 *   post:
 *     tags: [Documents]
 *     summary: Export document as DOCX or PDF
 *     description: Converts HTML content to DOCX or PDF for download
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [html, format]
 *             properties:
 *               html:
 *                 type: string
 *                 description: HTML content to export
 *               format:
 *                 type: string
 *                 enum: [docx, pdf]
 *                 description: Export format
 *     responses:
 *       200:
 *         description: File content
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Document not found
 */

/**
 * @swagger
 * /documents/{documentId}/versions/{versionId}:
 *   patch:
 *     tags: [Documents]
 *     summary: Rename a version
 *     description: Updates the display name of a document version. Pass an empty value to clear the override.
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The document ID
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The version ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               display_name:
 *                 type: string
 *                 nullable: true
 *                 description: New display name for the version
 *     responses:
 *       200:
 *         description: Version updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DocumentVersion'
 *       404:
 *         description: Document or version not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /documents/{documentId}/tracked-change-ids:
 *   get:
 *     tags: [Documents]
 *     summary: Get tracked change IDs
 *     description: Returns the ordered list of tracked change IDs (w:ins/w:del) in the DOCX document
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The document ID
 *       - in: query
 *         name: version_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional version ID
 *     responses:
 *       200:
 *         description: List of tracked change IDs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ids:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       kind:
 *                         type: string
 *                         enum: [ins, del]
 *                       w_id:
 *                         type: string
 *       404:
 *         description: Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /documents/{documentId}/edits/{editId}/accept:
 *   post:
 *     tags: [Documents]
 *     summary: Accept a document edit
 *     description: Accepts a pending tracked change edit in the document
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The document ID
 *       - in: path
 *         name: editId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The edit ID
 *     responses:
 *       200:
 *         description: Edit accepted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 version_id:
 *                   type: string
 *                   format: uuid
 *                 download_url:
 *                   type: string
 *                   format: uri
 *                 remaining_pending:
 *                   type: integer
 *       404:
 *         description: Document or edit not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /documents/{documentId}/edits/{editId}/reject:
 *   post:
 *     tags: [Documents]
 *     summary: Reject a document edit
 *     description: Rejects a pending tracked change edit in the document
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The document ID
 *       - in: path
 *         name: editId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The edit ID
 *     responses:
 *       200:
 *         description: Edit rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 version_id:
 *                   type: string
 *                   format: uuid
 *                 download_url:
 *                   type: string
 *                   format: uri
 *                 remaining_pending:
 *                   type: integer
 *       404:
 *         description: Document or edit not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /documents/{documentId}/context-files:
 *   get:
 *     tags: [Documents]
 *     summary: Get context files for a document
 *     description: Returns list of documents attached as context files for this document
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of context files
 */

/**
 * @swagger
 * /documents/{documentId}/context-files:
 *   post:
 *     tags: [Documents]
 *     summary: Add a context file to a document
 *     description: Associates another document as a context file for this document
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [context_document_id]
 *             properties:
 *               context_document_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Context file added successfully
 */

/**
 * @swagger
 * /documents/{documentId}/context-files/{contextFileId}:
 *   delete:
 *     tags: [Documents]
 *     summary: Remove a context file from a document
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: contextFileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Context file removed successfully
 */

/**
 * @swagger
 * /documents/{documentId}/insights:
 *   get:
 *     tags: [Documents]
 *     summary: Generate AI insights/summaries for a document and its context files
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: AI-generated insights for the document and context files
 */

/**
 * @swagger
 * /documents/{documentId}/change-requests:
 *   post:
 *     tags: [Documents]
 *     summary: Create a change request for document (editor changes requiring admin approval)
 */

/**
 * @swagger
 * /documents/{documentId}/change-requests:
 *   get:
 *     tags: [Documents]
 *     summary: List pending change requests for a document (owner only)
 */

/**
 * @swagger
 * /documents/{documentId}/change-requests/{requestId}:
 *   patch:
 *     tags: [Documents]
 *     summary: Approve or reject a change request
 */
