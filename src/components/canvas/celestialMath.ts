import type {
  CelestialUniverseData,
  UniverseSelection,
  DiscoveryCategory,
} from '../../types';

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  targetX?: number;
  targetY?: number;
  targetZoom?: number;
}

/**
 * Converts screen pixel coordinates into world space coordinates.
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  width: number,
  height: number,
  cam: CameraState
): { x: number; y: number } {
  const wx = (screenX - width / 2) / cam.zoom + cam.x;
  const wy = (screenY - height / 2) / cam.zoom + cam.y;
  return { x: wx, y: wy };
}

/**
 * Converts world space coordinates into screen pixel coordinates.
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  width: number,
  height: number,
  cam: CameraState
): { x: number; y: number } {
  const sx = (worldX - cam.x) * cam.zoom + width / 2;
  const sy = (worldY - cam.y) * cam.zoom + height / 2;
  return { x: sx, y: sy };
}

/**
 * Smooth sigmoidal acceleration & deceleration curve (ease-in-out) for hyperspace jumps.
 */
export function calculateHyperspaceEase(rawProgress: number): number {
  if (rawProgress < 0.5) {
    return 4 * rawProgress * rawProgress * rawProgress;
  }
  return 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;
}

/**
 * Evaluates hit testing against universe objects in priority order:
 * Meteors -> Asteroids -> Discoveries -> Tracks -> Artists -> Subgenres -> Genres
 */
export function hitTestUniverse(
  worldPos: { x: number; y: number },
  universeData: CelestialUniverseData,
  currentZoomLevel: 1 | 2 | 3 | 4,
  selection: UniverseSelection,
  discoveryFilter: DiscoveryCategory | 'all' = 'all',
  interactionRadiusExtra: number = 0
): UniverseSelection {
  // 1. Dynamic Meteors
  if (universeData.meteors) {
    for (const meteor of universeData.meteors) {
      const dist = Math.hypot(meteor.currentX - worldPos.x, meteor.currentY - worldPos.y);
      if (dist <= 14 + interactionRadiusExtra) {
        return { type: 'meteor', item: meteor };
      }
    }
  }

  // 2. Asteroid Density Belts
  if (universeData.asteroids) {
    for (const ast of universeData.asteroids) {
      const dist = Math.hypot(ast.x - worldPos.x, ast.y - worldPos.y);
      if (dist <= ast.radius + 10 + interactionRadiusExtra) {
        return { type: 'asteroid', item: ast };
      }
    }
  }

  // 3. Discovery Stars
  if (universeData.discoveries) {
    for (const disc of universeData.discoveries) {
      if (discoveryFilter !== 'all' && disc.recommendation.category !== discoveryFilter) continue;
      const dist = Math.hypot(disc.x - worldPos.x, disc.y - worldPos.y);
      if (dist <= disc.radius + 14 + interactionRadiusExtra) {
        return { type: 'discovery', item: disc };
      }
    }
  }

  // 3B. Black Holes (Singularities of extreme gravity)
  if (universeData.blackHoles) {
    for (const bh of universeData.blackHoles) {
      const dist = Math.hypot(bh.x - worldPos.x, bh.y - worldPos.y);
      if (dist <= bh.eventHorizonRadius + 10 + interactionRadiusExtra) {
        return { type: 'blackHole', item: bh };
      }
    }
  }

  // 3C. Signal Satellites (Cross-system relays)
  if (universeData.signalSatellites) {
    for (const sat of universeData.signalSatellites) {
      const dist = Math.hypot(sat.x - worldPos.x, sat.y - worldPos.y);
      if (dist <= sat.radius + 12 + interactionRadiusExtra) {
        return { type: 'signalSatellite', item: sat };
      }
    }
  }

  // 4. Tracks (visible at deep zoom or when artist selected)
  if (currentZoomLevel >= 3 || selection?.type === 'artist') {
    for (const artist of universeData.artists) {
      for (const track of artist.tracks) {
        const dist = Math.hypot(track.x - worldPos.x, track.y - worldPos.y);
        if (dist <= 12 + interactionRadiusExtra) {
          return { type: 'track', item: track };
        }
      }
    }
  }

  // 5. Artists
  if (currentZoomLevel >= 2) {
    for (const artist of universeData.artists) {
      const dist = Math.hypot(artist.x - worldPos.x, artist.y - worldPos.y);
      if (dist <= artist.radius + 10 + interactionRadiusExtra) {
        return { type: 'artist', item: artist };
      }
    }
  }

  // 6. Subgenres
  if (currentZoomLevel >= 2) {
    for (const genre of universeData.genres) {
      for (const sub of genre.subgenres) {
        const dist = Math.hypot(sub.x - worldPos.x, sub.y - worldPos.y);
        if (dist <= 12 + interactionRadiusExtra) {
          return { type: 'subgenre', item: sub };
        }
      }
    }
  }

  // 7. Major Genre Suns
  for (const genre of universeData.genres) {
    const dist = Math.hypot(genre.x - worldPos.x, genre.y - worldPos.y);
    if (dist <= genre.radius + 12 + interactionRadiusExtra) {
      return { type: 'genre', item: genre };
    }
  }

  return null;
}
