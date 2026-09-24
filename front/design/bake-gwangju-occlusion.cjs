const fs = require('node:fs')
const path = require('node:path')
const { load } = require('./check-city-geometry.cjs')
const { makeBatches, bakeCityOcclusion } = require('./bake-chinatown-occlusion.cjs')
const root = path.resolve(__dirname, '../src/components/r3f/gwangju')
const { buildCivicLandmark, buildCivicQuarter } = load(path.join(root, 'CivicQuarter.ts'))
fs.mkdirSync(path.join(root, 'baked'), { recursive: true })
for (const portrait of [false, true]) {
  for (const [name, build] of [['office', buildCivicLandmark], ['quarter', buildCivicQuarter]]) {
    const batches = makeBatches(kit => build(kit, portrait))
    try {
      const bytes = Buffer.from(bakeCityOcclusion(batches))
      const file = path.join(root, 'baked', `${name}-${portrait ? 'portrait' : 'desktop'}.bin`)
      fs.writeFileSync(file, bytes)
      console.log(`${path.basename(file)}: ${bytes.length} bytes`)
    } finally { batches.forEach(({ geometry }) => geometry.dispose()) }
  }
}
