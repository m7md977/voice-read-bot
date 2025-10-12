/**
 * Discloud Deployment ZIP Creator
 * Automatically creates a ZIP file ready for Discloud upload
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if archiver is available, if not use a simpler approach
let archiver;
try {
  archiver = require('archiver');
} catch (e) {
  console.log('⚠️  archiver not found, will use system zip command if available');
}

console.log('🚀 Creating Discloud deployment package...\n');

// Step 1: Build TypeScript
console.log('📦 Step 1/4: Building TypeScript...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build successful!\n');
} catch (error) {
  console.error('❌ Build failed! Fix TypeScript errors first.');
  process.exit(1);
}

// Step 2: Verify required files
console.log('🔍 Step 2/4: Verifying required files...');
const requiredFiles = [
  'dist/index.js',
  'dist/config.js',
  'dist/commands/read.js',
  'dist/services/voice/VoiceReadManager.js',
  'package.json',
  'discloud.config'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`   ❌ Missing: ${file}`);
    allFilesExist = false;
  } else {
    console.log(`   ✅ ${file}`);
  }
}

// Check for .env file
if (!fs.existsSync('.env')) {
  console.log('   ⚠️  .env file not found!');
  console.log('');
  console.log('   📝 Create a .env file with your configuration:');
  console.log('      Copy .env.template to .env and fill in your values');
  console.log('');
  console.error('❌ Cannot proceed without .env file.');
  console.error('   Run: copy .env.template .env (Windows)');
  console.error('   Or:  cp .env.template .env (Mac/Linux)');
  console.error('   Then edit .env with your actual tokens.');
  process.exit(1);
} else {
  console.log(`   ✅ .env`);
}

if (!allFilesExist) {
  console.error('\n❌ Some required files are missing. Cannot proceed.');
  process.exit(1);
}
console.log('✅ All required files present!\n');

// Step 3: Create ZIP file
console.log('📦 Step 3/4: Creating ZIP file...');
const zipFileName = 'discloud-deploy.zip';

// Remove old ZIP if exists
if (fs.existsSync(zipFileName)) {
  fs.unlinkSync(zipFileName);
  console.log('   🗑️  Removed old ZIP file');
}

if (archiver) {
  // Use archiver if available (better)
  createZipWithArchiver(zipFileName);
} else {
  // Fallback to system command
  createZipWithSystemCommand(zipFileName);
}

function createZipWithArchiver(zipFileName) {
  const output = fs.createWriteStream(zipFileName);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });

  output.on('close', function() {
    const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log(`✅ ZIP created: ${zipFileName} (${sizeInMB} MB)`);
    printSuccessMessage(zipFileName);
  });

  archive.on('error', function(err) {
    console.error('❌ Error creating ZIP:', err);
    process.exit(1);
  });

  archive.pipe(output);

  // Add files and directories (per Discloud requirements)
  console.log('   📁 Adding dist/ folder...');
  archive.directory('dist/', 'dist');
  
  console.log('   📄 Adding package.json...');
  archive.file('package.json', { name: 'package.json' });
  
  console.log('   📄 Adding discloud.config...');
  archive.file('discloud.config', { name: 'discloud.config' });
  
  console.log('   📄 Adding .env...');
  archive.file('.env', { name: '.env' });
  
  console.log('   ⚠️  Excluding package-lock.json (not needed by Discloud)');

  archive.finalize();
}

function createZipWithSystemCommand(zipFileName) {
  try {
    // Try Windows PowerShell Compress-Archive
    if (process.platform === 'win32') {
      console.log('   Using Windows PowerShell...');
      const files = 'dist,package.json,discloud.config,.env';
      execSync(`powershell -Command "Compress-Archive -Path ${files} -DestinationPath ${zipFileName} -Force"`, { stdio: 'inherit' });
    } else {
      // Try Unix zip command
      console.log('   Using system zip command...');
      execSync(`zip -r ${zipFileName} dist/ package.json discloud.config .env`, { stdio: 'inherit' });
    }
    
    if (fs.existsSync(zipFileName)) {
      const stats = fs.statSync(zipFileName);
      const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`✅ ZIP created: ${zipFileName} (${sizeInMB} MB)`);
      printSuccessMessage(zipFileName);
    } else {
      throw new Error('ZIP file was not created');
    }
  } catch (error) {
    console.error('\n❌ Could not create ZIP file automatically.');
    console.error('Please create it manually with these files:');
    console.error('  • dist/ folder');
    console.error('  • package.json');
    console.error('  • discloud.config');
    console.error('  • .env (with your tokens)');
    console.error('\nDO NOT include:');
    console.error('  ✗ package-lock.json (Discloud generates its own)');
    console.error('  ✗ node_modules/');
    console.error('  ✗ src/');
    console.error('\nOr install archiver: npm install archiver --save-dev');
    process.exit(1);
  }
}

function printSuccessMessage(zipFileName) {
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 DEPLOYMENT PACKAGE READY! 🎉');
  console.log('═'.repeat(60));
  console.log(`\n📦 File: ${zipFileName}`);
  console.log(`📍 Location: ${path.resolve(zipFileName)}`);
  console.log('\n📂 Files included:');
  console.log('   ✅ dist/ (compiled code)');
  console.log('   ✅ package.json');
  console.log('   ✅ discloud.config');
  console.log('   ✅ .env (your tokens)');
  console.log('\n🚫 Files excluded (per Discloud requirements):');
  console.log('   ✗ package-lock.json (Discloud generates its own)');
  console.log('   ✗ node_modules/ (installed by Discloud)');
  console.log('   ✗ src/ (source files not needed)');
  console.log('\n📋 Next Steps:\n');
  console.log('1. Go to: https://discloud.app/dashboard');
  console.log('2. Click "Upload Bot" or "New Application"');
  console.log(`3. Upload: ${zipFileName}`);
  console.log('4. Start your bot! (environment variables are in .env)');
  console.log('5. Deploy commands: node dist/deploy-commands.js\n');
  console.log('📖 Full guide: QUICK_DEPLOY.md');
  console.log('✅ Checklist: DEPLOYMENT_CHECKLIST.txt\n');
  console.log('═'.repeat(60));
  console.log('✨ Your bot is ready for deployment! ✨');
  console.log('═'.repeat(60) + '\n');
}

