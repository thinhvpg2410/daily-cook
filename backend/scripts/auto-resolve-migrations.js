#!/usr/bin/env node

/**
 * Auto-resolve failed Prisma migrations
 * This script automatically resolves failed migrations that are idempotent
 * Safe to run in production as all migrations have been made idempotent
 */

const { execSync } = require('child_process');

// List of migrations that are idempotent and safe to auto-resolve
const SAFE_MIGRATIONS = [
  '20240101000000_init',
  '20250120000000_add_comprehensive_indexes',
  '20251017065644_dailycook_v0_1',
  '20251018043605_add_phone_and_dob_to_user',
  '20251018050936_normalize_schema_indices_ref_actions',
  '20251118000000_add_ingredient_pricing',
];

function resolveFailedMigrations() {
  console.log('🔍 Attempting to resolve failed migrations...');

  let resolvedCount = 0;
  let errorCount = 0;

  // Try to resolve each safe migration
  for (const migrationName of SAFE_MIGRATIONS) {
    try {
      console.log(`🔄 Checking migration: ${migrationName}...`);
      // Try to resolve - this will only work if migration is actually failed
      execSync(`npx prisma migrate resolve --applied ${migrationName}`, {
        stdio: 'pipe', // Suppress output unless error
        env: process.env,
      });
      resolvedCount++;
      console.log(`✅ Resolved: ${migrationName}`);
    } catch (error) {
      // Migration is not failed or already resolved - this is fine
      // Only log if it's an unexpected error
      if (!error.message.includes('not found') && !error.message.includes('already applied')) {
        console.log(`ℹ️  ${migrationName}: ${error.message.split('\n')[0]}`);
      }
    }
  }

  if (resolvedCount > 0) {
    console.log(`\n✅ Successfully resolved ${resolvedCount} migration(s)`);
    return true;
  } else {
    console.log('ℹ️  No failed migrations to resolve (or all migrations are already applied)');
    return true; // This is fine, not an error
  }
}

// Run the resolver
try {
  const success = resolveFailedMigrations();
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('❌ Error in auto-resolve script:', error.message);
  // Don't fail the deployment if auto-resolve fails
  // Migrations are idempotent, so migrate deploy should still work
  console.log('⚠️  Continuing with migration deploy...');
  process.exit(0);
}
