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
  'potted_plant_01',
  'potted_plant_02',
  'potted_plant_04',
  'wall_clock',
  'wooden_bookshelf_worn',
  'book_encyclopedia_set_01',
  'old_bed_frame',
  'throw_pillows_01',
  'painted_wooden_nightstand',
  'painted_wooden_shelves',
  'standing_picture_frame_01',
  'hanging_picture_frame_01',
  'hanging_picture_frame_02',
  'ceramic_vase_01',
  'GreenChair_01',
  'side_table_01',
  'drawer_cabinet',
  'modern_ceiling_lamp_01',
].forEach((name) => useGLTF.preload(`/models/${name}.glb`));
