export interface DimensionFilterConfig {
  id: string
  label: string
  icon: 'Globe' | 'Chrome' | 'Monitor' | 'Building' | 'Tag' | 'Layers'
  apiParam: string
  optionsEndpoint?: string
  optionsPath?: string
  staticOptions?: string[]
}

export const DIMENSION_FILTERS: DimensionFilterConfig[] = [
  {
    id: 'country',
    label: 'Country',
    icon: 'Globe',
    apiParam: 'country',
    optionsEndpoint: '/api/pivot/options',
    optionsPath: 'countries',
  },
  {
    id: 'browser',
    label: 'Browser',
    icon: 'Chrome',
    apiParam: 'browser',
    optionsEndpoint: '/api/pivot/options',
    optionsPath: 'browsers',
  },
]

export const ENABLE_DATE_FILTER = true
