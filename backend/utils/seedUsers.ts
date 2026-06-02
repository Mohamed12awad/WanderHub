import * as bcrypt from 'bcryptjs';
import { prisma } from './prisma';

const PASSWORD = 'Wonder@123';

const USERS = [
  {
    name: 'Super Admin',
    email: 'superadmin@wonderhub.com',
    phone: '+201000000001',
    roleName: 'super admin',
  },
  {
    name: 'Admin User',
    email: 'admin@wonderhub.com',
    phone: '+201000000002',
    roleName: 'admin',
  },
  {
    name: 'Sara Manager',
    email: 'manager@wonderhub.com',
    phone: '+201000000003',
    roleName: 'manager',
  },
  {
    name: 'Viewer User',
    email: 'viewer@wonderhub.com',
    phone: '+201000000004',
    roleName: 'viewer',
  },
];

async function main() {
  console.log('Seeding users...');
  const hashed = await bcrypt.hash(PASSWORD, await bcrypt.genSalt());

  for (const u of USERS) {
    const role = await prisma.role.findUnique({ where: { name: u.roleName } });
    if (!role) {
      console.error(`  ✗ Role "${u.roleName}" not found — run seed:roles first`);
      continue;
    }
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, phone: u.phone, roleId: role.id },
      create: {
        name: u.name,
        email: u.email,
        phone: u.phone,
        password: hashed,
        roleId: role.id,
      },
    });
    console.log(`  ✓ ${u.name} <${u.email}>`);
  }
  console.log(`Users seeded (password: ${PASSWORD})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
