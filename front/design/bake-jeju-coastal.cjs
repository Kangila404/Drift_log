const fs = require('node:fs')
const path = require('node:path')
const { load } = require('./check-city-geometry.cjs')
const { makeBatches, bakeCityOcclusion } = require('./bake-chinatown-occlusion.cjs')
const root = path.resolve(__dirname, '../src/components/r3f/jeju')
const { buildCoastalVillage } = load(path.join(root, 'CoastalVillage.ts'))
const batches = makeBatches(buildCoastalVillage)
try {
  const data = Buffer.from(bakeCityOcclusion(batches))
  fs.mkdirSync(path.join(root, 'baked'), { recursive: true })
  fs.writeFileSync(path.join(root, 'baked/coastal-village.bin'), data)
  console.log(`Jeju static contact shading: ${data.length} bytes; shared across viewports`)
} finally {
  batches.forEach(({ geometry }) => geometry.dispose())
}
