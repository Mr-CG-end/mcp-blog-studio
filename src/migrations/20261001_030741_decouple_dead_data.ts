import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_settings_social_links_platform" AS ENUM('github', 'x', 'telegram', 'bilibili', 'netease', 'email', 'rss', 'custom');
  CREATE TYPE "public"."enum_site_settings_quote_settings_mode" AS ENUM('hitokoto', 'custom_api', 'manual', 'disabled');
  ALTER TABLE "posts" ADD COLUMN "pinned" boolean DEFAULT false;
  ALTER TABLE "posts" ADD COLUMN "show_source_credit" boolean DEFAULT true;
  ALTER TABLE "_posts_v" ADD COLUMN "version_pinned" boolean DEFAULT false;
  ALTER TABLE "_posts_v" ADD COLUMN "version_show_source_credit" boolean DEFAULT true;
  ALTER TABLE "site_settings_social_links" ADD COLUMN "platform" "enum_site_settings_social_links_platform" DEFAULT 'custom';
  ALTER TABLE "site_settings" ADD COLUMN "hero_slogan" varchar DEFAULT 'I orchestrate ideas into products with AI Agents';
  ALTER TABLE "site_settings" ADD COLUMN "quote_settings_mode" "enum_site_settings_quote_settings_mode" DEFAULT 'hitokoto';
  ALTER TABLE "site_settings" ADD COLUMN "quote_settings_manual_quote" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "quote_settings_manual_author" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "quote_settings_custom_api_url" varchar DEFAULT 'https://v1.hitokoto.cn/';
  ALTER TABLE "site_settings" ADD COLUMN "quote_settings_quote_json_path" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "custom_stats_enabled" boolean DEFAULT false;
  ALTER TABLE "site_settings" ADD COLUMN "custom_stats_posts_count" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "custom_stats_words_count" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "custom_stats_site_days" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "about_title" varchar DEFAULT '自述';
  ALTER TABLE "site_settings" ADD COLUMN "about_subtitle" varchar DEFAULT '这是一份关于站长的报告，请查收';`)

  await db.execute(sql`
    UPDATE "posts" SET "pinned" = true WHERE "import_source_url" LIKE '%ai-era-efficiency-paradox-productivity-gains-cause-fatigue';
    UPDATE "_posts_v" SET "version_pinned" = true WHERE "version_import_source_url" LIKE '%ai-era-efficiency-paradox-productivity-gains-cause-fatigue';
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" DROP COLUMN "pinned";
  ALTER TABLE "posts" DROP COLUMN "show_source_credit";
  ALTER TABLE "_posts_v" DROP COLUMN "version_pinned";
  ALTER TABLE "_posts_v" DROP COLUMN "version_show_source_credit";
  ALTER TABLE "site_settings_social_links" DROP COLUMN "platform";
  ALTER TABLE "site_settings" DROP COLUMN "hero_slogan";
  ALTER TABLE "site_settings" DROP COLUMN "quote_settings_mode";
  ALTER TABLE "site_settings" DROP COLUMN "quote_settings_manual_quote";
  ALTER TABLE "site_settings" DROP COLUMN "quote_settings_manual_author";
  ALTER TABLE "site_settings" DROP COLUMN "quote_settings_custom_api_url";
  ALTER TABLE "site_settings" DROP COLUMN "quote_settings_quote_json_path";
  ALTER TABLE "site_settings" DROP COLUMN "custom_stats_enabled";
  ALTER TABLE "site_settings" DROP COLUMN "custom_stats_posts_count";
  ALTER TABLE "site_settings" DROP COLUMN "custom_stats_words_count";
  ALTER TABLE "site_settings" DROP COLUMN "custom_stats_site_days";
  ALTER TABLE "site_settings" DROP COLUMN "about_title";
  ALTER TABLE "site_settings" DROP COLUMN "about_subtitle";
  DROP TYPE "public"."enum_site_settings_social_links_platform";
  DROP TYPE "public"."enum_site_settings_quote_settings_mode";`)
}
