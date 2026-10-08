import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "mcp_idempotency" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"idem_key" varchar NOT NULL,
  	"input_hash" varchar NOT NULL,
  	"post_i_d" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "posts" ALTER COLUMN "show_source_credit" SET DEFAULT true;
  ALTER TABLE "_posts_v" ALTER COLUMN "version_show_source_credit" SET DEFAULT true;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "mcp_idempotency_id" integer;
  CREATE UNIQUE INDEX "mcp_idempotency_idem_key_idx" ON "mcp_idempotency" USING btree ("idem_key");
  CREATE INDEX "mcp_idempotency_updated_at_idx" ON "mcp_idempotency" USING btree ("updated_at");
  CREATE INDEX "mcp_idempotency_created_at_idx" ON "mcp_idempotency" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_mcp_idempotency_fk" FOREIGN KEY ("mcp_idempotency_id") REFERENCES "public"."mcp_idempotency"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_mcp_idempotency_id_idx" ON "payload_locked_documents_rels" USING btree ("mcp_idempotency_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "mcp_idempotency" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "mcp_idempotency" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_mcp_idempotency_fk";
  
  DROP INDEX "payload_locked_documents_rels_mcp_idempotency_id_idx";
  ALTER TABLE "posts" ALTER COLUMN "show_source_credit" SET DEFAULT false;
  ALTER TABLE "_posts_v" ALTER COLUMN "version_show_source_credit" SET DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "mcp_idempotency_id";`)
}
