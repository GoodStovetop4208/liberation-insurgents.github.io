class WebGLRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2', { 
            antialias: true, 
            alpha: false,
            preserveDrawingBuffer: true 
        });

        if (!this.gl) {
            throw new Error('WebGL 2.0 not supported');
        }

        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.disable(this.gl.CULL_FACE);

        this.width = canvas.clientWidth;
        this.height = canvas.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.programs = new Map();
        this.meshes = [];
        this.lights = [];
        this.defaultTexture = this.createDefaultTexture();

        this.setupDefaultPrograms();
        this.resize();
    }

    createDefaultTexture() {
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

        const pixels = new Uint8Array([200, 200, 200, 255]);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA,
            1,
            1,
            0,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            pixels
        );

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);

        return texture;
    }

    setupDefaultPrograms() {
        const vertexShader = `#version 300 es
        precision highp float;

        in vec3 position;
        in vec3 normal;
        in vec2 texCoord;

        uniform mat4 uModel;
        uniform mat4 uView;
        uniform mat4 uProjection;

        out vec3 vNormal;
        out vec3 vFragPos;
        out vec2 vTexCoord;

        void main() {
            vFragPos = vec3(uModel * vec4(position, 1.0));
            vNormal = mat3(transpose(inverse(uModel))) * normal;
            vTexCoord = texCoord;
            gl_Position = uProjection * uView * vec4(vFragPos, 1.0);
        }`;

        const fragmentShader = `#version 300 es
        precision highp float;

        in vec3 vNormal;
        in vec3 vFragPos;
        in vec2 vTexCoord;

        uniform sampler2D uTexture;
        uniform vec3 uBaseColor;
        uniform vec3 uViewPos;
        uniform vec3 uLightPos[8];
        uniform vec3 uLightColor[8];
        uniform int uLightCount;

        out vec4 FragColor;

        vec3 getNormal() {
            return normalize(vNormal);
        }

        void main() {
            vec3 norm = getNormal();
            vec3 viewDir = normalize(uViewPos - vFragPos);
            
            vec4 texColor = texture(uTexture, vTexCoord);
            vec3 tint = texColor.rgb * uBaseColor;
            vec3 result = tint * 0.12;

            for(int i = 0; i < 8; i++) {
                if(i >= uLightCount) break;
                
                vec3 lightDir = normalize(uLightPos[i] - vFragPos);
                float diff = max(dot(norm, lightDir), 0.0);
                vec3 diffuse = diff * uLightColor[i];
                
                vec3 reflectDir = reflect(-lightDir, norm);
                float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
                vec3 specular = 0.5 * spec * uLightColor[i];
                
                result += (diffuse + specular) * tint;
            }

            FragColor = vec4(result, texColor.a);
        }`;

        this.programs.set('default', new ShaderProgram(this.gl, vertexShader, fragmentShader));
    }

    resize() {
        this.width = this.canvas.clientWidth;
        this.height = this.canvas.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.gl.viewport(0, 0, this.width, this.height);
    }

    clear(r = 0, g = 0, b = 0, a = 1) {
        this.gl.clearColor(r, g, b, a);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    render(scene, camera) {
        this.clear(0.69, 0.85, 0.97, 1.0);

        const program = this.programs.get('default');
        program.use();
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.defaultTexture);
        program.setInt('uTexture', 0);

        const projection = Matrix4.perspective(
            Math.PI / 4,
            this.width / this.height,
            0.1,
            1000
        );
        const view = Matrix4.lookAt(camera.position, camera.getTarget(), Vec3.up());

        program.setMatrix4('uProjection', projection.data);
        program.setMatrix4('uView', view.data);
        program.setVec3('uViewPos', camera.position);

        this.lights.forEach((light, index) => {
            if (index < 8) {
                program.setVec3(`uLightPos[${index}]`, light.position);
                program.setVec3(`uLightColor[${index}]`, light.color);
            }
        });
        program.setInt('uLightCount', Math.min(this.lights.length, 8));

        this.meshes.forEach(mesh => {
            if (!mesh.visible) return;

            const model = mesh.transform.getMatrix();
            program.setMatrix4('uModel', model.data);
            program.setVec3('uBaseColor', mesh.baseColor || new Vec3(1, 1, 1));

            mesh.render(this.gl);
        });
    }

    addMesh(mesh) {
        this.meshes.push(mesh);
    }

    removeMesh(mesh) {
        const index = this.meshes.indexOf(mesh);
        if (index > -1) this.meshes.splice(index, 1);
    }

    addLight(light) {
        this.lights.push(light);
    }

    setGraphicsQuality(quality) {
        this.quality = quality;
    }
}

class ShaderProgram {
    constructor(gl, vertexSrc, fragmentSrc) {
        this.gl = gl;
        this.program = gl.createProgram();

        const vertShader = this.compileShader(vertexSrc, gl.VERTEX_SHADER);
        const fragShader = this.compileShader(fragmentSrc, gl.FRAGMENT_SHADER);

        gl.attachShader(this.program, vertShader);
        gl.attachShader(this.program, fragShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Program linking error:', gl.getProgramInfoLog(this.program));
        }

        gl.deleteShader(vertShader);
        gl.deleteShader(fragShader);
    }

    compileShader(src, type) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, src);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    use() {
        this.gl.useProgram(this.program);
    }

    setInt(name, value) {
        const loc = this.gl.getUniformLocation(this.program, name);
        this.gl.uniform1i(loc, value);
    }

    setFloat(name, value) {
        const loc = this.gl.getUniformLocation(this.program, name);
        this.gl.uniform1f(loc, value);
    }

    setVec3(name, v) {
        const loc = this.gl.getUniformLocation(this.program, name);
        this.gl.uniform3f(loc, v.x, v.y, v.z);
    }

    setMatrix4(name, data) {
        const loc = this.gl.getUniformLocation(this.program, name);
        this.gl.uniformMatrix4fv(loc, false, data);
    }
}

class Light {
    constructor(position, color) {
        this.position = position;
        this.color = color;
    }
}

class Camera {
    constructor(position = new Vec3(0, 1.7, 0)) {
        this.position = position;
        this.rotation = new Quaternion(0, 0, 0, 1);
        this.fov = Math.PI / 4;
    }

    getTarget() {
        const forward = this.rotation.rotateVector(Vec3.forward());
        return this.position.add(forward);
    }

    lookAtEuler(pitch, yaw) {
        this.rotation = Quaternion.fromEuler(pitch, yaw, 0);
    }

    moveForward(distance) {
        const forward = this.rotation.rotateVector(Vec3.forward());
        this.position = this.position.add(forward.mul(distance));
    }

    moveRight(distance) {
        const right = this.rotation.rotateVector(Vec3.right());
        this.position = this.position.add(right.mul(distance));
    }

    moveUp(distance) {
        this.position.y += distance;
    }
}
