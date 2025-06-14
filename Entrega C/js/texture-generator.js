import * as THREE from 'three';
import { createFloralFieldTexture, createStarrySkyTexture, createCheeseTexture } from './procedural-textures.js';

let scene, camera, renderer;
let textureCanvas;
let planeMesh, planeMaterial;

const TEXTURE_WIDTH = 512;
const TEXTURE_HEIGHT = 512;
let cheese_easter_egg_counter = 0; // Counter for cheese texture easter egg

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
    console.log("Generating and displaying Floral Field Texture (Key '1')");
    const floralTexture = createFloralFieldTexture(512, 512);
    planeMaterial.map = floralTexture;
    planeMaterial.map.needsUpdate = true;
}

function displayStarrySkyTexture() {
    console.log("Generating and displaying Starry Sky Texture (Key '2')");
    const starryTexture = createStarrySkyTexture(TEXTURE_WIDTH*8, TEXTURE_HEIGHT*8, 1600);
    planeMaterial.map = starryTexture;
    planeMaterial.map.needsUpdate = true;
}

function displayCheeseTexture() {
    console.log("Generating and displaying Cheese Texture (Key 'c')");
    const cheeseTexture = createCheeseTexture(TEXTURE_WIDTH, TEXTURE_HEIGHT);
    planeMaterial.map = cheeseTexture;
    planeMaterial.map.needsUpdate = true;
}


function onKeyDown(event) {
    switch (event.key) {
        case '1':
            displayFloralFieldTexture();
            break;
        case '2':
            displayStarrySkyTexture();
            break;
        case 'c':

            if (cheese_easter_egg_counter >= 20) {
                displayCheeseTexture();
            }
            else {
                cheese_easter_egg_counter++;
            }
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
