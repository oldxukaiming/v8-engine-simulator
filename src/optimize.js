import { Mesh, LineSegments } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Merge direct mesh children that share a material into a single draw call.
 * Nested groups keep their own local transform, so animated sub-assemblies
 * (pistons, rods, valves, cams) remain independently animated. Meshes marked
 * userData.noMerge are skipped.
 */
export function optimizeStaticGeometry(root) {
  let before = 0;
  let after = 0;
  let mergedMeshes = 0;
  let mergedLines = 0;

  function process(group) {
    const meshes = [];
    const lines = [];
    for (const child of group.children) {
      if (child.isMesh && !child.isInstancedMesh && !child.userData.noMerge && !Array.isArray(child.material)) {
        meshes.push(child);
      } else if (child.isLineSegments && !child.userData.noMerge) {
        lines.push(child);
      }
    }
    before += meshes.length + lines.length;

    const byMaterial = new Map();
    for (const mesh of meshes) {
      const key = mesh.material.uuid;
      if (!byMaterial.has(key)) byMaterial.set(key, []);
      byMaterial.get(key).push(mesh);
    }

    for (const bucket of byMaterial.values()) {
      if (bucket.length < 2) {
        after += bucket.length;
        continue;
      }
      const geos = [];
      let cast = false;
      let receive = false;
      for (const mesh of bucket) {
        mesh.updateMatrix();
        let geo = mesh.geometry.clone();
        if (geo.index) geo = geo.toNonIndexed();
        geo.applyMatrix4(mesh.matrix);
        geos.push(geo);
        cast = cast || mesh.castShadow;
        receive = receive || mesh.receiveShadow;
      }
      const merged = mergeGeometries(geos, false);
      for (const geo of geos) geo.dispose();
      if (!merged) {
        after += bucket.length;
        continue;
      }
      const mergedMesh = new Mesh(merged, bucket[0].material);
      mergedMesh.castShadow = cast;
      mergedMesh.receiveShadow = receive;
      mergedMesh.name = `Merged_${bucket[0].material.type}_${bucket[0].material.uuid.slice(0, 6)}`;
      for (const source of bucket) group.remove(source);
      group.add(mergedMesh);
      mergedMeshes += bucket.length;
      after += 1;
    }

    const lineBuckets = new Map();
    for (const line of lines) {
      const key = line.material.uuid;
      if (!lineBuckets.has(key)) lineBuckets.set(key, []);
      lineBuckets.get(key).push(line);
    }
    for (const bucket of lineBuckets.values()) {
      if (bucket.length < 2) {
        after += bucket.length;
        continue;
      }
      const geos = [];
      for (const line of bucket) {
        line.updateMatrix();
        const geo = line.geometry.clone();
        geo.applyMatrix4(line.matrix);
        geos.push(geo);
      }
      const merged = mergeGeometries(geos, false);
      for (const geo of geos) geo.dispose();
      if (!merged) {
        after += bucket.length;
        continue;
      }
      const line = new bucket[0].constructor(merged, bucket[0].material);
      for (const source of bucket) group.remove(source);
      group.add(line);
      mergedLines += bucket.length;
      after += 1;
    }

    for (const child of [...group.children]) {
      if (child.isGroup) process(child);
    }
  }

  process(root);
  return { before, after, mergedMeshes, mergedLines };
}
