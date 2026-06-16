'use client'
import React, { useEffect, useState } from 'react'
import { useField } from '@payloadcms/ui'

// Read-only widok zaakceptowanych dokumentów w zakładce „📜 Zgody" wyceny.
// Zamiast surowego JSON: czytelna lista (rodzaj + wersja + hash) z linkiem do
// DOKŁADNIE tego snapshotu w archiwum `document-versions`, który zaakceptował klient.
type Item = { docType: string; version?: string; contentHash?: string }
type ConsentDocuments = { acceptedTerms?: boolean; acceptedAgreement?: boolean; items?: Item[] }

const LABELS: Record<string, string> = {
  'umowa-wspolpracy': 'Umowa współpracy',
  'regulamin': 'Regulamin serwisu',
  'polityka-prywatnosci': 'Polityka prywatności',
  'rodo': 'Klauzula RODO',
}

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--theme-elevation-800)',
}
const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  padding: '10px 12px', border: '1px solid var(--theme-elevation-150)', borderRadius: 4,
}
const linkStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', textDecoration: 'none', color: 'var(--theme-success-600, #15803d)',
}

export const ConsentDocs: React.FC = () => {
  const { value: documents } = useField<ConsentDocuments>({ path: 'consent.documents' })
  const { value: acceptedAt } = useField<string>({ path: 'consent.acceptedAt' })

  const items: Item[] = documents?.items || []
  const [versionIds, setVersionIds] = useState<Record<string, number | null>>({})

  const itemsKey = JSON.stringify(items)
  useEffect(() => {
    let cancelled = false
    if (!items.length) return
    ;(async () => {
      const out: Record<string, number | null> = {}
      await Promise.all(items.map(async (it) => {
        const key = it.contentHash || `${it.docType}:${it.version || ''}`
        // Pinpoint po hashu (najdokładniej); fallback po docType+wersja.
        const qs = it.contentHash
          ? `where[contentHash][equals]=${encodeURIComponent(it.contentHash)}`
          : `where[docType][equals]=${encodeURIComponent(it.docType)}&where[version][equals]=${encodeURIComponent(it.version || '')}`
        try {
          const res = await fetch(`/api/document-versions?${qs}&limit=1&depth=0`, { credentials: 'include' })
          const j = res.ok ? await res.json() : null
          out[key] = j?.docs?.[0]?.id ?? null
        } catch {
          out[key] = null
        }
      }))
      if (!cancelled) setVersionIds(out)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey])

  if (!acceptedAt || !items.length) {
    return (
      <div style={{ marginTop: 8 }}>
        <span style={labelStyle}>Zaakceptowane dokumenty</span>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--theme-elevation-500)' }}>
          Klient nie zaakceptował jeszcze dokumentów (brak płatności).
        </p>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 8 }}>
      <span style={labelStyle}>Zaakceptowane dokumenty</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it) => {
          const key = it.contentHash || `${it.docType}:${it.version || ''}`
          const id = versionIds[key]
          return (
            <div key={key} style={rowStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontWeight: 600 }}>{LABELS[it.docType] || it.docType}</span>
                <span style={{ fontSize: 12, color: 'var(--theme-elevation-500)', fontFamily: 'monospace' }}>
                  wersja {it.version || '?'}{it.contentHash ? ` · ${it.contentHash.slice(0, 12)}…` : ''}
                </span>
              </div>
              {id ? (
                <a href={`/admin/collections/document-versions/${id}`} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                  Otwórz zaakceptowaną wersję →
                </a>
              ) : id === null ? (
                <span style={{ fontSize: 12, color: 'var(--theme-error-500, #b91c1c)' }}>Snapshot niedostępny</span>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--theme-elevation-400)' }}>Wyszukiwanie…</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
