import { R, W } from './paths.mjs'
import { pathToFileURL } from 'node:url'
process.loadEnvFile(R + '/sw/web-bo/.env')
const { database } = await import(pathToFileURL(R + '/scripts/browser/reading-way-argon.mjs').href)
const r = await database(process.argv[2], W)
console.log(r.text.trim())
