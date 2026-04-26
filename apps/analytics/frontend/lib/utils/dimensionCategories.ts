import type { DimensionCategoryConfig, DimensionGroup, DimensionOption } from '@/types'

type CompiledCategory = { category: DimensionCategoryConfig; regexes: RegExp[] }
const compiledCache = new WeakMap<DimensionCategoryConfig[], CompiledCategory[]>()

function getCompiled(categories: DimensionCategoryConfig[]): CompiledCategory[] {
  if (!compiledCache.has(categories)) {
    compiledCache.set(
      categories,
      categories.map((cat) => ({
        category: cat,
        regexes: cat.patterns.map((p) => new RegExp(p, 'i')),
      }))
    )
  }
  return compiledCache.get(categories)!
}

export function groupDimensionsByCategory(
  dimensions: DimensionOption[],
  categories: DimensionCategoryConfig[]
): DimensionGroup[] {
  const compiled = getCompiled(categories)

  function findCategory(value: string): DimensionCategoryConfig {
    for (const { category, regexes } of compiled) {
      if (regexes.some((r) => r.test(value))) return category
    }
    return categories[categories.length - 1]
  }

  const grouped = new Map<string, DimensionOption[]>()

  for (const dim of dimensions) {
    let cat: DimensionCategoryConfig
    if (dim.category) {
      cat = categories.find((c) => c.id === dim.category) ?? categories[categories.length - 1]
    } else {
      cat = findCategory(dim.value)
    }
    if (!grouped.has(cat.id)) grouped.set(cat.id, [])
    grouped.get(cat.id)!.push(dim)
  }

  return categories
    .filter((cat) => grouped.has(cat.id))
    .map((cat) => ({
      category: cat,
      dimensions: grouped
        .get(cat.id)!
        .slice()
        .sort((a, b) => a.label.localeCompare(b.label)),
    }))
}
