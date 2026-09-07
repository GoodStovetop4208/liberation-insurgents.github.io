class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    add(v) {
        return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    sub(v) {
        return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    mul(s) {
        return new Vec3(this.x * s, this.y * s, this.z * s);
    }

    div(s) {
        return new Vec3(this.x / s, this.y / s, this.z / s);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(v) {
        return new Vec3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }

    length() {
        return Math.sqrt(this.dot(this));
    }

    normalize() {
        const len = this.length();
        return len > 0 ? this.div(len) : new Vec3();
    }

    clone() {
        return new Vec3(this.x, this.y, this.z);
    }

    static zero() {
        return new Vec3(0, 0, 0);
    }

    static one() {
        return new Vec3(1, 1, 1);
    }

    static up() {
        return new Vec3(0, 1, 0);
    }

    static forward() {
        return new Vec3(0, 0, -1);
    }

    static right() {
        return new Vec3(1, 0, 0);
    }
}

class Quaternion {
    constructor(x = 0, y = 0, z = 0, w = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    multiply(q) {
        const ax = this.x, ay = this.y, az = this.z, aw = this.w;
        const bx = q.x, by = q.y, bz = q.z, bw = q.w;

        return new Quaternion(
            ax * bw + aw * bx + ay * bz - az * by,
            ay * bw + aw * by + az * bx - ax * bz,
            az * bw + aw * bz + ax * by - ay * bx,
            aw * bw - ax * bx - ay * by - az * bz
        );
    }

    rotateVector(v) {
        const qv = new Quaternion(v.x, v.y, v.z, 0);
        const q_conj = new Quaternion(-this.x, -this.y, -this.z, this.w);
        const result = this.multiply(qv).multiply(q_conj);
        return new Vec3(result.x, result.y, result.z);
    }

    static fromAxisAngle(axis, angle) {
        const halfAngle = angle / 2;
        const s = Math.sin(halfAngle);
        return new Quaternion(
            axis.x * s,
            axis.y * s,
            axis.z * s,
            Math.cos(halfAngle)
        );
    }

    static fromEuler(x, y, z) {
        const cy = Math.cos(z * 0.5);
        const sy = Math.sin(z * 0.5);
        const cp = Math.cos(y * 0.5);
        const sp = Math.sin(y * 0.5);
        const cr = Math.cos(x * 0.5);
        const sr = Math.sin(x * 0.5);

        return new Quaternion(
            sr * cp * cy - cr * sp * sy,
            cr * sp * cy + sr * cp * sy,
            cr * cp * sy - sr * sp * cy,
            cr * cp * cy + sr * sp * sy
        );
    }

    toMatrix4() {
        const x = this.x, y = this.y, z = this.z, w = this.w;

        const m = new Float32Array(16);
        m[0] = 1 - 2 * (y * y + z * z);
        m[1] = 2 * (x * y - z * w);
        m[2] = 2 * (x * z + y * w);
        m[3] = 0;

        m[4] = 2 * (x * y + z * w);
        m[5] = 1 - 2 * (x * x + z * z);
        m[6] = 2 * (y * z - x * w);
        m[7] = 0;

        m[8] = 2 * (x * z - y * w);
        m[9] = 2 * (y * z + x * w);
        m[10] = 1 - 2 * (x * x + y * y);
        m[11] = 0;

        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;

        return m;
    }

    clone() {
        return new Quaternion(this.x, this.y, this.z, this.w);
    }

    static identity() {
        return new Quaternion(0, 0, 0, 1);
    }
}

class Matrix4 {
    constructor(data = null) {
        this.data = data || new Float32Array(16);
        if (!data) this.identity();
    }

    identity() {
        const m = this.data;
        m[0] = 1; m[1] = 0; m[2] = 0; m[3] = 0;
        m[4] = 0; m[5] = 1; m[6] = 0; m[7] = 0;
        m[8] = 0; m[9] = 0; m[10] = 1; m[11] = 0;
        m[12] = 0; m[13] = 0; m[14] = 0; m[15] = 1;
        return this;
    }

    translate(v) {
        const m = this.data;
        m[12] += v.x;
        m[13] += v.y;
        m[14] += v.z;
        return this;
    }

    multiply(b) {
        const a = this.data;
        const c = b.data;
        const result = new Float32Array(16);

        for (let col = 0; col < 4; col++) {
            for (let row = 0; row < 4; row++) {
                result[row + col * 4] =
                    a[row + 0 * 4] * c[0 + col * 4] +
                    a[row + 1 * 4] * c[1 + col * 4] +
                    a[row + 2 * 4] * c[2 + col * 4] +
                    a[row + 3 * 4] * c[3 + col * 4];
            }
        }

        return new Matrix4(result);
    }

    static perspective(fov, aspect, near, far) {
        const f = 1.0 / Math.tan(fov / 2);
        const m = new Float32Array(16);
        m[0] = f / aspect;
        m[1] = 0;
        m[2] = 0;
        m[3] = 0;
        m[4] = 0;
        m[5] = f;
        m[6] = 0;
        m[7] = 0;
        m[8] = 0;
        m[9] = 0;
        m[10] = (far + near) / (near - far);
        m[11] = -1;
        m[12] = 0;
        m[13] = 0;
        m[14] = (2 * far * near) / (near - far);
        m[15] = 0;
        return new Matrix4(m);
    }

    static lookAt(eye, center, up) {
        const f = center.sub(eye).normalize();
        const s = f.cross(up).normalize();
        const u = s.cross(f).normalize();

        const m = new Float32Array(16);
        m[0] = s.x;
        m[1] = u.x;
        m[2] = -f.x;
        m[3] = 0;
        m[4] = s.y;
        m[5] = u.y;
        m[6] = -f.y;
        m[7] = 0;
        m[8] = s.z;
        m[9] = u.z;
        m[10] = -f.z;
        m[11] = 0;
        m[12] = -s.dot(eye);
        m[13] = -u.dot(eye);
        m[14] = f.dot(eye);
        m[15] = 1;
        return new Matrix4(m);
    }

    clone() {
        return new Matrix4(new Float32Array(this.data));
    }
}

class Transform {
    constructor() {
        this.position = new Vec3();
        this.rotation = Quaternion.identity();
        this.scale = new Vec3(1, 1, 1);
    }

    getMatrix() {
        const rotation = this.rotation.toMatrix4();
        const sx = this.scale.x;
        const sy = this.scale.y;
        const sz = this.scale.z;

        const m = new Float32Array(16);
        m[0] = rotation[0] * sx;
        m[1] = rotation[1] * sx;
        m[2] = rotation[2] * sx;
        m[3] = 0;

        m[4] = rotation[4] * sy;
        m[5] = rotation[5] * sy;
        m[6] = rotation[6] * sy;
        m[7] = 0;

        m[8] = rotation[8] * sz;
        m[9] = rotation[9] * sz;
        m[10] = rotation[10] * sz;
        m[11] = 0;

        m[12] = this.position.x;
        m[13] = this.position.y;
        m[14] = this.position.z;
        m[15] = 1;

        return new Matrix4(m);
    }

    forward() {
        return this.rotation.rotateVector(Vec3.forward());
    }

    right() {
        return this.rotation.rotateVector(Vec3.right());
    }

    up() {
        return this.rotation.rotateVector(Vec3.up());
    }
}

class Ray {
    constructor(origin, direction) {
        this.origin = origin;
        this.direction = direction.normalize();
    }

    pointAt(t) {
        return this.origin.add(this.direction.mul(t));
    }
}

class AABB {
    constructor(min, max) {
        this.min = min;
        this.max = max;
    }

    raycast(ray) {
        let tMin = -Infinity;
        let tMax = Infinity;

        for (let i = 0; i < 3; i++) {
            const inv = 1.0 / ray.direction[i === 0 ? 'x' : i === 1 ? 'y' : 'z'];
            let t0 = (this.min[i === 0 ? 'x' : i === 1 ? 'y' : 'z'] - ray.origin[i === 0 ? 'x' : i === 1 ? 'y' : 'z']) * inv;
            let t1 = (this.max[i === 0 ? 'x' : i === 1 ? 'y' : 'z'] - ray.origin[i === 0 ? 'x' : i === 1 ? 'y' : 'z']) * inv;

            if (t0 > t1) [t0, t1] = [t1, t0];
            if (t0 > tMin) tMin = t0;
            if (t1 < tMax) tMax = t1;

            if (tMax < tMin) return null;
        }

        return tMin > 0 ? tMin : (tMax > 0 ? tMax : null);
    }
}
