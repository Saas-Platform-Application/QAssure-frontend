# QAssure.ai Management Console - Project Context

## Project Overview

**Product Name**: QAssure.ai Platform Management Console  
**Organization**: L&T Technology Services - Enterprise Quality Management Division  
**Version**: 1.0  
**Document Date**: December 2025  
**Development Phase**: Frontend Implementation

### What is QAssure.ai?

QAssure.ai is an AI-powered enterprise quality management platform designed for regulated industries (medical devices, pharmaceuticals, life sciences). The platform uses artificial intelligence to automate quality management tasks including complaint handling, clinical evaluations, design history files, and regulatory compliance.

### What is the Management Console?

The Management Console is a web-based application that provides a visual, user-friendly interface for managing and monitoring the entire QAssure.ai platform. It serves as the "control center" where administrators, operators, and support teams can manage the platform without writing code or using command-line tools.

**Key Principle**: The Management Console complements (not replaces) the existing CLI and SDK tools, providing a visual alternative for users who prefer graphical interfaces.

---

## User Personas & Use Cases

### 1. Platform Administrators
**Role**: Senior technical staff responsible for platform health and security  
**Primary Tasks**:
- Configure platform-wide settings
- Manage user accounts and permissions
- Monitor system health
- Ensure security compliance
- Respond to critical incidents

**Console Features They Use**:
- Main Dashboard (health overview)
- User and Access Management
- System Configuration
- Audit Logs
- Security Settings

### 2. DevOps Engineers
**Role**: Technical staff deploying and maintaining infrastructure  
**Primary Tasks**:
- Deploy new module versions
- Scale services based on demand
- Monitor server resources
- Troubleshoot performance issues
- Manage deployment pipelines

**Console Features They Use**:
- Module Management (deployment wizard)
- System Health Monitoring
- Log Viewer
- Request Tracing
- Performance Metrics

### 3. AI/ML Engineers
**Role**: Specialists managing AI components  
**Primary Tasks**:
- Configure AI models and providers
- Manage prompts (AI instructions)
- Monitor AI performance and costs
- Optimize AI response quality
- Manage knowledge bases (RAG)

**Console Features They Use**:
- AI Management (providers, models)
- Prompt Management (editor, playground)
- Knowledge Base Management
- AI Cost Tracking
- AI Usage Analytics

### 4. Support Engineers
**Role**: Staff responding to user issues  
**Primary Tasks**:
- Investigate reported issues
- Search system logs
- Identify error causes
- Trace request flows
- Coordinate fixes with teams

**Console Features They Use**:
- Log Viewer
- Request Tracing
- Alerts and Notifications
- System Health Monitoring
- Troubleshooting Tools

### 5. Tenant Administrators
**Role**: Customer organization administrators  
**Primary Tasks**:
- Manage their organization's users
- Configure tenant-specific settings
- View usage reports
- Integrate with existing QMS systems
- Monitor their environment health

**Console Features They Use**:
- Tenant Dashboard
- QMS Integration Setup
- Usage Reports
- User Management (tenant-scoped)

---

## Core Feature Areas

### 1. Main Dashboard (Landing Page)

**Purpose**: Instant overview of entire platform status at a glance

**Key Components**:
- **Platform Health Score** (0-100): Single metric aggregating all system health indicators (color-coded: green/yellow/red)
- **Module Status Display**: Visual cards for each module (AiCE, AiCH, DHF, SQ) showing status (Active, Degraded, Suspended, Offline)
- **Real-Time Activity Metrics**: Live graphs updating every few seconds (requests/sec, response times, error rates)
- **Recent Alerts Panel**: List of recent issues requiring attention with severity indicators
- **AI Usage Summary**: Today's AI requests, token consumption, estimated costs
- **Quick Actions**: Buttons for frequent tasks (deploy module, create tenant, scale service)

**Design Considerations**:
- Information density: Show maximum relevant data without overwhelming
- Glanceability: Critical status visible within 3 seconds
- Actionability: Direct access to common tasks from dashboard

### 2. Module Management

**Purpose**: Control and monitor all QAssure platform modules

**Modules in QAssure.ai**:
- **AiCE**: AI-powered Complaint Evaluation
- **AiCH**: AI-powered Clinical Evaluation
- **DHF**: Design History File Management
- **SQ**: Supplier Quality Management
- **Custom Modules**: Tenant-specific or future modules

**Key Features**:

#### Module Catalog
- Browsable library of all modules
- Each module shows: name, description, icon, version, status, tech stack, resource usage, dependencies
- Search and filter capabilities
- Click-through to detailed module pages

#### Deployment Wizard
Multi-step process for safe module updates:
1. Select module and target version
2. Review changelog (what's new/fixed)
3. Choose deployment strategy:
   - **Blue-Green**: New version runs alongside old; traffic gradually shifts
   - **Immediate**: Instant switch (for urgent hotfixes)
4. Configure traffic split (e.g., start with 10% of users)
5. Review settings and confirm
6. Monitor deployment progress with real-time health checks
7. **Safety Features**: One-click rollback, automatic health validation, approval workflows

#### Module Lifecycle Management
Transition modules through stages:
- **Development** → **Testing** → **Staging** → **Active** → **Suspended** → **Deprecated** → **Retired**
- Actions: Suspend (immediately stop traffic), Deprecate (notify users of retirement date), Retire (permanent shutdown)

### 3. AI Management

**Purpose**: Configure, monitor, and optimize AI capabilities

**Key Features**:

#### AI Providers and Models
- **Supported Providers**: OpenAI (GPT-4), Anthropic (Claude), Google (Gemini)
- **Configuration**: Add/edit API keys, set spending limits, configure backup providers
- **Model Routing**: Assign specific models to different tasks (complex tasks → powerful model; simple tasks → cheaper model)
- **Health Monitoring**: Real-time status and response time for each provider

#### Prompt Management
- **Prompt Editor**: Specialized text editor with syntax highlighting, variable placeholders, version history, side-by-side comparison
- **Testing Playground**: Test prompts with sample inputs, compare responses across models, measure performance, save test cases
- **Version Control**: Track all changes, revert to previous versions, see diff between versions

#### Knowledge Base Management (RAG)
RAG = Retrieval-Augmented Generation (giving AI access to specific documents for accurate responses)
- **Document Upload**: PDFs, Word docs, web pages
- **Organization**: Collections for different purposes (regulations, manuals, policies)
- **Processing Status**: Track document processing progress
- **Search Testing**: Verify AI can find relevant information
- **Cleanup**: Remove outdated documents

#### AI Cost Tracking
- **Breakdowns**: By provider, by module, by tenant, by use case
- **Time Ranges**: Today, week, month, custom
- **Trends**: Visualize usage patterns over time
- **Alerts**: Notify when spending exceeds thresholds

### 4. Tenant Management

**Purpose**: Manage multiple customer organizations (multi-tenancy)

**Key Concepts**:
- **Multi-tenant Architecture**: Single platform instance serves multiple customers with isolated data
- **Tenant**: A customer organization with its own isolated environment

**Key Features**:

#### Tenant Onboarding Wizard
6-step process:
1. Company information (name, industry, contact)
2. Subscription plan selection
3. Module access configuration
4. Initial admin user setup
5. QMS integration settings
6. Review and create

#### Tenant Dashboard
- List of all tenants with status (active, suspended, trial)
- Usage metrics per tenant (API calls, AI usage, storage)
- Subscription details and renewal dates
- Health status indicators
- Recent activity and support tickets

#### QMS Integration Setup
Connect QAssure to existing Quality Management Systems:
- **Supported Systems**: Veeva Vault, MasterControl, Arena PLM, TrackWise, others
- **Configuration**: API credentials, field mapping (map QAssure fields to QMS fields), sync settings (frequency, direction, conflict resolution)
- **Testing**: Validate connection before activation
- **Monitoring**: View sync status and errors

### 5. User and Access Management

**Purpose**: Control who can access the platform and what they can do

**Key Features**:

#### User Management
- User directory (all users with roles, last login, status)
- CRUD operations (create, edit, deactivate accounts)
- Password reset and account unlocking
- Activity logs (login history, actions performed)

#### Roles and Permissions (RBAC)
- **Role-Based Access Control**: Users assigned roles; roles contain permissions
- **Built-in Roles**: Administrator, Operator, Viewer, Module Admin, Tenant Admin
- **Custom Roles**: Create organization-specific roles
- **Permission Editor**: Visual grid showing resources × actions with checkboxes
- **Effective Permissions**: See exactly what a user can do (combined from all roles)

#### Single Sign-On (SSO)
- **Supported Providers**: Microsoft Azure AD, Okta, Auth0, Google Workspace, any SAML 2.0 / OAuth 2.0 provider
- **Configuration Wizard**: Step-by-step SSO setup
- **User Experience**: Redirect to corporate login page, seamless authentication

### 6. Monitoring and Troubleshooting

**Purpose**: Understand platform behavior and diagnose issues

**Key Features**:

#### System Health Monitoring
Real-time metrics:
- **Servers**: CPU, memory, disk, network traffic
- **Databases**: Connections, query performance, storage
- **Caches**: Hit rate, memory usage
- **Message Queues**: Queue depth, consumer lag
- **APIs**: Requests/sec, response times, error rates

Visualization: Time-series charts, zoom/pan, custom time ranges, comparison views

#### Log Viewer
- **Search**: Keyword, error code, free-text search
- **Filters**: Time range, module, severity (error/warning/info), tenant
- **Live Tail**: Watch logs in real-time
- **Export**: Download for offline analysis
- **Saved Searches**: Bookmark frequent investigations

#### Request Tracing (Distributed Tracing)
- **Purpose**: Follow a single request through multiple microservices
- **Timeline View**: See time spent in each service
- **Bottleneck Identification**: Spot slow components
- **Drill-Down**: Click any step for detailed logs
- **Use Case Example**: "Report generation is slow" → Trace request → Find AI call took 10s → Optimize

#### Alerts and Notifications
- **Alert Types**: Threshold (CPU > 80%), Anomaly (unusual pattern), Availability (service down), Error Rate (errors > 5%)
- **Notification Channels**: Email, Slack, PagerDuty, SMS, In-app
- **Configuration**: Create custom alerts with conditions and channels
- **Alert Management**: View, acknowledge, resolve alerts

### 7. Reporting and Analytics

**Purpose**: Insights for decision-making and stakeholder communication

**Report Types**:

#### Usage Reports
- Total API calls over time
- Active users and login frequency
- Most-used features
- Storage consumption by tenant
- AI usage (requests, tokens, costs)

**Users**: Account managers, product managers, finance teams, capacity planners

#### Performance Reports
- **Availability**: Uptime percentage
- **Response Time**: Average, P50, P95, P99
- **Error Rate**: Percentage of failed requests
- **SLA Compliance**: Met/missed service level objectives

**Users**: Operations teams, customer success managers, engineering teams

#### Cost Reports
- Infrastructure costs (cloud compute, storage, networking)
- AI costs by provider, model, use case
- Cost allocation by tenant/department
- Cost trends and forecasts

**Export Formats**: PDF, Excel, CSV, Scheduled email delivery

### 8. System Configuration

**Purpose**: Platform-wide settings affecting all users

**Categories**:

#### General Settings
- Platform name and branding (logo, colors)
- Default timezone and date format
- Session timeout duration
- Email settings (SMTP server)
- Default UI language

#### Security Settings
- Password policies (length, complexity, expiration)
- Multi-factor authentication (MFA) requirements
- IP allowlists (restrict access by IP)
- Session management (max concurrent sessions)
- API rate limits (prevent abuse)

#### Integration Settings
- API gateway configuration (timeouts, retries)
- Event bus settings (message retention)
- External service connections
- Webhook configurations

#### Audit Log
- Immutable record of all administrative actions
- Tracks: Who, What, When for every change
- Retention: 7 years (compliance requirement)
- Searchable and exportable

---

## Technical Architecture Overview

### Platform Components
- **Frontend**: React-based Management Console (this project)
- **Backend**: Microservices architecture (out of scope for frontend)
- **Modules**: Independent services (AiCE, AiCH, DHF, SQ)
- **AI Layer**: Integration with OpenAI, Anthropic, Google AI
- **Data Layer**: Databases, caches, message queues
- **Integration Layer**: API gateway, event bus, external QMS connectors

### Multi-Tenancy Model
- **Data Isolation**: Each tenant's data completely separated
- **Resource Sharing**: Compute and infrastructure shared for efficiency
- **Customization**: Per-tenant configuration and branding

### Authentication & Authorization Flow
1. User logs in (SSO or username/password)
2. Backend validates credentials
3. JWT token issued (httpOnly cookie)
4. Frontend reads user roles and permissions
5. UI renders based on permissions
6. API calls include token in Authorization header
7. Backend validates token and permissions for each request

---

## Design System & UI Patterns

### Visual Design Principles
- **Clarity**: Information hierarchy is obvious
- **Consistency**: Same patterns throughout
- **Efficiency**: Minimize clicks to complete tasks
- **Feedback**: Immediate response to user actions
- **Accessibility**: WCAG 2.1 AA compliant

### Color Semantics
- **Green**: Healthy, success, active
- **Yellow/Amber**: Warning, degraded, attention needed
- **Red**: Error, critical, offline
- **Blue**: Informational, primary actions
- **Gray**: Neutral, disabled, secondary

### Component Patterns
- **Cards**: Module status, tenant summaries, metric displays
- **Tables**: User lists, log entries, audit records
- **Graphs/Charts**: Time-series metrics, usage trends, cost breakdowns
- **Wizards**: Multi-step processes (deployment, onboarding)
- **Forms**: Configuration, user creation, settings
- **Modals/Dialogs**: Confirmations, quick edits
- **Toasts/Notifications**: Success/error feedback

### Layout Patterns
- **Dashboard Layout**: Grid of metric cards + quick actions
- **Master-Detail**: List on left, details on right (e.g., module catalog)
- **Tabbed Interface**: Organize related settings (AI Management tabs: Providers, Prompts, Knowledge Base, Costs)
- **Full-Screen Views**: Log viewer, request tracing (maximize information density)

---

## Key Technical Requirements

### Performance Targets
- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.8s
- **Bundle Size (main)**: < 250KB gzipped

### Browser Support
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **No IE11 support** required

### Accessibility Requirements
- **WCAG 2.1 Level AA** compliance
- **Keyboard Navigation**: All features accessible without mouse
- **Screen Reader Support**: Proper ARIA labels and landmarks
- **Color Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Focus Indicators**: Visible keyboard focus states

### Security Considerations
- **No Sensitive Data in URLs**: Use POST requests for sensitive operations
- **XSS Prevention**: Sanitize all user inputs
- **CSRF Protection**: CSRF tokens for state-changing operations
- **Rate Limiting**: Prevent brute force attacks
- **Audit Trail**: Log all administrative actions

---

## Development Workflow (Figma to Code)

### Phase 1: Design Analysis
1. Fetch Figma designs using MCP
2. Identify components and their variants
3. Map Figma styles to Tailwind utilities
4. Document responsive breakpoints from Figma frames

### Phase 2: Component Implementation
1. Create TypeScript interfaces from Figma component properties
2. Implement with shadcn/ui base components
3. Style with Tailwind CSS (mobile-first)
4. Add interactivity (state, events, validation)

### Phase 3: Integration
1. Connect to Redux state
2. Implement API calls with Axios
3. Add error handling and loading states
4. Implement accessibility features

### Phase 4: Validation
1. Test across all breakpoints (320px - 1920px)
2. Validate against Figma design (pixel-perfect)
3. Test keyboard navigation and screen readers
4. Performance audit with Lighthouse

---

## Glossary of Domain Terms

- **Module**: Independent service handling a specific QA function (AiCE, AiCH, etc.)
- **Tenant**: Customer organization with isolated environment in multi-tenant system
- **RAG**: Retrieval-Augmented Generation (AI + knowledge base)
- **Prompt**: Instructions given to AI model to guide its response
- **Token**: Unit of AI processing (roughly 0.75 words)
- **Blue-Green Deployment**: Running old and new versions simultaneously, gradually shifting traffic
- **Lifecycle Stage**: Current status of module (Development, Testing, Staging, Active, etc.)
- **RBAC**: Role-Based Access Control (permissions assigned via roles)
- **SSO**: Single Sign-On (use corporate credentials to access QAssure)
- **QMS**: Quality Management System (external systems like Veeva Vault)
- **Health Score**: Aggregated metric (0-100) indicating overall platform status
- **Distributed Tracing**: Following a request through multiple microservices

---

## Future Considerations (Not in Current Scope)

- **Mobile App**: Native iOS/Android apps (future phase)
- **Offline Support**: Progressive Web App capabilities
- **Advanced Analytics**: Machine learning for anomaly detection
- **White-Labeling**: Custom branding per tenant
- **API Marketplace**: Third-party integrations
- **Workflow Automation**: Visual workflow builder

---