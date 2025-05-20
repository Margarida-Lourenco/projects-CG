import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import * as Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js"; 

//////////////////////
/* GLOBAL VARIABLES */
//////////////////////

let cameras = [];
let currentCamera = 0;
let trailer;
let scene;
let renderer;
let speed = 2;
//let direction;
let directions = {
  up: new THREE.Vector3(0, 1, 0),
  down: new THREE.Vector3(0, -1, 0),
  left: new THREE.Vector3(0, 0, 1),
  right: new THREE.Vector3(0, 0, -1),
};
//let moving = false; 


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

  createRobot(0, 0, -50);
  createTrailer(-90, -5, 30);
}

//////////////////////
/* CREATE CAMERA(S) */
//////////////////////
function createCamera() { 
  let persCamera;

  // Perspective camera
  persCamera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  persCamera.position.set(60, 60, 60);
  persCamera.lookAt(0, 30, 10);

  // Orthographic cameras
  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = 200;

  // Frontal view
  let orthoCamera1 = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    1,
    1000
  );
  orthoCamera1.position.set(60, 0, 0);
  orthoCamera1.lookAt(0, 0, 0);
  orthoCamera1.userData.frustumSize = frustumSize;

  // Lateral view
  let orthoCamera2 = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    1,
    1000
  );
  orthoCamera2.position.set(0, 0, 60);
  orthoCamera2.lookAt(0, 0, 0);
  orthoCamera2.userData.frustumSize = frustumSize;

  // Top view
  let orthoCamera3 = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
  );
  orthoCamera3.position.set(0, 60, 0);
  orthoCamera3.userData.frustumSize = frustumSize;
  orthoCamera3.lookAt(0, 0, 0);

  cameras = [
    orthoCamera1,
    orthoCamera2,
    orthoCamera3,
    persCamera
  ];
}

function switchToCamera(cam) {
  currentCamera = cam - 1;
}

/////////////////////
/* CREATE LIGHT(S) */
/////////////////////

////////////////////////
/* CREATE OBJECT3D(S) */
////////////////////////

function addRobotWaist(obj, x, y, z, material) {
    const geometry = new THREE.BoxGeometry(5, 10, 35);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x+5, y+20, z);
    obj.add(mesh);

    const geometry2 = new THREE.BoxGeometry(10, 10, 25);
    const mesh2 = new THREE.Mesh(geometry2, material);
    mesh2.position.set(x-2.5, y+20, z);

    obj.add(mesh2);

    const wheel1 = addWheel();
    const wheel2 = addWheel();
    wheel1.position.set(0, 25, 25);
    wheel2.position.set(0, 25, -5);
    obj.add(wheel1, wheel2);
}

function addWheel(){
    const geometry = new THREE.CylinderGeometry(4.5, 4.5, 5, 16); // radiusTop, radiusBottom, height, radialSegments
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
    const head = new THREE.Object3D();
    const face = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 10, 32), material);
    face.position.set(x, y+20, z);

    const antenna1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 5, 32), material);
    antenna1.position.set(x, y+25, z+4.5);

    const antenna2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 5, 32), material);
    antenna2.position.set(x, y+25, z-4.5);

    obj.add(face, antenna1, antenna2);
}

function addRobotArm(obj, x, y, z, material) {
    const arm = new THREE.Object3D();

    const upper = new THREE.Mesh(new THREE.BoxGeometry(10, 15, 10), material);
    upper.position.set(0, 20, 0);

    const antennas = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 10, 32), material);
    antennas.position.set(0, 32.5, 0);

    const lower = new THREE.Mesh(new THREE.BoxGeometry(10, 25, 10), material);
    lower.position.set(0, 0, 0);

    arm.add(upper, lower, antennas);
    arm.position.set(x, y, z);
    
    obj.add(arm);
}


function createLeg() {
  const leg = new THREE.Object3D();

  const thigh = new THREE.Mesh(
    new THREE.BoxGeometry(7.5, 10, 7.5), material);

  const calf = new THREE.Mesh(
    new THREE.BoxGeometry(10, 25, 10), material);

  const foot = new THREE.Mesh(
    new THREE.BoxGeometry(15, 5, 15), material);  

  const wheel1 = addWheel();
  const wheel2 = addWheel();
  
  thigh.translateY(17.5);
  foot.translateY(-15);
  foot.translateZ(2.5);
  foot.translateX(2.5);
  wheel1.position.set(0, 2.5, 7.5);
  wheel2.position.set(0, -7.25, 7.5);
 
  leg.add(thigh, calf, wheel1, wheel2, foot);
  
  return leg;
}

function createTrailer(x, y, z){
  trailer = new THREE.Object3D();

  const box = new THREE.Mesh(new THREE.BoxGeometry(95, 35, 35), material);

  const connect_piece = new THREE.Mesh(new THREE.BoxGeometry(15, 5, 15), material);

  box.position.set(0, 0, 0);
  connect_piece.position.set(-30, -20, 0);

  const wheel1 = addWheel();
  const wheel2 = addWheel();
  const wheel3 = addWheel();
  const wheel4 = addWheel();

  wheel1.position.set(43, -22, -15);
  wheel2.position.set(33, -22, -15);
  wheel3.position.set(33, -22, 15);
  wheel4.position.set(43, -22, 15);

  trailer.add(box, wheel1, wheel2, wheel3, wheel4, connect_piece);

  trailer.position.set(x, y, z);
  trailer.rotation.set(0, Math.PI / 2, 0);
  scene.add(trailer);
}


function createRobot(x, y, z) {
    const robot = new THREE.Object3D();
    
    const leg1 = createLeg(); leg1.position.set(0, -2.5, 17.5);
    const leg2 = createLeg(); leg2.position.set(0, -2.5, 2.5);
    leg2.scale.z = -1; // mirror leg2

    robot.add(leg1, leg2);
    addRobotWaist(robot, 0, 5, 10, material);
    addRobotBody(robot, 0, 5, 10, material);
    addRobotShoulders(robot, 0, 20, 10, material);
    addRobotHead(robot, 0, 40, 10, material);
    addRobotArm(robot, -12.5, 27.5, 32.5, material); // braço esquerdo
    addRobotArm(robot, -12.5, 27.5, -12.5, material); // braço direito

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

function updateObjectState(object) {
  object.userData.isMoving = !object.userData.isMoving;
}

function MoveTrailer(direction) {
  if (!directions[direction]) {
    return;
  }
  trailer.position.addScaledVector(directions[direction], speed); // missing clock for delta time
}

function update() {
  
}

/////////////
/* DISPLAY */
/////////////
function render() {
  renderer.render(scene, cameras[currentCamera]);
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
  window.addEventListener("keyup", onKeyUp);
}

/////////////////////
/* ANIMATION CYCLE */
/////////////////////
function animate() {
  update();
  render();
  requestAnimationFrame(animate);
}

////////////////////////////
/* RESIZE WINDOW CALLBACK */
////////////////////////////
function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
    cameras.forEach((camera) => {
      if (camera.isPerspectiveCamera) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
      } else if (camera.isOrthographicCamera) {
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = camera.userData.frustumSize;
        camera.left = (-frustumSize * aspect) / 2;
        camera.right = (frustumSize * aspect) / 2;
        camera.top = frustumSize / 2;
        camera.bottom = -frustumSize / 2;
        camera.updateProjectionMatrix();
      }
    }
  );
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
      switchToCamera(1);
      break;
    case 50: //2
      switchToCamera(2);
      break;
    case 51: //3
      switchToCamera(3);
      break;
    case 52: //4
      switchToCamera(4);
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

    case 37: // left
      updateObjectState(trailer);
      MoveTrailer('left');
      break;
    case 39: // right
      updateObjectState(trailer);
      MoveTrailer('right');
      break;
    case 38: // up
      updateObjectState(trailer);
      MoveTrailer('up');
      break;
    case 40: // down
      updateObjectState(trailer);
      MoveTrailer('down');
      break;
  }
}

///////////////////////
/* KEY UP CALLBACK */
///////////////////////
function onKeyUp(e) {
  switch (e.keyCode) {
    case 37: // left
      updateObjectState(trailer);
      break;
    case 39: // right
      updateObjectState(trailer);
      break;
    case 38: // up
      updateObjectState(trailer);
      break;
    case 40: // down
      updateObjectState(trailer);
      break;
  }
}

init();
animate();