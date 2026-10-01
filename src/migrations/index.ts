import * as migration_20260930_033124_initial_blog from './20260930_033124_initial_blog';
import * as migration_20260930_105100_frontend_branding from './20260930_105100_frontend_branding';
import * as migration_20261001_012115_yohaku_import from './20261001_012115_yohaku_import';
import * as migration_20261001_030741_decouple_dead_data from './20261001_030741_decouple_dead_data';
import * as migration_20261001_034348_add_site_start_date from './20261001_034348_add_site_start_date';
import * as migration_20261001_121205_add_user_avatar from './20261001_121205_add_user_avatar';

export const migrations = [
  {
    up: migration_20260930_033124_initial_blog.up,
    down: migration_20260930_033124_initial_blog.down,
    name: '20260930_033124_initial_blog',
  },
  {
    up: migration_20260930_105100_frontend_branding.up,
    down: migration_20260930_105100_frontend_branding.down,
    name: '20260930_105100_frontend_branding',
  },
  {
    up: migration_20261001_012115_yohaku_import.up,
    down: migration_20261001_012115_yohaku_import.down,
    name: '20261001_012115_yohaku_import',
  },
  {
    up: migration_20261001_030741_decouple_dead_data.up,
    down: migration_20261001_030741_decouple_dead_data.down,
    name: '20261001_030741_decouple_dead_data',
  },
  {
    up: migration_20261001_034348_add_site_start_date.up,
    down: migration_20261001_034348_add_site_start_date.down,
    name: '20261001_034348_add_site_start_date',
  },
  {
    up: migration_20261001_121205_add_user_avatar.up,
    down: migration_20261001_121205_add_user_avatar.down,
    name: '20261001_121205_add_user_avatar'
  },
];
