class Player {
    constructor(position = new Vec3(0, 1.7, 5)) {
        this.position = position;
        this.velocity = new Vec3(0, 0, 0);
        this.rotation = new Quaternion(0, 0, 0, 1);

        this.health = 100;
        this.maxHealth = 100;

        this.speed = 5;
        this.sprintSpeed = 8;
        this.crouchSpeed = 2.5;
        this.jumpForce = 12;

        this.groundDrag = 0.1;
        this.airDrag = 0.02;
        this.isGrounded = true;
        this.gravity = -25;

        this.pitch = 0;
        this.yaw = 0;

        this.camera = new Camera(this.position);

        this.isDead = false;
        this.canJump = true;

        this.headHeight = 1.7;
        this.crouchHeight = 1.0;
        this.currentHeight = this.headHeight;

        this.selectedWeapon = 0;
        this.weapons = [
            new Rifle()
        ];
    }

    update(dt, input, level) {
        if (this.isDead) return;

        // Handle input
        const moveVec = input.getMovementVector();
        const currentSpeed = input.isSprinting() ? this.sprintSpeed : 
                           input.isCrouching() ? this.crouchSpeed : this.speed;

        // Apply movement
        let moveDir = new Vec3(0, 0, 0);
        
        const forward = this.rotation.rotateVector(Vec3.forward());
        const right = this.rotation.rotateVector(Vec3.right());

        moveDir = moveDir.add(forward.mul(moveVec.y));
        moveDir = moveDir.add(right.mul(moveVec.x));

        if (moveDir.length() > 0) {
            moveDir = moveDir.normalize();
        }

        this.velocity.x = moveDir.x * currentSpeed;
        this.velocity.z = moveDir.z * currentSpeed;

        // Apply gravity and jumping
        if (this.isGrounded && input.isJumping() && this.canJump) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
            this.canJump = false;
        }

        if (!input.isJumping()) {
            this.canJump = true;
        }

        this.velocity.y += this.gravity * dt;

        // Apply drag
        const drag = this.isGrounded ? this.groundDrag : this.airDrag;
        this.velocity.y *= Math.max(0, 1 - drag * dt);

        // Move, then resolve against level colliders using the actual previous position.
        const previousPosition = this.position.clone();
        this.position = this.position.add(this.velocity.mul(dt));
        if (level && level.resolvePlayerCollision) {
            level.resolvePlayerCollision(this, previousPosition);
        }

        // Floor collision (simple)
        if (this.position.y < this.currentHeight) {
            this.position.y = this.currentHeight;
            this.velocity.y = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        // Handle look input
        const mouseDelta = input.getMouseDelta();
        const sensitivity = 0.005 * (input.mouseSensitivity || 1);

        this.yaw -= mouseDelta.dx * sensitivity;
        this.pitch -= mouseDelta.dy * sensitivity;

        // Clamp pitch
        this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));

        // Update rotation
        this.rotation = Quaternion.fromEuler(this.pitch, this.yaw, 0);

        // Update camera
        this.camera.position = this.position.add(new Vec3(0, 0.1, 0));
        this.camera.rotation = this.rotation;

        if (this.weaponMesh) {
            const forward = this.rotation.rotateVector(Vec3.forward());
            const right = this.rotation.rotateVector(Vec3.right());
            const up = this.rotation.rotateVector(Vec3.up());
            const weaponOffset = forward.mul(-0.72).add(right.mul(0.42)).add(up.mul(-0.28));
            this.weaponMesh.transform.position = this.camera.position.add(weaponOffset);
            this.weaponMesh.transform.rotation = this.rotation;
            this.weaponMesh.transform.scale = new Vec3(0.22, 0.18, 0.9);
        }

        // Update weapon
        const weapon = this.weapons[this.selectedWeapon];
        if (weapon) {
            weapon.update(dt, input, this.camera);
            if (input.isFiring()) {
                const hit = weapon.fire(this.camera, level);
                input.consumeFireClick();
            }
        }

        // Handle crouching
        if (input.isCrouching()) {
            this.currentHeight = this.crouchHeight;
        } else {
            this.currentHeight = this.headHeight;
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
        }
        
        // Trigger blood effect
        if (this.onDamage) {
            this.onDamage(amount);
        }
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    getWeapon() {
        return this.weapons[this.selectedWeapon];
    }
}
