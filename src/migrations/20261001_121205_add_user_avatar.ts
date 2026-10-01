import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts_populated_authors" ADD COLUMN "avatar" varchar;
  ALTER TABLE "_posts_v_version_populated_authors" ADD COLUMN "avatar" varchar;
  ALTER TABLE "users" ADD COLUMN "avatar_id" integer;
  ALTER TABLE "users" ADD CONSTRAINT "users_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_avatar_idx" ON "users" USING btree ("avatar_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP CONSTRAINT "users_avatar_id_media_id_fk";
  
  DROP INDEX "users_avatar_idx";
  ALTER TABLE "posts_populated_authors" DROP COLUMN "avatar";
  ALTER TABLE "_posts_v_version_populated_authors" DROP COLUMN "avatar";
  ALTER TABLE "users" DROP COLUMN "avatar_id";`)
}
