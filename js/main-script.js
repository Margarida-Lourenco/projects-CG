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
let leftLeg, rightLeg, head, leftArm, rightArm, shoulders, body, waist;

let trailer;

// Bounding boxes for collision detection
let robotBox;
let trailerBox;

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

  trailerAttached: false,
  attaching: false,
  attachTarget: new THREE.Vector3(-50, 47.5, 0), // Position of the trailer when attached
  attachSpeed: 1,
  direction: "",
  position: "" // Position of trailer relative to robot (up down behind front)
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

const directions = {
  up: new THREE.Vector3(0, 1, 0),
  down: new THREE.Vector3(0, -1, 0),
  left: new THREE.Vector3(-1, 0, 0),
  right: new THREE.Vector3(1, 0, 0),
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

const debugFlag = true; // Set to true to enable debug helpers

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

function createWaist() {
  const waist = new THREE.Object3D();

  // Parte 1: bumper
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(5, 10, 35), materials.grey);
  bumper.position.set(5, 0, 0);
  waist.add(bumper);

  // Parte 2: base
  const base = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 25), materials.grey);
  base.position.set(-2.5, 0, 0);
  waist.add(base);

  const wheel1 = createWheel();
  const wheel2 = createWheel();
  wheel1.position.set(
    -5,
    -base.geometry.parameters.height / 4,
    (wheel1.geometry.parameters.height + base.geometry.parameters.depth) / 2);

  wheel2.position.set(
    -5,
    -base.geometry.parameters.height / 4,
    - (wheel2.geometry.parameters.height + base.geometry.parameters.depth) / 2);

  waist.add(wheel1, wheel2);
  return waist;
}

function createWheel() {
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 5, 16), materials.black);
  wheel.rotation.x = Math.PI / 2;
  return wheel;
}

function createBody() {
  const body = new THREE.Object3D();
  const box = new THREE.Mesh(new THREE.BoxGeometry(15, 10, 15), materials.red);

  body.add(box);

  for (let i = 0; i < body.children.length; i++) {
    body.children[i].position.y += box.geometry.parameters.height; // metade da altura (10 / 2)
  }
  return body;
}

function createShoulders() {
  const shoulders = new THREE.Object3D();

  const box = new THREE.Mesh(new THREE.BoxGeometry(15, 15, 35), materials.red);
  shoulders.add(box);

  for (let i = 0; i < shoulders.children.length; i++) {
    shoulders.children[i].position.y += box.geometry.parameters.height / 2 + box.geometry.parameters.height; // metade da altura (15 / 2)
  }

  return shoulders;
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
    (lower.geometry.parameters.width - upper.geometry.parameters.width) / 2,
    -(lower.geometry.parameters.height + upper.geometry.parameters.height) / 2,
    0
  );

  const exhausts = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 10, 32), materials.grey);
  exhausts.position.set(
    0,
    (upper.geometry.parameters.height + exhausts.geometry.parameters.height) / 2,
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
  calf.position.y = -(calf.geometry.parameters.height / 2) - thigh.geometry.parameters.height / 2;


  const footGeometry = new THREE.BoxGeometry(15, 5, 15); // width, height, depth
  // Translate the geometry so its local origin is rearwards, aligned with the first 4th of the leg.
  // This is so the pivot point is towards the back of the foot.
  footGeometry.translate(5, 0, 0);

  const foot = new THREE.Mesh(footGeometry, materials.blue);
  foot.name = "foot";
  foot.position.set(- (calf.geometry.parameters.width / 4),
    -(calf.geometry.parameters.height) - (thigh.geometry.parameters.height) + (foot.geometry.parameters.height / 2),
    (calf.geometry.parameters.width / 4));


  const wheel1 = createWheel();
  const wheel2 = createWheel();


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

function createTrailer(x, y, z) {
  trailer = new THREE.Object3D();
  if (debugFlag) {
    trailer.add(new THREE.AxesHelper(10));
  }
  

  let box = new THREE.Mesh(new THREE.BoxGeometry(95, 35, 35), materials.grey);
  let connectPiece = new THREE.Mesh(new THREE.BoxGeometry(15, 5, 15), materials.grey);

  box.position.set(0, 0, 0);
  connectPiece.position.set(
    box.geometry.parameters.width / 2 - connectPiece.geometry.parameters.width,
    - (box.geometry.parameters.height + connectPiece.geometry.parameters.height) / 2,
    0);

  const wheelGap = 2.5; // Gap between the surface of the wheels
  const wheelGroupOffset = 8; // Vertical offset of the wheel group to the end of the trailer

  let twheelRR = createWheel(); // Right rear
  let twheelLR = createWheel(); // Left rear
  let twheelFR = createWheel(); // Right front
  let twheelFL = createWheel(); // Left front

  let wheelSupport = new THREE.Mesh(new THREE.BoxGeometry(
    twheelRR.geometry.parameters.radiusTop * 4 + wheelGap * 3, 
    10, // same as legs on robot
    box.geometry.parameters.depth - twheelFL.geometry.parameters.height * 2
  ), materials.blue);


  twheelRR.position.set(
    -box.geometry.parameters.width / 2 + twheelRR.geometry.parameters.radiusTop + wheelGroupOffset,
    - (box.geometry.parameters.height / 2) - (wheelSupport.geometry.parameters.height) + wheelGap,
    (box.geometry.parameters.depth - twheelRR.geometry.parameters.height) / 2
  );

  twheelLR.position.set(
    -box.geometry.parameters.width / 2 + twheelLR.geometry.parameters.radiusTop + wheelGroupOffset,
    - (box.geometry.parameters.height / 2) - (wheelSupport.geometry.parameters.height) + wheelGap,
    - (box.geometry.parameters.depth - twheelLR.geometry.parameters.height) / 2
  );

  twheelFR.position.set(
    -box.geometry.parameters.width / 2 + twheelFR.geometry.parameters.radiusTop + wheelGroupOffset + 2 * twheelFR.geometry.parameters.radiusTop + wheelGap,
    - (box.geometry.parameters.height / 2) - (wheelSupport.geometry.parameters.height) + wheelGap,
    (box.geometry.parameters.depth - twheelFR.geometry.parameters.height) / 2
  );

  twheelFL.position.set(
    -box.geometry.parameters.width / 2 + twheelFL.geometry.parameters.radiusTop + wheelGroupOffset + 2 * twheelFL.geometry.parameters.radiusTop + wheelGap,
    - (box.geometry.parameters.height / 2) - (wheelSupport.geometry.parameters.height) + wheelGap,
    - (box.geometry.parameters.depth - twheelFL.geometry.parameters.height) / 2
  );

  wheelSupport.position.set(
    -box.geometry.parameters.width / 2 + wheelGroupOffset + 2 * twheelFL.geometry.parameters.radiusTop + wheelGap / 2,
    - (box.geometry.parameters.height / 2 + wheelSupport.geometry.parameters.height / 2),
  );

  trailer.add(box, twheelRR, twheelLR, twheelFL, twheelFR, connectPiece, wheelSupport);

  trailer.position.set(x, y, z);

  trailerBox = new THREE.Box3().setFromObject(trailer);
  if (debugFlag) {
    const boxHelper = new THREE.Box3Helper(trailerBox, 0xffff00);
    scene.add(boxHelper);
  }
  scene.add(trailer);
}

function createRobot(x, y, z) {
  robot = new THREE.Object3D();

  leftLeg = createLeg();
  leftLeg.position.set(-2.5, 25, 7.5);

  rightLeg = createLeg();
  rightLeg.position.set(-2.5, 25, -7.5);
  rightLeg.scale.z = -1;

  waist = createWaist();
  waist.position.set(0, 25, 0);

  body = createBody();
  body.position.set(0, 25, 0);

  shoulders = createShoulders();
  shoulders.position.set(0, 25, 0);

  head = createHead();
  head.position.set(0, 50, 0);

  leftArm = createArm();
  leftArm.position.set(-12.5, 47.5, 22.5);

  rightArm = createArm();
  rightArm.position.set(-12.5, 47.5, -22.5);

  robot.add(head, leftLeg, rightLeg, leftArm, rightArm, shoulders, body, waist);
  scene.add(robot);

  robot.position.set(x, y, z);

  robotBox = new THREE.Box3().setFromObject(robot);

  if (debugFlag) {
    const boxHelper = new THREE.Box3Helper(robotBox, 0xffff00);
    scene.add(boxHelper);
  }
}

//////////////////////
/* CHECK COLLISIONS */
//////////////////////

function areLegsAtMaxRotation() {
  const rotDirection = state.legsForward ? rotationSpeed : -rotationSpeed;
  const targetRot = leftLeg.rotation.z + rotDirection;

  if (rotDirection > 0) {
    return targetRot >= maxLegRotation;
  } else {
    return targetRot <= minLegRotation;
  }
}

function areFeetAtMaxRotation() {

  const rotDirection = state.feetForward ? rotationSpeed : -rotationSpeed;
  const targetRot = leftLeg.getObjectByName("foot").rotation.z + rotDirection;
  if (rotDirection > 0) {
    return targetRot >= maxFootRotation;
  } else {
    return targetRot <= minFootRotation;
  }
}

function areArmsAtMaxTranslation() {
  const targetTranslation = state.armTranslation + armTranslationSpeed;
  return targetTranslation >= armTranslationLimit;
}

function isHeadatMaxRotation() {
  const rotDirection = state.headForward ? -rotationSpeed : rotationSpeed;
  const targetRot = head.rotation.z + rotDirection;
  if (rotDirection > 0) {
    return targetRot >= maxHeadRotation;
  } else {
    return targetRot <= minHeadRotation;
  }
}

function robotOnTruckForm() {
  return areLegsAtMaxRotation() &&
    areFeetAtMaxRotation() &&
    isHeadatMaxRotation() &&
    areArmsAtMaxTranslation()
}

function isColliding() {
  const dir = collisionSide();
  return trailerBox.min.x < robotBox.max.x &&
    trailerBox.max.x > robotBox.min.x &&
    trailerBox.min.y < robotBox.max.y &&
    trailerBox.max.y > robotBox.min.y &&
    trailerBox.min.z < robotBox.max.z &&
    trailerBox.max.z > robotBox.min.z;
}

// what side of robot is trailer on, as a tuple representing sign of delta on each axis
function collisionSide() {
  if (trailerBox.max.x <= robotBox.min.x && trailerBox.max.y <= robotBox.max.y && trailerBox.min.y >= robotBox.min.y) {
    return [-1, 0]; // Behind
  }
  if (trailerBox.max.y <= robotBox.max.y && trailerBox.max.x < robotBox.min.x) {
    return [-1, -1]; // Diagonally bellow
  }
  if (trailerBox.max.y > robotBox.max.y && trailerBox.max.x < robotBox.min.x) {
    return [-1, 1]; // Diagonally above
  }
  if (trailerBox.max.y < robotBox.min.y) {
    return [0, -1]; // Below
  }
  if (trailerBox.min.y > robotBox.max.y) {
    return [0, 1]; // Above
  }
  if (trailerBox.min.x >= robotBox.max.x) {
    return [1, 0]; // Front
  }

  return;
}

///////////////////////
/* HANDLE COLLISIONS */
///////////////////////

function handleCollisions() {
  let collision = isColliding();
  // Starts the attachment animation
  if (!state.trailerAttached && robotOnTruckForm() && collision && !state.attaching) {
    console.log("Collision detected! Starting attachment animation.");
    state.attaching = true;
  }

  // detaches the trailer
  else if (state.trailerAttached && !collision) {
    console.log("Detached from trailer.");
    state.trailerAttached = false;
    state.attaching = false;
  }

  // Collision when robot is not in truck form
  else if (!state.trailerAttached && collision) {
    if (state.direction === "up") {
      trailer.position.addScaledVector(directions.down, trailerSpeed);
    }
    if (state.direction === "down") {
      trailer.position.addScaledVector(directions.up, trailerSpeed);
    }
    if (state.direction === "left") {
      trailer.position.addScaledVector(directions.right, trailerSpeed);
    }
    if (state.direction === "right") {
      trailer.position.addScaledVector(directions.left, trailerSpeed);
    }
  }

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

function LegRotation() {
  if (state.legsForward !== state.legsBackward) {
    const rotDirection = state.legsForward ? rotationSpeed : -rotationSpeed;
    apply2ElementRotation(leftLeg, rightLeg, rotDirection, minLegRotation, maxLegRotation);
  }
}

function footRotation(foot1, foot2) {
  if (state.feetBackward !== state.feetForward) {
    const rotDirection = state.feetForward ? rotationSpeed : -rotationSpeed;
    apply2ElementRotation(foot1, foot2, rotDirection, minFootRotation, maxFootRotation);
  }
}

function headRetraction() {
  if (state.headBackward !== state.headForward) {
    const rotDirection = state.headForward ? -rotationSpeed : rotationSpeed;
    if (head.rotation.z + rotDirection > minHeadRotation && head.rotation.z + rotDirection < maxHeadRotation) {
      head.rotation.z += rotDirection;
    }
  }
}

function armTranslation() {
  if (state.armOutward !== state.armInward) {
    const moveOut = state.armOutward && state.armTranslation < armTranslationLimit;
    const moveIn = state.armInward && state.armTranslation > 0;

    const direction = moveOut ? 1 : (moveIn ? -1 : 0);

    if (direction) {
      state.armTranslation += direction * armTranslationSpeed;
      leftArm.position.z -= direction * armTranslationSpeed;
      rightArm.position.z += direction * armTranslationSpeed;
    }
  }
}

function update() {

  updateBoundingBoxes();

  handleCollisions();

  let side = collisionSide();

  if (side != undefined) {
    state.position = side;
  }
  console.log("State.position" + state.position + "side" + side);

  // Trailer movement
  if (state.attaching) {
    const direction = new THREE.Vector3().subVectors(state.attachTarget, trailer.position);
    const distance = direction.length();

    if (distance < state.attachSpeed) {
      trailer.position.copy(state.attachTarget);
      state.attaching = false;
      state.trailerAttached = true;
      state.alligned = false;
    } else {
      if ((state.position[0] != -1 || state.position[1] != 0) && !state.alligned) { // Trailer is not behind the robot
        if (state.position[0] === 1) { // Trailer is in front of the robot
          trailer.position.addScaledVector(directions.up.normalize(), state.attachSpeed / 2);
          console.log("Moving up");
        } else
        if (state.position[1] != 0) { // Trailer is not alligned with robot on the Y axis
          if (state.position[0] != -1) { // Trailer is not aligned with the robot on the X axis
            trailer.position.addScaledVector(directions.left.normalize(), state.attachSpeed / 2);
            console.log("Moving left");
          } else
          if (state.position[0] === -1) { // Trailer is somewhere behind the robot
            trailer.position.addScaledVector(directions.down.normalize(), state.attachSpeed * state.position[1] / 2);
            console.log("Moving vertically");
          }
        }
      } else {
        state.alligned = true;
        console.log("Moving towards the robot");
        direction.normalize();
        trailer.position.addScaledVector(direction, state.attachSpeed);
      }
    }

    return;
  }
  
  // Trailer's movements
  if (!state.trailerAttached) {
    // Trailer movement when not attached
    if (state.up) {
      trailer.position.addScaledVector(directions.up, trailerSpeed);
      state.direction = "up";
    }
    if (state.down) {
      trailer.position.addScaledVector(directions.down, trailerSpeed);
      state.direction = "down";
    }
    if (state.left) {
      trailer.position.addScaledVector(directions.left, trailerSpeed);
      state.direction = "left";
    }
    if (state.right) {
      trailer.position.addScaledVector(directions.right, trailerSpeed);
      state.direction = "right";
    }
  } else {
    // Trailer movement when attached
    if (state.left) {
      trailer.position.addScaledVector(directions.left, trailerSpeed);
      state.direction = "left";
    }
  }

  if (!robot) {
    return;
  }

  // Leg rotation
  if (leftLeg && rightLeg) {
    LegRotation();
  }

  // Foot rotation
  const foot1 = leftLeg.getObjectByName("foot");
  const foot2 = rightLeg.getObjectByName("foot");
  if (foot1 && foot2) {
    footRotation(foot1, foot2);
  }

  // Head retraction
  if (head) {
    headRetraction();
  }

  // Arm translation
  if (leftArm && rightArm) {
    armTranslation();
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

///////////////////////
/* KEY DOWN CALLBACK */
///////////////////////

function swapVisualizationMode() {
  for (const material of Object.values(materials)) {
    material.wireframe = !material.wireframe;
  }
}

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