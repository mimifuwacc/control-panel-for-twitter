const {execSync} = require('child_process')
const path = require('path')
const fs = require('fs')

let manifestVersions = [3]
if (process.argv[2] && manifestVersions.includes(Number(process.argv[2]))) {
  manifestVersions = [Number(process.argv[2])]
}

const ignoreFiles = [
  'CONTRIBUTING.md',
  'PRIVACY_POLICY.md',
  'README.md',
  'jsconfig.json',
  'manifest.mv2.json',
  'manifest.mv3.json',
  'package-lock.json',
  'package.json',
  'pnpm-lock.yaml',
  'promo/',
  'safari/',
  'screenshots/',
  'scripts/',
  'types.d.ts',
  'node_modules/',
  '.git/',
  '.github/',
  '.vscode/',
  '.envrc',
  '.devbox/',
  'devbox.json',
  'devbox.lock',
  'web-ext-artifacts/',
  'build/',
]

function shouldIgnoreFile(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/')
  return ignoreFiles.some(pattern => {
    const patternStr = pattern.replace(/\/$/, '')
    if (pattern.endsWith('/')) {
      return normalizedPath.startsWith(patternStr) || normalizedPath.includes(`/${patternStr}/`)
    }
    return normalizedPath.endsWith(patternStr) || normalizedPath === patternStr
  })
}

function createZip(sourceDir, outputPath) {
  // Create a list of files to include
  const filesToInclude = []

  function collectFiles(dir) {
    const entries = fs.readdirSync(dir, {withFileTypes: true})

    for (let entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const relativePath = path.relative(sourceDir, fullPath)

      if (shouldIgnoreFile(relativePath)) {
        continue
      }

      if (entry.isDirectory()) {
        collectFiles(fullPath)
      } else {
        filesToInclude.push(relativePath)
      }
    }
  }

  collectFiles(sourceDir)

  // Create zip using system zip command
  const args = [
    '-r',  // recursive
    outputPath,
    ...filesToInclude
  ]

  execSync(`zip ${args.join(' ')}`, {cwd: sourceDir, stdio: 'inherit'})
}

for (let manifestVersion of manifestVersions) {
  console.log(`\nBuilding MV${manifestVersion} version`)
  let manifestFile = `manifest.mv${manifestVersion}.json`

  // Also copy to root for development
  if (manifestVersion === 3) {
    fs.copyFileSync(`./${manifestFile}`, './manifest.json')
  }

  // Generate timestamp for version
  const now = new Date()
  const timestamp = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}.${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`

  // Create zip file
  console.log('Creating zip file...')
  const outputPath = `./build/control_panel_for_twitter-${timestamp}.mv${manifestVersion}.zip`

  // Ensure build directory exists
  if (!fs.existsSync('./build')) {
    fs.mkdirSync('./build', {recursive: true})
  }

  createZip('./', outputPath)
  console.log('Built:', path.resolve(outputPath))
}