export type CameraFacingMode = "environment" | "user";
export type CoordinatePrecision = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const COORDINATE_PRECISIONS: readonly CoordinatePrecision[] = [0, 1, 2, 3, 4, 5, 6];

export function isCoordinatePrecision(value: number): value is CoordinatePrecision {
  return Number.isInteger(value) && value >= 0 && value <= 6;
}

export function formatCoordinate(value: number | null, precision: CoordinatePrecision): string {
  return value === null || !Number.isFinite(value) ? "대기" : value.toFixed(precision);
}
