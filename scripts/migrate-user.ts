import { prisma } from '../src/db/prisma';
import bcrypt from 'bcrypt';

async function main() {
  const email = 'flair2k@gmail.com';
  const user = await prisma.user.findUnique({
    where: { email },
    include: { accounts: true },
  });

  if (!user) {
    console.log(`User ${email} not found.`);
    return;
  }

  console.log('Found user:', user.email);
  console.log('Current accounts:', user.accounts.map((a: any) => a.provider));

  if (process.argv.includes('--migrate')) {
    const defaultPassword = 'password123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    
    // Update user password
    await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });
    
    console.log(`Migration complete. Added password authentication to ${email}.`);
    console.log(`Temporary password set to: ${defaultPassword}`);
    console.log('You can now log in with either Google or the new password. Please change your password after logging in.');
  } else {
    console.log('Run with --migrate to apply changes.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
