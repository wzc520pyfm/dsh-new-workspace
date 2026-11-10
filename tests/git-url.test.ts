import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inferFolderFromGitUrl, isGitUrl } from '../src/shared/git-url.ts'

test('isGitUrl accepts HTTPS and SSH forms', () => {
  assert.equal(isGitUrl('https://github.com/org/repo.git'), true)
  assert.equal(isGitUrl('git@github.com:org/repo.git'), true)
  assert.equal(isGitUrl('ssh://git@github.com/org/repo.git'), true)
  assert.equal(isGitUrl('not a url'), false)
  assert.equal(isGitUrl(''), false)
})

test('inferFolderFromGitUrl strips .git and uses the last segment', () => {
  assert.equal(inferFolderFromGitUrl('https://github.com/org/repo.git'), 'repo')
  assert.equal(inferFolderFromGitUrl('https://github.com/org/repo'), 'repo')
  assert.equal(inferFolderFromGitUrl('git@github.com:org/my-repo.git'), 'my-repo')
  assert.equal(inferFolderFromGitUrl('ssh://git@github.com/org/my-repo.git'), 'my-repo')
  assert.equal(inferFolderFromGitUrl('https://github.com/org/repo.git/'), 'repo')
})

test('inferFolderFromGitUrl rejects unusable names', () => {
  assert.equal(inferFolderFromGitUrl('https://github.com/'), null)
  assert.equal(inferFolderFromGitUrl(''), null)
})
