#!/usr/bin/env node

const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'OPENAI_API_KEY',
  'ENCRYPTION_KEY',
];

const optionalEnvVars = [
  'UPSTASH_REDIS_URL',
  'UPSTASH_REDIS_TOKEN',
  'NEXT_PUBLIC_SENTRY_DSN',
  'SENTRY_AUTH_TOKEN',
];

console.log('🔍 Validating production environment variables...\n');

let hasErrors = false;
let hasWarnings = false;

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ REQUIRED: ${varName} is not set`);
    hasErrors = true;
  } else {
    if (varName === 'DATABASE_URL' && !process.env[varName].startsWith('postgresql://')) {
      console.error(`❌ ERROR: DATABASE_URL must start with postgresql://`);
      hasErrors = true;
    } else if (varName === 'NEXTAUTH_SECRET' && process.env[varName].length < 32) {
      console.error(`❌ ERROR: NEXTAUTH_SECRET must be at least 32 characters`);
      hasErrors = true;
    } else if (varName === 'OPENAI_API_KEY' && !process.env[varName].startsWith('sk-')) {
      console.error(`❌ ERROR: OPENAI_API_KEY must start with sk-`);
      hasErrors = true;
    } else if (varName === 'ENCRYPTION_KEY' && process.env[varName].length !== 32) {
      console.error(`❌ ERROR: ENCRYPTION_KEY must be exactly 32 characters`);
      hasErrors = true;
    } else {
      console.log(`✅ ${varName} is set and valid`);
    }
  }
});

console.log('');

optionalEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.warn(`⚠️  OPTIONAL: ${varName} is not set (some features may be disabled)`);
    hasWarnings = true;
  } else {
    console.log(`✅ ${varName} is set`);
  }
});

console.log('\n' + '='.repeat(60));

if (hasErrors) {
  console.error('\n❌ VALIDATION FAILED: Fix required environment variables before deploying\n');
  process.exit(1);
}

if (hasWarnings) {
  console.warn('\n⚠️  VALIDATION PASSED WITH WARNINGS: Some optional features may not work\n');
} else {
  console.log('\n✅ VALIDATION PASSED: All environment variables are set correctly\n');
}

process.exit(0);
