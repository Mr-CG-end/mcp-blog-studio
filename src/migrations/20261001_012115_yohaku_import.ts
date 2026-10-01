import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" ADD COLUMN "import_source_url" varchar;
  ALTER TABLE "posts" ADD COLUMN "import_source_captured_at" timestamp(3) with time zone;
  ALTER TABLE "posts" ADD COLUMN "import_source_hash" varchar;
  ALTER TABLE "posts" ADD COLUMN "import_source_batch" varchar;
  ALTER TABLE "posts" ADD COLUMN "import_source_author" varchar;
  ALTER TABLE "posts" ADD COLUMN "import_source_headings" jsonb;
  ALTER TABLE "_posts_v" ADD COLUMN "version_import_source_url" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_import_source_captured_at" timestamp(3) with time zone;
  ALTER TABLE "_posts_v" ADD COLUMN "version_import_source_hash" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_import_source_batch" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_import_source_author" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_import_source_headings" jsonb;
  ALTER TABLE "media" ADD COLUMN "import_source_url" varchar;
  ALTER TABLE "media" ADD COLUMN "import_source_captured_at" timestamp(3) with time zone;
  ALTER TABLE "media" ADD COLUMN "import_source_hash" varchar;
  ALTER TABLE "media" ADD COLUMN "import_source_batch" varchar;
  ALTER TABLE "media" ADD COLUMN "import_source_author" varchar;
  ALTER TABLE "media" ADD COLUMN "import_source_headings" jsonb;
  ALTER TABLE "categories" ADD COLUMN "import_source_url" varchar;
  ALTER TABLE "categories" ADD COLUMN "import_source_captured_at" timestamp(3) with time zone;
  ALTER TABLE "categories" ADD COLUMN "import_source_hash" varchar;
  ALTER TABLE "categories" ADD COLUMN "import_source_batch" varchar;
  ALTER TABLE "categories" ADD COLUMN "import_source_author" varchar;
  ALTER TABLE "categories" ADD COLUMN "import_source_headings" jsonb;
  CREATE INDEX "posts_import_source_import_source_url_idx" ON "posts" USING btree ("import_source_url");
  CREATE INDEX "posts_import_source_import_source_batch_idx" ON "posts" USING btree ("import_source_batch");
  CREATE INDEX "_posts_v_version_import_source_version_import_source_url_idx" ON "_posts_v" USING btree ("version_import_source_url");
  CREATE INDEX "_posts_v_version_import_source_version_import_source_bat_idx" ON "_posts_v" USING btree ("version_import_source_batch");
  CREATE INDEX "media_import_source_import_source_url_idx" ON "media" USING btree ("import_source_url");
  CREATE INDEX "media_import_source_import_source_batch_idx" ON "media" USING btree ("import_source_batch");
  CREATE INDEX "categories_import_source_import_source_url_idx" ON "categories" USING btree ("import_source_url");
  CREATE INDEX "categories_import_source_import_source_batch_idx" ON "categories" USING btree ("import_source_batch");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "posts_import_source_import_source_url_idx";
  DROP INDEX "posts_import_source_import_source_batch_idx";
  DROP INDEX "_posts_v_version_import_source_version_import_source_url_idx";
  DROP INDEX "_posts_v_version_import_source_version_import_source_bat_idx";
  DROP INDEX "media_import_source_import_source_url_idx";
  DROP INDEX "media_import_source_import_source_batch_idx";
  DROP INDEX "categories_import_source_import_source_url_idx";
  DROP INDEX "categories_import_source_import_source_batch_idx";
  ALTER TABLE "posts" DROP COLUMN "import_source_url";
  ALTER TABLE "posts" DROP COLUMN "import_source_captured_at";
  ALTER TABLE "posts" DROP COLUMN "import_source_hash";
  ALTER TABLE "posts" DROP COLUMN "import_source_batch";
  ALTER TABLE "posts" DROP COLUMN "import_source_author";
  ALTER TABLE "posts" DROP COLUMN "import_source_headings";
  ALTER TABLE "_posts_v" DROP COLUMN "version_import_source_url";
  ALTER TABLE "_posts_v" DROP COLUMN "version_import_source_captured_at";
  ALTER TABLE "_posts_v" DROP COLUMN "version_import_source_hash";
  ALTER TABLE "_posts_v" DROP COLUMN "version_import_source_batch";
  ALTER TABLE "_posts_v" DROP COLUMN "version_import_source_author";
  ALTER TABLE "_posts_v" DROP COLUMN "version_import_source_headings";
  ALTER TABLE "media" DROP COLUMN "import_source_url";
  ALTER TABLE "media" DROP COLUMN "import_source_captured_at";
  ALTER TABLE "media" DROP COLUMN "import_source_hash";
  ALTER TABLE "media" DROP COLUMN "import_source_batch";
  ALTER TABLE "media" DROP COLUMN "import_source_author";
  ALTER TABLE "media" DROP COLUMN "import_source_headings";
  ALTER TABLE "categories" DROP COLUMN "import_source_url";
  ALTER TABLE "categories" DROP COLUMN "import_source_captured_at";
  ALTER TABLE "categories" DROP COLUMN "import_source_hash";
  ALTER TABLE "categories" DROP COLUMN "import_source_batch";
  ALTER TABLE "categories" DROP COLUMN "import_source_author";
  ALTER TABLE "categories" DROP COLUMN "import_source_headings";`)
}
