// Shader collection for different rendering passes
class ShaderLibrary {
    static getStandardVertexShader() {
        return `#version 300 es
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
    }

    static getStandardFragmentShader() {
        return `#version 300 es
        precision highp float;

        in vec3 vNormal;
        in vec3 vFragPos;
        in vec2 vTexCoord;

        uniform sampler2D uTexture;
        uniform vec3 uViewPos;
        uniform vec3 uLightPos[8];
        uniform vec3 uLightColor[8];
        uniform int uLightCount;

        out vec4 FragColor;

        void main() {
            vec3 norm = normalize(vNormal);
            vec3 viewDir = normalize(uViewPos - vFragPos);
            
            vec4 texColor = texture(uTexture, vTexCoord);
            vec3 result = texColor.rgb * 0.15;

            for(int i = 0; i < 8; i++) {
                if(i >= uLightCount) break;
                
                vec3 lightDir = normalize(uLightPos[i] - vFragPos);
                float distance = length(uLightPos[i] - vFragPos);
                float attenuation = 1.0 / (1.0 + 0.1 * distance);
                
                float diff = max(dot(norm, lightDir), 0.0);
                vec3 diffuse = diff * uLightColor[i] * attenuation;
                
                vec3 reflectDir = reflect(-lightDir, norm);
                float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
                vec3 specular = 0.5 * spec * uLightColor[i] * attenuation;
                
                result += (diffuse + specular) * texColor.rgb;
            }

            FragColor = vec4(result, texColor.a);
        }`;
    }

    static getScopeFragmentShader() {
        return `#version 300 es
        precision highp float;

        in vec3 vNormal;
        in vec3 vFragPos;
        in vec2 vTexCoord;

        uniform sampler2D uTexture;

        out vec4 FragColor;

        void main() {
            // Magnified scope view with vignette
            vec2 centerDist = abs(vTexCoord - 0.5);
            float vignette = 1.0 - smoothstep(0.4, 0.5, max(centerDist.x, centerDist.y));
            
            vec4 texColor = texture(uTexture, vTexCoord);
            FragColor = texColor * vignette;
        }`;
    }
}
