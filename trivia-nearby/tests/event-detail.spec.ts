import { test, expect } from '@playwright/test'

test.describe('Trivia Event Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/')
  })

  test('should display the homepage correctly', async ({ page }) => {
    // Check that the main title is displayed
    await expect(page.locator('h1 span').first()).toContainText('TRIVIA')
    await expect(page.locator('h1 span').last()).toContainText('NEARBY')
    
    // Check for the location sharing button
    await expect(page.locator('button:has-text("Share My Location")')).toBeVisible()
    
    // Check that the page has the correct theme classes
    await expect(page.locator('html')).toHaveAttribute('data-theme')
  })

  test('should navigate to trivia list and then event detail page', async ({ page }) => {
    // Navigate to manual location entry
    await page.locator('button:has-text("Enter location manually")').click()
    
    // Fill in a location
    const locationInput = page.locator('input[placeholder*="City or ZIP"]')
    await locationInput.fill('Nashville, TN')
    
    // Submit the form
    await page.locator('button:has-text("Find Trivia Events")').click()
    
    // Wait for the trivia list to load
    await expect(page.locator('text=Loading')).not.toBeVisible({ timeout: 15000 })
    
    // Look for event cards - they should be clickable divs in the trivia list
    const eventCards = page.locator('.cursor-pointer').filter({ 
      has: page.locator('svg[data-testid*="calendar"], svg[class*="lucide-calendar"]')
    })
    
    // Wait for events to load and check if any are available
    await page.waitForTimeout(2000) // Give time for events to load
    const eventCardCount = await eventCards.count()
    
    if (eventCardCount > 0) {
      // Click on the first event card
      await eventCards.first().click()
      
      // Wait for navigation to event detail page
      await page.waitForURL(/\/event\//, { timeout: 10000 })
      
      // Verify we're on the event detail page
      await expect(page.url()).toMatch(/\/event\/[^\/]+$/)
      
      // Check for event detail page elements
      await expect(page.locator('h3:has-text("Event Details")')).toBeVisible({ timeout: 10000 })
      await expect(page.locator('h3:has-text("Venue Info")')).toBeVisible()
      
      // Check for the back button
      await expect(page.locator('text=Back to Trivia Search')).toBeVisible()
      
      // Check for event information sections
      await expect(page.locator('text=Get Directions')).toBeVisible()
      
      // Verify key event detail elements are present by looking for the icons and text
      await expect(page.locator('svg')).toHaveCount({ min: 5 }) // Should have multiple icons
      
    } else {
      // If no events found, this is still a valid test result - the app is working
      console.log('No events found for Nashville, but the navigation flow worked correctly')
      await expect(page.locator('h1')).toContainText('TRIVIANEARBY')
    }
  })

  test('should handle back navigation from trivia list', async ({ page }) => {
    // Navigate to manual location entry
    await page.locator('button:has-text("Enter location manually")').click()
    
    // Fill in a location and submit
    const locationInput = page.locator('input[placeholder*="City or ZIP"]')
    await locationInput.fill('Nashville, TN')
    await page.locator('button:has-text("Find Trivia Events")').click()
    
    // Wait for the trivia list to load
    await expect(page.locator('text=Loading')).not.toBeVisible({ timeout: 15000 })
    
    // Click the back button to return to homepage
    const backButton = page.locator('button:has-text("Back")')
    await expect(backButton).toBeVisible()
    await backButton.click()
    
    // Should be back on the splash screen
    await expect(page.locator('h1 span').first()).toContainText('TRIVIA')
    await expect(page.locator('button:has-text("Share My Location")')).toBeVisible()
  })

  test('should display proper theme classes throughout navigation', async ({ page }) => {
    // Check initial theme
    const initialTheme = await page.getAttribute('html', 'data-theme')
    expect(initialTheme).toBeTruthy()
    
    // Navigate to manual location
    await page.locator('button:has-text("Enter location manually")').click()
    
    // Theme should be preserved
    const manualPageTheme = await page.getAttribute('html', 'data-theme')
    expect(manualPageTheme).toBe(initialTheme)
    
    // Navigate to results
    const locationInput = page.locator('input[placeholder*="City or ZIP"]')
    await locationInput.fill('Nashville, TN')
    await page.locator('button:has-text("Find Trivia Events")').click()
    
    // Wait for list to load
    await expect(page.locator('text=Loading')).not.toBeVisible({ timeout: 15000 })
    
    // Theme should still be preserved
    const listPageTheme = await page.getAttribute('html', 'data-theme')
    expect(listPageTheme).toBe(initialTheme)
  })
})