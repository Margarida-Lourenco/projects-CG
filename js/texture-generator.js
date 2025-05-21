import * as THREE from 'three';
import { createFloralFieldTexture, createStarrySkyTexture } from 'js/procedural-textures.js';

let scene, camera, renderer;
let textureCanvas, textureContext;
let planeMesh, planeMaterial;

const TEXTURE_WIDTH = 512;
const TEXTURE_HEIGHT = 512;

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x808080); // Neutral background for the app itself

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 1; // Position the camera to see a 1x1 plane

    // Renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Texture Canvas (offscreen) for drawing 2D textures
    textureCanvas = document.createElement('canvas');
    textureCanvas.width = TEXTURE_WIDTH;
    textureCanvas.height = TEXTURE_HEIGHT;
    textureContext = textureCanvas.getContext('2d');

    // Plane to display the generated texture
    const planeGeometry = new THREE.PlaneGeometry(1, 1); // Display as a 1x1 square
    // Create a texture from the canvas
    // const canvasTexture = new THREE.CanvasTexture(textureCanvas); // Removed: We'll use imported functions
    planeMaterial = new THREE.MeshBasicMaterial(); // Initialize without map initially
    planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
    scene.add(planeMesh);

    // Generate the initial texture (e.g., floral field)
    // generateFloralFieldTexture(); // Old direct call
    displayFloralFieldTexture(); // New call

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('keydown', onKeyDown, false);

    animate();
}

function displayFloralFieldTexture() {
    console.log("Displaying Floral Field Texture (Key '1')");
    const floralTexture = createFloralFieldTexture();
    planeMaterial.map = floralTexture;
    planeMaterial.map.needsUpdate = true;
}

function displayStarrySkyTexture() {
    console.log("Displaying Starry Sky Texture (Key '2')");
    const starryTexture = createStarrySkyTexture();
    planeMaterial.map = starryTexture;
    planeMaterial.map.needsUpdate = true;
}

function onKeyDown(event) {
    switch (event.key) {
        case '1':
            // generateFloralFieldTexture(); // Old call
            displayFloralFieldTexture();
            break;
        case '2':
            // generateStarrySkyTexture(); // Old call
            displayStarrySkyTexture();
            break;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Initialize the application
init();
