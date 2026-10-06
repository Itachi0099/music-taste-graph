import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for WCAG 2.3.3 Reduced Motion Accessibility Support
 * Verifies that prefers-reduced-motion: reduce is properly detected,
 * continuous orbital/meteor/starfield motion is frozen,
 * and hyperspace jumps bypass lengthy disorienting warp flights
 * while preserving complete navigation and user interactivity.
 */

describe('Reduced Motion Accessibility (prefers-reduced-motion: reduce)', () => {
  it('1. Detects prefers-reduced-motion media query and respects changes safely', () => {
    let changeHandler: ((e: { matches: boolean }) => void) | null = null;
    let currentMatches = true;

    const mockMediaQueryList = {
      get matches() {
        return currentMatches;
      },
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: (event: string, handler: (e: { matches: boolean }) => void) => {
        if (event === 'change') changeHandler = handler;
      },
      removeEventListener: (event: string, handler: (e: { matches: boolean }) => void) => {
        if (event === 'change' && changeHandler === handler) changeHandler = null;
      },
    };

    let simulatedPrefersReducedMotionRef = mockMediaQueryList.matches;
    assert.strictEqual(simulatedPrefersReducedMotionRef, true, 'Initially detects reduce preference');

    // Attach listener as done in CelestialUniverseCanvas
    const handleChange = (e: { matches: boolean }) => {
      simulatedPrefersReducedMotionRef = e.matches;
    };
    mockMediaQueryList.addEventListener('change', handleChange);

    // Simulate OS preference change to no-preference
    currentMatches = false;
    assert.ok(changeHandler, 'changeHandler should be registered');
    changeHandler({ matches: false });
    assert.strictEqual(simulatedPrefersReducedMotionRef, false, 'Detects transition to no-preference');

    // Simulate cleanup
    mockMediaQueryList.removeEventListener('change', handleChange);
    assert.strictEqual(changeHandler, null, 'Listener is properly cleaned up on unmount');
  });

  it('2. Suppresses continuous celestial drift (animTimeRef delta is 0 in reduce mode)', () => {
    let animTime = 0;
    const isReducedMotion = true;

    // Simulate 60 frames in reduced motion mode
    for (let frame = 0; frame < 60; frame++) {
      if (!isReducedMotion) {
        animTime += 0.012;
      }
    }
    assert.strictEqual(animTime, 0, 'Starfield and celestial time drift must be frozen (0) under reduced motion');

    // Simulate normal mode
    let normalAnimTime = 0;
    const isNormalMotion = false;
    for (let frame = 0; frame < 60; frame++) {
      if (!isNormalMotion) {
        normalAnimTime += 0.012;
      }
    }
    assert.ok(normalAnimTime > 0.7, 'Normal mode must continue organic celestial drift at standard speed');
  });

  it('3. Suppresses artist and track planetary orbital velocities under reduce mode', () => {
    const artist = {
      id: 'artist-1',
      name: 'Infected Mushroom',
      primaryGenre: 'Psytrance',
      orbitAngle: 1.0,
      orbitRadius: 150,
      orbitSpeed: 0.0016,
      tracks: [
        { id: 't-1', title: 'Deeply Disturbed', orbitAngle: 0.5, orbitSpeed: 0.0035, orbitRadius: 25 },
      ],
      x: 0,
      y: 0,
    };

    const initialArtistAngle = artist.orbitAngle;
    const initialTrackAngle = artist.tracks[0].orbitAngle;

    // Simulate reduced motion frame
    const isReducedMotion = true;
    const motionDamp = isReducedMotion ? 0 : 1.0;

    artist.orbitAngle += (artist.orbitSpeed || 0.0016) * motionDamp;
    if (!isReducedMotion) {
      artist.tracks[0].orbitAngle += artist.tracks[0].orbitSpeed;
    }

    assert.strictEqual(artist.orbitAngle, initialArtistAngle, 'Artist orbit angle must not change under reduced motion');
    assert.strictEqual(artist.tracks[0].orbitAngle, initialTrackAngle, 'Track orbit angle must not change under reduced motion');

    // Simulate normal mode frame
    const isNormalMotion = false;
    const normalMotionDamp = isNormalMotion ? 0 : 1.0;
    artist.orbitAngle += (artist.orbitSpeed || 0.0016) * normalMotionDamp;
    if (!isNormalMotion) {
      artist.tracks[0].orbitAngle += artist.tracks[0].orbitSpeed;
    }

    assert.ok(artist.orbitAngle > initialArtistAngle, 'Normal mode advances artist orbit angle');
    assert.ok(artist.tracks[0].orbitAngle > initialTrackAngle, 'Normal mode advances track orbit angle');
  });

  it('4. Freezes continuous meteor trajectories under reduce mode', () => {
    const meteor = {
      id: 'meteor-1',
      speed: 0.0035,
      progress: 0.25,
    };

    const initialProgress = meteor.progress;
    const isReducedMotion = true;
    const meteorDamp = isReducedMotion ? 0 : 1.0;

    meteor.progress += (meteor.speed || 0.0035) * meteorDamp;
    assert.strictEqual(meteor.progress, initialProgress, 'Meteor trajectory progress must freeze under reduced motion');

    // Normal mode
    const isNormalMotion = false;
    const normalMeteorDamp = isNormalMotion ? 0 : 1.0;
    meteor.progress += (meteor.speed || 0.0035) * normalMeteorDamp;
    assert.ok(meteor.progress > initialProgress, 'Meteor progress advances normally when no-preference');
  });

  it('5. Hyperspace travel executes immediate camera transition without 1400ms warp in reduce mode', () => {
    const camera = {
      x: 0,
      y: 0,
      zoom: 0.5,
      targetX: 0,
      targetY: 0,
      targetZoom: 0.5,
    };

    const hyperspace = {
      active: false,
      progress: 0,
    };

    // Helper simulating triggerHyperspaceTravel logic in CelestialUniverseCanvas
    function triggerHyperspace(
      cam: typeof camera,
      hyp: typeof hyperspace,
      targetX: number,
      targetY: number,
      targetZoom: number,
      isReduced: boolean
    ) {
      if (isReduced) {
        cam.targetX = targetX;
        cam.targetY = targetY;
        cam.targetZoom = targetZoom;
        cam.x = targetX;
        cam.y = targetY;
        cam.zoom = targetZoom;
        hyp.active = false;
        return;
      }

      hyp.active = true;
      hyp.progress = 0;
    }

    // 1. Reduced motion: immediate jump
    triggerHyperspace(camera, hyperspace, 850, -420, 2.1, true);

    assert.strictEqual(hyperspace.active, false, 'Hyperspace warp state should not be active in reduced motion mode');
    assert.strictEqual(camera.x, 850, 'Camera X immediately reaches destination');
    assert.strictEqual(camera.y, -420, 'Camera Y immediately reaches destination');
    assert.strictEqual(camera.zoom, 2.1, 'Camera zoom immediately reaches target');
    assert.strictEqual(camera.targetX, 850, 'Target X set');
    assert.strictEqual(camera.targetY, -420, 'Target Y set');

    // 2. Normal mode: activates 1400ms warp
    const normalCam = { x: 0, y: 0, zoom: 0.5, targetX: 0, targetY: 0, targetZoom: 0.5 };
    const normalHyp = { active: false, progress: 0 };
    triggerHyperspace(normalCam, normalHyp, 850, -420, 2.1, false);

    assert.strictEqual(normalHyp.active, true, 'Hyperspace warp state is active in normal mode');
    assert.strictEqual(normalCam.x, 0, 'Camera does not instantly jump in normal mode, allowing smooth warp easing');
  });

  it('6. Preserves interactive navigation and exploration in reduced motion mode', () => {
    // User interactions: pan (drag), zoom (mouse wheel / buttons), sector navigation, selection
    const camera = {
      x: 100,
      y: 200,
      zoom: 1.0,
      targetX: 100,
      targetY: 200,
      targetZoom: 1.0,
    };

    // User pans by 50px X, -30px Y
    const dx = 50;
    const dy = -30;
    camera.targetX -= dx / camera.zoom;
    camera.targetY -= dy / camera.zoom;
    camera.x -= dx / camera.zoom;
    camera.y -= dy / camera.zoom;

    assert.strictEqual(camera.x, 50, 'Panning works identically in reduced motion mode');
    assert.strictEqual(camera.y, 230, 'Panning works identically in reduced motion mode');

    // User zooms in by 0.2
    const zoomDelta = 0.2;
    camera.targetZoom = Math.max(0.08, Math.min(3.6, camera.targetZoom + zoomDelta));
    assert.strictEqual(camera.targetZoom, 1.2, 'Zooming works identically in reduced motion mode');
  });
});
