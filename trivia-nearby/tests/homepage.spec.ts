import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load the homepage successfully', async ({ page }) => {
    await page.goto('/')
    
    // Check that the main title elements are visible - use more specific selectors
    await expect(page.locator('h1 span').first()).toContainText('TRIVIA')
    await expect(page.locator('h1 span').last()).toContainText('NEARBY')
    
    // Check for main headline
    await expect(page.locator('h2')).toContainText('Find Trivia Near You')
    
    // Check for location sharing button
    await expect(page.locator('button:has-text("Share My Location")')).toBeVisible()
    
    // Check for manual location button
    await expect(page.locator('button:has-text("Enter location manually")')).toBeVisible()
    
    // Check that the theme is properly set
    await expect(page.locator('html')).toHaveAttribute('data-theme')
    
    // Check that the page title contains relevant keywords
    await expect(page).toHaveTitle(/trivia/i)
  })

  test('should have working theme toggle', async ({ page }) => {
    await page.goto('/')
    
    // Find the theme toggle button in the header
    const themeToggle = page.locator('header button[aria-label="Toggle theme"]')
    
    // Get initial theme
    const initialTheme = await page.getAttribute('html', 'data-theme')
    
    // Click theme toggle
    await themeToggle.click()
    
    // Wait for theme change
    await page.waitForTimeout(100)
    
    // Verify theme changed
    const newTheme = await page.getAttribute('html', 'data-theme')
    expect(newTheme).not.toBe(initialTheme)
  })

  test('should navigate to manual location entry', async ({ page }) => {
    await page.goto('/')
    
    // Click the "Enter location manually" button
    await page.locator('button:has-text("Enter location manually")').click()
    
    // Should now see the manual location form
    await expect(page.locator('h2:has-text("Enter Your Location")')).toBeVisible()
    
    // Should see the location input
    await expect(page.locator('input[placeholder*="City or ZIP"]')).toBeVisible()
    
    // Should see the submit button
    await expect(page.locator('button:has-text("Find Trivia Events")')).toBeVisible()
  })

  test('should handle location input on manual entry page', async ({ page }) => {
    await page.goto('/')
    
    // Navigate to manual location page
    await page.locator('button:has-text("Enter location manually")').click()
    
    // Find the location input
    const locationInput = page.locator('input[placeholder*="City or ZIP"]')
    
    // Type in the input
    await locationInput.fill('Nashville')
    
    // Verify the input value
    await expect(locationInput).toHaveValue('Nashville')
    
    // Clear the input
    await locationInput.clear()
    
    // Verify it's empty
    await expect(locationInput).toHaveValue('')
  })
})