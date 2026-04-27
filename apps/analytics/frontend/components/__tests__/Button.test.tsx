import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../ui/button'

describe('Button', () => {
  describe('rendering', () => {
    it('renders children correctly', () => {
      render(<Button>Click me</Button>)
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
    })

    it('renders as button element by default', () => {
      render(<Button>Button</Button>)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('renders with custom className', () => {
      render(<Button className="custom-class">Button</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })
  })

  describe('variants', () => {
    it('applies default variant styles', () => {
      render(<Button variant="default">Default</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-primary')
    })

    it('applies destructive variant styles', () => {
      render(<Button variant="destructive">Destructive</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-destructive')
    })

    it('applies outline variant styles', () => {
      render(<Button variant="outline">Outline</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('border')
      expect(button).toHaveClass('border-input')
    })

    it('applies secondary variant styles', () => {
      render(<Button variant="secondary">Secondary</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-secondary')
    })

    it('applies ghost variant styles', () => {
      render(<Button variant="ghost">Ghost</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-accent')
    })

    it('applies link variant styles', () => {
      render(<Button variant="link">Link</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-primary')
      expect(button).toHaveClass('underline-offset-4')
    })
  })

  describe('sizes', () => {
    it('applies default size', () => {
      render(<Button size="default">Default Size</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-11')
      expect(button).toHaveClass('px-4')
    })

    it('applies small size', () => {
      render(<Button size="sm">Small</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10')
      expect(button).toHaveClass('px-3')
    })

    it('applies large size', () => {
      render(<Button size="lg">Large</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-12')
      expect(button).toHaveClass('px-8')
    })

    it('applies icon size', () => {
      render(<Button size="icon">Icon</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-11')
      expect(button).toHaveClass('w-11')
    })
  })

  describe('click handler', () => {
    it('calls onClick handler when clicked', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when disabled', () => {
      const handleClick = vi.fn()
      render(
        <Button onClick={handleClick} disabled>
          Click me
        </Button>
      )
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('disabled state', () => {
    it('applies disabled attribute', () => {
      render(<Button disabled>Disabled</Button>)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('applies disabled styles', () => {
      render(<Button disabled>Disabled</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('disabled:opacity-50')
      expect(button).toHaveClass('disabled:pointer-events-none')
    })
  })

  describe('asChild prop', () => {
    it('renders as Slot when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      )
      expect(screen.getByRole('link')).toBeInTheDocument()
      expect(screen.getByRole('link')).toHaveAttribute('href', '/test')
    })

    it('applies button styles to child element', () => {
      render(
        <Button asChild variant="destructive">
          <a href="/test">Link Button</a>
        </Button>
      )
      const link = screen.getByRole('link')
      expect(link).toHaveClass('bg-destructive')
    })
  })

  describe('type attribute', () => {
    it('can be set to submit', () => {
      render(<Button type="submit">Submit</Button>)
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
    })

    it('can be set to reset', () => {
      render(<Button type="reset">Reset</Button>)
      expect(screen.getByRole('button')).toHaveAttribute('type', 'reset')
    })
  })

  describe('ref forwarding', () => {
    it('forwards ref correctly', () => {
      const ref = { current: null as HTMLButtonElement | null }
      render(<Button ref={ref}>Button</Button>)
      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    })
  })

  describe('additional props', () => {
    it('passes through additional HTML attributes', () => {
      render(
        <Button data-testid="custom-button" aria-label="Custom label">
          Button
        </Button>
      )
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-testid', 'custom-button')
      expect(button).toHaveAttribute('aria-label', 'Custom label')
    })

    it('passes through form attribute', () => {
      render(<Button form="my-form">Submit</Button>)
      expect(screen.getByRole('button')).toHaveAttribute('form', 'my-form')
    })

    it('passes through name attribute', () => {
      render(<Button name="submit-btn">Submit</Button>)
      expect(screen.getByRole('button')).toHaveAttribute('name', 'submit-btn')
    })
  })
})
