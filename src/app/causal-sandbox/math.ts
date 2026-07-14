export interface UmbrellaWorld {
  /** 0 means umbrella choice is independent of rain; 1 means it nearly follows rain. */
  selectionStrength: number;
  rainRate: number;
  umbrellaWhenDry: number;
  umbrellaWhenRainy: number;
  wetShoesWhenDry: number;
  wetShoesWhenRainy: number;
}

export interface UmbrellaSummary {
  observedWetWithoutUmbrella: number;
  observedWetWithUmbrella: number;
  forcedWetWithoutUmbrella: number;
  forcedWetWithUmbrella: number;
  rainAmongPeopleWithoutUmbrella: number;
  rainAmongPeopleWithUmbrella: number;
  observedAssociation: number;
  forcedEffect: number;
}

const RAIN_RATE = 0.4;
const WET_SHOES_WHEN_DRY = 0.1;
const WET_SHOES_WHEN_RAINY = 0.9;
const BASE_UMBRELLA_RATE = 0.5;
const MAX_RAIN_SELECTION = 0.45;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Builds one deliberately small data-generating world.
 *
 * Rain affects both umbrella choice and wet shoes. Umbrellas never affect wet
 * shoes. The dial changes only the C -> X part of the world, which lets the
 * visualization isolate selection bias from a causal effect.
 */
export function createUmbrellaWorld(selectionStrength: number): UmbrellaWorld {
  const strength = clamp(selectionStrength, 0, 1);
  const selection = MAX_RAIN_SELECTION * strength;

  return {
    selectionStrength: strength,
    rainRate: RAIN_RATE,
    umbrellaWhenDry: BASE_UMBRELLA_RATE - selection,
    umbrellaWhenRainy: BASE_UMBRELLA_RATE + selection,
    wetShoesWhenDry: WET_SHOES_WHEN_DRY,
    wetShoesWhenRainy: WET_SHOES_WHEN_RAINY,
  };
}

function probabilityOfUmbrella(world: UmbrellaWorld, umbrella: 0 | 1): number {
  const withUmbrella =
    world.rainRate * world.umbrellaWhenRainy
    + (1 - world.rainRate) * world.umbrellaWhenDry;
  return umbrella === 1 ? withUmbrella : 1 - withUmbrella;
}

function probabilityOfRainGivenUmbrella(world: UmbrellaWorld, umbrella: 0 | 1): number {
  const chanceOfGroup = probabilityOfUmbrella(world, umbrella);
  if (chanceOfGroup === 0) return 0;

  const chanceOfUmbrellaWhenRainy = umbrella === 1
    ? world.umbrellaWhenRainy
    : 1 - world.umbrellaWhenRainy;

  return world.rainRate * chanceOfUmbrellaWhenRainy / chanceOfGroup;
}

function wetShoeRate(rainRate: number, world: UmbrellaWorld): number {
  return rainRate * world.wetShoesWhenRainy
    + (1 - rainRate) * world.wetShoesWhenDry;
}

/**
 * Computes exact conditional probabilities for the observational world and
 * the counterfactual world where umbrella assignment is independent of rain.
 */
export function summarizeUmbrellaWorld(world: UmbrellaWorld): UmbrellaSummary {
  const rainAmongPeopleWithoutUmbrella = probabilityOfRainGivenUmbrella(world, 0);
  const rainAmongPeopleWithUmbrella = probabilityOfRainGivenUmbrella(world, 1);
  const observedWetWithoutUmbrella = wetShoeRate(rainAmongPeopleWithoutUmbrella, world);
  const observedWetWithUmbrella = wetShoeRate(rainAmongPeopleWithUmbrella, world);
  const forcedWetWithoutUmbrella = wetShoeRate(world.rainRate, world);
  const forcedWetWithUmbrella = wetShoeRate(world.rainRate, world);

  return {
    observedWetWithoutUmbrella,
    observedWetWithUmbrella,
    forcedWetWithoutUmbrella,
    forcedWetWithUmbrella,
    rainAmongPeopleWithoutUmbrella,
    rainAmongPeopleWithUmbrella,
    observedAssociation: observedWetWithUmbrella - observedWetWithoutUmbrella,
    forcedEffect: forcedWetWithUmbrella - forcedWetWithoutUmbrella,
  };
}
