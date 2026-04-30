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

function copyDirectory(src, dest, ignore) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, {recursive: true})
  }

  const entries = fs.readdirSync(src, {withFileTypes: true})

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    // Check if should ignore
    const shouldIgnore = ignore.some(pattern => {
      const patternStr = pattern.replace(/\/$/, '')
      if (pattern.endsWith('/')) {
        // Directory pattern
        return srcPath.includes(`/${patternStr}`) || srcPath.endsWith(patternStr)
      } else {
        // File pattern
        return srcPath.endsWith(patternStr) || srcPath === `./${patternStr}`
      }
    })

    if (shouldIgnore) {
      continue
    }

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath, ignore)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

for (let manifestVersion of manifestVersions) {
  console.log(`\nBuilding MV${manifestVersion} version`)
  let manifestFile = `manifest.mv${manifestVersion}.json`
  let manifestData = require(`../${manifestFile}`)

  // Create build directory
  const buildDir = './build'
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, {recursive: true, force: true})
  }
  fs.mkdirSync(buildDir, {recursive: true})

  // Copy files to build directory
  console.log('Copying files to build directory...')
  copyDirectory('./', buildDir, ignoreFiles)

  // Copy manifest.json
  fs.copyFileSync(`./${manifestFile}`, `${buildDir}/manifest.json`)

  // Also copy to root for development
  if (manifestVersion === 3) {
    fs.copyFileSync(`./${manifestFile}`, './manifest.json')
  }

  // Build in the build directory
  console.log('Building extension...')
  execSync(`web-ext build --source-dir=${buildDir} --artifacts-dir=${buildDir}`, {stdio: 'inherit'})

  // Rename the output file
  let renameTo = `${buildDir}/control_panel_for_twitter-${manifestData['version']}.mv${manifestVersion}.zip`
  fs.renameSync(
    `${buildDir}/control_panel_for_twitter-${manifestData['version']}.zip`,
    renameTo,
  )
  console.log('Built:', path.resolve(renameTo))
}