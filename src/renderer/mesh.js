class Mesh {
    constructor(gl, vertices, normals, texCoords, indices) {
        this.gl = gl;
        this.vertexCount = indices.length;
        this.transform = new Transform();
        this.visible = true;
        this.baseColor = new Vec3(1, 1, 1);

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Vertex positions
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);

        // Normals
        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(1);

        // Texture coordinates
        this.texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(2);

        // Indices
        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        gl.bindVertexArray(null);
    }

    render(gl) {
        gl.bindVertexArray(this.vao);
        gl.drawElements(gl.TRIANGLES, this.vertexCount, gl.UNSIGNED_SHORT, 0);
    }

    static createBox(gl, width = 1, height = 1, depth = 1) {
        if (window.THREE) return ThreeMesh.box(width, height, depth);
        const w = width / 2;
        const h = height / 2;
        const d = depth / 2;

        const vertices = [
            -w, -h, -d, w, -h, -d, w, h, -d, -w, h, -d,
            -w, -h, d, w, -h, d, w, h, d, -w, h, d,
            -w, -h, -d, -w, h, -d, -w, h, d, -w, -h, d,
            w, -h, -d, w, h, -d, w, h, d, w, -h, d,
            -w, h, -d, w, h, -d, w, h, d, -w, h, d,
            -w, -h, -d, w, -h, -d, w, -h, d, -w, -h, d
        ];

        const normals = [
            0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
            0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
            -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
            1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
            0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0
        ];

        const texCoords = [];
        for (let i = 0; i < 6; i++) {
            texCoords.push(0, 0, 1, 0, 1, 1, 0, 1);
        }

        const indices = [
            0, 1, 2, 0, 2, 3,
            4, 6, 5, 4, 7, 6,
            8, 9, 10, 8, 10, 11,
            12, 14, 13, 12, 15, 14,
            16, 17, 18, 16, 18, 19,
            20, 22, 21, 20, 23, 22
        ];

        return new Mesh(gl, vertices, normals, texCoords, indices);
    }

    static createSphere(gl, radius = 1, segments = 32, rings = 16) {
        if (window.THREE) return ThreeMesh.sphere(radius, segments, rings);
        const vertices = [];
        const normals = [];
        const texCoords = [];
        const indices = [];

        for (let y = 0; y <= rings; y++) {
            const v = y / rings;
            const theta = v * Math.PI;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let x = 0; x <= segments; x++) {
                const u = x / segments;
                const phi = u * Math.PI * 2;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                const nx = cosPhi * sinTheta;
                const ny = cosTheta;
                const nz = sinPhi * sinTheta;

                vertices.push(radius * nx, radius * ny, radius * nz);
                normals.push(nx, ny, nz);
                texCoords.push(u, v);
            }
        }

        for (let y = 0; y < rings; y++) {
            for (let x = 0; x < segments; x++) {
                const a = y * (segments + 1) + x;
                const b = a + segments + 1;

                indices.push(a, b, a + 1);
                indices.push(b, b + 1, a + 1);
            }
        }

        return new Mesh(gl, vertices, normals, texCoords, indices);
    }

    static createPlane(gl, width = 1, depth = 1) {
        if (window.THREE) return ThreeMesh.plane(width, depth);
        const w = width / 2;
        const d = depth / 2;

        const vertices = [-w, 0, -d, w, 0, -d, w, 0, d, -w, 0, d];
        const normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
        const texCoords = [0, 0, 1, 0, 1, 1, 0, 1];
        const indices = [0, 1, 2, 0, 2, 3];

        return new Mesh(gl, vertices, normals, texCoords, indices);
    }

    static createCylinder(gl, radius = 1, height = 1, segments = 32) {
        if (window.THREE) return ThreeMesh.cylinder(radius, height, segments);
        const vertices = [];
        const normals = [];
        const texCoords = [];
        const indices = [];

        const h = height / 2;

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            vertices.push(x, h, z);
            normals.push(x, 0, z);
            texCoords.push(i / segments, 0);

            vertices.push(x, -h, z);
            normals.push(x, 0, z);
            texCoords.push(i / segments, 1);
        }

        for (let i = 0; i < segments; i++) {
            const a = i * 2;
            const b = a + 1;
            const c = ((i + 1) % (segments + 1)) * 2;
            const d = c + 1;

            indices.push(a, c, b);
            indices.push(c, d, b);
        }

        return new Mesh(gl, vertices, normals, texCoords, indices);
    }
}

class ThreeMesh {
    constructor(object3D) {
        this.object3D = object3D;
        this.transform = {
            position: new Vec3(),
            rotation: new Vec3(),
            scale: new Vec3(1, 1, 1)
        };
        this.visible = true;
        this.baseColor = new Vec3(1, 1, 1);
    }

    static material(color = 0xffffff, repeatX = 3, repeatY = 3) {
        return PBRMaterials.create('concrete', color, repeatX, repeatY);
    }

    static textureSet(size) {
        const THREE = window.THREE;
        const createCanvas = (draw) => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            draw(canvas.getContext('2d'), size);
            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(3, 3);
            if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
            return texture;
        };

        return {
            albedo: createCanvas((context, width) => {
                context.fillStyle = '#b8b8b8';
                context.fillRect(0, 0, width, width);
                context.globalAlpha = 0.16;
                const cell = Math.max(2, Math.floor(width / 8));
                for (let y = 0; y < width; y += cell) {
                    for (let x = 0; x < width; x += cell) {
                        context.fillStyle = (x + y) % (cell * 2) === 0 ? '#303030' : '#eeeeee';
                        context.fillRect(x, y, cell, cell);
                    }
                }
            }),
            roughness: createCanvas((context, width) => {
                context.fillStyle = '#b0b0b0';
                context.fillRect(0, 0, width, width);
                context.fillStyle = '#eeeeee';
                context.fillRect(0, 0, width / 2, width / 2);
                context.fillStyle = '#555555';
                context.fillRect(width / 2, width / 2, width / 2, width / 2);
            }),
            normal: createCanvas((context, width) => {
                context.fillStyle = '#8080ff';
                context.fillRect(0, 0, width, width);
                context.strokeStyle = '#a0a0ff';
                for (let line = 0; line < width; line += Math.max(2, Math.floor(width / 8))) {
                    context.beginPath();
                    context.moveTo(line, 0);
                    context.lineTo(line, width);
                    context.stroke();
                }
            })
        };
    }

    static box(width, height, depth) {
        const repeatX = Math.max(width, depth, 1) / 8;
        const repeatY = Math.max(height, depth, 1) / 8;
        return new ThreeMesh(new window.THREE.Mesh(
            new window.THREE.BoxGeometry(width, height, depth),
            ThreeMesh.material(0xffffff, repeatX, repeatY)
        ));
    }

    static sphere(radius, segments, rings) {
        return new ThreeMesh(new window.THREE.Mesh(
            new window.THREE.SphereGeometry(radius, segments, rings),
            ThreeMesh.material()
        ));
    }

    static plane(width, depth) {
        const mesh = new ThreeMesh(new window.THREE.Mesh(
            new window.THREE.PlaneGeometry(width, depth),
            PBRMaterials.create('sand', 0xc99f62, Math.max(width, 1) / 8, Math.max(depth, 1) / 8)
        ));
        mesh.transform.rotation.x = -Math.PI / 2;
        return mesh;
    }

    static cylinder(radius, height, segments) {
        return new ThreeMesh(new window.THREE.Mesh(
            new window.THREE.CylinderGeometry(radius, radius, height, segments),
            ThreeMesh.material(0xffffff, Math.max(radius * 2, 1) / 8, Math.max(height, 1) / 8)
        ));
    }
}

class Material {
    constructor(gl) {
        this.gl = gl;
        this.texture = this.createDefaultTexture();
    }

    createDefaultTexture() {
        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        const pixel = new Uint8Array([200, 200, 200, 255]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        return texture;
    }

    setTexture(imageData) {
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageData);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);
    }

    bind() {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    }
}
