import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { getSalesforceConnection } from '@/lib/salesforce'

const DOCUMENT_ID_REGEX = /^[a-zA-Z0-9]{15,18}$/

const sanitizeFilename = (value: string) => {
  const safe = value.trim().replace(/[^a-zA-Z0-9._-]+/g, '_')
  return safe || 'document'
}

const getExtensionFromUrl = (url: string) => {
  try {
    const pathname = new URL(url).pathname
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/)
    return match?.[1] || ''
  } catch {
    return ''
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession()
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const documentId = req.nextUrl.searchParams.get('documentId')
    const rawFilename = req.nextUrl.searchParams.get('filename') || 'document'

    if (!documentId || !DOCUMENT_ID_REGEX.test(documentId)) {
      return NextResponse.json({ error: 'Invalid documentId' }, { status: 400 })
    }

    const conn = await getSalesforceConnection()
    if (!conn) {
      return NextResponse.json({ error: 'No Salesforce connection' }, { status: 500 })
    }

    const query = `
      SELECT Id, Document_Type__c, File_URL__c, Employee__c
      FROM Document__c
      WHERE Id = '${documentId}'
      LIMIT 1
    `

    const result = await conn.query(query)
    const doc = result.records?.[0] as any

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (!doc.File_URL__c) {
      return NextResponse.json({ error: 'Document file URL not found' }, { status: 404 })
    }

    const isPrivileged = ['HR', 'Admin'].includes(session.role)
    if (!isPrivileged && doc.Employee__c !== session.employeeId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const fileResponse = await fetch(doc.File_URL__c)
    if (!fileResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch source document' }, { status: 502 })
    }

    const fileBuffer = await fileResponse.arrayBuffer()
    const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream'

    const baseName = sanitizeFilename(doc.Document_Type__c || rawFilename)
    const extension = getExtensionFromUrl(doc.File_URL__c)
    const filename = extension && !baseName.toLowerCase().endsWith(`.${extension.toLowerCase()}`)
      ? `${baseName}.${extension}`
      : baseName

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store'
      }
    })
  } catch (error: any) {
    console.error('Error downloading document:', error)
    return NextResponse.json({ error: error?.message || 'Failed to download document' }, { status: 500 })
  }
}
