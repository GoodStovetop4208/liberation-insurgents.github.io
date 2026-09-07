class Level {
    constructor(gl, renderer) {
        this.gl = gl;
        this.renderer = renderer;

        this.walls = [];
        this.doors = [];
        this.enemies = [];
        this.hostages = [];
        this.items = [];
        this.solidColliders = [];
        this.wind = new Vec3(2.5, 0, -1.2);

        this.objectives = [
            { id: 'secure', text: 'Secure the compound', complete: false },
            { id: 'rescue', text: 'Rescue 3 hostages', complete: false, rescued: 0, target: 3 },
            { id: 'extract', text: 'Extract to helicopter', complete: false }
        ];

        this.extractionZone = new AABB(
            new Vec3(25, 0, -25),
            new Vec3(30, 3, -20)
        );

        this.generateCompound();
    }

    generateCompound() {
        // Large desert ground
        const floor = Mesh.createPlane(this.gl, 140, 140);
        floor.transform.position = new Vec3(0, 0, 0);
        floor.baseColor = new Vec3(0.76, 0.68, 0.43);
        this.renderer.addMesh(floor);
        this.walls.push(floor);

        // Outer compound walls
        this.createWall(new Vec3(0, 1.5, 68), 140, 3, 1, 'north_wall');
        this.createWall(new Vec3(0, 1.5, -68), 140, 3, 1, 'south_wall');
        this.createWall(new Vec3(68, 1.5, 0), 1, 3, 140, 'east_wall');
        this.createWall(new Vec3(-68, 1.5, 0), 1, 3, 140, 'west_wall');

        // Add several buildings inside the compound
        this.createBuilding(new Vec3(-38, 0, -32), 12, 10, 10);
        this.createBuilding(new Vec3(38, 0, -32), 12, 10, 10);
        this.createBuilding(new Vec3(-38, 0, 32), 12, 10, 10);
        this.createBuilding(new Vec3(38, 0, 32), 12, 10, 10);
        this.createBuilding(new Vec3(0, 0, 0), 18, 7, 12);
        this.createBuilding(new Vec3(0, 0, -48), 18, 7, 10);

        // Internal walls and cover lanes
        this.createWall(new Vec3(-18, 1.5, 0), 1, 3, 38, 'wall_a');
        this.createWall(new Vec3(18, 1.5, 0), 1, 3, 38, 'wall_b');
        this.createWall(new Vec3(0, 1.5, 20), 36, 3, 1, 'wall_c');
        this.createWall(new Vec3(0, 1.5, -20), 36, 3, 1, 'wall_d');

        // Gates / doors
        this.createDoor(new Vec3(0, 0, 68), 6, 3);
        this.createDoor(new Vec3(0, 0, -68), 6, 3);
        this.createDoor(new Vec3(68, 0, 0), 6, 3);
        this.createDoor(new Vec3(-68, 0, 0), 6, 3);

        // Sandbag barriers and crates around open lanes
        for (let x of [-12, -5, 5, 12]) {
            for (let z of [-12, 12]) {
                const barricade = Mesh.createBox(this.gl, 3, 1.2, 1.2);
                barricade.transform.position = new Vec3(x, 0.6, z);
                barricade.baseColor = new Vec3(0.62, 0.56, 0.45);
                this.renderer.addMesh(barricade);
                this.walls.push(barricade);
            }
        }

        // Place enemies
        this.enemies.push(new Enemy(new Vec3(-5, 0.9, 5), this));
        this.enemies.push(new Enemy(new Vec3(5, 0.9, -5), this));
        this.enemies.push(new Enemy(new Vec3(0, 0.9, 15), this));
        this.enemies.push(new Enemy(new Vec3(-15, 0.9, 0), this));

        // Patrol points for enemies
        this.enemies[0].setPatrolPoints([
            new Vec3(-5, 0.9, 5),
            new Vec3(-15, 0.9, 5),
            new Vec3(-15, 0.9, -10),
            new Vec3(-5, 0.9, -10)
        ]);

        this.enemies[1].setPatrolPoints([
            new Vec3(5, 0.9, -5),
            new Vec3(15, 0.9, -5),
            new Vec3(15, 0.9, 10),
            new Vec3(5, 0.9, 10)
        ]);

        this.enemies[2].setPatrolPoints([
            new Vec3(0, 0.9, 15),
            new Vec3(-8, 0.9, 15),
            new Vec3(8, 0.9, 15)
        ]);

        this.enemies[3].setPatrolPoints([
            new Vec3(-15, 0.9, 0),
            new Vec3(-15, 0.9, -15),
            new Vec3(-10, 0.9, -15)
        ]);

        // Add healing items (dressings and bandages)
        this.items.push(new HealthItem(new Vec3(-15, 1, 10), 'bandage', 25));
        this.items.push(new HealthItem(new Vec3(15, 1, -15), 'dressing', 50));
        this.items.push(new HealthItem(new Vec3(0, 1, -20), 'bandage', 25));
        this.items.push(new HealthItem(new Vec3(-20, 1, -20), 'dressing', 50));
        this.items.push(new HealthItem(new Vec3(20, 1, 10), 'bandage', 25));

        // Create visual meshes for health items
        this.items.forEach(item => {
            item.mesh = Mesh.createBox(this.gl, 0.3, 0.3, 0.3);
            item.mesh.transform.position = item.position;
            item.mesh.baseColor = item.type === 'dressing' ? new Vec3(0.2, 0.75, 0.32) : new Vec3(0.93, 0.82, 0.31);
            this.renderer.addMesh(item.mesh);
        });

        // Create visual meshes for enemies
        this.enemies.forEach(enemy => {
            enemy.mesh = Mesh.createCylinder(this.gl, 0.3, 1.8, 8);
            enemy.mesh.transform.position = enemy.position;
            enemy.mesh.baseColor = new Vec3(0.7, 0.14, 0.14);
            this.renderer.addMesh(enemy.mesh);
        });

        // Place hostages
        this.hostages.push(new Hostage(new Vec3(-10, 0.9, -5), this));
        this.hostages.push(new Hostage(new Vec3(10, 0.9, 5), this));
        this.hostages.push(new Hostage(new Vec3(-5, 0.9, 15), this));

        // Create visual meshes for hostages
        this.hostages.forEach(hostage => {
            hostage.mesh = Mesh.createBox(this.gl, 0.4, 1.6, 0.4);
            hostage.mesh.transform.position = hostage.position;
            hostage.mesh.transform.scale = new Vec3(0.6, 0.8, 0.6);
            hostage.mesh.baseColor = new Vec3(0.96, 0.86, 0.58);
            this.renderer.addMesh(hostage.mesh);
        });

        // Add bright lighting for visibility
        this.renderer.addLight(new Light(new Vec3(0, 20, 0), new Vec3(1.5, 1.5, 1.5)));
        this.renderer.addLight(new Light(new Vec3(-25, 8, -25), new Vec3(1.2, 1.2, 1.4)));
        this.renderer.addLight(new Light(new Vec3(25, 8, 25), new Vec3(1.4, 1.2, 1.2)));
        this.renderer.addLight(new Light(new Vec3(0, 8, -20), new Vec3(1.0, 1.0, 1.0)));
        this.renderer.addLight(new Light(new Vec3(-20, 8, 0), new Vec3(1.0, 1.0, 1.0)));
        this.renderer.addLight(new Light(new Vec3(20, 8, 0), new Vec3(1.0, 1.0, 1.0)));
        this.renderer.addLight(new Light(new Vec3(0, 8, 20), new Vec3(1.0, 1.0, 1.0)));
    }

    createWall(position, width, height, depth, id) {
        const wall = Mesh.createBox(this.gl, width, height, depth);
        wall.transform.position = position;
        wall.baseColor = new Vec3(0.92, 0.91, 0.86);
        wall.id = id;
        this.renderer.addMesh(wall);
        this.walls.push(wall);
        this.addSolidCollider(position, width, height, depth);
    }

    createDoor(position, width, height) {
        const door = new Door(position, width, height, this.gl);
        door.mesh.baseColor = new Vec3(0.28, 0.24, 0.17);
        this.doors.push(door);
        this.renderer.addMesh(door.mesh);
        this.addSolidCollider(position, width, height, 0.2);
    }

    createBuilding(position, width, height, depth) {
        const base = Mesh.createBox(this.gl, width, height, depth);
        base.transform.position = position.add(new Vec3(0, height / 2, 0));
        base.baseColor = new Vec3(0.95, 0.95, 0.95);
        this.renderer.addMesh(base);
        this.walls.push(base);
        this.addSolidCollider(base.transform.position, width, height, depth);

        const roof = Mesh.createBox(this.gl, width * 1.08, 0.8, depth * 1.08);
        roof.transform.position = position.add(new Vec3(0, height + 0.45, 0));
        roof.baseColor = new Vec3(0.24, 0.25, 0.26);
        this.renderer.addMesh(roof);
        this.walls.push(roof);
        this.addSolidCollider(roof.transform.position, width * 1.08, 0.8, depth * 1.08);

        // Add entry door and window blocks for building detail
        const door = Mesh.createBox(this.gl, 2.5, 3, 0.6);
        door.transform.position = position.add(new Vec3(0, 1.5, depth / 2 + 0.2));
        door.baseColor = new Vec3(0.24, 0.18, 0.12);
        this.renderer.addMesh(door);
        this.walls.push(door);
        this.addSolidCollider(door.transform.position, 2.5, 3, 0.6);

        const window1 = Mesh.createBox(this.gl, 1.5, 1.2, 0.4);
        const window2 = Mesh.createBox(this.gl, 1.5, 1.2, 0.4);
        window1.transform.position = position.add(new Vec3(-width / 3, 2.5, depth / 2 + 0.2));
        window2.transform.position = position.add(new Vec3(width / 3, 2.5, depth / 2 + 0.2));
        window1.baseColor = new Vec3(0.72, 0.86, 0.92);
        window2.baseColor = new Vec3(0.72, 0.86, 0.92);
        this.renderer.addMesh(window1);
        this.renderer.addMesh(window2);
        this.walls.push(window1, window2);
        this.addSolidCollider(window1.transform.position, 1.5, 1.2, 0.4);
        this.addSolidCollider(window2.transform.position, 1.5, 1.2, 0.4);
    }

    addSolidCollider(position, width, height, depth) {
        this.solidColliders.push(new AABB(
            position.sub(new Vec3(width / 2, 0, depth / 2)),
            position.add(new Vec3(width / 2, height, depth / 2))
        ));
    }

    resolvePlayerCollision(player, previousPosition = player.position.clone()) {
        const radius = 0.5;

        const tryAxis = (axis) => {
            const test = previousPosition.clone();
            test[axis] = player.position[axis];
            if (this.isBlocked(test)) {
                player.position[axis] = previousPosition[axis];
                if (axis === 'x') player.velocity.x = 0;
                if (axis === 'z') player.velocity.z = 0;
            }
        };

        tryAxis('x');
        tryAxis('z');

        const playerMin = new Vec3(player.position.x - radius, player.position.y - 1.7, player.position.z - radius);
        const playerMax = new Vec3(player.position.x + radius, player.position.y + 0.3, player.position.z + radius);

        const blocked = this.solidColliders.some(collider =>
            playerMax.x > collider.min.x && playerMin.x < collider.max.x &&
            playerMax.y > collider.min.y && playerMin.y < collider.max.y &&
            playerMax.z > collider.min.z && playerMin.z < collider.max.z
        );

        if (blocked) {
            player.position = previousPosition.clone();
            player.velocity.x = 0;
            player.velocity.z = 0;
        }
    }

    isBlocked(position) {
        const radius = 0.5;
        const min = new Vec3(position.x - radius, position.y - 1.7, position.z - radius);
        const max = new Vec3(position.x + radius, position.y + 0.3, position.z + radius);

        return this.solidColliders.some(collider =>
            max.x > collider.min.x && min.x < collider.max.x &&
            max.y > collider.min.y && min.y < collider.max.y &&
            max.z > collider.min.z && min.z < collider.max.z
        );
    }

    resolveEnemyCollision(enemy, previousPosition) {
        const radius = 0.35;
        const testAxis = axis => {
            const candidate = previousPosition.clone();
            candidate[axis] = enemy.position[axis];
            const min = new Vec3(candidate.x - radius, candidate.y, candidate.z - radius);
            const max = new Vec3(candidate.x + radius, candidate.y + 1.8, candidate.z + radius);
            const blocked = this.solidColliders.some(collider =>
                max.x > collider.min.x && min.x < collider.max.x &&
                max.y > collider.min.y && min.y < collider.max.y &&
                max.z > collider.min.z && min.z < collider.max.z
            );
            if (blocked) {
                enemy.position[axis] = previousPosition[axis];
                enemy.velocity[axis] = 0;
            }
        };

        testAxis('x');
        testAxis('z');
    }

    traceBullet(ray, maxDistance) {
        let nearest = null;
        this.solidColliders.forEach(collider => {
            const distance = collider.raycast(ray);
            if (distance !== null && distance <= maxDistance && (nearest === null || distance < nearest)) {
                nearest = distance;
            }
        });
        return nearest;
    }

    traceBulletPath(path) {
        let traveled = 0;
        for (let index = 1; index < path.length; index++) {
            const start = path[index - 1];
            const end = path[index];
            const segment = end.sub(start);
            const length = segment.length();
            if (length <= 0) continue;
            const hit = this.traceBullet(new Ray(start, segment), length);
            if (hit !== null) return traveled + hit;
            traveled += length;
        }
        return null;
    }

    update(dt, player) {
        // Update enemies
        this.enemies.forEach(enemy => {
            const previousPosition = enemy.position.clone();
            enemy.update(dt, player, previousPosition);
            if (enemy.mesh) {
                enemy.mesh.transform.position = enemy.position;
                enemy.mesh.transform.rotation = enemy.rotation;
            }
        });

        // Check if hostages are rescued (proximity based)
        this.hostages.forEach(hostage => {
            if (!hostage.isRescued) {
                const distToPlayer = hostage.position.sub(player.position).length();
                if (distToPlayer < 2) {
                    hostage.rescue();
                    this.updateObjective('rescue', 1);
                }
            }
        });

        // Check for health item pickups
        this.items = this.items.filter(item => {
            if (item.collected) return false;
            
            const distToPlayer = item.position.sub(player.position).length();
            if (distToPlayer < 1.5) {
                player.heal(item.healAmount);
                item.collected = true;
                if (item.mesh) {
                    this.renderer.removeMesh(item.mesh);
                }
                return false;
            }
            return true;
        });

        // Check if player is in extraction zone
        const playerInExtraction = this.isPointInBox(player.position, this.extractionZone);
        if (playerInExtraction && this.objectives.find(o => o.id === 'rescue').complete) {
            this.completeObjective('extract');
        }

        // Remove dead enemies
        this.enemies = this.enemies.filter(e => !e.isDead || e.mesh);
    }

    isPointInBox(point, box) {
        return point.x >= box.min.x && point.x <= box.max.x &&
               point.y >= box.min.y && point.y <= box.max.y &&
               point.z >= box.min.z && point.z <= box.max.z;
    }

    updateObjective(id, increment = 1) {
        const objective = this.objectives.find(o => o.id === id);
        if (!objective) return;

        if (objective.rescued !== undefined) {
            objective.rescued += increment;
            if (objective.rescued >= objective.target) {
                objective.complete = true;
            }
        }
    }

    completeObjective(id) {
        const objective = this.objectives.find(o => o.id === id);
        if (objective) objective.complete = true;
    }

    isComplete() {
        return this.objectives.every(o => o.complete);
    }

    render(renderer, camera) {
        renderer.render(this, camera);
    }

    get meshes() {
        return this.renderer.meshes;
    }
}

class Door {
    constructor(position, width, height, gl) {
        this.position = position;
        this.width = width;
        this.height = height;
        this.isOpen = false;
        this.openProgress = 0;

        this.mesh = Mesh.createBox(gl, width, height, 0.2);
        this.mesh.transform.position = position;

        this.hitbox = new AABB(
            position.sub(new Vec3(width / 2, 0, 0.1)),
            position.add(new Vec3(width / 2, height, 0.1))
        );
    }

    interact() {
        this.isOpen = !this.isOpen;
    }

    update(dt) {
        if (this.isOpen) {
            this.openProgress = Math.min(1, this.openProgress + dt * 2);
        } else {
            this.openProgress = Math.max(0, this.openProgress - dt * 2);
        }

        // Move door up when opened
        this.mesh.transform.position.y = this.openProgress * 0.5;
    }
}

class HealthItem {
    constructor(position, type, healAmount) {
        this.position = position;
        this.type = type; // 'bandage' (25HP) or 'dressing' (50HP)
        this.healAmount = healAmount;
        this.collected = false;
        this.mesh = null;
    }
}
