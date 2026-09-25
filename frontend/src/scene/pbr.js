// PBR surface materials from CC0 Poly Haven texture sets in public/textures/.
// Each set is <name>_diff (color), <name>_nor (OpenGL normal) and <name>_arm
// (packed: R = ambient occlusion, G = roughness), which is how three.js reads
// aoMap / roughnessMap. See docs/runbook.md for how they were prepared.

import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

export const SURFACES = ['herringbone_parquet', 'oak_veneer_01', 'knitted_fleece', 'poly_wool_herringbone'];

const paths = (name) => [`/textures/${name}_diff.webp`, `/textures/${name}_nor.webp`, `/textures/${name}_arm.webp`];

// Returns material props for <meshStandardMaterial {...props} />. `repeat` is
// how many times the texture tiles across the surface's UVs.
export function useSurface(name, { repeat = [1, 1], rotation = 0, normalScale = 1 } = {}) {
  const [diff, nor, arm] = useTexture(paths(name));
  return useMemo(() => {
    const setup = (tex, srgb) => {
      const t = tex.clone();
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat[0], repeat[1]);
      t.rotation = rotation;
      t.anisotropy = 8;
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.needsUpdate = true;
      return t;
    };
    const armMap = setup(arm, false);
    return {
      map: setup(diff, true),
      normalMap: setup(nor, false),
      normalScale: new THREE.Vector2(normalScale, normalScale),
      roughnessMap: armMap,
      aoMap: armMap,
      aoMapIntensity: 1,
    };
    // repeat/rotation are literals at each call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diff, nor, arm]);
}

SURFACES.forEach((name) => useTexture.preload(paths(name)));
