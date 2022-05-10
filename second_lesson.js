let GL = null;
const coord = 0;
onload = () => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.width = 600;
    canvas.height = 600;

    GL = canvas.getContext('webgl2');

    const { cube, program, uniforms } = setupScene();

    const renderFrame = time => {
        GL.clearColor((1 + Math.cos(time/1000))/2, 0, 0, 1);
        GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
    
        GL.useProgram(program);
        
        GL.bindVertexArray(cube);
        
        GL.uniform3f(uniforms.axis, 
            Math.cos(time/3000), 2*Math.cos(time/1700), 3
        );
        GL.uniform1f(uniforms.angle, time/1000);
        GL.uniform3f(uniforms.translation, 0, 0, 7);
        
        GL.drawArrays(GL.TRIANGLES, 0, 36);
        
        GL.bindVertexArray(null);
    
        requestAnimationFrame(renderFrame);
    };
    
    renderFrame(0);
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

function compileShader(source, type) {
    let glType = type;

    if (type === 'vertex') { glType = GL.VERTEX_SHADER; }
    else if (type === 'fragment') { glType = GL.FRAGMENT_SHADER; }

    const shader = GL.createShader(glType);

    GL.shaderSource(shader, source); //записываем исходный код шейдера в шейдерную программу
    GL.compileShader(shader); //компилируем исходный код GLSL шейдера в бинарные данные для использования программой 


    if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) { 
        console.error(`SHADER TYPE ${type}`);
        console.error(GL.getShaderInfoLog(shader));

        return null;
    }

    return shader;
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


function createCubeVAO(attributes) {
    const vao = GL.createVertexArray(); // слова Object в названии нет!

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

function setupScene() {
    const attributes = {
        coord: 0,
        index: 1,
    };

    const program = buildProgram(VS, FS, attributes);

    const cube = createCubeVAO(attributes);  

    GL.enable(GL.DEPTH_TEST);

    const uniforms = {};

    for (const name of ['axis', 'angle', 'translation']) {
        uniforms[name] = GL.getUniformLocation(program, name);
    }

    return { program, cube, uniforms };
}


const VS = ` #version 300 es

in vec3 coord;
in float index;

out vec3 color;

uniform vec3 axis;
uniform float angle;
uniform vec3 translation;

// t = t.x e12 + t.y e13 + t.z e23 + t.w e
// result = result.x e1 + result.y e2 + result.z e3 + result.w e123
vec4 lapply(vec4 t, vec3 v) {
    return vec4(t.w * v + vec3(
        + t.x * v.y + t.y * v.z,
        - t.x * v.x + t.z * v.z,
        - t.y * v.x - t.z * v.y
    ), t.x*v.z - t.y*v.y + t.z*v.x);
}

// v = v.x e1 + v.y e2 + v.z e3 + v.w e123
vec3 rapply(vec4 v, vec4 t) {
    return t.w * v.xyz + vec3(
        - t.x * v.y - t.y * v.z - t.z * v.w,
        + t.x * v.x - t.z * v.z + t.y * v.w,
        + t.y * v.x + t.z * v.y - t.x * v.w
    );
}

vec3 rotate(vec3 coord, vec3 axis, float angle) {
    axis = normalize(axis);
    float cosine_half = cos(angle / 2.0);
    float sine_half = sin(angle / 2.0);

    vec4 rot_r = vec4(
        sine_half * vec3(axis.z, -axis.y, axis.x),
        cosine_half
    );

    vec4 rot_l = vec4(-rot_r.xyz, rot_r.w);

    return rapply(lapply(rot_l, coord), rot_r);
}

void main() {
    vec3 position = rotate(coord, axis, angle) + translation;
    
    gl_Position = vec4(position.xy, -1, position.z);

    switch (int(index)) { /* всё как и прежде */ }
}
`;

const FS = ` #version 300 es
precision highp float;

in vec3 color;
out vec4 frag_color;

void main() {
    frag_color = vec4(color, 1);
}
`;