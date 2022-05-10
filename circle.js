let GL = null;
const coord = 0;
onload = () => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.width = 600;
    canvas.height = 600;

    GL = canvas.getContext('webgl2');
    makeCircle()
    GL.enableVertexAttribArray(coord);
    const program = buildProgram(VS, FS, {coords: coord})
    const drawFrame = () => {
        let s = new Date().getSeconds();
        GL.clearColor(0, 0, 0, 1);
        GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT)
        GL.drawArrays(GL.TRIANGLES, 0, 180-(s*3))
        console.log(s)
        requestAnimationFrame(drawFrame);
    };
    GL.useProgram(program)
    requestAnimationFrame(drawFrame);
    drawFrame()
}

function makeCircle() {
    let coords = []
    for (let i = 0; i <= 59; i++) {
        coords.push(Math.cos(i * (2 * Math.PI / 60)), Math.sin(i * (2 * Math.PI / 60)))
        coords.push(Math.cos((i+1) * (2 * Math.PI / 60)), Math.sin((i+1) * (2 * Math.PI / 60)))
        coords.push(0,0)
    }
    coords = new Float32Array(coords)
    console.log(coords)
    GL.bindBuffer(GL.ARRAY_BUFFER, GL.createBuffer());
    GL.bufferData(GL.ARRAY_BUFFER, coords, GL.STATIC_DRAW);
    GL.vertexAttribPointer(coord, 2, GL.FLOAT, false, 8, 0);
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

const VS = ` #version 300 es
in vec2 coords;
void main(){
  gl_Position = vec4(coords, 0, 3);
}
`;

const FS = `#version 300 es
precision highp float;
out vec4 color;
void main(){
  color = vec4(1, 0, 0, 1);
}
`;