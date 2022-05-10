let GL = null;
const coord = 0;
onload = () => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.width = 600;
    canvas.height = 600;

    GL = canvas.getContext('webgl2');
    makeSquare()
    GL.enableVertexAttribArray(coord); //включает общий массив атрибутов вершины по указанному индексу в список массивов атрибутов
    const program = buildProgram(VS, FS, {coords: coord})
    const drawFrame = () => {
        GL.clearColor(0, 0, 0, 1); //устанавливаем значение цвета, используемое при очистке цветовых буферов
        GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT) //очищаем буфер цвета и глубины до предустановленных значений
        GL.drawArrays(GL.TRIANGLES, 0, 6) //тип примитива, начальный индекс, количество индексов
        requestAnimationFrame(drawFrame);
    };
    GL.useProgram(program) //устанавливает webGL программу как часть рендеринга
    requestAnimationFrame(drawFrame);
    drawFrame()
}

function makeSquare() {
    const coords = new Float32Array([
        -1, -1,
        -1, 1,
        0, 0,
        0, 0,
        1,-1,
        1,1
    ])
    console.log(coords)
    GL.bindBuffer(GL.ARRAY_BUFFER, GL.createBuffer()); //Метод createBuffer создаёт пустой массив в памяти видеокарты и возвращает его уникальный идентификатор
    GL.bufferData(GL.ARRAY_BUFFER, coords, GL.STATIC_DRAW); //bufferData выделяет память и копирует данные из оперативной памяти компьютера в видеопамять
    GL.vertexAttribPointer(coord, 2, GL.FLOAT, false, 8, 0); //Метод vertexAttribPointer задаёт связь между указанным атрибутом и буфером, связанным в текущий момент с назначением ARRAY_BUFFER
}

function compileShader(source, type) {
    let glType = type;

    if (type === 'vertex') { glType = GL.VERTEX_SHADER; }
    else if (type === 'fragment') { glType = GL.FRAGMENT_SHADER; }

    const shader = GL.createShader(glType); //создание программы шейдера

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

    const program = GL.createProgram(); //создает и инициализирует WebGLProgram объект

    for (const name in attributes) {
        const index = attributes[name];

        GL.bindAttribLocation(program, index, name); //связывает индекс вершины с переменной атрибута(program-объект для привязки)
    }
    
    GL.attachShader(program, vs); //прикрепляет WebGLShader к объекту WebGLProgram
    GL.attachShader(program, fs); //прикрепляет WebGLShader к объекту WebGLProgram
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
  color = vec4(1, 0, 1, 1);
}
`;