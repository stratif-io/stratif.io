import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const INDEX_HTML = path.resolve(__dirname, '..', '..', 'index.html')

describe('apps/web/index.html noindex script', () => {
  it('contains the conditional noindex script', () => {
    const html = fs.readFileSync(INDEX_HTML, 'utf-8')
    expect(html).toContain("window.location.pathname !== '/'")
    expect(html).toContain('noindex,follow')
  })

  it('script appears before closing </head>', () => {
    const html = fs.readFileSync(INDEX_HTML, 'utf-8')
    const headClose = html.indexOf('</head>')
    const scriptIdx = html.indexOf('noindex,follow')
    expect(scriptIdx).toBeGreaterThan(-1)
    expect(scriptIdx).toBeLessThan(headClose)
  })
})
