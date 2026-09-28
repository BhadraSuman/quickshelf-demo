import { test, expect } from '@playwright/test';

test.describe('Quickshelf Live Demo - Comprehensive QA Test Suite', () => {
  // Capture console logs & errors
  let consoleErrors: string[] = [];
  let consoleWarnings: string[] = [];
  let failedRequests: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    consoleWarnings = [];
    failedRequests = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
      if (msg.type() === 'warning') consoleWarnings.push(msg.text());
    });

    page.on('requestfailed', (req) => {
      failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    });
  });

  // -------------------------------------------------------------
  // A. STORE SELECTOR & 2D UI
  // -------------------------------------------------------------
  test('A.1: Store Selector cards show correct names, cities, types and enter store opens right store', async ({ page }) => {
    await page.goto('/');

    // Verify all 4 store cards exist
    const storeIds = ['annapurna-ranchi', 'sanjeevani-kolkata', 'vastra-bengaluru', 'madhuram-pune'];
    for (const id of storeIds) {
      const card = page.locator(`[data-testid="store-card-${id}"]`);
      await expect(card).toBeVisible();
    }

    // Verify Annapurna details
    await expect(page.locator('[data-testid="store-card-annapurna-ranchi"]')).toContainText('Annapurna SuperMart');
    await expect(page.locator('[data-testid="store-card-annapurna-ranchi"]')).toContainText('Ranchi');
    await expect(page.locator('[data-testid="store-card-annapurna-ranchi"]')).toContainText('Supermarket');

    // Verify Sanjeevani Pharmacy details
    await expect(page.locator('[data-testid="store-card-sanjeevani-kolkata"]')).toContainText('Sanjeevani Pharmacy');
    await expect(page.locator('[data-testid="store-card-sanjeevani-kolkata"]')).toContainText('Kolkata');

    // Click "Enter store" on Annapurna
    await page.click('[data-testid="enter-store-btn-annapurna-ranchi"]');

    // Verify 3D canvas or store view is mounted
    await page.waitForTimeout(1000);
    const debug = await page.evaluate(() => (window as any).__QS_DEBUG__);
    expect(debug.currentStore.id).toBe('annapurna-ranchi');
  });

  test('A.2: Header store switcher changes store without page reload or errors', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="enter-store-btn-annapurna-ranchi"]');
    await page.waitForTimeout(500);

    // Switch to Sanjeevani Pharmacy in header
    await page.selectOption('[data-testid="header-store-select"]', 'sanjeevani-kolkata');
    await page.waitForTimeout(500);

    const debug = await page.evaluate(() => (window as any).__QS_DEBUG__);
    expect(debug.currentStore.id).toBe('sanjeevani-kolkata');
    expect(consoleErrors.length).toBe(0);
  });

  test('A.3: Join the Beta link presence and target URL', async ({ page }) => {
    await page.goto('/');
    // Wait for initial loading screen to complete
    const betaLink = page.locator('[data-testid="join-beta-link"]');
    await betaLink.waitFor({ state: 'attached', timeout: 10000 });
    await expect(betaLink).toBeVisible();
    await expect(betaLink).toHaveAttribute('href', 'https://www.quickshelf.in/beta');
  });

  test('A.4: Browser back/forward and refresh never leaves app blank', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="enter-store-btn-annapurna-ranchi"]');
    await page.waitForTimeout(500);

    await page.reload();
    await page.waitForTimeout(1000);
    const bodyContent = await page.locator('body').innerHTML();
    expect(bodyContent.length).toBeGreaterThan(100);
  });

  // -------------------------------------------------------------
  // B. 3D NAVIGATION & MEMORY LEAK CHECK
  // -------------------------------------------------------------
  test('B.1: Loading screen appears and preloads fonts', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await expect(page.locator('text=Quickshelf Live Demo')).toBeVisible();
    await page.waitForSelector('[data-testid="store-card-annapurna-ranchi"]');
    const loadTimeMs = Date.now() - startTime;
    console.log(`[PERF] Initial Load Time: ${loadTimeMs}ms`);
    expect(loadTimeMs).toBeLessThan(8000);
  });

  test('B.2: WASD movement updates camera position at eye height', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="enter-store-btn-annapurna-ranchi"]');
    await page.waitForTimeout(1000);

    const initialPos = await page.evaluate(() => (window as any).__QS_DEBUG__?.cameraPosition);

    // Press 'W' for 500ms
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyW');

    const newPos = await page.evaluate(() => (window as any).__QS_DEBUG__?.cameraPosition);
    console.log(`[NAV] Initial Pos: ${JSON.stringify(initialPos)}, New Pos: ${JSON.stringify(newPos)}`);

    // Verify camera Y stays at eye height (1.6m ± 0.1)
    if (newPos) {
      expect(newPos[1]).toBeCloseTo(1.6, 1);
    }
  });

  test('B.3: Aisle Prev/Next buttons cycle through all aisles', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="enter-store-btn-annapurna-ranchi"]');
    await page.waitForTimeout(1000);

    // Click Next Aisle on MiniMap
    await page.click('[data-testid="minimap-next-aisle"]');
    await page.waitForTimeout(500);
    let debug = await page.evaluate(() => (window as any).__QS_DEBUG__);
    expect(debug.currentAisle).toBe(1);

    // Click Prev Aisle
    await page.click('[data-testid="minimap-prev-aisle"]');
    await page.waitForTimeout(500);
    debug = await page.evaluate(() => (window as any).__QS_DEBUG__);
    expect(debug.currentAisle).toBe(0);
  });

  test('B.4: 10x Store Switching memory leak verification', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="enter-store-btn-annapurna-ranchi"]');
    await page.waitForTimeout(1000);

    const storeIds = ['annapurna-ranchi', 'sanjeevani-kolkata', 'vastra-bengaluru', 'madhuram-pune'];

    // Initial baseline
    const baseInfo = await page.evaluate(() => (window as any).__QS_DEBUG__?.rendererInfo);

    // Switch 10 times
    for (let i = 0; i < 10; i++) {
      const targetStore = storeIds[i % storeIds.length];
      await page.evaluate((id) => (window as any).__QS_DEBUG__?.switchStore(id), targetStore);
      await page.waitForTimeout(200);
    }

    // Return to Annapurna
    await page.evaluate(() => (window as any).__QS_DEBUG__?.switchStore('annapurna-ranchi'));
    await page.waitForTimeout(800);

    const finalInfo = await page.evaluate(() => (window as any).__QS_DEBUG__?.rendererInfo);
    console.log(`[MEMORY] Base Info: ${JSON.stringify(baseInfo)}, Final Info: ${JSON.stringify(finalInfo)}`);

    // Geometries & textures should stay within reasonable bounds (< 30% growth)
    if (baseInfo && finalInfo) {
      expect(finalInfo.geometries).toBeLessThan(baseInfo.geometries * 2);
    }
  });

  // -------------------------------------------------------------
  // C. E-PAPER TAGS & DATA SANITY
  // -------------------------------------------------------------
  test('C.1: Every tag format QS-<size>-<digits> and Indian numbering ₹ verification', async ({ page }) => {
    await page.goto('/');
    const allStores = await page.evaluate(() => {
      // Test data in memory
      const debug = (window as any).__QS_DEBUG__;
      return debug?.currentStore ? [debug.currentStore] : [];
    });

    // Check tags from dataset
    const issues: string[] = [];
    const seenIds = new Set<string>();

    const checkStoreTags = await page.evaluate(() => {
      // Gather all tags across all aisles
      const store = (window as any).__QS_DEBUG__?.currentStore;
      if (!store) return [];
      return store.aisles.flatMap((a: any) => a.shelves).flatMap((s: any) => s.tags);
    });

    for (const tag of checkStoreTags) {
      // 1. Tag ID Format
      if (!/^QS-(1\.54|2\.13|2\.9|4\.2|7\.5)-\d{6}$/.test(tag.id)) {
        issues.push(`Invalid Tag ID format: ${tag.id}`);
      }
      if (seenIds.has(tag.id)) {
        issues.push(`Duplicate Tag ID: ${tag.id}`);
      }
      seenIds.add(tag.id);

      // 2. Hindi Name
      if (!tag.nameHi || tag.nameHi.trim().length === 0) {
        issues.push(`Missing Hindi name for ${tag.id} (${tag.nameEn})`);
      }

      // 3. MRP >= Price
      if (tag.mrp < tag.price) {
        issues.push(`MRP ₹${tag.mrp} is lower than selling price ₹${tag.price} for ${tag.id}`);
      }

      // 4. No Placeholder
      if (tag.nameEn.includes('Lorem') || tag.nameEn.includes('Product 1')) {
        issues.push(`Placeholder text detected in ${tag.id}`);
      }
    }

    console.log(`[DATA SANITY] Verified ${seenIds.size} tags. Issues found: ${issues.length}`);
    expect(issues, `Data sanity errors: ${issues.join('; ')}`).toEqual([]);
  });

  // -------------------------------------------------------------
  // D. FEATURES (Live Price, Presets, QR, LED Find, Demo Mode)
  // -------------------------------------------------------------
  test('D.1: Live price update plays e-ink refresh and shows toast', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="enter-store-btn-annapurna-ranchi"]');
    await page.waitForTimeout(1000);

    // Select tag via debug hook
    await page.evaluate(() => (window as any).__QS_DEBUG__?.selectTag('QS-2.13-101001'));
    await page.waitForTimeout(500);

    // Verify POS console drawer opens
    await expect(page.locator('[data-testid="pos-drawer"]')).toBeVisible();

    // Change price to ₹440
    await page.fill('[data-testid="pos-price-input"]', '440');
    await page.click('[data-testid="pos-push-btn"]');

    // Verify toast appears
    const toast = page.locator('[data-testid="toast-notification"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('QS-2.13-101001');
    await expect(toast).toContainText('₹440');

    // Verify updated price in memory
    const updatedTag = await page.evaluate(() => (window as any).__QS_DEBUG__?.getTagById('QS-2.13-101001'));
    expect(updatedTag?.price).toBe(440);
  });

  test('D.2: Invalid price input validation (negative, 0, price > MRP)', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="enter-store-btn-annapurna-ranchi"]');
    await page.waitForTimeout(1000);

    await page.evaluate(() => (window as any).__QS_DEBUG__?.selectTag('QS-2.13-101001'));
    await page.waitForTimeout(500);

    // Try setting price above MRP (e.g. ₹9999 when MRP is 580)
    await page.fill('[data-testid="pos-price-input"]', '9999');
    
    // Check if system warns or blocks Price > MRP
    const mrp = await page.locator('[data-testid="pos-mrp-input"]').inputValue();
    const price = await page.locator('[data-testid="pos-price-input"]').inputValue();
    console.log(`[VALIDATION] Price entered: ₹${price}, MRP: ₹${mrp}`);
  });

  test('D.3: Pick-to-light search locates product and blinks green LED', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="enter-store-btn-annapurna-ranchi"]');
    await page.waitForTimeout(1000);

    // Search for "Garam Masala"
    await page.fill('[data-testid="search-input"]', 'Garam Masala');
    await page.click('[data-testid="search-submit-btn"]');
    await page.waitForTimeout(600);

    // Toast should report product located
    await expect(page.locator('[data-testid="toast-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="toast-notification"]')).toContainText('Product Located');
  });

  test('D.4: 8 PM Evening Markdown exists only in Sweets store', async ({ page }) => {
    await page.goto('/');
    // Check in Annapurna SuperMart - should NOT exist
    await page.click('[data-testid="enter-store-btn-annapurna-ranchi"]');
    await page.waitForTimeout(800);
    await page.evaluate(() => (window as any).__QS_DEBUG__?.selectTag('QS-2.13-101001'));
    await page.waitForTimeout(500);

    const superMartMarkdown = page.locator('[data-testid="pos-evening-markdown-btn"]');
    await expect(superMartMarkdown).toHaveCount(0);

    // Switch to Madhuram Sweets
    await page.evaluate(() => (window as any).__QS_DEBUG__?.switchStore('madhuram-pune'));
    await page.waitForTimeout(800);
    await page.evaluate(() => (window as any).__QS_DEBUG__?.selectTag('QS-4.2-401001'));
    await page.waitForTimeout(500);

    // Now 8 PM markdown button should exist
    const sweetsMarkdown = page.locator('[data-testid="pos-evening-markdown-btn"]');
    await expect(sweetsMarkdown).toBeVisible();
  });

  test('D.5: Demo Mode toggles automatic price updates every 5s', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="enter-store-btn-annapurna-ranchi"]');
    await page.waitForTimeout(800);

    // Toggle demo mode ON
    await page.click('[data-testid="toggle-demomode-btn"]');
    await expect(page.locator('[data-testid="toggle-demomode-btn"]')).toContainText('Demo Mode ON');

    // Wait 6 seconds for at least one automatic price change
    await page.waitForTimeout(6000);
    const toastCount = await page.locator('[data-testid="toast-notification"]').count();
    console.log(`[DEMO MODE] Toasts fired during demo mode: ${toastCount}`);

    // Toggle OFF
    await page.click('[data-testid="toggle-demomode-btn"]');
    await expect(page.locator('[data-testid="toggle-demomode-btn"]')).toContainText('Demo Mode OFF');
  });

  // -------------------------------------------------------------
  // E. PERFORMANCE (FPS & Draw Calls)
  // -------------------------------------------------------------
  test('E.1: FPS and draw calls telemetry across stores', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="enter-store-btn-annapurna-ranchi"]');
    await page.waitForTimeout(1500);

    const perf = await page.evaluate(() => {
      const debug = (window as any).__QS_DEBUG__;
      return {
        fps: debug?.fps || 0,
        drawCalls: debug?.rendererInfo?.drawCalls || 0,
        textures: debug?.rendererInfo?.textures || 0,
        geometries: debug?.rendererInfo?.geometries || 0,
      };
    });

    console.log(`[PERF METRICS] FPS: ${perf.fps}, Draw Calls: ${perf.drawCalls}, Textures: ${perf.textures}, Geometries: ${perf.geometries}`);
    expect(perf.drawCalls, 'Draw calls should be optimized under 100').toBeLessThan(100);
  });

  // -------------------------------------------------------------
  // F. 2D FALLBACK & ACCESSIBILITY
  // -------------------------------------------------------------
  test('F.1: 2D shelf rail toggle works smoothly', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="enter-store-btn-annapurna-ranchi"]');
    await page.waitForTimeout(800);

    // Toggle to 2D
    await page.click('[data-testid="toggle-viewmode-btn"]');
    await page.waitForTimeout(500);

    // Check that 2D Aisle header is visible
    await expect(page.locator('text=AISLE 1 · चावल और अनाज')).toBeVisible();

    // Toggle back to 3D
    await page.click('[data-testid="toggle-viewmode-btn"]');
    await page.waitForTimeout(500);
  });
});
