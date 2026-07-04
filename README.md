# pi-strip-at-paths

A Pi extension that strips the leading `@` from `@file` references in interactive input, so models don't treat `@` as part of the filename.

## Problem

In pi's interactive editor, typing `@` triggers fuzzy file-finding, but the selected token is inserted **verbatim** — the literal `@path/to/file` is sent to the model. Most models correctly read it as a path reference, but some treat the `@` as part of the filename. This breaks when the referenced file is an executable script: the model tries to launch `@script.sh` (or `./@script.sh`) and fails.

Note: the interactive `@` never inlines file *contents* (unlike the CLI `pi @file "…"` form) — it is purely a path-completion aid. This extension only fixes the leftover `@`; it does not inline content.

## Solution

The extension hooks the `input` event and, before the message reaches the model, removes the leading `@` from any token that resolves to a real path.

**Safety:** the `@` is stripped **only** when the following token exists on disk (relative to the current working directory, with `~` expansion). This leaves untouched:

- email addresses (`user@host`)
- decorators (`@override`)
- scoped npm packages (`@earendil-works/pi`)

...because none of those exist as a path as written. The path body and any trailing sentence punctuation are preserved verbatim — only the leading `@` is removed.

`~` is expanded solely to perform the existence check; the emitted text keeps your original `~/...` token, which pi resolves downstream (the `read` tool via `resolveReadPath`, bash via the shell).

## Installation

Place the `pi-strip-at-paths` directory in one of Pi's extension locations, or reference it from a package manifest via its `pi.extensions` field:

- Project-local: `.pi/extensions/pi-strip-at-paths/`
- Global: `~/.pi/agent/extensions/pi-strip-at-paths/`

Then run `/reload` inside pi, or restart.

Quick test without installing:

```bash
pi -e ./src/index.ts
```

## How it works

```
you type:   run @scripts/build.sh and check @notes.md
sent:       run scripts/build.sh and check notes.md
```

Tokens that don't resolve to a real path are left with their `@` intact.

## Development

```bash
npm run check   # type-check
npm run build   # emit to dist/
```

## License

MIT
