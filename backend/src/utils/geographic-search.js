export const ALLOWED_RADIUS_KM = Object.freeze([1, 5, 10, 20]);
export const METERS_PER_KILOMETER = 1_000;
export const APPROXIMATE_COORDINATE_DECIMALS = 2;
export const DISTANCE_KM_DECIMALS = 1;

export function hasGeographicSearch({ lat, lon, radiusKm }) {
  return lat !== undefined && lon !== undefined && radiusKm !== undefined;
}
