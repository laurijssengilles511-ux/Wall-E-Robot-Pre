import test from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'

test('Windows PowerShell 5.1 cold-starts a persistent server and repeated launch reuses it', { skip: process.platform !== 'win32', timeout: 60000 }, async () => {
  const probe = net.createServer()
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve))
  const port = probe.address().port
  await new Promise(resolve => probe.close(resolve))
  const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.resolve('Start-Show.ps1'), '-NoBrowser', '-Port', String(port)]
  let ownedPid
  try {
    const first = spawnSync('powershell.exe', args, { encoding: 'utf8', timeout: 30000, windowsHide: true })
    assert.equal(first.status, 0, first.stderr || String(first.error))
    assert.match(first.stdout, /READY/)
    ownedPid = Number((await readFile(`.runtime/server-${port}.pid`, 'ascii')).trim())
    const response = await fetch(`http://127.0.0.1:${port}/`)
    assert.equal(response.status, 200)
    assert.match(await response.text(), /瓦力机器人/)
    const second = spawnSync('powershell.exe', args, { encoding: 'utf8', timeout: 15000, windowsHide: true })
    assert.equal(second.status, 0, second.stderr)
    assert.equal(Number((await readFile(`.runtime/server-${port}.pid`, 'ascii')).trim()), ownedPid)
    assert.equal((await fetch(`http://127.0.0.1:${port}/portfolio/previews/tread-plate.png`)).status, 200)
  } finally {
    if (ownedPid) { try { process.kill(ownedPid) } catch { /* already stopped */ } }
  }
})
