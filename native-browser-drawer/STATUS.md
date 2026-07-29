# Hermes Native Browser Drawer — Current State

## Architecture

The work targets the official Hermes Desktop application, not the web dashboard or CLI/TUI.

```text
Hermes Desktop
├── Original navigation
├── Original Chat workspace
├── Original Settings
└── Optional right-side browser drawer
```

The drawer is contributed through the desktop plugin system. It is absent while closed, opens only when requested, docks to the right of the native workspace, uses Hermes' existing resizable pane layout, and returns all space to Chat when closed.

## Implemented

- Native title-bar browser toggle.
- Dynamically registered right-side pane.
- Native draggable divider through Hermes' pane tree.
- Close and reopen behavior.
- Validation test covering Settings, Chat, open, resize wider, resize narrower, close, restart, and repeat.
- Validation that no embedded terminal/TUI appears in Chat or the native no-provider state.

## Not implemented

- Browser engine connection.
- Browser navigation controls.
- Per-chat browser process/session wiring.
- Persistent browser profiles.
- Packaged release.

The current viewport is intentionally an empty placeholder. No fake Browser Ready document, data URL, webview, permanent browser column, or separate Browser route is used.
