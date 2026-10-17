import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts" ALTER COLUMN "show_source_credit" SET DEFAULT false;
    ALTER TABLE "_posts_v" ALTER COLUMN "version_show_source_credit" SET DEFAULT false;
    ALTER TABLE "mcp_idempotency" ADD COLUMN "result" jsonb;
    ALTER TABLE "audit_logs" ADD COLUMN "request_i_d" varchar;
    ALTER TABLE "audit_logs" ADD COLUMN "key_i_d" numeric;
    CREATE INDEX "audit_logs_request_i_d_idx" ON "audit_logs" ("request_i_d");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts" ALTER COLUMN "show_source_credit" SET DEFAULT true;
    ALTER TABLE "_posts_v" ALTER COLUMN "version_show_source_credit" SET DEFAULT true;
    DROP INDEX "audit_logs_request_i_d_idx";
    ALTER TABLE "audit_logs" DROP COLUMN "key_i_d", DROP COLUMN "request_i_d";
    ALTER TABLE "mcp_idempotency" DROP COLUMN "result";
  `)
}
