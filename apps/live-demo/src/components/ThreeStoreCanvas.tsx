import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { StoreData, TagData, EInkRefreshPhase } from '../types';
import { renderTagToCanvas, getTagPixelDimensions, EPAPER_COLORS } from '../engine/epaperRenderer';

interface ThreeStoreCanvasProps {
  store: StoreData;
  activeAisleIndex: number;
  selectedTag: TagData | null;
  onSelectTag: (tag: TagData | null) => void;
  onHoverTag: (tag: TagData | null, screenPos?: { x: number; y: number }) => void;
  locatingTagId: string | null;
  refreshingTagId: string | null;
  refreshPhase: EInkRefreshPhase;
  guidedTourIndex: number | null; // index of active tour stop, or null
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
  selectedTag,
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

  // Mouse drag look
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraYawRef = useRef<number>(0);
  const cameraPitchRef = useRef<number>(0);

  // Keyboard navigation
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});

  // Hover state
  const hoveredTagRef = useRef<TagData | null>(null);

  // -----------------------------------------------------------------
  // Smooth Glide Animation Function
  // -----------------------------------------------------------------
  const glideTo = useCallback((destPos: THREE.Vector3, destTarget: THREE.Vector3, durationMs: number = 800) => {
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

    if (locatingTagId) return;

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
        tagRef.ledMaterial.emissiveIntensity = 4.0;
      } else {
        tagRef.ledMaterial.emissive.setHex(0x000000);
        tagRef.ledMaterial.emissiveIntensity = 0.0;
      }
    });

    if (locatingTagId) {
      const tagRef = tagMeshesRef.current.get(locatingTagId);
      if (tagRef) {
        const tagWorldPos = new THREE.Vector3();
        tagRef.mesh.getWorldPosition(tagWorldPos);
        const viewPos = new THREE.Vector3(
          tagWorldPos.x + 0.72,
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
    scene.background = new THREE.Color(0xfafaf7); // Warm paper canvas background
    scene.fog = new THREE.Fog(0xfafaf7, 12, 28);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 100);
    camera.position.set(...store.defaultCameraPos);
    camera.lookAt(new THREE.Vector3(...store.defaultLookAt));
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff8ee, 1.8);
    dirLight.position.set(5, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 30;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // Subtle ceiling downlights along aisles
    const storePointLight = new THREE.PointLight(0xffffff, 0.8, 15);
    storePointLight.position.set(0, 4.5, 0);
    scene.add(storePointLight);

    // 5. Floor (Light polished tile with soft grid)
    const floorGeo = new THREE.PlaneGeometry(36, 36);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeea,
      roughness: 0.35,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'store-floor';
    scene.add(floor);

    // Floor subtle grid lines
    const grid = new THREE.GridHelper(36, 36, 0xd0cfc8, 0xe4e3dc);
    grid.position.y = 0.002;
    scene.add(grid);

    // 6. Ceiling & Access Point (Sub-1 GHz Gateway Hub)
    const ceilingGeo = new THREE.PlaneGeometry(36, 36);
    const ceilingMat = new THREE.MeshBasicMaterial({ color: 0xf4f4f0, side: THREE.DoubleSide });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.position.y = 5.2;
    ceiling.rotation.x = Math.PI / 2;
    scene.add(ceiling);

    // Ceiling Gateway Access Points
    const apGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 24);
    const apMat = new THREE.MeshStandardMaterial({ color: 0x1f2328, roughness: 0.4 });
    const apMesh = new THREE.Mesh(apGeo, apMat);
    apMesh.position.set(0, 5.14, 0);
    scene.add(apMesh);

    // Gateway Active LED (Cyan)
    const apLedGeo = new THREE.SphereGeometry(0.04, 12, 12);
    const apLedMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 2.0 });
    const apLed = new THREE.Mesh(apLedGeo, apLedMat);
    apLed.position.set(0, 5.08, 0);
    scene.add(apLed);

    // -----------------------------------------------------------------
    // Build Store Shelving & Mount Real E-Paper Tags
    // -----------------------------------------------------------------
    tagMeshesRef.current.clear();

    const shelfMetalMat = new THREE.MeshStandardMaterial({
      color: 0xd8dbe2, // Clean modern light-grey retail shelving
      roughness: 0.4,
      metalness: 0.2,
    });

    const railMat = new THREE.MeshStandardMaterial({
      color: 0x23272d, // Dark extruded mounting rail
      roughness: 0.6,
    });

    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x23272d, // Dark injection-molded tag plastic
      roughness: 0.5,
    });

    // -------------------------------------------------------------
    // Instanced Shelving & Product Meshes (High Performance < 50 Draw Calls)
    // -------------------------------------------------------------
    const numAisles = store.aisles.length;
    const numRows = numAisles * 2;
    const numTiers = 4;
    const tiers = [0.45, 1.05, 1.65, 2.25];
    const pPositions = [-1.8, -1.35, -0.9, -0.45, 0, 0.45, 0.9, 1.35, 1.8];

    const totalUprights = numRows * 2;
    const totalBackPanels = numRows;
    const totalShelves = numRows * numTiers;
    const totalRails = numRows * numTiers;

    const isSupermarket = store.type === 'supermarket';
    const totalBottles = isSupermarket ? numRows * pPositions.length : 0;
    const totalBoxes = isSupermarket
      ? numRows * (numTiers - 1) * pPositions.length
      : numRows * numTiers * pPositions.length;

    // Instanced geometries
    const uprightGeo = new THREE.BoxGeometry(0.08, 2.8, 0.08);
    const backPanelGeo = new THREE.BoxGeometry(0.04, 2.7, 4.4);
    const shelfGeo = new THREE.BoxGeometry(0.65, 0.04, 4.3);
    const railGeo = new THREE.BoxGeometry(0.03, 0.08, 4.3);
    const boxGeo = new THREE.BoxGeometry(0.3, 0.4, 0.35);
    const bottleGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.45, 12);

    const uprightMesh = new THREE.InstancedMesh(uprightGeo, shelfMetalMat, totalUprights);
    uprightMesh.castShadow = true;
    uprightMesh.receiveShadow = true;

    const backPanelMesh = new THREE.InstancedMesh(backPanelGeo, shelfMetalMat, totalBackPanels);
    backPanelMesh.receiveShadow = true;

    const shelfMesh = new THREE.InstancedMesh(shelfGeo, shelfMetalMat, totalShelves);
    shelfMesh.castShadow = true;
    shelfMesh.receiveShadow = true;

    const railMesh = new THREE.InstancedMesh(railGeo, railMat, totalRails);

    const boxPalette = [
      new THREE.Color(0x9a3412), // Atta
      new THREE.Color(0x1e3a8a), // Basmati
      new THREE.Color(0xd97706), // Toor Dal
      new THREE.Color(0x047857), // Moong Dal
      new THREE.Color(0xb91c1c), // Spices
      new THREE.Color(0xf59e0b), // Golden Ghee
    ];
    const boxMat = new THREE.MeshStandardMaterial({ roughness: 0.5 });
    const boxMesh = new THREE.InstancedMesh(boxGeo, boxMat, totalBoxes);
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;

    let bottleMesh: THREE.InstancedMesh | null = null;
    if (totalBottles > 0) {
      const bottleMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });
      bottleMesh = new THREE.InstancedMesh(bottleGeo, bottleMat, totalBottles);
      bottleMesh.castShadow = true;
      bottleMesh.receiveShadow = true;
    }

    const dummy = new THREE.Object3D();
    let uprightIdx = 0;
    let backPanelIdx = 0;
    let shelfIdx = 0;
    let railIdx = 0;
    let boxIdx = 0;
    let bottleIdx = 0;

    store.aisles.forEach((aisle, aIdx) => {
      const aisleZ = (aIdx - store.aisles.length / 2) * 4.5;
      const rows = [
        { side: 'left', x: -1.8 },
        { side: 'right', x: 1.8 },
      ];

      rows.forEach((row) => {
        // Upright post left
        dummy.position.set(row.x, 1.4, aisleZ - 2.2);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        uprightMesh.setMatrixAt(uprightIdx++, dummy.matrix);

        // Upright post right
        dummy.position.set(row.x, 1.4, aisleZ + 2.2);
        dummy.updateMatrix();
        uprightMesh.setMatrixAt(uprightIdx++, dummy.matrix);

        // Back panel
        dummy.position.set(row.x + (row.side === 'left' ? -0.3 : 0.3), 1.4, aisleZ);
        dummy.updateMatrix();
        backPanelMesh.setMatrixAt(backPanelIdx++, dummy.matrix);

        // 4 tiers
        tiers.forEach((tierY, tIdx) => {
          // Shelf board
          dummy.position.set(row.x, tierY, aisleZ);
          dummy.scale.set(1, 1, 1);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          shelfMesh.setMatrixAt(shelfIdx++, dummy.matrix);

          // Dark mounting rail
          const railOffset = row.side === 'left' ? 0.33 : -0.33;
          dummy.position.set(row.x + railOffset, tierY - 0.01, aisleZ);
          dummy.updateMatrix();
          railMesh.setMatrixAt(railIdx++, dummy.matrix);

          // Products
          pPositions.forEach((p) => {
            const isBottle = tIdx === 0 && isSupermarket;
            if (isBottle && bottleMesh) {
              dummy.position.set(row.x + (row.side === 'left' ? 0.1 : -0.1), tierY + 0.225, aisleZ + p);
              dummy.scale.set(1, 1, 1);
              dummy.rotation.set(0, 0, 0);
              dummy.updateMatrix();
              bottleMesh.setMatrixAt(bottleIdx++, dummy.matrix);
            } else {
              const heightScale = 0.95 + ((Math.abs(p * 10)) % 3) * 0.15;
              dummy.position.set(row.x + (row.side === 'left' ? 0.05 : -0.05), tierY + 0.2 * heightScale + 0.02, aisleZ + p);
              dummy.scale.set(1, heightScale, 1);
              dummy.rotation.set(0, 0, 0);
              dummy.updateMatrix();
              boxMesh.setMatrixAt(boxIdx, dummy.matrix);
              const color = boxPalette[Math.floor(Math.abs(p * 5 + tIdx)) % boxPalette.length];
              boxMesh.setColorAt(boxIdx, color);
              boxIdx++;
            }
          });
        });
      });
    });

    uprightMesh.instanceMatrix.needsUpdate = true;
    backPanelMesh.instanceMatrix.needsUpdate = true;
    shelfMesh.instanceMatrix.needsUpdate = true;
    railMesh.instanceMatrix.needsUpdate = true;
    boxMesh.instanceMatrix.needsUpdate = true;
    if (boxMesh.instanceColor) boxMesh.instanceColor.needsUpdate = true;

    scene.add(uprightMesh);
    scene.add(backPanelMesh);
    scene.add(shelfMesh);
    scene.add(railMesh);
    scene.add(boxMesh);
    if (bottleMesh) {
      bottleMesh.instanceMatrix.needsUpdate = true;
      scene.add(bottleMesh);
    }

    // Mount physical ESL tags and hanging signs per aisle
    store.aisles.forEach((aisle, aIdx) => {
      const aisleZ = (aIdx - store.aisles.length / 2) * 4.5;

      // Mount physical ESL Tags along the shelves of this aisle
      aisle.shelves.forEach((shelf) => {
        shelf.tags.forEach((tag) => {
          const dims = getTagPixelDimensions(tag.size);
          const worldWidth = tag.size === '1.54' ? 0.22 : tag.size === '2.13' ? 0.36 : tag.size === '2.9' ? 0.42 : 0.58;
          const worldHeight = worldWidth / dims.aspectRatio;

          // 1. Offscreen Canvas for e-paper texture
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

          // 3. Tag Bezel Casing (Physical hardware)
          const tagGroup = new THREE.Group();
          const casingGeo = new THREE.BoxGeometry(worldWidth + 0.02, worldHeight + 0.02, 0.015);
          const casingMesh = new THREE.Mesh(casingGeo, bezelMat);
          tagGroup.add(casingMesh);

          // 4. Tag Screen Face
          const screenGeo = new THREE.PlaneGeometry(worldWidth, worldHeight);
          const screenMat = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.9, // Matte e-paper paper finish
            metalness: 0.0,
          });
          const screenMesh = new THREE.Mesh(screenGeo, screenMat);
          screenMesh.position.z = 0.009;
          screenMesh.name = `tag-${tag.id}`;
          tagGroup.add(screenMesh);

          // 5. Pick-to-light LED Bead (Top right corner of bezel)
          const ledGeo = new THREE.SphereGeometry(0.01, 8, 8);
          const ledMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.2,
          });
          const ledMesh = new THREE.Mesh(ledGeo, ledMat);
          ledMesh.position.set(worldWidth / 2 - 0.01, worldHeight / 2 - 0.01, 0.01);
          tagGroup.add(ledMesh);

          // Position Tag on Left row shelf rail
          const tierY = shelf.tierNumber === 1 ? 1.65 : 1.05;
          tagGroup.position.set(-1.47, tierY - 0.01, aisleZ + tag.positionX);
          tagGroup.rotation.y = Math.PI / 2;
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

        cameraYawRef.current -= deltaX * 0.003;
        cameraPitchRef.current = Math.max(-0.6, Math.min(0.6, cameraPitchRef.current - deltaY * 0.003));

        const lookDir = new THREE.Vector3(
          Math.sin(cameraYawRef.current) * Math.cos(cameraPitchRef.current),
          Math.sin(cameraPitchRef.current),
          -Math.cos(cameraYawRef.current) * Math.cos(cameraPitchRef.current)
        );
        cameraTargetRef.current.copy(cameraPosRef.current).add(lookDir);
        camera.lookAt(cameraTargetRef.current);
        return;
      }

      // 2. Hover detection over tags
      const intersects = getRaycastIntersects(e);
      let foundTag: TagData | null = null;

      for (const hit of intersects) {
        if (hit.object.name && hit.object.name.startsWith('tag-')) {
          const tagId = hit.object.name.replace('tag-', '');
          const tagRef = tagMeshesRef.current.get(tagId);
          if (tagRef) {
            foundTag = tagRef.tag;
            break;
          }
        }
      }

      if (foundTag !== hoveredTagRef.current) {
        hoveredTagRef.current = foundTag;
        container.style.cursor = foundTag ? 'pointer' : 'default';
        onHoverTag(foundTag, foundTag ? { x: e.clientX, y: e.clientY } : undefined);
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
            onSelectTag(tagRef.tag);

            // Glide camera in front of the tag
            const tagWorldPos = new THREE.Vector3();
            hit.object.getWorldPosition(tagWorldPos);
            const viewPos = tagWorldPos.clone().add(new THREE.Vector3(0.65, 0.05, 0));
            glideTo(viewPos, tagWorldPos, 700);
            return;
          }
        }

        // Floor Click -> Teleport
        if (hit.object.name === 'store-floor') {
          const targetPoint = hit.point.clone();
          targetPoint.y = 1.6; // Keep at eye height
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
    // Render & Animation Loop (60 FPS)
    // -----------------------------------------------------------------
    let animationFrameId: number;

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);

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
        cameraYawRef.current = Math.atan2(lookDir.x, -lookDir.z);
        cameraPitchRef.current = Math.asin(Math.max(-0.99, Math.min(0.99, lookDir.y)));

        if (onCameraMove) {
          onCameraMove([currentPos.x, currentPos.y, currentPos.z], cameraYawRef.current);
        }

        if (progress >= 1) {
          isGlidingRef.current = false;
          glideStartRef.current = null;
        }
      } else {
        // 2. Keyboard Movement (WASD) with Gondola Shelf Collision
        const moveSpeed = 0.06;
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

        if (moveDir.lengthSq() > 0) {
          moveDir.normalize().multiplyScalar(moveSpeed);
          const targetX = Math.max(-4.5, Math.min(4.5, camera.position.x + moveDir.x));
          const targetZ = Math.max(-12, Math.min(12, camera.position.z + moveDir.z));

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

          if (onCameraMove) {
            onCameraMove([camera.position.x, camera.position.y, camera.position.z], cameraYawRef.current);
          }
        }
      }

      // Pick-to-Light LED dynamic pulsing
      if (locatingTagId) {
        const tagRef = tagMeshesRef.current.get(locatingTagId);
        if (tagRef) {
          const pulse = (Math.sin(time * 0.008) + 1) * 2;
          tagRef.ledMaterial.emissiveIntensity = 2.0 + pulse;
        }
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
  }, [store, glideTo, onSelectTag, onHoverTag, onCameraMove]);

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
