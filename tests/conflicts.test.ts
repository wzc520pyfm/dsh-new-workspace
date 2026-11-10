import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DIRECTORY_FLOW_PRIORITY, PLUGIN_ID } from '../src/shared/types.ts'

test('directory-flow priority is below official 0 and common community values', () => {
  assert.equal(PLUGIN_ID, 'dsh-new-workspace')
  assert.ok(DIRECTORY_FLOW_PRIORITY < 0)
  assert.ok(DIRECTORY_FLOW_PRIORITY < -10)
  assert.ok(DIRECTORY_FLOW_PRIORITY < -100)
})
