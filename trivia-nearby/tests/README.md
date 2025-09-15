# Playwright End-to-End Tests

This directory contains Playwright tests for the Trivia Nearby application.

## Setup

Playwright has been configured to work with the existing Vite development server. The tests will automatically start the dev server on `http://localhost:5173` before running.

## Running Tests

### Available Commands

```bash
# Run all tests (headless)
pnpm test

# Run tests in headed mode (visible browser)
pnpm test:headed

# Open Playwright UI for interactive testing
pnpm test:ui

# Run tests in debug mode (step through)
pnpm test:debug

# Run specific test file
pnpm test homepage.spec.ts

# Run tests for specific browser
pnpm test --project=chromium
pnpm test --project=firefox
pnpm test --project=webkit
```

### Test Configuration

Tests are configured to run on:
- Desktop browsers: Chrome, Firefox, Safari
- Mobile viewports: Pixel 7, iPhone 14

## Test Structure

### Homepage Tests (`homepage.spec.ts`)
- ✅ Homepage loads correctly
- ✅ Theme toggle functionality works
- ✅ Navigation to manual location entry
- ✅ Location input handling

### Event Detail Tests (`event-detail.spec.ts`)
- ✅ Homepage displays correctly
- ⚠️ Navigation to event detail pages (depends on data availability)
- ✅ Back navigation functionality
- ✅ Theme preservation throughout navigation

## Test Strategy

The tests are designed to handle data variability gracefully:

1. **Core Navigation**: Tests verify the app's navigation flow works correctly
2. **UI Elements**: Validates that key UI components are present and functional
3. **Theme System**: Ensures dark/light theme toggle works throughout the app
4. **Data-Dependent Tests**: Event-related tests skip gracefully when no data is available

## Notes

- Tests use the development environment and may require actual Supabase data
- Some tests are data-dependent and will skip if no trivia events are available
- The Vite dev server must be able to start on port 5173 for tests to run

## Debugging

If tests fail:

1. **Check the HTML Report**: Run `pnpm exec playwright show-report`
2. **Run in Headed Mode**: Use `pnpm test:headed` to see the browser
3. **Use Debug Mode**: Run `pnpm test:debug` to step through tests
4. **Check Console Logs**: Tests log useful information about data availability

## Adding New Tests

When adding new tests:

1. Place them in the `tests/` directory with `.spec.ts` extension
2. Import from `@playwright/test`
3. Use the existing patterns for robust selectors
4. Handle data-dependent scenarios gracefully
5. Consider both mobile and desktop viewports