# Migrations (intentionally empty)

SpendScope Web connects to the Supabase project **SpendScope**
(`bnxqgdsxxakfkcbvkoti`), whose schema is shared with the Android and iOS apps
and is owned by the mobile team (live migration `init_spend_scope_schema`).

The web app adapts to that schema in `src/lib/remoteSchema.js`; it does **not**
ship its own tables. Do not add migrations here unless they are:

1. purely additive (new nullable columns / new tables), and
2. agreed with the Android and iOS developers first.

The previous web-only `owner_id` schema is archived in
`../_archive_old_project/web_v2_owner_id/` for history only. Applying it to the
shared project would conflict with the live tables.
