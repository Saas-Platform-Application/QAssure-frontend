# QAssure.ai Management Console

A modern, responsive admin dashboard for managing tenants, users, roles, and system configurations in the QAssure platform.

## 🚀 Features

- **Authentication & Authorization**
  - Secure login with JWT token-based authentication
  - Protected routes with role-based access control
  - Session persistence with Redux Persist

- **Tenant Management**
  - Create, view, edit, and delete tenants
  - Filter by status (Active, Suspended, Blocked)
  - Sort by name, created date, or updated date
  - Pagination with customizable page size

- **User Management**
  - Full CRUD operations for users
  - Assign users to tenants and roles
  - Filter by status (Active, Inactive, Suspended, Blocked, Pending Verification)
  - Advanced sorting options
  - Paginated user lists

- **Role Management**
  - Create and manage roles with scopes (Platform, Tenant, Module)
  - Role-based permissions system
  - Filter and sort capabilities

- **Dashboard**
  - Real-time system health metrics
  - Quick action buttons
  - Recent activity logs
  - Statistics overview

- **Responsive Design**
  - Mobile-first approach
  - Tablet and desktop optimized
  - Toggleable sidebar for mobile devices
  - Touch-friendly interface

## 🛠️ Tech Stack

- **Framework**: React 19.2.0
- **Language**: TypeScript 5.9.3 (Strict Mode)
- **Build Tool**: Vite 7.2.4
- **Styling**: Tailwind CSS 4.1.18
- **Routing**: React Router DOM 7.12.0
- **State Management**: Redux Toolkit 2.11.2 + Redux Persist
- **Form Handling**: React Hook Form 7.71.1 + Zod 4.3.5
- **HTTP Client**: Axios 1.13.2
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React 0.562.0
- **Charts**: Recharts 3.6.0

## 📋 Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher (or yarn/pnpm)
- Modern web browser (Chrome, Firefox, Safari, Edge)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd qassure-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your configuration:
   ```env
   VITE_API_BASE_URL=http://localhost:3000/api/v1
   VITE_FRONTEND_BASE_URL=http://localhost:5173
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173` (or the port shown in terminal)

## 📜 Available Scripts

- `npm run dev` - Start development server with hot module replacement
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint to check code quality

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/            # shadcn/ui base components
│   ├── shared/         # Custom shared components
│   └── layout/         # Layout components (Header, Sidebar, Layout)
├── features/           # Feature-based modules
│   └── dashboard/     # Dashboard-specific components
├── pages/              # Route-level page components
├── services/           # API integration layer
├── store/              # Redux store and slices
├── types/              # TypeScript type definitions
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── constants/          # App constants and enums
└── styles/             # Global styles and Tailwind config
```

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=your-api-base-url
VITE_FRONTEND_BASE_URL=your-frontend-base-url
```

## 🎨 Design System

The application follows a consistent design system with:

- **Color Palette**: Primary blue (#112868), Secondary cyan (#23dce1)
- **Typography**: Figtree font family
- **Spacing**: 4px base unit system
- **Breakpoints**: Mobile (320px+), Tablet (768px+), Desktop (1024px+), Large (1440px+)

## 🔌 API Integration

The application integrates with a RESTful API. All API calls are made through centralized service files:

- `auth-service.ts` - Authentication endpoints
- `tenant-service.ts` - Tenant management endpoints
- `user-service.ts` - User management endpoints
- `role-service.ts` - Role management endpoints

All API requests automatically include Bearer token authentication via Axios interceptors.

## 📱 Responsive Breakpoints

- **Mobile**: 320px - 767px
- **Tablet (md)**: 768px - 1023px
- **Desktop (lg)**: 1024px - 1439px
- **Large Desktop (xl)**: 1440px - 1919px
- **Extra Large (2xl)**: 1920px+

## 🧩 Key Components

### Reusable Components
- `DataTable` - Generic table component with mobile card view
- `Modal` - Base modal component with portal rendering
- `Pagination` - Pagination controls with limit selector
- `FilterDropdown` - Filter dropdown with infinite scroll support
- `PaginatedSelect` - Select dropdown with pagination
- `FormField` - Standardized form input field
- `FormSelect` - Standardized form select dropdown
- `StatusBadge` - Status indicator badges
- `ActionDropdown` - Action menu dropdown

### Layout Components
- `Layout` - Main application layout wrapper
- `Header` - Top navigation bar with breadcrumbs
- `Sidebar` - Side navigation menu

## 🔒 Authentication Flow

1. User logs in via `/` (Login page)
2. Credentials are validated against API
3. JWT tokens are stored in Redux store (persisted)
4. Protected routes check authentication status
5. API requests automatically include Bearer token
6. On 401 response, user is logged out and redirected

## 📝 Code Standards

- **Functional Components Only**: No class components
- **TypeScript Strict Mode**: Full type safety
- **File Size Limits**: 
  - Components: Max 500 lines
  - Hooks/Utils: Max 200 lines
  - Types: Max 300 lines
- **Naming Conventions**:
  - Components: PascalCase
  - Functions/Hooks: camelCase
  - Constants: SCREAMING_SNAKE_CASE
  - Files: kebab-case (except components)

## 🚦 State Management

- **Redux Toolkit** for global state
- **Redux Persist** for authentication persistence
- **Local State** (useState) for component-specific state
- **React Hook Form** for form state management

## 🎯 Form Validation

All forms use:
- **React Hook Form** for form handling
- **Zod** for schema validation
- Real-time error display
- Client-side and server-side validation support

## 📦 Building for Production

```bash
npm run build
```

The production build will be created in the `dist/` directory, optimized and minified for deployment.

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📄 License

[Add your license information here]

## 👥 Contributing

[Add contributing guidelines if applicable]

## 📞 Support

For issues, questions, or contributions, please contact the development team.

---

**Built with ❤️ using React, TypeScript, and Tailwind CSS**
