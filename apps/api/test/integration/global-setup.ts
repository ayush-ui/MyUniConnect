import { execSync } from 'child_process';
import * as path from 'path';

export default async function globalSetup() {
  // Point at the test database (postgres_test container on port 5433)
  process.env.DATABASE_URL =
    'postgresql://myuniconnect:myuniconnect@localhost:5433/myuniconnect_test';

  const schemaPath = path.resolve(__dirname, '../../prisma/schema.prisma');

  execSync(
    `DATABASE_URL=${process.env.DATABASE_URL} npx prisma migrate deploy --schema=${schemaPath}`,
    { stdio: 'inherit' },
  );

  execSync(
    `DATABASE_URL=${process.env.DATABASE_URL} npx prisma db seed --schema=${schemaPath}`,
    { stdio: 'inherit' },
  );
}
