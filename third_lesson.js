let GL = null;

onload = () => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.width = 600;
    canvas.height = 600;

    GL = canvas.getContext(`webgl2`);

    const { cube, program, uniforms } = setupScene();
    
    const renderFrame = time => {
        const aspect = processResize();

        GL.clearColor(0, 0, 0, 1);
        GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

        GL.useProgram(program);
    
        GL.bindVertexArray(cube);
    
        GL.uniform3f(uniforms.axis, 
            Math.cos(time/3000), 2*Math.cos(time/1700), 3
        );
        GL.uniform1f(uniforms.angle, time/1000);
        GL.uniform3f(uniforms.translation, 0, 0, 7);
        GL.uniform1f(uniforms.aspect, aspect);
    
        GL.drawArrays(GL.TRIANGLES, 0, 36);
    
        GL.bindVertexArray(null);

        requestAnimationFrame(renderFrame);
    };

    renderFrame(0);
}


function processResize() {
    const width = GL.canvas.clientWidth;
    const height = GL.canvas.clientHeight;
    const aspect = width / height;

    if (GL.canvas.height !== height || GL.canvas.width !== width) {
        GL.canvas.width = width;
        GL.canvas.height = height;
        GL.viewport(0, 0, width, height); 
    }

    return aspect;
}


function setupScene() {
    const image = document.getElementById(`SOME_IMAGE`);
    const texture = GL.createTexture();

    GL.bindTexture(GL.TEXTURE_2D, texture);
    GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, image);
    GL.generateMipmap(GL.TEXTURE_2D);
    const attributes = {
        coord: 0,
        index: 1,
    };

    const program = buildProgram(VS_SRC, FS_SRC, attributes);

    const cube = createCubeVAO(attributes);  

    GL.enable(GL.DEPTH_TEST);

    const uniforms = {};

    for (const name of ['axis', 'angle', 'translation', 'aspect']) {
        uniforms[name] = GL.getUniformLocation(program, name);
    }

    return { program, cube, uniforms };
}


function createCubeVAO(attributes) {
    const vao = GL.createVertexArray();

    GL.bindVertexArray(vao);

    const buffer = GL.createBuffer();

    GL.bindBuffer(GL.ARRAY_BUFFER, buffer);
    GL.bufferData(GL.ARRAY_BUFFER, makeCube(), GL.STATIC_DRAW);
   
    const { coord, index } = attributes;

    GL.enableVertexAttribArray(coord);
    GL.vertexAttribPointer(coord, 3, GL.FLOAT, false, 16, 0);

    GL.enableVertexAttribArray(index);
    GL.vertexAttribPointer(index, 1, GL.FLOAT, false, 16, 12);

    GL.bindVertexArray(null);

    return vao;
}


function compileShader(source, type) {
    let glType = type;

    if (type === 'vertex') { glType = GL.VERTEX_SHADER; }
    else if (type === 'fragment') { glType = GL.FRAGMENT_SHADER; }

    const shader = GL.createShader(glType);

    GL.shaderSource(shader, source);
    GL.compileShader(shader);


    if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) { 
        console.error(`SHADER TYPE ${type}`);
        console.error(GL.getShaderInfoLog(shader));

        return null;
    }

    return shader;
}


function makeCube() {
    const v0 = [-1, -1, -1, 0];
    const v1 = [-1, -1,  1, 1];
    const v2 = [-1,  1, -1, 2];
    const v3 = [-1,  1,  1, 3];
    const v4 = [1,  -1, -1, 4];
    const v5 = [1,  -1,  1, 5];
    const v6 = [1,   1, -1, 6];
    const v7 = [1,   1,  1, 7];

    return Float32Array.from(
        v0.concat(v1).concat(v2)
        .concat(v1).concat(v2).concat(v3)
        .concat(v0).concat(v1).concat(v4)
        .concat(v1).concat(v4).concat(v5)
        .concat(v0).concat(v2).concat(v4)
        .concat(v2).concat(v4).concat(v6)
        .concat(v7).concat(v3).concat(v6)
        .concat(v3).concat(v6).concat(v2)
        .concat(v7).concat(v5).concat(v3)
        .concat(v5).concat(v3).concat(v1)
        .concat(v7).concat(v5).concat(v6)
        .concat(v5).concat(v6).concat(v4)
    ); 
}


function buildProgram(vsSource, fsSource, attributes) {
    const vs = compileShader(vsSource, 'vertex');
    if (vs === null) { return null; }

    const fs = compileShader(fsSource, 'fragment');
    if (fs === null) { return null; }

    const program = GL.createProgram();

    for (const name in attributes) {
        const index = attributes[name];

        GL.bindAttribLocation(program, index, name);
    }
    
    GL.attachShader(program, vs);
    GL.attachShader(program, fs);
    GL.linkProgram(program);

    if (!GL.getProgramParameter(program, GL.LINK_STATUS)) { 
        console.error(GL.getProgramInfoLog(program));

        return null;
    }

    return program;
}


const VS_SRC = `#version 300 es

in vec3 coord;
in float index;  // пока не убираем! (позже пригодится)

uniform vec3 axis;
uniform float angle;
uniform vec3 translation;
uniform float aspect;
out vec2 tex_coords;
// t = t.z e12 - t.y e13 + t.x e23 + t.w e
vec4 lapply(vec4 t, vec3 v) {
    return vec4(t.w * v + cross(v, t.xyz), dot(v, t.xyz));
}

// v = v.x e1 + v.y e2 + v.z e3 + v.w e123
vec3 rapply(vec4 v, vec4 t) {
    return t.w * v.xyz - v.w * t.xyz + cross(t.xyz, v.xyz);
}

vec3 rotate(vec3 coord, vec3 axis, float angle) {
    axis = normalize(axis);
    float cosine_half = cos(angle / 2.0);
    float sine_half = sin(angle / 2.0);

    vec4 rot_r = vec4(sine_half * axis, cosine_half);
    vec4 rot_l = vec4(-rot_r.xyz, rot_r.w);

    return rapply(lapply(rot_l, coord), rot_r);
}

void main() {
    float scale = 2.3;

    vec3 position = rotate(scale*coord, axis, angle) + translation;
    
    gl_Position = vec4(position.x, position.y*aspect, -1, position.z);
    switch (int(index)) {
        case 0:
            tex_coords = vec2(0, 0);
            break;
        case 1:
            tex_coords = vec2(1, 0);
            break;
        case 2:
            tex_coords = vec2(1, 0);
            break;
        case 3:
            tex_coords = vec2(0, 0);
            break;
        case 4:
            tex_coords = vec2(0, 1);
            break;
        case 5:
            tex_coords = vec2(1, 1);
            break;
        case 6:
            tex_coords = vec2(1, 1);
            break;
        case 7:
            tex_coords = vec2(0, 1);
            break;
        default:
            tex_coords = vec2(0, 0);
        }
}
`;

const FS_SRC = `#version 300 es

precision highp float;
in vec2 tex_coords;
uniform sampler2D tex;
out vec4 frag_color;

void main() {
    frag_color = vec4(texture(tex, tex_coords).rgb, 1);
}
`;