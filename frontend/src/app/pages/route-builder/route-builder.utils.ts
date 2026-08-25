import { Waypoint } from './route-builder.models';

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  const phone = value.trim();
  if (!/^\+?[\d\s\-()]{7,20}$/.test(phone)) {
    return false;
  }
  return phone.replace(/\D/g, '').length >= 7;
}

export function hasPendingBorderCheckpoint(waypoints: Waypoint[]): boolean {
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const current = waypoints[i];
    const next = waypoints[i + 1];
    if (!current.country || !next.country) {
      continue;
    }
    if (current.country === next.country) {
      continue;
    }
    if (current.isBorder || next.isBorder) {
      continue;
    }
    if (current.country === 'ua' || next.country === 'ua') {
      return true;
    }
  }
  return false;
}
