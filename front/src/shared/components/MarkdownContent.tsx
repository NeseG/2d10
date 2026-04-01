import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function MarkdownContent(props: { content?: string | null; emptyFallback?: string }) {
  const { content, emptyFallback = '—' } = props
  const value = String(content ?? '').trim()

  if (!value) return <p>{emptyFallback}</p>

  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
    </div>
  )
}
