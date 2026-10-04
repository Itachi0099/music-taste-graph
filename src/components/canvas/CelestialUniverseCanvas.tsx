import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { 
  CelestialUniverseData,
  DiscoveryCategory,
  UniverseSelection,
} from '../../types';
import { ZoomIn, ZoomOut, RotateCcw, Compass, ExternalLink, Sparkles, Zap, Plus, Check } from 'lucide-react';
import { getCelestialGenreColor } from '../../utils/celestialColors';
import {
  createDeepSpaceStarField,
  renderDeepSpaceStarField,
  renderCelestialCore,
  renderArtistStar,
  renderTrackStar,
  renderDiscoveryStar,
  renderOrbitalRing,
  type StarFieldParticle,
  renderAsteroid,
  renderMeteor,
} from '../../utils/celestialMaterials';
import { screenToWorld, calculateHyperspaceEase, hitTestUniverse } from './celestialMath';
import { computeSearchMatches } from './celestialSearch';
import { getSectorCameraTarget, isSectorId, getSector } from '../../utils/sectors';

export type { UniverseSelection };

interface CelestialUniverseCanvasProps {
  universeData: CelestialUniverseData;
  selection: UniverseSelection;
  onSelect: (selection: UniverseSelection) => void;
  onAddDiscoveryTrack?: (track: { track: string; artist: string; genre: string; bpm?: number }) => void;
  searchQuery?: string;
  viewFilter?: 'all' | 'genres' | 'artists' | 'tracks';
  discoveryFilter?: DiscoveryCategory | 'all';
  onDiscoveryFilterChange?: (filter: DiscoveryCategory | 'all') => void;
  isDark?: boolean;
  activeSector?: string;
  onSectorChange?: (sectorId: string) => void;
}

const FONT_SANS = '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const FONT_MONO = '"JetBrains Mono", monospace';

export const CelestialUniverseCanvas: React.FC<CelestialUniverseCanvasProps> = ({
  universeData,
  selection,
  onSelect,
  onAddDiscoveryTrack,
  searchQuery = '',
  viewFilter = 'all',
  discoveryFilter = 'all',
  onDiscoveryFilterChange,
  isDark = true,
  activeSector = 'all',
  onSectorChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Camera state in celestial world coordinates
  const cameraRef = useRef<{
    x: number;
    y: number;
    zoom: number;
    targetX: number;
    targetY: number;
    targetZoom: number;
  }>({
    x: 0,
    y: 0,
    zoom: 0.52,
    targetX: 0,
    targetY: 0,
    targetZoom: 0.52,
  });

  // Drag / pan state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // Hover state
  const [hoveredEntity, setHoveredEntity] = useState<UniverseSelection>(null);
  const hoveredRef = useRef<UniverseSelection>(null);

  useEffect(() => {
    hoveredRef.current = hoveredEntity;
  }, [hoveredEntity]);

  // Real-time animation frame timestamp
  const animTimeRef = useRef(0);
  const reqAnimRef = useRef<number | null>(null);

  // Current progressive disclosure zoom level
  const [currentZoomLevel, setCurrentZoomLevel] = useState<1 | 2 | 3 | 4>(1);
  const currentZoomLevelRef = useRef<1 | 2 | 3 | 4>(1);

  // Added tracks state for immediate visual feedback
  const [addedTrackTitles, setAddedTrackTitles] = useState<Set<string>>(new Set());

  // ============================================================
  // HYPERSPACE TRAVEL ENGINE STATE
  // ============================================================
  const hyperspaceRef = useRef<{
    active: boolean;
    progress: number; // 0.0 -> 1.0
    duration: number; // in ms (~1400ms for fast, cinematic travel)
    startTime: number;
    startX: number;
    startY: number;
    startZoom: number;
    destX: number;
    destY: number;
    destZoom: number;
    stars: StarFieldParticle[];
    destName: string;
  }>({
    active: false,
    progress: 0,
    duration: 1400,
    startTime: 0,
    startX: 0,
    startY: 0,
    startZoom: 0.65,
    destX: 0,
    destY: 0,
    destZoom: 1.2,
    stars: [],
    destName: '',
  });

  const [hyperspaceDisplay, setHyperspaceDisplay] = useState<{ active: boolean; destName: string }>({
    active: false,
    destName: '',
  });

  // Initialize astronomical deep space star field (pure, varied micro-stars)
  useEffect(() => {
    hyperspaceRef.current.stars = createDeepSpaceStarField(700, 3600);
  }, []);

  /**
   * Triggers an elegant, fast hyperspace travel sequence (1.4 seconds)
   */
  const triggerHyperspaceTravel = useCallback((targetX: number, targetY: number, targetZoom: number, destName: string) => {
    const cam = cameraRef.current;
    const dist = Math.hypot(targetX - cam.x, targetY - cam.y);

    // If already very close, just lerp smoothly
    if (dist < 120 && Math.abs(targetZoom - cam.zoom) < 0.3) {
      cam.targetX = targetX;
      cam.targetY = targetY;
      cam.targetZoom = targetZoom;
      return;
    }

    hyperspaceRef.current = {
      ...hyperspaceRef.current,
      active: true,
      progress: 0,
      duration: Math.min(1600, Math.max(1100, dist * 0.8)),
      startTime: performance.now(),
      startX: cam.x,
      startY: cam.y,
      startZoom: cam.zoom,
      destX: targetX,
      destY: targetY,
      destZoom: targetZoom,
      destName,
    };

    setHyperspaceDisplay({ active: true, destName });
  }, []);

  // Pre-filter matches based on search query
  const searchMatches = useMemo(
    () => computeSearchMatches(universeData, searchQuery),
    [universeData, searchQuery]
  );

  // Handle focus transition when selection changes with Hyperspace travel
  useEffect(() => {
    if (!selection) return;
    hasMovedRef.current = false;

    if (selection.type === 'genre') {
      triggerHyperspaceTravel(selection.item.x, selection.item.y, 1.15, selection.item.name);
    } else if (selection.type === 'artist') {
      triggerHyperspaceTravel(selection.item.x, selection.item.y, 2.1, selection.item.name);
    } else if (selection.type === 'track') {
      triggerHyperspaceTravel(selection.item.x, selection.item.y, 2.8, selection.item.title);
    } else if (selection.type === 'subgenre') {
      triggerHyperspaceTravel(selection.item.x, selection.item.y, 1.45, selection.item.name);
    } else if (selection.type === 'discovery') {
      triggerHyperspaceTravel(selection.item.x, selection.item.y, 1.85, selection.item.recommendation.artist);
    } else if (selection.type === 'asteroid') {
      triggerHyperspaceTravel(selection.item.x, selection.item.y, 2.2, selection.item.name);
    } else if (selection.type === 'meteor') {
      triggerHyperspaceTravel(selection.item.currentX, selection.item.currentY, 2.0, selection.item.title);
    }
  }, [selection, triggerHyperspaceTravel]);

  // Handle sector navigation with Hyperspace travel
  const prevSectorRef = useRef<string | undefined>(activeSector);
  useEffect(() => {
    if (activeSector === undefined) return;
    if (prevSectorRef.current === activeSector) return;
    prevSectorRef.current = activeSector;

    if (!universeData.genres || universeData.genres.length === 0) return;
    const target = getSectorCameraTarget(activeSector, universeData.genres);
    triggerHyperspaceTravel(target.x, target.y, target.zoom, target.destName);
  }, [activeSector, universeData.genres, triggerHyperspaceTravel]);

  // Fit Universe on reset
  const handleResetUniverse = useCallback(() => {
    onSelect(null);
    if (onSectorChange) onSectorChange('all');
    triggerHyperspaceTravel(0, 0, 0.52, 'Full Universe');
  }, [onSelect, onSectorChange, triggerHyperspaceTravel]);

  const handleZoom = (delta: number) => {
    const next = Math.max(0.08, Math.min(3.6, cameraRef.current.targetZoom + delta));
    cameraRef.current.targetZoom = next;
  };

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = (timestamp: number) => {
      if (!running) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (width <= 0 || height <= 0) {
        reqAnimRef.current = requestAnimationFrame(render);
        return;
      }

      // Handle retina displays
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      const cam = cameraRef.current;
      const hyper = hyperspaceRef.current;
      const currentHover = hoveredRef.current;

      // ============================================================
      // HYPERSPACE TRAVEL MOTION CALCULATION
      // ============================================================
      let hyperspaceSpeedFactor = 0; // 0 (still) -> 1 (peak warp speed)
      if (hyper.active) {
        const elapsed = timestamp - hyper.startTime;
        const rawProgress = Math.min(1, elapsed / hyper.duration);
        hyper.progress = rawProgress;

        // Smooth sigmoidal acceleration & deceleration curve (ease-in-out)
        const easeT = calculateHyperspaceEase(rawProgress);

        // Peak speed occurs in the middle (t = 0.5)
        hyperspaceSpeedFactor = Math.sin(rawProgress * Math.PI);

        // Interpolate camera world coordinates along travel vector
        cam.x = hyper.startX + (hyper.destX - hyper.startX) * easeT;
        cam.y = hyper.startY + (hyper.destY - hyper.startY) * easeT;

        // Pull back camera slightly during mid-warp for cinematic depth, then settle in
        const zoomDip = Math.sin(rawProgress * Math.PI) * 0.22;
        cam.zoom = (hyper.startZoom + (hyper.destZoom - hyper.startZoom) * easeT) * (1 - zoomDip);

        cam.targetX = hyper.destX;
        cam.targetY = hyper.destY;
        cam.targetZoom = hyper.destZoom;

        if (rawProgress >= 1) {
          hyper.active = false;
          setHyperspaceDisplay({ active: false, destName: '' });
        }
      } else {
        // If an artist or track is selected and user hasn't panned away, smoothly track its planetary position
        if (!isDraggingRef.current && !hasMovedRef.current) {
          if (selection?.type === 'artist') {
            cam.targetX = selection.item.x;
            cam.targetY = selection.item.y;
          } else if (selection?.type === 'track') {
            cam.targetX = selection.item.x;
            cam.targetY = selection.item.y;
          }
        }

        // Standard smooth camera interpolation (ease-out lerp)
        cam.x += (cam.targetX - cam.x) * 0.085;
        cam.y += (cam.targetY - cam.y) * 0.085;
        cam.zoom += (cam.targetZoom - cam.zoom) * 0.085;
      }

      // Determine active progressive disclosure level based on zoom
      let activeLevel: 1 | 2 | 3 | 4 = 1;
      if (cam.zoom > 2.3) activeLevel = 4;
      else if (cam.zoom > 1.4) activeLevel = 3;
      else if (cam.zoom > 0.85) activeLevel = 2;
      else activeLevel = 1;

      if (selection?.type === 'artist' || selection?.type === 'track') {
        activeLevel = Math.max(activeLevel, 3) as 3 | 4;
      } else if (selection?.type === 'genre') {
        activeLevel = Math.max(activeLevel, 2) as 2 | 3 | 4;
      }
      // Only update React state when zoom level actually transitions to prevent 60-120fps state dispatch loops
      if (currentZoomLevelRef.current !== activeLevel) {
        currentZoomLevelRef.current = activeLevel;
        setCurrentZoomLevel(activeLevel);
      }
      // Advance time for subtle celestial drift
      animTimeRef.current += 0.012;
      const time = animTimeRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Deep Space Atmospheric Canvas (calm, dark, non-pitch black, subtle gradient)
      const bgGrad = ctx.createRadialGradient(
        width / 2, height / 2, 80,
        width / 2, height / 2, Math.max(width, height)
      );
      if (isDark) {
        bgGrad.addColorStop(0, '#0E1015'); // Calm cosmic ink center
        bgGrad.addColorStop(1, '#07080B'); // Deep space edge
      } else {
        bgGrad.addColorStop(0, '#FAF9F6');
        bgGrad.addColorStop(1, '#EDE9DF');
      }
      const centerX = width / 2;
      const centerY = height / 2;
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // ============================================================
      // ASTRONOMICAL STAR FIELD & HYPERSPACE LIGHT TRAILS
      // ============================================================
      renderDeepSpaceStarField(
        ctx,
        hyper.stars,
        time,
        hyperspaceSpeedFactor,
        width,
        height,
        isDark
      );

      // Hyperspace Motion Blur / Subtle Speed Bloom overlay
      if (hyperspaceSpeedFactor > 0.15) {
        const bloomGrad = ctx.createRadialGradient(
          centerX, centerY, 50,
          centerX, centerY, width * 0.65
        );
        bloomGrad.addColorStop(0, `rgba(200, 220, 255, ${hyperspaceSpeedFactor * 0.08})`);
        bloomGrad.addColorStop(0.7, `rgba(140, 180, 255, ${hyperspaceSpeedFactor * 0.03})`);
        bloomGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = bloomGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // Transform context to camera space
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);

      // Advance planetary orbits for Artists and their satellite Tracks
      universeData.artists.forEach((artist) => {
        const isArtistHovered = currentHover?.type === 'artist' && currentHover.item.id === artist.id;
        const isArtistSelected = selection?.type === 'artist' && selection.item.id === artist.id;
        // Motion damping on hover/select allows effortless reading and inspection without jitter
        const motionDamp = isArtistHovered ? 0.25 : isArtistSelected ? 0.35 : 1.0;

        if (artist.isBridge && artist.bridgeSaddle) {
          // Cross-genre bridge artist: orbital motion along gravitational saddle between Genre A & B
          const s = artist.bridgeSaddle;
          s.initialAngle = (s.initialAngle ?? 0) + (s.orbitSpeed || 0.0014) * motionDamp;
          artist.x = s.saddleX + s.axisX * Math.cos(s.initialAngle) * s.semiMajor + s.perpX * Math.sin(s.initialAngle) * s.semiMinor;
          artist.y = s.saddleY + s.axisY * Math.cos(s.initialAngle) * s.semiMajor + s.perpY * Math.sin(s.initialAngle) * s.semiMinor;
        } else if (artist.orbitRadius) {
          // Planetary orbit continuously revolving around parent genre system
          const parentGenre = universeData.genres.find((g) => g.name === artist.primaryGenre) || universeData.genres[0];
          const originX = parentGenre ? parentGenre.x : (artist.baseX ?? 0);
          const originY = parentGenre ? parentGenre.y : (artist.baseY ?? 0);

          const speed = artist.orbitSpeed || 0.0016;
          artist.orbitAngle = (artist.orbitAngle ?? 0) + speed * motionDamp;
          artist.x = originX + Math.cos(artist.orbitAngle) * artist.orbitRadius;
          artist.y = originY + Math.sin(artist.orbitAngle) * artist.orbitRadius;
        }

        // Update track moons relative to updated artist planetary position
        artist.tracks.forEach((track) => {
          track.orbitAngle = (track.orbitAngle ?? 0) + (track.orbitSpeed || 0.0035);
          track.x = artist.x + Math.cos(track.orbitAngle) * track.orbitRadius;
          track.y = artist.y + Math.sin(track.orbitAngle) * track.orbitRadius;
        });
      });

      // 2. Gravitational Grid & Cosmic Coordinate Rings (Ultra-subtle reference orbits)
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.018)' : 'rgba(0, 0, 0, 0.018)';
      ctx.lineWidth = 0.75;
      [350, 750, 1200, 1650, 2200].forEach((r) => {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 3. Gravitational Paths between related genres & bridge artists
      universeData.bridges.forEach((bridge) => {
        const gA = universeData.genres.find((g) => g.name === bridge.genreA);
        const gB = universeData.genres.find((g) => g.name === bridge.genreB);
        if (!gA || !gB) return;

        const isBridgeSelected = selection?.type === 'artist' && selection.item.id === bridge.artist.id;
        const isRelated = selection?.type === 'genre' && (selection.item.name === gA.name || selection.item.name === gB.name);

        ctx.beginPath();
        ctx.moveTo(gA.x, gA.y);
        ctx.quadraticCurveTo(bridge.artist.x, bridge.artist.y, gB.x, gB.y);

        const bridgeCelestialColor = bridge.artist.celestialColor || getCelestialGenreColor(bridge.artist.primaryGenre);

        if (isBridgeSelected || isRelated) {
          ctx.strokeStyle = `rgba(${bridgeCelestialColor.glowRgb}, 0.65)`;
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
        } else {
          ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
          ctx.lineWidth = 0.75;
          ctx.setLineDash([2, 5]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // 4. Render Genre Systems (Luminous Celestial Cores & Orbiting Subgenres)
      universeData.genres.forEach((genre) => {
        const isGenreSelected = selection?.type === 'genre' && selection.item.id === genre.id;
        const isGenreHovered = currentHover?.type === 'genre' && currentHover.item.id === genre.id;
        const isAnySelected = selection !== null;
        const isDimmed = isAnySelected && !isGenreSelected && 
          !(selection?.type === 'artist' && (selection.item.primaryGenre === genre.name || selection.item.bridgeGenre === genre.name)) &&
          !(selection?.type === 'track' && selection.item.genre === genre.name) &&
          !(selection?.type === 'discovery' && selection.item.anchorGenre === genre.name);

        const searchMatch = searchMatches ? searchMatches.genres.has(genre.id) : true;
        const finalDim = isDimmed || (!searchMatch && searchMatches !== null);

        const celestialColor = genre.celestialColor || getCelestialGenreColor(genre.name);

        // Render Celestial Core Material
        renderCelestialCore(ctx, {
          x: genre.x,
          y: genre.y,
          radius: genre.radius,
          celestialColor,
          isSelected: isGenreSelected,
          isHovered: isGenreHovered,
          isDimmed: finalDim,
          time,
          zoom: cam.zoom,
          isDark,
        });

        // Genre System Label & Count (Clean, neutral typography; color comes from star)
        const labelRadius = genre.radius + (isGenreSelected ? 6 : 0);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = `600 ${Math.max(12, Math.min(20, 13 + genre.radius * 0.14))}px ${FONT_SANS}`;
        ctx.fillStyle = finalDim
          ? (isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)')
          : isGenreSelected
          ? '#FFFFFF'
          : (isDark ? '#E5E7EB' : '#111215');
        ctx.fillText(genre.name.toUpperCase(), genre.x, genre.y + labelRadius + 18);

        ctx.font = `10px ${FONT_MONO}`;
        ctx.fillStyle = finalDim
          ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)')
          : (isDark ? 'rgba(255,255,255,0.48)' : 'rgba(0,0,0,0.48)');
        ctx.fillText(`${genre.trackCount} tracks · ${genre.artistCount} artists`, genre.x, genre.y + labelRadius + 31);
        ctx.restore();

        // Level 2+: Subgenres as naturally orbiting planetoids
        if (activeLevel >= 2 || isGenreSelected || viewFilter === 'genres') {
          genre.subgenres.forEach((sub) => {
            // Very thin, low opacity orbital ring
            renderOrbitalRing(ctx, {
              cx: genre.x,
              cy: genre.y,
              radius: sub.distance,
              celestialColor,
              dimFactor: finalDim ? 0.3 : 1.0,
              opacity: isDark ? 0.05 : 0.04,
            });

            const currentSubAngle = sub.angle + time * 0.015;
            const px = genre.x + Math.cos(currentSubAngle) * sub.distance;
            const py = genre.y + Math.sin(currentSubAngle) * sub.distance;
            sub.x = px;
            sub.y = py;

            const isSubSelected = selection?.type === 'subgenre' && selection.item.id === sub.id;
            const isSubHovered = currentHover?.type === 'subgenre' && currentHover.item.id === sub.id;
            const subRadius = sub.tier === 'planet' ? 5.5 : 3.5;

            // Small celestial body for subgenre
            ctx.beginPath();
            ctx.arc(px, py, subRadius, 0, Math.PI * 2);
            ctx.fillStyle = isSubSelected
              ? '#FFFFFF'
              : finalDim
              ? (isDark ? 'rgba(60, 65, 75, 0.4)' : 'rgba(180, 185, 195, 0.4)')
              : `rgba(${celestialColor.glowRgb}, 0.85)`;
            ctx.fill();

            if (isSubSelected || isSubHovered) {
              ctx.beginPath();
              ctx.arc(px, py, subRadius + 2.5, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(${celestialColor.glowRgb}, 0.75)`;
              ctx.lineWidth = 1;
              ctx.stroke();
            }

            if (cam.zoom >= 0.85 || isGenreSelected || isSubSelected) {
              ctx.save();
              ctx.font = `${sub.tier === 'planet' ? '500' : '400'} 10px ${FONT_SANS}`;
              ctx.fillStyle = finalDim
                ? (isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)')
                : (isDark ? 'rgba(255, 255, 255, 0.75)' : 'rgba(20, 20, 20, 0.75)');
              ctx.fillText(sub.name, px + subRadius + 6, py + 3);
              ctx.restore();
            }
          });
        }
      });

      // 5. Render Artists (Smaller Stars within/around Genre Systems)
      if (activeLevel >= 2 || viewFilter === 'artists' || viewFilter === 'tracks') {
        universeData.artists.forEach((artist) => {
          const isArtistSelected = selection?.type === 'artist' && selection.item.id === artist.id;
          const isArtistHovered = currentHover?.type === 'artist' && currentHover.item.id === artist.id;
          const isParentGenreSelected = selection?.type === 'genre' && selection.item.name === artist.primaryGenre;
          const isDimmed = selection !== null && !isArtistSelected && !isParentGenreSelected &&
            !(selection?.type === 'track' && selection.item.artist === artist.name);

          const searchMatch = searchMatches ? searchMatches.artists.has(artist.id) : true;
          const finalDim = isDimmed || (!searchMatch && searchMatches !== null);

          const primaryGenreObj = universeData.genres.find((g) => g.name === artist.primaryGenre);
          const celestialColor = artist.celestialColor || (primaryGenreObj?.celestialColor) || getCelestialGenreColor(artist.primaryGenre);

          // Ethereal planetary orbital ring for artist around genre system
          if (!artist.isBridge && artist.orbitRadius) {
            const genreCenter = primaryGenreObj || universeData.genres[0];
            const cx = genreCenter ? genreCenter.x : (artist.baseX ?? 0);
            const cy = genreCenter ? genreCenter.y : (artist.baseY ?? 0);
            const isRingActive = isArtistSelected || isArtistHovered || isParentGenreSelected;
            renderOrbitalRing(ctx, {
              cx,
              cy,
              radius: artist.orbitRadius,
              celestialColor,
              dimFactor: finalDim ? 0.22 : isRingActive ? 1.6 : 0.85,
              opacity: isRingActive ? (isDark ? 0.08 : 0.07) : (isDark ? 0.028 : 0.022),
              isDashed: true,
            });
          }

          // Whispering gravitational link from genre sun to artist star
          if (primaryGenreObj && !artist.bridgeGenre) {
            ctx.beginPath();
            ctx.moveTo(primaryGenreObj.x, primaryGenreObj.y);
            ctx.lineTo(artist.x, artist.y);
            ctx.strokeStyle = finalDim
              ? 'transparent'
              : (isDark ? `rgba(${celestialColor.glowRgb}, 0.045)` : `rgba(${celestialColor.glowRgb}, 0.035)`);
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }

          // Subtle harmonic link to parent subgenre when relevant
          if (artist.parentSubgenre && (isArtistSelected || isArtistHovered || (selection?.type === 'subgenre' && selection.item.name === artist.parentSubgenre))) {
            const subObj = primaryGenreObj?.subgenres.find((s) => s.name.toLowerCase() === artist.parentSubgenre!.toLowerCase());
            if (subObj) {
              ctx.beginPath();
              ctx.moveTo(subObj.x, subObj.y);
              ctx.lineTo(artist.x, artist.y);
              ctx.strokeStyle = `rgba(${celestialColor.glowRgb}, 0.25)`;
              ctx.lineWidth = 0.9;
              ctx.setLineDash([2, 4]);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }

          // Render Artist Star Material
          renderArtistStar(ctx, {
            x: artist.x,
            y: artist.y,
            radius: artist.radius,
            celestialColor,
            isSelected: isArtistSelected,
            isHovered: isArtistHovered,
            isDimmed: finalDim,
            time,
            isDark,
            isCurrentlyPlaying: artist.isCurrentlyPlaying,
          });

          // Artist Name Label
          const shouldShowLabel = cam.zoom >= 0.95 || isArtistSelected || isParentGenreSelected || (searchMatches && searchMatches.artists.has(artist.id));
          if (shouldShowLabel) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.font = `${isArtistSelected ? '600' : '500'} 11px ${FONT_SANS}`;
            ctx.fillStyle = finalDim
              ? (isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.18)')
              : isArtistSelected
              ? '#FFFFFF'
              : (isDark ? '#E2E4E9' : '#1A1C20');
            ctx.fillText(artist.name, artist.x, artist.y + artist.radius + 14);

            if (isArtistSelected || cam.zoom >= 1.6) {
              ctx.font = `9px ${FONT_MONO}`;
              ctx.fillStyle = finalDim
                ? 'transparent'
                : (isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.42)');
              ctx.fillText(`${artist.trackCount} ${artist.trackCount === 1 ? 'track' : 'tracks'}`, artist.x, artist.y + artist.radius + 25);
            }
            ctx.restore();
          }

          // 6. Level 3 & 4: Orbiting Track Stars around Artists
          const shouldShowTracks = activeLevel >= 3 || isArtistSelected || viewFilter === 'tracks';
          if (shouldShowTracks) {
            artist.tracks.forEach((track) => {
              // Very thin orbital path
              renderOrbitalRing(ctx, {
                cx: artist.x,
                cy: artist.y,
                radius: track.orbitRadius,
                celestialColor,
                dimFactor: finalDim ? 0.3 : 1.0,
                opacity: isDark ? 0.04 : 0.03,
              });

              const isTrackSelected = selection?.type === 'track' && selection.item.id === track.id;
              const isTrackHovered = currentHover?.type === 'track' && currentHover.item.id === track.id;
              const isTrackDimmed = selection !== null && !isTrackSelected && !(selection?.type === 'artist' && selection.item.id === artist.id);
              const trackSearchMatch = searchMatches ? searchMatches.tracks.has(track.id) : true;
              const finalTrackDim = isTrackDimmed || (!trackSearchMatch && searchMatches !== null);

              // Render Track Star Material
              renderTrackStar(ctx, {
                x: track.x,
                y: track.y,
                celestialColor,
                isSelected: isTrackSelected,
                isHovered: isTrackHovered,
                isDimmed: finalTrackDim,
                isDark,
                isCurrentlyPlaying: track.isCurrentlyPlaying,
                isRecentlyPlayed: track.isRecentlyPlayed,
              });

              if (cam.zoom >= 1.7 || isTrackSelected || isArtistSelected) {
                ctx.save();
                ctx.font = `${isTrackSelected ? '600' : '400'} 9.5px ${FONT_SANS}`;
                ctx.fillStyle = isTrackSelected
                  ? (isDark ? '#FFFFFF' : '#111215')
                  : finalTrackDim
                  ? (isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0,0,0,0.16)')
                  : (isDark ? 'rgba(255, 255, 255, 0.74)' : 'rgba(30,30,30,0.82)');
                ctx.fillText(track.title, track.x + 7, track.y + 3);
                ctx.restore();
              }
            });
          }
        });
      }

      // ============================================================
      // 7. RENDER DISCOVERY SYSTEMS (UNEXPLORED CELESTIAL WORLDS)
      // ============================================================
      if (universeData.discoveries && universeData.discoveries.length > 0) {
        universeData.discoveries.forEach((disc) => {
          if (discoveryFilter !== 'all' && disc.recommendation.category !== discoveryFilter) {
            return;
          }

          const isDiscSelected = selection?.type === 'discovery' && selection.item.id === disc.id;
          const isDiscHovered = currentHover?.type === 'discovery' && currentHover.item.id === disc.id;
          const isDimmed = selection !== null && !isDiscSelected;
          const searchMatch = searchMatches ? searchMatches.discoveries.has(disc.id) : true;
          const finalDim = isDimmed || (!searchMatch && searchMatches !== null);

          const discCelestialColor = disc.celestialColor || getCelestialGenreColor(disc.recommendation.genre);

          // Subtle orbital guideline from anchor genre sun
          const anchorGenreObj = universeData.genres.find((g) => g.name === disc.anchorGenre);
          if (anchorGenreObj) {
            ctx.beginPath();
            ctx.moveTo(anchorGenreObj.x, anchorGenreObj.y);
            ctx.lineTo(disc.x, disc.y);
            ctx.strokeStyle = isDiscSelected 
              ? `rgba(${discCelestialColor.glowRgb}, 0.5)`
              : finalDim
              ? 'transparent'
              : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)');
            ctx.lineWidth = isDiscSelected ? 1.2 : 0.75;
            ctx.setLineDash([3, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Render Discovery Star Material
          renderDiscoveryStar(ctx, {
            x: disc.x,
            y: disc.y,
            radius: disc.radius,
            celestialColor: discCelestialColor,
            isSelected: isDiscSelected,
            isHovered: isDiscHovered,
            isDimmed: finalDim,
            time,
            isDark,
          });

          // Discovery System Labels (Taste Match % & Artist Name)
          ctx.save();
          ctx.textAlign = 'center';
          ctx.font = `600 11px ${FONT_SANS}`;
          ctx.fillStyle = finalDim 
            ? (isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)')
            : (isDark ? '#EDEDED' : '#1A1C20');
          ctx.fillText(disc.recommendation.artist, disc.x, disc.y + disc.radius + 15);

          // Taste Match Pill Text
          ctx.font = `9px ${FONT_MONO}`;
          ctx.fillStyle = finalDim
            ? 'transparent'
            : disc.color;
          const matchPercent = Math.round(disc.recommendation.score * 100);
          ctx.fillText(`${matchPercent}% Match · ${disc.recommendation.category.toUpperCase()}`, disc.x, disc.y + disc.radius + 27);
          ctx.restore();
        });
      }

      // ============================================================
      // 8. RENDER FUNCTIONAL ASTEROIDS (MUSIC DISCOVERY & DENSITY BELTS)
      // ============================================================
      if (universeData.asteroids && universeData.asteroids.length > 0) {
        universeData.asteroids.forEach((ast) => {
          const isAstSelected = selection?.type === 'asteroid' && selection.item.id === ast.id;
          const isAstHovered = currentHover?.type === 'asteroid' && currentHover.item.id === ast.id;
          const isParentGenreSelected = selection?.type === 'genre' && selection.item.name === ast.parentGenre;
          const isDimmed = selection !== null && !isAstSelected && !isParentGenreSelected;

          const searchMatch = searchMatches ? (
            searchMatches.genres.has(`genre-${ast.parentGenre}`) ||
            (ast.artist && Array.from(searchMatches.artists).some((aId) => aId.includes(ast.artist!)))
          ) : true;
          const finalDim = isDimmed || (!searchMatch && searchMatches !== null);

          // Continuous orbital revolution for belt asteroids: gently ease on hover or selection without jumping
          const motionMultiplier = isAstHovered ? 0.25 : isAstSelected ? 0.25 : 1.0;
          ast.orbitAngle = (ast.orbitAngle ?? 0) + (ast.orbitSpeed || 0.0016) * motionMultiplier;

          const parentG = universeData.genres.find((g) => g.name === ast.parentGenre);
          const originX = parentG ? parentG.x : (ast.baseX ?? 0);
          const originY = parentG ? parentG.y : (ast.baseY ?? 0);

          ast.x = originX + Math.cos(ast.orbitAngle) * ast.orbitRadius;
          ast.y = originY + Math.sin(ast.orbitAngle) * ast.orbitRadius;

          const astCelestialCol = ast.celestialColor || getCelestialGenreColor(ast.parentGenre);

          renderAsteroid(ctx, {
            x: ast.x,
            y: ast.y,
            radius: ast.radius,
            vertices: ast.vertices,
            celestialColor: astCelestialCol,
            isSelected: isAstSelected,
            isHovered: isAstHovered,
            isDimmed: finalDim,
            time,
            isDark,
          });

          // Show asteroid label on hover or when selected
          if (isAstSelected || isAstHovered || (cam.zoom > 1.8 && !finalDim && ast.type === 'obscure_artist')) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.font = `${isAstSelected ? '600' : '500'} 9.5px ${FONT_SANS}`;
            ctx.fillStyle = isAstSelected
              ? '#FFFFFF'
              : (isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(20, 20, 20, 0.85)');
            ctx.fillText(ast.name, ast.x, ast.y + ast.radius + 11);
            ctx.restore();
          }
        });
      }

      // ============================================================
      // 9. RENDER DYNAMIC METEORS (ACTIVE MUSIC EVENTS MOVING IN UNIVERSE)
      // ============================================================
      if (universeData.meteors && universeData.meteors.length > 0) {
        universeData.meteors.forEach((meteor) => {
          const isMeteorSelected = selection?.type === 'meteor' && selection.item.id === meteor.id;
          const isMeteorHovered = currentHover?.type === 'meteor' && currentHover.item.id === meteor.id;

          // Continuous meteor progress along trajectory, easing gently on hover or selection without getting stuck
          const meteorDamp = isMeteorHovered ? 0.25 : isMeteorSelected ? 0.35 : 1.0;
          meteor.progress += (meteor.speed || 0.0035) * meteorDamp;
          if (meteor.progress >= 1.0) {
            meteor.progress = 0.0;
            meteor.history = [];
          }

          // Quadratic trajectory easing for organic gravitation
          const t = meteor.progress;
          // Smooth curve with slight gravitational deflection
          const midX = (meteor.startX + meteor.targetX) / 2 + (meteor.eventType === 'cross_genre_link' ? 40 : 0);
          const midY = (meteor.startY + meteor.targetY) / 2 - 30;

          const invT = 1 - t;
          meteor.currentX = invT * invT * meteor.startX + 2 * invT * t * midX + t * t * meteor.targetX;
          meteor.currentY = invT * invT * meteor.startY + 2 * invT * t * midY + t * t * meteor.targetY;

          // Push position to history for directional fading trail
          meteor.history.push({ x: meteor.currentX, y: meteor.currentY, alpha: 1.0 });
          if (meteor.history.length > meteor.trailLength) {
            meteor.history.shift();
          }

          const meteorCelestialCol = meteor.celestialColor || getCelestialGenreColor(meteor.genre);

          renderMeteor(ctx, {
            x: meteor.currentX,
            y: meteor.currentY,
            history: meteor.history,
            celestialColor: meteorCelestialCol,
            isSelected: isMeteorSelected,
            isHovered: isMeteorHovered,
            isDimmed: false,
            isDark,
          });

          // Show meteor tag on hover or selection
          if (isMeteorHovered || isMeteorSelected) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.font = `600 9.5px ${FONT_SANS}`;
            ctx.fillStyle = isDark ? '#FFFFFF' : '#111215';
            ctx.fillText(meteor.title, meteor.currentX, meteor.currentY - 10);
            ctx.font = `8.5px ${FONT_MONO}`;
            ctx.fillStyle = `rgba(${meteorCelestialCol.glowRgb}, 0.95)`;
            ctx.fillText(
              meteor.eventType === 'new_discovery' ? 'NEW DISCOVERY' :
              meteor.eventType === 'recently_played' ? 'RECENTLY PLAYED' : 'CROSS-GENRE BRIDGE',
              meteor.currentX,
              meteor.currentY - 21
            );
            ctx.restore();
          }
        });
      }

      ctx.restore(); // Exit camera space
      ctx.restore(); // Exit dpr scale / base space

      reqAnimRef.current = requestAnimationFrame(render);
    };

    reqAnimRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current);
    };
  }, [universeData, selection, searchMatches, viewFilter, discoveryFilter, isDark]);

  // Click & Hit-Testing
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedRef.current = true;
      }
      cameraRef.current.targetX -= dx / cameraRef.current.zoom;
      cameraRef.current.targetY -= dy / cameraRef.current.zoom;
      cameraRef.current.x -= dx / cameraRef.current.zoom;
      cameraRef.current.y -= dy / cameraRef.current.zoom;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    } else {
      // Hover hit-test
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldPos = screenToWorld(mouseX, mouseY, width, height, cameraRef.current);

      const hit = hitTestUniverse(
        worldPos,
        universeData,
        currentZoomLevel,
        selection,
        discoveryFilter,
        0
      );

      setHoveredEntity(hit);
      canvas.style.cursor = hit ? 'pointer' : 'grab';
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    if (hasMovedRef.current) return;

    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldPos = screenToWorld(mouseX, mouseY, canvas.clientWidth, canvas.clientHeight, cameraRef.current);

    const hit = hitTestUniverse(
      worldPos,
      universeData,
      currentZoomLevel,
      selection,
      discoveryFilter,
      2
    );

    onSelect(hit);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const centerX = canvas.clientWidth / 2;
    const centerY = canvas.clientHeight / 2;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const cam = cameraRef.current;
    const oldZoom = cam.targetZoom;
    const newZoom = Math.max(0.08, Math.min(3.6, oldZoom * zoomFactor));

    if (newZoom !== oldZoom) {
      // Keep the world coordinate under the pointer invariant during zoom
      const wx = cam.targetX + (mouseX - centerX) / oldZoom;
      const wy = cam.targetY + (mouseY - centerY) / oldZoom;
      cam.targetX = wx - (mouseX - centerX) / newZoom;
      cam.targetY = wy - (mouseY - centerY) / newZoom;
      cam.targetZoom = newZoom;
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative select-none overflow-hidden bg-[#0A0B0E]">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      />

      {/* Empty Filter / Loading State Overlay */}
      {universeData.genres.length === 0 && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-center p-6 select-none pointer-events-auto">
          <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center mb-3">
            <Compass size={22} className="text-white/60 animate-spin-slow" />
          </div>
          <h3 className="font-serif text-lg text-white font-medium mb-1">No Celestial Objects in Orbit</h3>
          <p className="text-xs text-white/50 max-w-sm mb-4">
            No tracks match your current genre, tempo, or search filters.
          </p>
          <button
            onClick={handleResetUniverse}
            className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-xs text-white transition-all font-mono"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Hyperspace Status HUD Banner */}
      {hyperspaceDisplay.active && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/75 backdrop-blur-xl border border-sky-400/30 text-xs font-mono text-sky-200 shadow-2xl animate-pulse">
          <Zap size={14} className="text-sky-400 animate-spin-slow" />
          <span>HYPERSPACE JUMP: <strong>{hyperspaceDisplay.destName}</strong></span>
        </div>
      )}

      {/* Floating Exploration Breadcrumb HUD */}
      <div className="absolute top-4 left-5 z-20 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs font-mono text-white/80 shadow-lg pointer-events-auto">
          <Compass size={13} className="text-white/60 animate-spin-slow" />
          <button 
            onClick={handleResetUniverse} 
            className="hover:text-white transition-colors"
          >
            Universe
          </button>

          {activeSector && activeSector !== 'all' && isSectorId(activeSector) && !selection && (
            <>
              <span className="text-white/30">/</span>
              <span className="text-amber-300 font-medium">{getSector(activeSector).name} Sector</span>
            </>
          )}

          {selection?.type === 'genre' && (
            <>
              <span className="text-white/30">/</span>
              <span className="text-white font-medium">{selection.item.name}</span>
            </>
          )}

          {selection?.type === 'subgenre' && (
            <>
              <span className="text-white/30">/</span>
              <button 
                onClick={() => {
                  const g = universeData.genres.find((x) => x.name === selection.item.parentGenre);
                  if (g) onSelect({ type: 'genre', item: g });
                }}
                className="hover:text-white transition-colors"
              >
                {selection.item.parentGenre}
              </button>
              <span className="text-white/30">/</span>
              <span className="text-white font-medium">{selection.item.name}</span>
            </>
          )}

          {selection?.type === 'artist' && (
            <>
              <span className="text-white/30">/</span>
              <button 
                onClick={() => {
                  const g = universeData.genres.find((x) => x.name === selection.item.primaryGenre);
                  if (g) onSelect({ type: 'genre', item: g });
                }}
                className="hover:text-white transition-colors"
              >
                {selection.item.primaryGenre}
              </button>
              <span className="text-white/30">/</span>
              <span className="text-white font-medium">{selection.item.name}</span>
            </>
          )}

          {selection?.type === 'track' && (
            <>
              <span className="text-white/30">/</span>
              <button 
                onClick={() => {
                  const a = universeData.artists.find((x) => x.name === selection.item.artist);
                  if (a) onSelect({ type: 'artist', item: a });
                }}
                className="hover:text-white transition-colors"
              >
                {selection.item.artist}
              </button>
              <span className="text-white/30">/</span>
              <span className="text-white font-medium">{selection.item.title}</span>
            </>
          )}

          {selection?.type === 'discovery' && (
            <>
              <span className="text-white/30">/</span>
              <span className="text-amber-300 font-medium">Discovery: {selection.item.recommendation.artist}</span>
            </>
          )}

          {selection?.type === 'asteroid' && (
            <>
              <span className="text-white/30">/</span>
              <button 
                onClick={() => {
                  const g = universeData.genres.find((x) => x.name.toLowerCase() === selection.item.parentGenre.toLowerCase());
                  if (g) onSelect({ type: 'genre', item: g });
                }}
                className="hover:text-white transition-colors"
              >
                {selection.item.parentGenre}
              </button>
              <span className="text-white/30">/</span>
              <span className="text-slate-300 font-medium">{selection.item.name}</span>
            </>
          )}

          {selection?.type === 'meteor' && (
            <>
              <span className="text-white/30">/</span>
              <span className="text-cyan-300 font-medium">Event: {selection.item.title}</span>
            </>
          )}
        </div>

        {/* Level Indicator Tag */}
        <div className="px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/5 text-[10px] font-mono text-white/50 uppercase tracking-widest hidden sm:block">
          Level {currentZoomLevel} · {
            currentZoomLevel === 1 ? 'Galactic Universe' :
            currentZoomLevel === 2 ? 'Genre System' :
            currentZoomLevel === 3 ? 'Artist System' : 'Orbital Track'
          }
        </div>

        {/* Discovery Filter Quick Switcher */}
        {onDiscoveryFilterChange && (
          <div className="hidden lg:flex items-center gap-1 px-1.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10.5px] font-mono">
            <span className="text-white/40 px-1 uppercase tracking-wider text-[9px]">Discover:</span>
            {(['all', 'nearby', 'adjacent', 'unknown'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => onDiscoveryFilterChange(cat)}
                className={`px-2 py-0.5 rounded-full capitalize transition-all ${
                  discoveryFilter === cat
                    ? 'bg-white/20 text-white font-medium border border-white/20'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Dynamic Subtle Hover Indicator */}
        {hoveredEntity && (
          <div className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[11px] font-sans text-white/90 animate-in fade-in duration-150 hidden md:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
            <span className="text-white/50 font-mono text-[10px] uppercase">{hoveredEntity.type}:</span>
            <span className="font-medium">
              {hoveredEntity.type === 'genre' && hoveredEntity.item.name}
              {hoveredEntity.type === 'subgenre' && hoveredEntity.item.name}
              {hoveredEntity.type === 'artist' && hoveredEntity.item.name}
              {hoveredEntity.type === 'track' && `${hoveredEntity.item.title} — ${hoveredEntity.item.artist}`}
              {hoveredEntity.type === 'discovery' && `${hoveredEntity.item.recommendation.artist} (${Math.round(hoveredEntity.item.recommendation.score * 100)}% Taste Match)`}
              {hoveredEntity.type === 'asteroid' && `${hoveredEntity.item.name} · ${hoveredEntity.item.trackCount} ${hoveredEntity.item.trackCount === 1 ? 'track' : 'tracks'} · ${hoveredEntity.item.parentGenre}${hoveredEntity.item.relatedGenre ? ` ↔ ${hoveredEntity.item.relatedGenre}` : ''}`}
              {hoveredEntity.type === 'meteor' && `"${hoveredEntity.item.title}" — ${hoveredEntity.item.artist} (${hoveredEntity.item.reason})`}
            </span>
          </div>
        )}
      </div>

      {/* Floating Controls: Zoom & Universe Reset */}
      <div className="absolute bottom-6 left-6 z-20 flex items-center gap-1.5 p-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 shadow-xl">
        <button
          onClick={() => handleZoom(0.3)}
          className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={15} />
        </button>
        <button
          onClick={() => handleZoom(-0.3)}
          className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={15} />
        </button>
        <div className="h-4 w-px bg-white/10 mx-0.5" />
        <button
          onClick={handleResetUniverse}
          className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Reset to Entire Universe"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Gravitational Bridge Indicator when Bridge Artist is Selected */}
      {selection?.type === 'artist' && selection.item.bridgeGenre && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-xs text-white/90 flex items-center gap-2 shadow-2xl animate-in fade-in duration-300">
          <Sparkles size={13} className="text-amber-400" />
          <span>
            <strong>{selection.item.name}</strong> bridges <strong>{selection.item.primaryGenre}</strong> and <strong>{selection.item.bridgeGenre}</strong>
          </span>
        </div>
      )}

      {/* Minimal Contextual Track Modal (Level 4 detail panel) */}
      {selection?.type === 'track' && (
        <div className="absolute bottom-6 right-6 z-30 w-80 rounded-lg bg-[#111215]/95 backdrop-blur-md border border-white/10 p-4 shadow-xl animate-in slide-in-from-bottom-2 duration-200 text-white">
          <div className="flex items-center justify-between text-xs font-mono text-white/50 mb-2">
            <span>TRACK</span>
            {selection.item.bpm ? <span>{selection.item.bpm} BPM</span> : null}
          </div>

          <h3 className="font-serif text-xl font-bold tracking-tight text-white mb-1 leading-snug">
            {selection.item.title}
          </h3>

          <p className="text-xs text-white/80 font-medium mb-1">
            {selection.item.artist}
          </p>

          <p className="text-[11px] text-white/50 font-mono mb-4">
            {selection.item.genre} {selection.item.subgenre ? `· ${selection.item.subgenre}` : ''}
          </p>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-white/60 font-mono text-[11px]">
              {selection.item.album} ({selection.item.year || 2024})
            </span>
            {selection.item.duration && (
              <span className="text-white/40 font-mono text-[11px]">
                {selection.item.duration}
              </span>
            )}
          </div>

          {selection.item.spotifyUrl && (
            <a
              href={selection.item.spotifyUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-md bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-medium text-white transition-all"
            >
              <span>Open in Spotify</span>
              <ExternalLink size={12} className="opacity-70" />
            </a>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* RECOMMENDATION DETAIL PANEL (DISCOVERY SYSTEM INSPECTION)    */}
      {/* ============================================================ */}
      {selection?.type === 'discovery' && (
        <div className="absolute bottom-6 right-6 z-30 w-84 rounded-lg bg-[#111215]/95 backdrop-blur-md border border-white/10 p-4 shadow-xl animate-in slide-in-from-bottom-2 duration-200 text-white">
          <div className="flex items-center justify-between text-xs font-mono text-white/50 mb-2">
            <span className="uppercase text-amber-300 font-medium flex items-center gap-1">
              <Sparkles size={12} />
              {selection.item.recommendation.category} discovery
            </span>
            <span className="text-[11px] text-white/60 font-mono">
              Profile fit: {Math.round(selection.item.recommendation.score * 100)}%
            </span>
          </div>

          <h3 className="font-serif text-2xl font-bold tracking-tight text-white mb-1 leading-snug">
            {selection.item.recommendation.artist}
          </h3>

          <p className="text-xs text-white/70 font-mono mb-4">
            {selection.item.recommendation.genre}
            {selection.item.recommendation.subgenre ? ` · ${selection.item.recommendation.subgenre}` : ''}
            {selection.item.recommendation.bpm ? ` · ${selection.item.recommendation.bpm} BPM` : ''}
          </p>

          {/* Inspectable contributing factors: "Why this appeared" */}
          <div className="mb-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 block mb-2">
              Why this matches your taste:
            </span>
            <div className="space-y-1.5">
              {selection.item.recommendation.reasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-xs text-white/80 leading-snug">
                  <span className="text-amber-400 font-mono text-[11px]">+</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sample Tracks in this Discovery System */}
          {selection.item.recommendation.sampleTracks.length > 0 && (
            <div className="pt-3 border-t border-white/10 mb-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 block mb-2">
                Sample Tracks:
              </span>
              <div className="space-y-2">
                {selection.item.recommendation.sampleTracks.map((t, idx) => {
                  const isAdded = addedTrackTitles.has(t.title);
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white/5 border border-white/5">
                      <div className="truncate pr-2">
                        <span className="font-medium text-white block truncate">{t.title}</span>
                        <span className="text-[10px] text-white/50 font-mono">{t.album} ({t.year})</span>
                      </div>
                      {onAddDiscoveryTrack && (
                        <button
                          onClick={() => {
                            onAddDiscoveryTrack({
                              track: t.title,
                              artist: selection.item.recommendation.artist,
                              genre: selection.item.recommendation.genre,
                              bpm: t.bpm || selection.item.recommendation.bpm,
                            });
                            setAddedTrackTitles((prev) => new Set(prev).add(t.title));
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-medium transition-all ${
                            isAdded
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check size={11} />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus size={11} />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => {
                triggerHyperspaceTravel(
                  selection.item.x,
                  selection.item.y,
                  2.6,
                  selection.item.recommendation.artist
                );
              }}
              className="flex-1 py-2 px-3 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-xs font-medium text-sky-200 flex items-center justify-center gap-1.5 transition-all"
            >
              <Zap size={13} className="text-sky-400" />
              <span>Explore Closer</span>
            </button>

            {selection.item.recommendation.spotifyUrl && (
              <a
                href={selection.item.recommendation.spotifyUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-medium text-white flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Spotify</span>
                <ExternalLink size={12} className="opacity-70" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ASTEROID DETAIL PANEL (PERIPHERAL / NICHE DISCOVERY)         */}
      {/* ============================================================ */}
      {selection?.type === 'asteroid' && (
        <div className="absolute bottom-6 right-6 z-30 w-84 rounded-lg bg-[#111215]/95 backdrop-blur-md border border-white/10 p-4 shadow-xl animate-in slide-in-from-bottom-2 duration-200 text-white">
          <div className="flex items-center justify-between text-xs font-mono text-white/50 mb-2">
            <span className="uppercase text-slate-300 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-slate-400 rotate-45 inline-block" />
              {selection.item.type.replace('_', ' ')}
            </span>
            <span className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[11px]">
              {selection.item.trackCount} {selection.item.trackCount === 1 ? 'Track' : 'Tracks'}
            </span>
          </div>

          <h3 className="font-serif text-2xl font-bold tracking-tight text-white mb-1 leading-snug">
            {selection.item.name}
          </h3>

          <p className="text-xs text-white/70 font-mono mb-4">
            System: {selection.item.parentGenre}
            {selection.item.relatedGenre ? ` · Bridge to ${selection.item.relatedGenre}` : ''}
            {selection.item.bpm ? ` · ${selection.item.bpm} BPM` : ''}
          </p>

          {/* Context: Why it exists here */}
          <div className="mb-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 block mb-2">
              Celestial Placement & Context:
            </span>
            <div className="space-y-1.5">
              {selection.item.reasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-xs text-white/80 leading-snug">
                  <span className="text-slate-400 font-mono text-[11px]">◆</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sample tracks if any */}
          {selection.item.sampleTracks && selection.item.sampleTracks.length > 0 && (
            <div className="pt-3 border-t border-white/10 mb-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 block mb-2">
                Asteroid Tracks:
              </span>
              <div className="space-y-2">
                {selection.item.sampleTracks.map((t, idx) => {
                  const isAdded = addedTrackTitles.has(t.title);
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white/5 border border-white/5">
                      <div className="truncate pr-2">
                        <span className="font-medium text-white block truncate">{t.title}</span>
                        <span className="text-[10px] text-white/50 font-mono">{t.album || selection.item.name} ({t.year || 2024})</span>
                      </div>
                      {onAddDiscoveryTrack && (
                        <button
                          onClick={() => {
                            onAddDiscoveryTrack({
                              track: t.title,
                              artist: selection.item.artist || selection.item.name,
                              genre: selection.item.parentGenre,
                              bpm: selection.item.bpm || undefined,
                            });
                            setAddedTrackTitles((prev) => new Set(prev).add(t.title));
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-medium transition-all ${
                            isAdded
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check size={11} />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus size={11} />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => {
                triggerHyperspaceTravel(
                  selection.item.x,
                  selection.item.y,
                  2.6,
                  selection.item.name
                );
              }}
              className="flex-1 py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-medium text-white flex items-center justify-center gap-1.5 transition-all"
            >
              <Zap size={13} className="text-white/70" />
              <span>Explore</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* METEOR DETAIL PANEL (ACTIVE DYNAMIC EVENT)                   */}
      {/* ============================================================ */}
      {selection?.type === 'meteor' && (
        <div className="absolute bottom-6 right-6 z-30 w-84 rounded-lg bg-[#111215]/95 backdrop-blur-md border border-sky-400/25 p-4 shadow-xl animate-in slide-in-from-bottom-2 duration-200 text-white">
          <div className="flex items-center justify-between text-xs font-mono text-white/50 mb-2">
            <span className="uppercase text-sky-300 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping inline-block" />
              {selection.item.eventType.replace(/_/g, ' ')}
            </span>
            <span className="px-2 py-0.5 rounded bg-sky-400/10 text-sky-200 font-mono text-[11px] border border-sky-400/20">
              Trajectory: {Math.round(selection.item.progress * 100)}%
            </span>
          </div>

          <h3 className="font-serif text-2xl font-bold tracking-tight text-white mb-1 leading-snug">
            {selection.item.title}
          </h3>

          <p className="text-xs text-white/80 font-medium mb-1">
            {selection.item.artist}
          </p>

          <p className="text-xs text-white/50 font-mono mb-4">
            {selection.item.sourceGenre ? `${selection.item.sourceGenre} ➔ ` : ''}{selection.item.genre}
          </p>

          {/* Event Context & Flight Path Details */}
          <div className="mb-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 block mb-2">
              Why this meteor is moving:
            </span>
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/90 leading-relaxed font-sans">
              {selection.item.reason}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => {
                triggerHyperspaceTravel(
                  selection.item.currentX,
                  selection.item.currentY,
                  2.6,
                  selection.item.title
                );
              }}
              className="flex-1 py-2 px-3 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-xs font-medium text-sky-200 flex items-center justify-center gap-1.5 transition-all"
            >
              <Zap size={13} className="text-sky-400" />
              <span>Track Trajectory</span>
            </button>

            {onAddDiscoveryTrack && (
              <button
                onClick={() => {
                  onAddDiscoveryTrack({
                    track: selection.item.title,
                    artist: selection.item.artist,
                    genre: selection.item.genre,
                  });
                  setAddedTrackTitles((prev) => new Set(prev).add(selection.item.title));
                }}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  addedTrackTitles.has(selection.item.title)
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
                }`}
              >
                {addedTrackTitles.has(selection.item.title) ? (
                  <>
                    <Check size={12} />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <Plus size={12} />
                    <span>Collect</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
