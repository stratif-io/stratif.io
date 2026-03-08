import { themeQuartz } from 'ag-grid-enterprise'
import { useEffect, useState } from 'react'

function isDarkMode() {
  return document.documentElement.classList.contains('dark')
}

// Shared AG Grid theme params — derived from index.css CSS variables.
// Change appearance here to affect both Events and Pivot Explorer.
const LIGHT_PARAMS = {
  backgroundColor: 'hsl(0,0%,100%)',
  foregroundColor: 'hsl(222.2,84%,4.9%)',
  headerBackgroundColor: 'hsl(0,0%,100%)',
  headerTextColor: 'hsl(215.4,16.3%,46.9%)',
  borderColor: 'hsl(214.3,31.8%,91.4%)',
  rowHoverColor: 'hsl(210,40%,97.5%)',
  selectedRowBackgroundColor: 'hsl(222.2,47.4%,11.2%,0.05)',
  accentColor: 'hsl(222.2,47.4%,11.2%)',
  oddRowBackgroundColor: 'hsl(0,0%,100%)',
  cellTextColor: 'hsl(222.2,84%,4.9%)',
  fontFamily: 'inherit',
  fontSize: 13,
  rowHeight: 40,
  headerHeight: 36,
  cellHorizontalPaddingScale: 1.1,
}

const DARK_PARAMS = {
  backgroundColor: 'hsl(224,71%,4%)',
  foregroundColor: 'hsl(213,31%,91%)',
  headerBackgroundColor: 'hsl(224,71%,4%)',
  headerTextColor: 'hsl(215,20%,55%)',
  borderColor: 'hsl(216,34%,14%)',
  rowHoverColor: 'hsl(216,34%,13%)',
  selectedRowBackgroundColor: 'hsl(217,91%,60%,0.08)',
  accentColor: 'hsl(217,91%,60%)',
  oddRowBackgroundColor: 'hsl(224,71%,4%)',
  cellTextColor: 'hsl(213,31%,91%)',
  fontFamily: 'inherit',
  fontSize: 13,
  rowHeight: 40,
  headerHeight: 36,
  cellHorizontalPaddingScale: 1.1,
}

export function useAgGridTheme() {
  const [dark, setDark] = useState(isDarkMode)

  useEffect(() => {
    const obs = new MutationObserver(() => setDark(isDarkMode()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  return themeQuartz.withParams(dark ? DARK_PARAMS : LIGHT_PARAMS)
}
