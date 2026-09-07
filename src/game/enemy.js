class Enemy {
    constructor(position, level) {
        this.position = position;
        this.velocity = new Vec3(0, 0, 0);
        this.rotation = new Quaternion(0, 0, 0, 1);

        this.health = 50;
        this.maxHealth = 50;

        this.speed = 3;
        this.patrolSpeed = 2;
        this.chaseSpeed = 4.5;

        this.sightRange = 20;
        this.sightAngle = Math.PI / 2; // 90 degrees

        this.state = 'patrol'; // patrol, chase, attack
        this.target = null;
        this.patrolPoints = [];
        this.currentPatrolIndex = 0;

        this.fireRate = 0.3;
        this.lastFireTime = 0;
        this.attackRange = 30;
        this.accuracy = 0.58;

        this.level = level;
        this.transform = new Transform();
        this.transform.position = position;

        this.mesh = null;
        this.isDead = false;

        this.hitbox = new AABB(
            position.add(new Vec3(-0.3, 0, -0.3)),
            position.add(new Vec3(0.3, 1.8, 0.3))
        );
    }

    update(dt, player, previousPosition = this.position.clone()) {
        if (this.isDead) return;

        const distToPlayer = this.position.sub(player.position).length();
        const canSeePlayer = this.canSee(player.position, player);

        if (canSeePlayer && distToPlayer < this.sightRange) {
            this.state = 'chase';
            this.target = player;
        } else if (this.state === 'chase') {
            this.state = 'patrol';
        }

        switch (this.state) {
            case 'patrol':
                this.updatePatrol(dt);
                break;
            case 'chase':
                this.updateChase(dt);
                break;
        }

        // Apply simple gravity
        this.velocity.y -= 25 * dt;
        this.position = this.position.add(this.velocity.mul(dt));

        // Floor collision
        if (this.position.y < 0.9) {
            this.position.y = 0.9;
            this.velocity.y = 0;
        }

        if (this.level && this.level.resolveEnemyCollision) {
            this.level.resolveEnemyCollision(this, previousPosition);
        }

        this.transform.position = this.position;
        this.updateHitbox();
    }

    updatePatrol(dt) {
        if (this.patrolPoints.length === 0) return;

        const targetPoint = this.patrolPoints[this.currentPatrolIndex];
        const direction = targetPoint.sub(this.position);
        const distance = direction.length();

        if (distance < 1) {
            this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
            return;
        }

        const normalizedDir = direction.normalize();
        this.velocity.x = normalizedDir.x * this.patrolSpeed;
        this.velocity.z = normalizedDir.z * this.patrolSpeed;

        const angle = Math.atan2(normalizedDir.x, -normalizedDir.z);
        this.rotation = Quaternion.fromEuler(0, angle, 0);
    }

    updateChase(dt) {
        if (!this.target || this.target.isDead) {
            this.state = 'patrol';
            return;
        }

        const direction = this.target.position.sub(this.position);
        const distance = direction.length();

        if (distance > this.sightRange * 1.5) {
            this.state = 'patrol';
            return;
        }

        const normalizedDir = distance > 0 ? direction.normalize() : new Vec3(0, 0, -1);
        this.velocity.x = normalizedDir.x * this.chaseSpeed;
        this.velocity.z = normalizedDir.z * this.chaseSpeed;

        const angle = Math.atan2(normalizedDir.x, -normalizedDir.z);
        this.rotation = Quaternion.fromEuler(0, angle, 0);

        // Try to shoot
        if (distance < this.attackRange) {
            this.tryAttack();
        }
    }

    canSee(point, player) {
        const direction = point.sub(this.position);
        const distance = direction.length();

        if (distance > this.sightRange) return false;

        const forward = this.rotation.rotateVector(Vec3.forward());
        const angle = Math.acos(
            Math.max(-1, Math.min(1, direction.normalize().dot(forward)))
        );

        if (angle >= this.sightAngle) return false;

        const wallDistance = this.level.traceBullet(new Ray(this.position, direction), distance);
        return wallDistance === null || wallDistance >= distance - 0.25;
    }

    tryAttack() {
        const now = performance.now();
        if (now - this.lastFireTime < this.fireRate * 1000) return;

        this.lastFireTime = now;

        if (!this.target) return;

        const toTarget = this.target.position.sub(this.position);
        const distance = toTarget.length();
        if (distance > this.attackRange) return;

        const direction = toTarget.normalize();
        const right = direction.cross(Vec3.up()).normalize();
        const up = right.cross(direction).normalize();
        const movementError = Math.min(0.08, this.velocity.length() * 0.012);
        const accuracyError = (1 - this.accuracy) * 0.075 + movementError;
        const shotDirection = Ballistics.applySpread(direction, right, up, accuracyError);
        const trajectory = Ballistics.simulate(this.position, shotDirection, distance, this.level.wind || Vec3.zero());
        const impactDirection = trajectory.position.sub(this.position).normalize();
        const ray = new Ray(this.position, impactDirection);
        const wallDistance = this.level.traceBulletPath
            ? this.level.traceBulletPath(trajectory.path)
            : this.level.traceBullet(ray, distance + 1);
        const targetDistance = this.target.position.sub(this.position).length();
        const playerHitbox = new AABB(
            this.target.position.add(new Vec3(-0.35, -1.7, -0.35)),
            this.target.position.add(new Vec3(0.35, 0.3, 0.35))
        );
        const targetHit = playerHitbox.raycast(ray);

        if (targetHit !== null && targetHit <= targetDistance && (wallDistance === null || targetHit < wallDistance)) {
            const damage = Math.max(4, Math.min(14, 10 * trajectory.impactEnergy / 1345));
            this.target.takeDamage(damage);
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.isDead = true;
            this.velocity = new Vec3(0, 0, 0);
        }
    }

    setPatrolPoints(points) {
        this.patrolPoints = points;
    }

    getHitbox() {
        return this.hitbox;
    }

    updateHitbox() {
        this.hitbox = new AABB(
            this.position.add(new Vec3(-0.3, 0, -0.3)),
            this.position.add(new Vec3(0.3, 1.8, 0.3))
        );
    }
}

class Hostage {
    constructor(position, level) {
        this.position = position;
        this.level = level;
        this.isRescued = false;
        this.transform = new Transform();
        this.transform.position = position;
        this.mesh = null;
    }

    rescue() {
        this.isRescued = true;
    }
}
