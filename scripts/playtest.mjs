// Automated playtest: drives solo and party flows in a mobile viewport, screenshots each state,
// and asserts core invariants (correct placement accepted, wrong placement costs a life, steal flow runs).
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/before-my-time.html', import.meta.url));
const shots = fileURLToPath(new URL('../dist/', import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
page.on('pageerror', e => { console.error('PAGE ERROR:', e.message); process.exitCode = 1; });
page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE ERROR:', m.text()); });

await page.goto('file://' + dist);
await page.screenshot({ path: shots + 'shot-1-home.png' });

// ---- solo ----
await page.click('text=Solo · Streak Mode');
await page.waitForSelector('#solo.active');
await page.screenshot({ path: shots + 'shot-2-solo-start.png' });

const correctSlot = () => page.evaluate(() => {
  if (S.bonus) return -1;
  const y = CARDS[S.cur].y;
  let i = 0; while (i < S.timeline.length && CARDS[S.timeline[i]].y <= y) i++;
  return i;
});

// 7 correct placements (handles sleeper overlays and the bonus round after 5)
let sleeperShot = false, bonusShot = false;
for (let n = 0; n < 7; n++) {
  const slot = await correctSlot();
  if (slot === -1) { // bonus round: call the exact year correctly
    if (!bonusShot) { await page.screenshot({ path: shots + 'shot-4-bonus.png' }); bonusShot = true; }
    const y = await page.evaluate(() => CARDS[S.cur].y);
    await page.fill('#year-input', String(y));
    await page.click('text=Lock it in');
    await page.waitForTimeout(300);
    continue;
  }
  const isSleeper = await page.evaluate(() => !!CARDS[S.cur].s);
  await page.locator('#s-timeline .slot').nth(slot).click();
  await page.waitForTimeout(250);
  if (isSleeper) {
    if (!sleeperShot) { await page.screenshot({ path: shots + 'shot-3-sleeper.png' }); sleeperShot = true; }
    await page.click('.overlay');
    await page.waitForTimeout(250);
  }
}
const streak = await page.evaluate(() => S.streak);
const lives1 = await page.evaluate(() => S.lives);
console.log(`solo: after correct placements streak=${streak} lives=${lives1}`);
if (lives1 !== 3) { console.error('FAIL: lost a life on correct placements'); process.exitCode = 1; }
await page.screenshot({ path: shots + 'shot-5-solo-timeline.png' });

// deliberate wrong placement
const wrongSlot = await page.evaluate(() => {
  const y = CARDS[S.cur].y;
  let i = 0; while (i < S.timeline.length && CARDS[S.timeline[i]].y <= y) i++;
  return i === 0 ? S.timeline.length : 0; // pick a definitely-wrong end
});
const hadSleeper = await page.evaluate(() => !!CARDS[S.cur].s);
await page.locator('#s-timeline .slot').nth(wrongSlot).click();
await page.waitForTimeout(250);
if (hadSleeper) { await page.click('.overlay'); await page.waitForTimeout(250); }
const lives2 = await page.evaluate(() => S.lives);
const streak2 = await page.evaluate(() => S.streak);
console.log(`solo: after wrong placement lives=${lives2} streak=${streak2}`);
if (lives2 !== 2 || streak2 !== 0) { console.error('FAIL: wrong placement did not cost life/reset streak'); process.exitCode = 1; }

// ---- party ----
await page.evaluate(() => show('home'));
await page.click('text=Party · Pass the Phone');
await page.waitForSelector('#party-setup.active');
const inputs = page.locator('#player-inputs input');
await inputs.nth(0).fill('AJ');
await inputs.nth(1).fill('Mrs. F');
await page.click('button:has-text("Start")');
await page.waitForSelector('#party.active');
await page.screenshot({ path: shots + 'shot-6-party.png' });

// Force a miss (skipping year-ties where every slot is technically correct) -> steal chance
let actor = -1;
for (let tries = 0; tries < 12 && actor === -1; tries++) {
  const info = await page.evaluate(() => {
    const tl = activePlayer().timeline, y = CARDS[P.cur].y;
    const fitsAt = (i) => {
      const l = i > 0 ? CARDS[tl[i-1]].y : -Infinity;
      const r = i < tl.length ? CARDS[tl[i]].y : Infinity;
      return y >= l && y <= r;
    };
    let wrong = -1, right = 0;
    for (let i = 0; i <= tl.length; i++) { if (!fitsAt(i)) { wrong = i; } else { right = i; } }
    return { wrong, right, actor: P.stealing != null ? P.stealing : P.turn, sleeper: !!CARDS[P.cur].s };
  });
  if (info.wrong !== -1) {
    actor = info.actor;
    await page.locator('#p-timeline .slot').nth(info.wrong).click();
  } else {
    // tie card: place it correctly and move on
    await page.locator('#p-timeline .slot').nth(info.right).click();
    await page.waitForTimeout(250);
    if (info.sleeper) { await page.click('.overlay'); }
  }
  await page.waitForTimeout(300);
}
const stealing = await page.evaluate(() => P.stealing);
const expected = (actor + 1) % 2;
console.log(`party: actor=${actor} missed, stealing=${stealing} (expected ${expected})`);
if (stealing !== expected) { console.error('FAIL: steal did not pass to next player'); process.exitCode = 1; }
await page.screenshot({ path: shots + 'shot-7-steal.png' });

// Stealer places correctly
const stealInfo = await page.evaluate(() => {
  const tl = activePlayer().timeline, y = CARDS[P.cur].y;
  let i = 0; while (i < tl.length && CARDS[tl[i]].y <= y) i++;
  return { slot: i, before: tl.length, sleeper: !!CARDS[P.cur].s, who: P.stealing };
});
await page.locator('#p-timeline .slot').nth(stealInfo.slot).click();
await page.waitForTimeout(300);
if (stealInfo.sleeper) { await page.click('.overlay'); await page.waitForTimeout(250); }
const afterSteal = await page.evaluate((who) => P.players[who].timeline.length, stealInfo.who);
console.log(`party: stealer timeline ${stealInfo.before} -> ${afterSteal}`);
if (afterSteal !== stealInfo.before + 1) { console.error('FAIL: steal did not award card'); process.exitCode = 1; }

// simulate a full party game to completion via direct calls (fast-forward win condition)
await page.evaluate(() => {
  while (P.players[0].timeline.length < 10 && P.deck.length) {
    const ci = P.deck.shift(); const tl = P.players[0].timeline;
    let i = 0; while (i < tl.length && CARDS[tl[i]].y <= CARDS[ci].y) i++;
    tl.splice(i, 0, ci);
  }
  endParty(P.players[0]);
});
await page.waitForSelector('#over.active');
await page.screenshot({ path: shots + 'shot-8-gameover.png' });

await browser.close();
console.log(process.exitCode ? 'PLAYTEST FAILED' : 'PLAYTEST PASSED');
