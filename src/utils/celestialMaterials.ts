// Celestial Material & Renderer System
// Implements natural stellar cores, coronas, orbital dust, artist stars, and track stars.
// Adheres strictly to minimal deep-space visualization standards:
// - Luminous celestial cores with soft colored coronas and radial falloff
// - Pure, dark space backgrounds with multi-tiered realistic micro-stars
// - Data-driven hierarchical brightness: Genre (Core) > Artist (Small Star) > Track (Point)
// - Whispering, ultra-thin, tinted orbital rings that fade organically

import type { CelestialColorIdentity } from './celestialColors';

export interface StarFieldParticle {
  x: number;
  y: number;
  z: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  colorRgb: string; // Faint natural stellar spectrum (cool white, icy cyan, pale warm amber)
}

/**
 * Generates an astronomical background star field of varied micro-stars.
 * Subtle, tiny points of light in deep space — no wallpaper or stock galaxies.
 */
export function createDeepSpaceStarField(count: number = 750, bounds: number = 3600): StarFieldParticle[] {
  const stars: StarFieldParticle[] = [];
  
  // Natural spectral distributions: 80% neutral/warm white, 12% icy blue, 8% soft amber
  const spectralColors = [
    '235, 240, 255', // Cool white
    '255, 250, 240', // Warm white
    '215, 230, 255', // Faint blue
    '255, 235, 205', // Faint gold/amber
  ];

  for (let i = 0; i < count; i++) {
    const colorPick = Math.random();
    const colorRgb = colorPick > 0.85 
      ? spectralColors[2] 
      : colorPick > 0.7 
      ? spectralColors[3] 
      : colorPick > 0.35 
      ? spectralColors[0] 
      : spectralColors[1];

    stars.push({
      x: (Math.random() - 0.5) * bounds,
      y: (Math.random() - 0.5) * bounds,
      z: Math.random() * 1200 + 10,
      // Mostly micro-stars (0.4px - 1.2px) with rare slightly brighter stars (up to 1.6px)
      size: Math.random() < 0.88 ? Math.random() * 0.7 + 0.4 : Math.random() * 0.7 + 1.0,
      baseAlpha: Math.random() * 0.55 + 0.15,
      twinkleSpeed: Math.random() * 1.5 + 0.5,
      twinkleOffset: Math.random() * Math.PI * 2,
      colorRgb,
    });
  }

  return stars;
}

/**
 * Renders the deep-space background star field with subtle organic twinkling.
 */
export function renderDeepSpaceStarField(
  ctx: CanvasRenderingContext2D,
  stars: StarFieldParticle[],
  time: number,
  hyperspaceSpeedFactor: number = 0,
  screenWidth: number,
  screenHeight: number,
  isDark: boolean = true
) {
  const centerX = screenWidth / 2;
  const centerY = screenHeight / 2;

  stars.forEach((star) => {
    // Depth progression in warp
    if (hyperspaceSpeedFactor > 0.02) {
      star.z -= (0.5 + hyperspaceSpeedFactor * 42);
      if (star.z <= 1) {
        star.z = 1200;
        star.x = (Math.random() - 0.5) * 3600;
        star.y = (Math.random() - 0.5) * 3600;
      }
    }

    const k = 460 / star.z;
    const sx = star.x * k + centerX;
    const sy = star.y * k + centerY;

    if (sx < -60 || sx > screenWidth + 60 || sy < -60 || sy > screenHeight + 60) return;

    // Organic micro-twinkling
    const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.18;
    const depthDim = (1 - star.z / 1250);
    const alpha = Math.max(0.06, Math.min(0.85, (star.baseAlpha + twinkle) * depthDim + hyperspaceSpeedFactor * 0.3));
    const renderSize = Math.max(0.5, star.size * depthDim * 1.3);

    if (hyperspaceSpeedFactor > 0.05) {
      // Warp trail
      const trailLength = hyperspaceSpeedFactor * (35 + depthDim * 75);
      const angle = Math.atan2(sy - centerY, sx - centerX);
      const tx = sx - Math.cos(angle) * trailLength;
      const ty = sy - Math.sin(angle) * trailLength;

      const grad = ctx.createLinearGradient(sx, sy, tx, ty);
      grad.addColorStop(0, `rgba(${star.colorRgb}, ${alpha})`);
      grad.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(0.8, renderSize * 0.85);
      ctx.stroke();
    } else {
      // Natural distant pinpoint star
      ctx.beginPath();
      ctx.arc(sx, sy, renderSize, 0, Math.PI * 2);
      if (isDark) {
        ctx.fillStyle = `rgba(${star.colorRgb}, ${alpha})`;
      } else {
        ctx.fillStyle = `rgba(30, 35, 45, ${alpha * 0.6})`;
      }
      ctx.fill();
    }
  });
}

/**
 * 1. CELESTIAL CORE MATERIAL (Major Genre Systems)
 * Replaces flat white circles with a luminous, natural celestial stellar nursery:
 * - Soft colored corona / atmosphere
 * - Subtle multi-stop radial falloff into near-black space
 * - Extremely subtle orbital dust filaments
 * - Very faint surrounding celestial particles
 * - Bright luminous stellar core with pure hot center
 */
export function renderCelestialCore(
  ctx: CanvasRenderingContext2D,
  params: {
    x: number;
    y: number;
    radius: number;
    celestialColor: CelestialColorIdentity;
    isSelected: boolean;
    isHovered: boolean;
    isDimmed: boolean;
    time: number;
    zoom: number;
    isDark?: boolean;
  }
) {
  const { x, y, radius, celestialColor, isSelected, isHovered, isDimmed, time, zoom, isDark = true } = params;
  const { glowRgb, coreRgb, dustRgb } = celestialColor;

  // Subtle breathing pulsation
  const pulse = Math.sin(time * 1.6 + radius) * 2.2;
  const currentRadius = radius + (isSelected ? 5 : isHovered ? 2.5 : 0) + pulse * 0.35;

  const dimFactor = isDimmed ? 0.22 : 1.0;
  const highlightMultiplier = isSelected ? 1.4 : isHovered ? 1.2 : 1.0;

  // A. Atmospheric Corona / Outer Halo (subtle radial falloff into space)
  const coronaRadius = currentRadius * 3.4;
  const coronaGrad = ctx.createRadialGradient(
    x, y, currentRadius * 0.35,
    x, y, coronaRadius
  );
  
  if (isDark) {
    coronaGrad.addColorStop(0, `rgba(${glowRgb}, ${0.32 * dimFactor * highlightMultiplier})`);
    coronaGrad.addColorStop(0.28, `rgba(${glowRgb}, ${0.14 * dimFactor * highlightMultiplier})`);
    coronaGrad.addColorStop(0.65, `rgba(${glowRgb}, ${0.04 * dimFactor})`);
    coronaGrad.addColorStop(1, 'transparent');
  } else {
    coronaGrad.addColorStop(0, `rgba(${glowRgb}, ${0.22 * dimFactor})`);
    coronaGrad.addColorStop(0.5, `rgba(${glowRgb}, ${0.08 * dimFactor})`);
    coronaGrad.addColorStop(1, 'transparent');
  }

  ctx.fillStyle = coronaGrad;
  ctx.beginPath();
  ctx.arc(x, y, coronaRadius, 0, Math.PI * 2);
  ctx.fill();

  // B. Extremely Subtle Orbital Dust & Stellar Nursery Filaments
  // Natural faint particulate rings hugging the system
  if (zoom >= 0.45 && !isDimmed) {
    const dustCount = 14;
    const dustBaseRadius = currentRadius * 1.55;
    ctx.save();
    for (let i = 0; i < dustCount; i++) {
      const angle = (i / dustCount) * Math.PI * 2 + time * 0.04 * ((i % 2 === 0 ? 1 : -0.8));
      const wobble = Math.sin(i * 3.7 + time * 0.6) * 6;
      const dDist = dustBaseRadius + (i % 3) * 12 + wobble;
      const dx = x + Math.cos(angle) * dDist;
      const dy = y + Math.sin(angle) * dDist;
      const dSize = 0.8 + ((i % 4) * 0.35);
      const dAlpha = (0.12 + Math.sin(time * 1.2 + i) * 0.05) * dimFactor;

      ctx.beginPath();
      ctx.arc(dx, dy, dSize, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? `rgba(${dustRgb}, ${dAlpha})` : `rgba(${glowRgb}, ${dAlpha * 0.7})`;
      ctx.fill();
    }
    ctx.restore();
  }

  // C. Optional Whispering Orbital Rings around Genre System
  // Very thin, low opacity, tinted to system, fade depending on zoom
  if (zoom >= 0.5) {
    const ringZoomFade = Math.min(1, Math.max(0.15, (zoom - 0.45) * 1.4));
    const ringRadii = [currentRadius * 1.32, currentRadius * 1.85, currentRadius * 2.45];
    
    ctx.save();
    ringRadii.forEach((rDist, rIdx) => {
      const ringAlpha = (0.045 - rIdx * 0.012) * dimFactor * ringZoomFade * (isSelected ? 1.8 : 1);
      ctx.beginPath();
      ctx.arc(x, y, rDist, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${glowRgb}, ${ringAlpha})`;
      ctx.lineWidth = 0.85;
      ctx.stroke();
    });
    ctx.restore();
  }

  // D. Middle Stellar Body (Soft luminous celestial transition)
  const bodyGrad = ctx.createRadialGradient(
    x, y, currentRadius * 0.15,
    x, y, currentRadius
  );
  if (isDark) {
    bodyGrad.addColorStop(0, `rgba(${coreRgb}, ${0.98 * dimFactor})`);
    bodyGrad.addColorStop(0.35, `rgba(${glowRgb}, ${0.82 * dimFactor})`);
    bodyGrad.addColorStop(0.72, `rgba(${glowRgb}, ${0.45 * dimFactor})`);
    bodyGrad.addColorStop(1, `rgba(${glowRgb}, ${0.08 * dimFactor})`);
  } else {
    bodyGrad.addColorStop(0, `rgba(255, 255, 255, ${0.98 * dimFactor})`);
    bodyGrad.addColorStop(0.4, `rgba(${glowRgb}, ${0.75 * dimFactor})`);
    bodyGrad.addColorStop(0.85, `rgba(${glowRgb}, ${0.35 * dimFactor})`);
    bodyGrad.addColorStop(1, `transparent`);
  }

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
  ctx.fill();

  // E. Intense Stellar Core (White/hot center point of the celestial body)
  const coreRadius = currentRadius * (isSelected ? 0.38 : 0.32);
  const coreGrad = ctx.createRadialGradient(
    x, y, 0,
    x, y, coreRadius
  );
  coreGrad.addColorStop(0, isDark ? `rgba(255, 255, 255, ${0.98 * dimFactor})` : `rgba(${coreRgb}, ${0.95 * dimFactor})`);
  coreGrad.addColorStop(0.65, `rgba(${coreRgb}, ${0.85 * dimFactor})`);
  coreGrad.addColorStop(1, `rgba(${glowRgb}, ${0.2 * dimFactor})`);

  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(x, y, coreRadius, 0, Math.PI * 2);
  ctx.fill();

  // F. Luminous celestial rim/corona highlight (soft, never hard button stroke)
  if (isSelected || isHovered) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, currentRadius * 1.08, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${glowRgb}, ${isSelected ? 0.65 : 0.35})`;
    ctx.lineWidth = isSelected ? 1.8 : 1.0;
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * 2. ARTIST STAR MATERIAL (Secondary Tier)
 * Smaller colored star with distinct stellar core and subtle aura.
 */
export function renderArtistStar(
  ctx: CanvasRenderingContext2D,
  params: {
    x: number;
    y: number;
    radius: number;
    celestialColor: CelestialColorIdentity;
    isSelected: boolean;
    isHovered: boolean;
    isDimmed: boolean;
    time: number;
    isDark?: boolean;
    isCurrentlyPlaying?: boolean;
  }
) {
  const { x, y, radius, celestialColor, isSelected, isHovered, isDimmed, time, isDark = true, isCurrentlyPlaying = false } = params;
  const { glowRgb, coreRgb } = celestialColor;

  const dimFactor = isDimmed ? 0.22 : 1.0;
  const playPulse = isCurrentlyPlaying ? Math.sin(time * 6.0) * 2.5 : 0;
  const starRadius = radius + (isSelected ? 3.5 : isHovered ? 1.5 : 0) + (isCurrentlyPlaying ? 2.0 : 0);

  // Subtle star twinkle or currently-playing rhythm pulse
  const twinkle = Math.sin(time * 2.4 + radius * 5) * 0.4;
  const activeRadius = Math.max(4, starRadius + twinkle * 0.3 + playPulse * 0.4);

  // A. Artist Star Small Glow Halo
  const haloRad = activeRadius * 2.4;
  const haloGrad = ctx.createRadialGradient(
    x, y, activeRadius * 0.3,
    x, y, haloRad
  );
  haloGrad.addColorStop(0, `rgba(${glowRgb}, ${0.35 * dimFactor * (isSelected ? 1.4 : 1)})`);
  haloGrad.addColorStop(0.55, `rgba(${glowRgb}, ${0.1 * dimFactor})`);
  haloGrad.addColorStop(1, 'transparent');

  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(x, y, haloRad, 0, Math.PI * 2);
  ctx.fill();

  // B. Colored Star Disk
  const diskGrad = ctx.createRadialGradient(
    x, y, activeRadius * 0.1,
    x, y, activeRadius
  );
  if (isDark) {
    diskGrad.addColorStop(0, `rgba(${coreRgb}, ${0.95 * dimFactor})`);
    diskGrad.addColorStop(0.55, `rgba(${glowRgb}, ${0.85 * dimFactor})`);
    diskGrad.addColorStop(1, `rgba(${glowRgb}, ${0.3 * dimFactor})`);
  } else {
    diskGrad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * dimFactor})`);
    diskGrad.addColorStop(0.5, `rgba(${glowRgb}, ${0.75 * dimFactor})`);
    diskGrad.addColorStop(1, `rgba(${glowRgb}, ${0.2 * dimFactor})`);
  }

  ctx.fillStyle = diskGrad;
  ctx.beginPath();
  ctx.arc(x, y, activeRadius, 0, Math.PI * 2);
  ctx.fill();

  // C. Pinpoint Stellar Center
  const centerRad = Math.max(1.2, activeRadius * 0.35);
  ctx.beginPath();
  ctx.arc(x, y, centerRad, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? `rgba(255, 255, 255, ${0.95 * dimFactor})` : `rgba(${coreRgb}, ${0.95 * dimFactor})`;
  ctx.fill();

  // D. Selected Ring Accent
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(x, y, activeRadius + 3.5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${glowRgb}, 0.75)`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
}

/**
 * 3. TRACK STAR MATERIAL (Tertiary Tier)
 * Tiny point of light / micro stellar body.
 * Almost no heavy glow; pure, precise celestial dot.
 */
export function renderTrackStar(
  ctx: CanvasRenderingContext2D,
  params: {
    x: number;
    y: number;
    celestialColor: CelestialColorIdentity;
    isSelected: boolean;
    isHovered: boolean;
    isDimmed: boolean;
    isDark?: boolean;
    isCurrentlyPlaying?: boolean;
  }
) {
  const { x, y, celestialColor, isSelected, isHovered, isDimmed, isDark = true, isCurrentlyPlaying = false } = params;
  const { glowRgb, coreRgb } = celestialColor;

  const dimFactor = isDimmed ? 0.22 : 1.0;
  const radius = isSelected ? 4.8 : isCurrentlyPlaying ? 4.2 : isHovered ? 3.6 : 2.6;

  // Selected, hovered, or currently playing gets an active aura
  if (isSelected || isHovered || isCurrentlyPlaying) {
    const auraRad = radius * (isCurrentlyPlaying ? 3.2 : 2.6);
    const grad = ctx.createRadialGradient(x, y, radius * 0.4, x, y, auraRad);
    grad.addColorStop(0, `rgba(${glowRgb}, ${0.5 * dimFactor})`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, auraRad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Precise star dot
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  if (isSelected) {
    ctx.fillStyle = isDark ? '#FFFFFF' : '#111215';
  } else {
    ctx.fillStyle = isDark
      ? (isDimmed ? 'rgba(70, 75, 85, 0.4)' : `rgba(${coreRgb}, 0.88)`)
      : (isDimmed ? 'rgba(180, 185, 195, 0.5)' : `rgba(${glowRgb}, 0.85)`);
  }
  ctx.fill();

  if (isSelected) {
    ctx.beginPath();
    ctx.arc(x, y, radius + 2.5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${glowRgb}, 0.85)`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

/**
 * 4. DISCOVERY BEACON (Unexplored Worlds)
 * Distinct distant star with subtle pulsing celestial halo.
 */
export function renderDiscoveryStar(
  ctx: CanvasRenderingContext2D,
  params: {
    x: number;
    y: number;
    radius: number;
    celestialColor: CelestialColorIdentity;
    isSelected: boolean;
    isHovered: boolean;
    isDimmed: boolean;
    time: number;
    isDark?: boolean;
  }
) {
  const { x, y, radius, celestialColor, isSelected, isHovered, isDimmed, time, isDark = true } = params;
  const { glowRgb, coreRgb } = celestialColor;

  const dimFactor = isDimmed ? 0.22 : 1.0;
  const pulse = Math.sin(time * 2.2 + radius * 3) * 2.5;
  const activeRad = radius + (isSelected ? 4 : isHovered ? 2 : 0) + pulse * 0.3;

  // Pulsing Exploratory Halo
  const haloRad = activeRad * 2.6;
  const haloGrad = ctx.createRadialGradient(x, y, activeRad * 0.3, x, y, haloRad);
  haloGrad.addColorStop(0, `rgba(${glowRgb}, ${0.32 * dimFactor * (isSelected ? 1.4 : 1)})`);
  haloGrad.addColorStop(0.65, `rgba(${glowRgb}, ${0.08 * dimFactor})`);
  haloGrad.addColorStop(1, 'transparent');

  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(x, y, haloRad, 0, Math.PI * 2);
  ctx.fill();

  // Dotted Trajectory Orbit Ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, activeRad + 3.5, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${glowRgb}, ${0.5 * dimFactor})`;
  ctx.lineWidth = isSelected ? 1.5 : 0.9;
  ctx.setLineDash([2, 3]);
  ctx.stroke();
  ctx.restore();

  // Mysterious Celestial Core
  const coreGrad = ctx.createRadialGradient(x, y, activeRad * 0.2, x, y, activeRad);
  if (isDark) {
    coreGrad.addColorStop(0, isSelected ? '#FFFFFF' : `rgba(${coreRgb}, ${0.9 * dimFactor})`);
    coreGrad.addColorStop(0.7, `rgba(${glowRgb}, ${0.5 * dimFactor})`);
    coreGrad.addColorStop(1, `rgba(18, 20, 26, ${0.85 * dimFactor})`);
  } else {
    coreGrad.addColorStop(0, isSelected ? '#000000' : `rgba(255, 255, 255, ${0.9 * dimFactor})`);
    coreGrad.addColorStop(0.7, `rgba(${glowRgb}, ${0.45 * dimFactor})`);
    coreGrad.addColorStop(1, 'transparent');
  }

  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(x, y, activeRad, 0, Math.PI * 2);
  ctx.fill();

  // Subtle beacon glyph
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${isSelected ? '12px' : '10px'} -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillStyle = isSelected ? (isDark ? '#000000' : '#FFFFFF') : `rgba(${coreRgb}, 0.9)`;
  ctx.fillText('?', x, y + 0.5);
  ctx.restore();
}

/**
 * 5. ORBITAL GRAVITATIONAL PATHS
 * Extremely thin, low opacity, tinted paths that feel like celestial gravitational orbits.
 */
export function renderOrbitalRing(
  ctx: CanvasRenderingContext2D,
  params: {
    cx: number;
    cy: number;
    radius: number;
    celestialColor: CelestialColorIdentity;
    dimFactor?: number;
    opacity?: number;
    isDashed?: boolean;
  }
) {
  const { cx, cy, radius, celestialColor, dimFactor = 1.0, opacity = 0.05, isDashed = false } = params;
  const { glowRgb } = celestialColor;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${glowRgb}, ${opacity * dimFactor})`;
  ctx.lineWidth = 0.85;
  if (isDashed) {
    ctx.setLineDash([2, 5]);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * 6. FUNCTIONAL ASTEROID MATERIAL (Music Discovery & Density Objects)
 * Stylized celestial objects:
 * - Irregular faceted silhouette (not giant realistic 3D rock)
 * - Dark celestial body
 * - Subtle emissive edge tinted to parent system
 * - Faint atmospheric glow
 * - Brightens on hover / selection
 */
export function renderAsteroid(
  ctx: CanvasRenderingContext2D,
  params: {
    x: number;
    y: number;
    radius: number;
    vertices: Array<{ x: number; y: number }>;
    celestialColor: CelestialColorIdentity;
    isSelected: boolean;
    isHovered: boolean;
    isDimmed: boolean;
    time: number;
    isDark?: boolean;
  }
) {
  const { x, y, radius, vertices, celestialColor, isSelected, isHovered, isDimmed, isDark = true } = params;
  const { glowRgb, coreRgb } = celestialColor;

  const dimFactor = isDimmed ? 0.22 : 1.0;
  const highlight = isSelected ? 1.6 : isHovered ? 1.3 : 1.0;
  const renderR = radius * (isSelected ? 1.35 : isHovered ? 1.18 : 1.0);

  // A. Subtle celestial aura around asteroid
  if (isSelected || isHovered || renderR > 5) {
    const auraR = renderR * 2.2;
    const aura = ctx.createRadialGradient(x, y, renderR * 0.4, x, y, auraR);
    aura.addColorStop(0, `rgba(${glowRgb}, ${(isSelected ? 0.35 : isHovered ? 0.25 : 0.08) * dimFactor})`);
    aura.addColorStop(1, 'transparent');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(x, y, auraR, 0, Math.PI * 2);
    ctx.fill();
  }

  // B. Irregular faceted polygon body
  ctx.save();
  ctx.beginPath();
  if (vertices && vertices.length > 2) {
    const scale = renderR / radius;
    ctx.moveTo(x + vertices[0].x * scale, y + vertices[0].y * scale);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(x + vertices[i].x * scale, y + vertices[i].y * scale);
    }
    ctx.closePath();
  } else {
    ctx.arc(x, y, renderR, 0, Math.PI * 2);
  }

  // Dark body with celestial tint
  if (isDark) {
    ctx.fillStyle = isSelected
      ? `rgba(${coreRgb}, 0.95)`
      : isHovered
      ? `rgba(${glowRgb}, 0.55)`
      : `rgba(22, 25, 33, ${0.9 * dimFactor})`;
  } else {
    ctx.fillStyle = isSelected
      ? '#111215'
      : isHovered
      ? `rgba(${glowRgb}, 0.8)`
      : `rgba(215, 220, 230, ${0.9 * dimFactor})`;
  }
  ctx.fill();

  // Subtle emissive edge (tinted to system)
  ctx.strokeStyle = isSelected
    ? '#FFFFFF'
    : `rgba(${glowRgb}, ${(isHovered ? 0.85 : 0.38) * dimFactor * highlight})`;
  ctx.lineWidth = isSelected ? 1.4 : isHovered ? 1.1 : 0.8;
  ctx.stroke();
  ctx.restore();
}

/**
 * 7. DYNAMIC METEOR MATERIAL (Active Music Events)
 * Visually distinct from stars:
 * - Small bright luminous head
 * - Directional, short fading particle trail
 * - Represents active data motion (recommendations, recent listens, cross-genre transitions)
 */
export function renderMeteor(
  ctx: CanvasRenderingContext2D,
  params: {
    x: number;
    y: number;
    history: Array<{ x: number; y: number; alpha: number }>;
    celestialColor: CelestialColorIdentity;
    isSelected: boolean;
    isHovered: boolean;
    isDimmed: boolean;
    isDark?: boolean;
  }
) {
  const { x, y, history, celestialColor, isSelected, isHovered, isDimmed, isDark = true } = params;
  const { glowRgb, coreRgb } = celestialColor;

  const dimFactor = isDimmed ? 0.22 : 1.0;
  const highlight = isSelected ? 1.5 : isHovered ? 1.25 : 1.0;

  // A. Directional Fading Trail
  if (history && history.length > 1) {
    for (let i = 0; i < history.length - 1; i++) {
      const p1 = history[i];
      const p2 = history[i + 1];
      const trailAlpha = ((i + 1) / history.length) * 0.45 * dimFactor * highlight;
      const trailWidth = 0.6 + ((i + 1) / history.length) * 1.5;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = `rgba(${glowRgb}, ${trailAlpha})`;
      ctx.lineWidth = trailWidth;
      ctx.stroke();
    }
  }

  // B. Small Bright Luminous Head
  const headR = isSelected ? 4.5 : isHovered ? 3.5 : 2.6;

  // Luminous aura
  const auraR = headR * 2.8;
  const aura = ctx.createRadialGradient(x, y, headR * 0.2, x, y, auraR);
  aura.addColorStop(0, `rgba(${glowRgb}, ${0.5 * dimFactor * highlight})`);
  aura.addColorStop(1, 'transparent');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(x, y, auraR, 0, Math.PI * 2);
  ctx.fill();

  // Core point
  ctx.beginPath();
  ctx.arc(x, y, headR, 0, Math.PI * 2);
  ctx.fillStyle = isDark
    ? `rgba(${coreRgb}, ${0.98 * dimFactor})`
    : `rgba(255, 255, 255, ${0.98 * dimFactor})`;
  ctx.fill();

  // Emissive rim
  ctx.beginPath();
  ctx.arc(x, y, headR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${glowRgb}, 0.85)`;
  ctx.lineWidth = 0.9;
  ctx.stroke();
}
