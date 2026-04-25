import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const srcFile = path.join(root, 'src', 'database', 'schema.sql')
const destFile = path.join(root, 'dist', 'database', 'schema.sql')

if (!fs.existsSync(srcFile)) {
  console.error('copy-schema: src/database/schema.sql not found:', srcFile)
  process.exit(1)
}

fs.mkdirSync(path.dirname(destFile), { recursive: true })
fs.copyFileSync(srcFile, destFile)
console.log('copy-schema: dist/database/schema.sql')
