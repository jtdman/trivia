# Admin Agent Session Guide

This guide is for the **Admin Agent** working on admin dashboard functionality.

## Role & Responsibilities

The Admin Agent handles:
- Admin dashboard UI/UX
- Venue management features
- Event moderation tools
- User management interfaces
- Data import/export features
- Analytics and reporting
- Admin authentication and permissions

## Session Setup

```bash
# Start admin agent session
claude code --session admin-agent

# Work from frontend directory (shared with end-user frontend)
cd /path/to/trivia/trivia-nearby

# Start dev server
pnpm dev
```

## Issue Labels to Watch

Filter GitHub issues for:
- `admin` + `agent:admin`
- `feature` + `admin`
- `bug` + `admin`
- `has-dependency` (check if dependencies are ready)

## Pre-Work Checklist

Before starting admin work:

1. **Check API Dependencies**
   - Read `/docs/api/endpoints.md` for admin endpoints
   - Verify admin endpoints exist or create API issues
   - Check permission requirements

2. **Understand User Roles**
   - Super Admin (full access)
   - Venue Owner (venue management)
   - Event Moderator (event approval)
   - Data Manager (import/export)

3. **Review Admin Flow**
   - Authentication requirements
   - Permission-based UI rendering
   - Admin-specific navigation

## Workflow

### 1. Admin Component Development

For admin features:

1. **Study Admin Patterns**
   ```bash
   # Look at existing admin components
   find src -name "*admin*" -o -name "*Admin*"
   
   # Check authentication patterns
   grep -r "admin\|auth" src/
   
   # Review permission handling
   grep -r "permission\|role" src/
   ```

2. **Create Admin Component**
   - Use consistent admin UI patterns
   - Implement permission checks
   - Add proper error handling
   - Include audit logging

3. **Test with Different Roles**
   - Test as super admin
   - Test as venue owner
   - Test permission restrictions

### 2. Permission System

All admin components must check permissions:

1. **Permission Checks**
   ```typescript
   import { useAuth } from '../context/auth_context';
   
   const { user, hasPermission } = useAuth();
   
   if (!hasPermission('venues.write')) {
     return <UnauthorizedMessage />;
   }
   ```

2. **Role-Based Rendering**
   ```tsx
   {hasRole('super_admin') && (
     <DangerousAdminControls />
   )}
   
   {hasPermission('venues.read') && (
     <VenueList />
   )}
   ```

3. **API Permission Validation**
   - Client-side checks for UX
   - Server validates all permissions
   - Handle 403 errors gracefully

### 3. Data Management Features

For CRUD operations:

1. **List Views**
   - Pagination for large datasets
   - Search and filtering
   - Bulk actions where appropriate
   - Export functionality

2. **Detail Views**
   - Complete data display
   - Edit capabilities based on permissions
   - Audit trail information
   - Related data navigation

3. **Forms**
   - Validation on client and server
   - Progress indicators for long operations
   - Confirmation for destructive actions
   - Auto-save for long forms

## Admin UI Patterns

### Standard Admin Layout
```typescript
interface AdminPageProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const AdminPage: React.FC<AdminPageProps> = ({ title, children, actions }) => {
  return (
    <div className="admin-layout">
      <AdminHeader title={title} actions={actions} />
      <AdminSidebar />
      <main className="admin-content">
        {children}
      </main>
    </div>
  );
};
```

### Data Table Pattern
```typescript
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
}

export const DataTable = <T,>({ data, columns, loading, onEdit, onDelete }: DataTableProps<T>) => {
  // Implement table with sorting, filtering, pagination
};
```

### Form Pattern
```typescript
interface AdminFormProps<T> {
  initialData?: T;
  onSubmit: (data: T) => Promise<void>;
  validationSchema: ZodSchema<T>;
}

export const AdminForm = <T,>({ initialData, onSubmit, validationSchema }: AdminFormProps<T>) => {
  // Implement form with validation, loading states, error handling
};
```

## Key Admin Features

### Venue Management
- Venue approval/rejection workflow
- Venue information editing
- Photo management
- Contact information updates
- Venue status management

### Event Management
- Event moderation queue
- Bulk event operations
- Event scheduling tools
- Recurring event management
- Event analytics

### User Management
- User role assignment
- Account status management
- User activity monitoring
- Support ticket system
- Communication tools

### Data Import/Export
- CSV import for venues/events
- Data validation and preview
- Import error handling
- Export functionality
- Data synchronization tools

### Analytics & Reporting
- Usage statistics
- Revenue reporting
- Performance metrics
- Geographic analytics
- Custom report builder

## Integration Points

### With API Agents
- Define admin endpoint requirements
- Specify permission scopes needed
- Test API error scenarios
- Validate data formats

### With Database Agents
- Define admin-specific queries
- Request materialized views for reports
- Plan audit logging requirements
- Optimize for admin operations

### With Frontend Agents
- Share common components
- Coordinate on authentication
- Maintain consistent TypeScript types
- Share theme system

## Admin-Specific Considerations

### Security
- Never expose sensitive data in client
- Validate all permissions server-side
- Log all admin actions
- Implement CSRF protection
- Handle authentication expiry

### Performance
- Paginate large datasets
- Implement proper caching
- Use optimistic updates cautiously
- Consider admin-specific indexes
- Monitor admin query performance

### User Experience
- Provide clear feedback for actions
- Implement undo for safe operations
- Show loading states for long operations
- Provide helpful error messages
- Maintain accessibility standards

## Common Admin Workflows

### Venue Approval Process
1. View pending venues queue
2. Review venue information
3. Validate location and details
4. Approve or reject with notes
5. Send notification to venue owner

### Event Moderation
1. Review flagged events
2. Check event details and venue
3. Verify event information
4. Approve, reject, or request changes
5. Update event status

### Data Import
1. Upload CSV file
2. Validate data format
3. Preview import results
4. Handle validation errors
5. Execute import
6. Review import results

## Testing Strategy

### Permission Testing
```typescript
// Test different user roles
const testCases = [
  { role: 'super_admin', shouldAccess: true },
  { role: 'venue_owner', shouldAccess: false },
  { role: 'moderator', shouldAccess: true }
];

testCases.forEach(({ role, shouldAccess }) => {
  // Test component access with role
});
```

### Form Testing
- Test validation errors
- Test successful submissions
- Test loading states
- Test network errors
- Test permission denials

### Data Flow Testing
- Test with large datasets
- Test pagination
- Test search functionality
- Test bulk operations
- Test export functionality

## Common Gotchas

1. **Permission Checks**
   - Always check permissions on both client and server
   - Handle permission changes during session
   - Gracefully degrade UI for insufficient permissions

2. **Data Management**
   - Implement proper pagination for large datasets
   - Handle concurrent edits appropriately
   - Provide clear feedback for bulk operations

3. **State Management**
   - Keep admin state separate from user state
   - Handle authentication expiry
   - Implement proper error boundaries

4. **Performance**
   - Admin queries can be complex and slow
   - Implement proper loading indicators
   - Consider background processing for large operations

## Error Handling

### Network Errors
```typescript
const handleApiError = (error: ApiError) => {
  switch (error.status) {
    case 401:
      // Redirect to login
      break;
    case 403:
      // Show permission denied
      break;
    case 422:
      // Show validation errors
      break;
    default:
      // Show generic error
  }
};
```

### Form Errors
- Show field-level validation errors
- Highlight invalid fields
- Provide clear error messages
- Allow retry for transient errors

## Documentation Updates

Always update:
- Admin workflow documentation
- Permission matrix
- API endpoint usage
- Known limitations or issues
- Performance considerations