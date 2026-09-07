const PBRMaterials = (() => {
  const THREE = window.THREE;
  const loader = new THREE.TextureLoader();
  const cache = new Map();
  const basePath = '../assets/materials/';

  const sets = {
    concrete: {
      color: 'Concrete_3/Concrete047A_2K-PNG_Color.png',
      normal: 'Concrete_3/Concrete047A_2K-PNG_NormalGL.png',
      roughness: 'Concrete_3/Concrete047A_2K-PNG_Roughness.png',
      ao: 'Concrete_3/Concrete047A_2K-PNG_AmbientOcclusion.png',
      displacement: 'Concrete_3/Concrete047A_2K-PNG_Displacement.png'
    },
    sand: {
      color: 'Sand_2/Ground079L_2K-PNG_Color.png',
      normal: 'Sand_2/Ground079L_2K-PNG_NormalGL.png',
      roughness: 'Sand_2/Ground079L_2K-PNG_Roughness.png',
      ao: 'Sand_2/Ground079L_2K-PNG_AmbientOcclusion.png',
      displacement: 'Sand_2/Ground079L_2K-PNG_Displacement.png'
    }
  };

  function configure(texture, colorTexture = false, repeatX = 3, repeatY = 3) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    
    // FIX 1: Modern color space assignment
    if (colorTexture) {
      texture.colorSpace = THREE.SRGBColorSpace;
    }

    
    texture.anisotropy = 1;
    return texture;
  }

  function load(path, colorTexture = false, repeatX = 3, repeatY = 3) {
    return new Promise(resolve => {
      loader.load(basePath + path, 
        texture => resolve(configure(texture, colorTexture, repeatX, repeatY)), 
        undefined, 
        () => resolve(null)
      );
    });
  }

  function fallbackTexture(color, colorTexture = false, repeatX = 3, repeatY = 3) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    context.fillStyle = color;
    context.fillRect(0, 0, 64, 64);
    return configure(new THREE.CanvasTexture(canvas), colorTexture, repeatX, repeatY);
  }

  function create(kind = 'concrete', color = 0xffffff, repeatX = 3, repeatY = 3) {
    const isSand = kind === 'sand';
    
    // FIX 3: Toned down sand restrictions slightly to let it catch lighting better
    const material = new THREE.MeshPhysicalMaterial({
      color,
      roughness: isSand ? 0.85 : 0.68, 
      metalness: 0,
      clearcoat: isSand ? 0 : 0.12,
      clearcoatRoughness: isSand ? 1 : 0.55,
      envMapIntensity: isSand ? 0.2 : 0.75, // Allow sand a tiny bit of environment lighting
      reflectivity: isSand ? 0.1 : 0.5,
      normalScale: new THREE.Vector2(isSand ? 0.35 : 1.35, isSand ? 0.35 : 1.35)
    });

    const set = sets[kind] || sets.concrete;
    const key = kind + ':' + color + ':' + repeatX + ':' + repeatY;

    material.userData.pbrAsset = key;
    material.userData.environmentScale = isSand ? 0 : 0.65;
    material.userData.normalStrength = isSand ? 0.35 : 0.85;

    if (!cache.has(key)) {
      cache.set(key, Promise.all([
        load(set.color, true, repeatX, repeatY).then(texture => texture || fallbackTexture('#b8b8b8', true, repeatX, repeatY)),
        load(set.normal, false, repeatX, repeatY).then(texture => texture || fallbackTexture('#8080ff', false, repeatX, repeatY)),
        load(set.roughness, false, repeatX, repeatY).then(texture => texture || fallbackTexture('#b0b0b0', false, repeatX, repeatY)),
        set.ao ? load(set.ao, false, repeatX, repeatY).then(texture => texture || fallbackTexture('#ffffff', false, repeatX, repeatY)) : Promise.resolve(null),
        set.displacement ? load(set.displacement, false, repeatX, repeatY).then(texture => texture || fallbackTexture('#808080', false, repeatX, repeatY)) : Promise.resolve(null)
      ]));
    }

    cache.get(key).then(([map, normalMap, roughnessMap, aoMap, displacementMap]) => {
      if (map) material.map = map;
      if (normalMap) material.normalMap = normalMap;
      if (roughnessMap) material.roughnessMap = roughnessMap;
      
      if (isSand) {
        material.roughnessMap = null;
        material.roughness = 0.85;
        material.reflectivity = 0.1;
      }
      
      if (aoMap) {
        material.aoMap = aoMap;
        material.aoMapIntensity = 0.2; // FIX 2: Dropped down from 0.7 to avoid over-darkening cracks
      }
      
      if (displacementMap) {
        material.bumpMap = displacementMap;
        material.bumpScale = 0.045;
      }

      material.needsUpdate = true;
    });

    return material;
  }

  return { create };
})();

window.PBRMaterials = PBRMaterials;
