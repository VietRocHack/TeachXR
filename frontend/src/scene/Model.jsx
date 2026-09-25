import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// A shadow-casting clone of a GLB from public/models/ (CC0 Poly Haven, and
// Khronos glTF sample models; see docs/runbook.md for sources and licenses).
//  - `snap`: move the model so its lowest point sits exactly at the group
//    origin, so it rests on whatever surface `position` names instead of
//    floating or sinking (the source models' origins vary).
//  - `overrides`: { materialName: { color, roughness, ... } } to restyle parts,
//    e.g. repaint a terracotta pot as matte white ceramic, or
//    { materialName: { material } } to swap in a whole material.
export default function Model({ url, snap = false, overrides, ...props }) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      const patch = overrides?.[o.material?.name];
      if (patch?.material) {
        // A whole replacement material (e.g. a physical/iridescent one).
        o.material = patch.material;
      } else if (patch) {
        o.material = o.material.clone();
        Object.entries(patch).forEach(([key, value]) => {
          if (key === 'color') o.material.color = new THREE.Color(value);
          else o.material[key] = value;
        });
        if ('map' in patch) o.material.needsUpdate = true;
      }
    });
    if (snap) {
      const box = new THREE.Box3().setFromObject(c);
      c.position.y -= box.min.y;
    }
    return c;
    // overrides are literals at each call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, snap]);
  return (
    <group {...props}>
      <primitive object={clone} />
    </group>
  );
}

// A plant's pot restyled as matte ceramic, for a modern look.
export function ceramicPot(material, color = '#f2efea') {
  return { [material]: { color, map: null, roughness: 0.55, metalness: 0 } };
}

[
  'potted_plant_01',
  'potted_plant_02',
  'potted_plant_04',
  'ceramic_vase_01',
  'mid_century_lounge_chair',
  'modern_ceiling_lamp_01',
  'DiffuseTransmissionTeacup',
  'WaterBottle',
  'IridescenceLamp',
  'GlassVaseFlowers',
  'SpecularSilkPouf',
  'SunglassesKhronos',
].forEach(
  (name) => useGLTF.preload(`/models/${name}.glb`),
);
