const THREE = window.THREE;

class ThreeRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87c9ef);
        this.scene.fog = new THREE.Fog(0x87c9ef, 90, 220);

        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
        this.gl = this.renderer.getContext();
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        if (THREE.SRGBColorSpace) this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        if (THREE.sRGBEncoding) this.renderer.outputEncoding = THREE.sRGBEncoding;
        if ('physicallyCorrectLights' in this.renderer) this.renderer.physicallyCorrectLights = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.9;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.meshes = [];
        this.lights = [];
        this.graphicsSettings = null;
        this.resize();

        this.skyLight = new THREE.HemisphereLight(0xb9dcff, 0x5b4028, 0.62);
        this.scene.add(this.skyLight);
        this.sun = new THREE.DirectionalLight(0xffd6a0, 3.2);
        this.sun.position.set(-55, 85, 35);
        this.sun.target.position.set(0, 0, 0);
        this.sun.castShadow = true;
        this.sun.shadow.bias = -0.00025;
        this.sun.shadow.normalBias = 0.035;
        this.sun.shadow.radius = 2.5;
        this.sun.shadow.mapSize.set(2048, 2048);
        this.sun.shadow.camera.left = -100;
        this.sun.shadow.camera.right = 100;
        this.sun.shadow.camera.top = 100;
        this.sun.shadow.camera.bottom = -100;
        this.scene.add(this.sun);
        this.scene.add(this.sun.target);
        this.fillLight = new THREE.DirectionalLight(0x9fc9ff, 0.55);
        this.fillLight.position.set(50, 32, -60);
        this.fillLight.target.position.set(0, 2, 0);
        this.scene.add(this.fillLight);
        this.scene.add(this.fillLight.target);
        this.rimLight = new THREE.DirectionalLight(0xfff4d6, 0.28);
        this.rimLight.position.set(-20, 18, -55);
        this.rimLight.target.position.set(0, 2, 0);
        this.scene.add(this.rimLight);
        this.scene.add(this.rimLight.target);
        this.loadEnvironment();
    }

    loadEnvironment() {
        const loader = new THREE.TextureLoader();
        loader.load('../assets/materials/Glass/IndoorEnvironmentHDRI005_2K_TONEMAPPED.jpg', texture => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            const pmrem = new THREE.PMREMGenerator(this.renderer);
            const environment = pmrem.fromEquirectangular(texture).texture;
            this.scene.environment = environment;
            this.scene.environmentIntensity = 0.8;
            texture.dispose();
            pmrem.dispose();
        }, undefined, () => {
            // The scene remains fully lit if the optional environment asset is unavailable.
        });
    }

    resize() {
        const width = this.canvas.clientWidth || window.innerWidth;
        const height = this.canvas.clientHeight || window.innerHeight;
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    addMesh(mesh) {
        this.meshes.push(mesh);
        if (mesh.object3D) {
            this.scene.add(mesh.object3D);
            this.applyMeshGraphics(mesh.object3D);
        }
    }

    removeMesh(mesh) {
        const index = this.meshes.indexOf(mesh);
        if (index !== -1) this.meshes.splice(index, 1);
        if (mesh.object3D) this.scene.remove(mesh.object3D);
    }

    clearScene() {
        this.meshes.forEach(mesh => {
            if (mesh.object3D) this.scene.remove(mesh.object3D);
        });
        this.meshes = [];
        this.lights = [];
    }

    addLight(light) {
        this.lights.push(light);
        const point = new THREE.PointLight(
            new THREE.Color(light.color.x, light.color.y, light.color.z),
            2.5,
            45
        );
        point.position.set(light.position.x, light.position.y, light.position.z);
        this.scene.add(point);
    }

    syncMesh(mesh) {
        if (!mesh.object3D) return;
        const object = mesh.object3D;
        const transform = mesh.transform;
        object.position.set(transform.position.x, transform.position.y, transform.position.z);
        if (transform.rotation.w !== undefined) {
            object.quaternion.set(transform.rotation.x, transform.rotation.y, transform.rotation.z, transform.rotation.w);
        } else {
            object.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
        }
        object.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
        object.visible = mesh.visible;
        object.castShadow = this.renderer.shadowMap.enabled;
        object.receiveShadow = this.renderer.shadowMap.enabled;
        if (mesh.baseColor && object.material.color) {
            object.material.color.setRGB(mesh.baseColor.x, mesh.baseColor.y, mesh.baseColor.z);
        }
        if (object.material.isMeshPhysicalMaterial) {
            const environmentIntensity = this.graphicsSettings?.environmentIntensity || 0.8;
            const environmentScale = object.material.userData.environmentScale || 1;
            object.material.envMapIntensity = environmentIntensity * environmentScale;
            const normalStrength = object.material.userData.normalStrength || this.graphicsSettings?.normalStrength || 0.45;
            object.material.normalScale.set(normalStrength, normalStrength);
        }
    }

    applyMeshGraphics(object) {
        const settings = this.graphicsSettings;
        if (!settings || !object.isMesh || !object.material) return;
        object.castShadow = settings.shadows;
        object.receiveShadow = settings.shadows;
        const variants = object.material.userData.pbrVariants;
        if (variants && settings.textureSize && variants[settings.textureSize]) {
            const maps = variants[settings.textureSize];
            object.material.map = maps.albedo;
            object.material.roughnessMap = maps.roughness;
            object.material.normalMap = maps.normal;
            object.material.needsUpdate = true;
        }
        const importedPbr = object.material.userData.pbrAsset;
        if (importedPbr && object.material.map) {
            object.material.map.anisotropy = settings.textureAnisotropy || 1;
            object.material.normalMap && (object.material.normalMap.anisotropy = settings.textureAnisotropy || 1);
            object.material.roughnessMap && (object.material.roughnessMap.anisotropy = settings.textureAnisotropy || 1);
        }
        if (object.material.map) {
            object.material.map.minFilter = settings.textureFilter || THREE.LinearMipmapLinearFilter;
            object.material.map.magFilter = settings.textureFilter === THREE.NearestFilter ? THREE.NearestFilter : THREE.LinearFilter;
            object.material.map.needsUpdate = true;
        }
    }

    render(scene, gameCamera) {
        this.camera.position.set(gameCamera.position.x, gameCamera.position.y, gameCamera.position.z);
        const target = gameCamera.getTarget();
        this.camera.lookAt(target.x, target.y, target.z);
        this.meshes.forEach(mesh => this.syncMesh(mesh));
        this.renderer.render(this.scene, this.camera);
    }

    setGraphicsQuality(quality) {
        const presets = {
            'very-low': { pixelRatio: 0.5, textureSize: 16, textureAnisotropy: 1, shadows: false, fog: false, textureFilter: THREE.NearestFilter, exposure: 0.78, skyIntensity: 0.42, sunIntensity: 1.35, environmentIntensity: 0.2, normalStrength: 0.2, shadowSize: 1024 },
            low: { pixelRatio: 0.75, textureSize: 32, textureAnisotropy: 1, shadows: false, fog: true, textureFilter: THREE.LinearFilter, exposure: 0.82, skyIntensity: 0.48, sunIntensity: 1.55, environmentIntensity: 0.28, normalStrength: 0.3, shadowSize: 1024 },
            medium: { pixelRatio: 1, textureSize: 64, textureAnisotropy: 4, shadows: true, fog: true, textureFilter: THREE.LinearMipmapLinearFilter, exposure: 0.9, skyIntensity: 0.56, sunIntensity: 1.8, environmentIntensity: 0.38, normalStrength: 0.4, shadowSize: 2048 },
            high: { pixelRatio: 1.5, textureSize: 96, textureAnisotropy: 8, shadows: true, fog: true, textureFilter: THREE.LinearMipmapLinearFilter, exposure: 0.96, skyIntensity: 0.62, sunIntensity: 2.1, environmentIntensity: 0.48, normalStrength: 0.5, shadowSize: 2048 },
            'very-high': { pixelRatio: 1.75, textureSize: 128, textureAnisotropy: 16, shadows: true, fog: true, textureFilter: THREE.LinearMipmapLinearFilter, exposure: 1.0, skyIntensity: 0.74, sunIntensity: 4.4, environmentIntensity: 0.85, normalStrength: 0.85, shadowSize: 4096, softShadows: true },
            ultra: { pixelRatio: 2, textureSize: 128, textureAnisotropy: 16, shadows: true, fog: true, textureFilter: THREE.LinearMipmapLinearFilter, exposure: 1.04, skyIntensity: 0.8, sunIntensity: 5.0, environmentIntensity: 1.0, normalStrength: 1.0, shadowSize: 4096, softShadows: true }
        };
        const settings = typeof quality === 'string' ? (presets[quality] || presets.medium) : quality;
        this.graphicsSettings = settings;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.pixelRatio));
        this.renderer.shadowMap.enabled = settings.shadows;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMappingExposure = settings.exposure || 1.1;
        this.skyLight.intensity = settings.skyIntensity || 0.72;
        this.sun.intensity = settings.sunIntensity || 1.45;
        this.fillLight.intensity = settings.shadows ? 0.3 : 0.18;
        this.rimLight.intensity = settings.shadows ? 0.28 : 0.12;
        this.scene.environmentIntensity = settings.environmentIntensity || 0.8;
        this.sun.shadow.mapSize.set(settings.shadowSize || 2048, settings.shadowSize || 2048);
        this.sun.shadow.bias = -0.00025;
        this.sun.shadow.normalBias = 0.035;
        this.sun.shadow.radius = settings.shadows ? 2.5 : 0;
        this.scene.traverse(object => {
            if (!object.isMesh || !object.material) return;
            this.applyMeshGraphics(object);
            if (object.material.map) {
                object.material.map.minFilter = settings.textureFilter || THREE.LinearMipmapLinearFilter;
                object.material.map.magFilter = settings.textureFilter === THREE.NearestFilter ? THREE.NearestFilter : THREE.LinearFilter;
                object.material.map.anisotropy = settings.shadows ? this.renderer.capabilities.getMaxAnisotropy() : 1;
                object.material.map.needsUpdate = true;
            }
        });
        this.scene.fog = settings.fog ? new THREE.Fog(0x87c9ef, 90, 220) : null;
    }

    getHardwareInfo() {
        const gl = this.renderer.getContext();
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const memoryInfo = gl.getExtension('WEBGL_memory_info');
        const rendererName = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'GPU information unavailable';
        const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown vendor';
        const vram = memoryInfo ? gl.getParameter(memoryInfo.DEDICATED_VIDEO_MEMORY_TOTAL_MB_WEBGL) : null;

        return {
            renderer: rendererName,
            vendor,
            vram,
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxSamples: gl.getParameter(gl.MAX_SAMPLES),
            maxAnisotropy: this.renderer.capabilities.getMaxAnisotropy()
        };
    }

    recommendGraphics(goal) {
        const hardware = this.getHardwareInfo();
        const name = hardware.renderer.toLowerCase();
        const integrated = /intel|uhd|iris|vega 3|vega 6|adreno|mali/.test(name);
        const powerful = /rtx|radeon rx|rx 6|rx 7|arc a7|apple gpu|apple m/.test(name);
        const vram = hardware.vram || (powerful ? 8192 : integrated ? 2048 : 4096);
        let preset = 'medium';

        if (goal === 'performance') {
            preset = integrated ? 'very-low' : 'low';
        } else if (goal === 'quality') {
            preset = powerful && vram >= 6144 ? 'ultra' : vram >= 4096 ? 'high' : 'medium';
        } else {
            preset = powerful && vram >= 8192 ? 'high' : integrated ? 'low' : 'medium';
        }

        this.setGraphicsQuality(preset);
        return { preset, hardware };
    }

    applyGraphicsSettings(settings) {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.renderScale));
        this.graphicsSettings = {
            ...settings,
            textureSize: settings.renderScale < 0.7 ? 32 : settings.renderScale < 0.9 ? 64 : 128,
            textureAnisotropy: settings.renderScale < 0.7 ? 1 : settings.renderScale < 0.9 ? 4 : 16,
            textureFilter: settings.renderScale < 0.75 ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter
        };
        this.renderer.shadowMap.enabled = settings.shadows;
        this.renderer.toneMappingExposure = 0.95;
        this.scene.traverse(object => {
            if (!object.isMesh || !object.material) return;
            this.applyMeshGraphics(object);
            if (object.material.map) {
                object.material.map.minFilter = settings.renderScale < 0.75 ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter;
                object.material.map.magFilter = settings.renderScale < 0.75 ? THREE.NearestFilter : THREE.LinearFilter;
                object.material.map.needsUpdate = true;
            }
        });
        this.scene.fog = settings.fog ? new THREE.Fog(0x87c9ef, 90, 220) : null;
    }
}

window.ThreeRenderer = ThreeRenderer;