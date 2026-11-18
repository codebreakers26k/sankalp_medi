/**
 * Role Assignment Script for Clerk Users
 *
 * Usage:
 *   node scripts/assign_clerk_role.js <email> <role> [clerkSecretKey]
 *
 * Example:
 *   node scripts/assign_clerk_role.js shankaragoudapatil0406@gmail.com doctor
 *   node scripts/assign_clerk_role.js admin@example.com admin
 */

const fs = require('fs');
const path = require('path');

const email = process.argv[2];
const role = process.argv[3];
let secretKey = process.argv[4];

if (!email || !role) {
  console.log('Usage: node scripts/assign_clerk_role.js <email> <role: admin|doctor|patient|staff> [clerkSecretKey]');
  process.exit(1);
}

if (!['admin', 'doctor', 'patient', 'staff'].includes(role)) {
  console.error(`Invalid role: "${role}". Must be one of: admin, doctor, patient, staff`);
  process.exit(1);
}

if (!secretKey) {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    env.split('\n').forEach(line => {
      if (line.trim().startsWith('CLERK_SECRET_KEY=')) {
        secretKey = line.split('=')[1].trim();
      }
    });
  }
}

if (!secretKey) {
  console.error('CLERK_SECRET_KEY is not set in .env or passed as argument.');
  process.exit(1);
}

async function assignRole() {
  console.log(`Searching Clerk user with email: ${email}...`);
  const listRes = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`, {
    headers: { 'Authorization': `Bearer ${secretKey}` }
  });

  if (!listRes.ok) {
    const err = await listRes.text();
    console.error(`Failed to fetch user from Clerk (${listRes.status}):`, err);
    process.exit(1);
  }

  const users = await listRes.json();
  if (!users || users.length === 0) {
    console.error(`No Clerk user found with email: ${email}`);
    process.exit(1);
  }

  const user = users[0];
  console.log(`Found user: ${user.id} (${email})`);

  const patchRes = await fetch(`https://api.clerk.com/v1/users/${user.id}/metadata`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      public_metadata: { role }
    })
  });

  if (!patchRes.ok) {
    const err = await patchRes.text();
    console.error(`Failed to update user role (${patchRes.status}):`, err);
    process.exit(1);
  }

  const updated = await patchRes.json();
  console.log(`Successfully assigned role "${role}" to user ${email}!`);
  console.log('Updated public_metadata:', updated.public_metadata);
}

assignRole().catch(console.error);
