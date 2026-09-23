import React, { useState, useMemo, Component } from "react";
import type { ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Grid,
  useGLTF,
} from "@react-three/drei";
import {
  randomPosition,
  randomRotation,
  randomScale,
  randomLightIntensity,
  randomColor,
} from "../utils/randomization";

interface SceneViewerProps {
  randomize?: number;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  onModelError?: (hasError: boolean) => void;
}

interface ErrorBoundaryProps {
  fallback: ReactNode;
  onError: () => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ModelErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    console.warn("GLTF Model loading failed, using fallback primitive:", error);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface PrimitiveProps {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  color: string;
}

function FallbackMesh({ position, rotation, scale, color }: PrimitiveProps) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
      {/* Decorative inner cube accent */}
      <mesh position={[0, 0.5, 0]} scale={0.5}>
        <boxGeometry args={[1.02, 1.02, 1.02]} />
        <meshStandardMaterial color="#ffffff" wireframe />
      </mesh>
    </group>
  );
}

function GLTFModel({
  position,
  rotation,
  scale,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}) {
  const { scene } = useGLTF("/models/object.glb");
  return (
    <primitive
      object={scene}
      scale={scale}
      position={position}
      rotation={rotation}
    />
  );
}

export default function SceneViewer({
  randomize = 0,
  onCanvasReady,
  onModelError,
}: SceneViewerProps) {
  // Generate randomized properties based on `randomize` prop
  const transform = useMemo(() => {
    if (randomize === 0) {
      return {
        position: [0, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        scale: 1,
        color: "#3b82f6",
        lightIntensity: 2,
      };
    }
    return {
      position: randomPosition(),
      rotation: randomRotation(),
      scale: randomScale(),
      color: randomColor(),
      lightIntensity: randomLightIntensity(),
    };
  }, [randomize]);

  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    setHasError(true);
    if (onModelError) {
      onModelError(true);
    }
  };

  return (
    <Canvas
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{
        position: [3, 2, 5],
        fov: 50,
      }}
      onCreated={({ gl }) => {
        if (onCanvasReady) {
          onCanvasReady(gl.domElement);
        }
      }}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.8} />

      <directionalLight
        position={[5, 8, 5]}
        intensity={transform.lightIntensity}
        castShadow
      />

      {/* 3D Model with Fallback Error Boundary */}
      {!hasError ? (
        <ModelErrorBoundary
          onError={handleError}
          fallback={
            <FallbackMesh
              position={transform.position}
              rotation={transform.rotation}
              scale={transform.scale}
              color={transform.color}
            />
          }
        >
          <React.Suspense
            fallback={
              <FallbackMesh
                position={transform.position}
                rotation={transform.rotation}
                scale={transform.scale}
                color={transform.color}
              />
            }
          >
            <GLTFModel
              position={transform.position}
              rotation={transform.rotation}
              scale={transform.scale}
            />
          </React.Suspense>
        </ModelErrorBoundary>
      ) : (
        <FallbackMesh
          position={transform.position}
          rotation={transform.rotation}
          scale={transform.scale}
          color={transform.color}
        />
      )}

      {/* Ground Grid */}
      <Grid
        infiniteGrid
        fadeDistance={30}
        cellColor="#444"
        sectionColor="#666"
      />

      {/* Camera Controls */}
      <OrbitControls makeDefault />

      {/* Environment Lighting */}
      <Environment preset="studio" />
    </Canvas>
  );
}