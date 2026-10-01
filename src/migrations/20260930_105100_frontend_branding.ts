import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "site_settings_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  ALTER TABLE "site_settings" ADD COLUMN "brand_image_id" integer;
  ALTER TABLE "site_settings_social_links" ADD CONSTRAINT "site_settings_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_settings_social_links_order_idx" ON "site_settings_social_links" USING btree ("_order");
  CREATE INDEX "site_settings_social_links_parent_id_idx" ON "site_settings_social_links" USING btree ("_parent_id");
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_brand_image_id_media_id_fk" FOREIGN KEY ("brand_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_settings_brand_image_idx" ON "site_settings" USING btree ("brand_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings_social_links" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "site_settings_social_links" CASCADE;
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_brand_image_id_media_id_fk";
  
  DROP INDEX "site_settings_brand_image_idx";
  ALTER TABLE "site_settings" DROP COLUMN "brand_image_id";`)
}
