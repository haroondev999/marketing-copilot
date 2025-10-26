import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('Demo123!@#', 12);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      password: hashedPassword,
      emailVerified: new Date(),
    },
  });

  console.log('✅ Created demo user:', demoUser.email);

  // Create brand kit for demo user
  const brandKit = await prisma.brandKit.upsert({
    where: {
      id: 'demo-brand-kit',
    },
    update: {},
    create: {
      id: 'demo-brand-kit',
      userId: demoUser.id,
      name: 'Demo Brand',
      primaryColor: '#6366f1',
      secondaryColor: '#ec4899',
      fontFamily: 'Inter, sans-serif',
      tone: 'Professional and friendly',
      values: 'Innovation, Trust, Customer-First, Transparency',
      isActive: true,
    },
  });

  console.log('✅ Created brand kit:', brandKit.name);

  // Create sample campaign
  const campaign = await prisma.campaign.create({
    data: {
      userId: demoUser.id,
      goal: 'Increase brand awareness for Q4 product launch',
      channels: ['email', 'social', 'ppc'],
      content: {
        email: {
          subject: 'Introducing Our Revolutionary New Product',
          body: 'We are excited to announce our latest innovation...',
          preview: 'Get ready for something amazing',
        },
        social: {
          facebook: {
            body: 'Big news coming! Stay tuned for our Q4 launch 🚀',
            hashtags: ['#Innovation', '#ProductLaunch', '#Tech'],
          },
          instagram: {
            body: 'Something amazing is coming this Q4 ✨',
            hashtags: ['#NewProduct', '#Launch2024', '#Innovation'],
          },
        },
        ppc: {
          headline: 'Revolutionary New Product',
          description: 'Transform your workflow with our latest innovation. Limited time offer!',
          cta: 'Learn More',
        },
      },
      audience: {
        demographics: 'Tech-savvy professionals, age 25-45',
        interests: ['Technology', 'Innovation', 'Productivity'],
        targetSize: 50000,
      },
      budget: 5000,
      schedule: {
        startDate: new Date('2024-10-01'),
        endDate: new Date('2024-12-31'),
        timezone: 'America/New_York',
      },
      status: 'ready',
      metrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
      },
    },
  });

  console.log('✅ Created sample campaign:', campaign.id);

  // Create conversation
  const conversation = await prisma.conversation.create({
    data: {
      userId: demoUser.id,
      messages: [
        {
          role: 'user',
          content: 'I want to create a marketing campaign for our new product launch',
          timestamp: new Date(),
        },
        {
          role: 'assistant',
          content: 'Great! I can help you create a comprehensive marketing campaign. Let me ask you a few questions...',
          timestamp: new Date(),
        },
      ],
      metadata: {
        currentCampaignId: campaign.id,
      },
    },
  });

  console.log('✅ Created conversation:', conversation.id);

  // Create audit log entry
  await prisma.auditLog.create({
    data: {
      userId: demoUser.id,
      action: 'database.seed',
      resource: 'system',
      metadata: {
        environment: 'development',
        timestamp: new Date().toISOString(),
      },
      status: 'success',
    },
  });

  console.log('✅ Created audit log entry');

  console.log('\n🎉 Database seeding completed successfully!\n');
  console.log('Demo credentials:');
  console.log('  Email: demo@example.com');
  console.log('  Password: Demo123!@#\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
