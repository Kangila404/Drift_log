const fs = require('node:fs')
const path = require('node:path')
const { load } = require('./check-city-geometry.cjs')
const { makeBatches, bakeCityOcclusion } = require('./bake-chinatown-occlusion.cjs')
const root = path.resolve(__dirname, '../src/components/r3f/pohang')
const { buildHarborLandmark, buildHarborQuarter } = load(path.join(root, 'HarborQuarter.ts'))
fs.mkdirSync(path.join(root, 'baked'), { recursive: true })
for (const portrait of [false, true]) for (const [name, build] of [['lighthouse', buildHarborLandmark], ['harbor', buildHarborQuarter]]) {
  const batches = makeBatches(kit => build(kit, portrait))
  try {
    const bytes = Buffer.from(bakeCityOcclusion(batches))
    fs.writeFileSync(path.join(root, 'baked', `${name}-${portrait ? 'portrait' : 'desktop'}.bin`), bytes)
    console.log(`${name}/${portrait}: ${bytes.length} bytes`)
  } finally { batches.forEach(({ geometry }) => geometry.dispose()) }
}
