// Descarga dependencias frontend locales
const https = require('https')
const fs    = require('fs')
const path  = require('path')

const deps = [
  {
    url:  'https://cdn.jsdelivr.net/npm/water.css@2/out/water.min.css',
    dest: path.join(__dirname, '../public/css/water.min.css')
  }
]

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        return download(res.headers.location, dest).then(resolve).catch(reject)
      }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    }).on('error', (err) => {
      fs.unlink(dest, () => {})
      reject(err)
    })
  })
}

async function main() {
  for (const dep of deps) {
    console.log(`Descargando ${path.basename(dep.dest)}...`)
    await download(dep.url, dep.dest)
    console.log(`  OK: ${dep.dest}`)
  }
  console.log('\nDependencias instaladas.')
}

main().catch(console.error)
