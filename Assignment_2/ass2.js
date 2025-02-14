var gl;
var canvas;

var buf;
var indexBuf;
var aPositionLocation;
var uColorLocation;
var uPMatrixLocation;
var uMMatrixLocation;
var uVMatrixLocation;
var uNormalLocation;

var spBuf;
var spIndexBuf;
var spNormalBuf;

var spVerts = [];
var spIndicies = [];
var spNormals = [];

var degree5 = 0.0;
var degree4 = 0.0;
var degree3 = 0.0;
var degree2 = 0.0;
var degree1 = 0.0;
var degree0 = 0.0;
var prevMouseX = 0.0;
var prevMouseY = 0.0;

var vMatrix = mat4.create();
var mMatrix = mat4.create();
var pMatrix = mat4.create();
var matrixStack = [];

var lightPosition=[0,0,1];
var eyePos = [0.0, 0.0, 2];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];

const vertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
out vec3 posInEyeSpace;
out vec3 modifiedNormal;

void main() {

  mat4 projectionModelView;
  mat4 modelView = uVMatrix*uMMatrix;
	projectionModelView = uPMatrix*uVMatrix*uMMatrix;
  posInEyeSpace = vec3(modelView*vec4(aPosition,1.0));

  gl_Position = projectionModelView*vec4(aPosition,1.0);
  gl_PointSize=5.0;
  
}`;

const fragShaderCode = `#version 300 es
precision mediump float;
in vec3 color;
in vec3 posInEyeSpace;

uniform vec4 objColor;
uniform vec3 lightPosition;

out vec4 fragColor;
float ambient = 0.5;
float shine = 15.0;

void main() {
  vec3 normal = normalize(cross(dFdx(posInEyeSpace), dFdy(posInEyeSpace)));
  vec3 lightVec = normalize(lightPosition - posInEyeSpace);
  float lambertian = max(dot(normal, lightVec), 0.0);
  vec3 R = normalize(-reflect(lightVec,normal));
  vec3 V = normalize(-posInEyeSpace);
  float specAng = max(dot(R,V), 0.0);
  float specMult = pow(specAng, shine);
  fragColor = vec4(lambertian*objColor.xyz,1.0) + vec4(ambient*objColor.xyz,1.0) + specMult*vec4(1.0,1.0,1.0,1.0);
  // fragColor = specMult*vec4(0.0,0.0,1.0,1.0);
}`;

const phongVertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
out vec3 vNormal;
out vec3 vPosition; 

void main() {
    mat4 projectionModelView;
    projectionModelView = uPMatrix * uVMatrix * uMMatrix;
    gl_Position = projectionModelView * vec4(aPosition, 1.0);
    vNormal = mat3(uMMatrix) * aNormal; 
    vPosition = vec3(uMMatrix * vec4(aPosition, 1.0));// Calculate vNormal using the model matrix
    gl_PointSize = 5.0;
}`;



const phongFragShaderCode = `#version 300 es
precision mediump float;
in vec3 vNormal;
in vec3 vPosition;
out vec4 fragColorp;
uniform vec3 lightPosition;
uniform vec3 ambientColor;
uniform vec3 diffuseColor;
uniform vec3 specularColor;
uniform float shininess;

void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(lightPosition - vPosition);
    vec3 viewDir = normalize(-vPosition);
    vec3 reflectDir = reflect(-lightDir, normal);

    float ambientStrength = 0.2;
    vec3 ambient = ambientStrength * ambientColor;

    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * diffuseColor;

    float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
    vec3 specular = spec * specularColor;

    vec3 result = (ambient + diffuse + specular);
    fragColorp = vec4(result, 1.0);
}`;

const gouraudVertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
float ambient = 1.1;
float shine = 20.0;
uniform vec3 lightPosition;
uniform vec4 objColor;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
out vec3 color;

void main() {

    mat4 projectionModelView;
    mat4 modelView = uVMatrix*uMMatrix;
	projectionModelView = uPMatrix*uVMatrix*uMMatrix;
    vec3 posInEyeSpace = vec3(modelView*vec4(aPosition,1.0));
    mat4 normalMat = transpose(inverse(modelView));
    vec3 modifiedNormal = vec3(normalMat*vec4(aNormal,1.0));
    vec3 lightVec = vec3(projectionModelView*vec4(lightPosition,1.0));

vec3 R = normalize(-reflect(lightVec,normalize(modifiedNormal)));
vec3 V = normalize(-posInEyeSpace);
float specAng = max(dot(R,V), 0.0);
float specMult = pow(specAng, shine);
color = vec3(dot(R,V)*objColor.xyz) + ambient*vec3(objColor) + specMult*vec3(1.0,1.0,1.0);
gl_Position = projectionModelView*vec4(aPosition,1.0);
gl_PointSize=5.0;

}`;


const gouraudFragShaderCode = `#version 300 es
precision mediump float;
in vec3 color;
out vec4 fragColor;

void main() {
  fragColor = vec4(color,1.0);
}`;

function vertexShaderSetup(vertexShaderCode) {
    shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, vertexShaderCode);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function fragmentShaderSetup(fragShaderCode) {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, fragShaderCode);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function phongVertexShaderSetup(phongVertexShaderCode) {
    const shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, phongVertexShaderCode);
    gl.compileShader(shader);


    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Phong vertex shader compilation failed:", gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

function phongFragmentShaderSetup(phongFragShaderCode) {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, phongFragShaderCode);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function gouraudVertexShaderSetup(gouraudVertexShaderCode) {
    const shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, gouraudVertexShaderCode);
    gl.compileShader(shader);


    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Gouraud vertex shader compilation failed:", gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

function gouraudFragmentShaderSetup(gouraudFragShaderCode) {
    const shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, gouraudFragShaderCode);
    gl.compileShader(shader);


    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Gouraud fragment shader compilation failed:", gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

function initPhongShaders() {
    phongShaderProgram = gl.createProgram();

    var phongVertexShader = phongVertexShaderSetup(phongVertexShaderCode);
    var phongFragmentShader = phongFragmentShaderSetup(phongFragShaderCode);


    gl.attachShader(phongShaderProgram, phongVertexShader);
    gl.attachShader(phongShaderProgram, phongFragmentShader);


    gl.linkProgram(phongShaderProgram);


    if (!gl.getProgramParameter(phongShaderProgram, gl.LINK_STATUS)) {
        console.log(gl.getShaderInfoLog(vertexShader));
        console.log(gl.getShaderInfoLog(phongFragmentShader));
        console.error("Shader program linking failed:", gl.getProgramInfoLog(phongShaderProgram));
        return null;
    }


    gl.useProgram(phongShaderProgram);

    return phongShaderProgram;
}


function initGouraudShaders() {
    gouraudShaderProgram = gl.createProgram();

    var gouraudVertexShader = gouraudVertexShaderSetup(gouraudVertexShaderCode);
    var gouraudFragmentShader = gouraudFragmentShaderSetup(gouraudFragShaderCode);


    gl.attachShader(gouraudShaderProgram, gouraudVertexShader);
    gl.attachShader(gouraudShaderProgram, gouraudFragmentShader);


    gl.linkProgram(gouraudShaderProgram);


    if (!gl.getProgramParameter(gouraudShaderProgram, gl.LINK_STATUS)) {
        console.log(gl.getShaderInfoLog(vertexShader));
        console.log(gl.getShaderInfoLog(phongFragmentShader));
        console.error("Shader program linking failed:", gl.getProgramInfoLog(gouraudShaderProgram));
        return null;
    }


    gl.useProgram(gouraudShaderProgram);

    return gouraudShaderProgram;
}


function initShaders() {
    shaderProgram = gl.createProgram();

    vertexShader = vertexShaderSetup(vertexShaderCode);
    fragmentShader = fragmentShaderSetup(fragShaderCode);
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);

    gl.linkProgram(shaderProgram);
    gl.useProgram(shaderProgram);

    return shaderProgram;
}

function initGL(canvas) {
    try {
        gl = canvas.getContext("webgl2");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {}
    if (!gl) {
        alert("WebGL initialization failed");
    }
}

function degToRad(degrees) {
    return (degrees * Math.PI) / 180;
}

function initSphere(nslices, nstacks, radius) {
    for (var i = 0; i <= nslices; i++) {
        var angle = (i * Math.PI) / nslices;
        var comp1 = Math.sin(angle);
        var comp2 = Math.cos(angle);

        for (var j = 0; j <= nstacks; j++) {
            var phi = (j * 2 * Math.PI) / nstacks;
            var comp3 = Math.sin(phi);
            var comp4 = Math.cos(phi);

            var xcood = comp4 * comp1;
            var ycoord = comp2;
            var zcoord = comp3 * comp1;

            spVerts.push(radius * xcood, radius * ycoord, radius * zcoord);
            spNormals.push(xcood, ycoord, zcoord);
        }
    }


    for (var i = 0; i < nslices; i++) {
        for (var j = 0; j < nstacks; j++) {
            var id1 = i * (nstacks + 1) + j;
            var id2 = id1 + nstacks + 1;

            spIndicies.push(id1, id2, id1 + 1);
            spIndicies.push(id2, id2 + 1, id1 + 1);
        }
    }
}

function initSphereBuffer() {
    var nslices = 30;
    var nstacks = 30;
    var radius = 0.32;

    initSphere(nslices, nstacks, radius);

    spBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spVerts), gl.STATIC_DRAW);
    spBuf.itemSize = 3;
    spBuf.numItems = spVerts.length / 3;

    spIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint32Array(spIndicies),
        gl.STATIC_DRAW
    );
    spIndexBuf.itemsize = 1;
    spIndexBuf.numItems = spIndicies.length;

    spNormalBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spNormals), gl.STATIC_DRAW);
    spNormalBuf.itemSize = 3;
    spNormalBuf.numItems = spNormals.length / 3;
}

function initCubeBuffer() {
    var vertices = [
        // Front face
        -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
        // Back face
        -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
        // Top face
        -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
        // Bottom face
        -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
        // Right face
        0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
        // Left face
        -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5,
    ];
    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    buf.itemSize = 3;
    buf.numItems = vertices.length / 3;

    var indices = [
        0,
        1,
        2,
        0,
        2,
        3, // Front face
        4,
        5,
        6,
        4,
        6,
        7, // Back face
        8,
        9,
        10,
        8,
        10,
        11, // Top face
        12,
        13,
        14,
        12,
        14,
        15, // Bottom face
        16,
        17,
        18,
        16,
        18,
        19, // Right face
        20,
        21,
        22,
        20,
        22,
        23, // Left face
    ];
    indexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(indices),
        gl.STATIC_DRAW
    );
    indexBuf.itemSize = 1;
    indexBuf.numItems = indices.length;
}

function drawCube(color) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(
        aPositionLocation,
        buf.itemSize,
        gl.FLOAT,
        false,
        0,
        0
    );

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);

    gl.useProgram(shaderProgram);
    gl.uniform4fv(uColorLocation, color);
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
    gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
    gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

    gl.drawElements(gl.TRIANGLES, indexBuf.numItems, gl.UNSIGNED_SHORT, 0);
 }

function drawSphere(mMatrix, color) {
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    gl.vertexAttribPointer(aPositionLocation, spBuf.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
    gl.vertexAttribPointer(aNormalLocation, spNormalBuf.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
    gl.useProgram(shaderProgram);
    gl.uniform4fv(uColorLocation, color); 
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
    gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
    gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
    gl.uniform3fv(uLightPositionLocation, lightPosition);
    
    for (var i = 0; i < spIndexBuf.numItems; i += 3) {
        gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_INT, i * 4);
    }
}

function pushMatrix(stack, m) {

    var copy = mat4.create(m);
    stack.push(copy);
}

function popMatrix(stack) {
    if (stack.length > 0) return stack.pop();
    else console.log("stack has no matrix to pop!");
}

function drawPhongSphere(mMatrix, color) {
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    gl.vertexAttribPointer(aPositionLocation, spBuf.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
    gl.vertexAttribPointer(aNormalLocation, spNormalBuf.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);

    gl.useProgram(phongShaderProgram);
    gl.uniform4fv(uColorLocationPhong, color);
    gl.uniformMatrix4fv(uMMatrixLocationPhong, false, mMatrix);
    gl.uniformMatrix4fv(uVMatrixLocationPhong, false, vMatrix);
    gl.uniformMatrix4fv(uPMatrixLocationPhong, false, pMatrix);
   
    gl.uniform3fv(uLightPositionLocationPhong, lightPosition);
    gl.uniform3fv(uAmbientColorLocationPhong, [0.8, 0.2, 0.2]);
    gl.uniform3fv(uDiffuseColorLocationPhong, [1.0, 1.0, 1.0]);
    gl.uniform3fv(uSpecularColorLocationPhong, [1.0, 1.0, 1.0]);
    gl.uniform1f(uShininessLocationPhong, 15);


    for (var i = 0; i < spIndexBuf.numItems; i += 3) {
        gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_INT, i * 4);
    }
}


function drawGouraudSphere(mMatrix, color) {
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    gl.vertexAttribPointer(aPositionLocation, spBuf.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
    gl.vertexAttribPointer(aNormalLocation, spNormalBuf.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);

    gl.useProgram(gouraudShaderProgram);
    gl.uniformMatrix4fv(uMMatrixLocationGouraud, false, mMatrix);
    gl.uniformMatrix4fv(uVMatrixLocationGouraud, false, vMatrix);
    gl.uniformMatrix4fv(uPMatrixLocationGouraud, false, pMatrix);

    gl.uniform4fv(uColorLocationGouraud, color);
    gl.uniform3fv(uLightPositionLocationGouraud, lightPosition);

    for (var i = 0; i < spIndexBuf.numItems; i += 3) {
        gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_INT, i * 4);
    }
}

function updateLightPosition(value) {
    console.log("Light position updated:", value);
    lightPosition = [parseFloat(value), 3.0, 4.0];
    drawScene();
}

function drawScene() {
    gl.enable(gl.SCISSOR_TEST);

    gl.viewport(0, 0, 500, gl.viewportHeight);
    gl.scissor(0, 0, 500, gl.viewportHeight);
    gl.clearColor(0.6, 0.88, 0.92, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.identity(vMatrix);
    vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);


    mat4.identity(pMatrix);
    mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);


    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree1), [1, 0, 0]);


    var color = [0.6, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [0, 0.4, 0.0]);
    drawSphere(mMatrix, color);
    mMatrix = popMatrix(matrixStack);

    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);

    mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree1), [1, 0, 0]);


    mMatrix = mat4.translate(mMatrix, [0, -0.27, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.4, 0.75, 0.5]);

    var Color = [0.1, 0, 0, 1];
    drawCube(Color);
    mMatrix = popMatrix(matrixStack);

//Scene2
    gl.viewport(500, 0, 500, gl.viewportHeight);
    gl.scissor(500, 0, 500, gl.viewportHeight);
    gl.clearColor(0.3, 0.5, 0.5, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


mat4.identity(vMatrix);
vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

mat4.identity(pMatrix);
mat4.perspective(52, 1.0, 0.1, 1000, pMatrix); 

mat4.identity(mMatrix);
mMatrix = mat4.rotate(mMatrix, degToRad(degree2), [0, 1, 0]);
mMatrix = mat4.rotate(mMatrix, degToRad(degree3), [1, 0, 0]);
mMatrix = mat4.rotate(mMatrix, 0.05, [0, 1, 0]); 
mMatrix = mat4.scale(mMatrix, [0.95, 0.95, 0.95]); 

var lightGray = [0.9, 0.9, 0.9]; 

pushMatrix(matrixStack, mMatrix);
mMatrix = mat4.translate(mMatrix, [0.072, -0.3, 0.1]);
mMatrix = mat4.scale(mMatrix, [0.85, 0.85, 0.85]);
drawGouraudSphere(mMatrix, lightGray); 
mMatrix = popMatrix(matrixStack);

pushMatrix(matrixStack, mMatrix);
mMatrix = mat4.translate(mMatrix, [-0.33, -0.05, 0.1]);
mMatrix = mat4.scale(mMatrix, [0.4, 0.4, 0.4]);
mMatrix = mat4.rotate(mMatrix, 0.5, [1, 0, 0]);
mMatrix = mat4.rotate(mMatrix, -0.45, [0, 0, 1]);
mMatrix = mat4.rotate(mMatrix, -0.5, [0, 1, 0]);
var color = [0, 0.52, 0,1]; 
drawCube(color);
mMatrix = popMatrix(matrixStack);

pushMatrix(matrixStack, mMatrix);
mMatrix = mat4.translate(mMatrix, [-0.18, 0.24, 0.25]);
mMatrix = mat4.scale(mMatrix, [0.55, 0.55, 0.55]);
drawGouraudSphere(mMatrix, lightGray); 
mMatrix = popMatrix(matrixStack);

pushMatrix(matrixStack, mMatrix);
mMatrix = mat4.translate(mMatrix, [0.065, 0.41, 0.3]);
mMatrix = mat4.scale(mMatrix, [0.25, 0.25, 0.25]);
mMatrix = mat4.rotate(mMatrix, 0.5, [1, 0, 0]);
mMatrix = mat4.rotate(mMatrix, 0.5, [0, 0, 1]);
mMatrix = mat4.rotate(mMatrix, 0.2, [0, 1, 0]);
color = [0, 0.52, 0,1]; 
drawCube(color);
mMatrix = popMatrix(matrixStack);

var white = [1, 1, 1,1]; 
pushMatrix(matrixStack, mMatrix);
mMatrix = mat4.translate(mMatrix, [-0.02, 0.6, 0.4]);
mMatrix = mat4.scale(mMatrix, [0.35, 0.35, 0.35]);
drawGouraudSphere(mMatrix, white); 
mMatrix = popMatrix(matrixStack);


gl.viewport(1000, 0, 500, gl.viewportHeight);
gl.scissor(1000, 0, 500, gl.viewportHeight);
gl.clearColor(0.5, 0.5, 0.35, 1);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

mat4.identity(vMatrix);
vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

mat4.identity(pMatrix);
mat4.perspective(85, 1.0, 0.1, 1000, pMatrix);

mat4.identity(mMatrix);
pushMatrix(matrixStack, mMatrix);
mMatrix = mat4.rotate(mMatrix, degToRad(degree4), [0, 1, 0]);
mMatrix = mat4.rotate(mMatrix, degToRad(degree5), [1, 0, 0]);
mMatrix = mat4.translate(mMatrix, [0, -1.05, 0.0]);
drawPhongSphere(mMatrix, [0.5, 0, 0, 1]);
mMatrix = popMatrix(matrixStack);
pushMatrix(matrixStack, mMatrix);
mMatrix = mat4.rotate(mMatrix, degToRad(degree4), [0, 1, 0]);
mMatrix = mat4.rotate(mMatrix, degToRad(degree5), [1, 0, 0]);
mMatrix = mat4.translate(mMatrix, [-0.9, -0.35, 0.0]);
drawPhongSphere(mMatrix, [0.5, 0, 0, 1]);
mMatrix = popMatrix(matrixStack);

pushMatrix(matrixStack, mMatrix);
mMatrix = mat4.rotate(mMatrix, degToRad(degree4), [0, 1, 0]);
mMatrix = mat4.rotate(mMatrix, degToRad(degree5), [1, 0, 0]);
mMatrix = mat4.translate(mMatrix, [0.9, -0.35, 0.0]);
drawPhongSphere(mMatrix, [0.5, 0, 0, 1]);
mMatrix = popMatrix(matrixStack);

pushMatrix(matrixStack, mMatrix);
mMatrix = mat4.rotate(mMatrix, degToRad(degree4), [0, 1, 0]);
mMatrix = mat4.rotate(mMatrix, degToRad(degree5), [1, 0, 0]);
mMatrix = mat4.translate(mMatrix, [0, 1.05, 0]);
drawPhongSphere(mMatrix, [0.5, 0, 0, 1]);
mMatrix = popMatrix(matrixStack);

pushMatrix(matrixStack, mMatrix);
mMatrix = mat4.rotate(mMatrix, degToRad(degree4), [0, 1, 0]);
mMatrix = mat4.rotate(mMatrix, degToRad(degree5), [1, 0, 0]);
mMatrix = mat4.translate(mMatrix, [0.9, 0.35, 0.0]);
drawPhongSphere(mMatrix, [0.5, 0, 0, 1]);
mMatrix = popMatrix(matrixStack);

pushMatrix(matrixStack, mMatrix);
mMatrix = mat4.rotate(mMatrix, degToRad(degree4), [0, 1, 0]);
mMatrix = mat4.rotate(mMatrix, degToRad(degree5), [1, 0, 0]);
mMatrix = mat4.translate(mMatrix, [-0.9, 0.35, 0.0]);
drawPhongSphere(mMatrix, [0.5, 0, 0, 1]);
mMatrix = popMatrix(matrixStack);

pushMatrix(matrixStack, mMatrix);
mMatrix = mat4.rotate(mMatrix, degToRad(degree4), [0, 1, 0]);
mMatrix = mat4.rotate(mMatrix, degToRad(degree5), [1, 0, 0]);
mMatrix = mat4.translate(mMatrix, [0, -0.7, 0.0]);
mMatrix = mat4.scale(mMatrix, [2.5, 0.05, 0.5]);
drawCube([0.1, 0.3, 0, 1]);
mMatrix = popMatrix(matrixStack);

pushMatrix(matrixStack, mMatrix);
mMatrix = mat4.rotate(mMatrix, degToRad(degree4), [0, 1, 0]);
mMatrix = mat4.rotate(mMatrix, degToRad(degree5), [1, 0, 0]);
mMatrix = mat4.translate(mMatrix, [0, 0.7, 0.0]);
mMatrix = mat4.scale(mMatrix, [2.5, 0.05, 0.5]);
drawCube([0.1, 0, 0.3, 1]);
mMatrix = popMatrix(matrixStack);

pushMatrix(matrixStack, mMatrix);
mMatrix = mat4.rotate(mMatrix, degToRad(degree4), [0, 1, 0]);
mMatrix = mat4.rotate(mMatrix, degToRad(degree5), [1, 0, 0]);
mMatrix = mat4.translate(mMatrix, [-0.75, 0, 0.0]);
mMatrix = mat4.scale(mMatrix, [1, 0.05, 0.5]);
drawCube([0.1, 0, 0, 1]);
mMatrix = popMatrix(matrixStack);

pushMatrix(matrixStack, mMatrix);
mMatrix = mat4.rotate(mMatrix, degToRad(degree4), [0, 1, 0]);
mMatrix = mat4.rotate(mMatrix, degToRad(degree5), [1, 0, 0]);
mMatrix = mat4.translate(mMatrix, [0.75, 0, 0.0]);
mMatrix = mat4.scale(mMatrix, [1, 0.05, 0.5]);
drawCube([0.1, 0, 0.1, 1]);
mMatrix = popMatrix(matrixStack);
}

function onMouseDown(event) {
    document.addEventListener("mousemove", onMouseMove, false);
    document.addEventListener("mouseup", onMouseUp, false);
    document.addEventListener("mouseout", onMouseOut, false);

    if (
        event.layerX <= 500 &&
        event.layerX >= 0 &&
        event.layerY <= canvas.height &&
        event.layerY >= 0
    ) {
        prevMouseX = event.clientX;
        prevMouseY = canvas.height - event.clientY;
    }
    if (
        event.layerX <= 1000 &&
        event.layerX >= 500 &&
        event.layerY <= canvas.height &&
        event.layerY >= 0
    ) {
        prevMouseX = event.clientX;
        prevMouseY = canvas.height - event.clientY;
    }
    if (
        event.layerX <= 1500 &&
        event.layerX >= 1000 &&
        event.layerY <= canvas.height &&
        event.layerY >= 0
    ) {
        prevMouseX = event.clientX;
        prevMouseY = canvas.height - event.clientY;
    }
}

function onMouseMove(event) {
    if (
        event.layerX <= 500 &&
        event.layerX >= 0 &&
        event.layerY <= canvas.height &&
        event.layerY >= 0
    ) {
        var mouseX = event.clientX;
        var diffX1 = mouseX - prevMouseX;
        prevMouseX = mouseX;
        degree0 = degree0 + diffX1 / 5;

        var mouseY = canvas.height - event.clientY;
        var diffY2 = mouseY - prevMouseY;
        prevMouseY = mouseY;
        degree1 = degree1 - diffY2 / 5;

        drawScene();
    }
    if (
        event.layerX <= 1000 &&
        event.layerX >= 500 &&
        event.layerY <= canvas.height &&
        event.layerY >= 0
    ) {
        var mouseX = event.clientX;
        var diffX1 = mouseX - prevMouseX;
        prevMouseX = mouseX;
        degree2 = degree2 + diffX1 / 5;

        var mouseY = canvas.height - event.clientY;
        var diffY2 = mouseY - prevMouseY;
        prevMouseY = mouseY;
        degree3 = degree3 - diffY2 / 5;

        drawScene();
    }
    if (
        event.layerX <= 1500 &&
        event.layerX >= 1000 &&
        event.layerY <= canvas.height &&
        event.layerY >= 0
    ) {
        var mouseX = event.clientX;
        var diffX1 = mouseX - prevMouseX;
        prevMouseX = mouseX;
        degree4 = degree4 + diffX1 / 5;

        var mouseY = canvas.height - event.clientY;
        var diffY2 = mouseY - prevMouseY;
        prevMouseY = mouseY;
        degree5 = degree5 - diffY2 / 5;

        drawScene();
    }
}

function onMouseUp(event) {
    document.removeEventListener("mousemove", onMouseMove, false);
    document.removeEventListener("mouseup", onMouseUp, false);
    document.removeEventListener("mouseout", onMouseOut, false);
}

function onMouseOut(event) {
    document.removeEventListener("mousemove", onMouseMove, false);
    document.removeEventListener("mouseup", onMouseUp, false);
    document.removeEventListener("mouseout", onMouseOut, false);
}

function webGLStart() {
    canvas = document.getElementById("Assignment_2");
    document.addEventListener("mousedown", onMouseDown, false);
    
      const lightSlider = document.getElementById('light-slider');

      let lightX = parseFloat(lightSlider.value);
      
      lightSlider.addEventListener('input', (event) => {
          lightX = parseFloat(event.target.value);
          lightPosition = [lightX, 3.0, 4.0];
          console.log("lightPosition");
          drawScene();
      });
  
      const cameraSlider = document.getElementById('camera-slider');
  
      let cameraZ = parseFloat(cameraSlider.value);
  
      cameraSlider.addEventListener('input', (event) => {
          cameraZ = parseFloat(event.target.value);
          eyePos = [0.0, 0.0, cameraZ];
  
          drawScene();
      });
  
    
    initGL(canvas);
    shaderProgram = initShaders();
    phongShaderProgram = initPhongShaders();
    gouraudShaderProgram = initGouraudShaders();
     

    aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
    uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");
    uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
    uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
    uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
    uLightPositionLocation = gl.getUniformLocation(shaderProgram, "lightPosition")

    aPositionLocation = gl.getAttribLocation(phongShaderProgram, "aPosition");
    aNormalLocation = gl.getAttribLocation(phongShaderProgram, "aNormal");
    uColorLocationPhong = gl.getUniformLocation(phongShaderProgram, "fragColor");
    uPMatrixLocationPhong = gl.getUniformLocation(phongShaderProgram, "uPMatrix");
    uVMatrixLocationPhong = gl.getUniformLocation(phongShaderProgram, "uVMatrix");
    uMMatrixLocationPhong = gl.getUniformLocation(phongShaderProgram, "uMMatrix");
    uLightPositionLocationPhong = gl.getUniformLocation(phongShaderProgram, "lightPosition");
    uAmbientColorLocationPhong = gl.getUniformLocation(phongShaderProgram, "ambientColor");
    uDiffuseColorLocationPhong = gl.getUniformLocation(phongShaderProgram, "diffuseColor");
    uSpecularColorLocationPhong = gl.getUniformLocation(phongShaderProgram, "specularColor");
    uShininessLocationPhong = gl.getUniformLocation(phongShaderProgram, "shininess");

    aPositionLocation = gl.getAttribLocation(gouraudShaderProgram, "aPosition");
    aNormalLocation = gl.getAttribLocation(gouraudShaderProgram, "aNormal");
    uColorLocationGouraud = gl.getUniformLocation(gouraudShaderProgram, "fragColor");
    uPMatrixLocationGouraud = gl.getUniformLocation(gouraudShaderProgram, "uPMatrix");
    uVMatrixLocationGouraud = gl.getUniformLocation(gouraudShaderProgram, "uVMatrix");
    uMMatrixLocationGouraud = gl.getUniformLocation(gouraudShaderProgram, "uMMatrix");
    uLightPositionLocationGouraud = gl.getUniformLocation(gouraudShaderProgram, "lightPosition");


    gl.enableVertexAttribArray(aPositionLocation);
    gl.enableVertexAttribArray(aNormalLocation);
    gl.enable(gl.DEPTH_TEST);


    initCubeBuffer();
    initSphereBuffer();
    drawScene();
}