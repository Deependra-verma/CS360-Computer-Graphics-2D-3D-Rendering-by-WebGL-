// Assignment_5

var gl;
var canvas;

var aPositionLocation;

var aLightLocation;
var aMode;
var aBounce;
var spBuf;

var light = [0.0, 29.0, 3.5];
var bounce = 1;
var mode = 4;

const vertexShaderCode = `#version 300 es
in vec3 aPosition;

void main() {
    // calcuie clip space position
    gl_Position =  vec4(aPosition,1.0);
}`;

const fragShaderCode = `#version 300 es
precision mediump float;

uniform vec3 uLightPosition;
uniform int uMode;
uniform int uBounce;
out vec4 fragColor;

struct Sphere {
    vec3 position;
    float radius;
    vec3 color;
    float shininess;
};

float intersectSphere(vec3 rayOrigin, vec3 rayDirection, Sphere s) {
    vec3 dist = rayOrigin - s.position;
    float A = dot(rayDirection, rayDirection);
    float B = 2.0 * dot(dist, rayDirection);
    float C = dot(dist, dist) - s.radius * s.radius;
    float delta = B * B - 4.0 * A * C;

    if (delta < 0.0) return 0.0;

    float t1 = (-B - sqrt(delta)) / (2.0 * A);
    float t2 = (-B + sqrt(delta)) / (2.0 * A);
    return min(t1, t2);
}

vec3 calculatePhong(vec3 n, vec3 lDir, vec3 vDir, vec3 col, float shine) {
    float ambient = 0.25;
    float specStrength = 1.0;

    vec3 amb = ambient * col;
    float diff = max(dot(n, lDir), 0.0);
    vec3 diffComp = diff * col;

    vec3 reflectDir = reflect(-lDir, n);
    float spec = pow(max(dot(vDir, reflectDir), 0.0), shine);
    vec3 specComp = specStrength * spec * vec3(1.0);

    return amb + diffComp + specComp;
}

bool checkShadow(vec3 pt, vec3 lightDir, Sphere s[7], int idx) {
    for (int i = 0; i < 7; i++) {
        if (i == idx) continue;
        float t = intersectSphere(pt, lightDir, s[i]);
        if (t > 0.0) return true;
    }
    return false;
}

void main() {
    vec2 uv = gl_FragCoord.xy / vec2(600.0, 600.0);
    vec3 camPos = vec3(0.0, 0.0, 1.0);
    vec3 camDir = normalize(vec3(uv * 2.0 - 1.0, -1.0));
    vec3 lightCol = vec3(1.0, 1.0, 1.0);
    float rad = 0.11;
    //Sphere are arranged circularly and the one is kept at the centre of the that centre
    Sphere spheres[7];
    spheres[0] = Sphere(vec3(2.0 * rad, 0.0, 0.5), rad, vec3(0.0, 0.8, 0.0), 32.0);
    spheres[1] = Sphere(vec3(rad, rad * sqrt(3.0), 0.5), rad, vec3(0.7, 0.0, 0.7), 32.0);
    spheres[2] = Sphere(vec3(-rad, rad * sqrt(3.0), 0.5), rad, vec3(0.0, 0.5, 0.8), 32.0);
    spheres[3] = Sphere(vec3(-2.0 * rad, 0.0, 0.5), rad, vec3(0.0, 0.8, 1.0), 32.0);
    spheres[4] = Sphere(vec3(-rad, -rad * sqrt(3.0), 0.5), rad, vec3(0.2, 0.8, 0.6), 32.0);
    spheres[5] = Sphere(vec3(rad, -rad * sqrt(3.0), 0.5), rad, vec3(0.4, 1.0, 0.5), 32.0);
    spheres[6] = Sphere(vec3(0.0, 0.0, 0.301), rad, vec3(0.0, 0.6, 0.2), 32.0);

    vec3 col = vec3(0.0);
    vec3 refColor = vec3(0.0);
    vec3 rDir = camDir;
    vec3 rOrigin = camPos;
    int shadow = 0;

    for (int bounce = 0; bounce <= uBounce; bounce++) {
        float closestDist = 1e6;
        int closestSphere = -1;

        for (int i = 0; i < 7; i++) {
            float t = intersectSphere(rOrigin, rDir, spheres[i]);
            if (t > 0.0 && t < closestDist) {
                closestDist = t;
                closestSphere = i;
            }
        }

        if (closestSphere == -1) break;

        vec3 hitPoint = rOrigin + closestDist * rDir;
        vec3 norm = normalize(hitPoint - spheres[closestSphere].position);
        vec3 lightDir = normalize(uLightPosition - hitPoint);
        vec3 viewDir = normalize(camPos - hitPoint);
        vec3 refDir = reflect(rDir, norm);

        if (uMode == 1 || uMode == 2) {
            if (bounce > 0) break;
        }

        refColor += calculatePhong(norm, lightDir, viewDir, spheres[closestSphere].color, spheres[closestSphere].shininess);

        if (uMode == 2 || uMode == 4) {
            if (checkShadow(hitPoint, lightDir, spheres, closestSphere) && bounce == 0) {
                refColor = vec3(0.05);
                shadow = 1;
            }
        }

        if (uMode == 3 || uMode == 4) {
            rOrigin = hitPoint + 0.001 * norm;
            rDir = refDir;
        }
    }
    fragColor = vec4(refColor, 1.0);
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

function initShaders() {
    shaderProgram = gl.createProgram();
  
    var vertexShader = vertexShaderSetup(vertexShaderCode);
    var fragmentShader = fragmentShaderSetup(fragShaderCode);
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.log(gl.getShaderInfoLog(vertexShader));
        console.log(gl.getShaderInfoLog(fragmentShader));
    }
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

function initQuadBuffer() {
    spBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    var vertices = [
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
         1.0,  1.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

}
 function drawQuad() {
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.uniform3fv(aLightLocation, light);
    gl.uniform1i(aBounce, bounce);
    gl.uniform1i(aMode, mode);
}
function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    color = [1.0, 0.0, 0.0];
    drawQuad(color);  
}

function webGLStart() {
    canvas = document.getElementById("ray-tracer");
    initGL(canvas);
    shaderProgram = initShaders();
    aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    aLightLocation = gl.getUniformLocation(shaderProgram, "uLightPosition");
    aMode = gl.getUniformLocation(shaderProgram, "uMode");
    aBounce = gl.getUniformLocation(shaderProgram, "uBounce");

    gl.enableVertexAttribArray(aPositionLocation);

    initQuadBuffer();
    drawScene();
    drawScene();
}

function showPhong(){
    mode = 1;
    drawScene();
    drawScene();
}
  
function showPhongShadow(){
    mode = 2;
    drawScene();
    drawScene();
}
  
function showPhongReflection() {
    mode = 3;
    drawScene();
    drawScene();
}
  
function showPhongShadowReflection() {
    mode = 4;
    drawScene();
    drawScene();
}
  
function moveLight(value) {
    console.log("here");
    document.getElementById('light-loc').innerHTML = value;
    light[0] = value;
    drawScene();
    drawScene();
}
  
function changeBounceLimit(value) {
    document.getElementById('bounce-limit').innerHTML = value;
    bounce = value;
    console.log({bounce});
    drawScene();
    drawScene();
}