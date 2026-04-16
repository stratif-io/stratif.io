import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FieldMapStep } from '../FieldMapStep'

vi.mock('../../../hooks/useSchemaForm', () => ({
  useSchemaForm: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useBlocker: vi.fn(() => ({ state: 'idle', proceed: vi.fn(), reset: vi.fn() })),
}))

import { useSchemaForm } from '../../../hooks/useSchemaForm'

const baseHookReturn = {
  form: {
    userIdField: 'user_id',
    eventNameField: 'event_name',
    timestampField: 'created_at',
    eventsTable: 'public.events',
    customProps: [],
    userIdentityFields: {
      email_field: null,
      first_name_field: null,
      last_name_field: null,
      date_of_birth_field: null,
      phone_field: null,
    },
    sessionTimeoutMinutes: 30,
    resurrectionWindowDays: 30,
    powerUserThresholdDays: 4,
  },
  updateForm: vi.fn(),
  setForm: vi.fn(),
  pendingDetections: [],
  setPendingDetections: vi.fn(),
  detectedColumns: [],
  enabledFields: {},
  setEnabledFields: vi.fn(),
  toggleFilter: vi.fn(),
  detect: { isPending: false },
  handleDetect: vi.fn(),
  acceptDetection: vi.fn(),
  rejectDetection: vi.fn(),
  acceptAllDetections: vi.fn(),
  upsert: { isPending: false, isSuccess: false, isError: false },
  upsertFilter: { isPending: false, isSuccess: false, isError: false },
}

function renderStep(overrides = {}) {
  vi.mocked(useSchemaForm).mockReturnValue({
    ...baseHookReturn,
    ...overrides,
  } as unknown as ReturnType<typeof useSchemaForm>)
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <FieldMapStep connId="conn-1" />
    </QueryClientProvider>
  )
}

beforeEach(() => vi.clearAllMocks())

describe('FieldMapStep', () => {
  it('renders all three required field rows', () => {
    renderStep()
    expect(screen.getByTestId('field-row-userIdField')).toBeInTheDocument()
    expect(screen.getByTestId('field-row-eventNameField')).toBeInTheDocument()
    expect(screen.getByTestId('field-row-timestampField')).toBeInTheDocument()
  })

  it('shows detect button when eventsTable is set', () => {
    renderStep()
    expect(screen.getByTestId('detect-btn')).toBeInTheDocument()
  })

  it('hides detect button when eventsTable is empty', () => {
    renderStep({ form: { ...baseHookReturn.form, eventsTable: '' } })
    expect(screen.queryByTestId('detect-btn')).not.toBeInTheDocument()
  })

  it('calls handleDetect when detect button clicked', async () => {
    const handleDetect = vi.fn()
    renderStep({ handleDetect })
    await userEvent.click(screen.getByTestId('detect-btn'))
    expect(handleDetect).toHaveBeenCalled()
  })

  it('shows detect banner when pendingDetections present', () => {
    renderStep({
      pendingDetections: [{ fieldKey: 'userIdField', label: 'User ID', proposedColumn: 'uid' }],
    })
    expect(screen.getByTestId('detect-banner')).toBeInTheDocument()
    expect(screen.getByText(/1 field.*detected/i)).toBeInTheDocument()
  })

  it('does not show detect banner when no pendingDetections', () => {
    renderStep()
    expect(screen.queryByTestId('detect-banner')).not.toBeInTheDocument()
  })

  it('calls acceptAllDetections when Accept all clicked in banner', async () => {
    const acceptAllDetections = vi.fn()
    renderStep({
      acceptAllDetections,
      pendingDetections: [{ fieldKey: 'userIdField', label: 'User ID', proposedColumn: 'uid' }],
    })
    await userEvent.click(screen.getByRole('button', { name: /accept all/i }))
    expect(acceptAllDetections).toHaveBeenCalled()
  })

  it('clears pendingDetections when Dismiss clicked in banner', async () => {
    const setPendingDetections = vi.fn()
    renderStep({
      setPendingDetections,
      pendingDetections: [{ fieldKey: 'userIdField', label: 'User ID', proposedColumn: 'uid' }],
    })
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(setPendingDetections).toHaveBeenCalledWith([])
  })

  it('shows required field count in section header', () => {
    renderStep()
    // user_id, event_name, created_at all mapped → 3/3
    expect(screen.getByText('3 / 3 mapped')).toBeInTheDocument()
  })

  it('shows amber suggested row for pending required field', () => {
    renderStep({
      pendingDetections: [{ fieldKey: 'userIdField', label: 'User ID', proposedColumn: 'uid' }],
    })
    expect(screen.getByTestId('field-row-userIdField')).toHaveAttribute('data-suggested', 'true')
  })

  it('calls acceptDetection when ✓ clicked on suggested required row', async () => {
    const acceptDetection = vi.fn()
    renderStep({
      acceptDetection,
      pendingDetections: [{ fieldKey: 'userIdField', label: 'User ID', proposedColumn: 'uid' }],
    })
    await userEvent.click(screen.getByTestId('accept-userIdField'))
    expect(acceptDetection).toHaveBeenCalledWith('userIdField')
  })

  it('renders identity field rows', () => {
    renderStep()
    expect(screen.getByTestId('identity-row-email_field')).toBeInTheDocument()
  })

  // Helper: a dummy pending detection forces expanded={true} on all CategoryCards
  const expandCards = { pendingDetections: [{ fieldKey: '_x', label: 'X', proposedColumn: '_x' }] }

  it('renders property cards for customProps', () => {
    renderStep({
      ...expandCards,
      form: {
        ...baseHookReturn.form,
        customProps: [
          { id: 'p1', name: 'Plan', path: 'traits.plan', type: 'string', category: 'user' },
        ],
      },
    })
    expect(screen.getByDisplayValue('Plan')).toBeInTheDocument()
  })

  it('groups props with same category into one card', () => {
    renderStep({
      ...expandCards,
      form: {
        ...baseHookReturn.form,
        customProps: [
          {
            id: 'p1',
            name: 'Session Duration',
            path: 'properties.session_duration',
            type: 'number',
            category: 'metrics',
          },
          {
            id: 'p2',
            name: 'Page Views',
            path: 'properties.page_views',
            type: 'number',
            category: 'metrics',
          },
        ],
      },
    })
    expect(screen.getByDisplayValue('Session Duration')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Page Views')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /add to metrics/i })).toHaveLength(1)
  })

  it('puts props with different categories in different cards', () => {
    renderStep({
      ...expandCards,
      form: {
        ...baseHookReturn.form,
        customProps: [
          { id: 'p1', name: 'Plan', path: 'traits.plan', type: 'string', category: 'user' },
          {
            id: 'p2',
            name: 'Session Duration',
            path: 'properties.session_duration',
            type: 'number',
            category: 'metrics',
          },
        ],
      },
    })
    expect(screen.getByDisplayValue('Plan')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Session Duration')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add to user/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add to metrics/i })).toBeInTheDocument()
  })

  it('renders props with no category in an "Other" card (collapsed by default)', async () => {
    renderStep({
      form: {
        ...baseHookReturn.form,
        customProps: [{ id: 'p1', name: 'Page URL', path: 'context.page.url', type: 'string' }],
      },
    })
    // The "Other" card header should be visible
    expect(screen.getByText('Other')).toBeInTheDocument()
    // Collapsed by default — expand it first
    await userEvent.click(screen.getByText('Other'))
    expect(screen.getByDisplayValue('Page URL')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add to other/i })).toBeInTheDocument()
  })

  it('shows save status', () => {
    renderStep({ upsert: { isPending: true, isSuccess: false, isError: false } })
    expect(screen.getByTestId('save-status')).toBeInTheDocument()
  })

  // ── Bug A: Filter toggle ──────────────────────────────────────────────────────

  it('calls toggleFilter with $user_id_field ref when filter toggle is clicked on required field row', async () => {
    const toggleFilter = vi.fn()
    renderStep({ toggleFilter, enabledFields: {} })
    // The userIdField row has value 'user_id' (from baseHookReturn.form.userIdField)
    const toggleBtn = screen.getByLabelText(/add user id to filters/i)
    await userEvent.click(toggleBtn)
    expect(toggleFilter).toHaveBeenCalledWith('$user_id_field', 'User ID', 'Activity')
  })

  it('filter toggle on required field reflects filterEnabled=true when ref is in enabledFields', () => {
    renderStep({
      enabledFields: { $user_id_field: { label: 'User ID', icon: 'Activity' } },
    })
    // The toggle button aria-label should say "Remove User ID from filters" when filterEnabled=true
    expect(screen.getByLabelText(/remove user id from filters/i)).toBeInTheDocument()
  })

  it('calls toggleFilter with prop.id as ref when filter toggle is clicked on a custom property row', async () => {
    const toggleFilter = vi.fn()
    renderStep({
      ...expandCards,
      toggleFilter,
      enabledFields: {},
      form: {
        ...baseHookReturn.form,
        customProps: [
          { id: 'abc-123', name: 'Plan', path: 'traits.plan', type: 'string', category: 'user' },
        ],
      },
    })
    const filterToggle = screen.getByLabelText(/add plan to filters/i)
    await userEvent.click(filterToggle)
    expect(toggleFilter).toHaveBeenCalledWith('abc-123', 'Plan', 'CircleUserRound')
  })

  it('filter toggle calls toggleFilter with prop.id when filter is already enabled', async () => {
    const toggleFilter = vi.fn()
    renderStep({
      ...expandCards,
      toggleFilter,
      enabledFields: { p1: { label: 'Plan', icon: 'Activity' } },
      form: {
        ...baseHookReturn.form,
        customProps: [
          { id: 'p1', name: 'Plan', path: 'traits.plan', type: 'string', category: 'user' },
        ],
      },
    })
    const filterToggle = screen.getByLabelText(/remove plan from filters/i)
    await userEvent.click(filterToggle)
    // toggleFilter is called with prop.id (not path) as the ref
    expect(toggleFilter).toHaveBeenCalledWith('p1', 'Plan', 'CircleUserRound')
  })

  // ── Bug B: Add property ───────────────────────────────────────────────────────
  // addProp / onAddToCategory use setForm(prev => ...) to avoid stale-closure overwrites.
  // We call the updater with a representative prev state to verify the result.

  it('calls setForm with new prop when "Add property" header button is clicked', async () => {
    const setForm = vi.fn()
    renderStep({ setForm })
    await userEvent.click(screen.getByRole('button', { name: /add property/i }))
    expect(setForm).toHaveBeenCalled()
    const updater = setForm.mock.calls[0][0]
    const result = updater(baseHookReturn.form)
    expect(result.customProps).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: '', path: '', type: 'string' })])
    )
  })

  it('calls setForm with new prop when empty-state dashed card is clicked', async () => {
    const setForm = vi.fn()
    renderStep({ setForm })
    await userEvent.click(screen.getByText(/add your first event property/i))
    expect(setForm).toHaveBeenCalled()
    const updater = setForm.mock.calls[0][0]
    const result = updater(baseHookReturn.form)
    expect(result.customProps).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: '', path: '', type: 'string' })])
    )
  })

  it('calls setForm with new prop in correct category when "add to {category}" is clicked', async () => {
    const setForm = vi.fn()
    const prevForm = {
      ...baseHookReturn.form,
      customProps: [
        { id: 'p1', name: 'Plan', path: 'traits.plan', type: 'string', category: 'user' },
      ],
    }
    renderStep({ ...expandCards, setForm, form: prevForm })
    await userEvent.click(screen.getByRole('button', { name: /add to user/i }))
    expect(setForm).toHaveBeenCalled()
    const updater = setForm.mock.calls[0][0]
    const result = updater(prevForm)
    expect(result.customProps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: '', path: '', type: 'string', category: 'user' }),
      ])
    )
  })

  // ── Bug C: Category change → icon staleness ──────────────────────────────────

  it('calls setEnabledFields with updated icon when category changes for a prop with active filter', async () => {
    const setEnabledFields = vi.fn()
    // Prop p1 is in category 'user' (CircleUserRound) and has an active filter
    renderStep({
      ...expandCards,
      setEnabledFields,
      enabledFields: { p1: { label: 'Plan', icon: 'CircleUserRound' } },
      form: {
        ...baseHookReturn.form,
        customProps: [
          { id: 'p1', name: 'Plan', path: 'traits.plan', type: 'string', category: 'user' },
        ],
      },
    })
    // CategoryCard has a CategoryBadge that triggers onChangeCategory
    // The badge renders as a button with the category label; clicking it opens a picker
    // We can find and click the "User" badge to open the picker, but let's use
    // aria to find the change-category control. In practice we verify setEnabledFields
    // is called with a function that updates the icon when applied.
    // CategoryBadge trigger has title="User" (the category label); pick first match
    const categoryBadge = screen.getAllByTitle('User')[0]
    await userEvent.click(categoryBadge)
    // Popover items are plain buttons; pick Geography
    const geoOption = await screen.findByRole('button', { name: /geography/i })
    await userEvent.click(geoOption)
    // setEnabledFields must be called
    expect(setEnabledFields).toHaveBeenCalled()
    // Call the updater with the current enabledFields to verify the icon changed
    const updater = setEnabledFields.mock.calls[0][0]
    const result = updater({ p1: { label: 'Plan', icon: 'CircleUserRound' } })
    expect(result.p1.icon).toBe('Globe2')
  })

  it('calls setForm with uncategorized prop when "add to Other" is clicked', async () => {
    const setForm = vi.fn()
    const prevForm = {
      ...baseHookReturn.form,
      customProps: [{ id: 'p1', name: 'Page URL', path: 'context.page.url', type: 'string' }],
    }
    renderStep({ setForm, form: prevForm })
    // Expand the "Other" card first (collapsed by default)
    await userEvent.click(screen.getByText('Other'))
    await userEvent.click(screen.getByRole('button', { name: /add to other/i }))
    expect(setForm).toHaveBeenCalled()
    const updater = setForm.mock.calls[0][0]
    const result = updater(prevForm)
    expect(result.customProps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: '', path: '', type: 'string', category: undefined }),
      ])
    )
  })
})
