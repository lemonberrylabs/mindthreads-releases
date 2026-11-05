export type Thread = {
  id: string
  parentId: string | null
  text: string
  depth: number
  isAsleep: boolean
}

/** A thread being typed in the band: where it will go once submitted. */
export type Draft = { kind: 'child' | 'sibling' | 'top'; parentId: string | null }

declare module 'claude-code' {
  interface PluginState {
    'mindthreads': {
      threads: Thread[]
      current: string | null
      ring: string | null
      isFocused: boolean
      draft: Draft | null
      isOffline: boolean
      armed: string | null
    }
  }
}
