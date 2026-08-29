import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calcEmphasizedAbilitySimilarity,
  getEmphasizedAbilityEvidence,
  getEmphasizedAbilityVector,
  getSpectrumMatchEvidence,
  type AbilityPopulationStats,
  type StatPopulationStats,
} from './utils'
import type { SpectrumProfile, SpectrumStats } from './types'

const BASE_SPECTRUM: SpectrumStats = {
  command: 50,
  martial: 50,
  intellect: 50,
  charm: 50,
  temperance: 50,
  diligence: 50,
  reflection: 50,
  courage: 50,
  loyalty: 50,
  benevolence: 50,
  fairness: 50,
  humility: 50,
  pessimism_optimism: 0,
  conservative_progressive: 0,
  individual_social: 0,
  cautious_bold: 0,
}

const ABILITY_POPULATION_STATS: AbilityPopulationStats = {
  command: { mean: 50, standardDeviation: 10 },
  martial: { mean: 50, standardDeviation: 10 },
  intellect: { mean: 50, standardDeviation: 10 },
  charm: { mean: 50, standardDeviation: 10 },
}

const STAT_POPULATION_STATS = Object.fromEntries(
  Object.keys(BASE_SPECTRUM)
    .filter((axis) => !axis.includes('_'))
    .map((axis) => [axis, { mean: 50, standardDeviation: 10 }]),
) as StatPopulationStats

function toProfile(
  stats: SpectrumStats,
  celebId: string,
): SpectrumProfile {
  return {
    celeb_id: celebId,
    nickname: celebId,
    nickname_en: null,
    profession: null,
    avatar_url: null,
    birth_date: null,
    death_date: null,
    title: null,
    ...stats,
  }
}

test('ability match uses only the target figure strongest high ability', () => {
  const target = {
    ...BASE_SPECTRUM,
    command: 70,
    martial: 90,
    intellect: 80,
    charm: 60,
  }
  const emphasized = getEmphasizedAbilityVector(
    target,
    ABILITY_POPULATION_STATS,
  )

  assert.deepEqual(emphasized, {
    command: 0,
    martial: 4,
    intellect: 0,
    charm: 0,
  })

  const closeOnStrength = { ...BASE_SPECTRUM, martial: 88 }
  const lowOnStrength = { ...BASE_SPECTRUM, martial: 45 }
  assert.ok(
    calcEmphasizedAbilitySimilarity(
      emphasized,
      closeOnStrength,
      ABILITY_POPULATION_STATS,
    ) > 0,
  )
  assert.equal(
    calcEmphasizedAbilitySimilarity(
      emphasized,
      lowOnStrength,
      ABILITY_POPULATION_STATS,
    ),
    0,
  )
})

test('ability evidence contains the shared high strength and never a low score', () => {
  const target = { ...BASE_SPECTRUM, martial: 90 }
  const candidate = { ...BASE_SPECTRUM, martial: 88, intellect: 20 }
  const emphasized = getEmphasizedAbilityVector(
    target,
    ABILITY_POPULATION_STATS,
  )

  assert.deepEqual(
    getEmphasizedAbilityEvidence(
      target,
      candidate,
      emphasized,
      ABILITY_POPULATION_STATS,
    ),
    [{
      axis: 'martial',
      targetValue: 90,
      candidateValue: 88,
      direction: 'high',
    }],
  )
})

test('overall match evidence excludes axes where both figures score low', () => {
  const target = { ...BASE_SPECTRUM, martial: 20, intellect: 85 }
  const candidate = { ...BASE_SPECTRUM, martial: 22, intellect: 82 }
  const evidence = getSpectrumMatchEvidence(
    toProfile(target, 'target'),
    toProfile(candidate, 'candidate'),
    'overall',
    3,
    STAT_POPULATION_STATS,
  )

  assert.deepEqual(evidence, [{
    axis: 'intellect',
    targetValue: 85,
    candidateValue: 82,
    direction: 'high',
  }])
})
