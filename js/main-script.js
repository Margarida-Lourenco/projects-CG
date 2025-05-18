import * as THREE from "three";
/* import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import * as Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js"; */

//////////////////////
/* GLOBAL VARIABLES */
//////////////////////

let cameras = [];
let currentCamera = 0;
let camera;
let scene;
let renderer;

let material = new THREE.MeshBasicMaterial(
  { color: 0x00ff00, wireframe: true, side: THREE.DoubleSide }
);


/////////////////////
/* CREATE SCENE(S) */
/////////////////////
function createScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfffff0);
  scene.add(new THREE.AxesHelper(10));

  createRobot(0, 0, 0);
  createTrailer(-70, 0, 30);
}

//////////////////////
/* CREATE CAMERA(S) */
//////////////////////
function createCamera() {  // alter to create all necessary cameras
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.set(60, 60, 60);
  camera.lookAt(0, 30, 10); 
}

/////////////////////
/* CREATE LIGHT(S) */
/////////////////////

////////////////////////
/* CREATE OBJECT3D(S) */
////////////////////////

function addRobotWaist(obj, x, y, z, material) {
    const geometry = new THREE.BoxGeometry(15, 10, 35);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y+20, z);
    obj.add(mesh);
}

function addWheel(){
    const geometry = new THREE.CylinderGeometry(5, 5, 5, 15); // radiusTop, radiusBottom, height, radialSegments
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    return mesh;
}

function addRobotBody(obj, x, y, z, material) {
    const geometry = new THREE.BoxGeometry(15, 10, 15);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y+30, z);
    obj.add(mesh);
}

function addRobotShoulders(obj, x, y, z, material) {
    const geometry = new THREE.BoxGeometry(15, 15, 35);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y+27.5, z);
    obj.add(mesh);
}

function addRobotHead(obj, x, y, z, material) {
    const geometry = new THREE.BoxGeometry(10, 10, 10);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y+20, z);
    obj.add(mesh);
}

function createLeg() {
  const leg = new THREE.Object3D();

  const thigh = new THREE.Mesh(
    new THREE.BoxGeometry(7.5, 10, 7.5), material);

  const calf = new THREE.Mesh(
    new THREE.BoxGeometry(10, 25, 10), material);

  const wheel1 = addWheel();
  const wheel2 = addWheel();
  
  thigh.translateY(17.5);
  wheel1.position.set(-10, -12.5, -2.5);
  wheel2.position.set(-10, -25, -2.5);
 
  leg.add(thigh, calf, wheel1, wheel2);

  return leg;
}

function createTrailer(x, y, z){
  const trailer = new THREE.Object3D();

  const box = new THREE.Mesh(new THREE.BoxGeometry(35, 95, 35), material);

  box.position.set(0, 0, 0);

  const wheel1 = addWheel();
  const wheel2 = addWheel();
  const wheel3 = addWheel();
  const wheel4 = addWheel();

  wheel1.position.set(12.5, -47.5, 12.5);
  wheel2.position.set(12.5, -34.5, 12.5);
  wheel3.position.set(12.5, -47.5, -12.5);
  wheel4.position.set(12.5, -34.5, -12.5);

  trailer.add(box, wheel1, wheel2, wheel3, wheel4);

  trailer.position.set(x, y, z);
  scene.add(trailer);
}


function createRobot(x, y, z) {
    const robot = new THREE.Object3D();
    
    const leg1 = createLeg(); leg1.position.set(0, -2.5, 20);
    const leg2 = createLeg(); leg2.position.set(0, -2.5, 0);
    
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });

    robot.add(leg1, leg2);
    addRobotWaist(robot, 0, 5, 10, material);
    addRobotBody(robot, 0, 5, 10, material);
    addRobotShoulders(robot, 0, 20, 10, material);
    addRobotHead(robot, 0, 40, 10, material);

    scene.add(robot);

    robot.position.set(x, y, z);
}

//////////////////////
/* CHECK COLLISIONS */
//////////////////////
function checkCollisions() {}

///////////////////////
/* HANDLE COLLISIONS */
///////////////////////
function handleCollisions() {}

////////////
/* UPDATE */
////////////
function update() {}

/////////////
/* DISPLAY */
/////////////
function render() {
  renderer.render(scene, camera);
}

////////////////////////////////
/* INITIALIZE ANIMATION CYCLE */
////////////////////////////////
function init() {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  createScene();
  createCamera();

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", onResize);
}

/////////////////////
/* ANIMATION CYCLE */
/////////////////////
function animate() {
  render();
  requestAnimationFrame(animate);
}

////////////////////////////
/* RESIZE WINDOW CALLBACK */
////////////////////////////
function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  if (window.innerHeight > 0 && window.innerWidth > 0) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
}

function swapVisualizationMode() {
  scene.traverse((obj) => {
    if (obj.isMesh) {
      obj.material = obj.material.clone();
      obj.material.wireframe = !obj.material.wireframe;
    }
  });
}

///////////////////////
/* KEY DOWN CALLBACK */
///////////////////////
function onKeyDown(e) {
  switch (e.keyCode) {
    // switching cameras
    case 49: //1
      break;
    case 50: //2
      break;
    case 51: //3
      break;
    case 52: //4
      break;

    case 55: //7
      swapVisualizationMode();
      break;

    case 65: //A
    case 97: //a
    case 81: //Q
    case 113: //q
      // Alter theta1 angle
      break;
    case 83: //S
    case 115: //s
    case 87: //W
    case 119: //w
      // Alter theta2 angle
      break;
    case 68: //D
    case 100: //d
    case 69: //E
    case 101: //e
      // Alter delta1 angle
      break;
    case 70: //F
    case 102: //f
    case 82: //R
    case 114: //r
      // Alter delta3 angle
      break;
  }
}

///////////////////////
/* KEY UP CALLBACK */
///////////////////////
function onKeyUp(e) {}

init();
animate();