# Frontend Agent Session Guide

This guide is for the **Frontend Agent** working on end-user features of the trivia app.

## Role & Responsibilities

The Frontend Agent handles:
- End-user React components and pages
- Mobile-first responsive design
- Theme system (dark/light mode)
- API integration for user features
- User authentication flows
- Performance optimization
- Event discovery and display

## Session Setup

```bash
# Start frontend agent session
claude code --session frontend-agent

# Work from frontend directory
cd /path/to/trivia/trivia-nearby

# Start dev server
pnpm dev
```

## Issue Labels to Watch

Filter GitHub issues for:
- `frontend` + `agent:frontend`
- `feature` + `P0/P1/P2`
- `bug` + `frontend`
- `has-dependency` (check if dependencies are ready)

## Pre-Work Checklist

Before starting frontend work:

1. **Check API Dependencies**
   - Read `/docs/api/endpoints.md` for required endpoints
   - Verify endpoints exist or create API issues
   - Check authentication requirements

2. **Review Design Requirements**
   - Ensure mobile-first approach
   - Check dark theme compatibility
   - Review accessibility needs

3. **Understand Data Flow**
   - Check current component structure
   - Understand state management approach
   - Review existing patterns

## Workflow

### 1. Component Development

For new components:

1. **Study Existing Patterns**
   ```bash
   # Look at existing components
   ls src/components/
   
   # Check theme usage
   grep -r "theme" src/
   
   # Review existing API calls
   grep -r "fetch\|api" src/
   ```

2. **Create Component**
   - Follow existing naming conventions
   - Use TypeScript interfaces
   - Implement dark theme support
   - Make mobile-responsive

3. **Integrate APIs**
   - Use documented endpoints from `/docs/api/endpoints.md`
   - Handle loading and error states
   - Implement proper error handling

### 2. API Integration

For consuming APIs:

1. **Check API Documentation**
   - Read endpoint specifications
   - Understand response formats
   - Check authentication needs

2. **Create API Client**
   - Use existing patterns
   - Add proper TypeScript types
   - Handle errors consistently

3. **Test Integration**
   - Test with real API endpoints
   - Handle edge cases
   - Verify mobile responsiveness

### 3. Theme System

All components must support themes:

1. **Use Theme Context**
   ```typescript
   import { useTheme } from '../context/theme_context';
   
   const { theme, toggleTheme } = useTheme();
   ```

2. **Apply Theme Classes**
   ```tsx
   <div className={`bg-white dark:bg-gray-900 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
   ```

3. **Test Both Themes**
   - Default dark theme
   - Light theme toggle
   - Consistent styling

## Technical Stack

### Core Technologies
- **React 19** with TypeScript
- **Vite** for development/build
- **Tailwind CSS v4** for styling
- **SWC** for fast refresh

### Key Files
- `src/App.tsx` - Main app component
- `src/context/theme_context.tsx` - Theme management
- `src/main.tsx` - Entry point
- `src/index.css` - Global styles

### Development Commands
```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Lint code
pnpm lint

# Preview production build
pnpm preview
```

## Component Patterns

### Standard Component Structure
```typescript
interface ComponentProps {
  // Define props with TypeScript
}

export const ComponentName: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  const { theme } = useTheme();
  
  return (
    <div className="mobile-first-classes md:desktop-classes">
      {/* Component content */}
    </div>
  );
};
```

### API Data Fetching
```typescript
import { useState, useEffect } from 'react';

interface ApiData {
  // Define API response type
}

export const DataComponent: React.FC = () => {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchData()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <EmptyState />;
  
  return <DataDisplay data={data} />;
};
```

## Mobile-First Design

### Responsive Approach
1. Design for mobile (320px+)
2. Enhance for tablet (768px+)
3. Optimize for desktop (1024px+)

### Tailwind Breakpoints
```css
/* Mobile first - no prefix */
.text-sm

/* Tablet and up */
.md:text-base

/* Desktop and up */  
.lg:text-lg
```

### Touch Interactions
- Minimum 44px touch targets
- Swipe gestures where appropriate
- Loading states for network requests

## Key Features to Implement

### Event Discovery
- Map view with venue markers
- List view with distance sorting
- Search and filter functionality
- Event detail pages

### User Features
- Favorite events
- User preferences
- Push notifications (future)
- Location services

### Navigation
- Bottom tab navigation (mobile)
- Responsive header
- Deep linking support

## Integration Points

### With API Agents
- Request endpoints based on UI needs
- Provide feedback on API response formats
- Test API integration thoroughly

### With Admin Agents
- Share component patterns
- Coordinate on data formats
- Reuse TypeScript types

### With Database Agents
- Understand data relationships
- Provide UI requirements for queries
- Test with realistic data volumes

## Performance Considerations

### Bundle Size
- Use dynamic imports for large components
- Optimize images and assets
- Monitor bundle analyzer

### Runtime Performance
- Minimize re-renders with React.memo
- Use proper dependency arrays
- Implement virtualization for large lists

### Network Performance
- Cache API responses appropriately
- Implement proper loading states
- Handle offline scenarios

## Testing Strategy

### Manual Testing
```bash
# Test on different screen sizes
# Check dark/light theme toggle
# Verify mobile responsiveness
# Test API error scenarios
```

### Automated Testing
- Write unit tests for components
- Integration tests for API calls
- Visual regression tests (future)

## Common Gotchas

1. **Theme System**
   - Always test both dark and light themes
   - Use theme context, not manual classes
   - Consider system theme preference

2. **Mobile Responsiveness**
   - Test on actual mobile devices
   - Consider touch interaction sizes
   - Handle different screen orientations

3. **API Integration**
   - Handle loading and error states
   - Use TypeScript for API responses
   - Implement proper retry logic

4. **Performance**
   - Avoid unnecessary re-renders
   - Optimize large lists
   - Consider code splitting

## Troubleshooting

### Development Issues
```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Restart dev server
pnpm dev

# Check build errors
pnpm build
```

### API Issues
- Check network tab in DevTools
- Verify endpoint URLs match documentation
- Test with API testing tools

### Styling Issues
- Use browser DevTools
- Check Tailwind class generation
- Verify theme variable usage

## Documentation Updates

Always update:
- Component documentation (if complex)
- API usage examples
- Performance notes
- Known issues or limitations