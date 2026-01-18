"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { TextItem, SearchResult } from "../types";
import { getCategoryColor } from "../types";

interface Visualization3DProps {
  items: TextItem[];
  selectedPointId: string | null;
  hoveredPointId: string | null;
  searchResults: SearchResult[];
  onSelectPoint: (id: string | null) => void;
  onHoverPoint: (id: string | null) => void;
}

const POINT_SIZE = 0.08;
const SELECTED_SIZE = 0.12;
const HOVER_SIZE = 0.10;

export default function Visualization3D({
  items,
  selectedPointId,
  hoveredPointId,
  searchResults,
  onSelectPoint,
  onHoverPoint,
}: Visualization3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const pointsRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const animationRef = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Points with valid projections
  const projectedItems = useMemo(
    () => items.filter((item) => item.x !== null && item.y !== null && item.z !== null),
    [items]
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
      const meshes = Array.from(pointsRef.current.values());
      const intersects = raycasterRef.current.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const id = hit.userData.id;
        onHoverPoint(id);

        // Update tooltip
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
      {projectedItems.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-neutral-500">
          Add some texts to visualize embeddings in 3D
        </div>
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute hidden px-3 py-1.5 bg-black/90 text-white text-xs rounded pointer-events-none z-10 max-w-xs"
      />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 text-xs text-neutral-400 bg-black/60 px-3 py-2 rounded">
        <div>Drag to rotate | Scroll to zoom</div>
        {searchResults.length > 0 && (
          <div className="mt-1 text-amber-400">Search results highlighted</div>
        )}
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 text-xs text-neutral-400 bg-black/60 px-3 py-2 rounded">
        {projectedItems.length} points in 3D space
      </div>
    </div>
  );
}
