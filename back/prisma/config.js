// Configuration Prisma pour Docker Compose
module.exports = {
  databaseUrl: process.env.DATABASE_URL || "postgresql://2d10:2d10password@db:5432/2d10?schema=public"
};
