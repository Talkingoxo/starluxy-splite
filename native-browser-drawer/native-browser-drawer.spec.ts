import * as fs from 'node:fs'
import * as path from 'node:path'
import type { Page } from '@playwright/test'

import { expect, test } from './test'
import {
  buildAppEnv,
  createSandbox,
  launchDesktop,
  waitForAppReady,
  waitForOnboarding,
  writeEnvFile,
  writeMockProviderConfig,
  type Sandbox
} from './fixtures'
import { startMockServer } from './mock-server'

const pluginSource = fs.readFileSync(path.join(import.meta.dirname, 'native-browser-drawer-plugin.mjs'), 'utf8')

function installPlugin(sandbox: Sandbox) {
  const dir = path.join(sandbox.hermesHome, 'desktop-plugins', 'native-browser-drawer')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'plugin.js'), pluginSource, 'utf8')
}

async function launchWithPlugin(sandbox: Sandbox) {
  return launchDesktop(buildAppEnv(sandbox))
}

async function waitForNativeChat(page: Page) {
  const chat = page.locator('[data-chat-surface]')
  await chat.waitFor({ state: 'visible', timeout: 60_000 })
  await chat.locator('[data-slot="composer-root"]').waitFor({ state: 'visible', timeout: 60_000 })
  await expect(chat.locator('.xterm')).toHaveCount(0)
  await expect(chat.getByText('Hermes Agent', { exact: true })).toHaveCount(0)
  await expect(chat.getByText('Setup Required', { exact: true })).toHaveCount(0)
}

async function browserToggle(page: Page) {
  return page.getByRole('button', { name: /^(Open|Close) browser$/ }).first()
}

async function clickSettings(page: Page) {
  const button = page.getByRole('button', { name: /settings/i }).first()
  await expect(button).toBeVisible({ timeout: 20_000 })
  await button.click()
  await page.getByText('Appearance', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
}

async function closeSettings(page: Page) {
  const close = page.getByRole('button', { name: /close settings/i }).first()
  await expect(close).toBeVisible()
  await close.click()
  await expect(page.getByText('Appearance', { exact: true })).toHaveCount(0)
}

async function dragDivider(page: Page, delta: number) {
  const box = await page.getByTestId('native-browser-drawer').boundingBox()
  if (!box) throw new Error('browser drawer has no bounding box')

  const x = box.x - 1
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + delta, y, { steps: 12 })
  await page.mouse.up()
}

test('native Chat and Settings survive drawer open, resize, close, and restart', async ({}, testInfo) => {
  test.setTimeout(240_000)

  const mock = await startMockServer()
  const sandbox = createSandbox('native-browser-drawer')
  writeMockProviderConfig(sandbox.hermesHome, mock.url)
  writeEnvFile(sandbox.hermesHome)
  installPlugin(sandbox)

  let launched = await launchWithPlugin(sandbox)

  try {
    await waitForAppReady({ ...launched, mock, mockUrl: mock.url, sandbox, cleanup: async () => {} }, 120_000)
    let page = launched.page
    await waitForNativeChat(page)
    await expect(await browserToggle(page)).toBeVisible({ timeout: 30_000 })

    await page.screenshot({ path: testInfo.outputPath('01-chat-original.png') })
    const originalChatWidth = (await page.locator('[data-chat-surface]').boundingBox())?.width ?? 0
    await expect(page.getByTestId('native-browser-drawer')).toHaveCount(0)

    await clickSettings(page)
    await page.screenshot({ path: testInfo.outputPath('02-settings-open.png') })
    await expect(page.getByTestId('native-browser-drawer')).toHaveCount(0)

    await closeSettings(page)
    await waitForNativeChat(page)
    await page.screenshot({ path: testInfo.outputPath('03-chat-restored.png') })

    await (await browserToggle(page)).click()
    const drawer = page.getByTestId('native-browser-drawer')
    await expect(drawer).toBeVisible()
    await expect(page.locator('[data-chat-surface]')).toBeVisible()
    await expect(page.getByTestId('native-browser-viewport')).toBeVisible()
    await expect(page.locator('webview')).toHaveCount(0)
    await expect(page.getByText(/Browser ready/i)).toHaveCount(0)
    await expect(page.getByText(/data:text\/html/i)).toHaveCount(0)
    await page.screenshot({ path: testInfo.outputPath('04-browser-open.png') })

    const initialWidth = (await drawer.boundingBox())?.width ?? 0
    await dragDivider(page, -150)
    const widerWidth = (await drawer.boundingBox())?.width ?? 0
    expect(widerWidth).toBeGreaterThan(initialWidth + 70)
    await page.screenshot({ path: testInfo.outputPath('05-browser-wider.png') })

    await dragDivider(page, 180)
    const narrowerWidth = (await drawer.boundingBox())?.width ?? 0
    expect(narrowerWidth).toBeLessThan(widerWidth - 70)
    await page.screenshot({ path: testInfo.outputPath('06-browser-narrower.png') })

    await page.getByTestId('native-browser-close').click()
    await expect(drawer).toHaveCount(0)
    const expandedWidth = (await page.locator('[data-chat-surface]').boundingBox())?.width ?? 0
    expect(expandedWidth).toBeGreaterThanOrEqual(originalChatWidth - 4)
    await waitForNativeChat(page)
    await page.screenshot({ path: testInfo.outputPath('07-browser-closed.png') })

    await launched.app.close()
    launched = await launchWithPlugin(sandbox)
    page = launched.page
    await waitForAppReady({ ...launched, mock, mockUrl: mock.url, sandbox, cleanup: async () => {} }, 120_000)
    await waitForNativeChat(page)
    await expect(await browserToggle(page)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('native-browser-drawer')).toHaveCount(0)

    await clickSettings(page)
    await closeSettings(page)
    await waitForNativeChat(page)

    await (await browserToggle(page)).click()
    await expect(page.getByTestId('native-browser-drawer')).toBeVisible()
    await dragDivider(page, -100)
    await dragDivider(page, 120)
    await page.getByTestId('native-browser-close').click()
    await expect(page.getByTestId('native-browser-drawer')).toHaveCount(0)
    await waitForNativeChat(page)
    await page.screenshot({ path: testInfo.outputPath('08-after-restart.png') })
  } finally {
    await launched.app.close().catch(() => undefined)
    await mock.close()
    sandbox.cleanup()
  }
})

test('no-provider state remains native and contains no embedded terminal', async ({}, testInfo) => {
  test.setTimeout(180_000)

  const sandbox = createSandbox('native-browser-drawer-no-provider')
  fs.writeFileSync(path.join(sandbox.hermesHome, 'config.yaml'), '# no provider configured\n', 'utf8')
  installPlugin(sandbox)
  const launched = await launchWithPlugin(sandbox)

  try {
    await waitForOnboarding(launched.page, 120_000)
    const root = launched.page.locator('#root')
    await expect(root.locator('.xterm')).toHaveCount(0)
    await expect(root.getByText('Setup Required', { exact: true })).toHaveCount(0)
    await expect(root.getByText('Hermes Agent', { exact: true })).toHaveCount(0)
    await launched.page.screenshot({ path: testInfo.outputPath('09-native-no-provider.png') })
  } finally {
    await launched.app.close().catch(() => undefined)
    sandbox.cleanup()
  }
})
