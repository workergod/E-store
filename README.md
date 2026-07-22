# EStore Pro

EStore Pro is a professional Electronic Store Inventory Management System. This repository currently contains the **Phase 1** foundation, providing a production-ready setup built with Electron, React, Vite, Tailwind CSS, and Firebase.

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **Desktop**: Electron (via electron-vite)
- **Styling**: Tailwind CSS (v3), shadcn/ui
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Routing**: React Router
- **Forms**: React Hook Form, Zod
- **Tables & Charts**: TanStack Table, Recharts
- **Backend & Database**: Firebase (Auth, Firestore, Storage)
- **Package Manager**: pnpm

## Folder Structure

The project employs a scalable feature-based architecture and a clean separation of concerns:

```
├── electron/
│   ├── main/          # Electron main process (window creation, IPC handlers)
│   ├── preload/       # Preload scripts (contextBridge)
│   ├── ipc/           # IPC communication definitions
│   └── updater/       # Auto-updater configurations
├── release/           # Output directory for production builds (EXE, etc.)
└── src/
    ├── features/      # Feature modules (dashboard, products, settings, etc.)
    ├── shared/        # Shared UI components, hooks, utilities
    ├── firebase/      # Firebase configuration and initialization
    ├── repositories/  # Data access layer (Repository pattern)
    ├── services/      # External API and local services integration
    ├── config/        # Application configurations (theme, printer, etc.)
    ├── constants/     # Global constants (routes, permissions, roles)
    ├── types/         # TypeScript definitions and database models
    ├── security/      # Permissions, roles, and licensing
    ├── utils/         # Helper functions (e.g., logger)
    ├── helpers/       # Formatting helpers (currency, date, barcode)
    ├── assets/        # Static files (images, icons, fonts)
    ├── printing/      # Print templates and services
    ├── reports/       # Report builders and templates
    └── backup/        # Import/Export features
```

## Installation

Ensure you have Node.js and `pnpm` installed on your system.

```bash
# Install dependencies
pnpm install
```

## Environment Variables

Copy the provided `.env.example` file to `.env` and fill in your Firebase configuration.

```bash
cp .env.example .env
```

## Development

To start the application in development mode (spawns both the Vite dev server for React and the Electron window):

```bash
pnpm run dev
```

## Build Commands

To build the application for production:

```bash
# Build the TypeScript code and prepare for packaging
pnpm run build

# Package the application into a Windows executable (.exe)
pnpm run build:win
```

## Coding Standards

- **TypeScript**: Strict mode is enabled. Ensure proper typings for all new code.
- **Commits**: Follow **Conventional Commits** (e.g., `feat:`, `fix:`, `refactor:`, `chore:`).
- **Code Quality**: ESLint and Prettier are configured to enforce code style. Use `pnpm run lint` before committing.
- **Architecture**: Do not place business logic in UI components. Use the repository pattern for data access and Zustand for state management.

## Future Phases

- **Phase 2**: Authentication and User Management.
- **Phase 3**: Inventory Management (Products, Categories, Stock).
- **Phase 4**: Point of Sale (Issue/Return Product, Printing).
- **Phase 5**: Reports, Technicians, and Licensing.
