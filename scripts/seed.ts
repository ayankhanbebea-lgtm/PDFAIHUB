// scripts/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@pdfaihub.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('Admin@12345', 12);
    await prisma.user.create({
      data: {
        name: 'Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
        plan: 'PRO',
        emailVerified: new Date(),
      },
    });
    console.log(`✅ Admin user created: ${adminEmail}`);
  } else {
    console.log(`ℹ️  Admin already exists: ${adminEmail}`);
  }

  // Create pricing plans
  const plans = [
    {
      name: 'Pro Monthly',
      price: 499,
      currency: 'INR',
      interval: 'month',
      features: JSON.stringify([
        'Unlimited AI summaries',
        'Unlimited PDF conversions',
        'All PDF tools',
        'AI PDF Chat',
        'Flashcard & Quiz Generator',
        'Priority processing',
        'Large files (up to 100MB)',
        'Full download history',
        'No ads',
      ]),
    },
    {
      name: 'Pro Yearly',
      price: 3999,
      currency: 'INR',
      interval: 'year',
      features: JSON.stringify([
        'Everything in Monthly',
        'Save 33% vs monthly',
        'Priority support',
      ]),
    },
  ];

  for (const plan of plans) {
    const existing = await prisma.pricingPlan.findFirst({ where: { name: plan.name } });
    if (!existing) {
      await prisma.pricingPlan.create({ data: plan });
      console.log(`✅ Pricing plan created: ${plan.name}`);
    }
  }

  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
