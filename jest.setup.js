// Polyfills MUST be loaded first, before any other imports

// Polyfills for Web APIs needed by Next.js and pg library
const { TextEncoder, TextDecoder } = require('util')
const { ReadableStream, TransformStream } = require('stream/web')

// Add Web API polyfills to global scope
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
global.ReadableStream = ReadableStream
global.TransformStream = TransformStream

// Polyfill for Request/Response (needed for NextRequest)
// Use undici which provides fetch API polyfill
if (typeof global.Request === 'undefined') {
  try {
    const { Request, Response, Headers, fetch } = require('undici')
    global.Request = Request
    global.Response = Response
    global.Headers = Headers
    global.fetch = fetch
  } catch (e) {
    // Fallback: use node-fetch if undici is not available
    console.warn('undici not available, using node-fetch fallback')
  }
}

// Now import testing library
require('@testing-library/jest-dom')

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key-for-testing-only'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db'
process.env.STORAGE_TYPE = 'local'
process.env.STORAGE_LOCAL_DIR = './test-uploads'
