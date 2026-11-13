import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Subprocess-based engine tests and the heavy dsh-tools plugin mounting need room.
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // The forks pool makes spawnSync children pathologically slow on this host
    // (python ~4s, node hangs past 10s); the threads pool runs them at normal speed.
    pool: 'threads',
  },
})
