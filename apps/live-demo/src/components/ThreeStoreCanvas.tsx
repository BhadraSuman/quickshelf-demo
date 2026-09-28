import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { StoreData, TagData, EInkRefreshPhase } from '../types';
import { renderTagToCanvas, getTagPixelDimensions } from '../engine/epaperRenderer';
import {
  generateFloorTexture,
  generatePegboardTexture,
  generateAttaTexture,
  generateBasmatiTexture,
  generateDalTexture,
  generateSpiceBoxTexture,
  generateOilLabelTexture,
  generateKajuKatliTexture,
} from '../engine/packagingTextures';

interface ThreeStoreCanvasProps {
  store: StoreData;
  activeAisleIndex: number;
  selectedTag: TagData | null;
  onSelectTag: (tag: TagData | null) => void;
  onHoverTag: (tag: TagData | null, screenPos?: { x: number; y: number }) => void;
  locatingTagId: string | null;
  refreshingTagId: string | null;
  refreshPhase: EInkRefreshPhase;
  guidedTourIndex: number | null;
  onGuidedTourNext?: () => void;
  onFloorClickTeleport?: (pos: [number, number, number]) => void;
  onCameraMove?: (pos: [number, number, number], rotY: number) => void;
}

interface TagMeshRef {
  tag: TagData;
  mesh: THREE.Mesh;
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  ledMesh: THREE.Mesh;
  ledMaterial: THREE.MeshStandardMaterial;
}

const checkGondolaCollision = (testPos: THREE.Vector3, aisles: StoreData['aisles']): boolean => {
  for (let aIdx = 0; aIdx < aisles.length; aIdx++) {
    const aisleZ = (aIdx - aisles.length / 2) * 4.5;
    const minZ = aisleZ - 2.4;
    const maxZ = aisleZ + 2.4;

    if (testPos.z >= minZ && testPos.z <= maxZ) {
      // Check left gondola row: [-2.35, -1.25]
      if (testPos.x >= -2.35 && testPos.x <= -1.25) return true;
      // Check right gondola row: [1.25, 2.35]
      if (testPos.x >= 1.25 && testPos.x <= 2.35) return true;
    }
  }
  return false;
};

export const ThreeStoreCanvas: React.FC<ThreeStoreCanvasProps> = ({
  store,
  activeAisleIndex,
  onSelectTag,
  onHoverTag,
  locatingTagId,
  refreshingTagId,
  refreshPhase,
  guidedTourIndex,
  onCameraMove,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const tagMeshesRef = useRef<Map<string, TagMeshRef>>(new Map());

  // Camera state & glide controls
  const cameraPosRef = useRef<THREE.Vector3>(new THREE.Vector3(...store.defaultCameraPos));
  const cameraTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(...store.defaultLookAt));
  const isGlidingRef = useRef<boolean>(false);
  const glideStartRef = useRef<{
    startPos: THREE.Vector3;
    destPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    destTarget: THREE.Vector3;
    startTime: number;
    duration: number;
  } | null>(null);

  // Mouse drag look with smooth damping
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraYawRef = useRef<number>(0);
  const cameraPitchRef = useRef<number>(0);
  const targetYawRef = useRef<number>(0);
  const targetPitchRef = useRef<number>(0);

  // Keyboard navigation with inertia damping
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});
  const velocityRef = useRef<THREE.Vector3>(new THREE.Vector3());

  // Interactive Floor Reticle & Dynamic Pick-to-Light PointLight
  const floorReticleRef = useRef<THREE.Mesh | null>(null);
  const ptlLightRef = useRef<THREE.PointLight | null>(null);

  // Hover state
  const hoveredTagRef = useRef<TagData | null>(null);

  // Stable callback refs to prevent scene re-initialization
  const onSelectTagRef = useRef(onSelectTag);
  const onHoverTagRef = useRef(onHoverTag);
  const onCameraMoveRef = useRef(onCameraMove);

  useEffect(() => {
    onSelectTagRef.current = onSelectTag;
    onHoverTagRef.current = onHoverTag;
    onCameraMoveRef.current = onCameraMove;
  });

  // -----------------------------------------------------------------
  // Smooth Glide Animation Function
  // -----------------------------------------------------------------
  const glideTo = useCallback((destPos: THREE.Vector3, destTarget: THREE.Vector3, durationMs: number = 850) => {
    glideStartRef.current = {
      startPos: cameraPosRef.current.clone(),
      destPos: destPos.clone(),
      startTarget: cameraTargetRef.current.clone(),
      destTarget: destTarget.clone(),
      startTime: performance.now(),
      duration: durationMs,
    };
    isGlidingRef.current = true;
  }, []);

  // -----------------------------------------------------------------
  // Guided Tour Watcher
  // -----------------------------------------------------------------
  useEffect(() => {
    if (guidedTourIndex !== null && store.tourStops[guidedTourIndex]) {
      const stop = store.tourStops[guidedTourIndex];
      glideTo(new THREE.Vector3(...stop.cameraPos), new THREE.Vector3(...stop.lookAt), 1200);
      const tag = store.aisles.flatMap((a) => a.shelves).flatMap((s) => s.tags).find((t) => t.id === stop.tagId);
      if (tag) onSelectTag(tag);
    }
  }, [guidedTourIndex, store, glideTo, onSelectTag]);

  // -----------------------------------------------------------------
  // Teleport to active aisle when changed via UI
  // -----------------------------------------------------------------
  const prevAisleRef = useRef<number>(activeAisleIndex);
  useEffect(() => {
    if (guidedTourIndex !== null) return;
    if (prevAisleRef.current === activeAisleIndex) return;
    prevAisleRef.current = activeAisleIndex;

    if (locatingTagId) return; // Tag glide takes priority

    const aisle = store.aisles[activeAisleIndex];
    if (aisle) {
      const aisleZ = (activeAisleIndex - store.aisles.length / 2) * 4.5;
      glideTo(new THREE.Vector3(0, 1.6, aisleZ + 3.2), new THREE.Vector3(0, 1.4, aisleZ), 900);
    }
  }, [activeAisleIndex, store, guidedTourIndex, locatingTagId, glideTo]);

  // -----------------------------------------------------------------
  // Redraw tag texture on price refresh
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!refreshingTagId) return;
    const tagRef = tagMeshesRef.current.get(refreshingTagId);
    if (!tagRef) return;

    renderTagToCanvas(tagRef.canvas, tagRef.tag, refreshPhase).then(() => {
      tagRef.texture.needsUpdate = true;
    });
  }, [refreshingTagId, refreshPhase]);

  // -----------------------------------------------------------------
  // Pick-to-Light Cross-Aisle Camera Glide & LED Blink Controller
  // -----------------------------------------------------------------
  useEffect(() => {
    tagMeshesRef.current.forEach((tagRef, id) => {
      if (id === locatingTagId) {
        tagRef.ledMaterial.emissive.setHex(0x10b981);
        tagRef.ledMaterial.emissiveIntensity = 4.5;
        if (ptlLightRef.current) {
          const worldPos = new THREE.Vector3();
          tagRef.ledMesh.getWorldPosition(worldPos);
          ptlLightRef.current.position.copy(worldPos).add(new THREE.Vector3(0.12, 0, 0));
          ptlLightRef.current.intensity = 3.5;
        }
      } else {
        tagRef.ledMaterial.emissive.setHex(0x000000);
        tagRef.ledMaterial.emissiveIntensity = 0.0;
      }
    });

    if (!locatingTagId && ptlLightRef.current) {
      ptlLightRef.current.intensity = 0;
    }

    if (locatingTagId) {
      const tagRef = tagMeshesRef.current.get(locatingTagId);
      if (tagRef) {
        const tagWorldPos = new THREE.Vector3();
        tagRef.mesh.getWorldPosition(tagWorldPos);
        const viewPos = new THREE.Vector3(
          tagWorldPos.x + 0.68,
          Math.max(1.35, tagWorldPos.y + 0.05),
          tagWorldPos.z
        );
        glideTo(viewPos, tagWorldPos, 900);
      }
    }
  }, [locatingTagId, glideTo]);

  // -----------------------------------------------------------------
  // Initialize Three.js Scene
  // -----------------------------------------------------------------
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf6f5f0);
    scene.fog = new THREE.Fog(0xf6f5f0, 14, 30);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 100);
    camera.position.set(...store.defaultCameraPos);
    camera.lookAt(new THREE.Vector3(...store.defaultLookAt));
    cameraRef.current = camera;
    targetYawRef.current = 0;
    targetPitchRef.current = 0;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting (Warm Commercial Retail Store Illumination)
    const ambientLight = new THREE.AmbientLight(0xfffbf5, 1.35);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff7ea, 1.8);
    dirLight.position.set(6, 14, 7);
    scene.add(dirLight);

    // Warm overhead downlight cluster
    const centralStoreLight = new THREE.PointLight(0xfffaed, 0.95, 20);
    centralStoreLight.position.set(0, 4.6, 0);
    scene.add(centralStoreLight);

    // Dynamic Pick-to-Light Glow Light
    const ptlPointLight = new THREE.PointLight(0x10b981, 0, 2.5);
    scene.add(ptlPointLight);
    ptlLightRef.current = ptlPointLight;

    // 5. Floor (Polished Supermarket Terrazzo / Large Format Ceramic Tile)
    const floorTexture = generateFloorTexture();
    const floorGeo = new THREE.PlaneGeometry(36, 36);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.25,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.name = 'store-floor';
    scene.add(floor);

    // Interactive Floor Click-to-Walk Reticle Projection
    const reticleGeo = new THREE.RingGeometry(0.25, 0.34, 32);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x006153,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const reticleMesh = new THREE.Mesh(reticleGeo, reticleMat);
    reticleMesh.rotation.x = -Math.PI / 2;
    reticleMesh.position.y = 0.008;
    scene.add(reticleMesh);
    floorReticleRef.current = reticleMesh;

    // 6. Ceiling & Retail Gateway Hub
    const ceilingGeo = new THREE.PlaneGeometry(36, 36);
    const ceilingMat = new THREE.MeshBasicMaterial({ color: 0xf4f4f0, side: THREE.DoubleSide });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.position.y = 5.2;
    ceiling.rotation.x = Math.PI / 2;
    scene.add(ceiling);

    // Ceiling Gateway Access Points (Sub-1 GHz BLE 5.4 Base Station)
    const apGroup = new THREE.Group();
    const apGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.07, 24);
    const apMat = new THREE.MeshStandardMaterial({ color: 0x1f2328, roughness: 0.4 });
    const apMesh = new THREE.Mesh(apGeo, apMat);
    apMesh.position.set(0, 5.16, 0);
    apGroup.add(apMesh);

    // Dual Status LEDs (Cyan BLE Link + Green Power)
    const apLedGeo = new THREE.SphereGeometry(0.035, 12, 12);
    const apLedMatCyan = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 2.2 });
    const apLedCyan = new THREE.Mesh(apLedGeo, apLedMatCyan);
    apLedCyan.position.set(-0.1, 5.11, 0);
    apGroup.add(apLedCyan);

    const apLedMatGreen = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 2.0 });
    const apLedGreen = new THREE.Mesh(apLedGeo, apLedMatGreen);
    apLedGreen.position.set(0.1, 5.11, 0);
    apGroup.add(apLedGreen);
    scene.add(apGroup);

    // -----------------------------------------------------------------
    // Retail Gondola Shelving & Authentic Indian Packaging
    // -----------------------------------------------------------------
    tagMeshesRef.current.clear();

    const shelfMetalMat = new THREE.MeshStandardMaterial({
      color: 0xe2e5eb,
      roughness: 0.45,
      metalness: 0.18,
    });

    const railMat = new THREE.MeshStandardMaterial({
      color: 0x23272d,
      roughness: 0.55,
    });

    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x23272d,
      roughness: 0.45,
    });

    // Perforated pegboard back panel
    const pegboardTexture = generatePegboardTexture();
    const pegboardMat = new THREE.MeshStandardMaterial({
      map: pegboardTexture,
      roughness: 0.5,
      metalness: 0.08,
    });

    // Dark base kickplate plinth
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x1e2328,
      roughness: 0.65,
    });

    // Generate Procedural Packaging Textures
    const attaTex = generateAttaTexture();
    const basmatiTex = generateBasmatiTexture();
    const toorDalTex = generateDalTexture('toor');
    const moongDalTex = generateDalTexture('moong');
    const spiceTex = generateSpiceBoxTexture();
    const oilLabelTex = generateOilLabelTexture();
    const sweetsTex = generateKajuKatliTexture();

    // Packaging PBR Materials
    const attaMat = new THREE.MeshStandardMaterial({ map: attaTex, roughness: 0.85 });
    const basmatiMat = new THREE.MeshStandardMaterial({ map: basmatiTex, roughness: 0.45, metalness: 0.1 });
    const dalMat = new THREE.MeshStandardMaterial({ map: toorDalTex, roughness: 0.35 });
    const moongMat = new THREE.MeshStandardMaterial({ map: moongDalTex, roughness: 0.35 });
    const spiceMat = new THREE.MeshStandardMaterial({ map: spiceTex, roughness: 0.5 });
    const oilMat = new THREE.MeshStandardMaterial({ map: oilLabelTex, roughness: 0.25 });
    const sweetsMat = new THREE.MeshStandardMaterial({ map: sweetsTex, roughness: 0.4, metalness: 0.3 });

    // Track light suspended rails along each aisle
    const numAisles = store.aisles.length;
    const trackRailGeo = new THREE.BoxGeometry(0.06, 0.05, 5.2);
    const trackRailMat = new THREE.MeshStandardMaterial({ color: 0x181c21, roughness: 0.5 });
    const trackRailMesh = new THREE.InstancedMesh(trackRailGeo, trackRailMat, numAisles);

    const numRows = numAisles * 2;
    const numTiers = 4;
    const tiers = [0.45, 1.05, 1.65, 2.25];
    const pPositions = [-1.8, -1.35, -0.9, -0.45, 0, 0.45, 0.9, 1.35, 1.8];

    const totalUprights = numRows * 2;
    const totalBackPanels = numRows;
    const totalShelves = numRows * numTiers;
    const totalRails = numRows * numTiers;
    const totalPlinths = numRows;

    const isSupermarket = store.type === 'supermarket';
    const isSweets = store.type === 'sweets';

    // Instanced Geometries
    const uprightGeo = new THREE.BoxGeometry(0.08, 2.8, 0.08);
    const backPanelGeo = new THREE.BoxGeometry(0.04, 2.7, 4.4);
    const plinthGeo = new THREE.BoxGeometry(0.7, 0.14, 4.4);
    const shelfGeo = new THREE.BoxGeometry(0.65, 0.04, 4.3);
    const railGeo = new THREE.BoxGeometry(0.03, 0.08, 4.3);

    // Product Geometries
    const boxGeo = new THREE.BoxGeometry(0.3, 0.4, 0.34);
    const bottleGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.45, 16);

    const uprightMesh = new THREE.InstancedMesh(uprightGeo, shelfMetalMat, totalUprights);
    const backPanelMesh = new THREE.InstancedMesh(backPanelGeo, pegboardMat, totalBackPanels);
    const plinthMesh = new THREE.InstancedMesh(plinthGeo, plinthMat, totalPlinths);
    const shelfMesh = new THREE.InstancedMesh(shelfGeo, shelfMetalMat, totalShelves);
    const railMesh = new THREE.InstancedMesh(railGeo, railMat, totalRails);

    // Instanced Product Meshes per Packaging Group
    const productsPerTier = numRows * pPositions.length;
    const attaMesh = new THREE.InstancedMesh(boxGeo, attaMat, productsPerTier);
    const basmatiMesh = new THREE.InstancedMesh(boxGeo, basmatiMat, productsPerTier);
    const dalMesh = new THREE.InstancedMesh(boxGeo, isSweets ? sweetsMat : dalMat, productsPerTier);
    const spiceMesh = new THREE.InstancedMesh(boxGeo, isSweets ? sweetsMat : spiceMat, productsPerTier);

    let bottleMesh: THREE.InstancedMesh | null = null;
    if (isSupermarket) {
      bottleMesh = new THREE.InstancedMesh(bottleGeo, oilMat, productsPerTier);
    }

    const dummy = new THREE.Object3D();
    let uprightIdx = 0;
    let backPanelIdx = 0;
    let plinthIdx = 0;
    let shelfIdx = 0;
    let railIdx = 0;

    let attaIdx = 0;
    let basmatiIdx = 0;
    let dalIdx = 0;
    let spiceIdx = 0;
    let bottleIdx = 0;

    store.aisles.forEach((aisle, aIdx) => {
      const aisleZ = (aIdx - store.aisles.length / 2) * 4.5;

      // Suspended aisle track light beam
      dummy.position.set(0, 4.4, aisleZ);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      trackRailMesh.setMatrixAt(aIdx, dummy.matrix);

      // Warm downward spotlight for this aisle
      const aisleSpot = new THREE.PointLight(0xfffaec, 0.85, 9);
      aisleSpot.position.set(0, 4.3, aisleZ);
      scene.add(aisleSpot);

      const rows = [
        { side: 'left', x: -1.8 },
        { side: 'right', x: 1.8 },
      ];

      rows.forEach((row) => {
        // Baseboard plinth
        dummy.position.set(row.x, 0.07, aisleZ);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        plinthMesh.setMatrixAt(plinthIdx++, dummy.matrix);

        // Slotted upright post left
        dummy.position.set(row.x, 1.4, aisleZ - 2.2);
        dummy.updateMatrix();
        uprightMesh.setMatrixAt(uprightIdx++, dummy.matrix);

        // Slotted upright post right
        dummy.position.set(row.x, 1.4, aisleZ + 2.2);
        dummy.updateMatrix();
        uprightMesh.setMatrixAt(uprightIdx++, dummy.matrix);

        // Perforated pegboard back panel
        dummy.position.set(row.x + (row.side === 'left' ? -0.3 : 0.3), 1.4, aisleZ);
        dummy.updateMatrix();
        backPanelMesh.setMatrixAt(backPanelIdx++, dummy.matrix);

        // 4 tiers
        tiers.forEach((tierY, tIdx) => {
          // Metal shelf board
          dummy.position.set(row.x, tierY, aisleZ);
          dummy.scale.set(1, 1, 1);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          shelfMesh.setMatrixAt(shelfIdx++, dummy.matrix);

          // Mounting rail along front edge
          const railOffset = row.side === 'left' ? 0.33 : -0.33;
          dummy.position.set(row.x + railOffset, tierY - 0.01, aisleZ);
          dummy.updateMatrix();
          railMesh.setMatrixAt(railIdx++, dummy.matrix);

          // Populate realistic packaging per tier
          pPositions.forEach((p, pIdx) => {
            const heightScale = 0.95 + ((Math.abs(p * 10)) % 3) * 0.12;
            const xOffset = row.side === 'left' ? 0.05 : -0.05;

            if (tIdx === 0) {
              if (isSupermarket && bottleMesh) {
                dummy.position.set(row.x + (row.side === 'left' ? 0.08 : -0.08), tierY + 0.225, aisleZ + p);
                dummy.scale.set(1, 1, 1);
                dummy.rotation.set(0, 0, 0);
                dummy.updateMatrix();
                bottleMesh.setMatrixAt(bottleIdx++, dummy.matrix);
              } else {
                dummy.position.set(row.x + xOffset, tierY + 0.2 * heightScale + 0.02, aisleZ + p);
                dummy.scale.set(1, heightScale, 1);
                dummy.rotation.set(0, 0, 0);
                dummy.updateMatrix();
                attaMesh.setMatrixAt(attaIdx++, dummy.matrix);
              }
            } else if (tIdx === 1) {
              dummy.position.set(row.x + xOffset, tierY + 0.2 * heightScale + 0.02, aisleZ + p);
              dummy.scale.set(1, heightScale, 1);
              dummy.rotation.set(0, 0, 0);
              dummy.updateMatrix();
              basmatiMesh.setMatrixAt(basmatiIdx++, dummy.matrix);
            } else if (tIdx === 2) {
              dummy.position.set(row.x + xOffset, tierY + 0.2 * heightScale + 0.02, aisleZ + p);
              dummy.scale.set(1, heightScale, 1);
              dummy.rotation.set(0, 0, 0);
              dummy.updateMatrix();
              dalMesh.setMatrixAt(dalIdx++, dummy.matrix);
            } else {
              dummy.position.set(row.x + xOffset, tierY + 0.2 * heightScale + 0.02, aisleZ + p);
              dummy.scale.set(1, heightScale, 1);
              dummy.rotation.set(0, 0, 0);
              dummy.updateMatrix();
              spiceMesh.setMatrixAt(spiceIdx++, dummy.matrix);
            }
          });
        });
      });
    });

    uprightMesh.instanceMatrix.needsUpdate = true;
    backPanelMesh.instanceMatrix.needsUpdate = true;
    plinthMesh.instanceMatrix.needsUpdate = true;
    shelfMesh.instanceMatrix.needsUpdate = true;
    railMesh.instanceMatrix.needsUpdate = true;

    attaMesh.instanceMatrix.needsUpdate = true;
    basmatiMesh.instanceMatrix.needsUpdate = true;
    dalMesh.instanceMatrix.needsUpdate = true;
    spiceMesh.instanceMatrix.needsUpdate = true;

    scene.add(uprightMesh);
    scene.add(backPanelMesh);
    scene.add(plinthMesh);
    scene.add(shelfMesh);
    scene.add(railMesh);
    scene.add(attaMesh);
    scene.add(basmatiMesh);
    scene.add(dalMesh);
    scene.add(spiceMesh);

    if (bottleMesh) {
      bottleMesh.instanceMatrix.needsUpdate = true;
      scene.add(bottleMesh);
    }

    // Pre-calculate total physical ESL tags across all shelves
    const totalTags = store.aisles.reduce(
      (acc, a) => acc + a.shelves.reduce((sAcc, s) => sAcc + s.tags.length, 0),
      0
    );
    const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    const tagCasingMesh = new THREE.InstancedMesh(unitBoxGeo, bezelMat, totalTags);
    let tagCasingIdx = 0;

    // Mount physical ESL tags and hanging signs per aisle
    store.aisles.forEach((aisle, aIdx) => {
      const aisleZ = (aIdx - store.aisles.length / 2) * 4.5;

      // Mount physical ESL Tags along the shelves of this aisle
      aisle.shelves.forEach((shelf) => {
        shelf.tags.forEach((tag) => {
          const dims = getTagPixelDimensions(tag.size);
          const worldWidth = tag.size === '1.54' ? 0.22 : tag.size === '2.13' ? 0.36 : tag.size === '2.9' ? 0.42 : 0.58;
          const worldHeight = worldWidth / dims.aspectRatio;

          // 1. Offscreen Canvas for authentic e-paper texture
          const canvas = document.createElement('canvas');
          canvas.width = dims.width;
          canvas.height = dims.height;

          // Render initial tag state
          renderTagToCanvas(canvas, tag, 'settled');

          // 2. Three.js CanvasTexture
          const texture = new THREE.CanvasTexture(canvas);
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;

          // Ergonomic upward tilt toward shopper eye level
          const tierY = shelf.tierNumber === 1 ? 1.65 : 1.05;
          const tiltX = shelf.tierNumber === 1 ? -0.08 : -0.16;

          // 3. Instanced Tag Casing with integrated rail clip bracket
          const casingEuler = new THREE.Euler(tiltX, Math.PI / 2, 0, 'XYZ');
          dummy.position.set(-1.47, tierY - 0.01, aisleZ + tag.positionX);
          dummy.rotation.copy(casingEuler);
          dummy.scale.set(worldWidth + 0.02, worldHeight + 0.02, 0.016);
          dummy.updateMatrix();
          tagCasingMesh.setMatrixAt(tagCasingIdx++, dummy.matrix);

          // 4. Tag Screen Face & LED Group
          const tagGroup = new THREE.Group();

          const screenGeo = new THREE.PlaneGeometry(worldWidth, worldHeight);
          const screenMat = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.92, // Matte electrophoretic paper finish
            metalness: 0.0,
          });
          const screenMesh = new THREE.Mesh(screenGeo, screenMat);
          screenMesh.position.z = 0.01;
          screenMesh.name = `tag-${tag.id}`;
          tagGroup.add(screenMesh);

          // 5. Pick-to-light LED Bead (Top right corner of bezel)
          const ledGeo = new THREE.SphereGeometry(0.012, 10, 10);
          const ledMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.2,
          });
          const ledMesh = new THREE.Mesh(ledGeo, ledMat);
          ledMesh.position.set(worldWidth / 2 - 0.01, worldHeight / 2 - 0.01, 0.012);
          tagGroup.add(ledMesh);

          tagGroup.position.set(-1.47, tierY - 0.01, aisleZ + tag.positionX);
          tagGroup.rotation.y = Math.PI / 2;
          tagGroup.rotation.x = tiltX;
          scene.add(tagGroup);

          tagMeshesRef.current.set(tag.id, {
            tag,
            mesh: screenMesh,
            canvas,
            texture,
            ledMesh,
            ledMaterial: ledMat,
          });
        });
      });

      // Aisle Hanging Overhead Sign
      const signGroup = new THREE.Group();
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 512;
      signCanvas.height = 160;
      const sCtx = signCanvas.getContext('2d');
      if (sCtx) {
        sCtx.fillStyle = '#111111';
        sCtx.fillRect(0, 0, 512, 160);
        sCtx.fillStyle = '#C4262E';
        sCtx.fillRect(0, 0, 16, 160);
        sCtx.fillStyle = '#F2F0EA';
        sCtx.font = 'bold 36px "Manrope", sans-serif';
        sCtx.fillText(`AISLE ${aisle.number}`, 32, 54);
        sCtx.font = 'bold 24px "Noto Sans Devanagari", sans-serif';
        sCtx.fillText(aisle.nameHi, 32, 98);
        sCtx.font = '16px "Manrope", sans-serif';
        sCtx.fillStyle = '#A0AEC0';
        sCtx.fillText(aisle.nameEn, 32, 134);
      }
      const signTex = new THREE.CanvasTexture(signCanvas);
      const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 0.5),
        new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
      );
      signGroup.position.set(0, 3.8, aisleZ);
      signGroup.add(signMesh);
      scene.add(signGroup);
    });

    trackRailMesh.instanceMatrix.needsUpdate = true;
    scene.add(trackRailMesh);

    tagCasingMesh.instanceMatrix.needsUpdate = true;
    scene.add(tagCasingMesh);

    // -----------------------------------------------------------------
    // Raycaster for Tag Clicking & Floor Teleport
    // -----------------------------------------------------------------
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getRaycastIntersects = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      return raycaster.intersectObjects(scene.children, true);
    };

    const handlePointerDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDraggingRef.current = true;
        previousMousePosRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handlePointerMove = (e: MouseEvent) => {
      // 1. Mouse Drag camera look
      if (isDraggingRef.current) {
        const deltaX = e.clientX - previousMousePosRef.current.x;
        const deltaY = e.clientY - previousMousePosRef.current.y;
        previousMousePosRef.current = { x: e.clientX, y: e.clientY };

        targetYawRef.current -= deltaX * 0.003;
        targetPitchRef.current = Math.max(-0.6, Math.min(0.6, targetPitchRef.current - deltaY * 0.003));
        return;
      }

      // 2. Hover detection over tags & floor reticle
      const intersects = getRaycastIntersects(e);
      let foundTag: TagData | null = null;
      let floorPoint: THREE.Vector3 | null = null;

      for (const hit of intersects) {
        if (!foundTag && hit.object.name && hit.object.name.startsWith('tag-')) {
          const tagId = hit.object.name.replace('tag-', '');
          const tagRef = tagMeshesRef.current.get(tagId);
          if (tagRef) {
            foundTag = tagRef.tag;
          }
        }
        if (!floorPoint && hit.object.name === 'store-floor') {
          floorPoint = hit.point;
        }
      }

      // Floor reticle positioning
      if (floorReticleRef.current) {
        if (floorPoint && !checkGondolaCollision(floorPoint, store.aisles)) {
          floorReticleRef.current.position.x = floorPoint.x;
          floorReticleRef.current.position.z = floorPoint.z;
          (floorReticleRef.current.material as THREE.MeshBasicMaterial).opacity = 0.75;
        } else {
          (floorReticleRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
        }
      }

      if (foundTag !== hoveredTagRef.current) {
        hoveredTagRef.current = foundTag;
        container.style.cursor = foundTag ? 'pointer' : 'default';
        onHoverTagRef.current(foundTag, foundTag ? { x: e.clientX, y: e.clientY } : undefined);
      }
    };

    const handlePointerUp = (e: MouseEvent) => {
      isDraggingRef.current = false;

      // Handle click if was not dragging heavily
      const intersects = getRaycastIntersects(e);
      for (const hit of intersects) {
        // Tag Click
        if (hit.object.name && hit.object.name.startsWith('tag-')) {
          const tagId = hit.object.name.replace('tag-', '');
          const tagRef = tagMeshesRef.current.get(tagId);
          if (tagRef) {
            onSelectTagRef.current(tagRef.tag);

            // Glide camera into close-up inspection view
            const tagWorldPos = new THREE.Vector3();
            hit.object.getWorldPosition(tagWorldPos);
            const viewPos = new THREE.Vector3(
              tagWorldPos.x + 0.68,
              Math.max(1.35, tagWorldPos.y + 0.05),
              tagWorldPos.z
            );
            glideTo(viewPos, tagWorldPos, 750);
            return;
          }
        }

        // Floor Click -> Teleport
        if (hit.object.name === 'store-floor') {
          const targetPoint = hit.point.clone();
          targetPoint.y = 1.6;
          if (!checkGondolaCollision(targetPoint, store.aisles)) {
            glideTo(targetPoint, targetPoint.clone().add(new THREE.Vector3(0, 0, -2)), 800);
          }
          return;
        }
      }
    };

    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key.toLowerCase()] = false;
    };

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // -----------------------------------------------------------------
    // Render & Animation Loop (60 FPS with Smooth Inertia Damping)
    // -----------------------------------------------------------------
    let animationFrameId: number;

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth camera yaw/pitch damping
      cameraYawRef.current = THREE.MathUtils.lerp(cameraYawRef.current, targetYawRef.current, 0.22);
      cameraPitchRef.current = THREE.MathUtils.lerp(cameraPitchRef.current, targetPitchRef.current, 0.22);

      // 1. Handle Glide Interpolation
      if (isGlidingRef.current && glideStartRef.current) {
        const { startPos, destPos, startTarget, destTarget, startTime, duration } = glideStartRef.current;
        const elapsed = time - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Smooth easeInOutCubic
        const t = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        const currentPos = new THREE.Vector3().lerpVectors(startPos, destPos, t);
        camera.position.copy(currentPos);
        cameraPosRef.current.copy(currentPos);

        const currentTarget = new THREE.Vector3().lerpVectors(startTarget, destTarget, t);
        cameraTargetRef.current.copy(currentTarget);
        camera.lookAt(currentTarget);

        const lookDir = currentTarget.clone().sub(currentPos).normalize();
        targetYawRef.current = Math.atan2(lookDir.x, -lookDir.z);
        targetPitchRef.current = Math.asin(Math.max(-0.99, Math.min(0.99, lookDir.y)));
        cameraYawRef.current = targetYawRef.current;
        cameraPitchRef.current = targetPitchRef.current;

        if (onCameraMoveRef.current) {
          onCameraMoveRef.current([currentPos.x, currentPos.y, currentPos.z], cameraYawRef.current);
        }

        if (progress >= 1) {
          isGlidingRef.current = false;
          glideStartRef.current = null;
        }
      } else {
        // 2. Keyboard Movement (WASD) with Inertia Damping & Shelf Collision
        const forward = new THREE.Vector3(
          Math.sin(cameraYawRef.current),
          0,
          -Math.cos(cameraYawRef.current)
        ).normalize();
        const right = new THREE.Vector3(
          Math.cos(cameraYawRef.current),
          0,
          Math.sin(cameraYawRef.current)
        ).normalize();

        const moveDir = new THREE.Vector3();
        if (keysPressedRef.current['w'] || keysPressedRef.current['arrowup']) moveDir.add(forward);
        if (keysPressedRef.current['s'] || keysPressedRef.current['arrowdown']) moveDir.sub(forward);
        if (keysPressedRef.current['d'] || keysPressedRef.current['arrowright']) moveDir.add(right);
        if (keysPressedRef.current['a'] || keysPressedRef.current['arrowleft']) moveDir.sub(right);

        // Apply smooth acceleration
        const accel = 0.016;
        const friction = 0.82;
        if (moveDir.lengthSq() > 0) {
          moveDir.normalize().multiplyScalar(accel);
          velocityRef.current.add(moveDir);
        }
        velocityRef.current.multiplyScalar(friction);

        if (velocityRef.current.lengthSq() > 0.000005) {
          const targetX = Math.max(-4.5, Math.min(4.5, camera.position.x + velocityRef.current.x));
          const targetZ = Math.max(-12, Math.min(12, camera.position.z + velocityRef.current.z));

          // Collision detection against gondolas with smooth wall sliding
          const bothPos = new THREE.Vector3(targetX, 1.6, targetZ);
          if (!checkGondolaCollision(bothPos, store.aisles)) {
            camera.position.x = targetX;
            camera.position.z = targetZ;
          } else {
            const posXOnly = new THREE.Vector3(targetX, 1.6, camera.position.z);
            if (!checkGondolaCollision(posXOnly, store.aisles)) {
              camera.position.x = targetX;
            } else {
              const posZOnly = new THREE.Vector3(camera.position.x, 1.6, targetZ);
              if (!checkGondolaCollision(posZOnly, store.aisles)) {
                camera.position.z = targetZ;
              }
            }
          }

          camera.position.y = 1.6;
          cameraPosRef.current.copy(camera.position);

          const lookDir = new THREE.Vector3(
            Math.sin(cameraYawRef.current) * Math.cos(cameraPitchRef.current),
            Math.sin(cameraPitchRef.current),
            -Math.cos(cameraYawRef.current) * Math.cos(cameraPitchRef.current)
          );
          cameraTargetRef.current.copy(camera.position).add(lookDir);
          camera.lookAt(cameraTargetRef.current);

          if (onCameraMoveRef.current) {
            onCameraMoveRef.current([camera.position.x, camera.position.y, camera.position.z], cameraYawRef.current);
          }
        } else if (isDraggingRef.current) {
          // Drag look only
          const lookDir = new THREE.Vector3(
            Math.sin(cameraYawRef.current) * Math.cos(cameraPitchRef.current),
            Math.sin(cameraPitchRef.current),
            -Math.cos(cameraYawRef.current) * Math.cos(cameraPitchRef.current)
          );
          cameraTargetRef.current.copy(camera.position).add(lookDir);
          camera.lookAt(cameraTargetRef.current);

          if (onCameraMoveRef.current) {
            onCameraMoveRef.current([camera.position.x, camera.position.y, camera.position.z], cameraYawRef.current);
          }
        }
      }

      // Pick-to-Light LED dynamic pulsing
      if (locatingTagId) {
        const tagRef = tagMeshesRef.current.get(locatingTagId);
        if (tagRef) {
          const pulse = (Math.sin(time * 0.008) + 1) * 2;
          tagRef.ledMaterial.emissiveIntensity = 2.5 + pulse;
        }
        if (ptlLightRef.current) {
          const lightPulse = (Math.sin(time * 0.008) + 1) * 1.5;
          ptlLightRef.current.intensity = 2.0 + lightPulse;
        }
      }

      // Floor reticle pulse
      if (floorReticleRef.current && (floorReticleRef.current.material as THREE.MeshBasicMaterial).opacity > 0) {
        const ringScale = 1.0 + Math.sin(time * 0.005) * 0.04;
        floorReticleRef.current.scale.set(ringScale, ringScale, 1);
      }

      // FPS tracking
      frameCount++;
      const nowTime = performance.now();
      if (nowTime - lastFpsTime >= 500) {
        currentFps = Math.round((frameCount * 1000) / (nowTime - lastFpsTime));
        frameCount = 0;
        lastFpsTime = nowTime;
      }

      if (typeof window !== 'undefined') {
        (window as any).__QS_DEBUG__ = {
          ...((window as any).__QS_DEBUG__ || {}),
          cameraPosition: [camera.position.x, camera.position.y, camera.position.z],
          fps: currentFps,
          rendererInfo: {
            drawCalls: renderer.info.render.calls,
            textures: renderer.info.memory.textures,
            geometries: renderer.info.memory.geometries,
          },
        };
      }

      renderer.render(scene, camera);
    };

    let frameCount = 0;
    let lastFpsTime = performance.now();
    let currentFps = 60;

    animationFrameId = requestAnimationFrame(animate);

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [store, glideTo]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />

      {/* Crosshair / Centered Subtle Reticle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40">
        <div className="w-2.5 h-2.5 rounded-full border border-[#006153]/70" />
      </div>

      {/* Navigation hints badge at bottom center */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full bg-[#FFFFFF]/90 backdrop-blur-md border border-[#E8E6DF] shadow-md flex items-center gap-3 text-xs text-[#656F7D] font-mono pointer-events-none">
        <span className="flex items-center gap-1 font-bold text-[#181C21]">
          <span className="px-1.5 py-0.5 rounded bg-[#E5E8EF] text-[10px]">W</span>
          <span className="px-1.5 py-0.5 rounded bg-[#E5E8EF] text-[10px]">A</span>
          <span className="px-1.5 py-0.5 rounded bg-[#E5E8EF] text-[10px]">S</span>
          <span className="px-1.5 py-0.5 rounded bg-[#E5E8EF] text-[10px]">D</span> Walk
        </span>
        <span className="w-1 h-1 rounded-full bg-[#BDC9C5]" />
        <span>Drag to Look</span>
        <span className="w-1 h-1 rounded-full bg-[#BDC9C5]" />
        <span>Click Tag or Floor to Glide</span>
      </div>
    </div>
  );
};
