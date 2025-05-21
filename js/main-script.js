import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import * as Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js"; 

//////////////////////
/* GLOBAL VARIABLES */
//////////////////////

let cameras = [];
let currentCamera = 3; // Default to perspective camera
let scene;
let renderer;

let robot;
let trailer;
let helper;

let directions = {
  up: new THREE.Vector3(0, 1, 0),
  down: new THREE.Vector3(0, -1, 0),
  left: new THREE.Vector3(-1, 0, 0),
  right: new THREE.Vector3(1, 0, 0),
};

let state = {
  up: false,
  down: false,
  left: false,
  right: false,
  legsForward: false,
  legsBackward: false,
  feetBackward: false,
  feetForward: false, 
  armOutward: false, 
  armInward: false,  
  armTranslation: 0, 
  headBackward: false,
  headForward: false,
};

///////////////
/* CONSTANTS */
///////////////

const materials = {
  black: new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true }),
  blue: new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true }),
  red: new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true }),
  grey: new THREE.MeshBasicMaterial({ color: 0x9e948b, wireframe: true }),
  yellow: new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true }),
};

const rotationSpeed = Math.PI / 288;
const trailerSpeed = 0.5;
const armTranslationSpeed = 0.08; 

const maxLegRotation = 0; 
const minLegRotation = -Math.PI / 2;

const maxFootRotation = 0; 
const minFootRotation = -Math.PI / 2;
const armTranslationLimit = 10; 
const maxHeadRotation = Math.PI / 2;
const minHeadRotation = 0;

let robotBox;
let trailerBox;

/////////////////////
/* CREATE SCENE(S) */
/////////////////////
function createScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfffff0);

  createRobot(20, 0, 0);
  createTrailer(-70, 47.5, 0);
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
  persCamera.position.set(80, 80, 80);
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
  orthoCamera3.position.set(0, 80, 0);
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

////////////////////////
/* CREATE OBJECT3D(S) */
////////////////////////

function addRobotWaist(obj, x, y, z, material) {
    const geometry = new THREE.BoxGeometry(5, 10, 35);
    const bumper = new THREE.Mesh(geometry, material);
    bumper.position.set(x+5, y, z);
    obj.add(bumper);

    const geometry2 = new THREE.BoxGeometry(10, 10, 25);
    const base = new THREE.Mesh(geometry2, material);
    base.position.set(x-2.5, y, z);

    obj.add(base);

    const wheel1 = addWheel();
    const wheel2 = addWheel();
    wheel1.position.set(
      -5, 
      25 - base.geometry.parameters.height / 4, 
      (wheel1.geometry.parameters.height + base.geometry.parameters.depth) / 2);

    wheel2.position.set(
      -5, 
      25 - base.geometry.parameters.height / 4,
      - (wheel2.geometry.parameters.height + base.geometry.parameters.depth) / 2);
    
    obj.add(wheel1, wheel2);
}

function addWheel(){
    const geometry = new THREE.CylinderGeometry(6, 6, 5, 16); // radiusTop, radiusBottom, height, radialSegments
    const wheel = new THREE.Mesh(geometry, materials.black);
    wheel.rotation.x = Math.PI / 2;
    return wheel;
}

function addRobotBody(obj, x, y, z, material) {
    const geometry = new THREE.BoxGeometry(15, 10, 15);
    const body = new THREE.Mesh(geometry, material);
    body.position.set(x, y, z);
    obj.add(body);
}

function addRobotShoulders(obj, x, y, z, material) {
    const geometry = new THREE.BoxGeometry(15, 15, 35);
    const shoulders = new THREE.Mesh(geometry, material);
    shoulders.position.set(x, y, z);
    obj.add(shoulders);
}

function createHead() {
      const head = new THREE.Object3D();

      const face = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 10, 32), materials.blue);

      const antennaR = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 5, 32), materials.blue);
      antennaR.position.set(
        0,
        (face.geometry.parameters.height + antennaR.geometry.parameters.height) / 2,
        4.5
      );

      const antennaL = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 5, 32), materials.blue);
      antennaL.position.set(
        0,
        (face.geometry.parameters.height + antennaL.geometry.parameters.height) / 2,
        -4.5
      );

      const eyeR = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2.5), materials.yellow);
      eyeR.position.set(
        face.geometry.parameters.radiusTop - eyeR.geometry.parameters.width / 2, // Face of eye intersects with tangent of face
        (face.geometry.parameters.height / 6), // 2/3rds of face height
        -eyeR.geometry.parameters.depth //Eyes have an eye width between them
      );

      const eyeL = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2.5), materials.yellow);
      eyeL.position.set(
        face.geometry.parameters.radiusTop - eyeL.geometry.parameters.width / 2,
        (face.geometry.parameters.height / 6),
        eyeR.geometry.parameters.depth
      );

      head.add(face, antennaL, antennaR, eyeL, eyeR);

      // Shift the entire assembly upwards along local Y.
      // This effectively lowers the pivot for rotation to the bottom of the face.
      for (let i = 0; i < head.children.length; i++) {
        head.children[i].position.y += face.geometry.parameters.height;
      }

      return head;
}

// Root of arm is middle of upper arm
function createArm() {
    const arm = new THREE.Object3D();

    const upper = new THREE.Mesh(new THREE.BoxGeometry(10, 15, 10), materials.red);
    upper.position.set(0, 0, 0);

    const lower = new THREE.Mesh(new THREE.BoxGeometry(25, 10, 10), materials.red);
    lower.position.set(
      (lower.geometry.parameters.width - upper.geometry.parameters.width )/ 2,
      -(lower.geometry.parameters.height + upper.geometry.parameters.height) / 2 ,
      0
    );

    const exhausts = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 10, 32), materials.grey);
    exhausts.position.set(
      0, 
      (upper.geometry.parameters.height +exhausts.geometry.parameters.height) / 2, 
      0);

    arm.add(upper, lower, exhausts);

    return arm;
}


function createLeg() {
  const leg = new THREE.Object3D(); 
  const Yoffset = -10; // Offset to position the leg pivot corectly 
  const wheelGroupOffset = -2; // Vertical offset of the wheel group
  const wheelGap = 2.5; // Gap between the surface of the wheels

  const thigh = new THREE.Mesh(
    new THREE.BoxGeometry(7.5, 10, 7.5), materials.grey);

  const calf = new THREE.Mesh(
    new THREE.BoxGeometry(10, 35, 10), materials.blue);
  calf.position.y =  -(calf.geometry.parameters.height / 2) - thigh.geometry.parameters.height / 2;


  const footGeometry = new THREE.BoxGeometry(15, 5, 15); // width, height, depth
  // Translate the geometry so its local origin is rearwards, aligned with the first 4th of the leg.
  // This is so the pivot point is towards the back of the foot.
  footGeometry.translate(5, 0, 0);

  const foot = new THREE.Mesh(footGeometry, materials.blue);
  foot.name = "foot";
  foot.position.set( - (calf.geometry.parameters.width / 4), 
    -(calf.geometry.parameters.height) - (thigh.geometry.parameters.height) + (foot.geometry.parameters.height / 2), 
      (calf.geometry.parameters.width / 4));

  
  const wheel1 = addWheel();
  const wheel2 = addWheel();


  wheel1.position.set(
    calf.geometry.parameters.depth / 4, 
    calf.position.y + wheelGroupOffset - ((wheelGap / 2) + wheel2.geometry.parameters.radiusTop), 
    (calf.geometry.parameters.width + wheel1.geometry.parameters.height) / 2
  );
  wheel2.position.set(
    calf.geometry.parameters.depth / 4, 
    calf.position.y + wheelGroupOffset + ((wheelGap / 2) + wheel2.geometry.parameters.radiusTop), 
    (calf.geometry.parameters.width + wheel1.geometry.parameters.height) / 2);

  leg.add(thigh, calf, foot, wheel1, wheel2);

  // To apply the offset necessary to pivot arround the top of the thigh
  for (let i = 0; i < leg.children.length; i++) {
    leg.children[i].position.y += Yoffset;
  }

  return leg;
}

function createTrailer(x, y, z){
  trailer = new THREE.Object3D();
  trailer.add(new THREE.AxesHelper(10));

  let box = new THREE.Mesh(new THREE.BoxGeometry(95, 35, 35), materials.grey);
  let connectPiece = new THREE.Mesh(new THREE.BoxGeometry(15, 5, 15), materials.grey);
  let wheelSupportL = new THREE.Mesh(new THREE.BoxGeometry(26.5, 10, 5), materials.blue);
  let wheelSupportR = new THREE.Mesh(new THREE.BoxGeometry(26.5, 10, 5), materials.blue);

  box.position.set(0, 0, 0);
  connectPiece.position.set(
    box.geometry.parameters.width / 2 - connectPiece.geometry.parameters.width,  
    - (box.geometry.parameters.height + connectPiece.geometry.parameters.height) / 2, 
    0);
  
  const wheelGap = 2.5; // Gap between the surface of the wheels
  const wheelGroupOffset = 8; // Vertical offset of the wheel group to the end of the trailer
  
  let twheelRR = addWheel(); // Right rear
  let twheelLR = addWheel(); // Left rear
  let twheelFR = addWheel(); // Right front
  let twheelFL = addWheel(); // Left front
  
  twheelRR.position.set(
    -box.geometry.parameters.width / 2 + twheelRR.geometry.parameters.radiusTop + wheelGroupOffset,
    - (box.geometry.parameters.height / 2) - (wheelSupportR.geometry.parameters.height) + wheelGap,
    (box.geometry.parameters.depth - twheelRR.geometry.parameters.height) / 2
  );

  twheelLR.position.set(
    -box.geometry.parameters.width / 2 + twheelLR.geometry.parameters.radiusTop + wheelGroupOffset,
    - (box.geometry.parameters.height / 2) - (wheelSupportL.geometry.parameters.height) + wheelGap,
    - (box.geometry.parameters.depth - twheelLR.geometry.parameters.height) / 2
  );

  twheelFR.position.set(
    -box.geometry.parameters.width / 2 + twheelFR.geometry.parameters.radiusTop + wheelGroupOffset + 2*twheelFR.geometry.parameters.radiusTop + wheelGap,
    - (box.geometry.parameters.height / 2) - (wheelSupportR.geometry.parameters.height) + wheelGap,
    (box.geometry.parameters.depth - twheelFR.geometry.parameters.height) / 2
  );

  twheelFL.position.set(
    -box.geometry.parameters.width / 2 + twheelFL.geometry.parameters.radiusTop + wheelGroupOffset + 2*twheelFL.geometry.parameters.radiusTop + wheelGap,
    - (box.geometry.parameters.height / 2) - (wheelSupportL.geometry.parameters.height) + wheelGap,
    - (box.geometry.parameters.depth - twheelFL.geometry.parameters.height) / 2
  );

  wheelSupportL.position.set(
    -box.geometry.parameters.width / 2 + wheelSupportL.geometry.parameters.width / 2 + wheelGroupOffset,
    - (box.geometry.parameters.height / 2 + wheelSupportL.geometry.parameters.height / 2),
    (box.geometry.parameters.depth - wheelSupportL.geometry.parameters.height) / 2
  );

  wheelSupportR.position.set(
    -box.geometry.parameters.width / 2 + wheelSupportR.geometry.parameters.width / 2 + wheelGroupOffset,
    - (box.geometry.parameters.height / 2 + wheelSupportR.geometry.parameters.height / 2),
    - (box.geometry.parameters.depth - wheelSupportR.geometry.parameters.height) / 2
  );

  trailer.add(box, twheelRR, twheelLR, twheelFL, twheelFR, connectPiece, wheelSupportL, wheelSupportR);

  trailer.position.set(x, y, z);
  
  trailerBox = new THREE.Box3().setFromObject(trailer);
  
  const boxHelper = new THREE.Box3Helper(trailerBox, 0xffff00);
  scene.add(boxHelper);
  scene.add(trailer);
}


function createRobot(x, y, z) {
    robot = new THREE.Object3D();
    robot.add(new THREE.AxesHelper(10));
    robot.name = "robot";
    
    const leg1 = createLeg();
    leg1.name = "leg1";
    leg1.position.set(-2.5, 25, 7.5);

    const leg2 = createLeg();
    leg2.name = "leg2";
    leg2.position.set(-2.5, 25, -7.5);
    leg2.scale.z = -1;

    addRobotWaist(robot, 0, 25, 0, materials.grey);
    addRobotBody(robot, 0, 35, 0, materials.red);
    addRobotShoulders(robot, 0, 47.5, 0, materials.red);

    const head = createHead();
    head.name = "head";
    head.position.set(0, 50, 0);

    const leftArm = createArm(); // braço esquerdo
    leftArm.name = "leftArm";
    leftArm.position.set(-12.5, 47.5, 22.5);
    
    const rightArm = createArm(); // braço direito
    rightArm.name = "rightArm";
    rightArm.position.set(-12.5, 47.5, -22.5);

    robot.add(head, leg1, leg2, leftArm, rightArm);
    scene.add(robot);

    robot.position.set(x, y, z);

    robotBox = new THREE.Box3().setFromObject(robot);

    const boxHelper = new THREE.Box3Helper(robotBox, 0xffff00);
    scene.add(boxHelper);
}

//////////////////////
/* CHECK COLLISIONS */
//////////////////////
function checkCollisions() {
  return trailerBox.min.x < robotBox.max.x &&
         trailerBox.max.x > robotBox.min.x &&
         trailerBox.min.y < robotBox.max.y &&
         trailerBox.max.y > robotBox.min.y &&
         trailerBox.min.z < robotBox.max.z &&
         trailerBox.max.z > robotBox.min.z;
}

///////////////////////
/* HANDLE COLLISIONS */
///////////////////////
function handleCollisions() {
  const leg1 = robot.getObjectByName("leg1");
  const leg2 = robot.getObjectByName("leg2");
  const foot1 = leg1.getObjectByName("foot");
  const foot2 = leg2.getObjectByName("foot");
  const head = robot.getObjectByName("head");
  const leftArm = robot.getObjectByName("leftArm");
  const rightArm = robot.getObjectByName("rightArm");

  LegRotation(leg1, leg2);
  footRotation(foot1, foot2);
  headRetraction(head);
  armTranslation(leftArm, rightArm);
  

  
}

////////////
/* UPDATE */
////////////

function updateBoundingBoxes() {
  robotBox.setFromObject(robot);
  trailerBox.setFromObject(trailer);
}

function apply2ElementRotation(element1, element2, rotDirection, minRot, maxRot) {
  if (element1.rotation.z + rotDirection > minRot && element1.rotation.z + rotDirection < maxRot) {
    element1.rotation.z += rotDirection;
    element2.rotation.z += rotDirection;
  }
}

function LegRotation(leg1, leg2) {
  const rotDirection = state.legsForward ? rotationSpeed : -rotationSpeed;
  apply2ElementRotation(leg1, leg2, rotDirection, minLegRotation, maxLegRotation);
}

function footRotation(foot1, foot2) {
  const rotDirection = state.feetForward ? rotationSpeed : -rotationSpeed;
  apply2ElementRotation(foot1, foot2, rotDirection, minFootRotation, maxFootRotation);
}

function headRetraction(head) {
  const rotDirection = state.headForward ? -rotationSpeed : rotationSpeed;
  if (head.rotation.z + rotDirection > minHeadRotation && head.rotation.z + rotDirection < maxHeadRotation) {
    head.rotation.z += rotDirection;
  }
}

function armTranslation(leftArm, rightArm) {
    if (state.armOutward && state.armTranslation < armTranslationLimit) {
      state.armTranslation += armTranslationSpeed;
      leftArm.position.z -= armTranslationSpeed;
      rightArm.position.z += armTranslationSpeed;
    }
    if (state.armInward && state.armTranslation > 0) {
      state.armTranslation -= armTranslationSpeed;
      leftArm.position.z += armTranslationSpeed;
      rightArm.position.z -= armTranslationSpeed;
    }
}


function update() {
  updateBoundingBoxes();

  if (state.up) {
    trailer.position.addScaledVector(directions.up, trailerSpeed);
  }
  if (state.down) {
    trailer.position.addScaledVector(directions.down, trailerSpeed);
  }
  if (state.left) {
    trailer.position.addScaledVector(directions.left, trailerSpeed);
  }
  if (state.right) {
    trailer.position.addScaledVector(directions.right, trailerSpeed);
  }

  const robotObj = scene.getObjectByName("robot"); // Renamed to avoid conflict with global 'robot'
  if (!robotObj) {
    return; // No robot, no more updates needed for it
  }

  const leg1 = robot.getObjectByName("leg1");
  const leg2 = robot.getObjectByName("leg2");
  if (!leg1 || !leg2) {
    return;
  }

  if (state.legsForward !== state.legsBackward) {
    LegRotation(leg1, leg2);
  }

  // Foot rotation
  const foot1 = leg1.getObjectByName("foot");
  const foot2 = leg2.getObjectByName("foot");
  if (foot1 && foot2) {
    if (state.feetBackward !== state.feetForward) {
    footRotation(foot1, foot2);
    }
  }

  // Head retraction
  const head = robotObj.getObjectByName("head");
  if (head) {
    if (state.headBackward !== state.headForward) {
      headRetraction(head);
    }
  }

  // Arm translation
  const leftArm = robotObj.getObjectByName("leftArm");
  const rightArm = robotObj.getObjectByName("rightArm");

  if (leftArm && rightArm) {
    if (state.armOutward !== state.armInward) {
    armTranslation(leftArm, rightArm);
    }
  }
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
  
  if (checkCollisions()) {
    handleCollisions();
  }

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
  for (const material of Object.values(materials)) {
    material.wireframe = !material.wireframe;
  }
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
      state.feetBackward = true; 
      break;
    case 81: //Q
    case 113: //q
      state.feetForward = true; 
      break;
    case 83: //S
    case 115: //s
      state.legsBackward = true;
      break;
    case 87: //W
    case 119: //w
      state.legsForward = true;
      break;
    case 68: //D
    case 100: //d
      state.armOutward = true;
      break;
    case 69: //E
    case 101: //e
      state.armInward = true;
      break;
    case 70: //F
    case 102: //f
      state.headBackward = true;
      break;
    case 82: //R
    case 114: //r
      state.headForward = true;
      // Alter delta3 angle
      break;

    case 37: // left
      state.left = true;
      break;
    case 39: // right
      state.right = true;
      break;
    case 38: // up
      state.up = true;
      break;
    case 40: // down
      state.down = true;
      break;
  }
}

///////////////////////
/* KEY UP CALLBACK */
///////////////////////
function onKeyUp(e) {
  switch (e.keyCode) {
    case 37: // left
      state.left = false;
      break;
    case 39: // right
      state.right = false;
      break;
    case 38: // up
      state.up = false;
      break;
    case 40: // down
      state.down = false;
      break;
    case 65: //A
    case 97: //a
      state.feetBackward = false;
      break;
    case 81: //Q
    case 113: //q
      state.feetForward = false;
      break;
    case 83: //S
    case 115: //s
      state.legsBackward = false;
      break;
    case 87: //W
    case 119: //w
      state.legsForward = false;
      break;
    case 68: //D
    case 100: //d
      state.armOutward = false;
      break;
    case 69: //E
    case 101: //e
      state.armInward = false;
      break;

    case 70: //F
    case 102: //f
      state.headBackward = false;
      break;
    case 82: //R
    case 114: //r
      state.headForward = false;
      break;
  }
}

init();
animate();