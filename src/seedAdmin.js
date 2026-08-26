// Run once: node src/seedAdmin.js
// Creates the first admin account so you can log in and use /register for everyone else.
require('dotenv').config();
const bcrypt = require('bcrypt');
const sequelize = require('./config/database');
const User = require('./models/User');
const { seedDefaultPolicies } = require('./utils/policyEngine');

async function main() {
  await sequelize.sync();
  await seedDefaultPolicies();

  const employeeId = process.env.SEED_ADMIN_ID || 'admin001';
  const existing = await User.findOne({ where: { employeeId } });
  if (existing) {
    console.log(`Admin '${employeeId}' already exists. Nothing to do.`);
    process.exit(0);
  }

  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe!123';
  const passwordHash = await bcrypt.hash(password, 12);

  await User.create({
    employeeId,
    fullName: 'System Administrator',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com',
    passwordHash,
    role: 'admin',
  });

  console.log('Admin account created:');
  console.log(`  employeeId: ${employeeId}`);
  console.log(`  password:   ${password}`);
  console.log('Log in and change this password immediately.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
