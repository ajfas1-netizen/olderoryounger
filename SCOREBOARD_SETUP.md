# Global Daily Scoreboard — setup (~5 minutes)

The game works fully without this. Turn it on to show a **worldwide Daily
distribution** on the result screen: how many people played today, the score
spread, and what percent of players you beat.

It uses a free [Supabase](https://supabase.com) project as the shared backend
(GitHub Pages can only serve the page — it can't store scores). Everything the
browser sends is a single number (today's daily number + your 0–5 score); no
accounts, no personal data.

## 1. Create a free Supabase project
1. Go to supabase.com, sign up, and create a new project (any name/region).
2. Wait for it to finish provisioning (~1 minute).

## 2. Create the table + aggregate function
Open **SQL Editor** in your project and run this once:

```sql
create table if not exists daily_scores (
  id         bigint generated always as identity primary key,
  day        int  not null,
  score      int  not null check (score between 0 and 5),
  created_at timestamptz not null default now()
);

alter table daily_scores enable row level security;

-- allow anonymous inserts of sane rows only
create policy "insert daily score" on daily_scores
  for insert to anon
  with check (score between 0 and 5 and day between 1 and 100000);

-- return only an aggregate distribution (raw rows stay private)
create or replace function daily_stats(d int)
returns table(score int, n bigint)
language sql security definer set search_path = public as $$
  select score, count(*)::bigint
  from daily_scores
  where day = d
  group by score;
$$;

grant execute on function daily_stats(int) to anon;
```

> Note: anonymous clients can **insert** and can call **daily_stats**, but they
> cannot read the raw `daily_scores` rows (no select policy). That keeps the
> feature simple while limiting scraping/abuse. It is not cheat-proof — anyone
> could POST a fake score from the browser. For a hardened version, move the
> write behind a Cloudflare Worker (ask and I'll build it).

## 3. Get your two public values
In **Project Settings → API**, copy:
- **Project URL** — e.g. `https://abcd1234.supabase.co`
- **anon public** key (the long `public` key — safe to expose in a web page)

## 4. Paste them into the game
In `index.html`, find the `SCOREBOARD` config near the top of the `<script>`:

```js
const SCOREBOARD = (typeof window !== 'undefined' && window.BMT_SCOREBOARD) || {
  url: '',   // e.g. 'https://YOURPROJECT.supabase.co'
  key: ''    // your project's public anon key
};
```

Fill in `url` and `key`, then bump the service-worker cache name in `sw.js`
(e.g. `bmt-v6` → `bmt-v7`) so returning players pick up the change, commit, and
push. Done — the worldwide distribution appears on the Daily result screen.

## Turning it off
Set `url` and `key` back to empty strings. The game behaves exactly as before —
no network calls are made when it's unconfigured.
