# Daily Leaderboard — setup (~5 minutes)

The game works fully without this. Turn it on to show a **shared Daily
leaderboard** on the result screen: everyone who played today, ranked by score
(🥇🥈🥉), plus a "N played" count. Ideal for a friend group.

It uses a free [Supabase](https://supabase.com) project as the shared backend
(GitHub Pages can only serve the page — it can't store scores). The browser
sends today's daily number, your 0–5 score, and a display name you choose; no
account or personal data.

## 1. Create a free Supabase project
1. Go to supabase.com, sign up, and create a new project (any name/region).
2. Wait for it to finish provisioning (~1 minute).

## 2. Create the table + aggregate function
Open **SQL Editor** in your project and run this once:

```sql
create table if not exists daily_scores (
  id         bigint generated always as identity primary key,
  day        int  not null,
  name       text not null,
  score      int  not null check (score between 0 and 5),
  created_at timestamptz not null default now()
);

alter table daily_scores enable row level security;

-- allow anonymous inserts of sane rows only
create policy "insert daily score" on daily_scores
  for insert to anon
  with check (
    score between 0 and 5
    and day between 1 and 100000
    and char_length(name) between 1 and 16
  );

-- return today's ranked board (raw table stays private)
create or replace function daily_board(d int)
returns table(name text, score int)
language sql security definer set search_path = public as $$
  select name, score
  from daily_scores
  where day = d
  order by score desc, created_at asc
  limit 50;
$$;

grant execute on function daily_board(int) to anon;
```

### All-time leaderboards (Line 'Em Up + Older or Younger?)
Run this second block too, to enable the all-time boards on the Leaderboards
screen:

```sql
create table if not exists scores (
  id         bigint generated always as identity primary key,
  game       text not null,
  name       text not null,
  score      int  not null,
  created_at timestamptz not null default now()
);

alter table scores enable row level security;

create policy "insert score" on scores
  for insert to anon
  with check (
    game in ('solo','versus')
    and score between 0 and 100000
    and char_length(name) between 1 and 16
  );

create or replace function top_scores(g text)
returns table(name text, score int)
language sql security definer set search_path = public as $$
  select name, max(score)::int as score
  from scores
  where game = g
  group by name
  order by score desc
  limit 50;
$$;

grant execute on function top_scores(text) to anon;
```

> Note: anonymous clients can **insert** and can call **daily_board**, but they
> cannot read the raw `daily_scores` rows directly. The game shows one row per
> name (best score first). It is not cheat-proof — a determined person could
> POST a fake score or name from the browser. For a friend group that's fine;
> for a hardened version, move the write behind a Cloudflare Worker (ask and
> I'll build it).

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
