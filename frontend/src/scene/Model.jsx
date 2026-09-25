import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';

// A shadow-casting clone of a GLB from public/models/ (CC0, Poly Haven).
export default function Model({ url, ...props }) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);
  return <primitive object={clone} {...props} />;
}

[
  'desk_lamp_arm_01',
  'alarm_clock_01',
  'potted_plant_04',
  'wall_clock',
  'wooden_bookshelf_worn',
  'book_encyclopedia_set_01',
  'modern_arm_chair_01',
].forEach((name) => useGLTF.preload(`/models/${name}.glb`));
