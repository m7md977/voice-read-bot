/**
 * Discloud Deployment Preparation Script
 * Creates a ZIP file ready for Discloud upload
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Preparing bot for Discloud deployment...\n');

// Step 1: Build TypeScript
console.log('📦 Building TypeScript...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build successful!\n');
} catch (error) {
  console.error('❌ Build failed! Fix TypeScript errors first.');
  process.exit(1);
}

// Step 2: Verify required files
console.log('🔍 Verifying required files...');
const requiredFiles = [
  'dist/index.js',
  'dist/config.js',
  'dist/commands/read.js',
  'dist/services/voice/VoiceReadManager.js',
  'package.json',
  'package-lock.json',
  'discloud.config'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing required file: ${file}`);
    allFilesExist = false;
  } else {
    console.log(`   ✅ ${file}`);
  }
}

if (!allFilesExist) {
  console.error('\n❌ Some required files are missing. Cannot proceed.');
  process.exit(1);
}

console.log('\n✅ All required files present!\n');

// Step 3: Instructions
console.log('📋 NEXT STEPS:\n');
console.log('1. Create a ZIP file containing:');
console.log('   • dist/ folder');
console.log('   • package.json');
console.log('   • package-lock.json');
console.log('   • discloud.config');
console.log('');
console.log('2. Upload ZIP to Discloud: https://discloud.app/dashboard');
console.log('');
console.log('3. Set environment variables in Discloud dashboard:');
console.log('   • BOT_TOKEN');
console.log('   • CLIENT_ID');
console.log('   • ELEVENLABS_API_KEY');
console.log('   • (and others from env.example)');
console.log('');
console.log('4. After bot starts, deploy commands:');
console.log('   Run: node dist/deploy-commands.js (in Discloud terminal)');
console.log('   OR run locally: npm run deploy-commands');
console.log('');
console.log('📖 Full guide: See DEPLOY_DISCLOUD.md');
console.log('');
console.log('✅ Your bot is ready for deployment! 🎉');

