const test = require('node:test'), assert = require('node:assert/strict')
const { loadTS } = require('./support/load-ts.cjs')
const env = { EVOLUTION_API_URL: 'https://provider.example.invalid/', EVOLUTION_API_KEY: 'fixture-only-private-key', EVOLUTION_INSTANCE_NAME: 'school' }
const open = [{ name: 'school', connectionStatus: 'open', ownerJid: '5581999999999@s.whatsapp.net' }]
function scenario(responses = [], settings = env) {
  const calls = []
  const client = loadTS('lib/whatsapp/evolution.ts', { 'server-only': {}, qrcode: { default: require('qrcode') } }, {
    process: { env: settings }, URL, AbortSignal,
    fetch: async (url, options) => {
      calls.push({ url, options })
      const response = responses.shift()
      if (!response) throw new Error('Unexpected provider request')
      return Response.json(response.body, { status: response.status || 200 })
    },
  })
  return { client, calls }
}
test('missing provider configuration is explicit and cannot create an instance or send a message', async () => {
  const run = scenario([], {})
  const status = await run.client.getEvolutionInstanceStatus()
  assert.equal(status.state, 'not_configured')
  assert.equal(status.configured, false)
  assert.match((await run.client.getEvolutionQRCode()).error, /configurado/)
  assert.equal((await run.client.sendEvolutionWhatsApp({ phone: '81999999999', message: 'Fixture' })).success, false)
  assert.equal(run.calls.length, 0)
})
test('connected flat and wrapped instances are identified without exposing provider credentials', async () => {
  for (const body of [open, [{ instance: { instanceName: 'school', status: 'open', owner: '5581999999999@s.whatsapp.net' } }]]) {
    const run = scenario([{ body }])
    const status = await run.client.getEvolutionInstanceStatus()
    assert.equal(status.connected, true)
    assert.equal(status.ownerNumber, '5581999999999')
    assert.equal(JSON.stringify(status).includes(env.EVOLUTION_API_KEY), false)
  }
})
test('requesting a QR for an already paired device preserves it and does not recreate the instance', async () => {
  const run = scenario([{ body: open }])
  assert.equal((await run.client.getEvolutionQRCode()).connected, true)
  assert.equal(run.calls.length, 1)
  assert.ok(run.calls[0].url.includes('/instance/fetchInstances'))
})
test('a new instance uses the QR returned during creation and never shares the global key in its body', async () => {
  const run = scenario([{ body: [] }, { body: { qrcode: { base64: 'data:image/png;base64,ZmFrZQ==' } } }])
  assert.equal((await run.client.getEvolutionQRCode()).base64, 'data:image/png;base64,ZmFrZQ==')
  assert.equal(run.calls.length, 2)
  assert.ok(run.calls[1].url.endsWith('/instance/create'))
  assert.equal('token' in JSON.parse(run.calls[1].options.body), false)
  assert.equal(run.calls[1].options.headers.apikey, env.EVOLUTION_API_KEY)
})
test('existing closed instances render a raw QR locally without recreating or contacting another service', async () => {
  const run = scenario([{ body: [{ name: 'school', connectionStatus: 'close' }] }, { body: { code: '2@a-synthetic-connection-code-for-testing' } }])
  assert.match((await run.client.getEvolutionQRCode()).base64, /^data:image\/png;base64,/)
  assert.equal(run.calls.length, 2)
  assert.ok(run.calls[1].url.endsWith('/instance/connect/school'))
  assert.ok(run.calls.every(call => call.url.startsWith('https://provider.example.invalid/')))
})
test('rejected credentials stop QR generation and do not expose the upstream error body', async () => {
  const run = scenario([{ body: [] }, { status: 401, body: { message: 'sensitive-upstream-stack-or-key' } }])
  const result = await run.client.getEvolutionQRCode()
  assert.equal(result.state, 'unauthorized')
  assert.match(result.error, /recusada/)
  assert.equal(JSON.stringify(result).includes('sensitive-upstream'), false)
  assert.equal(run.calls.length, 2)
})
test('a QR still being prepared is distinguished from a failed provider', async () => {
  const run = scenario([{ body: [{ name: 'school', connectionStatus: 'connecting' }] }, { body: { count: 0 } }])
  const result = await run.client.getEvolutionQRCode()
  assert.equal(result.retryable, true)
  assert.equal(result.state, 'connecting')
})
test('a failed logout never silently deletes the instance or reports success', async () => {
  const run = scenario([{ status: 500, body: { error: 'failure' } }])
  assert.equal((await run.client.disconnectEvolutionWhatsApp()).success, false)
  assert.equal(run.calls.length, 1)
  assert.ok(run.calls[0].url.endsWith('/instance/logout/school'))
  assert.equal(run.calls[0].options.method, 'DELETE')
})
test('callup image failures with text fallback disabled never silently become a text send', async () => {
  const run = scenario([{ status: 500, body: {} }])
  assert.equal((await run.client.sendEvolutionWhatsAppMedia({ phone: '81999999999', media: 'ZmFrZQ==', caption: 'Fixture', fallbackToText: false })).success, false)
  assert.equal(run.calls.length, 1)
  assert.ok(run.calls[0].url.includes('/message/sendMedia/'))
})
