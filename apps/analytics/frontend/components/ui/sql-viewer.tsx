import { useEffect, useRef } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { sql } from '@codemirror/lang-sql'
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { oneDark } from '@codemirror/theme-one-dark'
import { prettySql } from '@/lib/format-sql'

const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#0000ff' },
  { tag: tags.string, color: '#a31515' },
  { tag: tags.number, color: '#098658' },
  { tag: tags.comment, color: '#008000', fontStyle: 'italic' },
  { tag: tags.operator, color: '#000000' },
  { tag: tags.punctuation, color: '#000000' },
  { tag: tags.name, color: '#001080' },
  { tag: tags.typeName, color: '#267f99' },
  { tag: tags.function(tags.name), color: '#795e26' },
])

export function SqlViewer({
  query,
  dark,
  fontSize = '11px',
}: {
  query: string
  dark: boolean
  fontSize?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const view = new EditorView({
      state: EditorState.create({
        doc: prettySql(query),
        extensions: [
          sql(),
          ...(dark ? [oneDark] : [syntaxHighlighting(lightHighlightStyle)]),
          EditorState.readOnly.of(true),
          EditorView.theme(
            {
              '&': { fontSize, background: dark ? '#282c34' : '#ffffff' },
              '&.cm-focused': { outline: 'none' },
              '.cm-content': { padding: '4px 0' },
              '.cm-gutters': { display: 'none' },
              '.cm-scroller': { overflow: 'auto' },
            },
            { dark }
          ),
        ],
      }),
      parent: containerRef.current,
    })
    return () => view.destroy()
  }, [query, dark, fontSize])

  return <div ref={containerRef} />
}
