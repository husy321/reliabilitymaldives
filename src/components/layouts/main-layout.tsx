import { Card } from "@/components/ui/card"

interface MainLayoutProps {
  children: React.ReactNode
  title?: string
}

export function MainLayout({ children, title }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold">
              {title || "Reliability Maldives"}
            </h1>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <a
              href="#"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Dashboard
            </a>
            <a
              href="#"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Reports
            </a>
            <a
              href="#"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Settings
            </a>
          </nav>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 md:px-8">
        <Card className="w-full">
          <div className="p-6">
            {children}
          </div>
        </Card>
      </main>
      
      <footer className="border-t bg-muted/50">
        <div className="container mx-auto px-4 py-6 md:px-8">
          <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
            <p className="text-sm text-muted-foreground">
              © 2025 Reliability Maldives. All rights reserved.
            </p>
            <div className="flex items-center space-x-4">
              <a
                href="#"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Privacy
              </a>
              <a
                href="#"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Terms
              </a>
              <a
                href="#"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}