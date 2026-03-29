import type { ReactNode } from 'react'

type CardProps = {
  title?: string
  children: ReactNode
}

export function Card({ title, children }: CardProps) {
  return (
    <section className="card">
      {title?.trim() ? <h3>{title}</h3> : null}
      {children}
    </section>
  )
}
