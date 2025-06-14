import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { createFloralFieldTexture, createStarrySkyTexture, createCheeseTexture } from './procedural-textures.js';

let scene, camera, renderer, controls;
let terrainMesh, moonMesh, directionalLight, houseMesh, skydomeMesh; // Store reference to skydome
let corkTreeMeshes = []; // Store references to cork tree groups
let ufo, ufoGroup;
let ufoBeamMesh, ufoLights = []; // Store references to UFO lights
let fixedCamera, orbitalCamera, vrCamera; // Cameras for different views
let cameras = []; // Array to hold all cameras for updates
let keyStates = {}; // To store the state of pressed keys
let userRig;

const debugFlag = false; // Set to true to enable scene helpers

// OPTIONALS
let isCheese = false // Is the moon made of cheese?
let cheese_easter_egg_counter = isCheese ? 20 : 0; // Counter for cheese easter egg
const AMBIENT_LIGHT_INTENSITY = 0; // Ambient light intensity, 0-1D - if 0, no ambient light will be added

// Terrain settings
const TERRAIN_WIDTH = 3560;
const TERRAIN_HEIGHT = TERRAIN_WIDTH;
const TERRAIN_SEGMENTS_WIDTH = 200; // Number of segments in the width
const TERRAIN_SEGMENTS_HEIGHT = TERRAIN_SEGMENTS_WIDTH;
const TEXTURE_WORLD_SIZE = 100; // Size of one texture tile in world units (both width and height)

const HEIGHTMAP_SCALE = 600; // Factor for displacement, affects terrain height
const HEIGHTMAP_AREA_SELECTION_RATIO = 0.6; // Value between 0 (exclusive) and 1 (inclusive). 1 = full image, 0.5 = half area.
// Original heightmap was 17.8km wide, so 0.2 = 3.56km wide
// Original size * Scale / Width = IRL Meters per unit

// Texture pixel dimensions - you can change these arbitrarily without affecting world size
const TERRAIN_TEXTURE_WIDTH = 1024; // Size of the floral field texture in pixels
const TERRAIN_TEXTURE_HEIGHT = TERRAIN_TEXTURE_WIDTH; // Size of the floral field texture in pixels
const NUM_FLOWERS = 300; // Number of flowers in the floral field texture
const FLOWER_SIZE = 1; // Minimum flower size in pixels
const FLOWER_VARIATION = 2; // Variation in flower size in pixels

// House settings
const HOUSE_POSITION = new THREE.Vector3(200, 40, -500); 
const NUM_TREES = 50; // Number of cork trees to place in the scene
const CORK_TREE_HEIGHT = 70; // Height of the cork tree in world units

// Moon settings
const MOON_SCALE = 0.025; // Radius as percentage of terrain width
const SKYDOME_SCALE = 0.5; // Radius as percentage of terrain width
const MOON_ALTITUDE = 1 * Math.PI / 6; // Angle of moon above terrain relative to XZ plane
const MOON_ANGLE = 2 * Math.PI / 3; // Angle of moon in radians relative to x axis
const MOONLIGHT_INTENSITY = 0.7; // Intensity of the moonlight 0-1, if 0, no moonlight will be added

// Skydome settings
const NUM_STARS = 2000; // Number of stars in the starry sky texture
const STAR_SIZE = 0.1; // Minimum star size
const STAR_VARIATION = 0.2; // Variation in star size
const TWILIGHT_OVERLAP = 1; // How much the twilight gradient overlaps with stars (0-1) * 30%
const SKY_TEXTURE_WIDTH = 4096 * 2; // Width of the starry sky texture
const SKY_TEXTURE_HEIGHT = SKY_TEXTURE_WIDTH / 2; // Mapping is 2:1
// Smaller height avoids stretching at equator but more distortion at poles

// UFO settings
const UFO_ALTITUDE = 300; // Height of UFO above terrain
const UFO_ROTATION_SPEED = 0.01; // radians per frame
const UFO_MOVEMENT_SPEED = 0.8;  // units per frame (increased for better visibility)
const NUM_LIGHTS = 8; // Number of lights on the UFO

// VR and Camera setttings
const EYE_HEIGHT = 17; // Height of the user's eyes in world units, for VR camera positioning

const MATERIALS = {
    moon:    { lambert: null, phong: null, toon: null, basic: null },
    floral:  { lambert: null, phong: null, toon: null, basic: null },
    skydome: { lambert: null, phong: null, toon: null, basic: null },
    terrain: { lambert: null, phong: null, toon: null, basic: null },

    corkTree: {
        top:    { lambert: null, phong: null, toon: null, basic: null },
        trunk:  { lambert: null, phong: null, toon: null, basic: null },
        branch: { lambert: null, phong: null, toon: null, basic: null }
    },

    ufo: {
        body:    { lambert: null, phong: null, toon: null, basic: null },
        cockpit: { lambert: null, phong: null, toon: null, basic: null },
        beam:    { lambert: null, phong: null, toon: null, basic: null },
        lights:  { lambert: null, phong: null, toon: null, basic: null }
    },
    house: {
        white:  { lambert: null, phong: null, toon: null, basic: null },
        blue:   { lambert: null, phong: null, toon: null, basic: null },
        orange: { lambert: null, phong: null, toon: null, basic: null },
    },

    cheese: { lambert: null, phong: null, toon: null, basic: null }
};

let currentShading = 'lambert'; // 'lambert', 'phong', 'toon'
let lightingEnabled = true;
let lookingAt = new THREE.Vector3(); // Position of the object currently being looked at

function createAllMaterials() {
    // Terrain
    const floralTexture = createFloralFieldTexture(TERRAIN_TEXTURE_WIDTH, TERRAIN_TEXTURE_HEIGHT, NUM_FLOWERS, FLOWER_SIZE, FLOWER_VARIATION);
    floralTexture.wrapS = THREE.RepeatWrapping;
    floralTexture.wrapT = THREE.RepeatWrapping;
    floralTexture.repeat.set(TERRAIN_WIDTH / TEXTURE_WORLD_SIZE, TERRAIN_HEIGHT / TEXTURE_WORLD_SIZE);
    MATERIALS.terrain.lambert = new THREE.MeshLambertMaterial({ map: floralTexture, color: 0xffffff, side: THREE.FrontSide });
    MATERIALS.terrain.phong = new THREE.MeshPhongMaterial({ map: floralTexture, color: 0xffffff, side: THREE.FrontSide, shininess: 30 });
    MATERIALS.terrain.toon = new THREE.MeshToonMaterial({ map: floralTexture, color: 0xffffff, side: THREE.FrontSide });
    MATERIALS.terrain.basic = new THREE.MeshBasicMaterial({ map: floralTexture, color: 0xffffff, side: THREE.FrontSide });

    // Skydome
    const starrySkyTexture = createStarrySkyTexture(SKY_TEXTURE_WIDTH, SKY_TEXTURE_HEIGHT, NUM_STARS, STAR_SIZE, STAR_VARIATION, TWILIGHT_OVERLAP);
    MATERIALS.skydome.lambert = new THREE.MeshBasicMaterial({ map: starrySkyTexture, color: 0xffffff, side: THREE.BackSide });
    MATERIALS.skydome.phong = new THREE.MeshBasicMaterial({ map: starrySkyTexture, color: 0xffffff, side: THREE.BackSide });
    MATERIALS.skydome.toon = new THREE.MeshBasicMaterial({ map: starrySkyTexture, color: 0xffffff, side: THREE.BackSide });
    MATERIALS.skydome.basic = new THREE.MeshBasicMaterial({ map: starrySkyTexture, color: 0xffffff, side: THREE.BackSide });

    // Moon
    MATERIALS.moon.lambert = new THREE.MeshLambertMaterial({ color: 0xffffaa, emissive: 0xffffaa, emissiveIntensity: 1 });
    MATERIALS.moon.phong = new THREE.MeshPhongMaterial({ color: 0xffffaa, emissive: 0xffffaa, emissiveIntensity: 0.8, shininess: 30 });
    MATERIALS.moon.toon = new THREE.MeshToonMaterial({ color: 0xffffaa, emissive: 0xffffaa, emissiveIntensity: 0.8 });
    MATERIALS.moon.basic = new THREE.MeshBasicMaterial({ color: 0xfffff0 });

    // Cheese moon
    const cheeseTexture = createCheeseTexture(2048, 1024, 15, 10, 20); // texture is also used for emissive map as a hack
    MATERIALS.cheese.lambert = new THREE.MeshLambertMaterial({ map: cheeseTexture, emissiveMap: cheeseTexture, emissive: 0xffffff, emissiveIntensity: 0.8 });
    MATERIALS.cheese.phong = new THREE.MeshPhongMaterial({ map: cheeseTexture, emissiveMap: cheeseTexture, emissive: 0xffffff, emissiveIntensity: 0.8, shininess: 30 });
    MATERIALS.cheese.toon = new THREE.MeshToonMaterial({ map: cheeseTexture, emissiveMap: cheeseTexture, emissive: 0xffffff, emissiveIntensity: 0.8 });
    MATERIALS.cheese.basic = new THREE.MeshBasicMaterial({ map: cheeseTexture });
    // If cheese moon is enabled, replace the default moon material

    // Cork Tree (stem/branch: brown, top: green)
    MATERIALS.corkTree.top.lambert = new THREE.MeshLambertMaterial({ color: 0x2e6b1f }); // dark green
    MATERIALS.corkTree.top.phong = new THREE.MeshPhongMaterial({ color: 0x2e6b1f, shininess: 80 });
    MATERIALS.corkTree.top.toon = new THREE.MeshToonMaterial({ color: 0x2e6b1f });
    MATERIALS.corkTree.top.basic = new THREE.MeshBasicMaterial({ color: 0x2e6b1f });

    MATERIALS.corkTree.trunk.lambert = new THREE.MeshLambertMaterial({ color: 0xc2611c });
    MATERIALS.corkTree.trunk.phong = new THREE.MeshPhongMaterial({ color: 0xc2611c, shininess: 10 });
    MATERIALS.corkTree.trunk.toon = new THREE.MeshToonMaterial({ color: 0xc2611c });
    MATERIALS.corkTree.trunk.basic = new THREE.MeshBasicMaterial({ color: 0xc2611c });

    MATERIALS.corkTree.branch.lambert = new THREE.MeshLambertMaterial({ color: 0x562c0f });
    MATERIALS.corkTree.branch.phong = new THREE.MeshPhongMaterial({ color: 0x562c0f, shininess: 10 });
    MATERIALS.corkTree.branch.toon = new THREE.MeshToonMaterial({ color: 0x562c0f });
    MATERIALS.corkTree.branch.basic = new THREE.MeshBasicMaterial({ color: 0x562c0f });

    // UFO body
    MATERIALS.ufo.body.lambert = new THREE.MeshLambertMaterial({ color: 0x444444 });
    MATERIALS.ufo.body.phong = new THREE.MeshPhongMaterial({ color: 0x444444, shininess: 100 });
    MATERIALS.ufo.body.toon = new THREE.MeshToonMaterial({ color: 0x444444 });
    MATERIALS.ufo.body.basic = new THREE.MeshBasicMaterial({ color: 0x444444 });
    // UFO cockpit
    MATERIALS.ufo.cockpit.lambert = new THREE.MeshLambertMaterial({ color: 0x00ff33 });
    MATERIALS.ufo.cockpit.phong = new THREE.MeshPhongMaterial({ color: 0x00ff33, shininess: 100 });
    MATERIALS.ufo.cockpit.toon = new THREE.MeshToonMaterial({ color: 0x00ff33 });
    MATERIALS.ufo.cockpit.basic = new THREE.MeshBasicMaterial({ color: 0x00ff33 });
    // UFO beam
    MATERIALS.ufo.beam.lambert = new THREE.MeshLambertMaterial({ color: 0x444444 });
    MATERIALS.ufo.beam.phong = new THREE.MeshPhongMaterial({ color: 0x444444, shininess: 100 });
    MATERIALS.ufo.beam.toon = new THREE.MeshToonMaterial({ color: 0x444444 });
    MATERIALS.ufo.beam.basic = new THREE.MeshBasicMaterial({ color: 0x444444 });
    // UFO lights
    MATERIALS.ufo.lights.lambert = new THREE.MeshLambertMaterial({ color: 0x00ff33, emissive: 0x00ff33, emissiveIntensity: 0.8 });
    MATERIALS.ufo.lights.phong = new THREE.MeshPhongMaterial({ color: 0x00ff33, emissive: 0x00ff33, shininess: 100 });
    MATERIALS.ufo.lights.toon = new THREE.MeshToonMaterial({ color: 0x00ff33 });
    MATERIALS.ufo.lights.basic = new THREE.MeshBasicMaterial({ color: 0x00ff33 });

    // House (white walls, blue trim, orange roof)
    MATERIALS.house.white.lambert = new THREE.MeshLambertMaterial({ color: 0xffffff });
    MATERIALS.house.white.phong = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 30 });
    MATERIALS.house.white.toon = new THREE.MeshToonMaterial({ color: 0xffffff });
    MATERIALS.house.white.basic = new THREE.MeshBasicMaterial({ color: 0xffffff });
    MATERIALS.house.blue.lambert = new THREE.MeshLambertMaterial({ color: 0x005bbb });
    MATERIALS.house.blue.phong = new THREE.MeshPhongMaterial({ color: 0x005bbb, shininess: 30 });
    MATERIALS.house.blue.toon = new THREE.MeshToonMaterial({ color: 0x005bbb });
    MATERIALS.house.blue.basic = new THREE.MeshBasicMaterial({ color: 0x005bbb });
    MATERIALS.house.orange.lambert = new THREE.MeshLambertMaterial({ color: 0xffa500 });
    MATERIALS.house.orange.phong = new THREE.MeshPhongMaterial({ color: 0xffa500, shininess: 30 });
    MATERIALS.house.orange.toon = new THREE.MeshToonMaterial({ color: 0xffa500 });
    MATERIALS.house.orange.basic = new THREE.MeshBasicMaterial({ color: 0xffa500 });
}

// depends on the heightmap to be loaded first
function createCameras() {
    fixedCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, TERRAIN_WIDTH * 4);
    fixedCamera.position.set(HOUSE_POSITION.x + 100, HOUSE_POSITION.y + 80, HOUSE_POSITION.z - 400);
    fixedCamera.lookAt(HOUSE_POSITION.x, HOUSE_POSITION.y + UFO_ALTITUDE / 3, HOUSE_POSITION.z);

    if (debugFlag) {
        orbitalCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, TERRAIN_WIDTH * 4);
        orbitalCamera.position.set(0, TERRAIN_WIDTH * 0.5, TERRAIN_WIDTH * 0.5); // Adjusted camera for new scale
        controls = new OrbitControls(orbitalCamera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 100, 0);
        controls.update(); // Required after changing the target
    }

    vrCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, TERRAIN_WIDTH * 4);
    vrCamera.position.set(0, 0, 0);
    // User rig for VR: move to fixedCamera's world position and orientation
    userRig = new THREE.Group();
    userRig.add(vrCamera);
    scene.add(userRig);

    userRig.position.set(fixedCamera.position.x - 50, EYE_HEIGHT + getTerrainHeight(fixedCamera.position.x - 100, fixedCamera.position.z + 50) + 2, fixedCamera.position.z + 50); // Set user rig position to camera position
    userRig.quaternion.copy(fixedCamera.quaternion);
    userRig.updateMatrixWorld(true);

    // Debug: log rig and camera positions
    if (debugFlag) {
        const vrCameraHelper = new THREE.CameraHelper(vrCamera);
        scene.add(vrCameraHelper);

        console.log("VR Camera position: ", userRig.position);
        console.log("VR Camera quaternion: ", userRig.quaternion);
        const helper = new THREE.Mesh(new THREE.BoxGeometry(5, EYE_HEIGHT, 5),
            new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
        )
        helper.position.set(0, - EYE_HEIGHT / 2, 0);
        userRig.add(
            new THREE.AxesHelper(20),
            helper
        ); // Make user rig visible in the scene
    }

    // ***OPTIONAL*** ambient light
    if (AMBIENT_LIGHT_INTENSITY > 0) {
        const ambientLight = new THREE.AmbientLight(0xffffff, AMBIENT_LIGHT_INTENSITY);
        scene.add(ambientLight);
    }

    cameras = [fixedCamera, orbitalCamera, vrCamera]; // Add cameras to the global array
    scene.add(userRig);
}

async function loadTextureAsync(url) {
    return new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(url, resolve, undefined, reject);
    });
}

async function init() {
    createAllMaterials();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    if (debugFlag) {
        const axesHelper = new THREE.AxesHelper(1000);
        scene.add(axesHelper);
        const gridHelper = new THREE.GridHelper(TERRAIN_WIDTH, TERRAIN_WIDTH / TEXTURE_WORLD_SIZE);
        scene.add(gridHelper);
        axesHelper.position.set(0, 0, 0);
        gridHelper.position.set(0, 0, 0);
    }

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.xr.enabled = true;
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // Listen for VR session start/end to switch cameras
    renderer.xr.addEventListener('sessionstart', function () {
        camera = vrCamera;
    });
    renderer.xr.addEventListener('sessionend', function () {
        camera = fixedCamera; // or orbitalCamera, as desired
    });

    // Await heightmap loading
    let heightmapTexture;
    try {
        heightmapTexture = await loadTextureAsync('textures/heightmap.png');
    } catch (error) {
        console.error('An error occurred while loading the heightmap:', error);
        return;
    }
    const floralTexture = createFloralFieldTexture(TERRAIN_TEXTURE_WIDTH, TERRAIN_TEXTURE_HEIGHT, NUM_FLOWERS, FLOWER_SIZE, FLOWER_VARIATION);
    floralTexture.wrapS = THREE.RepeatWrapping;
    floralTexture.wrapT = THREE.RepeatWrapping;
    floralTexture.repeat.set(TERRAIN_WIDTH / TEXTURE_WORLD_SIZE, TERRAIN_HEIGHT / TEXTURE_WORLD_SIZE);
    terrainMesh = createTerrain(heightmapTexture);
    createSkydome();
    placeCorkTrees();
    createCameras();
    camera = debugFlag ? orbitalCamera : fixedCamera; // Default camera for non-VR mode
    createMoon();
    createDirectionalLight();
    window.addEventListener("resize", onResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    renderer.setAnimationLoop(function () {
        animate();
    });
    ufo = createUFO();
    ufo.position.set(HOUSE_POSITION.x, UFO_ALTITUDE, HOUSE_POSITION.z - 40);
    houseMesh = createAlentejoHouse();
    scene.add(houseMesh);
    scene.add(ufo);
    applyShadingToScene();
}

function createTerrain(heightmapTexture) {
    const terrainGeometry = new THREE.PlaneGeometry(
        TERRAIN_WIDTH,
        TERRAIN_HEIGHT,
        TERRAIN_SEGMENTS_WIDTH - 1,
        TERRAIN_SEGMENTS_HEIGHT - 1
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

    // Manually displace vertices based on heightmap data, for shading
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
                vertices.setZ(i, heightValue * HEIGHTMAP_SCALE - (HEIGHTMAP_SCALE / 16)); // Scale and center height
            } else {
                vertices.setZ(i, 0); // Default to flat if pixelIndex is out of bounds
            }
        } else {
            vertices.setZ(i, 0); // Default to flat if u,v are out of expected [0,1] range
        }
    }
    vertices.needsUpdate = true;
    terrainGeometry.computeVertexNormals(); // Important for lighting

    let mesh = new THREE.Mesh(terrainGeometry, MATERIALS.terrain[currentShading]);
    mesh.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
    scene.add(mesh);

    return mesh;
}

function createSkydome() {
    const skydomeRadius = TERRAIN_WIDTH * SKYDOME_SCALE;
    const skydomeGeometry = new THREE.SphereGeometry(skydomeRadius, 60, 40);
    skydomeGeometry.scale(1, 1, 1);
    skydomeMesh = new THREE.Mesh(skydomeGeometry, MATERIALS.skydome[currentShading]);
    scene.add(skydomeMesh);

}

function createMoon() {
    const moonRadius = TERRAIN_WIDTH * MOON_SCALE; // Moon size relative to terrain
    const moonGeometry = new THREE.SphereGeometry(moonRadius, 64, 32); // Higher segments for better texture mapping
    moonMesh = new THREE.Mesh(moonGeometry, MATERIALS.moon[currentShading]);
    // Position moon on the surface of the skydome sphere
    // Spherical coordinates: X = cos(altitude) * cos(angle), Y = sin(altitude), Z = cos(altitude) * sin(angle)
    const currentDirX = Math.cos(MOON_ALTITUDE) * Math.cos(MOON_ANGLE);
    const currentDirY = Math.sin(MOON_ALTITUDE);
    const currentDirZ = Math.cos(MOON_ALTITUDE) * Math.sin(MOON_ANGLE);
    const currentDirMagnitude = Math.sqrt(currentDirX * currentDirX + currentDirY * currentDirY + currentDirZ * currentDirZ);

    if (debugFlag) console.log("Current direction vector: ", currentDirX, currentDirY, currentDirZ);

    const scaleToSkydome = SKYDOME_SCALE / currentDirMagnitude;

    moonMesh.position.set(
        // Distance from center of skydome minus or plus moon radius to avoid clipping, with edge case for k Pi / 2 anles
        TERRAIN_WIDTH * currentDirX * scaleToSkydome - (currentDirX * moonRadius),
        TERRAIN_WIDTH * currentDirY * scaleToSkydome - (currentDirY * moonRadius),  //Y always > 0 hopefully :P
        TERRAIN_WIDTH * currentDirZ * scaleToSkydome - (currentDirZ * moonRadius),
    );

    // Rotate the moon so its local X axis points toward the world origin (0,0,0)
    moonMesh.rotation.set(
        0, // Rotate around X axis to match altitude
        Math.PI - MOON_ANGLE, // Rotate around Y axis to match angle
        -MOON_ALTITUDE  // No rotation around Z axis
    );

    if (debugFlag) {
        const moonHelper = new THREE.AxesHelper(moonRadius * 2, 0xff0000, 0x00ff00, 0x0000ff)
        moonHelper.position.copy(moonMesh.position);
        moonHelper.rotation.copy(moonMesh.rotation);
        const wireframeGeometry = new THREE.SphereGeometry(moonRadius * 1.01, 32, 16);
        const wireframeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
        const wireframeMesh = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
        wireframeMesh.position.copy(moonMesh.position);
        wireframeMesh.rotation.copy(moonMesh.rotation);
        scene.add(wireframeMesh);

        scene.add(moonMesh); // Add a slightly larger moon mesh for visibility
        scene.add(moonHelper);
    }

    scene.add(moonMesh);
}

function createDirectionalLight() {
    directionalLight = new THREE.DirectionalLight(0xffffff, MOONLIGHT_INTENSITY || 1.0);

    if (moonMesh) {
        directionalLight.position.copy(moonMesh.position);
        const moonCenter = moonMesh.position.clone();
        const moonRadius = moonMesh.geometry.parameters.radius;
        const direction = moonCenter.clone().normalize();
        direction.multiplyScalar(-moonRadius);
        directionalLight.position.copy(moonCenter.clone().add(direction));
    } else {
        // Fallback if moonMesh is not yet created, which should not happen
        directionalLight.position.set(TERRAIN_WIDTH * 0.2, TERRAIN_WIDTH * 0.2, -TERRAIN_WIDTH * 0.2);
        console.warn("Moon mesh not found when setting directional light position. Using default.");
    }
    directionalLight.target.position.set(0, 0, 0);
    scene.add(directionalLight);
    scene.add(directionalLight.target);

    if (debugFlag) {
        const lightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
        scene.add(lightHelper);
    }
}

function createUFO() {
    ufoGroup = new THREE.Group();
    const bodyRadius = 40;
    const cockpitRadius = bodyRadius / 3;
    const cockpitFlattening = 0.75;
    const bodyFlattening = 0.25;
    const lightRadius = bodyRadius * 0.75;
    const smallSphereRadius = bodyRadius * 0.05;
    const beamRadius = bodyRadius * 0.5 - smallSphereRadius;

    // Subgroups for easier material switching
    const bodyGroup = new THREE.Group();
    const cockpitGroup = new THREE.Group();
    const beamGroup = new THREE.Group();
    const lightsGroup = new THREE.Group();

    const ufoCockpitMesh = new THREE.Mesh(
        new THREE.SphereGeometry(cockpitRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        MATERIALS.ufo.cockpit[currentShading]
    );
    ufoCockpitMesh.scale.set(1, cockpitFlattening, 1);
    ufoCockpitMesh.position.y = (bodyRadius * bodyFlattening) * 0.5;
    cockpitGroup.add(ufoCockpitMesh);

    const ufoBodyMesh = new THREE.Mesh(
        new THREE.SphereGeometry(bodyRadius, 32, 16),
        MATERIALS.ufo.body[currentShading]
    );
    ufoBodyMesh.scale.set(1, bodyFlattening, 1);
    bodyGroup.add(ufoBodyMesh);

    const beamHeight = bodyRadius * bodyFlattening + smallSphereRadius;
    const ufoBeamGeometry = new THREE.CylinderGeometry(beamRadius, beamRadius, beamHeight, 32);
    ufoBeamMesh = new THREE.Mesh(ufoBeamGeometry, MATERIALS.ufo.beam[currentShading]);
    beamGroup.add(ufoBeamMesh);

    const ufoBeamLight = new THREE.SpotLight(0x00ff33, 5, UFO_ALTITUDE * 1.02, Math.PI / 8, 0.8, 0); // color, intensity, distance, angle, penumbra, decay
    ufoBeamMesh.position.y = - (bodyRadius * bodyFlattening) / 2 - beamHeight / 2 + (bodyRadius * bodyFlattening * 0.5); // Position beam bottom at the body's bottom edge
    ufoBeamLight.position.set(0, 0, 0);
    ufoBeamLight.castShadow = true; // Enable shadow casting

    // Necessary to move beam with UFO
    const beamLightTarget = new THREE.Object3D();
    beamLightTarget.position.set(0, -UFO_ALTITUDE, 0); // Terrain will always be slightly higher than ALT value
    ufoBeamLight.target = beamLightTarget;
    ufoBeamMesh.add(beamLightTarget);
    ufoBeamMesh.add(ufoBeamLight);

    if (debugFlag) {
        const beamLightHelper = new THREE.SpotLightHelper(ufoBeamLight);
        ufoBeamMesh.add(beamLightHelper);
    }

    // Add subgroups to main group
    ufoGroup.add(cockpitGroup);
    ufoGroup.add(bodyGroup);
    ufoGroup.add(beamGroup);

    for (let i = 0; i < NUM_LIGHTS; i++) {
        const angle = (i / NUM_LIGHTS) * Math.PI * 2;
        const lightGeometry = new THREE.SphereGeometry(smallSphereRadius, 8, 8);
        const lightMesh = new THREE.Mesh(lightGeometry, MATERIALS.ufo.lights[currentShading]);
        lightMesh.castShadow = false;
        lightMesh.position.x = Math.cos(angle) * lightRadius;
        lightMesh.position.z = Math.sin(angle) * lightRadius;
        lightMesh.position.y = - Math.sqrt(bodyRadius * bodyRadius - lightRadius * lightRadius) * bodyFlattening; //Pin lights to surface of UFO body 

        const pointLight = new THREE.PointLight(0x00ff33, 100, 0, 2.1); // color, intensity, distance

        lightMesh.add(pointLight);
        ufoLights.push(pointLight);

        pointLight.position.set(0, -smallSphereRadius / 2, 0); // Position point light halfway between sphere and body

        if (debugFlag) {
            const pointLightHelper = new THREE.PointLightHelper(pointLight, smallSphereRadius * 2);
            scene.add(pointLightHelper);
        }

        pointLight.position.set(0, -smallSphereRadius * 0.5, 0);
        lightsGroup.add(lightMesh);
    }
    ufoGroup.add(lightsGroup); // Add lightsGroup to ufoGroup

    // Attach subgroups for material switching
    ufoGroup.bodyGroup = bodyGroup;
    ufoGroup.cockpitGroup = cockpitGroup;
    ufoGroup.beamGroup = beamGroup;
    ufoGroup.lightsGroup = lightsGroup;

    return ufoGroup;

}

function createCorkTree() {
    const STEM_HEIGHT = CORK_TREE_HEIGHT; // intended above-ground height
    const STEM_RADIUS = CORK_TREE_HEIGHT / 9;
    const STEM_ANTI_CLIP = 80; // world units stem extends below ground
    const STEM_ROTATION = Math.PI / 10 + (Math.random() * Math.PI / 16); // Randomize stem rotation slightly
    const BRANCH_ROTATION = STEM_ROTATION - Math.PI / 3;
    const BRANCH_SCALE = 0.5;
    const BRANCH_HEIGHT = STEM_HEIGHT * BRANCH_SCALE;
    const BRANCH_RADIUS = STEM_RADIUS * BRANCH_SCALE;
    const TOP_SIZE = STEM_HEIGHT * 0.2;

    // Create stem geometry and move it down so the visible part starts at y=0 and anti-clip is below
    const stemGeometry = new THREE.CylinderGeometry(STEM_RADIUS, STEM_RADIUS, STEM_HEIGHT + STEM_ANTI_CLIP, 32);
    stemGeometry.translate(0, -STEM_ANTI_CLIP / 2, 0); // Move geometry down so y=0 is the base of the visible part
    const stemMesh = new THREE.Mesh(stemGeometry, MATERIALS.corkTree.trunk[currentShading]);

    // Position the stem so its base is at y=0 (ground level)
    stemMesh.position.set(0, STEM_HEIGHT / 2, 0);

    const branchGeometry = new THREE.CylinderGeometry(BRANCH_RADIUS, BRANCH_RADIUS, BRANCH_HEIGHT, 32);
    const branchMesh = new THREE.Mesh(branchGeometry, MATERIALS.corkTree.branch[currentShading]);

    const treeGroup = new THREE.Group();
    // Subgroups for easier material switching
    const trunkGroup = new THREE.Group();
    const branchGroup = new THREE.Group();
    const topGroup = new THREE.Group();

    // Add branch to stem, and stem to tree group
    stemMesh.add(branchMesh);
    treeGroup.add(stemMesh);
    stemMesh.rotation.set(0, 0, STEM_ROTATION);

    branchMesh.rotation.set(0, 0, BRANCH_ROTATION);
    branchMesh.position.set(
        Math.sin(STEM_ROTATION) * STEM_HEIGHT + Math.sin(BRANCH_ROTATION) * BRANCH_HEIGHT / 2 - BRANCH_RADIUS / 3,
        Math.cos(STEM_ROTATION) * STEM_HEIGHT / 2,
        0);

    const treeTop1 = createCorkTreeTop(TOP_SIZE);
    const treeTop2 = createCorkTreeTop(TOP_SIZE * BRANCH_SCALE);

    // Position tree tops at the very top of the visible stem (y = STEM_HEIGHT)
    treeTop1.position.set(
        stemMesh.position.x - Math.sin(STEM_ROTATION) * STEM_HEIGHT / 2,
        STEM_HEIGHT,
        0
    );
    // Place top2 at the end of the branch (top of branch, which starts at y = STEM_HEIGHT)
    treeTop2.position.set(
        branchMesh.position.x - Math.sin(BRANCH_ROTATION) * (BRANCH_HEIGHT / 2 + BRANCH_RADIUS),
        (Math.cos(BRANCH_ROTATION) * BRANCH_HEIGHT + Math.cos(STEM_ROTATION) * STEM_HEIGHT) / 2,
        0);

    topGroup.add(treeTop1);
    topGroup.add(treeTop2);

    trunkGroup.add(stemMesh);
    branchGroup.add(branchMesh);

    treeGroup.add(branchGroup);
    treeGroup.add(trunkGroup);
    treeGroup.add(topGroup);

    // Attach subgroups for material switching
    treeGroup.branchGroup = branchGroup;
    treeGroup.trunkGroup = trunkGroup;
    treeGroup.topGroup = topGroup;

    return treeGroup;
}

function createCorkTreeTop(radius) {
    const ellipsoidGeometry = new THREE.SphereGeometry(radius);
    ellipsoidGeometry.scale(2, 1, 1);
    const ellipsoidMesh = new THREE.Mesh(ellipsoidGeometry, MATERIALS.corkTree.top[currentShading]);
    return ellipsoidMesh;
}

function placeCorkTrees() {
    const trees = [];
    const MIN_TREE_DISTANCE = 70; // Minimum distance between trees (adjust as needed)
    const HOUSE_RADIUS = 180; // Minimum distance from house (adjust as needed)
    const housePos = HOUSE_POSITION.clone(); 
    for (let i = 0; i < NUM_TREES; i++) {
        const tree = createCorkTree();
        const radius = TERRAIN_WIDTH * 0.48;
        let valid = false;
        let posX, posZ, posY;
        let attempts = 0;
        while (!valid && attempts < 100) {
            let angle = Math.random() * Math.PI * 2;
            let r = Math.sqrt(Math.random()) * radius;
            posX = Math.cos(angle) * r;
            posZ = Math.sin(angle) * r;
            posY = getTerrainHeight(posX, posZ) - 0.6;
            const treePos = new THREE.Vector3(posX, 0, posZ);
            // Check distance to house
            if (treePos.distanceTo(housePos) < HOUSE_RADIUS) {
                attempts++;
                continue;
            }

            // Check distance to camera
            if (fixedCamera) {
                const cameraPos = new THREE.Vector3(fixedCamera.position.x, fixedCamera.position.y, fixedCamera.position.z);
                if (treePos.distanceTo(cameraPos) < MIN_TREE_DISTANCE) {
                    attempts++;
                    continue;
                }
            }

            // Check distance to all other trees
            let tooClose = false;
            for (let j = 0; j < trees.length; j++) {
                const existingTree = trees[j];
                if (existingTree.position.distanceTo(treePos) < MIN_TREE_DISTANCE) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) {
                attempts++;
                continue;
            }
            valid = true;
        }
        // random scale for Y axis (height)
        const scaleY = 0.8 + Math.random() * 0.3;
        // Random rotation around Y axis (full circle)
        const rotationY = Math.random() * Math.PI * 2;
        tree.position.set(posX, posY, posZ);
        tree.scale.set(1, scaleY, 1);
        tree.rotation.y = rotationY;
        trees.push(tree);
        scene.add(tree);
    }
    corkTreeMeshes = trees;
    return trees;
}

function getTerrainHeight(x, z) {
    const positionAttribute = terrainMesh.geometry.attributes.position;
    const index = Math.floor((x + TERRAIN_WIDTH / 2) / (TERRAIN_WIDTH / TERRAIN_SEGMENTS_WIDTH)) +
        Math.floor((z + TERRAIN_HEIGHT / 2) / (TERRAIN_HEIGHT / TERRAIN_SEGMENTS_HEIGHT)) * TERRAIN_SEGMENTS_WIDTH;

    if (index < 0 || index >= positionAttribute.count) {
        console.warn("Index out of bounds for terrain height calculation.");
        return 0;
    }
    return positionAttribute.getZ(index);
}

function createAlentejoHouse() {
    const house = new THREE.Group();
    house.position.set(HOUSE_POSITION.x, getTerrainHeight(HOUSE_POSITION.x, HOUSE_POSITION.z), HOUSE_POSITION.z);

    // Subgroups for easier material switching
    const whiteGroup = new THREE.Group();
    const blueGroup = new THREE.Group();
    const orangeGroup = new THREE.Group();

    whiteGroup.add(createBase());
    whiteGroup.add(createChimneyBottom(-30, 55, -23));
    blueGroup.add(createChimneyTop(-30, 70, -23));
    whiteGroup.add(createChimneyBottom(-20, 55, 23));
    blueGroup.add(createChimneyTop(-20, 70, 23));
    blueGroup.add(createBaseTrim());
    orangeGroup.add(createRoof());
    blueGroup.add(createFrontWindows());
    blueGroup.add(createFrontDoor());
    whiteGroup.add(createSideDoor());
    blueGroup.add(createSideWindow());
    blueGroup.add(createSofa());

    house.add(whiteGroup);
    house.add(blueGroup);
    house.add(orangeGroup);

    house.whiteGroup = whiteGroup;
    house.blueGroup = blueGroup;
    house.orangeGroup = orangeGroup;

    return house;
}

function createBase() {
    const geometry = new THREE.BufferGeometry();

    const vertices = new Float32Array([
        // Front
        -60, 0, 30, 60, 0, 30, 60, 40, 30,
        -60, 0, 30, 60, 40, 30, -60, 40, 30,
        // Back
        -60, 0, -30, -60, 40, -30, 60, 40, -30,
        -60, 0, -30, 60, 40, -30, 60, 0, -30,
        // Top
        -60, 40, -30, -60, 40, 30, 60, 40, 30,
        -60, 40, -30, 60, 40, 30, 60, 40, -30,
        // Bottom
        -60, 0, -30, 60, 0, -30, 60, 0, 30,
        -60, 0, -30, 60, 0, 30, -60, 0, 30,
        // Right
        60, 0, -30, 60, 40, -30, 60, 40, 30,
        60, 0, -30, 60, 40, 30, 60, 0, 30,
        // Left
        -60, 0, -30, -60, 0, 30, -60, 40, 30,
        -60, 0, -30, -60, 40, 30, -60, 40, -30
    ]);

    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    const white = MATERIALS.house.white[currentShading];
    const mesh = new THREE.Mesh(geometry, white);
    mesh.position.y = 5;

    return mesh;
}


function createBaseTrim() {
    const geometry = new THREE.BufferGeometry();

    const vertices = new Float32Array([
        // Front
        -60.05, 0, 30.05, 60.05, 0, 30.05, 60.05, 5, 30.05,
        -60.05, 0, 30.05, 60.05, 5, 30.05, -60.05, 5, 30.05,
        // Back
        -60.05, 0, -30.05, -60.05, 5, -30.05, 60.05, 5, -30.05,
        -60.05, 0, -30.05, 60.05, 5, -30.05, 60.05, 0, -30.05,
        // Top
        -60.05, 5, -30.05, -60.05, 5, 30.05, 60.05, 5, 30.05,
        -60.05, 5, -30.05, 60.05, 5, 30.05, 60.05, 5, -30.05,
        // Bottom
        -60.05, 0, -30.05, 60.05, 0, -30.05, 60.05, 0, 30.05,
        -60.05, 0, -30.05, 60.05, 0, 30.05, -60.05, 0, 30.05,
        // Right
        60.05, 0, -30.05, 60.05, 5, -30.05, 60.05, 5, 30.05,
        60.05, 0, -30.05, 60.05, 5, 30.05, 60.05, 0, 30.05,
        // Left
        -60.05, 0, -30.05, -60.05, 0, 30.05, -60.05, 5, 30.05,
        -60.05, 0, -30.05, -60.05, 5, 30.05, -60.05, 5, -30.05
    ]);

    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    const blue = MATERIALS.house.blue[currentShading];
    const mesh = new THREE.Mesh(geometry, blue);

    return mesh;
}


function createRoof() {
    const roofOrange = MATERIALS.house.orange[currentShading];
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
        // Base
        -60, 40, -30, -60, 40, 30, 60, 40, 30,
        -60, 40, -30, 60, 40, 30, 60, 40, -30,

        // Frontal and back triangles
        60, 70, 0, 60, 40, 30, 60, 40, -30,
        -60, 70, 0, -60, 40, -30, -60, 40, 30,

        // Lateral right rectangle  
        -60, 70, 0, 60, 40, 30, 60, 70, 0,
        -60, 70, 0, -60, 40, 30, 60, 40, 30,

        // Lateral left rectangle 
        -60, 70, 0, 60, 70, 0, 60, 40, -30,
        -60, 70, 0, 60, 40, -30, -60, 40, -30,

    ]);

    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, roofOrange);
    mesh.position.y = 5;

    return mesh;
}


function createWindowFrame() {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
        // Front
        -6, -6, 1, 6, -6, 1, 6, 6, 1,
        -6, -6, 1, 6, 6, 1, -6, 6, 1,
        // Back
        -6, -6, -1, -6, 6, -1, 6, 6, -1,
        -6, -6, -1, 6, 6, -1, 6, -6, -1,
    ]);
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    const blue = MATERIALS.house.blue[currentShading];
    return new THREE.Mesh(geometry, blue);
}

function createFrontWindows() {
    const group = new THREE.Group();
    const positions = [-50, -10, 30, 50];
    for (let x of positions) {
        const win = createWindowFrame();
        win.position.set(x, 25, -30);
        group.add(win);
    }
    return group;
}


function createFrontDoor() {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
        // Front
        -7, -12, 1, 7, -12, 1, 7, 12, 1,
        -7, -12, 1, 7, 12, 1, -7, 12, 1,
        // Back
        -7, -12, -1, -7, 12, -1, 7, 12, -1,
        -7, -12, -1, 7, 12, -1, 7, -12, -1,
        // Laterals, top and bottom
        -7, -12, -1, -7, -12, 1, -7, 12, 1,
        -7, -12, -1, -7, 12, 1, -7, 12, -1,

        7, -12, -1, 7, 12, -1, 7, 12, 1,
        7, -12, -1, 7, 12, 1, 7, -12, 1,

        -7, 12, -1, -7, 12, 1, 7, 12, 1,
        -7, 12, -1, 7, 12, 1, 7, 12, -1,

        -7, -12, -1, 7, -12, -1, 7, -12, 1,
        -7, -12, -1, 7, -12, 1, -7, -12, 1,
    ]);
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    const blue = MATERIALS.house.blue[currentShading];
    const mesh = new THREE.Mesh(geometry, blue);
    mesh.position.set(10, 12, -31);
    return mesh;
}

function createSideDoor() {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
        // Front
        -6, -12, 5, 6, -12, 5, 6, 12, 5,
        -6, -12, 5, 6, 12, 5, -6, 12, 5,
        // Back
        -6, -12, -5, -6, 12, -5, 6, 12, -5,
        -6, -12, -5, 6, 12, -5, 6, -12, -5,
        // laterals, top and bottom...
        -6, -12, -5, -6, -12, 5, -6, 12, 5,
        -6, -12, -5, -6, 12, 5, -6, 12, -5,

        6, -12, -5, 6, 12, -5, 6, 12, 5,
        6, -12, -5, 6, 12, 5, 6, -12, 5,

        -6, 12, -5, -6, 12, 5, 6, 12, 5,
        -6, 12, -5, 6, 12, 5, 6, 12, -5,

        -6, -12, -5, 6, -12, -5, 6, -12, 5,
        -6, -12, -5, 6, -12, 5, -6, -12, 5,
    ]);
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    const blue = MATERIALS.house.blue[currentShading];
    const mesh = new THREE.Mesh(geometry, blue);
    mesh.rotation.y = Math.PI / 2;
    mesh.position.set(-60, 12, -20);
    return mesh;
}

function createSideWindow() {
    const window = createWindowFrame();
    window.rotation.y = Math.PI / 2;
    window.position.set(-60, 25, 0);
    return window;
}


function createBox(width, height, depth, material) {
    const geometry = new THREE.BufferGeometry();
    const w = width / 2, h = height / 2, d = depth / 2;

    const vertices = new Float32Array([
        // Front
        -w, -h, d, w, -h, d, w, h, d,
        -w, -h, d, w, h, d, -w, h, d,
        // Back
        -w, -h, -d, -w, h, -d, w, h, -d,
        -w, -h, -d, w, h, -d, w, -h, -d,
        // Left
        -w, -h, -d, -w, -h, d, -w, h, d,
        -w, -h, -d, -w, h, d, -w, h, -d,
        // Right
        w, -h, -d, w, h, -d, w, h, d,
        w, -h, -d, w, h, d, w, -h, d,
        // Top
        -w, h, -d, -w, h, d, w, h, d,
        -w, h, -d, w, h, d, w, h, -d,
        // Base
        -w, -h, -d, w, -h, -d, w, -h, d,
        -w, -h, -d, w, -h, d, -w, -h, d,
    ]);

    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    return new THREE.Mesh(geometry, material);
}

function createChimneyTop(x, y, z) {
    const chimneyTop = new THREE.Group();
    const blue = MATERIALS.house.blue[currentShading];

    const chimneyBlue = createBox(32, 4, 12, blue);
    chimneyBlue.position.set(x, y, z);
    chimneyTop.add(chimneyBlue);

    return chimneyTop;
}
function createChimneyBottom(x, y, z) {
    const chimneyBottom = new THREE.Group();

    const white = MATERIALS.house.white[currentShading];

    const chimneyWhite = createBox(30, 30, 10, white);
    chimneyWhite.position.set(x, y, z);
    chimneyBottom.add(chimneyWhite);

    return chimneyBottom;
}



function createSofa() {
    const group = new THREE.Group();

    const blue = MATERIALS.house.blue[currentShading];

    const base = createBox(15, 5, 10, blue);
    base.position.set(0, -2.5, 0);
    group.add(base);

    const seat = createBox(13, 1, 8, blue);
    seat.position.set(0, 0, 0);
    group.add(seat);

    const back = createBox(15, 10, 5, blue);
    back.position.set(0, 0, 4);
    group.add(back);

    const arm1 = createBox(5, 10, 10, blue);
    arm1.position.set(-10, 0, 0);
    group.add(arm1);

    const arm2 = createBox(5, 10, 10, blue);
    arm2.position.set(10, 0, 0);
    group.add(arm2);

    group.position.set(-30, 5, -35);
    return group;
}

function switchDirectionalLightMode() {
    if (directionalLight) {
        directionalLight.visible = !directionalLight.visible;
    }
}

function switchSpotLightMode() {
    const spotLight = ufoBeamMesh ? ufoBeamMesh.children.find(child => child instanceof THREE.SpotLight) : null;
    if (spotLight) {
        spotLight.visible = !spotLight.visible;
    }
}

function switchPointLightsMode() {
    for (let i = 0; i < NUM_LIGHTS; i++) {
        ufoLights[i].visible = !ufoLights[i].visible;
    }
}

function applyShadingToScene() {
    // Terrain
    if (terrainMesh) {
        let mat = lightingEnabled ? MATERIALS.terrain[currentShading] : MATERIALS.terrain.basic;
        if (mat && terrainMesh.material !== mat) terrainMesh.material = mat;
    }
    // Moon
    if (moonMesh) {
        let mat = isCheese
            ? (lightingEnabled ? MATERIALS.cheese[currentShading] : MATERIALS.cheese.basic)
            : (lightingEnabled ? MATERIALS.moon[currentShading] : MATERIALS.moon.basic);
        if (mat && moonMesh.material !== mat) moonMesh.material = mat;
    }
    // Skydome
    if (skydomeMesh) {
        let mat = lightingEnabled ? MATERIALS.skydome[currentShading] : MATERIALS.skydome.basic;
        if (mat && skydomeMesh.material !== mat) skydomeMesh.material = mat;
    }
    // Cork Trees
    for (const tree of corkTreeMeshes) {
        tree.branchGroup.traverse(obj => {
            if (obj.isMesh) obj.material = lightingEnabled ? MATERIALS.corkTree.branch[currentShading] : MATERIALS.corkTree.branch.basic;
        });
        tree.trunkGroup.traverse(obj => {
            if (obj.isMesh) obj.material = lightingEnabled ? MATERIALS.corkTree.trunk[currentShading] : MATERIALS.corkTree.trunk.basic;
        });
        tree.topGroup.traverse(obj => {
            if (obj.isMesh) obj.material = lightingEnabled ? MATERIALS.corkTree.top[currentShading] : MATERIALS.corkTree.top.basic;
        });
    }
    // UFO
    if (ufo) {
        if (ufo.bodyGroup && ufo.cockpitGroup && ufo.beamGroup && ufo.lightsGroup) {
            ufo.bodyGroup.traverse(obj => {
                if (obj.isMesh) obj.material = lightingEnabled ? MATERIALS.ufo.body[currentShading] : MATERIALS.ufo.body.basic;
            });
            ufo.cockpitGroup.traverse(obj => {
                if (obj.isMesh) obj.material = lightingEnabled ? MATERIALS.ufo.cockpit[currentShading] : MATERIALS.ufo.cockpit.basic;
            });
            ufo.beamGroup.traverse(obj => {
                if (obj.isMesh) obj.material = lightingEnabled ? MATERIALS.ufo.beam[currentShading] : MATERIALS.ufo.beam.basic;
            });
            ufo.lightsGroup.traverse(obj => {
                if (obj.isMesh) obj.material = lightingEnabled ? MATERIALS.ufo.lights[currentShading] : MATERIALS.ufo.lights.basic;
            });
        }
    }
    if (houseMesh) {
        if (houseMesh.whiteGroup && houseMesh.blueGroup && houseMesh.orangeGroup) {
            houseMesh.whiteGroup.traverse(obj => {
                if (obj.isMesh) obj.material = lightingEnabled ? MATERIALS.house.white[currentShading] : MATERIALS.house.white.basic;
            });
            houseMesh.blueGroup.traverse(obj => {
                if (obj.isMesh) obj.material = lightingEnabled ? MATERIALS.house.blue[currentShading] : MATERIALS.house.blue.basic;
            });
            houseMesh.orangeGroup.traverse(obj => {
                if (obj.isMesh) obj.material = lightingEnabled ? MATERIALS.house.orange[currentShading] : MATERIALS.house.orange.basic;
            });
        } else {
            houseMesh.traverse(obj => {
                if (obj.isMesh) {
                    let mat = lightingEnabled ? MATERIALS.house.white[currentShading] : MATERIALS.house.white.basic;
                    if (mat && obj.material !== mat) obj.material = mat;
                }
            });
        }
    }
}

function regenerateFlowers() {
    const newFloralTexture = createFloralFieldTexture(TERRAIN_TEXTURE_WIDTH, TERRAIN_TEXTURE_HEIGHT, NUM_FLOWERS, FLOWER_SIZE, FLOWER_VARIATION);
    newFloralTexture.wrapS = THREE.RepeatWrapping;
    newFloralTexture.wrapT = THREE.RepeatWrapping;
    newFloralTexture.repeat.set(TERRAIN_WIDTH / TEXTURE_WORLD_SIZE, TERRAIN_HEIGHT / TEXTURE_WORLD_SIZE);

    for (const key in MATERIALS.terrain) {
        MATERIALS.terrain[key].map = newFloralTexture;
        MATERIALS.terrain[key].map.needsUpdate = true;
    }
}

function regenerateStars() {
    const newStarryTexture = createStarrySkyTexture(SKY_TEXTURE_WIDTH, SKY_TEXTURE_HEIGHT, NUM_STARS, STAR_SIZE, STAR_VARIATION, TWILIGHT_OVERLAP);

    for (const key in MATERIALS.skydome) {
        MATERIALS.skydome[key].map = newStarryTexture;
        MATERIALS.skydome[key].map.needsUpdate = true;
    }
}

function setShadingMode(mode) {
    currentShading = mode;
    applyShadingToScene();
}

function toggleLighting() {
    lightingEnabled = !lightingEnabled;
    applyShadingToScene();
}

function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (window.innerHeight > 0 && window.innerWidth > 0) {
        for (let cam of cameras) {
            if (!cam) continue; // Skip undefined cameras
            cam.aspect = window.innerWidth / window.innerHeight;
            cam.updateProjectionMatrix();
        }
    }
}

function onKeyDown(e) {
    switch (e.keyCode) {
        case 55: //7
            if (camera === fixedCamera) {
                if(orbitalCamera) camera = orbitalCamera;
                if (controls) controls.enabled = true;
            }
            else if (camera != vrCamera) {
                if(fixedCamera) camera = fixedCamera;
                if (controls) controls.enabled = false;
            }
            break;

        case 68: //D
        case 100: //d
            switchDirectionalLightMode();
            break;

        case 81: //Q
        case 113: //q
            setShadingMode('lambert');
            break;

        case 87: //W
        case 119: //w
            setShadingMode('phong');
            break;

        case 69: //E
        case 101: //e
            setShadingMode('toon');
            break;

        case 82: //R
        case 114: //r
            toggleLighting();
            break;

        case 80: //P
        case 112: //p
            switchPointLightsMode();
            break;

        case 83: //S
        case 115: //s
            switchSpotLightMode();
            break;

        case 37: // Left arrow
            keyStates['arrowleft'] = true;
            break;

        case 39: // Right arrow
            keyStates['arrowright'] = true;
            break;
        case 38: // Up arrow
            keyStates['arrowup'] = true;
            break;
        case 40: // Down arrow
            keyStates['arrowdown'] = true;
            break;

        case 67: // C
        case 99: // c
            if (cheese_easter_egg_counter >= 20) {
                isCheese = !isCheese; // Toggle cheese mode
                console.log("Cheese mode toggled! The moon " + (isCheese ? "is" : "is not") + " made of cheese!");
            }
            else
                cheese_easter_egg_counter++;
            applyShadingToScene(); // Update materials based on cheese mode
            break;
        // case 1
        case 49: // 1
            regenerateFlowers();
            break;

        case 50: // 2
            regenerateStars();
            break;
    }

}

function onKeyUp(e) {
    switch (e.keyCode) {
        case 37: // Left arrow
            keyStates['arrowleft'] = false;
            break;
        case 39: // Right arrow
            keyStates['arrowright'] = false;
            break;
        case 38: // Up arrow
            keyStates['arrowup'] = false;
            break;
        case 40: // Down arrow
            keyStates['arrowdown'] = false;
            break;
    }
}

// UFO moves as a function of camera looking at vectoe
function updateUFOMovement() {
    if (!ufo) return;
    // Rotation
    ufo.rotation.y += UFO_ROTATION_SPEED;

    // Forward direction (projected to XZ plane)
    let forward = new THREE.Vector3();
    if (lookingAt) {
        forward.copy(lookingAt).setY(0).normalize();
    } else {
        forward.set(0, 0, -1);
    }
    // Right vector (perpendicular to forward, in XZ plane)
    let right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    let moveVector = new THREE.Vector3();
    if (keyStates['arrowup']) {
        moveVector.add(forward);
    }
    if (keyStates['arrowdown']) {
        moveVector.add(forward.clone().negate());
    }
    if (keyStates['arrowright']) {
        moveVector.add(right);
    }
    if (keyStates['arrowleft']) {
        moveVector.add(right.clone().negate());
    }
    if (moveVector.lengthSq() > 0) {
        moveVector.normalize().multiplyScalar(UFO_MOVEMENT_SPEED);
        let oldPosition = ufo.position.clone();
        ufo.position.add(moveVector);
        if (Math.sqrt(Math.pow(ufo.position.x, 2) + Math.pow(ufo.position.z, 2)) > TERRAIN_WIDTH / 2 - 50) {
            // If UFO goes out of bounds, revert to old position
            ufo.position.copy(oldPosition);
        }
    }
}

function updateLookingAt() {
    if (!camera || !ufo) return;

    // Calculate the camera direction vector
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    lookingAt.copy(cameraDirection).normalize();
}

function animate() {
    updateLookingAt();
    updateUFOMovement();
    if (controls) controls.update();
    if (scene && camera) renderer.render(scene, camera);
}

init();