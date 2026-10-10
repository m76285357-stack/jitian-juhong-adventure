export const STAGES = ['橘红花园', '剪纸小巷', '积田运动场'];
export const OPTIONS = { easy: { duration: 60, hearts: 4, speed: .36, gap: 1.42 }, brave: { duration: 75, hearts: 3, speed: .43, gap: 1.18 } };
export function randomSeed(seed) {
  let n = seed >>> 0;
  return () => { n += 0x6D2B79F5; let t = Math.imul(n ^ n >>> 15, 1 | n); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function createRun(mode = 'easy', seed = Date.now()) {
  const options = OPTIONS[mode] || OPTIONS.easy;
  return { mode, options, rng: randomSeed(seed), seed, time: 0, distance: 0, status: 'playing', lane: 1, lanePosition: 1, jump: 0, hearts: options.hearts, score: 0, collected: 0, flowers: 0, combo: 0, maxCombo: 0, shield: 0, magnet: 0, invincible: 0, entities: [], spawnIn: .8, waves: 0, stage: 0, events: [], nextId: 0 };
}
export function speedAt(run) { const progress = Math.max(0, Math.min(1, run.time / run.options.duration)); return run.options.speed * (.7 + .6 * progress); }
export function moveLane(run, direction) {
  if (run.status !== 'playing') return false;
  run.lane = Math.max(0, Math.min(2, run.lane + Math.sign(direction)));
  return true;
}
export function jump(run) {
  if (run.status !== 'playing' || run.jump > 0) return false;
  run.jump = .82;
  run.events.push({ type: 'jump' });
  return true;
}
export function jumpHeight(run) { return run.jump > 0 ? Math.sin(Math.PI * (1 - run.jump / .82)) : 0; }
export function spawnWave(run) {
  const { rng } = run;
  const safeLane = Math.floor(rng() * 3);
  const add = (type, lane, z = 0) => run.entities.push({ id: run.nextId++, type, lane, z, checked: false });
  const reward = run.waves % 6 === 4 ? 'flower' : 'leaf';
  add(reward, safeLane);
  add('leaf', safeLane, -.15);
  if (run.waves > 1) {
    const otherLanes = [0, 1, 2].filter(l => l !== safeLane);
    add(run.waves % 3 === 0 ? 'puddle' : 'cone', otherLanes[Math.floor(rng() * 2)]);
    if (run.stage > 0 && rng() > .56) add('puddle', otherLanes.find(l => !run.entities.some(e => e.z === 0 && e.lane === l && ['puddle', 'cone'].includes(e.type))));
  }
  if (run.waves > 0 && run.waves % 11 === 0) add('magnet', (safeLane + 1) % 3, -.3);
  run.waves++;
}
export function resolveEntity(run, e) {
  if (['leaf', 'flower', 'magnet'].includes(e.type)) {
    if (Math.abs(run.lanePosition - e.lane) > .46 && run.magnet <= 0) return;
    run.combo++;
    run.maxCombo = Math.max(run.combo, run.maxCombo);
    const multiplier = Math.min(3, 1 + Math.floor(run.combo / 8));
    const points = (e.type === 'flower' ? 25 : e.type === 'magnet' ? 15 : 10) * multiplier;
    run.score += points;
    run.collected++;
    if (e.type === 'flower') {
      run.flowers++;
      if (run.flowers % 3 === 0) { run.shield = 8; run.events.push({ type: 'shield' }); }
    }
    if (e.type === 'magnet') { run.magnet = 6; run.events.push({ type: 'magnet' }); }
    run.events.push({ type: 'collect', points, lane: e.lane, kind: e.type });
    e.hidden = true;
    return;
  }
  if (Math.abs(run.lanePosition - e.lane) > .46 || run.invincible > 0) return;
  if (jumpHeight(run) > .28) { run.score += 5; run.events.push({ type: 'dodge', points: 5, lane: e.lane }); return; }
  if (run.shield > 0) { run.shield = 0; run.invincible = .9; run.events.push({ type: 'protected' }); }
  else { run.hearts--; run.combo = 0; run.invincible = 1.5; run.events.push({ type: 'hit' }); }
  if (run.hearts <= 0) { run.status = 'lost'; run.events.push({ type: 'finish', won: false }); }
}
export function updateRun(run, delta) {
  if (run.status !== 'playing') return;
  const dt = Math.max(0, Math.min(delta, .05));
  run.time = Math.min(run.options.duration, run.time + dt);
  run.lanePosition += (run.lane - run.lanePosition) * Math.min(1, dt * 18);
  for (const key of ['jump', 'shield', 'magnet', 'invincible']) run[key] = Math.max(0, run[key] - dt);
  const stage = Math.min(2, Math.floor(run.time / (run.options.duration / 3)));
  if (stage !== run.stage) { run.stage = stage; run.events.push({ type: 'stage', stage }); }
  run.spawnIn -= dt;
  if (run.spawnIn <= 0 && run.time < run.options.duration - 3) { spawnWave(run); run.spawnIn += run.options.gap * (1 - .22 * run.time / run.options.duration); }
  const speed = speedAt(run);
  run.distance += speed * dt;
  for (const entity of run.entities) {
    entity.z += speed * dt;
    if (!entity.checked && entity.z >= .83 && run.status === 'playing') { entity.checked = true; resolveEntity(run, entity); }
  }
  run.entities = run.entities.filter(e => e.z < 1.16 && !e.hidden);
  if (run.status === 'playing' && run.time >= run.options.duration) { run.status = 'won'; run.score += run.hearts * 50; run.events.push({ type: 'finish', won: true }); }
}
export function starRating(run) { return run.status !== 'won' ? 1 : run.score >= 700 && run.hearts >= 2 ? 3 : run.score >= 350 ? 2 : 1; }
export function makePaperPattern(type = 'flower') {
  const base = type === 'flower' ? [0, 1, 2, 3, 4] : type === 'leaf' ? [1, 3, 0, 4, 2] : [2, 4, 1, 3, 0];
  return base;
}
