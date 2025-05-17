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
let robot;

/////////////////////
/* CREATE SCENE(S) */
/////////////////////
function createScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfffff0);
  scene.add(new THREE.AxesHelper(10));

  createRobot(0, 8, 0);
}

//////////////////////
/* CREATE CAMERA(S) */
//////////////////////
function createCamera() {  // alter to create all necessary cameras
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.x = 50;
  camera.position.y = 50;
  camera.position.z = 50;
  camera.lookAt(scene.position);
}

/////////////////////
/* CREATE LIGHT(S) */
/////////////////////

////////////////////////
/* CREATE OBJECT3D(S) */
////////////////////////

function addRobotWheel(obj, x, y, z, material) {
  const geometry = new THREE.CylinderGeometry(3.5, 3.5, 2);  
  geometry.rotateX(Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  obj.add(mesh);
}
function addRobotLeg(obj, x, y, z, material) {
  const geometry = new THREE.BoxGeometry(5, 20, 5);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y - 3, z);
  obj.add(mesh);
}

function addRobotThigh(obj, x, y, z, material) {
  const geometry = new THREE.BoxGeometry(2.5, 10, 2.5);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y+10, z);
  obj.add(mesh);
}

function createRobot(x, y, z) {
  robot = new THREE.Object3D();

  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });

  addRobotLeg(robot, 0, -1, 0, material);
  addRobotThigh(robot, 0, 0, 0, material);
  addRobotLeg(robot, 0, -1, 10, material);
  addRobotThigh(robot, 0, 0, 10, material);

  scene.add(robot);

  robot.position.x = x;
  robot.position.y = y;
  robot.position.z = z;
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
      robot.children[0].material.wireframe = !robot.children[0].material.wireframe; // all share the same material
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