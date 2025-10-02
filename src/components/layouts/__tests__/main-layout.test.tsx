import { render, screen } from '@testing-library/react'
import { MainLayout } from '../main-layout'

describe('MainLayout', () => {
  it('renders children correctly', () => {
    render(
      <MainLayout>
        <div>Test Content</div>
      </MainLayout>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('renders default title', () => {
    render(
      <MainLayout>
        <div>Content</div>
      </MainLayout>
    )

    expect(screen.getByText('Reliability Maldives')).toBeInTheDocument()
  })

  it('renders custom title when provided', () => {
    render(
      <MainLayout title="Custom Dashboard">
        <div>Content</div>
      </MainLayout>
    )

    expect(screen.getByText('Custom Dashboard')).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    render(
      <MainLayout>
        <div>Content</div>
      </MainLayout>
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Reports')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders footer content', () => {
    render(
      <MainLayout>
        <div>Content</div>
      </MainLayout>
    )

    expect(screen.getByText('© 2025 Reliability Maldives. All rights reserved.')).toBeInTheDocument()
    expect(screen.getByText('Privacy')).toBeInTheDocument()
    expect(screen.getByText('Terms')).toBeInTheDocument()
    expect(screen.getByText('Support')).toBeInTheDocument()
  })

  it('has responsive design classes', () => {
    render(
      <MainLayout>
        <div>Content</div>
      </MainLayout>
    )

    const header = screen.getByRole('banner')
    expect(header).toHaveClass('sticky', 'top-0', 'z-50', 'w-full')

    const main = screen.getByRole('main')
    expect(main).toHaveClass('container', 'mx-auto', 'px-4', 'py-8', 'md:px-8')
  })
})