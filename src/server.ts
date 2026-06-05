import express from 'express'
import cors from 'cors'

const app = express()
const PORT = parseInt(process.env.PORT || '3001', 10)

app.use(cors())
app.use(express.json({ limit: '50mb' }));

// Pre-fetch FZ key on startup (for ASUS .fz encrypted files)
let fzKeyReady = false
async function ensureFzKey() {
  if (fzKeyReady) return
  try {
    const { fzKeyStore } = await import('./store/fz-key-store.js')
    await fzKeyStore.fetchKey()
    fzKeyReady = true
  } catch (e) {
    console.warn('Could not pre-fetch FZ key:', e)
  }
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'boardripper-api', fzKeyReady })
})

// Parse board file from URL
app.post('/api/parse', async (req, res) => {
  try {
    const { url, fileName } = req.body

    if (!url) {
      return res.status(400).json({ error: 'url is required' })
    }

    await ensureFzKey()

    // Dynamic import of parsers (AGPL-3.0 - from BoardRipper)
    const { parseBoardFile } = await import('./parsers/index.js')

    // Download file
    const response = await fetch(url)
    if (!response.ok) {
      return res.status(400).json({ error: `Failed to download file: ${response.status}` })
    }

    const arrayBuffer = await response.arrayBuffer()

    // Parse board file
    const boardData = await parseBoardFile(arrayBuffer, fileName || url.split('/').pop())

    res.json(boardData)
  } catch (error: any) {
    console.error('Parse error:', error)
    res.status(500).json({ error: error.message || 'Failed to parse board file' })
  }
})

// Parse board file from raw bytes (base64)
app.post('/api/parse-raw', async (req, res) => {
  try {
    const { data, fileName } = req.body

    if (!data) {
      return res.status(400).json({ error: 'data (base64) is required' })
    }

    await ensureFzKey()

    const { parseBoardFile } = await import('./parsers/index.js')

    const buffer = Buffer.from(data, 'base64')
    const boardData = await parseBoardFile(buffer.buffer, fileName)

    res.json(boardData)
  } catch (error: any) {
    console.error('Parse error:', error)
    res.status(500).json({ error: error.message || 'Failed to parse board file' })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`BoardRipper API running on port ${PORT}`)
  // Pre-fetch FZ key in background
  ensureFzKey().catch(() => {})
})
