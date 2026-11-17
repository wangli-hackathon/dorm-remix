import { OrbitControls, RoundedBox, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Component, Suspense, useEffect, useImperativeHandle, useMemo, useRef, forwardRef, type ReactNode, type Ref } from "react";
import * as THREE from "three";
import { aabbOf, blocksWalk, moveWithCollision } from "../lib/planner/geometry.ts";
import { PALETTES } from "../lib/planner/palette.ts";
import type { Shot } from "../lib/planner/script.ts";
import type { Plan, Solid } from "../lib/planner/types.ts";

export type SceneHandle = {
  capture: (shot: Shot) => string;
  lockPointer: () => void;
};

type Models = Record<string, string | undefined>;

export const DormScene = forwardRef<SceneHandle, { plan: Plan; time: number; walk: boolean; stick: { x: number; y: number }; models: Models; signText: string; shadows: boolean }>(
  function DormScene({ plan, time, walk, stick, models, signText, shadows }, ref) {
    return (
      <Canvas
        shadows={shadows}
        dpr={[1, 1.6]}
        gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping }}
        camera={{ position: [0, 1.48, plan.room.depth / 2 - 0.36], fov: 42, near: 0.05, far: 40 }}
      >
        <SceneBody plan={plan} time={time} walk={walk} stick={stick} models={models} signText={signText} handleRef={ref} />
      </Canvas>
    );
  },
);

function SceneBody({ plan, time, walk, stick, models, signText, handleRef }: { plan: Plan; time: number; walk: boolean; stick: { x: number; y: number }; models: Models; signText: string; handleRef: Ref<SceneHandle> }) {
  const { gl, camera, scene } = useThree();
  const palette = PALETTES[plan.brief.style];
  const night = time;
  const sun = plan.lighting.afternoonDirect ? (1 - night) * 1.7 : (1 - night) * 0.28;
  const fluo = plan.selections.lampBeds > 0 ? 0.12 + night * 0.2 : 0.25 + night * 1.1;
  const sky = plan.lighting.afternoonDirect ? lerpColor("#c9b59a", "#141b27", night) : lerpColor("#8ea8c2", "#141b27", night);
  const boxes = useMemo(() => plan.solids.filter(blocksWalk).map(aabbOf), [plan.solids]);

  useImperativeHandle(handleRef, () => ({
    capture(shot: Shot) {
      const cam = camera as THREE.PerspectiveCamera;
      const position = cam.position.clone();
      const quaternion = cam.quaternion.clone();
      cam.position.set(shot.position[0], shot.position[1], shot.position[2]);
      cam.lookAt(shot.target[0], shot.target[1], shot.target[2]);
      cam.updateMatrixWorld();
      gl.render(scene, cam);
      const picture = gl.domElement.toDataURL("image/png");
      cam.position.copy(position);
      cam.quaternion.copy(quaternion);
      return picture;
    },
    lockPointer() {
      gl.domElement.requestPointerLock();
    },
  }));

  return (
    <>
      <color attach="background" args={[sky]} />
      <hemisphereLight args={["#d7e4f1", palette.floor, 0.42]} />
      <directionalLight position={[0.4, 3.2, -plan.room.depth]} intensity={sun} color={plan.lighting.afternoonDirect ? "#ffd7b0" : "#d5e4f4"} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[0, plan.room.height - 0.25, 0]} intensity={fluo * 1.8} distance={7} color="#e7eefc" />
      {plan.solids.filter((solid) => solid.id.startsWith("lamp-shade")).map((solid) => (
        <pointLight key={solid.id} position={[solid.position[0], solid.position[1], solid.position[2]]} intensity={night * 3.4} distance={2.2} color="#ffb15e" />
      ))}
      <Shell plan={plan} wall={palette.wall} floor={palette.floor} night={night} />
      {plan.solids.map((solid) => (
        <SolidView key={solid.id} solid={solid} models={models} signText={signText} />
      ))}
      {plan.brief.style === "warm-wood" ? <StringLights depth={plan.room.depth} time={night} /> : null}
      <Walker enabled={walk} stick={stick} room={plan.room} boxes={boxes} />
      <OrbitControls enabled={!walk} makeDefault target={[0, 1.05, 0]} maxPolarAngle={Math.PI / 2.05} minDistance={0.4} maxDistance={Math.max(plan.room.depth, 6)} enablePan={false} />
    </>
  );
}

function Shell({ plan, wall, floor, night }: { plan: Plan; wall: string; floor: string; night: number }) {
  const { width, depth, height } = plan.room;
  const halfW = width / 2;
  const halfD = depth / 2;
  const opening = 1.16;
  const sill = 0.92;
  const head = 2.12;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={floor} roughness={0.92} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, height, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#f7f4ee" roughness={0.95} />
      </mesh>
      <Slab position={[-(halfW + opening / 2) / 2, height / 2, -halfD]} size={[halfW - opening / 2, height, 0.08]} color={wall} />
      <Slab position={[(halfW + opening / 2) / 2, height / 2, -halfD]} size={[halfW - opening / 2, height, 0.08]} color={wall} />
      <Slab position={[0, (height + head) / 2, -halfD]} size={[opening, height - head, 0.08]} color={wall} />
      <Slab position={[0, sill / 2, -halfD]} size={[opening, sill, 0.08]} color={wall} />
      <Slab position={[0, height / 2, halfD]} size={[width, height, 0.08]} color={wall} />
      <Slab position={[-halfW, height / 2, 0]} size={[0.08, height, depth]} color={wall} />
      <Slab position={[halfW, height / 2, 0]} size={[0.08, height, depth]} color={wall} />
      <mesh position={[0, 1.5, -halfD + 0.03]}>
        <planeGeometry args={[opening - 0.08, head - sill - 0.08]} />
        <meshStandardMaterial color="#c5d7e8" transparent opacity={0.35} roughness={0.05} />
      </mesh>
      <mesh position={[0, 1.6, -halfD - 0.45]}>
        <boxGeometry args={[width + 0.4, 3.2, 0.2]} />
        <meshStandardMaterial color={night > 0.55 ? "#1a2433" : "#9eb4c9"} />
      </mesh>
      {[-0.7, 0.15, 0.85].map((x) => (
        <mesh key={x} position={[x, 1.7 + (x > 0 ? 0.2 : 0), -halfD - 0.34]}>
          <planeGeometry args={[0.28, 0.36]} />
          <meshStandardMaterial color="#ffbf73" emissive="#ffbf73" emissiveIntensity={0.6 + night} />
        </mesh>
      ))}
      <mesh position={[0, height - 0.05, 0]}>
        <boxGeometry args={[0.95, 0.03, 0.14]} />
        <meshStandardMaterial color="#e7eef8" emissive="#d9e4ff" emissiveIntensity={0.4 + night} />
      </mesh>
    </group>
  );
}

function Slab({ position, size, color }: { position: [number, number, number]; size: [number, number, number]; color: string }) {
  return (
    <mesh position={position} receiveShadow castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.92} />
    </mesh>
  );
}

function SolidView({ solid, models, signText }: { solid: Solid; models: Models; signText: string }) {
  if (solid.role === "sign") return <SignBoard position={solid.position} text={signText} />;
  if (skipSolid(solid, models)) return null;
  const url = modelUrlFor(solid, models);
  if (!url) return <Procedural solid={solid} />;
  return (
    <ModelBoundary fallback={<Procedural solid={solid} />}>
      <Suspense fallback={<Procedural solid={solid} />}>
        <FittedGlb url={url} solid={solid} />
      </Suspense>
    </ModelBoundary>
  );
}

function Procedural({ solid }: { solid: Solid }) {
  const minDim = Math.min(...solid.size);
  const material = <meshStandardMaterial color={solid.color} roughness={solid.roughness} metalness={solid.metalness} />;
  return (
    <group>
      {minDim < 0.05 ? (
        <mesh position={solid.position} castShadow receiveShadow>
          <boxGeometry args={solid.size} />
          {material}
        </mesh>
      ) : (
        <RoundedBox args={solid.size} radius={Math.min(0.02, minDim * 0.25)} smoothness={2} position={solid.position} castShadow receiveShadow>
          {material}
        </RoundedBox>
      )}
      {solid.label ? <BedTag text={solid.label} position={[solid.position[0], solid.position[1] + solid.size[1] / 2 + 0.08, solid.position[2]]} /> : null}
    </group>
  );
}

function FittedGlb({ url, solid }: { url: string; solid: Solid }) {
  const gltf = useGLTF(url);
  const object = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const fit = Math.min(solid.size[0] / Math.max(size.x, 0.001), solid.size[1] / Math.max(size.y, 0.001), solid.size[2] / Math.max(size.z, 0.001));
    const scale = Number.isFinite(fit) ? fit : 1;
    clone.scale.multiplyScalar(scale);
    clone.position.set(-center.x * scale, -box.min.y * scale - solid.size[1] / 2, -center.z * scale);
    return clone;
  }, [gltf.scene, solid.size]);
  return <primitive object={object} position={solid.position} />;
}

function SignBoard({ position, text }: { position: [number, number, number]; text: string }) {
  const texture = useMemo(() => makeLabel(text, "#f4efe4", "#241910", "#c6532d"), [text]);
  return (
    <mesh position={position}>
      <planeGeometry args={[0.46, 0.26]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function BedTag({ text, position }: { text: string; position: [number, number, number] }) {
  const texture = useMemo(() => makeLabel(text, "#fffaf2", "#241910", "#e7d8c3"), [text]);
  return (
    <mesh position={position}>
      <planeGeometry args={[0.22, 0.12]} />
      <meshBasicMaterial map={texture} toneMapped={false} transparent />
    </mesh>
  );
}

function StringLights({ depth, time }: { depth: number; time: number }) {
  return (
    <group>
      {Array.from({ length: 7 }, (_, index) => (
        <mesh key={index} position={[Math.sin(index * 1.3) * 0.12, 2.25, -depth / 2 + 1.1 + index * ((depth - 2) / 7)]}>
          <sphereGeometry args={[0.028, 10, 10]} />
          <meshStandardMaterial color="#ffb15a" emissive="#ff9a3c" emissiveIntensity={0.3 + time * 1.8} />
        </mesh>
      ))}
    </group>
  );
}

function Walker({ enabled, stick, room, boxes }: { enabled: boolean; stick: { x: number; y: number }; room: Plan["room"]; boxes: ReturnType<typeof aabbOf>[] }) {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const yaw = useRef(0);
  const pitch = useRef(-0.08);
  const pos = useRef({ x: 0, z: room.depth / 2 - 0.5 });

  useEffect(() => {
    if (!enabled) return;
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keys.current[key] = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
    };
    const up = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = false;
    };
    const move = (event: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) return;
      yaw.current -= event.movementX * 0.0022;
      pitch.current = Math.max(-0.7, Math.min(0.5, pitch.current - event.movementY * 0.0022));
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousemove", move);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousemove", move);
    };
  }, [enabled, gl.domElement]);

  const frame = useRef(0);
  useEffect(() => {
    let id = 0;
    const loop = (stamp: number) => {
      const dt = Math.min(0.05, frame.current ? (stamp - frame.current) / 1000 : 0.016);
      frame.current = stamp;
      if (enabled) {
        let ix = (keys.current.a || keys.current.arrowleft ? -1 : 0) + (keys.current.d || keys.current.arrowright ? 1 : 0) + stick.x;
        let iz = (keys.current.w || keys.current.arrowup ? -1 : 0) + (keys.current.s || keys.current.arrowdown ? 1 : 0) + stick.y;
        const length = Math.hypot(ix, iz) || 1;
        ix /= length;
        iz /= length;
        const speed = 1.45 * dt * (Math.hypot(stick.x, stick.y) > 0 || keys.current.w || keys.current.a || keys.current.s || keys.current.d || keys.current.arrowup ? 1 : 0);
        const dx = (ix * Math.cos(yaw.current) + iz * Math.sin(yaw.current)) * speed;
        const dz = (iz * Math.cos(yaw.current) - ix * Math.sin(yaw.current)) * speed;
        if (speed > 0) pos.current = moveWithCollision(pos.current, { x: dx, z: dz }, 0.22, room, boxes);
        camera.position.set(pos.current.x, 1.5, pos.current.z);
        camera.lookAt(pos.current.x + Math.sin(yaw.current) * Math.cos(pitch.current), 1.5 + Math.sin(pitch.current), pos.current.z - Math.cos(yaw.current) * Math.cos(pitch.current));
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [boxes, camera, enabled, room, stick.x, stick.y]);
  return null;
}

function modelUrlFor(solid: Solid, models: Models): string | undefined {
  if (solid.role === "chair") return models.chair;
  if (solid.role === "lamp" && solid.id.startsWith("lamp-shade")) return models.lamp;
  if (solid.role === "plant" && solid.id === "plant-leaf") return models.plant;
  if (solid.role === "crate") return models.crate;
  if (solid.role === "curtain") return models.curtain;
  if (solid.role === "mattress" && solid.bedIndex === 0) return models.bed;
  return undefined;
}

function skipSolid(solid: Solid, models: Models): boolean {
  if (models.lamp && solid.role === "lamp" && solid.id.startsWith("lamp-stem")) return true;
  if (models.plant && solid.id === "plant-pot") return true;
  if (models.bed && solid.role === "pillow" && solid.bedIndex === 0) return true;
  return false;
}

function makeLabel(text: string, fill: string, ink: string, line: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 280;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);
  context.fillStyle = fill;
  context.fillRect(0, 0, 512, 280);
  context.strokeStyle = line;
  context.lineWidth = 14;
  context.strokeRect(18, 18, 476, 244);
  context.fillStyle = ink;
  context.font = "700 64px serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  const lines = text.split("\n");
  lines.forEach((row, index) => context.fillText(row, 256, 140 + (index - (lines.length - 1) / 2) * 72));
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function lerpColor(from: string, to: string, t: number): string {
  const a = hex(from);
  const b = hex(to);
  const mix = a.map((channel, index) => Math.round(channel + ((b[index] ?? channel) - channel) * t));
  return `#${mix.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function hex(value: string): number[] {
  const raw = value.replace("#", "");
  return [0, 2, 4].map((index) => Number.parseInt(raw.slice(index, index + 2), 16));
}

class ModelBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
