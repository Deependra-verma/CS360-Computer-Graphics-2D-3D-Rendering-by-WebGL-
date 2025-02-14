// A simple WebGL program to draw simple 2D shapes.


var gl;
var color;
var matrixStack = [];

// mMatrix is called the model matrix, transforms objects
// from local object space to world space
var mMatrix = mat4.create();
var uMMatrixLocation;

var aPositionLocation;
var uColorLoc;

var animation;

// for back and forth motion of the boat
let translationX = 0.0;
const translationSpeed = 0.0065;
const translationRange = 0.7;
let direction = 1;
let transX=0;
const transXSpeed=0.0065;
const transRange = 0.9;
let dir=1;
// for rotation of the windmill and moon
let rotationAngle = 0.0;
const rotationSpeed = 0.05;
let rtAngle = 0.0;
const rtSpeed = 0.07;

// for drawing the circle
const numSegments = 100; // Number of segments for the circle
const angleIncrement = (Math.PI * 2) / numSegments;

var mode = 's';  // mode for drawing

const vertexShaderCode = `#version 300 es
in vec2 aPosition;
uniform mat4 uMMatrix;

void main() {
    gl_Position = uMMatrix*vec4(aPosition,0.0,1.0);
    gl_PointSize = 5.0;
}`;

const fragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;
uniform vec4 color;

void main() {
    fragColor = color;
}`;

function pushMatrix(stack, m) {
    //necessary because javascript only does shallow push
    var copy = mat4.create(m);
    stack.push(copy);
}

function popMatrix(stack) {
    if (stack.length > 0) return stack.pop();
    else console.log("stack has no matrix to pop!");
}

function degToRad(degrees) {
    return (degrees * Math.PI) / 180;
}

function vertexShaderSetup(vertexShaderCode) {
    shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, vertexShaderCode);
    gl.compileShader(shader);
    // Error check whether the shader is compiled correctly
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
    // Error check whether the shader is compiled correctly
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function initShaders() {
    shaderProgram = gl.createProgram();
    var vertexShader = vertexShaderSetup(vertexShaderCode);
    var fragmentShader = fragmentShaderSetup(fragShaderCode);

    // attach the shaders
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    //link the shader program
    gl.linkProgram(shaderProgram);

    // check for compilation and linking status
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.log(gl.getShaderInfoLog(vertexShader));
        console.log(gl.getShaderInfoLog(fragmentShader));
    }

    //finally use the program.
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

function initSquareBuffer() {
    // buffer for point locations
    const sqVertices = new Float32Array([
        0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
    ]);
    sqVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
    sqVertexPositionBuffer.itemSize = 2;
    sqVertexPositionBuffer.numItems = 4;

    // buffer for point indices
    const sqIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    sqVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
    sqVertexIndexBuffer.itemsize = 1;
    sqVertexIndexBuffer.numItems = 6;
}

function drawSquare(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // buffer for point locations
    gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
    gl.vertexAttribPointer(aPositionLocation, sqVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
    gl.uniform4fv(uColorLoc, color);

    // now draw the square
    // show the solid view
    if (mode === 's') {
        gl.drawElements(gl.TRIANGLES, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }
    // show the wireframe view
    else if (mode === 'w') {
        gl.drawElements(gl.LINE_LOOP, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }
    // show the point view
    else if (mode === 'p') {
        gl.drawElements(gl.POINTS, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }    
}

function initTriangleBuffer() {
    // buffer for point locations
    const triangleVertices = new Float32Array([0.0, 0.5, -0.5, -0.5, 0.5, -0.5]);
    triangleBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
    gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
    triangleBuf.itemSize = 2;
    triangleBuf.numItems = 3;

    // buffer for point indices
    const triangleIndices = new Uint16Array([0, 1, 2]);
    triangleIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleIndices, gl.STATIC_DRAW);
    triangleIndexBuf.itemsize = 1;
    triangleIndexBuf.numItems = 3;
}

function drawTriangle(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // buffer for point locations
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
    gl.vertexAttribPointer(aPositionLocation, triangleBuf.itemSize, gl.FLOAT, false, 0, 0);

    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);
    gl.uniform4fv(uColorLoc, color);

    // now draw the triangle
    if (mode === 's') {
        gl.drawElements(gl.TRIANGLES, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else if (mode === 'w') {
        gl.drawElements(gl.LINE_LOOP, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else if (mode === 'p') {
        gl.drawElements(gl.POINTS, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
}

function initCircleBuffer() {
    // buffer for point locations
    const positions = [0, 0]; // take the center of the circle
    
    for (let i = 0; i < numSegments; i++) {
      const angle = angleIncrement * i;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      positions.push(x, y);
    }

    const circleVertices = new Float32Array(positions);
    circleBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
    gl.bufferData(gl.ARRAY_BUFFER, circleVertices, gl.STATIC_DRAW);
    circleBuf.itemSize = 2;
    circleBuf.numItems = numSegments + 1;

    // Create index buffer
    const indices = [0, 1, numSegments];
    for (let i = 0; i < numSegments; i++) {
      indices.push(0, i, i + 1);
    }

    // buffer for point indices
    const circleIndices = new Uint16Array(indices);
    circleIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, circleIndices, gl.STATIC_DRAW);
    circleIndexBuf.itemsize = 1;
    circleIndexBuf.numItems = indices.length;
}

function drawCircle(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // buffer for point locations
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
    gl.vertexAttribPointer(aPositionLocation, circleBuf.itemSize, gl.FLOAT, false, 0, 0);

    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);
    gl.uniform4fv(uColorLoc, color);

    // now draw the circle
    if (mode === 's') {
        gl.drawElements(gl.TRIANGLES, circleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else if (mode === 'w') {
        gl.drawElements(gl.LINE_LOOP, circleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else if (mode === 'p') {
        gl.drawElements(gl.POINTS, circleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
}

// this function is for creating the rays of the moon
function initRayBuffer() {
    // buffer for point locations
    const positions = [0, 0];
    
    // taking only 8 segments
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2) * i / 8;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      positions.push(x, y);
    }
    const rayVertices = new Float32Array(positions);
    rayBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, rayBuf);
    gl.bufferData(gl.ARRAY_BUFFER, rayVertices, gl.STATIC_DRAW);
    rayBuf.itemSize = 2;
    rayBuf.numItems = 9;

    // Create index buffer
    const indices = [];
    for (let i = 0; i < 8; i++) {
      indices.push(0, i+1);
    }

    // buffer for point indices
    const rayIndices = new Uint16Array(indices);
    rayIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, rayIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, rayIndices, gl.STATIC_DRAW);
    rayIndexBuf.itemsize = 1;
    rayIndexBuf.numItems = indices.length;
}

function drawRays(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // buffer for point locations
    gl.bindBuffer(gl.ARRAY_BUFFER, rayBuf);
    gl.vertexAttribPointer(aPositionLocation, rayBuf.itemSize, gl.FLOAT, false, 0, 0);

    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, rayIndexBuf);
    gl.uniform4fv(uColorLoc, color);

    // now draw the circle
    if (mode === 'p') {
        gl.drawElements(gl.POINTS, rayIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    // the rays are lines even in "solid" view
    else {
        gl.drawElements(gl.LINE_STRIP, rayIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
}

// this function is for creating the blades of the windmill (easier to rotate)
function initFanBladesBuffer() {
    // buffer for point locations
    const positions = [0, 0];
    
    // based on manual calculations
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2) * i / 16;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      positions.push(x, y);
    }
    const bladeVertices = new Float32Array(positions);
    bladeBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bladeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, bladeVertices, gl.STATIC_DRAW);
    bladeBuf.itemSize = 2;
    bladeBuf.numItems = 9;

    // Create index buffer
    const indices = [];
    for (let i = 1; i < 16; i=i+4) {
      indices.push(0, i, i+1);
    }

    // buffer for point indices
    const bladeIndices = new Uint16Array(indices);
    bladeIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bladeIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, bladeIndices, gl.STATIC_DRAW);
    bladeIndexBuf.itemsize = 1;
    bladeIndexBuf.numItems = indices.length;
}

function drawFanBlades(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // buffer for point locations
    gl.bindBuffer(gl.ARRAY_BUFFER, bladeBuf);
    gl.vertexAttribPointer(aPositionLocation, bladeBuf.itemSize, gl.FLOAT, false, 0, 0);

    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bladeIndexBuf);
    gl.uniform4fv(uColorLoc, color);

    // now draw the circle
    if (mode === 's') {
        gl.drawElements(gl.TRIANGLE_FAN, bladeIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else if (mode === 'w') {
        gl.drawElements(gl.LINE_LOOP, bladeIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
    else if (mode === 'p') {
        gl.drawElements(gl.POINTS, bladeIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
}

function drawSky() {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1];  
    // local translation operation for the square
    mMatrix = mat4.translate(mMatrix, [0.0, 0.6, 0]);
    // local scale operation for the square
    mMatrix = mat4.scale(mMatrix, [3.0, 1.2, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}



// The rotation angle is taken as input for animation
function drawMoon(rotationAngle) {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [1.0, 1.0, 1.0, 1];
    // local translation operation for the circle
    mMatrix = mat4.translate(mMatrix, [-0.7, 0.84, 0]);
    // local scale operation for the circle
    mMatrix = mat4.scale(mMatrix, [0.1, 0.1, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    // local translation operation for the circle
    mMatrix = mat4.translate(mMatrix, [-0.7, 0.84, 0]);
    // local scale operation for the circle
    mMatrix = mat4.scale(mMatrix, [0.15, 0.15, 1.0]);
    // rotation of the circle for animation
    mMatrix = mat4.rotate(mMatrix, rotationAngle, [0, 0, 1]);
    drawRays(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawCloud() {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);

    // First cloud part 
    color = [0.5, 0.5, 0.5, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.9, 0.5, 0]);  
    mMatrix = mat4.scale(mMatrix, [0.21, 0.14, .90]);     
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // Second cloud part 
    pushMatrix(matrixStack, mMatrix);
    color = [1.0, 1.0, 1.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.6, 0.5, 0]);  
    mMatrix = mat4.scale(mMatrix, [0.19, 0.099, .60]);    
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);


    // Third cloud part 
    pushMatrix(matrixStack, mMatrix);
    color = [0.7, 0.7, 0.7, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.35, 0.48, 0]);  
    mMatrix = mat4.scale(mMatrix, [0.128, 0.08, 1.0]);    
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawBird(sq_t_x, sq_t_y, sq_s_x, sq_s_y, tr_t_x, tr_t_y, tr_s_x, tr_s_y, angle) {
   
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [sq_t_x, sq_t_y, 0]);
    // local scale operation for the circle
    mMatrix = mat4.scale(mMatrix, [sq_s_x, sq_s_y, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [tr_t_x, tr_t_y, 0]);
    mMatrix = mat4.rotate(mMatrix, angle, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [tr_s_x, tr_s_y, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [2*sq_t_x - tr_t_x, tr_t_y, 0]);
    mMatrix = mat4.rotate(mMatrix, -angle, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [tr_s_x, tr_s_y, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawMountain(t_x1, t_y1, s_x, s_y, t_x2 = 0, t_y2 = 0, single = false) {

    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0.57, 0.36, 0.15, 1.0];
    if (single) color = [0.55, 0.42, 0.16, 1.0];

    mMatrix = mat4.translate(mMatrix, [t_x1, t_y1, 0]);
    mMatrix = mat4.scale(mMatrix, [s_x, s_y, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);


    if (!single) {
        pushMatrix(matrixStack, mMatrix);
        color = [0.55, 0.42, 0.15, 1.0];
        mMatrix = mat4.translate(mMatrix, [t_x2, t_y2, 0]);
        mMatrix = mat4.rotate(mMatrix, 6.5, [0, 0, 1]);
        mMatrix = mat4.scale(mMatrix, [s_x, s_y, 1.0]);
        drawTriangle(color, mMatrix);
        mMatrix = popMatrix(matrixStack);
    }
}

function drawGround() {

    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0.19, 0.81, 0.2, 0.75];
    mMatrix = mat4.translate(mMatrix, [0.0, -0.6, 0]);
    mMatrix = mat4.scale(mMatrix, [3.0, 1.2, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// for drawing lines on the river
function drawLines(move = false, x = 0, y = 0) {
    
    mat4.identity(mMatrix);
    if (move) {
        mMatrix = mat4.translate(mMatrix, [x, y, 0]);
    }
    pushMatrix(matrixStack, mMatrix);
    color = [0.9, 0.9, 0.9, 0.8];
    mMatrix = mat4.translate(mMatrix, [-0.7, -0.19, 0]);
    mMatrix = mat4.rotate(mMatrix, 4.71, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.003, 0.4, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawRiver() {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0.05, 0.369, 0.63, 0.9];
    mMatrix = mat4.translate(mMatrix, [0.0, -0.17, 0]);
    mMatrix = mat4.scale(mMatrix, [3.0, 0.25, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // draw the lines on the river
    drawLines();
    drawLines(true, 0.85, 0.1);
    drawLines(true, 1.5, -0.06);
}

function drawRoad() {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0.34, 0.45, 0.2, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.6, -0.8, 0]);
    mMatrix = mat4.rotate(mMatrix, 7.2, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [1.6, 2, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawTrees(move = false, t_x = 0, t_y= 0, s_x = 0, s_y = 0) {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    if (move) {
        // applying global translation and scaling
        mMatrix = mat4.translate(mMatrix, [t_x, t_y, 0]);
        mMatrix = mat4.scale(mMatrix, [s_x, s_y, 0]);
    }

    pushMatrix(matrixStack, mMatrix);
    color = [0.30, 0.41, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [0.45, 0.45, 0]);
    mMatrix = mat4.scale(mMatrix, [0.35, 0.3, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0.38, 0.51, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [0.45, 0.5, 0]);
    mMatrix = mat4.scale(mMatrix, [0.375, 0.3, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0.45, 0.60, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [0.45, 0.55, 0]);
    mMatrix = mat4.scale(mMatrix, [0.4, 0.3, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // stem of the tree
    pushMatrix(matrixStack, mMatrix);
    color = [0.57, 0.36, 0.15, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.45, 0.14, 0]);
    mMatrix = mat4.scale(mMatrix, [0.04, 0.33, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// translationX is taken as argument for the animation
function drawBoat(translationX) {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);

    // applying global translation
    mMatrix = mat4.translate(mMatrix, [translationX, 0., 0]);

    pushMatrix(matrixStack, mMatrix);
    color = [0.63, 0.83, 0.83, 1];
    mMatrix = mat4.translate(mMatrix, [0, -0.15, 0]);
    mMatrix = mat4.scale(mMatrix, [0.18, 0.06, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.09, -0.15, 0]);
    mMatrix = mat4.rotate(mMatrix, -3.15, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.06, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.09, -0.15, 0]);
    mMatrix = mat4.rotate(mMatrix, -3.15, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.06, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0.5, 0, 0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.01, 0.006, 0]);
    mMatrix = mat4.scale(mMatrix, [0.01, 0.25, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.03, -0.01, 0]);
    mMatrix = mat4.rotate(mMatrix, 5.9, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.005, 0.23, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0.69, 0.56, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [0.115, 0.006, 0]);
    mMatrix = mat4.rotate(mMatrix, 4.72, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

// rotationAngle is taken as input for animation of the blades
function drawFan(rtAngle, move = false, t_x = 0) {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    if (move) {
        mMatrix = mat4.translate(mMatrix, [t_x, 0, 0]);
    }
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.756, -0.26, 0]);
    // local scale operation for the square
    mMatrix = mat4.scale(mMatrix, [0.031, 0.51, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // drawing the fan blades
    pushMatrix(matrixStack, mMatrix);
    color = [0.920, 0.698, 0.337, 1];
    mMatrix = mat4.translate(mMatrix, [0.756, 0.04, 0]);
    mMatrix = mat4.scale(mMatrix, [0.21, 0.28, 1.0]);
    // rotating the fan blades
    mMatrix = mat4.rotate(mMatrix, rtAngle, [0, 0, 1]);
    drawFanBlades(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [0.756, 0.013, 0]);
    mMatrix = mat4.scale(mMatrix, [0.027, 0.027, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawSmallFan(rtAngle, move = false, t_x = 0) {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.14, 0.04, 0.]);
    if (move) {
        mMatrix = mat4.translate(mMatrix, [t_x, 0, 0]);
    }
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.63, -0.2, 0]);
    // local scale operation for the square
    mMatrix = mat4.scale(mMatrix, [0.027, 0.35, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // drawing the fan blades
    pushMatrix(matrixStack, mMatrix);
    color = [0.920, 0.698, 0.136, 1];
    mMatrix = mat4.translate(mMatrix, [0.63, -0.03, 0]);
    mMatrix = mat4.scale(mMatrix, [0.18, 0.2, 1.0]);
    // rotating the fan blades
    mMatrix = mat4.rotate(mMatrix, rtAngle, [0, 0, 1]);
    drawFanBlades(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [0.63, -0.03, 0]);
    mMatrix = mat4.scale(mMatrix, [0.023, 0.023, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}


function drawBush(move=false, t_x=0, t_y=0, s=0) {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    if (move) {
        mMatrix = mat4.translate(mMatrix, [t_x, t_y, 0]);
        mMatrix = mat4.scale(mMatrix, [s, s, 0]);
    }
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0.7, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [-1, -0.55, 0]);
    mMatrix = mat4.scale(mMatrix, [0.075, 0.055, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0.4, 0, 0.9];
    mMatrix = mat4.translate(mMatrix, [-0.72, -0.55, 0]);
    mMatrix = mat4.scale(mMatrix, [0.07, 0.05, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0.51, 0, 0.9]
    mMatrix = mat4.translate(mMatrix, [-0.86, -0.53, 0]);
    mMatrix = mat4.scale(mMatrix, [0.13, 0.09, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawHouse() {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);

    // roof of the house
    pushMatrix(matrixStack, mMatrix);
    color = [0.8, 0.1, 0.2, 1];
    mMatrix = mat4.translate(mMatrix, [-0.76, -0.3, 0]);
    mMatrix = mat4.scale(mMatrix, [0.4, 0.21, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.95, -0.3, 0]);
    mMatrix = mat4.rotate(mMatrix, 6.285, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.25, 0.2, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.55, -0.3, 0]);
    mMatrix = mat4.rotate(mMatrix, 6.285, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.25, 0.2, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // base of the house
    pushMatrix(matrixStack, mMatrix);
    color = [0.63, 0.73, 0.83, 1];
    mMatrix = mat4.translate(mMatrix, [-0.735, -0.525, 0]);
    mMatrix = mat4.scale(mMatrix, [0.5, 0.25, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // windows
    pushMatrix(matrixStack, mMatrix);
    color = [0.75, 0.6, 0.2, 0.9];
    mMatrix = mat4.translate(mMatrix, [-0.9, -0.47, 0]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.08, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.6, -0.47, 0]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.08, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // door of the house
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.75, -0.56, 0]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.18, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawWheel(move = false, t_x = 0) {
    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    if (move) {
        // applying global translation for the other wheel
        mMatrix = mat4.translate(mMatrix, [t_x, 0, 0]);
    }
    pushMatrix(matrixStack, mMatrix);
    color = [0.2, 0.1, 0, 1];
    mMatrix = mat4.translate(mMatrix, [-0.73, -0.87, 0]);
    mMatrix = mat4.scale(mMatrix, [0.04, 0.04, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0.41, 0.41, 0.51, 1];
    mMatrix = mat4.translate(mMatrix, [-0.73, -0.87, 0]);
    mMatrix = mat4.scale(mMatrix, [0.03, 0.03, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawCar() {

    // Car top (rounded blue part)
    pushMatrix(matrixStack, mMatrix);
    color = [0.2, 0.3, 0.7, 1.0]; 
    mMatrix = mat4.translate(mMatrix, [-0.6, -0.72, 0]);  
    mMatrix = mat4.scale(mMatrix, [0.18, 0.1, .90]);       
    drawCircle(color, mMatrix);                          
    mMatrix = popMatrix(matrixStack);

  // Car window (light gray rectangle)
  pushMatrix(matrixStack, mMatrix);
  color = [0.8, 0.8, 0.9, 1.0]; 
  mMatrix = mat4.translate(mMatrix, [-0.6, -0.72, 0]);  
  mMatrix = mat4.scale(mMatrix, [0.2, 0.08, 1.0]);      
  drawSquare(color, mMatrix);
  mMatrix = popMatrix(matrixStack);


    drawWheel();
    drawWheel(true, 0.27);

    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    color = [0.4, 0.5, 1.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.6, -0.8, 0]);
    mMatrix = mat4.scale(mMatrix, [0.39, 0.1, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.405, -0.8, 0]);
    mMatrix = mat4.rotate(mMatrix, 6.285, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.14, 0.1, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.795, -0.8, 0]);
    mMatrix = mat4.rotate(mMatrix, 6.285, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.14, 0.1, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}
function drawStar(center_x, center_y, square_scale, triangle_scale, base_angle, time) {
    let mMatrix = mat4.create();
    // Calculate twinkling effect using time
    let twinkleFactor = Math.abs(Math.sin(time * 2.0)) * 0.2 + 0.8; 
    let color = [twinkleFactor, twinkleFactor, twinkleFactor, 1.0];  

    // Draw the central square
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [center_x, center_y, 0]);
    mMatrix = mat4.scale(mMatrix, [square_scale * twinkleFactor, square_scale * twinkleFactor, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // Draw the top triangle
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [center_x, center_y + square_scale * twinkleFactor, 0]);
    mMatrix = mat4.rotate(mMatrix, base_angle, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [triangle_scale * twinkleFactor, triangle_scale * twinkleFactor, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // Draw the right triangle
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [center_x + square_scale * twinkleFactor, center_y, 0]);
    mMatrix = mat4.rotate(mMatrix, base_angle + Math.PI + Math.PI / 2, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [triangle_scale * twinkleFactor, triangle_scale * twinkleFactor, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // Draw the bottom triangle
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [center_x, center_y - square_scale * twinkleFactor, 0]);
    mMatrix = mat4.rotate(mMatrix, base_angle + Math.PI, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [triangle_scale * twinkleFactor, triangle_scale * twinkleFactor, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // Draw the left triangle
    mat4.identity(mMatrix);
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [center_x - square_scale * twinkleFactor, center_y, 0]);
    mMatrix = mat4.rotate(mMatrix, base_angle + Math.PI + 3 * Math.PI / 2, [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [triangle_scale * twinkleFactor, triangle_scale * twinkleFactor, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

function drawSmallBoat(transX) {
    mat4.identity(mMatrix);

    // Apply global translation, adding a negative z-translation to place it behind the larger boat
    mat4.translate(mMatrix, [transX, 0., -0.1]);

    pushMatrix(matrixStack, mMatrix);
    color = [0.559, 0.563, 0.667, 1];
    mat4.translate(mMatrix, [0, -0.1, 0]); 
    mat4.scale(mMatrix, [0.1, 0.04, 1.0]); 
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mat4.translate(mMatrix, [-0.05, -0.1, 0]);
    mat4.rotate(mMatrix, -3.15, [0, 0, 1]);
    mat4.scale(mMatrix, [0.06, 0.04, 1.0]); 
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    mat4.translate(mMatrix, [0.05, -0.1, 0]);
    mat4.rotate(mMatrix, -3.15, [0, 0, 1]);
    mat4.scale(mMatrix, [0.06, 0.04, 1.0]); 
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1.0];
    mat4.translate(mMatrix, [0.01, -0.006, 0]);
    mat4.scale(mMatrix, [0.007, 0.15, 1.0]); 
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1.0];
    mat4.translate(mMatrix, [-0.02, 0, 0]);
    mat4.rotate(mMatrix, 5.9, [0, 0, 1]);
    mat4.scale(mMatrix, [0.004, 0.17, 1.0]); 
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0.5, 0, 0.5, 1]; 
    mat4.translate(mMatrix, [0.072, 0, 0]); 
    mat4.rotate(mMatrix, 4.72, [0, 0, 1]);
    mat4.scale(mMatrix, [0.12, 0.12, 1.0]); 
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

////////////////////////////////////////////////////////////////////////
function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clearColor(0.95, 0.95, 0.95, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // stop the current loop of animation
    if (animation) {
        window.cancelAnimationFrame(animation);
    }

    function animate() {
        // Update the rotation angle
        rotationAngle += rotationSpeed;
         rtAngle -= rtSpeed;  
        // Update translation based on direction
        transX += transXSpeed * dir;
        translationX += translationSpeed * direction;

        // Reverse direction at translationRange
        if (Math.abs(translationX) > translationRange) {
            direction *= -1;
        }
        if(Math.abs(transX)>transRange){
            dir *= -1;
        }
       
        drawSky();

        // applying animation to the sun
        drawMoon(rotationAngle);

        drawCloud();

       // draw the satrs
       const time = performance.now() / 500; // Time in seconds

       // Draw the stars with twinkle effect
       drawStar(0.34, 0.78, 0.015, 0.031, 0.0, time);
       drawStar(0.55, 0.9, 0.012, 0.04, 0.0, time + 1);
       drawStar(-0.08, 0.65, 0.01, 0.018, 0.0, time + 2);
       drawStar(-0.135, 0.55, 0.005, 0.013, 0.0, time + 3);
       drawStar(-0.21, 0.73, 0.009, 0.018, 0.0, time + 4);
       drawStar(0.89, 0.77, 0.009, 0.009, 0.0, time + 2);
       drawStar(0.29, 0.87, 0.009, 0.009, 0.0, time + 3);
       drawStar(0.55, 0.81, 0.019, 0.049, 0.0, time + 9);
       drawStar(-0.09, 0.82, 0.029, 0.039, 0.0, time + 8);
       drawStar(0.029, 0.087, 0.049, 0.029, 0.0, time + 6);
       drawStar(0.099, 0.057, 0.049, 0.029, 0.0, time + 6);
       drawStar(-.5, 0.77, 0.029, 0.029, 0.0, time + 6);
       drawStar(-0.91, 0.29, 0.019, 0.029, 0.0, time + 6);
       drawStar(-0.89, 0.17, 0.029, 0.029, 0.0, time + 6);
        // draw the 3 mountains
        drawMountain(-0.65, 0.09, 1.32, 0.42, -0.6, 0.095);
        drawMountain(-0.089, 0.09, 1.8, 0.55, -0.035, 0.096);
        drawMountain(0.7, 0.12, 1.0, 0.3, -0.545, -0.005, true);

        drawGround();
        drawRoad();
        drawRiver();

        // draw the trees
        drawTrees(true, 0.35, 0, 0.85, 0.85)
        drawTrees();
        drawTrees(true, -0.2, 0, 0.8, 0.8)

        // applying back and forth motion to the boat
        drawSmallBoat(transX);
        drawBoat(translationX);
        

        // applying rotatory motion to the blades of the windmill
        drawSmallFan(rtAngle);
        drawFan(rtAngle);


        // draw the bushes
        drawBush();
        drawBush(true, 0.52, -0.04, 1.02);
        drawBush(true, 1.48, -0.13, 1.6);
        drawBush(true, 2.15, 0.25, 1.3);

        drawHouse();
        drawCar();

        // Request the next animation frame
        animation = window.requestAnimationFrame(animate);
    }
    animate();
}

// This is the entry point from the html
function webGLStart() {
    var canvas = document.getElementById("scenery");
    initGL(canvas);
    shaderProgram = initShaders();

    //get locations of attributes declared in the vertex shader
    const aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");

    uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");

    //enable the attribute arrays
    gl.enableVertexAttribArray(aPositionLocation);

    uColorLoc = gl.getUniformLocation(shaderProgram, "color");

    initSquareBuffer();
    initTriangleBuffer();
    initCircleBuffer();
    initRayBuffer();
    initFanBladesBuffer();

    drawScene();
}

// this function gets called when the button is pressed.
// it changes the mode of the canvas by to point view ('p'), 
// wireframe view ('w') or solid view ('s')
function changeView(m) {
    mode = m;
    drawScene();
}