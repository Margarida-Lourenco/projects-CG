import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import * as Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js"; 
import { createFloralFieldTexture, createStarrySkyTexture, createCheeseTexture} from './procedural-textures.js';

let scene, camera, renderer, controls;
let terrainMesh, moonMesh, directionalLight;
let ufo, ufoGroup; 
let ufoBeamMesh, ufoLights = []; 
let keyStates = {}; // To store the state of pressed keys

const debugFlag = false; // Set to true to enable scene helpers

const TERRAIN_WIDTH = 3560; 
const TERRAIN_HEIGHT = TERRAIN_WIDTH;
const TERRAIN_SEGMENTS_WIDTH = 200; // Number of segments in the width. Smaller values are smoother but less detailed
const TERRAIN_SEGMENTS_HEIGHT = TERRAIN_SEGMENTS_WIDTH; 
const TEXTURE_WORLD_SIZE = 100; // Size of one texture tile in world units (both width and height)

const HEIGHTMAP_SCALE = 300;
const HEIGHTMAP_AREA_SELECTION_RATIO = 0.6; // Value between 0 (exclusive) and 1 (inclusive). 1 = full image, 0.5 = half area.
// Original heightmap was 17.8km wide, so 0.2 = 3.56km wide
// Original size * Scale / Width = IRL Meters per unit

// Texture pixel dimensions - you can change these arbitrarily without affecting world size
const TERRAIN_TEXTURE_WIDTH = 1024 ; // Size of the floral field texture in pixels
const TERRAIN_TEXTURE_HEIGHT = TERRAIN_TEXTURE_WIDTH; // Size of the floral field texture in pixels
const NUM_FLOWERS = 300; // Number of flowers in the floral field texture
const FLOWER_SIZE = 1; // Minimum flower size in pixels
const FLOWER_VARIATION = 2; // Variation in flower size in pixels

const MOON_SCALE = 0.025; // Radius as percentage of terrain width
const SKYDOME_SCALE = 0.5; // Radius as percentage of terrain width
const MOON_ALTITUDE = 1 * Math.PI / 6; // Angle of moon above terrain relative to XZ plane
const MOON_ANGLE = -1 * Math.PI / 3; // Angle of moon in radians relative to x axis
const MOONLIGHT_INTENSITY = 0.7; // Intensity of the moonlight 0-1
const IS_CHEESE = true // Is the moon made of cheese?

const NUM_STARS = 2000; // Number of stars in the starry sky texture
const STAR_SIZE = 0.1; // Minimum star size
const STAR_VARIATION = 0.2; // Variation in star size
const TWILIGHT_OVERLAP = 1; // How much the twilight gradient overlaps with stars (0-1) * 30%
const SKY_TEXTURE_WIDTH = 4096 * 2; // Width of the starry sky texture
const SKY_TEXTURE_HEIGHT = SKY_TEXTURE_WIDTH / 2; // Mapping is 2:1
// Smaller height voids stretching at equator but more distortion at poles

const UFO_ALTITUDE = 200; // Height of UFO above terrain
const UFO_ROTATION_SPEED = 0.02; // radians per frame
const UFO_MOVEMENT_SPEED = 0.8;  // units per frame (increased for better visibility)
const NUM_LIGHTS = 8; // Number of lights on the UFO

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    if (debugFlag) {
            const axesHelper = new THREE.AxesHelper(1000);
            scene.add(axesHelper);
            //grid is currently slightly misaligned with the texture repetition pattern
            const gridHelper = new THREE.GridHelper(TERRAIN_WIDTH, TERRAIN_WIDTH / TEXTURE_WORLD_SIZE);
            scene.add(gridHelper);
            axesHelper.position.set(0, 0, 0);
            gridHelper.position.set(0, 0, 0);
    }
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
        const floralTexture = createFloralFieldTexture(TERRAIN_TEXTURE_WIDTH, TERRAIN_TEXTURE_HEIGHT, NUM_FLOWERS, FLOWER_SIZE, FLOWER_VARIATION);
        floralTexture.wrapS = THREE.RepeatWrapping;
        floralTexture.wrapT = THREE.RepeatWrapping;
        floralTexture.repeat.set(TERRAIN_WIDTH / TEXTURE_WORLD_SIZE, TERRAIN_HEIGHT / TEXTURE_WORLD_SIZE); // Texture repeats based on world size
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
    allocateMultipleCorkTrees(); // Create multiple cork trees
    ufo.position.set(0, UFO_ALTITUDE, 0); // Position UFO above the terrain

    const house = createAlentejoHouse();
    scene.add(house);
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
        side: THREE.FrontSide, 
        displacementMap: heightmapTexture,
        displacementScale: HEIGHTMAP_SCALE, // Scale the heightmap to match terrain size
        displacementBias: -HEIGHTMAP_SCALE / 8, // Center the heightmap roughly around 0
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

    const starrySkyTexture = createStarrySkyTexture(SKY_TEXTURE_WIDTH, SKY_TEXTURE_HEIGHT, NUM_STARS, STAR_SIZE, STAR_VARIATION, TWILIGHT_OVERLAP);

    const skydomeMaterial = new THREE.MeshBasicMaterial({
        map: starrySkyTexture,
        side: THREE.BackSide // Render the inside of the sphere
    });

    const skydomeMesh = new THREE.Mesh(skydomeGeometry, skydomeMaterial);
    scene.add(skydomeMesh);

}

function createMoon() {
    const moonRadius = TERRAIN_WIDTH * MOON_SCALE; // Moon size relative to terrain
    const moonGeometry = new THREE.SphereGeometry(moonRadius, 64, 32); // Higher segments for better texture mapping
    if (IS_CHEESE) {
        // Use a 2:1 aspect ratio for the cheese texture to reduce stretching
        const cheeseTextureWidth = 2048;
        const cheeseTextureHeight = 1024;
        const cheeseTexture = createCheeseTexture(cheeseTextureWidth, cheeseTextureHeight, 20, 8, 16);
        cheeseTexture.wrapS = THREE.RepeatWrapping;
        cheeseTexture.wrapT = THREE.RepeatWrapping;
        // Main cheese moon: fully lit, shows texture clearly
        const cheeseMaterial = new THREE.MeshBasicMaterial({
            map: cheeseTexture,
            emissive: 0xffffaa, // Emissive color for a glowing effect
            emissiveIntensity: 0.8,
        });
        moonMesh = new THREE.Mesh(moonGeometry, cheeseMaterial);
    } else {
        // Normal moon: keep original look
        const moonMaterial = new THREE.MeshStandardMaterial({
            color: 0xfffff0,
            emissive: 0xffffaa,
            emissiveIntensity: 0.8,
            roughness: 0.9,
            metalness: 0.1,
            map: null
        });
        moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    }
    // Position moon on the surface of the skydome sphere
    // Spherical coordinates: X = cos(altitude) * cos(angle), Y = sin(altitude), Z = cos(altitude) * sin(angle)
    const currentDirX = Math.cos(MOON_ALTITUDE) * Math.cos(MOON_ANGLE);
    const currentDirY = Math.sin(MOON_ALTITUDE);
    const currentDirZ = Math.cos(MOON_ALTITUDE) * Math.sin(MOON_ANGLE);
    const currentDirMagnitude = Math.sqrt(currentDirX*currentDirX + currentDirY*currentDirY + currentDirZ*currentDirZ);
    console.log("Current direction vector: ", currentDirX, currentDirY, currentDirZ);
    
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
        MOON_ALTITUDE - Math.PI / 2  // No rotation around Z axis
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
    console.log("Moon created and positioned on skydome surface.");
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

    if (debugFlag){
        const lightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
        scene.add(lightHelper);
    }
    console.log("Directional light created.");
}

function createUFO() {
    ufoGroup = new THREE.Group();
    const bodyRadius = 20;
    const cockpitRadius = bodyRadius / 3; 
    const cockpitFlattening = 0.75; 
    const bodyFlattening = 0.25;

    const lightRadius = bodyRadius * 0.6; // Radius at which lights are placed, slightly inside the body
    const smallSphereRadius = bodyRadius * 0.05; // Size of the small spheres
    const beamRadius = lightRadius * 0.8 - smallSphereRadius; // Radius of the beam cilinder, slightly smaller than the lights

    // Reverted transparency, kept emissive for lightMaterial
    const lightMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff33, emissive: 0x00ff33, emissiveIntensity: 0.8 });
    const ufoCockpitMaterial = new THREE.MeshStandardMaterial(
        { 
            color: 0x00ff33, 
            //emissive: 0x00ff33, 
            //emissiveIntensity: 0.2,
            metalness: 0.3,
            roughness: 0.0,
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
    ufoBeamMesh = new THREE.Mesh(ufoBeamGeometry, ufoBodyMaterial);
    
    const ufoBeamLight = new THREE.SpotLight(0x00ff33, 5,  UFO_ALTITUDE, Math.PI / 12, 1, 0.4); // color, intensity, distance, angle, penumbra, decay
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

    ufoGroup.add(ufoCockpitMesh, ufoBodyMesh, ufoBeamMesh); 

    for (let i = 0; i < NUM_LIGHTS; i++) {
        const angle = (i / NUM_LIGHTS) * Math.PI * 2; // Angle staggering for each sphere, not editable
        const lightGeometry = new THREE.SphereGeometry(smallSphereRadius, 8, 8);
        const lightMesh = new THREE.Mesh(lightGeometry, lightMaterial);
        lightMesh.castShadow = false; // Makes it not interfere with point light

        lightMesh.position.x = Math.cos(angle) * lightRadius;
        lightMesh.position.z = Math.sin(angle) * lightRadius;
        lightMesh.position.y = - Math.sqrt(bodyRadius * bodyRadius - lightRadius * lightRadius) * bodyFlattening; //Pin lights to surface of UFO body 

        const pointLight = new THREE.PointLight(0x00ff33, 100, 0, 3); // color, intensity, distance
        
        lightMesh.add(pointLight);
        ufoLights.push(pointLight); 
        
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

function createCorkTree() {
    const stemGeometry = new THREE.CylinderGeometry(10, 10, 90, 32);  
    const stemMaterial = new THREE.MeshStandardMaterial({ color: 0xdb7322, roughness: 0.5, metalness: 0.1 });
    const stemMesh = new THREE.Mesh(stemGeometry, stemMaterial);

    const branchGeometry = new THREE.CylinderGeometry(5, 5, 45, 32);
    const branchMaterial = new THREE.MeshStandardMaterial({ color: 0xdb7322, roughness: 0.5, metalness: 0.1 });
    const branchMesh = new THREE.Mesh(branchGeometry, branchMaterial);

    stemMesh.rotation.set(0, 0, Math.PI / 10);
    stemMesh.position.set(0, 90, 0); 

    branchMesh.rotation.set(0, 0, -Math.PI / 5); 
    branchMesh.position.set(15, 10, 0);

    const treeTop1 = createCorkTreeTop(20, 20, 20); 
    const treeTop2 = createCorkTreeTop(8, 8, 8);

    treeTop1.position.set(0, 60, 0); 
    treeTop2.position.set(0, 20, 0); 

    branchMesh.add(treeTop2); 
    stemMesh.add(branchMesh, treeTop1); 

    return stemMesh;

}

function createCorkTreeTop(x,y,z){
    const ellipsoidGeometry = new THREE.SphereGeometry(x, y, z);
    ellipsoidGeometry.rotateZ(Math.PI/2);
    ellipsoidGeometry.scale(2, 1, 1);
    const treeTopMaterial = new THREE.MeshStandardMaterial({ color: 0x218732, roughness: 0.5, metalness: 0.1 });
    const ellipsoidMesh = new THREE.Mesh(ellipsoidGeometry, treeTopMaterial);

    return ellipsoidMesh;
}

function allocateMultipleCorkTrees() {
    const numTrees = 50; // Number of trees to create
    const trees = [];

    for (let i = 0; i < numTrees; i++) {
        const tree = createCorkTree();

        const posX = (Math.random() - 0.5) * TERRAIN_WIDTH * 0.8;
        const posZ = (Math.random() - 0.5) * TERRAIN_WIDTH * 0.8;
        const posY = 80; // Ground level

        // random scale for Y axis (height), between 0.8 and 1.5 times the original height
        const scaleY = 0.8 + Math.random() * 0.7;

        // Random rotation around Y axis (full circle)
        const rotationY = Math.random() * Math.PI * 2;

        tree.position.set(posX, posY, posZ);
        tree.scale.set(1, scaleY, 1);
        tree.rotation.y = rotationY;

        trees.push(tree);
        scene.add(tree);
    }

    return trees;
}

function createAlentejoHouse() {
    let position = new THREE.Vector3(200, 80, -500)
    // MATERIAIS
    const white = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const blue = new THREE.MeshLambertMaterial({ color: 0x005bbb });
    const roofOrange = new THREE.MeshLambertMaterial({ color: 0xffa500 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x333333 });

    // DIMENSÕES
    const width = 120;
    const height = 40;
    const depth = 60;

    // CASA PRINCIPAL
    const house = new THREE.Group();
    house.position.copy(position); // posição base global da casa

    // Corpo principal
    const base = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), white);
    base.position.set(0, height / 2, 0);
    house.add(base);

    // Faixa azul na base
    const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(width + 0.1, 10, depth + 0.1), blue);
    baseTrim.position.set(0, 5, 0);
    house.add(baseTrim);

    // Telhado duas águas (usamos cilindro rotacionado)
    const roofGeo = new THREE.CylinderGeometry(depth / 2, depth / 2, width, 2, 1, false, 0, Math.PI);
    const roofMesh = new THREE.Mesh(roofGeo, roofOrange);
    roofMesh.rotation.z = Math.PI / 2;
    roofMesh.position.set(0, height, 0); // acima da casa
    house.add(roofMesh);

    // Janelas frontais
    const windowY = 25;
    const windowZ = -depth / 2 - 1;
    const windowPositions = [-50, -20, 30, 50];
    for (let i of windowPositions) {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(12, 12, 2), blue);
        frame.position.set(i, windowY, windowZ);
        const window = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 1), dark);
        window.position.set(i, windowY, windowZ - 0.5);
        house.add(frame, window);
    }

    // Porta central
    const doorY = 12;
    const doorZ = depth / 2 + 1;
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(14, 24, 2), blue);
    doorFrame.position.set(10, doorY + 4, -doorZ); // virada para frente
    const door = new THREE.Mesh(new THREE.BoxGeometry(10, 20, 1), dark);
    door.position.set(10, doorY + 4, -doorZ - 0.5);
    house.add(doorFrame, door);

    // Porta lateral com cobertura
    const sideDoor = new THREE.Mesh(new THREE.BoxGeometry(10, 20, 1), dark);
    sideDoor.position.set(width / 2 - 10, 10, 10);
    house.add(sideDoor);

    const cover = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 8), roofOrange);
    cover.rotation.x = -Math.PI / 6;
    cover.position.set(width / 2 - 10, 20, 10);
    house.add(cover);

    // Chaminés
    const chimney1 = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 10), white);
    chimney1.position.set(-20, height + 15, -23);
    house.add(chimney1);

    const chimneyTop1 = new THREE.Mesh(new THREE.BoxGeometry(32, 4, 12), blue);
    chimneyTop1.position.set(-20, height + 30, -23);
    house.add(chimneyTop1);

    const chimney2 = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 10), white);
    chimney2.position.set(-20, height + 15, 23);
    house.add(chimney2);

    const chimneyTop2 = new THREE.Mesh(new THREE.BoxGeometry(32, 4, 12), blue);
    chimneyTop2.position.set(-20, height + 30, 23);
    house.add(chimneyTop2);

    return house;

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

function onKeyDown(e) {
    switch (e.keyCode) {
        case 68: //D
        case 100: //d
            switchDirectionalLightMode(); 
            break;

        case 81: //Q
        case 113: //q
            break;

        case 87: //W
        case 119: //w
            break;

        case 69: //E
        case 101: //e
            break;

        case 82: //R
        case 114: //r
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
