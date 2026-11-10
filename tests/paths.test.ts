import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baseName, isSinglePathSegment, joinHostPath, looksFullyQualified, parentOf, pathsRoughlyEqual, validateWorkspaceName } from '../src/shared/paths.ts'

test('validateWorkspaceName accepts a single segment', () => {
  assert.deepEqual(validateWorkspaceName('  my-app  '), { ok: true, name: 'my-app' })
})

test('validateWorkspaceName rejects empty, dots, and separators', () => {
  const empty = validateWorkspaceName('')
  const dot = validateWorkspaceName('.')
  const parent = validateWorkspaceName('..')
  const slash = validateWorkspaceName('foo/bar')
  const back = validateWorkspaceName('foo\\bar')
  assert.equal(empty.ok, false)
  assert.equal(empty.ok === false ? empty.reason : undefined, 'empty')
  assert.equal(dot.ok === false ? dot.reason : undefined, 'dot')
  assert.equal(parent.ok === false ? parent.reason : undefined, 'dot')
  assert.equal(slash.ok === false ? slash.reason : undefined, 'separator')
  assert.equal(back.ok === false ? back.reason : undefined, 'separator')
})

test('isSinglePathSegment', () => {
  assert.equal(isSinglePathSegment('repo'), true)
  assert.equal(isSinglePathSegment('..'), false)
  assert.equal(isSinglePathSegment('a/b'), false)
})

test('joinHostPath follows the parent separator', () => {
  assert.equal(joinHostPath('/Users/me/Documents/deepseek-harness', 'demo'), '/Users/me/Documents/deepseek-harness/demo')
  assert.equal(joinHostPath('C:\\Users\\me\\Documents\\deepseek-harness', 'demo'), 'C:\\Users\\me\\Documents\\deepseek-harness\\demo')
})

test('parentOf and baseName', () => {
  assert.equal(baseName('/tmp/deepseek-harness/default-workspace'), 'default-workspace')
  assert.equal(parentOf('/tmp/deepseek-harness/default-workspace'), '/tmp/deepseek-harness')
  assert.equal(parentOf('/'), null)
})

test('pathsRoughlyEqual is slash- and case-tolerant on drive paths', () => {
  assert.equal(pathsRoughlyEqual('/tmp/Foo/', '/tmp/Foo'), true)
  assert.equal(pathsRoughlyEqual('C:\\Work\\App', 'C:/Work/App'), true)
})

test('looksFullyQualified', () => {
  assert.equal(looksFullyQualified('/tmp/foo'), true)
  assert.equal(looksFullyQualified('C:\\tmp\\foo'), true)
  assert.equal(looksFullyQualified('relative/path'), false)
  assert.equal(looksFullyQualified('C:work'), false)
})
