import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const formatData = require('../../main/utils/formatData');

function writeLog(content) {
  const tmpFile = path.join(os.tmpdir(), `Match_GameLog_test_${Date.now()}.dat`);
  fs.writeFileSync(tmpFile, content, 'utf8');
  return tmpFile;
}

describe('formatData', () => {
  let tmpFile;

  afterEach(() => { if (tmpFile) fs.unlinkSync(tmpFile); });

  it('parses a single game with two players casting cards', () => {
    tmpFile = writeLog([
      'chooses to play first',
      '@PAlice casts @[Lightning Bolt@: something',
      '@PBob casts @[Counterspell@: something',
      '@PAlice plays @[Mountain@: something',
      '@PAlice wins the game',
    ].join('\n'));

    const result = formatData(tmpFile);
    const alice = result.users.find(u => u.userName === 'Alice');
    const bob = result.users.find(u => u.userName === 'Bob');

    expect(alice).toBeDefined();
    expect(bob).toBeDefined();
    expect(alice.game1.some(c => c.card === 'Lightning Bolt')).toBe(true);
    expect(alice.game1.some(c => c.card === 'Mountain')).toBe(true);
    expect(bob.game1.some(c => c.card === 'Counterspell')).toBe(true);
    expect(result.gameMeta.game1.winner).toBe('Alice');
  });

  it('tracks mulligans per player per game', () => {
    tmpFile = writeLog([
      'chooses to play first',
      '@PAlice mulligans',
      '@PAlice mulligans',
      '@PBob mulligans',
      '@PAlice casts @[Goblin Guide@: x',
      '@PBob wins the game',
    ].join('\n'));

    const result = formatData(tmpFile);
    expect(result.gameMeta.game1.mulligans['Alice']).toBe(2);
    expect(result.gameMeta.game1.mulligans['Bob']).toBe(1);
    expect(result.gameMeta.game1.winner).toBe('Bob');
  });

  it('separates multiple games correctly', () => {
    tmpFile = writeLog([
      'chooses to play first',
      '@PAlice casts @[Bolt@: x',
      '@PAlice wins the game',
      'chooses to play first',
      '@PBob casts @[Cancel@: x',
      '@PBob wins the game',
    ].join('\n'));

    const result = formatData(tmpFile);
    const alice = result.users.find(u => u.userName === 'Alice');
    const bob = result.users.find(u => u.userName === 'Bob');

    expect(alice.game1?.some(c => c.card === 'Bolt')).toBe(true);
    expect(bob.game2?.some(c => c.card === 'Cancel')).toBe(true);
    expect(result.gameMeta.game1.winner).toBe('Alice');
    expect(result.gameMeta.game2.winner).toBe('Bob');
  });

  it('returns empty users and gameMeta for empty file', () => {
    tmpFile = writeLog('');
    const result = formatData(tmpFile);
    expect(result.users).toHaveLength(0);
    expect(Object.keys(result.gameMeta)).toHaveLength(0);
  });

  it('counts card occurrences correctly', () => {
    tmpFile = writeLog([
      'chooses to play first',
      '@PAlice casts @[Goblin Guide@: x',
      '@PAlice casts @[Goblin Guide@: x',
      '@PAlice casts @[Goblin Guide@: x',
    ].join('\n'));

    const result = formatData(tmpFile);
    const alice = result.users.find(u => u.userName === 'Alice');
    const goblin = alice.game1.find(c => c.card === 'Goblin Guide');
    expect(goblin.occurrence).toBe(3);
  });
});
