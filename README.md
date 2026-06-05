# BoardRipper API

Parser API service for Revolio's board viewer. Uses BoardRipper parsers (AGPL-3.0) to parse boardview files and return structured JSON.

## Setup

### 1. Extract parsers from BoardRipper

```bash
# Clone BoardRipper
git clone https://github.com/AlexeyInwerp/BoardRipper.git /tmp/BoardRipper

# Extract parsers
BOARDRIPPER_REPO=/tmp/BoardRipper npx tsx scripts/extract-parsers.ts
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run locally

```bash
npm run dev
# Server starts on http://localhost:3001
```

## API

### POST /api/parse

Parse a board file from URL.

```json
{
  "url": "https://r2.example.com/board-files/xxx.brd",
  "fileName": "iphone14.brd"
}
```

Response: `BoardData` JSON with parts, nets, pins, layers, outline.

### POST /api/parse-raw

Parse a board file from base64-encoded bytes.

```json
{
  "data": "base64-encoded-bytes...",
  "fileName": "iphone14.brd"
}
```

### GET /api/health

Health check. Returns `{ "status": "ok" }`.

## Deploy on Render

1. Push this directory to a Git repository
2. Create a new Web Service on Render
3. Connect the repo
4. Settings:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment: Node
   - Port: 3001

Or use Docker:
```bash
docker build -t boardripper-api .
docker run -p 3001:3001 boardripper-api
```

## License

The parser code in `src/parsers/` is AGPL-3.0 (from BoardRipper).
The API wrapper in `src/server.ts` is MIT.
