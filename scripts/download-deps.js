// Descarga dependencias frontend locales
const https = require('https')
const fs    = require('fs')
const path  = require('path')

const deps = [
  // ... (otros assets)
  {
    url:  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/dist/umd/supabase.js',
    dest: path.join(__dirname, '../public/js/vendor/supabase.js')
  },
  {
    url:  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js',
    dest: path.join(__dirname, '../public/js/vendor/chart.js')
  },
  {
    url:  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
    dest: path.join(__dirname, '../public/js/vendor/jspdf.js')
  },
  {
    url:  'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
    dest: path.join(__dirname, '../public/js/vendor/html2canvas.js')
  },
  {
    url:  'https://cdn.jsdelivr.net/npm/water.css@2/out/water.min.css',
    dest: path.join(__dirname, '../public/css/water.min.css')
  },
  // Geist y Geist Mono – fuentes variables (licencia SIL OFL 1.1)
  {
    url:  'https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-sans/Geist-Variable.woff2',
    dest: path.join(__dirname, '../public/fonts/geist-variable.woff2')
  },
  {
    url:  'https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-mono/GeistMono-Variable.woff2',
    dest: path.join(__dirname, '../public/fonts/geist-mono-variable.woff2')
  },
  {
    url:  'https://cdn.jsdelivr.net/npm/dompurify@3.2.4/dist/purify.min.js',
    dest: path.join(__dirname, '../public/js/vendor/dompurify.js')
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
  const dirs = [
    path.join(__dirname, '../public/css'),
    path.join(__dirname, '../public/fonts'),
    path.join(__dirname, '../public/js/vendor')
  ]
  dirs.forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }) })

  for (const dep of deps) {
    console.log(`Descargando ${path.basename(dep.dest)}...`)
    await download(dep.url, dep.dest)
    console.log(`  OK: ${dep.dest}`)
  }
  console.log('\nDependencias instaladas.')
}

main().catch(console.error)
