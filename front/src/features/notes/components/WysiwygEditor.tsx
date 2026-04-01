import { useEffect, useMemo, useRef } from 'react'

type Command =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'insertUnorderedList'
  | 'insertOrderedList'
  | 'createLink'
  | 'unlink'
  | 'removeFormat'

function exec(command: Command, value?: string) {
  document.execCommand(command, false, value)
}

/** Ajuste la taille du texte sélectionné (px). Garde la sélection dans `root`. */
function adjustSelectionFontSize(root: HTMLElement, deltaPx: number): boolean {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return false
  const range = sel.getRangeAt(0)
  if (range.collapsed) return false
  if (!root.contains(range.commonAncestorContainer)) return false

  const span = document.createElement('span')
  try {
    const contents = range.extractContents()
    span.appendChild(contents)
    range.insertNode(span)
  } catch {
    return false
  }

  const computed = window.getComputedStyle(span).fontSize
  const current = parseFloat(computed) || 16
  const next = Math.round(Math.max(10, Math.min(48, current + deltaPx)))
  span.style.fontSize = `${next}px`

  sel.removeAllRanges()
  const r2 = document.createRange()
  r2.selectNodeContents(span)
  sel.addRange(r2)

  return true
}

export function WysiwygEditor(props: {
  valueHtml: string
  onChangeHtml: (next: string) => void
  disabled?: boolean
  placeholder?: string
  minHeightPx?: number
}) {
  const { valueHtml, onChangeHtml, disabled = false, placeholder = 'Écrire…', minHeightPx = 220 } = props
  const ref = useRef<HTMLDivElement | null>(null)
  const lastAppliedValueRef = useRef<string>('')

  const isEmpty = useMemo(() => {
    const s = String(valueHtml || '').trim()
    return !s || s === '<p></p>' || s === '<p><br></p>' || s === '<br>' || s === '<div><br></div>'
  }, [valueHtml])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (lastAppliedValueRef.current === valueHtml) return
    if (document.activeElement === el) return
    el.innerHTML = valueHtml || ''
    lastAppliedValueRef.current = valueHtml
  }, [valueHtml])

  const canEdit = !disabled

  return (
    <div className={`wysiwyg ${disabled ? 'wysiwyg-disabled' : ''}`}>
      <div className="wysiwyg-toolbar" role="toolbar" aria-label="Mise en forme">
        <button type="button" className="btn btn-secondary btn-small" disabled={!canEdit} onClick={() => exec('bold')}>
          B
        </button>
        <button type="button" className="btn btn-secondary btn-small" disabled={!canEdit} onClick={() => exec('italic')}>
          I
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={!canEdit}
          onClick={() => exec('underline')}
        >
          U
        </button>
        <span className="wysiwyg-sep" />
        <button
          type="button"
          className="btn btn-secondary btn-small"
          title="Agrandir la police"
          disabled={!canEdit}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const el = ref.current
            if (!el) return
            el.focus()
            if (!adjustSelectionFontSize(el, 2)) return
            const next = el.innerHTML
            lastAppliedValueRef.current = next
            onChangeHtml(next)
          }}
        >
          A+
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          title="Réduire la police"
          disabled={!canEdit}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const el = ref.current
            if (!el) return
            el.focus()
            if (!adjustSelectionFontSize(el, -2)) return
            const next = el.innerHTML
            lastAppliedValueRef.current = next
            onChangeHtml(next)
          }}
        >
          A−
        </button>
        <span className="wysiwyg-sep" />
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={!canEdit}
          onClick={() => exec('insertUnorderedList')}
        >
          •
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={!canEdit}
          onClick={() => exec('insertOrderedList')}
        >
          1.
        </button>
        <span className="wysiwyg-sep" />
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={!canEdit}
          onClick={() => {
            const url = window.prompt('Lien (URL)')?.trim()
            if (!url) return
            exec('createLink', url)
          }}
        >
          Lien
        </button>
        <button type="button" className="btn btn-secondary btn-small" disabled={!canEdit} onClick={() => exec('unlink')}>
          Unlink
        </button>
        <span className="wysiwyg-sep" />
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={!canEdit}
          onClick={() => exec('removeFormat')}
        >
          Reset
        </button>
      </div>

      <div className="wysiwyg-surface-wrap">
        {isEmpty ? <div className="wysiwyg-placeholder">{placeholder}</div> : null}
        <div
          ref={ref}
          className="wysiwyg-surface"
          contentEditable={canEdit}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          onInput={() => {
            const el = ref.current
            if (!el) return
            const next = el.innerHTML
            lastAppliedValueRef.current = next
            onChangeHtml(next)
          }}
          style={{ minHeight: `${minHeightPx}px` }}
        />
      </div>
    </div>
  )
}

