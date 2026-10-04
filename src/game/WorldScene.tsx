import { Float, Stars } from '@react-three/drei';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { MutableRefObject, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Memory } from '../config/loveStory';
import type { SharedMemory } from './memoryStore';

export type Movement = { x: number; z: number };

type SceneProps = {
  movement: MutableRefObject<Movement>;
  collected: Set<number>;
  sharedCollected: Set<string>;
  memories: Memory[];
  sharedMemories: SharedMemory[];
  finaleUnlocked: boolean;
  onMemory: (memory: Memory) => void;
  onSharedMemory: (memory: SharedMemory) => void;
};

function memoryPosition(index: number): [number, number, number] {
  const angle = (index / 7) * Math.PI * 2;
  return [Math.cos(angle) * 4.2, 1.35, Math.sin(angle) * 4.2];
}

function sharedMemoryPosition(index: number, total: number): [number, number, number] {
  const perRing = 10;
  const ring = Math.floor(index / perRing);
  const ringStart = ring * perRing;
  const ringCount = Math.min(perRing, Math.max(1, total - ringStart));
  const localIndex = index - ringStart;
  const angle = (localIndex / ringCount) * Math.PI * 2 + ring * 0.26;
  const radius = 2.5 + ring * 0.58;
  return [Math.cos(angle) * radius, 1.05 + ring * 0.08, Math.sin(angle) * radius];
}

function Tree() {
  return (
    <group position={[-3.2, 0.6, -1.4]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.24, 0.4, 2.2, 8]} />
        <meshStandardMaterial color="#4b2f40" roughness={0.85} />
      </mesh>
      {[[-0.8, 2.1, 0], [0.6, 2.4, 0.1], [0, 2.8, -0.2], [0.8, 1.9, -0.2]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <icosahedronGeometry args={[0.9, 1]} />
          <meshStandardMaterial color="#725489" emissive="#3f245e" emissiveIntensity={0.45} roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}

function Lake() {
  return (
    <group position={[3.2, 0.06, 1.3]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.25, 48]} />
        <meshPhysicalMaterial color="#263e65" metalness={0.12} roughness={0.2} transparent opacity={0.78} />
      </mesh>
      <pointLight position={[0, 1.2, 0]} intensity={1.2} distance={6} color="#c2d8ff" />
    </group>
  );
}

function Observatory({ unlocked }: { unlocked: boolean }) {
  return (
    <group position={[0, 0.5, -5.8]}>
      <mesh>
        <cylinderGeometry args={[1.8, 2.1, 0.55, 24]} />
        <meshStandardMaterial color={unlocked ? '#7b6a97' : '#29273a'} emissive={unlocked ? '#7d659f' : '#000000'} emissiveIntensity={unlocked ? 0.4 : 0} />
      </mesh>
      <mesh position={[0, 1.35, 0]}>
        <sphereGeometry args={[1.45, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color="#a7c5df" transparent opacity={unlocked ? 0.19 : 0.08} roughness={0.05} transmission={0.3} />
      </mesh>
    </group>
  );
}

function MemoryOrb({ index, onTake }: { index: number; onTake: () => void }) {
  const position = memoryPosition(index);
  const take = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onTake();
  };

  return (
    <Float speed={1.25} rotationIntensity={0.25} floatIntensity={0.65}>
      <group position={position} onPointerDown={take}>
        <mesh scale={0.5}>
          <octahedronGeometry args={[0.6, 0]} />
          <meshStandardMaterial color="#ffe6a7" emissive="#ffc76f" emissiveIntensity={2.5} />
        </mesh>
        <mesh scale={1.15}>
          <sphereGeometry args={[0.7, 12, 12]} />
          <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
        </mesh>
        <pointLight intensity={2.2} distance={3.8} color="#ffd78c" />
      </group>
    </Float>
  );
}

function SharedMemoryOrb({
  index,
  total,
  onOpen,
}: {
  index: number;
  total: number;
  onOpen: () => void;
}) {
  const position = sharedMemoryPosition(index, total);

  return (
    <Float speed={1.1} rotationIntensity={0.35} floatIntensity={0.55}>
      <group
        position={position}
        onPointerDown={event => {
          event.stopPropagation();
          onOpen();
        }}
      >
        <mesh scale={0.42}>
          <octahedronGeometry args={[0.62, 0]} />
          <meshStandardMaterial color="#ffc6dc" emissive="#d75a96" emissiveIntensity={2.2} />
        </mesh>
        <mesh scale={1.25}>
          <sphereGeometry args={[0.65, 12, 12]} />
          <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
        </mesh>
        <pointLight intensity={1.7} distance={3.2} color="#ff9fc9" />
      </group>
    </Float>
  );
}

function CollectedConstellation({
  collected,
  sharedCollected,
}: {
  collected: Set<number>;
  sharedCollected: Set<string>;
}) {
  return (
    <group position={[0, 5.2, -2.6]}>
      {[...collected].map((id, i) => {
        const x = (i - 3) * 0.42;
        const y = Math.sin(i * 1.8) * 0.35;
        return (
          <mesh key={id} position={[x, y, 0]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshBasicMaterial color="#ffe6a7" />
          </mesh>
        );
      })}
      {[...sharedCollected].slice(0, 16).map((id, i) => {
        const x = ((i % 8) - 3.5) * 0.31;
        const y = 0.72 + Math.floor(i / 8) * 0.25 + Math.sin(i * 1.4) * 0.08;
        return (
          <mesh key={id} position={[x, y, 0]}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshBasicMaterial color="#ffc0d8" />
          </mesh>
        );
      })}
    </group>
  );
}

function Player({
  movement,
  collected,
  sharedCollected,
  memories,
  sharedMemories,
  onNearMemory,
  onNearSharedMemory,
}: {
  movement: MutableRefObject<Movement>;
  collected: Set<number>;
  sharedCollected: Set<string>;
  memories: Memory[];
  sharedMemories: SharedMemory[];
  onNearMemory: (memory: Memory) => void;
  onNearSharedMemory: (memory: SharedMemory) => void;
}) {
  const avatar = useRef<THREE.Group>(null);
  const nearby = useRef(new Set<number>());
  const sharedNearby = useRef(new Set<string>());
  const { camera } = useThree();

  useFrame((_, delta) => {
    const group = avatar.current;
    if (!group) return;

    const speed = 2.6 * Math.min(delta, 0.05);
    group.position.x = THREE.MathUtils.clamp(group.position.x + movement.current.x * speed, -5.4, 5.4);
    group.position.z = THREE.MathUtils.clamp(group.position.z + movement.current.z * speed, -5.3, 5.3);

    if (Math.abs(movement.current.x) + Math.abs(movement.current.z) > 0.1) {
      group.rotation.y = Math.atan2(movement.current.x, movement.current.z);
    }

    memories.forEach((memory, index) => {
      if (collected.has(memory.id)) return;
      const [x, , z] = memoryPosition(index);
      const distance = Math.hypot(group.position.x - x, group.position.z - z);
      if (distance < 0.82 && !nearby.current.has(memory.id)) {
        nearby.current.add(memory.id);
        onNearMemory(memory);
      } else if (distance > 1.25) {
        nearby.current.delete(memory.id);
      }
    });

    sharedMemories.forEach((memory, index) => {
      if (sharedCollected.has(memory.id)) return;
      const [x, , z] = sharedMemoryPosition(index, sharedMemories.length);
      const distance = Math.hypot(group.position.x - x, group.position.z - z);
      if (distance < 0.84 && !sharedNearby.current.has(memory.id)) {
        sharedNearby.current.add(memory.id);
        onNearSharedMemory(memory);
      } else if (distance > 1.3) {
        sharedNearby.current.delete(memory.id);
      }
    });

    const desired = new THREE.Vector3(group.position.x, 4.4, group.position.z + 7.2);
    camera.position.lerp(desired, 0.05);
    camera.lookAt(group.position.x, 0.9, group.position.z - 0.8);
  });

  return (
    <group ref={avatar} position={[0, 0.7, 2.8]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.34, 0.76, 6, 12]} />
        <meshStandardMaterial color="#f0c6c9" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.31, 18, 18]} />
        <meshStandardMaterial color="#f5d5c5" />
      </mesh>
      <mesh position={[0, 0.98, -0.13]} scale={[1.08, 0.9, 0.55]}>
        <sphereGeometry args={[0.33, 16, 16]} />
        <meshStandardMaterial color="#2b202b" roughness={0.95} />
      </mesh>
      <pointLight position={[0, 1.2, 0]} intensity={0.8} distance={2.2} color="#ffdca1" />
    </group>
  );
}

function IslandScene(props: SceneProps) {
  const fireflies = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => {
        const a = (i / 34) * Math.PI * 2;
        const r = 1.5 + ((i * 17) % 40) / 10;
        return [Math.cos(a) * r, 0.65 + ((i * 11) % 12) / 10, Math.sin(a) * r] as [number, number, number];
      }),
    []
  );

  return (
    <>
      <fog attach="fog" args={['#080818', 8, 20]} />
      <ambientLight intensity={0.58} color="#a7b6ff" />
      <directionalLight position={[4, 8, 4]} intensity={1.1} color="#dfe9ff" />
      <pointLight position={[-3, 3, -2]} intensity={1.6} distance={8} color="#d8a6ff" />
      <Stars radius={55} depth={25} count={900} factor={2.6} saturation={0.18} fade speed={0.45} />
      <mesh position={[0, -0.45, 0]} receiveShadow>
        <cylinderGeometry args={[6.2, 5.1, 1.3, 32]} />
        <meshStandardMaterial color="#152b2b" roughness={0.92} />
      </mesh>
      <mesh position={[0, -1.1, 0]}>
        <coneGeometry args={[5.2, 3.2, 12]} />
        <meshStandardMaterial color="#161626" roughness={1} />
      </mesh>

      <Tree />
      <Lake />
      <Observatory unlocked={props.finaleUnlocked} />
      <CollectedConstellation collected={props.collected} sharedCollected={props.sharedCollected} />

      {fireflies.map((p, i) => (
        <Float key={i} speed={0.8 + (i % 3) * 0.2} floatIntensity={0.35}>
          <mesh position={p} scale={0.035 + (i % 3) * 0.01}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color={i % 4 === 0 ? '#f4b7cf' : '#ffe6a2'} />
          </mesh>
        </Float>
      ))}

      {props.memories.map((memory, i) =>
        props.collected.has(memory.id) ? null : (
          <MemoryOrb key={memory.id} index={i} onTake={() => props.onMemory(memory)} />
        )
      )}

      {props.sharedMemories.map((memory, i) =>
        props.sharedCollected.has(memory.id) ? null : (
          <SharedMemoryOrb
            key={memory.id}
            index={i}
            total={props.sharedMemories.length}
            onOpen={() => props.onSharedMemory(memory)}
          />
        )
      )}

      <Player
        movement={props.movement}
        collected={props.collected}
        sharedCollected={props.sharedCollected}
        memories={props.memories}
        sharedMemories={props.sharedMemories}
        onNearMemory={props.onMemory}
        onNearSharedMemory={props.onSharedMemory}
      />
    </>
  );
}

export default function WorldScene(props: SceneProps) {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 4.5, 8.5], fov: 50 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <IslandScene {...props} />
    </Canvas>
  );
}