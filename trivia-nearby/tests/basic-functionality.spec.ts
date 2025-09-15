import { test, expect } from '@playwright/test'

test.describe('Basic Functionality', () => {
  test('should load homepage and allow basic navigation', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/')
    
    // Verify homepage loads
    await expect(page.locator('h1')).toContainText('TRIVIANEARBY')
    
    // Test theme toggle
    const themeToggle = page.locator('header button[aria-label="Toggle theme"]')
    const initialTheme = await page.getAttribute('html', 'data-theme')
    
    await themeToggle.click()
    await page.waitForTimeout(100)
    
    const newTheme = await page.getAttribute('html', 'data-theme')
    expect(newTheme).not.toBe(initialTheme)
    
    // Navigate to manual location entry
    await page.locator('button:has-text("Enter location manually")').click()
    
    // Verify location entry form
    await expect(page.locator('h2:has-text("Enter Your Location")')).toBeVisible()
    await expect(page.locator('input[placeholder*="City or ZIP"]')).toBeVisible()
    
    // Test location input
    const locationInput = page.locator('input[placeholder*="City or ZIP"]')
    await locationInput.fill('Test Location')
    await expect(locationInput).toHaveValue('Test Location')
    
    // Navigate back to homepage
    await page.locator('button:has-text("Back")').click()
    await expect(page.locator('h1')).toContainText('TRIVIANEARBY')
  })

  test('should handle form submission to trivia list', async ({ page }) => {
    await page.goto('/')
    
    // Navigate to manual location
    await page.locator('button:has-text("Enter location manually")').click()
    
    // Fill and submit location
    const locationInput = page.locator('input[placeholder*="City or ZIP"]')
    await locationInput.fill('Nashville, TN')
    
    await page.locator('button:has-text("Find Trivia Events")').click()
    
    // Should navigate to results page (even if no data)
    await expect(page.locator('text=Loading')).not.toBeVisible({ timeout: 15000 })
    
    // Should show the trivia list interface
    await expect(page.locator('button:has-text("Back")')).toBeVisible()
    // Should have a title indicating we're on the results page
    await expect(page.locator('h1').first()).toContainText('TRIVIANEARBY')
  })

  test('should maintain responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    
    await expect(page.locator('h1')).toBeVisible()
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('button:has-text("Share My Location")')).toBeVisible()
  })

  test('should have proper accessibility attributes', async ({ page }) => {
    await page.goto('/')
    
    // Check for proper semantic HTML
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('header')).toBeVisible()
    
    // Check for aria labels
    await expect(page.locator('button[aria-label="Toggle theme"]')).toBeVisible()
    
    // Check for proper headings hierarchy
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('h2')).toBeVisible()
  })
})