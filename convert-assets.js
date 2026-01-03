const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const sourceDir = 'C:\\Users\\Tony\\Downloads\\war3.w3mod\\ui';
const outputDir = path.join(__dirname, 'client', 'public', 'assets');

// Key assets to convert
const assetsToConvert = [
  // Console backgrounds
  'console/reforged/console-reforged-background.blp',
  'console/human/console-human-background.blp',
  'console/orc/console-orc-background.blp',
  'console/undead/console-undead-background.blp',
  'console/nightelf/console-nightelf-background.blp',
  
  // Buttons
  'glues/mainmenu/mainmenu-buttonpanel.blp',
  'glues/mainmenu/mainmenu-wood.blp',
  'glues/mainmenu/mainmenu-background.blp',
  
  // Additional UI elements
  'glues/loading/loading-background.blp',
  'glues/scorescreen/scorescreen-frame.blp',
];

console.log('BLP to PNG Converter');
console.log('===================\n');

// Check if ImageMagick is installed
try {
  execSync('magick --version', { stdio: 'ignore' });
  console.log('✓ ImageMagick detected\n');
} catch (error) {
  console.log('⚠ ImageMagick not found. Please install ImageMagick:');
  console.log('  Download from: https://imagemagick.org/script/download.php');
  console.log('  Or use: winget install ImageMagick.ImageMagick\n');
  console.log('Alternative: Manual conversion required for .blp files\n');
  process.exit(1);
}

// Create output directories
const dirsToCreate = [
  'console/reforged',
  'console/human',
  'console/orc',
  'console/undead',
  'console/nightelf',
  'glues/mainmenu',
  'glues/loading',
  'glues/scorescreen',
];

dirsToCreate.forEach(dir => {
  const fullPath = path.join(outputDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created: ${dir}`);
  }
});

console.log('\nConverting assets...\n');

let converted = 0;
let failed = 0;
let notFound = 0;

assetsToConvert.forEach(asset => {
  const sourcePath = path.join(sourceDir, asset);
  const outputPath = path.join(outputDir, asset.replace('.blp', '.png'));
  
  if (!fs.existsSync(sourcePath)) {
    console.log(`⚠ Not found: ${asset}`);
    notFound++;
    return;
  }
  
  try {
    // Try to convert using ImageMagick
    execSync(`magick "${sourcePath}" "${outputPath}"`, { stdio: 'ignore' });
    console.log(`✓ Converted: ${asset} -> PNG`);
    converted++;
  } catch (error) {
    console.log(`✗ Failed: ${asset}`);
    failed++;
  }
});

console.log('\n===================');
console.log(`Results: ${converted} converted, ${notFound} not found, ${failed} failed`);
console.log('\nNote: If conversion failed, .blp files may need specialized tools:');
console.log('  - BLPConverter: https://www.hiveworkshop.com/threads/blp-converter.23991/');
console.log('  - Warcraft 3 Viewer: https://www.hiveworkshop.com/threads/warcraft-3-viewer.62701/');
