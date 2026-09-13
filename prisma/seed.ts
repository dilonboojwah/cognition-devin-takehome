import { prisma } from "@/lib/db";
import { seedDatabase } from "@/lib/seed-data";

seedDatabase()
  .then(({ users, refunds, kycCases, flags }) => {
    console.log(`Seeded ${users} users, ${refunds} refunds, ${kycCases} KYC cases, ${flags} flags.`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
