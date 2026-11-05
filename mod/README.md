# Mindthreads for Claude Code

A Claude Code plugin that shows the Mindthreads thread the session is working
on, as a breadcrumb from its top-level thread, and connects the Mindthreads MCP
tools. The breadcrumb is the plugin's status line: under the prompt box, above
the session's own status line.

## Install

Needs Claude Code 2.1.275 or later and the Mindthreads app running. At the
prompt of a Claude Code session in a terminal:

```
/plugin install mindthreads --marketplace lemonberrylabs/mindthreads-releases
```

Answer `y` to add the marketplace, then pick the user scope. From a shell:
`claude plugin install mindthreads --marketplace lemonberrylabs/mindthreads-releases`.
In the desktop app: + next to the prompt box, Plugins, Add marketplace with
`lemonberrylabs/mindthreads-releases`, then Add plugin.

Updates arrive with `claude plugin update mindthreads@mindthreads`, or on their
own once auto-update is on for the marketplace (`/plugin`, Marketplaces).

## Keys

| Key | Does |
| --- | --- |
| `ctrl+x tab` | Opens the thread tree from the prompt |
| `up` / `down` | Move through the threads |
| `enter` | Make the selected thread this session's thread |
| `c` / `s` / `n` | New child / sibling / top-level thread |
| `x` | Resolve the selected thread |
| `d` `d` | Delete the selected thread (its children move up) |
| `esc` | Back to the prompt |

## How a session gets its thread

On the session's first prompt the mod asks the small model to name the work
and to say whether an open thread already covers it. It reuses that thread, or
creates a new one, and touches it.

A new thread is always a child, so the sessions of one project are siblings.
Its parent is the open thread the model picked for the project, when that
thread is under the project's own thread; otherwise it is the project's thread
itself. The project's thread is the one remembered for the repository, or an
open top-level thread with a word of its name in the working directory's path,
or a new top-level thread named after the repository's root folder. Sessions
that start together and each create that thread keep the first and delete the
rest.

After that the session's thread is the last one touched from it: by `enter` in
the tree, or by Claude calling `touch_thread` (a system-prompt section asks it
to do so for sub-tasks and topic changes). If you also added the server
yourself (`claude mcp add ... mindthreads`), the session runs that one instead
of the plugin's, and the plugin follows the tools under that name. The choice
is stored per session id, so a resumed session keeps its thread.

## When a session's thread is resolved

When a session ends (`/exit`, `/clear`, a `-p` run finishing, switching to
another session with `/resume`), the mod completes the thread it created for
that session. If that leaves the project thread the mod created with no open
child, it completes that too. Resuming the session reopens both.

Left open: a thread with open children (they are work to come back to), and any
thread the mod did not create, such as one you picked in the tree.

The `resolveOn` option under `pluginConfigs` changes when this happens: `end`
(the default, every way a session ends), `clear` (only `/clear`) or `never`.

## Settings

The `url` option under `pluginConfigs` in `~/.claude/settings.json` changes the
MCP endpoint, for when the app's port was changed in its settings (default
`http://127.0.0.1:47821/mcp`).

## A shorter key for the tree

Add a binding to `~/.claude/keybindings.json` to open the tree with one key:

```json
{ "context": "Chat", "bindings": { "shift+down": "abovePrompt:focus" } }
```

Binding a bare `down` works too, but it then takes the key everywhere in the
prompt: down no longer moves the cursor in a multi-line prompt or steps forward
through history.

## Developing

`claude plugin test mod` runs the tests and `claude plugin validate mod` checks
the manifest and module. To run a working copy instead of the published plugin,
uninstall it and start Claude Code with `claude --plugin-dir mod`.
