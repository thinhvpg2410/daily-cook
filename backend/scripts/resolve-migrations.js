#!/usr/bin/env node

/**
 * Script to resolve failed Prisma migrations before deploying
 * This handles the P3009 error where migrations fail partway through
 */

const { execSync } = require('child_process');

function runCommand(cmd, ignoreError = false, showOutput = false) {
  try {
    const options = { encoding: 'utf-8' };
    if (showOutput) {
      options.stdio = 'inherit';
      execSync(cmd, options);
      return '';
    } else {
      options.stdio = 'pipe';
      return execSync(cmd, options);
    }
  } catch (error) {
    if (ignoreError) {
      const stdout = error.stdout ? (Buffer.isBuffer(error.stdout) ? error.stdout.toString('utf-8') : String(error.stdout)) : '';
      const stderr = error.stderr ? (Buffer.isBuffer(error.stderr) ? error.stderr.toString('utf-8') : String(error.stderr)) : '';
      return stdout + stderr + (error.message || '');
    }
    // For non-ignored errors, attach output to error object
    const stdout = error.stdout ? (Buffer.isBuffer(error.stdout) ? error.stdout.toString('utf-8') : String(error.stdout)) : '';
    const stderr = error.stderr ? (Buffer.isBuffer(error.stderr) ? error.stderr.toString('utf-8') : String(error.stderr)) : '';
    error.output = stdout + stderr + (error.message || '');
    throw error;
  }
}

function extractFailedMigrations(statusOutput) {
  const failedMigrations = [];
  const lines = statusOutput.split('\n');
  
  for (const line of lines) {
    // Look for lines like: "The `20240101000000_init` migration started at ... failed"
    const match = line.match(/The `([^`]+)` migration.*failed/);
    if (match) {
      failedMigrations.push(match[1]);
    }
  }
  
  return failedMigrations;
}

function fixMigrationFiles() {
  const fs = require('fs');
  const path = require('path');
  
  console.log('🔍 Checking migration files for encoding issues...');
  
  const migrationsDir = path.join(__dirname, '../prisma/migrations');
  if (!fs.existsSync(migrationsDir)) {
    return;
  }
  
  const migrations = fs.readdirSync(migrationsDir)
    .filter(dir => {
      const dirPath = path.join(migrationsDir, dir);
      return fs.statSync(dirPath).isDirectory();
    });
  
  for (const migration of migrations) {
    const migrationFile = path.join(migrationsDir, migration, 'migration.sql');
    if (fs.existsSync(migrationFile)) {
      try {
        let content = fs.readFileSync(migrationFile, 'utf8');
        const originalLength = content.length;
        const hadBOM = content.charCodeAt(0) === 0xFEFF;
        const hadNull = content.includes('\0');
        
        if (hadBOM || hadNull) {
          content = content.replace(/^\uFEFF/, '').replace(/\0/g, '').trim();
          fs.writeFileSync(migrationFile, content, { encoding: 'utf8', flag: 'w' });
          console.log(`✅ Fixed ${migration} (removed ${hadBOM ? 'BOM, ' : ''}${hadNull ? 'null bytes' : ''})`);
        }
      } catch (error) {
        // Ignore errors
      }
    }
  }
}

async function main() {
  console.log('🚀 Checking Prisma migration status...');
  
  // First, fix any encoding issues in migration files
  fixMigrationFiles();
  
  try {
    // First, try to deploy migrations - capture output to parse errors
    console.log('Running prisma migrate deploy...');
    try {
      // Use pipe to capture output for parsing
      const output = runCommand('npx prisma migrate deploy', false, false);
      if (output) console.log(output);
      console.log('✅ Migrations deployed successfully');
      return 0;
    } catch (deployError) {
      // Capture the full error output
      let errorOutput = '';
      
      // Handle stderr (could be Buffer or string)
      if (deployError.stderr) {
        const stderrStr = Buffer.isBuffer(deployError.stderr) 
          ? deployError.stderr.toString('utf-8')
          : String(deployError.stderr);
        errorOutput += stderrStr;
        // Also print it so user can see
        console.error(stderrStr);
      }
      
      // Handle stdout (could be Buffer or string)
      if (deployError.stdout) {
        const stdoutStr = Buffer.isBuffer(deployError.stdout)
          ? deployError.stdout.toString('utf-8')
          : String(deployError.stdout);
        errorOutput += stdoutStr;
        console.log(stdoutStr);
      }
      
      // Add error message
      if (deployError.message) {
        errorOutput += '\n' + deployError.message;
      }
      
      console.log('Full error output for debugging:', errorOutput);
      
      // Check if it's a P3009 error (failed migrations)
      if (errorOutput.includes('P3009') || errorOutput.includes('failed migrations') || errorOutput.includes('failed')) {
        console.log('⚠️  Found failed migrations. Attempting to resolve...');
        
        // Extract failed migration name from error message
        // Format: "The `20240101000000_init` migration started at ... failed"
        const failedMigrations = [];
        
        // Try multiple patterns to extract migration name
        let migrationMatch = errorOutput.match(/The `([^`]+)` migration.*failed/);
        if (!migrationMatch) {
          migrationMatch = errorOutput.match(/migration `([^`]+)`.*failed/);
        }
        if (!migrationMatch) {
          migrationMatch = errorOutput.match(/`([0-9_]+)`/);
        }
        
        if (migrationMatch) {
          failedMigrations.push(migrationMatch[1]);
          console.log(`Extracted migration name: ${migrationMatch[1]}`);
        }
        
        // Also check migration status as backup
        if (failedMigrations.length === 0) {
          try {
            const statusOutput = runCommand('npx prisma migrate status', true);
            const statusMigrations = extractFailedMigrations(statusOutput);
            failedMigrations.push(...statusMigrations);
          } catch (statusError) {
            console.log('Could not get migration status, trying to extract from error');
          }
        }
        
        // Fallback: if we still can't find it, try to extract any migration-like pattern
        if (failedMigrations.length === 0) {
          // Look for any pattern that looks like a migration name (timestamp_name format)
          const fallbackMatch = errorOutput.match(/([0-9]{14}_[a-zA-Z0-9_]+)/);
          if (fallbackMatch) {
            console.log(`Using fallback: detected migration pattern ${fallbackMatch[1]}`);
            failedMigrations.push(fallbackMatch[1]);
          } else if (errorOutput.includes('20240101000000_init')) {
            console.log('Using hardcoded fallback: 20240101000000_init');
            failedMigrations.push('20240101000000_init');
          }
        }
        
        if (failedMigrations.length > 0) {
          console.log(`Found ${failedMigrations.length} failed migration(s):`);
          for (const migration of failedMigrations) {
            console.log(`  - ${migration}`);
            try {
              console.log(`Resolving migration: ${migration} (marking as rolled back)...`);
              execSync(`npx prisma migrate resolve --rolled-back "${migration}"`, { stdio: 'inherit' });
              console.log(`✅ Resolved: ${migration}`);
            } catch (resolveError) {
              console.error(`❌ Failed to resolve ${migration}:`, resolveError.message);
              // Continue with other migrations
            }
          }
          
          // Retry migration deploy
          console.log('Retrying migration deploy...');
          try {
            execSync('npx prisma migrate deploy', { stdio: 'inherit' });
            console.log('✅ Migrations deployed successfully after resolution');
            return 0;
          } catch (retryError) {
            console.error('❌ Migration deploy still failed after resolution');
            throw retryError;
          }
        } else {
          console.error('❌ Could not identify failed migrations from output');
          console.error('Error output was:', errorOutput);
          
          // Last resort: try to manually resolve the known failed migration
          console.log('\n⚠️  Attempting last resort: manually resolving known failed migration...');
          
          // Try to resolve the known migration name directly (from error message)
          const knownFailedMigration = '20240101000000_init';
          try {
            console.log(`Trying to resolve ${knownFailedMigration} as rolled back...`);
            execSync(`npx prisma migrate resolve --rolled-back "${knownFailedMigration}"`, { stdio: 'inherit' });
            console.log('✅ Resolved. Retrying deploy...');
            execSync('npx prisma migrate deploy', { stdio: 'inherit' });
            return 0;
          } catch (manualResolveError) {
            console.error('❌ Manual resolve failed:', manualResolveError.message);
            console.log('\n💡 Options to fix:');
            console.log('   1. Run manually: npx prisma migrate resolve --rolled-back "20240101000000_init"');
            console.log('   2. Or reset all migrations: RESET_MIGRATIONS=true node scripts/reset-migrations.js');
            throw deployError;
          }
        }
      } else {
        // Different error, re-throw it
        console.error('❌ Migration error:', errorOutput);
        throw deployError;
      }
    }
  } catch (error) {
    console.error('Fatal error in migration script:', error.message);
    throw error;
  }
}

main()
  .then((code) => process.exit(code || 0))
  .catch((error) => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });

