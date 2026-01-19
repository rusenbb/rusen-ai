"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { TextItem, SearchResult, VocabWord, ProjectionMode } from "../types";
import { getCategoryColor } from "../types";

interface Visualization3DProps {
  items: TextItem[];
  vocabulary: VocabWord[];
  selectedPointId: string | null;
  hoveredPointId: string | null;
  searchResults: SearchResult[];
  axisLabels: { x: string | null; y: string | null; z: string | null };
  projectionMode: ProjectionMode;
  arithmeticResult: { x: number; y: number; z: number } | null;
  onSelectPoint: (id: string | null) => void;
  onHoverPoint: (id: string | null) => void;
}

const POINT_SIZE = 0.08;
const SELECTED_SIZE = 0.12;
const HOVER_SIZE = 0.10;
const VOCAB_SIZE = 0.03;

export default function Visualization3D({
  items,
  vocabulary,
  selectedPointId,
  hoveredPointId,
  searchResults,
  axisLabels,
  projectionMode,
  arithmeticResult,
  onSelectPoint,
  onHoverPoint,
}: Visualization3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const pointsRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const vocabPointsRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const axisLabelsRef = useRef<THREE.Group | null>(null);
  const arithmeticMarkerRef = useRef<THREE.Mesh | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const animationRef = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Points with valid projections
  const projectedItems = useMemo(
    () => items.filter((item) => item.x !== null && item.y !== null && item.z !== null),
    [items]
  );

  // Vocabulary with valid projections
  const projectedVocab = useMemo(
    () => vocabulary.filter((v) => v.x !== null && v.y !== null && v.z !== null),
    [vocabulary]
  );

  // Search result IDs for highlighting
  const searchResultIds = useMemo(
    () => new Set(searchResults.map((r) => r.item.id)),
    [searchResults]
  );

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(2, 2, 2);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controlsRef.current = controls;

    // Grid helper
    const gridHelper = new THREE.GridHelper(2, 10, 0x444444, 0x222222);
    gridHelper.position.y = -1;
    scene.add(gridHelper);

    // Axis helper
    const axisHelper = new THREE.AxesHelper(1.2);
    axisHelper.position.set(-1, -1, -1);
    scene.add(axisHelper);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update points when items change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old points
    pointsRef.current.forEach((mesh) => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    });
    pointsRef.current.clear();

    // Add new points
    for (const item of projectedItems) {
      if (item.x === null || item.y === null || item.z === null) continue;

      const isSelected = item.id === selectedPointId;
      const isHovered = item.id === hoveredPointId;
      const isSearchResult = searchResultIds.has(item.id);

      // Determine size
      let size = POINT_SIZE;
      if (isSelected) size = SELECTED_SIZE;
      else if (isHovered) size = HOVER_SIZE;

      // Create sphere
      const geometry = new THREE.SphereGeometry(size, 16, 16);
      const color = new THREE.Color(getCategoryColor(item.category));

      // Create material with emissive for highlighted points
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: isSearchResult || isSelected || isHovered ? color : new THREE.Color(0x000000),
        emissiveIntensity: isSearchResult ? 0.5 : isSelected || isHovered ? 0.3 : 0,
        metalness: 0.3,
        roughness: 0.7,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(item.x, item.y, item.z);
      mesh.userData = { id: item.id, text: item.text, category: item.category };

      scene.add(mesh);
      pointsRef.current.set(item.id, mesh);
    }
  }, [projectedItems, selectedPointId, hoveredPointId, searchResultIds]);

  // Update vocabulary points
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old vocab points
    vocabPointsRef.current.forEach((mesh) => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    });
    vocabPointsRef.current.clear();

    // Add vocabulary as smaller, semi-transparent points
    for (const word of projectedVocab) {
      if (word.x === null || word.y === null || word.z === null) continue;

      const geometry = new THREE.SphereGeometry(VOCAB_SIZE, 8, 8);
      const material = new THREE.MeshStandardMaterial({
        color: 0x6366f1,
        transparent: true,
        opacity: 0.4,
        metalness: 0.2,
        roughness: 0.8,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(word.x, word.y, word.z);
      mesh.userData = { id: word.id, text: word.text, isVocab: true };

      scene.add(mesh);
      vocabPointsRef.current.set(word.id, mesh);
    }
  }, [projectedVocab]);

  // Update axis labels for semantic axes mode
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old axis labels
    if (axisLabelsRef.current) {
      scene.remove(axisLabelsRef.current);
      axisLabelsRef.current = null;
    }

    // Only show labels in semantic axes mode
    if (projectionMode !== "semantic-axes") return;
    if (!axisLabels.x && !axisLabels.y && !axisLabels.z) return;

    const labelGroup = new THREE.Group();

    // Create axis lines and labels
    const createAxisLine = (
      direction: THREE.Vector3,
      color: number,
      label: string | null
    ) => {
      if (!label) return;

      // Line from -1 to +1 along the axis
      const points = [
        direction.clone().multiplyScalar(-1),
        direction.clone().multiplyScalar(1),
      ];
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.5,
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      labelGroup.add(line);

      // Arrow at positive end
      const arrowHelper = new THREE.ArrowHelper(
        direction.clone().normalize(),
        direction.clone().multiplyScalar(0.9),
        0.15,
        color,
        0.08,
        0.05
      );
      labelGroup.add(arrowHelper);
    };

    createAxisLine(new THREE.Vector3(1, 0, 0), 0xff4444, axisLabels.x);
    createAxisLine(new THREE.Vector3(0, 1, 0), 0x44ff44, axisLabels.y);
    createAxisLine(new THREE.Vector3(0, 0, 1), 0x4444ff, axisLabels.z);

    axisLabelsRef.current = labelGroup;
    scene.add(labelGroup);
  }, [axisLabels, projectionMode]);

  // Update arithmetic result marker
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old marker
    if (arithmeticMarkerRef.current) {
      scene.remove(arithmeticMarkerRef.current);
      arithmeticMarkerRef.current.geometry.dispose();
      if (arithmeticMarkerRef.current.material instanceof THREE.Material) {
        arithmeticMarkerRef.current.material.dispose();
      }
      arithmeticMarkerRef.current = null;
    }

    if (!arithmeticResult) return;

    // Create a star/diamond shape for the arithmetic result
    const geometry = new THREE.OctahedronGeometry(0.1);
    const material = new THREE.MeshStandardMaterial({
      color: 0xfbbf24, // amber
      emissive: 0xfbbf24,
      emissiveIntensity: 0.5,
      metalness: 0.5,
      roughness: 0.3,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(arithmeticResult.x, arithmeticResult.y, arithmeticResult.z);
    mesh.userData = { isArithmeticResult: true };

    arithmeticMarkerRef.current = mesh;
    scene.add(mesh);
  }, [arithmeticResult]);

  // Handle mouse events for interaction
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      const camera = cameraRef.current;
      const scene = sceneRef.current;
      const tooltip = tooltipRef.current;

      if (!container || !camera || !scene) return;

      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      // Include both main points and vocabulary
      const allMeshes = [
        ...Array.from(pointsRef.current.values()),
        ...Array.from(vocabPointsRef.current.values()),
      ];
      const intersects = raycasterRef.current.intersectObjects(allMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const id = hit.userData.id;
        const isVocab = hit.userData.isVocab;

        // Only hover for main points (not vocab)
        if (!isVocab) {
          onHoverPoint(id);
        }

        // Update tooltip for both
        if (tooltip) {
          tooltip.style.display = "block";
          tooltip.style.left = `${e.clientX - rect.left + 10}px`;
          tooltip.style.top = `${e.clientY - rect.top - 10}px`;
          const text = hit.userData.text || "";
          tooltip.textContent = text.length > 60 ? text.slice(0, 60) + "..." : text;
        }
      } else {
        onHoverPoint(null);
        if (tooltip) {
          tooltip.style.display = "none";
        }
      }
    },
    [onHoverPoint]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      const camera = cameraRef.current;

      if (!container || !camera) return;

      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      // Only select main points, not vocabulary
      const meshes = Array.from(pointsRef.current.values());
      const intersects = raycasterRef.current.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        onSelectPoint(hit.userData.id);
      } else {
        onSelectPoint(null);
      }
    },
    [onSelectPoint]
  );

  const handleMouseLeave = useCallback(() => {
    onHoverPoint(null);
    if (tooltipRef.current) {
      tooltipRef.current.style.display = "none";
    }
  }, [onHoverPoint]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[500px] border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-neutral-900"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onMouseLeave={handleMouseLeave}
    >
      {/* Empty state */}
      {projectedItems.length === 0 && projectedVocab.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-neutral-500 text-center px-4">
          {projectionMode === "semantic-axes" ? (
            <div>
              <p>Define semantic axes and assign them to X/Y/Z</p>
              <p className="text-xs mt-1">Then add texts to see them projected</p>
            </div>
          ) : (
            <p>Add some texts to visualize embeddings in 3D</p>
          )}
        </div>
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute hidden px-3 py-1.5 bg-black/90 text-white text-xs rounded pointer-events-none z-10 max-w-xs"
      />

      {/* Axis labels overlay */}
      {projectionMode === "semantic-axes" && (axisLabels.x || axisLabels.y || axisLabels.z) && (
        <div className="absolute top-4 left-4 text-xs bg-black/60 px-3 py-2 rounded space-y-1">
          {axisLabels.x && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-red-500" />
              <span className="text-red-400">X: {axisLabels.x}</span>
            </div>
          )}
          {axisLabels.y && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-green-500" />
              <span className="text-green-400">Y: {axisLabels.y}</span>
            </div>
          )}
          {axisLabels.z && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-blue-500" />
              <span className="text-blue-400">Z: {axisLabels.z}</span>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 text-xs text-neutral-400 bg-black/60 px-3 py-2 rounded">
        <div>Drag to rotate | Scroll to zoom</div>
        {searchResults.length > 0 && (
          <div className="mt-1 text-amber-400">Search results highlighted</div>
        )}
        {arithmeticResult && (
          <div className="mt-1 text-amber-400">
            <span className="inline-block w-2 h-2 bg-amber-400 rotate-45 mr-1" />
            Arithmetic result
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 text-xs text-neutral-400 bg-black/60 px-3 py-2 rounded">
        <div>{projectedItems.length} texts</div>
        {projectedVocab.length > 0 && (
          <div className="text-neutral-500">{projectedVocab.length} vocab words</div>
        )}
        <div className="text-neutral-500 mt-1">
          Mode: {projectionMode === "semantic-axes" ? "Semantic" : "UMAP"}
        </div>
      </div>
    </div>
  );
}
