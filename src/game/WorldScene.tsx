import { Float, Stars } from '@react-three/drei';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { MutableRefObject, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Memory } from '../config/loveStory';
import type { SharedMemory } from './memoryStore';

export type Movement = { x: number; z: number };
type QualityTier = 'low' | 'mobile' | 'desktop';

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

function detectQuality(): QualityTier {
  if (typeof window === 'undefined') return 'desktop';

  const nav = navigator as Navigator & { deviceMemory?: number };
  const mobile =
    window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 820;

  if (!mobile) return 'desktop';

  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;

  if (cores <= 4 || memory <= 4) return 'low';
  return 'mobile';
}

function memoryPosition(index: number): [number, number, number] {
  const angle = (index / 7) * Math.PI * 2;
  return [Math.cos(angle) * 4.2, 1.35, Math.sin(angle) * 4.2];
}

function sharedMemoryPosition(
  index: number,
  total: number
): [number, number, number] {
  const perRing = 10;
  const ring = Math.floor(index / perRing);
  const ringStart = ring * perRing;
  const ringCount = Math.min(perRing, Math.max(1, total - ringStart));
  const localIndex = index - ringStart;
  const angle = (localIndex / ringCount) * Math.PI * 2 + ring * 0.26;
  const radius = 2.5 + ring * 0.58;
  return [
    Math.cos(angle) * radius,
    1.05 + ring * 0.08,
    Math.sin(angle) * radius,
  ];
}

function Tree() {
  return (
    <group position={[-3.2, 0.6, -1.4]}>
      <mesh>
        <cylinderGeometry args={[0.24, 0.4, 2.2, 8]} />
        <meshStandardMaterial color='#4b2f40' roughness={0.85} />
      </mesh>
      {[
        [-0.8, 2.1, 0],
        [0.6, 2.4, 0.1],
        [0, 2.8, -0.2],
        [0.8, 1.9, -0.2],
      ].map((position, index) => (
        <mesh
          key={index}
          position={position as [number, number, number]}
        >
          <icosahedronGeometry args={[0.9, 1]} />
          <meshStandardMaterial
            color='#725489'
            emissive='#3f245e'
            emissiveIntensity={0.45}
            roughness={0.75}
          />
        </mesh>
      ))}
    </group>
  );
}

function Lake({ simple }: { simple: boolean }) {
  return (
    <group position={[3.2, 0.06, 1.3]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.25, simple ? 28 : 48]} />
        {simple ? (
          <meshStandardMaterial
            color='#263e65'
            roughness={0.28}
            transparent
            opacity={0.82}
          />
        ) : (
          <meshPhysicalMaterial
            color='#263e65'
            metalness={0.12}
            roughness={0.2}
            transparent
            opacity={0.78}
          />
        )}
      </mesh>
      {!simple && (
        <pointLight
          position={[0, 1.2, 0]}
          intensity={1.05}
          distance={6}
          color='#c2d8ff'
        />
      )}
    </group>
  );
}

function Observatory({
  unlocked,
  simple,
}: {
  unlocked: boolean;
  simple: boolean;
}) {
  return (
    <group position={[0, 0.5, -5.8]}>
      <mesh>
        <cylinderGeometry args={[1.8, 2.1, 0.55, simple ? 16 : 24]} />
        <meshStandardMaterial
          color={unlocked ? '#7b6a97' : '#29273a'}
          emissive={unlocked ? '#7d659f' : '#000000'}
          emissiveIntensity={unlocked ? 0.4 : 0}
        />
      </mesh>
      <mesh position={[0, 1.35, 0]}>
        <sphereGeometry
          args={[
            1.45,
            simple ? 16 : 24,
            simple ? 10 : 14,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2,
          ]}
        />
        {simple ? (
          <meshStandardMaterial
            color='#a7c5df'
            transparent
            opacity={unlocked ? 0.17 : 0.07}
          />
        ) : (
          <meshPhysicalMaterial
            color='#a7c5df'
            transparent
            opacity={unlocked ? 0.19 : 0.08}
            roughness={0.05}
            transmission={0.3}
          />
        )}
      </mesh>
    </group>
  );
}

function Fireflies({
  count,
  animate,
}: {
  count: number;
  animate: boolean;
}) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      const radius = 1.5 + ((index * 17) % 40) / 10;
      values[index * 3] = Math.cos(angle) * radius;
      values[index * 3 + 1] = 0.65 + ((index * 11) % 12) / 10;
      values[index * 3 + 2] = Math.sin(angle) * radius;
    }
    return values;
  }, [count]);

  useFrame((_, delta) => {
    if (animate && points.current) {
      points.current.rotation.y += delta * 0.025;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach='attributes-position' args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color='#ffe0a0'
        size={0.075}
        transparent
        opacity={0.84}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function MemoryOrb({
  index,
  animate,
  onTake,
}: {
  index: number;
  animate: boolean;
  onTake: () => void;
}) {
  const position = memoryPosition(index);
  const take = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onTake();
  };

  const content = (
    <group position={position} onPointerDown={take}>
      <mesh scale={0.5}>
        <octahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial
          color='#ffe6a7'
          emissive='#ffc76f'
          emissiveIntensity={2.5}
        />
      </mesh>
      <mesh scale={1.15}>
        <sphereGeometry args={[0.7, 10, 10]} />
        <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
      </mesh>
    </group>
  );

  return animate ? (
    <Float speed={1.1} rotationIntensity={0.2} floatIntensity={0.5}>
      {content}
    </Float>
  ) : (
    content
  );
}

function SharedMemoryOrb({
  index,
  total,
  animate,
  onOpen,
}: {
  index: number;
  total: number;
  animate: boolean;
  onOpen: () => void;
}) {
  const position = sharedMemoryPosition(index, total);
  const content = (
    <group
      position={position}
      onPointerDown={event => {
        event.stopPropagation();
        onOpen();
      }}
    >
      <mesh scale={0.42}>
        <octahedronGeometry args={[0.62, 0]} />
        <meshStandardMaterial
          color='#ffc6dc'
          emissive='#d75a96'
          emissiveIntensity={2.2}
        />
      </mesh>
      <mesh scale={1.25}>
        <sphereGeometry args={[0.65, 10, 10]} />
        <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
      </mesh>
    </group>
  );

  return animate ? (
    <Float speed={1} rotationIntensity={0.25} floatIntensity={0.42}>
      {content}
    </Float>
  ) : (
    content
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
      {[...collected].map((id, index) => (
        <mesh
          key={id}
          position={[
            (index - 3) * 0.42,
            Math.sin(index * 1.8) * 0.35,
            0,
          ]}
        >
          <sphereGeometry args={[0.07, 7, 7]} />
          <meshBasicMaterial color='#ffe6a7' />
        </mesh>
      ))}
      {[...sharedCollected].slice(0, 16).map((id, index) => (
        <mesh
          key={id}
          position={[
            ((index % 8) - 3.5) * 0.31,
            0.72 +
              Math.floor(index / 8) * 0.25 +
              Math.sin(index * 1.4) * 0.08,
            0,
          ]}
        >
          <sphereGeometry args={[0.055, 7, 7]} />
          <meshBasicMaterial color='#ffc0d8' />
        </mesh>
      ))}
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
  const cameraDesired = useRef(new THREE.Vector3());
  const { camera } = useThree();

  const memoryPositions = useMemo(
    () => memories.map((_, index) => memoryPosition(index)),
    [memories]
  );
  const sharedPositions = useMemo(
    () =>
      sharedMemories.map((_, index) =>
        sharedMemoryPosition(index, sharedMemories.length)
      ),
    [sharedMemories]
  );

  useFrame((_, delta) => {
    const group = avatar.current;
    if (!group) return;

    const speed = 2.6 * Math.min(delta, 0.05);
    group.position.x = THREE.MathUtils.clamp(
      group.position.x + movement.current.x * speed,
      -5.4,
      5.4
    );
    group.position.z = THREE.MathUtils.clamp(
      group.position.z + movement.current.z * speed,
      -5.3,
      5.3
    );

    if (Math.abs(movement.current.x) + Math.abs(movement.current.z) > 0.1) {
      group.rotation.y = Math.atan2(movement.current.x, movement.current.z);
    }

    memories.forEach((memory, index) => {
      if (collected.has(memory.id)) return;
      const [x, , z] = memoryPositions[index];
      const dx = group.position.x - x;
      const dz = group.position.z - z;
      const distanceSquared = dx * dx + dz * dz;
      if (distanceSquared < 0.6724 && !nearby.current.has(memory.id)) {
        nearby.current.add(memory.id);
        onNearMemory(memory);
      } else if (distanceSquared > 1.5625) {
        nearby.current.delete(memory.id);
      }
    });

    sharedMemories.forEach((memory, index) => {
      if (sharedCollected.has(memory.id)) return;
      const [x, , z] = sharedPositions[index];
      const dx = group.position.x - x;
      const dz = group.position.z - z;
      const distanceSquared = dx * dx + dz * dz;
      if (
        distanceSquared < 0.7056 &&
        !sharedNearby.current.has(memory.id)
      ) {
        sharedNearby.current.add(memory.id);
        onNearSharedMemory(memory);
      } else if (distanceSquared > 1.69) {
        sharedNearby.current.delete(memory.id);
      }
    });

    cameraDesired.current.set(
      group.position.x,
      4.4,
      group.position.z + 7.2
    );
    camera.position.lerp(cameraDesired.current, 0.05);
    camera.lookAt(group.position.x, 0.9, group.position.z - 0.8);
  });

  return (
    <group ref={avatar} position={[0, 0.7, 2.8]}>
      <mesh>
        <capsuleGeometry args={[0.34, 0.76, 5, 10]} />
        <meshStandardMaterial color='#f0c6c9' roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.31, 14, 14]} />
        <meshStandardMaterial color='#f5d5c5' />
      </mesh>
      <mesh position={[0, 0.98, -0.13]} scale={[1.08, 0.9, 0.55]}>
        <sphereGeometry args={[0.33, 12, 12]} />
        <meshStandardMaterial color='#2b202b' roughness={0.95} />
      </mesh>
    </group>
  );
}

function IslandScene({
  quality,
  ...props
}: SceneProps & { quality: QualityTier }) {
  const simple = quality !== 'desktop';
  const low = quality === 'low';
  const starCount = low ? 280 : simple ? 500 : 850;
  const fireflyCount = low ? 10 : simple ? 16 : 28;
  const animateOrbs = !low;

  return (
    <>
      <fog attach='fog' args={['#080818', 8, 20]} />
      <ambientLight intensity={0.62} color='#a7b6ff' />
      <directionalLight
        position={[4, 8, 4]}
        intensity={1}
        color='#dfe9ff'
      />
      {!low && (
        <pointLight
          position={[-3, 3, -2]}
          intensity={1.2}
          distance={8}
          color='#d8a6ff'
        />
      )}
      <Stars
        radius={55}
        depth={25}
        count={starCount}
        factor={simple ? 2.2 : 2.6}
        saturation={0.18}
        fade
        speed={low ? 0.08 : 0.35}
      />

      <mesh position={[0, -0.45, 0]}>
        <cylinderGeometry args={[6.2, 5.1, 1.3, simple ? 22 : 32]} />
        <meshStandardMaterial color='#152b2b' roughness={0.92} />
      </mesh>
      <mesh position={[0, -1.1, 0]}>
        <coneGeometry args={[5.2, 3.2, simple ? 9 : 12]} />
        <meshStandardMaterial color='#161626' roughness={1} />
      </mesh>

      <Tree />
      <Lake simple={simple} />
      <Observatory unlocked={props.finaleUnlocked} simple={simple} />
      <CollectedConstellation
        collected={props.collected}
        sharedCollected={props.sharedCollected}
      />
      <Fireflies count={fireflyCount} animate={!low} />

      {props.memories.map((memory, index) =>
        props.collected.has(memory.id) ? null : (
          <MemoryOrb
            key={memory.id}
            index={index}
            animate={animateOrbs}
            onTake={() => props.onMemory(memory)}
          />
        )
      )}

      {props.sharedMemories.map((memory, index) =>
        props.sharedCollected.has(memory.id) ? null : (
          <SharedMemoryOrb
            key={memory.id}
            index={index}
            total={props.sharedMemories.length}
            animate={animateOrbs}
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
  const quality = useMemo(detectQuality, []);

  return (
    <Canvas
      dpr={
        quality === 'low'
          ? 1
          : quality === 'mobile'
            ? [1, 1.15]
            : [1, 1.4]
      }
      camera={{ position: [0, 4.5, 8.5], fov: 50 }}
      gl={{
        antialias: quality === 'desktop',
        powerPreference: 'high-performance',
      }}
    >
      <IslandScene {...props} quality={quality} />
    </Canvas>
  );
}