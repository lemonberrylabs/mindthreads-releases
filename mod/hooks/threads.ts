import type { Thread } from '../types'

const ROW = /^(\s*)- \[.\] (.*?)\s+\(id ([0-9a-f-]{36});([^)]*)\)\s*$/
const ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/

/** Parses the outline `list_threads` answers: two spaces of indent per level. */
export function parseOutline(outline: string): Thread[] {
  const threads: Thread[] = []
  const parents: string[] = []

  for (const line of outline.split('\n')) {
    const row = ROW.exec(line)
    if (row === null) continue
    const depth = Math.floor((row[1] ?? '').length / 2)
    const id = row[3] ?? ''
    threads.push({
      id,
      parentId: depth === 0 ? null : (parents[depth - 1] ?? null),
      text: (row[2] ?? '').replace(/\s+/g, ' '),
      depth,
      isAsleep: /\basleep\b/.test(row[4] ?? ''),
    })
    parents[depth] = id
    parents.length = depth + 1
  }

  return threads
}

export function findId(text: string): string | undefined {
  return ID.exec(text)?.[0]
}

/** The thread and its ancestors, outermost first; empty when it is not open. */
export function pathTo(threads: readonly Thread[], id: string | null): Thread[] {
  const byId = new Map(threads.map(thread => [thread.id, thread]))
  const path: Thread[] = []
  let at = id === null ? undefined : byId.get(id)

  while (at !== undefined) {
    path.unshift(at)
    at = at.parentId === null ? undefined : byId.get(at.parentId)
  }

  return path
}

export function clip(text: string, width: number): string {
  if (width < 1) return ''

  return text.length <= width ? text : `${text.slice(0, width - 1)}…`
}

const SEPARATOR = ' › '

/**
 * The ancestors of a breadcrumb cut to `width` cells: outer ones are dropped
 * behind an ellipsis first, so the thread itself keeps the room.
 */
export function crumbPrefix(ancestors: readonly string[], width: number): string {
  const names = ancestors.map(name => clip(name, 24))

  for (let dropped = 0; dropped <= names.length; dropped += 1) {
    const kept = names.slice(dropped)
    const shown = dropped === 0 ? kept : ['…', ...kept]
    const prefix = shown.map(name => name + SEPARATOR).join('')
    if (prefix.length <= width) return prefix
  }

  return ''
}

/** Where the ring goes once `id` leaves the list: next sibling, previous row, parent. */
export function neighbor(threads: readonly Thread[], id: string): string | null {
  const at = threads.findIndex(thread => thread.id === id)
  const gone = threads[at]
  if (gone === undefined) return null
  const after = threads.slice(at + 1).find(thread => thread.depth <= gone.depth)
  if (after !== undefined && after.parentId === gone.parentId) return after.id

  return threads[at - 1]?.id ?? after?.id ?? null
}

/**
 * Whether a thread is about the project in `cwd`: a word of its top-level
 * thread's name appears in the path. Keeps a session from being filed under
 * another project's thread.
 */
export function isAboutProject(threads: readonly Thread[], id: string, cwd: string): boolean {
  const root = pathTo(threads, id)[0]
  if (root === undefined) return false
  const path = cwd.toLowerCase()
  const words = root.text.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []

  return words.some(word => path.includes(word))
}

/** The open top-level thread named for the project in `cwd`, if there is one. */
export function projectThread(threads: readonly Thread[], cwd: string): string | undefined {
  return threads.find(thread => thread.depth === 0 && isAboutProject(threads, thread.id, cwd))?.id
}

/** The name a project's own thread gets: its root folder's. */
export function projectName(root: string): string {
  return root.split(/[\\/]/).filter(part => part !== '').at(-1) ?? ''
}

export function hasChildren(threads: readonly Thread[], id: string): boolean {
  return threads.some(thread => thread.parentId === id)
}

/**
 * A thread's name as it may be quoted in the system prompt: one line of at
 * most 80 characters. Compatibility forms are folded first (a fullwidth quote
 * becomes a plain one), then control, format and separator characters become
 * spaces, and every kind of quote and angle bracket is removed.
 */
export function label(text: string): string {
  const plain = text
    .normalize('NFKC')
    .replace(/[\p{Cc}\p{Cf}\p{Co}\p{Cn}\p{Zl}\p{Zp}]/gu, ' ')
    .replace(/["'`<>\p{Pi}\p{Pf}\u2039\u203a\u3008-\u300f\u301d-\u301f]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()

  return clip(plain, 80)
}

const PATH_LIMIT = 240

/**
 * A thread's path as quoted in the system prompt: each name a `label`, and the
 * whole at most 240 characters, the outer ancestors dropped first.
 */
export function labelPath(path: readonly Thread[]): string {
  const names = path.map(thread => label(thread.text))
  while (names.length > 1 && names.join(' / ').length > PATH_LIMIT) names.shift()

  return clip(names.join(' / '), PATH_LIMIT)
}

/** The prefix of an MCP server's tool names, its name spelled as the engine spells it. */
export function toolPrefix(server: string): string {
  return `mcp__${server.replace(/[^a-zA-Z0-9_-]/g, '_')}__`
}
