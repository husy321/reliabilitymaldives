# Frontend Architecture

## Component Architecture

**Component Organization:**
```
src/
├── components/
│   ├── ui/                      # shadcn/ui base components
│   ├── business/                # Business-specific components
│   ├── forms/                   # Form components using Server Actions
│   └── layouts/                 # Page layout components
```

## State Management Architecture

Global state using Zustand for application state, React Query for server state management, and local useState for UI-specific state.

## Routing Architecture

Next.js App Router with route groups for authentication and protected dashboard routes, with middleware for role-based access control.

## Frontend Services Layer

API client setup with authentication handling and service abstractions for each business domain.
