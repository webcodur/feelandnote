import assert from 'node:assert/strict';
import { createClient } from '@feelandnote/db';
import { selectInChunks } from '@feelandnote/shared/lib/paginate';
import { isPublicDomainCeleb } from '../../src/components/features/game/utils';
import type { BattleCard } from '../../src/lib/game/types';
import { COMMANDS } from '../../src/lib/game/types';
import { DIFFICULTIES, RULES } from '../../src/lib/game/hegemony/constants';
import { buildDraftPool, picksOf } from '../../src/lib/game/hegemony/draft';
import { rngFor } from '../../src/lib/game/hegemony/rng';
import { hegemonyReducer, initialHegemonyState } from '../../src/lib/game/hegemony/session/reducer';
import { SCENARIOS, SUIKODEN_CHARACTER_IDS, getMissingScenarioCharacterIds } from '../../src/lib/game/suikoden/scenarios';
import { dbToCharacter } from '../../src/lib/game/suikoden/utils';
import { previewScenario, finalizeGame, raiseArmy } from '../../src/lib/game/suikoden/engine';
import { parseSpectrumJsonb } from '../../src/lib/spectrum/types';
import { TERRITORIES } from '../../src/lib/game/suikoden/constants';
import { validateSpeechTone } from '../../src/lib/game/voice/speechTone';
import { HEROES } from '../../src/components/features/game/myth/troy/campaign/heroes';
import { FOE_SLUGS } from '../../src/components/features/game/myth/troy/campaign/foes';

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY!);
  const result = await db.from('celebs').select('id,nickname,profession,title,nationality,avatar_url,death_date,gender,celeb_influence!inner(political,strategic,tech,social,economic,cultural,transhistoricity),celeb_persona!inner(command,martial,intellect,charm)')
    .eq('publication_status', 'active').not('death_date', 'is', null).gte('celeb_influence.transhistoricity', 15);
  assert.equal(result.error, null);
  const cards: BattleCard[] = result.data!.filter(row => isPublicDomainCeleb(row.death_date)).map(row => ({
    id: row.id, nickname: row.nickname, profession: row.profession, title: row.title, nationality: row.nationality,
    avatarUrl: row.avatar_url, portraitUrl: null, quotes: '', gender: row.gender, speechTone: validateSpeechTone(null),
    influence: row.celeb_influence, ability: row.celeb_persona,
  }));
  assert.ok(cards.length >= 15);
  const lines = await selectInChunks(cards.map(c => c.id), ids => db.from('celeb_dialogues').select('celeb_id,quote:lines->quote').in('celeb_id', ids));
  let games = 0;
  for (const difficulty of DIFFICULTIES) for (let seed = 1; seed <= 60; seed++) {
    let state = hegemonyReducer(initialHegemonyState, { type: 'load', difficulty, seed });
    const pool = buildDraftPool(cards, rngFor(seed, 'pool'));
    assert.equal(new Set(pool.map(c => c.id)).size, 15);
    state = hegemonyReducer(state, { type: 'draftReady', roster: cards, pool });
    state = hegemonyReducer(state, { type: 'draftAuto' });
    assert.equal(new Set(state.draft!.picks.map(p => p.cardId)).size, 10);
    state = hegemonyReducer(state, { type: 'draftConfirm' });
    state = hegemonyReducer(state, { type: 'captain', cardId: picksOf(state.draft!, 'player')[0].id });
    for (let round = 1; round <= RULES.maxRounds && state.phase !== 'result'; round++) {
      if (state.battle!.step === 'recall') state = hegemonyReducer(state, { type: 'recall', cardId: state.battle!.recallOptions[0].id });
      assert.equal(state.battle!.step, 'plan');
      state = hegemonyReducer(state, { type: 'lockIn', play: { cardId: state.battle!.player.hand[0].id, command: COMMANDS[(seed + round) % 3] } });
      state = hegemonyReducer(state, { type: 'revealDone' });
      if (state.battle!.step === 'duelOffer') state = hegemonyReducer(state, { type: 'duelDecline' });
      assert.equal(state.battle!.step, 'outcome');
      for (const side of [state.battle!.player, state.battle!.ai]) {
        assert.ok(Number.isFinite(side.nation.power) && Number.isFinite(side.nation.morale));
        assert.equal(new Set([...side.hand, ...side.used].map(c => c.id)).size, RULES.handSize);
      }
      state = hegemonyReducer(state, { type: 'nextRound' });
    }
    assert.equal(state.phase, 'result', `No result: ${difficulty}/${seed}`);
    games++;
  }

  const scenarioResult = await db.from('celebs').select('id,nickname,title,profession,nationality,gender,birth_date,death_date,bio,avatar_url,celeb_influence(*),celeb_persona(persona)')
    .eq('publication_status', 'active').in('id', SUIKODEN_CHARACTER_IDS);
  assert.equal(scenarioResult.error, null);
  const characters = scenarioResult.data!.map(row => {
    assert.ok(row.celeb_persona?.persona, `Missing evaluation: ${row.nickname}`);
    return dbToCharacter(row, row.celeb_influence, parseSpectrumJsonb(row.celeb_persona.persona));
  });
  const loaded = new Set(characters.map(c => c.id));
  let starts = 0;
  for (const scenario of SCENARIOS) {
    assert.deepEqual(getMissingScenarioCharacterIds(scenario, loaded), []);
    for (const candidate of scenario.playerCandidates) {
      const preview = previewScenario(scenario, characters);
      const game = finalizeGame(preview, candidate.profileId);
      assert.equal(game.wandering!.leader.id, candidate.profileId);
      assert.ok(Object.values(game.wandering!.leader.stats).every(Number.isFinite));
      const free = TERRITORIES.find(t => game.activeTerritoryIds.includes(t.id) && t.regionId === game.wandering!.currentRegionId && !game.factions.some(f => f.territories.some(owned => owned.id === t.id)));
      assert.ok(free, `No place to raise an army: ${scenario.id}/${candidate.profileId}`);
      const [a, b] = game.factions;
      a.relations[b.id] = 37;
      const raised = raiseArmy(game, free.id);
      assert.equal(raised.phase, 'strategy');
      assert.equal(raised.factions.find(f => f.id === a.id)!.relations[b.id], 37, 'Founding must preserve other factions relations');
      starts++;
    }
  }
  const myths = await db.from('faction_lv2').select('id').eq('slug', 'homer-iliad').eq('published', true).single();
  assert.equal(myths.error, null);
  const members = await db.from('faction_member_rows').select('celeb_id').eq('lv2_id', myths.data!.id).eq('hidden', false);
  assert.equal(members.error, null);
  const cast = await selectInChunks(members.data!.map(m => m.celeb_id), ids => db.from('celebs').select('id,slug,nickname,avatar_url').eq('publication_status', 'active').in('id', ids));
  const slugs = new Set(cast.map(c => c.slug));
  const required = [...new Set([...HEROES.map(h => h.slug), ...FOE_SLUGS])];
  const missingTroyCast = required.filter(slug => !slugs.has(slug));
  assert.deepEqual(missingTroyCast, [], 'Troy cast must match actual DB slugs');
  console.log(JSON.stringify({ hegemonyCards: cards.length, quotes: lines.length, hegemonyFinishedGames: games, suikodenFigures: loaded.size, suikodenLordStarts: starts, troyCast: cast.length, troyRequired: required.length }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
