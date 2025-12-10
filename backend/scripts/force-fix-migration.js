#!/usr/bin/env node

/**
 * Force fix script for Prisma migration issues
 * 
 * This script:
 * 1. Fixes any null bytes in migration files
 * 2. Resolves failed migrations
 * 3. Retries migration deployment
 * 
 * Usage:
 *   node scripts/force-fix-migration.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function fixMigrationFiles() {
  console.log('🔍 Checking migration files for null bytes...');
  
  const migrationsDir = path.join(__dirname, '../prisma/migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('⚠️  Migrations directory not found');
    return;
  }
  
  const migrations = fs.readdirSync(migrationsDir)
    .filter(dir => {
      const dirPath = path.join(migrationsDir, dir);
      return fs.statSync(dirPath).isDirectory();
    });
  
  let fixedCount = 0;
  
  for (const migration of migrations) {
    const migrationFile = path.join(migrationsDir, migration, 'migration.sql');
    if (fs.existsSync(migrationFile)) {
      try {
        let content = fs.readFileSync(migrationFile, 'utf8');
        const originalLength = content.length;
        
        // Remove BOM and null bytes
        const hadBOM = content.charCodeAt(0) === 0xFEFF;
        const hadNull = content.includes('\0');
        
        if (hadBOM || hadNull) {
          content = content.replace(/^\uFEFF/, '').replace(/\0/g, '').trim();
          fs.writeFileSync(migrationFile, content, { encoding: 'utf8', flag: 'w' });
          console.log(`✅ Fixed ${migration} (removed ${hadBOM ? 'BOM, ' : ''}${hadNull ? 'null bytes' : ''}: ${originalLength} -> ${content.length} bytes)`);
          fixedCount++;
        }
      } catch (error) {
        console.error(`❌ Error fixing ${migration}:`, error.message);
      }
    }
  }
  
  if (fixedCount === 0) {
    console.log('✅ No migration files needed fixing');
  } else {
    console.log(`\n✅ Fixed ${fixedCount} migration file(s)`);
  }
}

function resolveFailedMigrations() {
  console.log('\n🔧 Resolving failed migrations...');
  
  try {
    // Try to get migration status
    const statusOutput = execSync('npx prisma migrate status', { 
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    
    console.log('Migration status:', statusOutput);
    
    // Extract failed migrations
    const failedMigrations = [];
    const lines = statusOutput.split('\n');
    
    for (const line of lines) {
      const match = line.match(/The `([^`]+)` migration.*failed/);
      if (match) {
        failedMigrations.push(match[1]);
      }
    }
    
    if (failedMigrations.length > 0) {
      console.log(`Found ${failedMigrations.length} failed migration(s):`);
      for (const migration of failedMigrations) {
        console.log(`  - ${migration}`);
        try {
          console.log(`  Resolving ${migration} as rolled back...`);
          execSync(`npx prisma migrate resolve --rolled-back "${migration}"`, {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
          });
          console.log(`  ✅ Resolved: ${migration}`);
        } catch (error) {
          console.error(`  ❌ Failed to resolve ${migration}:`, error.message);
        }
      }
    } else {
      console.log('✅ No failed migrations found in status');
    }
  } catch (error) {
    // If migrate status fails, try to resolve the known migration
    console.log('⚠️  Could not get migration status, trying to resolve known failed migration...');
    const knownFailedMigration = '20240101000000_init';
    try {
      console.log(`Resolving ${knownFailedMigration} as rolled back...`);
      execSync(`npx prisma migrate resolve --rolled-back "${knownFailedMigration}"`, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      console.log(`✅ Resolved: ${knownFailedMigration}`);
    } catch (resolveError) {
      console.log(`⚠️  Could not resolve ${knownFailedMigration} (might already be resolved)`);
    }
  }
}

function deployMigrations() {
  console.log('\n🚀 Deploying migrations...');
  
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('\n✅ Migrations deployed successfully!');
    return true;
  } catch (error) {
    console.error('\n❌ Migration deployment failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 Force Fix Migration Script\n');
  console.log('This script will:');
  console.log('  1. Fix null bytes in migration files');
  console.log('  2. Resolve failed migrations');
  console.log('  3. Deploy migrations\n');
  
  try {
    // Step 1: Fix migration files
    fixMigrationFiles();
    
    // Step 2: Resolve failed migrations
    resolveFailedMigrations();
    
    // Step 3: Deploy migrations
    const success = deployMigrations();
    
    if (success) {
      console.log('\n🎉 All done! Migrations are now applied.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Migration deployment failed. You may need to:');
      console.log('  1. Check your database connection');
      console.log('  2. Verify the migration SQL is correct');
      console.log('  3. Manually resolve any remaining issues');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();

