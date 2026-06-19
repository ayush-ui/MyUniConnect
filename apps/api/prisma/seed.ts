import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.university.upsert({
    where: { emailDomain: 'tu-ilmenau.de' },
    update: {},
    create: {
      name: 'TU Ilmenau',
      emailDomain: 'tu-ilmenau.de',
      country: 'Germany',
      active: true,
    },
  });

  const categories = [
    { name: 'Electronics', slug: 'electronics' },
    { name: 'Books & Study Materials', slug: 'books-study' },
    { name: 'Furniture', slug: 'furniture' },
    { name: 'Clothing & Accessories', slug: 'clothing' },
    { name: 'Sports & Fitness', slug: 'sports-fitness' },
    { name: 'Musical Instruments', slug: 'musical-instruments' },
    { name: 'Kitchen & Household', slug: 'kitchen-household' },
    { name: 'Bicycles', slug: 'bicycles' },
    { name: 'Gaming', slug: 'gaming' },
    { name: 'Other', slug: 'other' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  console.log('Seed complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
