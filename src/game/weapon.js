class Weapon {
    constructor(name) {
        this.name = name;
        this.ammo = 30;
        this.maxAmmo = 30;
        this.reserve = 120;
        this.isAiming = false;
        this.isReloading = false;
        this.reloadTime = 2.0;
        this.reloadElapsed = 0;
        this.fireRate = 0.1;
        this.lastFireTime = 0;
        this.aimFOV = Math.PI / 8;
        this.normalFOV = Math.PI / 4;
    }

    update(dt, input, camera) {
        this.isAiming = input.isAiming();

        if (this.isReloading) {
            this.reloadElapsed += dt;
            if (this.reloadElapsed >= this.reloadTime) {
                this.finishReload();
            }
        }

        // Auto reload if out of ammo
        if (this.ammo === 0 && this.reserve > 0 && !this.isReloading) {
            this.startReload();
        }

        // Handle reload input
        if (input.isReloading() && !this.isReloading && this.ammo < this.maxAmmo && this.reserve > 0) {
            this.startReload();
        }
    }

    fire(camera, level) {
        const now = performance.now();
        if (now - this.lastFireTime < this.fireRate * 1000 || this.ammo === 0) {
            return null;
        }

        this.lastFireTime = now;
        this.ammo--;

        // Simulate the round before tracing its impact path.
        const direction = camera.rotation.rotateVector(Vec3.forward());
        const trajectory = Ballistics.simulate(camera.position, direction, 100, level.wind || Vec3.zero());
        const impactDirection = trajectory.position.sub(camera.position).normalize();
        const ray = new Ray(camera.position, impactDirection);

        // Add recoil
        const recoilAmount = 0.02;
        const recoilX = (Math.random() - 0.5) * recoilAmount;
        const recoilY = (Math.random() - 0.5) * recoilAmount;

        camera.rotation = Quaternion.fromEuler(
            Math.atan2(recoilX, 1),
            Math.atan2(recoilY, 1),
            0
        ).multiply(camera.rotation);

        const wallDistance = level.traceBulletPath ? level.traceBulletPath(trajectory.path) : level.traceBullet(ray, 100);

        // Raycast against level
        let hitResult = null;
        for (let enemy of level.enemies) {
            const t = enemy.getHitbox().raycast(ray);
            if (t !== null && t <= 100 && (wallDistance === null || t < wallDistance) && (hitResult === null || t < hitResult.distance)) {
                hitResult = { distance: t, enemy: enemy, point: ray.pointAt(t) };
            }
        }

        if (hitResult) {
            const damage = Math.max(8, Math.min(25, 25 * trajectory.impactEnergy / 1345));
            hitResult.enemy.takeDamage(damage);
        }

        return hitResult;
    }

    startReload() {
        if (this.ammo < this.maxAmmo && this.reserve > 0) {
            this.isReloading = true;
            this.reloadElapsed = 0;
        }
    }

    finishReload() {
        const needed = this.maxAmmo - this.ammo;
        const toLoad = Math.min(needed, this.reserve);
        this.ammo += toLoad;
        this.reserve -= toLoad;
        this.isReloading = false;
    }

    getAmmoDisplay() {
        return `${this.ammo} / ${this.reserve}`;
    }
}

class Rifle extends Weapon {
    constructor() {
        super('Rifle');
        this.ammo = 30;
        this.maxAmmo = 30;
        this.reserve = 120;
        this.fireRate = 0.08;
        this.reloadTime = 2.2;
    }
}

class Scope {
    constructor(magnification = 3) {
        this.magnification = magnification;
        this.texture = null;
        this.fbo = null;
        this.depthTexture = null;
    }

    setupFramebuffer(gl, width, height) {
        this.fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);

        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);

        this.depthTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0);

        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('Scope framebuffer incomplete:', status);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    renderView(gl, renderer, scene, camera) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
        renderer.clear(0, 0, 0);

        // Render with magnified FOV
        const oldFOV = camera.fov;
        camera.fov = Math.PI / 8;
        renderer.render(scene, camera);
        camera.fov = oldFOV;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
}
