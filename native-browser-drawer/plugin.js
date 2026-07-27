import { useSyncExternalStore } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'
import { Button, Codicon, Input, PANES_AREA, TITLEBAR_AREAS, Tip } from '@hermes/plugin-sdk'

let pluginContext = null
let paneDisposer = null
let open = false
const listeners = new Set()

const subscribe = callback => {
  listeners.add(callback)
  return () => listeners.delete(callback)
}
const snapshot = () => open
const emit = () => listeners.forEach(callback => callback())

function DrawerPane() {
  return jsxs('section', {
    className: 'flex h-full min-h-0 w-full flex-col overflow-hidden bg-(--ui-editor-surface-background)',
    'data-testid': 'native-browser-drawer',
    children: [
      jsxs('div', {
        className: 'flex h-9 shrink-0 items-center gap-1 border-b border-(--ui-stroke-tertiary) px-1.5',
        children: [
          jsx(Button, {
            'aria-label': 'Back',
            disabled: true,
            size: 'icon-xs',
            variant: 'ghost',
            children: jsx(Codicon, { name: 'arrow-left', size: '0.75rem' })
          }),
          jsx(Button, {
            'aria-label': 'Forward',
            disabled: true,
            size: 'icon-xs',
            variant: 'ghost',
            children: jsx(Codicon, { name: 'arrow-right', size: '0.75rem' })
          }),
          jsx(Button, {
            'aria-label': 'Reload',
            disabled: true,
            size: 'icon-xs',
            variant: 'ghost',
            children: jsx(Codicon, { name: 'refresh', size: '0.75rem' })
          }),
          jsx(Input, {
            'aria-label': 'Browser address',
            className: 'h-7 min-w-0 flex-1 text-xs',
            placeholder: 'Search or enter address',
            value: '',
            readOnly: true
          }),
          jsx(Button, {
            'aria-label': 'Close browser',
            'data-testid': 'native-browser-close',
            onClick: () => setDrawerOpen(false),
            size: 'icon-xs',
            variant: 'ghost',
            children: jsx(Codicon, { name: 'close', size: '0.75rem' })
          })
        ]
      }),
      jsx('div', {
        className: 'min-h-0 flex-1 bg-white',
        'data-testid': 'native-browser-viewport',
        'aria-label': 'Browser viewport'
      })
    ]
  })
}

function registerPane() {
  if (!pluginContext || paneDisposer) return

  paneDisposer = pluginContext.register({
    id: 'drawer',
    area: PANES_AREA,
    title: 'Browser',
    data: {
      placement: 'right',
      dock: { pane: 'workspace', pos: 'right' },
      width: 'clamp(22rem, 36vw, 48rem)',
      minWidth: '18rem',
      maxWidth: '72vw',
      headerVeto: true
    },
    render: () => jsx(DrawerPane, {})
  })
}

function setDrawerOpen(next) {
  if (next === open) return

  open = next
  if (open) {
    registerPane()
  } else {
    paneDisposer?.()
    paneDisposer = null
  }
  emit()
}

function DrawerToggle() {
  const isOpen = useSyncExternalStore(subscribe, snapshot, snapshot)

  return jsx('div', {
    style: {
      position: 'fixed',
      right: 'calc(var(--titlebar-tools-right) + 9rem)',
      top: 'var(--titlebar-controls-top)',
      zIndex: 71,
      pointerEvents: 'auto',
      WebkitAppRegion: 'no-drag'
    },
    children: jsx(Tip, {
      label: isOpen ? 'Close browser' : 'Open browser',
      children: jsx(Button, {
        'aria-label': isOpen ? 'Close browser' : 'Open browser',
        'aria-pressed': isOpen,
        'data-testid': 'native-browser-toggle',
        onClick: () => setDrawerOpen(!isOpen),
        onPointerDown: event => event.stopPropagation(),
        size: 'icon-titlebar',
        variant: 'ghost',
        children: jsx(Codicon, { name: 'globe', size: '0.8rem' })
      })
    })
  })
}

export default {
  id: 'native-browser-drawer',
  name: 'Browser Drawer',
  defaultEnabled: true,
  register(ctx) {
    pluginContext = ctx
    ctx.register({
      id: 'toggle',
      area: TITLEBAR_AREAS.right,
      order: 900,
      render: () => jsx(DrawerToggle, {})
    })
  }
}
