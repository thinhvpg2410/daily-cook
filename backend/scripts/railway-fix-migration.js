#!/usr/bin/env node

/**
 * Railway-specific migration fix script
 * 
 * This script uses Railway CLI to get the DATABASE_URL and fix migrations
 * 
 * Usage:
 *   node scripts/railway-fix-migration.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getRailwayDatabaseUrl() {
  try {
    // Try to get DATABASE_PUBLIC_URL from Railway
    const output = execSync('railway variables --service daily-cook', {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    
    // Parse the output to extract DATABASE_PUBLIC_URL
    const lines = output.split('\n');
    let dbUrl = null;
    let inDatabasePublicUrl = false;
    let urlParts = [];
    
    for (const line of lines) {
      if (line.includes('DATABASE_PUBLIC_URL')) {
        inDatabasePublicUrl = true;
        continue;
      }
      if (inDatabasePublicUrl) {
        if (line.includes('│')) {
          const match = line.match(/│\s*(.+?)\s*│/);
          if (match) {
            urlParts.push(match[1].trim());
          }
        } else if (line.includes('─')) {
          // End of DATABASE_PUBLIC_URL section
          if (urlParts.length > 0) {
            dbUrl = urlParts.join('');
            break;
          }
        }
      }
    }
    
    if (dbUrl && dbUrl.startsWith('postgresql://')) {
      return dbUrl;
    }
  } catch (error) {
    console.error('Error getting Railway DATABASE_URL:', error.message);
  }
  
  return null;
}

function resolveFailedMigrations(databaseUrl) {
  console.log('🔧 Resolving failed migrations...');
  
  // First, get migration status to find all failed migrations
  try {
    const statusOutput = execSync('npx prisma migrate status', {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: databaseUrl }
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
            cwd: path.join(__dirname, '..'),
            env: { ...process.env, DATABASE_URL: databaseUrl }
          });
          console.log(`  ✅ Resolved: ${migration}`);
        } catch (error) {
          console.error(`  ❌ Failed to resolve ${migration}:`, error.message);
        }
      }
    } else {
      console.log('✅ No failed migrations found');
    }
  } catch (error) {
    // If migrate status fails, try common failed migrations
    console.log('⚠️  Could not get migration status, trying common failed migrations...');
    const commonFailedMigrations = ['20240101000000_init', '20250120000000_add_comprehensive_indexes'];
    
    for (const migration of commonFailedMigrations) {
      try {
        console.log(`Trying to resolve ${migration} as rolled back...`);
        execSync(`npx prisma migrate resolve --rolled-back "${migration}"`, {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..'),
          env: { ...process.env, DATABASE_URL: databaseUrl }
        });
        console.log(`✅ Resolved: ${migration}`);
      } catch (resolveError) {
        console.log(`⚠️  Could not resolve ${migration} (might already be resolved or not exist)`);
      }
    }
  }
}

function deployMigrations(databaseUrl) {
  console.log('\n🚀 Deploying migrations...');
  
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: databaseUrl }
    });
    console.log('\n✅ Migrations deployed successfully!');
    return true;
  } catch (error) {
    console.error('\n❌ Migration deployment failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 Railway Migration Fix Script\n');
  
  // Get Railway DATABASE_URL
  console.log('📡 Getting Railway DATABASE_URL...');
  const databaseUrl = getRailwayDatabaseUrl();
  
  if (!databaseUrl) {
    console.error('❌ Could not get Railway DATABASE_URL');
    console.log('\n💡 You can manually set DATABASE_URL:');
    console.log('   $env:DATABASE_URL="your-connection-string"; node scripts/railway-fix-migration.js');
    process.exit(1);
  }
  
  console.log('✅ Got DATABASE_URL from Railway\n');
  
  try {
    // Resolve failed migrations
    resolveFailedMigrations(databaseUrl);
    
    // Deploy migrations
    const success = deployMigrations(databaseUrl);
    
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



