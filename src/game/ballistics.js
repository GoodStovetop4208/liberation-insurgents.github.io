class Ballistics {
    static defaultRifle() {
        return {
            muzzleVelocity: 820,
            bulletMass: 0.004,
            ballisticCoefficient: 0.32,
            caliber: 0.0056,
            gravity: -9.81,
            airDensity: 1.225
        };
    }

    static gaussian() {
        let u = 0;
        let v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
    }

    static simulate(origin, direction, distance, wind = Vec3.zero(), config = Ballistics.defaultRifle()) {
        const step = 0.01;
        const area = Math.PI * Math.pow(config.caliber / 2, 2);
        const dragCoefficient = 0.295 / Math.max(config.ballisticCoefficient, 0.05);
        let position = origin.clone();
        let velocity = direction.normalize().mul(config.muzzleVelocity);
        let elapsed = 0;
        let traveled = 0;
        const path = [position.clone()];

        while (traveled < distance && elapsed < 2) {
            const relativeVelocity = velocity.sub(wind);
            const speed = relativeVelocity.length();
            const drag = speed > 0
                ? relativeVelocity.normalize().mul(-0.5 * config.airDensity * dragCoefficient * area * speed * speed / config.bulletMass)
                : Vec3.zero();
            const acceleration = drag.add(new Vec3(0, config.gravity, 0));
            velocity = velocity.add(acceleration.mul(step));
            position = position.add(velocity.mul(step));
            path.push(position.clone());
            traveled += velocity.length() * step;
            elapsed += step;
        }

        return {
            position,
            velocity,
            flightTime: elapsed,
            retainedVelocity: velocity.length(),
            impactEnergy: 0.5 * config.bulletMass * velocity.length() ** 2,
            drop: position.y - (origin.y + direction.normalize().y * distance),
            windDrift: position.sub(origin).sub(direction.normalize().mul(distance))
            ,path
        };
    }

    static applySpread(direction, right, up, angularSpread) {
        const horizontal = Ballistics.gaussian() * angularSpread;
        const vertical = Ballistics.gaussian() * angularSpread;
        return direction.add(right.mul(horizontal)).add(up.mul(vertical)).normalize();
    }
}
