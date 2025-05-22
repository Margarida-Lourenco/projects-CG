import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import * as Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js"; 
import { createFloralFieldTexture, createStarrySkyTexture } from './procedural-textures.js';

let scene, camera, renderer, controls;
let terrainMesh, moonMesh, directionalLight;
let ufo; // stores the UFO group
const UFO_ROTATION_SPEED = 0.02; // radians per frame
const UFO_MOVEMENT_SPEED = 0.8;  // units per frame (increased for better visibility)
let keyStates = {}; // To store the state of pressed keys

const debugFlag = true; // Set to true to enable scene helpers

const TERRAIN_WIDTH = 3560; 
const TERRAIN_HEIGHT = TERRAIN_WIDTH;
const TERRAIN_SEGMENTS_WIDTH = 500; // Number of segments in the width
const TERRAIN_SEGMENTS_HEIGHT = TERRAIN_SEGMENTS_WIDTH; 
const HEIGHTMAP_SCALE = 100;
const SKYDOME_SCALE = 0.5; // Radius as percentage of terrain width
const HEIGHTMAP_AREA_SELECTION_RATIO = 1; // Value between 0 (exclusive) and 1 (inclusive). 1 = full image, 0.5 = half area.
const UFO_ALTITUDE = 80; // Height of UFO above terrain
// Original heightmap was 17.8km wide, so 0.2 = 3.56km wide
// Original size * Scale / Width = IRL Meters per unit

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
    controls.target.set(0, 100, 0);
    controls.update(); // Required after changing the target

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
    window.addEventListener('keyup', onKeyUp, false); // Added keyup listener for movement

    ufo = createUFO(); // Assign created UFO to global variable
    ufo.position.set(0, UFO_ALTITUDE, 0); // Position UFO above the terrain
    scene.add(ufo);

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

    // Calculate dimensions for selecting the central portion of the image area
    // based on HEIGHTMAP_AREA_SELECTION_RATIO
    if (HEIGHTMAP_AREA_SELECTION_RATIO <= 0 || HEIGHTMAP_AREA_SELECTION_RATIO > 1) {
        console.warn('HEIGHTMAP_AREA_SELECTION_RATIO must be between 0 (exclusive) and 1 (inclusive). Defaulting to 1 (full image).');
        var selectionScaleFactor = 1;
    } else {
        selectionScaleFactor = Math.sqrt(HEIGHTMAP_AREA_SELECTION_RATIO);
    }

    const sWidth = Math.floor(img.width * selectionScaleFactor);
    const sHeight = Math.floor(img.height * selectionScaleFactor);
    const sx = Math.floor((img.width - sWidth) / 2);
    const sy = Math.floor((img.height - sHeight) / 2);

    // Ensure sWidth and sHeight are positive
    if (sWidth <= 0 || sHeight <= 0) {
        console.error("Calculated sWidth or sHeight for getImageData is not positive. Using full image as fallback.");
        // Fallback to using the entire image if calculation is problematic
        const fullImageData = context.getImageData(0, 0, img.width, img.height);
        var heightmapData = fullImageData.data;
        var effectiveWidth = img.width;
        var effectiveHeight = img.height;
    } else {
        const imageData = context.getImageData(sx, sy, sWidth, sHeight);
        heightmapData = imageData.data;
        effectiveWidth = sWidth;
        effectiveHeight = sHeight;
    }

    const vertices = terrainGeometry.attributes.position;
    for (let i = 0, j = 0; i < vertices.count; i++, j += 3) {
        // Map plane vertex (x,y) to heightmap image coordinates (u,v)
        // Plane vertices go from -TERRAIN_WIDTH/2 to +TERRAIN_WIDTH/2, etc.
        const u = (vertices.getX(i) / TERRAIN_WIDTH + 0.5); // Normalize to 0-1
        const v = 1 - (vertices.getY(i) / TERRAIN_HEIGHT + 0.5); // Normalize to 0-1 and flip Y

        if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
            // Map u,v (0-1) to tx,ty coordinates within the *extracted* heightmapData
            const tx = Math.min(Math.floor(u * effectiveWidth), effectiveWidth - 1);
            const ty = Math.min(Math.floor(v * effectiveHeight), effectiveHeight - 1);
            
            // Calculate pixelIndex using effectiveWidth (the width of the data we are sampling from)
            const pixelIndex = (ty * effectiveWidth + tx) * 4; // R, G, B, A
            
            if (pixelIndex >= 0 && pixelIndex < heightmapData.length) {
                const heightValue = heightmapData[pixelIndex] / 255; // Use Red channel, normalize to 0-1
                vertices.setZ(i, heightValue * HEIGHTMAP_SCALE);
            } else {
                vertices.setZ(i, 0); // Default to flat if pixelIndex is out of bounds
            }
        } else {
            vertices.setZ(i, 0); // Default to flat if u,v are out of expected [0,1] range
        }
    }
    vertices.needsUpdate = true;
    terrainGeometry.computeVertexNormals(); // Important for lighting

    const terrainMaterial = new THREE.MeshStandardMaterial({
        map: floralTexture,
        side: THREE.SingleSide, // Render both sides, useful for varied terrain
        displacementMap: heightmapTexture,
        displacementScale: HEIGHTMAP_SCALE, // Sync with manual displacement
        roughness: 0.9,
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
    skydomeGeometry.scale(1, 1, 1);

    const starrySkyTexture = createStarrySkyTexture();

    const skydomeMaterial = new THREE.MeshBasicMaterial({
        map: starrySkyTexture,
        side: THREE.BackSide // Render the inside of the sphere
    });

    const skydomeMesh = new THREE.Mesh(skydomeGeometry, skydomeMaterial);
    scene.add(skydomeMesh);

}

function createMoon() {
    const moonRadius = TERRAIN_WIDTH * 0.025; // Moon size relative to terrain
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
        TERRAIN_WIDTH * currentDirX * scaleToSkydome - moonRadius / 2,
        TERRAIN_WIDTH * currentDirY * scaleToSkydome - moonRadius / 2,
        TERRAIN_WIDTH * currentDirZ * scaleToSkydome + moonRadius,
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

function createUFO() {
    const ufoGroup = new THREE.Group();
    const bodyRadius = 6;
    const cockpitRadius = bodyRadius / 3; 
    const cockpitFlattening = 0.75; 
    const bodyFlattening = 0.25;

    const numLights = 8; // Number of small spheres (lights)
    const lightRadius = bodyRadius * 0.6; // Radius at which lights are placed, slightly inside the body
    const smallSphereRadius = bodyRadius * 0.05; // Size of the small spheres
    const beamRadius = lightRadius * 0.8 - smallSphereRadius; // Radius of the beam cilinder, slightly smaller than the lights

    // Reverted transparency, kept emissive for lightMaterial
    const lightMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff33, emissive: 0x00ff33, emissiveIntensity: 0.8 });
    const ufoCockpitMaterial = new THREE.MeshStandardMaterial(
        { 
            color: 0x00ff33, 
            emissive: 0x00ff33, 
            emissiveIntensity: 0.2,
            metalness: 0.5,
            roughness: 0.1,
        }
    );
    const ufoBodyMaterial = new THREE.MeshStandardMaterial(
        { 
            color: 0x444444, 
            metalness: 0.9,
            roughness: 0.3,
            transparent: debugFlag,
            opacity: debugFlag ? 0.5 : 1, // Set to 0.5 if debugFlag is true
        }
    );

    const ufoCockpitGeometry = new THREE.SphereGeometry(cockpitRadius, 32, 16, 0, Math.PI * 2 , 0, Math.PI / 2);
    const ufoCockpitMesh = new THREE.Mesh(ufoCockpitGeometry, ufoCockpitMaterial);
    ufoCockpitMesh.scale.set(1, cockpitFlattening, 1);
    ufoCockpitMesh.position.y = (bodyRadius * bodyFlattening) * 0.5; // .5 is arbitrary to avoid small gap between cockpit and body

    const ufoBodyGeometry = new THREE.SphereGeometry(bodyRadius, 32, 16);;
    const ufoBodyMesh = new THREE.Mesh(ufoBodyGeometry, ufoBodyMaterial);
    ufoBodyMesh.scale.set(1, bodyFlattening, 1); 

    const beamHeight = bodyRadius * bodyFlattening + smallSphereRadius; // Height of cilinder part of UFO
    const ufoBeamGeometry = new THREE.CylinderGeometry(beamRadius, beamRadius, beamHeight, 32);
    const ufoBeamMesh = new THREE.Mesh(ufoBeamGeometry, ufoBodyMaterial);
    ufoBeamMesh.position.y = - (bodyRadius * bodyFlattening) / 2 - beamHeight / 2 + (bodyRadius * bodyFlattening * 0.5); // Position beam bottom at the body's bottom edge
    
    // TODO: Cap beam at ufo height
    const ufoBeamLight = new THREE.SpotLight(0x00ff33, 5,  -UFO_ALTITUDE, Math.PI / 6, 1, 0.4); // color, intensity, distance, angle, penumbra, decay
    ufoBeamLight.position.set(0, 0, 0); 

    ufoBeamMesh.add(ufoBeamLight); 
    
    if (debugFlag) {
        const beamLightHelper = new THREE.SpotLightHelper(ufoBeamLight);
        ufoBeamMesh.add(beamLightHelper); 
    }

    ufoGroup.add(ufoCockpitMesh, ufoBodyMesh, ufoBeamMesh); 

    for (let i = 0; i < numLights; i++) {
        const angle = (i / numLights) * Math.PI * 2; // Angle staggering for each sphere, not editable
        const lightGeometry = new THREE.SphereGeometry(smallSphereRadius, 8, 8);
        const lightMesh = new THREE.Mesh(lightGeometry, lightMaterial);
        lightMesh.castShadow = false; // Makes it not interfere with point light

        lightMesh.position.x = Math.cos(angle) * lightRadius;
        lightMesh.position.z = Math.sin(angle) * lightRadius;
        lightMesh.position.y = - Math.sqrt(bodyRadius * bodyRadius - lightRadius * lightRadius) * bodyFlattening; //Pin lights to surface of UFO body 

        const pointLight = new THREE.PointLight(0x00ff33, 5, 0, 3); // color, intensity, distance
        lightMesh.add(pointLight);
        pointLight.position.set(0, -smallSphereRadius/2, 0); // Position point light halfway between sphere and body
        if (debugFlag) { 
            const pointLightHelper = new THREE.PointLightHelper(pointLight, smallSphereRadius * 2);
            scene.add(pointLightHelper);
        }
        
        pointLight.position.set(0, -smallSphereRadius * 0.5, 0); 
        ufoGroup.add(lightMesh); // Add the light sphere to the UFO group
    }

    return ufoGroup;

}

function onKeyDown(event) {
    if (event.key === 'd' || event.key === 'D') {
        if (directionalLight) {
            directionalLight.visible = !directionalLight.visible;
            console.log(`Directional light toggled: ${directionalLight.visible ? 'ON' : 'OFF'}`);
        }
    }
    // Store key state for movement
    keyStates[event.key.toLowerCase()] = true;
}

function onKeyUp(event) {
    // Clear key state for movement
    keyStates[event.key.toLowerCase()] = false;
}

function updateUFOMovement() {
    if (!ufo) return;

    // Rotation
    ufo.rotation.y += UFO_ROTATION_SPEED;

    // Horizontal movement
    let moveDirection = new THREE.Vector3();
    if (keyStates['arrowleft']) {
        moveDirection.x -= 1;
    }
    if (keyStates['arrowright']) {
        moveDirection.x += 1;
    }
    if (keyStates['arrowup']) {
        moveDirection.z -= 1;
    }
    if (keyStates['arrowdown']) {
        moveDirection.z += 1;
    }

    if (moveDirection.lengthSq() > 0) { // Check if there is any movement input
        moveDirection.normalize().multiplyScalar(UFO_MOVEMENT_SPEED);
        ufo.position.add(moveDirection);
    }

}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    updateUFOMovement(); // Update UFO movement each frame
    controls.update();
    renderer.render(scene, camera);
}

// Initialize the application
init();
