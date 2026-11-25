// Local PostgreSQL only. Never accepts a production connection string.
// Snapshot: production catalog and policies inspected 2026-11-23; no user data copied.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(resolve(process.env.PRISMA_SECURITY_TOOLS || '.', 'package.json'));
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
const tables = ['core_conversations', 'prisma_conversations', 'prisma_profiles'];
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
 CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
 CREATE TABLE public.core_conversations(user_id uuid NOT NULL REFERENCES auth.users(id),chat_id text NOT NULL,
 title text NOT NULL DEFAULT 'Nueva conversación',messages jsonb NOT NULL DEFAULT '[]',pinned boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,chat_id));
 ALTER TABLE public.core_conversations ENABLE ROW LEVEL SECURITY;
 CREATE POLICY core_conversations_select_own ON public.core_conversations FOR SELECT TO authenticated USING ((SELECT auth.uid())=user_id);
 CREATE POLICY core_conversations_insert_own ON public.core_conversations FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid())=user_id);
 CREATE POLICY core_conversations_update_own ON public.core_conversations FOR UPDATE TO authenticated USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
 CREATE POLICY core_conversations_delete_own ON public.core_conversations FOR DELETE TO authenticated USING ((SELECT auth.uid())=user_id);`);
 await db.exec(readFileSync(new URL('../sql/001_prisma_profiles_chats.sql',import.meta.url),'utf8'));
 await db.exec(`GRANT ALL ON public.core_conversations,public.prisma_conversations,public.prisma_profiles TO authenticated;
 INSERT INTO auth.users VALUES ('${alice}'),('${bob}');
 INSERT INTO core_conversations(user_id,chat_id) VALUES ('${alice}','a'),('${bob}','b');
 INSERT INTO prisma_conversations(user_id,id) VALUES ('${alice}','a'),('${bob}','b');
 INSERT INTO prisma_profiles(user_id) VALUES ('${alice}'),('${bob}');`);
 // Demonstrate the dangerous privilege on disposable fixtures, then roll back.
 await db.exec(`BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='${alice}'; TRUNCATE core_conversations;`);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM core_conversations')).rows[0].n,0);
 await db.exec('ROLLBACK');
 const policiesBefore=(await db.query('SELECT * FROM pg_policies ORDER BY tablename,policyname')).rows;
 const migration=readFileSync(new URL('../sql/migrations/20261123162351_revoke_non_dml_authenticated.sql',import.meta.url),'utf8');
 await db.exec(migration);await db.exec(migration); // idempotent
 assert.deepEqual((await db.query('SELECT * FROM pg_policies ORDER BY tablename,policyname')).rows,policiesBefore);
 let checks=0;
 for(const table of tables){
  for(const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER','REFERENCES']){
   const granted=(await db.query('SELECT has_table_privilege($1,$2,$3) AS ok',['authenticated',table,privilege])).rows[0].ok;
   assert.equal(granted,['SELECT','INSERT','UPDATE','DELETE'].includes(privilege));checks++;
  }
  for(const [user,other] of [[alice,bob],[bob,alice]]){
   await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub='${user}'`);
   assert.deepEqual((await db.query(`SELECT user_id FROM ${table}`)).rows,[{user_id:user}]);
   assert.equal((await db.query(`UPDATE ${table} SET updated_at=now() WHERE user_id='${other}' RETURNING user_id`)).rows.length,0);
   assert.equal((await db.query(`DELETE FROM ${table} WHERE user_id='${other}' RETURNING user_id`)).rows.length,0);
   await assert.rejects(db.exec(`UPDATE ${table} SET user_id='${other}' WHERE user_id='${user}'`),/row-level security/);
   const idColumn=table==='core_conversations'?',chat_id':table==='prisma_conversations'?',id':'';
   await assert.rejects(db.exec(`INSERT INTO ${table}(user_id${idColumn}) VALUES ('${other}'${idColumn?",'forbidden'":''})`),/row-level security/);
   assert.equal((await db.query(`UPDATE ${table} SET updated_at=now() WHERE user_id='${user}' RETURNING user_id`)).rows.length,1);
   await db.exec('BEGIN');
   assert.equal((await db.query(`DELETE FROM ${table} WHERE user_id='${user}' RETURNING user_id`)).rows.length,1);
   await db.exec(`INSERT INTO ${table}(user_id${idColumn}) VALUES ('${user}'${idColumn?",'allowed'":''}); ROLLBACK;`);
   await assert.rejects(db.exec(`TRUNCATE ${table}`),/permission denied/);
   await db.exec('RESET ROLE');checks+=8;
  }
  await db.exec('SET ROLE anon');
  await assert.rejects(db.query(`SELECT * FROM ${table}`),/permission denied/);
  await db.exec('RESET ROLE');checks++;
 }
 console.log(`PASS: ${checks} privilege/authorization checks, two users, three tables; migration idempotent and policies unchanged. Local PostgreSQL fixtures only.`);
} finally { await db.close(); }
