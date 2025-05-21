import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import * as Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js"; 
import { createFloralFieldTexture, createStarrySkyTexture } from './procedural-textures.js';

let scene, camera, renderer, controls;
let terrainMesh, moonMesh, directionalLight;

const debugFlag = false; // Set to true to enable scene helpers

const TERRAIN_WIDTH = 1000; 
const TERRAIN_HEIGHT = TERRAIN_WIDTH;
const TERRAIN_SEGMENTS_WIDTH = 100; 
const TERRAIN_SEGMENTS_HEIGHT = TERRAIN_SEGMENTS_WIDTH; 
const HEIGHTMAP_SCALE = 100; 
const SKYDOME_SCALE = 0.5; // Percentage of terrain width

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, TERRAIN_WIDTH * 4); // Adjusted far clipping plane
    camera.position.set(0, TERRAIN_WIDTH * 0.5, TERRAIN_WIDTH * 0.5); // Adjusted camera for new scale

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    createMoon(); // Moon position will be updated within this function based on TERRAIN_WIDTH
    createDirectionalLight(); // Light position will be updated

    // Load Heightmap and Create Terrain
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('textures/heightmap.png', function (heightmapTexture) {
        const floralTexture = createFloralFieldTexture();
        floralTexture.wrapS = THREE.RepeatWrapping;
        floralTexture.wrapT = THREE.RepeatWrapping;
        floralTexture.repeat.set(TERRAIN_WIDTH * 2.5, TERRAIN_WIDTH * 2.5); // e.g., 2500x2500 if TERRAIN_WIDTH is 1000

        createTerrain(heightmapTexture, floralTexture);
        createSkydome(); 
    }, undefined, function (error) {
        console.error('An error occurred while loading the heightmap:', error);
    });

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('keydown', onKeyDown, false); // Added keydown listener for light toggle

    animate();
}

function createTerrain(heightmapTexture, floralTexture) {
    const terrainGeometry = new THREE.PlaneGeometry(
        TERRAIN_WIDTH,
        TERRAIN_HEIGHT,
        TERRAIN_SEGMENTS_WIDTH -1, // segments are n-1 faces
        TERRAIN_SEGMENTS_HEIGHT -1
    );

    // Get heightmap data
    const img = heightmapTexture.image;
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const context = canvas.getContext('2d');
    context.drawImage(img, 0, 0);
    const heightmapData = context.getImageData(0, 0, img.width, img.height).data;

    const vertices = terrainGeometry.attributes.position;
    for (let i = 0, j = 0; i < vertices.count; i++, j += 3) {
        // Map plane vertex (x,y) to heightmap image coordinates (u,v)
        // Plane vertices go from -TERRAIN_WIDTH/2 to +TERRAIN_WIDTH/2, etc.
        const u = (vertices.getX(i) / TERRAIN_WIDTH + 0.5); // Normalize to 0-1
        const v = 1 - (vertices.getY(i) / TERRAIN_HEIGHT + 0.5); // Normalize to 0-1 and flip Y

        if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
            const tx = Math.min(Math.floor(u * img.width), img.width -1) ;
            const ty = Math.min(Math.floor(v * img.height), img.height -1);
            const pixelIndex = (ty * img.width + tx) * 4; // R, G, B, A
            const heightValue = heightmapData[pixelIndex] / 255; // Use Red channel, normalize to 0-1

            vertices.setZ(i, heightValue * HEIGHTMAP_SCALE);
        }
    }
    vertices.needsUpdate = true;
    terrainGeometry.computeVertexNormals(); // Important for lighting

    const terrainMaterial = new THREE.MeshStandardMaterial({
        map: floralTexture,
        side: THREE.DoubleSide, // Render both sides, useful for varied terrain
        displacementMap: heightmapTexture, // Optional: can also use displacement map directly if desired
        displacementScale: HEIGHTMAP_SCALE, // Sync with manual displacement
        roughness: 0.8,
        metalness: 0.2
    });

    terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrainMesh.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
    scene.add(terrainMesh);
    console.log("Terrain created.");
}

function createSkydome() {
    const skydomeRadius = TERRAIN_WIDTH * SKYDOME_SCALE; // Skydome smaller, will clip into terrain edges
    const skydomeGeometry = new THREE.SphereGeometry(skydomeRadius, 60, 40);
    // Invert geometry on the x-axis so that faces point inward
    skydomeGeometry.scale(-1, 1, 1);

    const starrySkyTexture = createStarrySkyTexture();
    starrySkyTexture.minFilter = THREE.NearestFilter; // For sharper stars
    starrySkyTexture.magFilter = THREE.NearestFilter; // For sharper stars
    starrySkyTexture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // Improves texture quality at glancing angles

    const skydomeMaterial = new THREE.MeshBasicMaterial({
        map: starrySkyTexture,
        side: THREE.FrontSide // Render the inside of the sphere
    });

    const skydomeMesh = new THREE.Mesh(skydomeGeometry, skydomeMaterial);
    scene.add(skydomeMesh);

}

function createMoon() {
    const moonRadius = TERRAIN_WIDTH * 0.02; // Moon size relative to terrain
    const moonGeometry = new THREE.SphereGeometry(moonRadius, 32, 32);
    const moonMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffdd,
        emissiveIntensity: 0.8,
        roughness: 0.9,
        metalness: 0.1
    });
    moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    // Position moon on the surface of the skydome sphere
    const currentDirX = 0.2;
    const currentDirY = 0.3;
    const currentDirZ = -0.4;
    const currentDirMagnitude = Math.sqrt(currentDirX*currentDirX + currentDirY*currentDirY + currentDirZ*currentDirZ);

    const scaleToSkydome = SKYDOME_SCALE / currentDirMagnitude;

    moonMesh.position.set(
        TERRAIN_WIDTH * currentDirX * scaleToSkydome,
        TERRAIN_WIDTH * currentDirY * scaleToSkydome,
        TERRAIN_WIDTH * currentDirZ * scaleToSkydome
    );
    scene.add(moonMesh);
    console.log("Moon created and positioned on skydome surface.");
}

function createDirectionalLight() {
    directionalLight = new THREE.DirectionalLight(0xded6fc, 1);

    if (moonMesh) {
        directionalLight.position.copy(moonMesh.position);
    } else {
        // Fallback if moonMesh is not yet created, which should not happen
        directionalLight.position.set(TERRAIN_WIDTH * 0.2, TERRAIN_WIDTH * 0.2, -TERRAIN_WIDTH * 0.2);
        console.warn("Moon mesh not found when setting directional light position. Using default.");
    }
    directionalLight.target.position.set(0, 0, 0);
    scene.add(directionalLight);
    scene.add(directionalLight.target);

    if (debugFlag){
        const lightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
        scene.add(lightHelper);
    }
    console.log("Directional light created.");
}

function onKeyDown(event) {
    if (event.key === 'd' || event.key === 'D') {
        if (directionalLight) {
            directionalLight.visible = !directionalLight.visible;
            console.log(`Directional light toggled: ${directionalLight.visible ? 'ON' : 'OFF'}`);
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Initialize the application
init();
