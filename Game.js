import * as THREE from
  "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 20, 65);

// CAMERA
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

camera.position.set(0, 8, 12);

// RENDERER
const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 2)
);

document.body.appendChild(renderer.domElement);

// LIGHTING
scene.add(new THREE.HemisphereLight(
  0xffffff, 0x667755, 2
));

const sun = new THREE.DirectionalLight(
  0xffffff, 2
);

sun.position.set(20, 40, 10);
scene.add(sun);

// BLOCK TYPES
const materials = {
  grass: new THREE.MeshLambertMaterial({
    color: 0x55aa33
  }),

  dirt: new THREE.MeshLambertMaterial({
    color: 0x80502a
  }),

  stone: new THREE.MeshLambertMaterial({
    color: 0x888888
  }),

  wood: new THREE.MeshLambertMaterial({
    color: 0x98602e
  })
};

const blockTypes = [
  "grass", "dirt", "stone", "wood"
];

const geometry = new THREE.BoxGeometry(1, 1, 1);

// WORLD
const blocks = new Map();

function key(x, y, z) {
  return `${x},${y},${z}`;
}

function addBlock(x, y, z, type) {
  const id = key(x, y, z);

  if (blocks.has(id)) return;

  const mesh = new THREE.Mesh(
    geometry,
    materials[type]
  );

  mesh.position.set(x, y, z);
  mesh.userData.type = type;

  scene.add(mesh);
  blocks.set(id, mesh);
}

function removeBlock(mesh) {
  const p = mesh.position;
  blocks.delete(key(p.x, p.y, p.z));
  scene.remove(mesh);
}

// TERRAIN GENERATION
const WORLD_SIZE = 24;

function terrainHeight(x, z) {
  return Math.floor(
    2 +
    Math.sin(x * 0.3) * 1.5 +
    Math.cos(z * 0.3) * 1.5
  );
}

for (let x = -WORLD_SIZE / 2; x < WORLD_SIZE / 2; x++) {
  for (let z = -WORLD_SIZE / 2; z < WORLD_SIZE / 2; z++) {

    const height = terrainHeight(x, z);

    for (let y = -3; y <= height; y++) {
      let type = "stone";

      if (y === height) {
        type = "grass";
      } else if (y >= height - 2) {
        type = "dirt";
      }

      addBlock(x, y, z, type);
    }
  }
}

// PLAYER
const player = {
  x: 0,
  y: 9,
  z: 8,
  velocityY: 0,
  grounded: false
};

let yaw = 0;
let pitch = 0;

const keys = {};

const SPEED = 7;
const GRAVITY = 20;
const JUMP = 8;

// INPUT
document.addEventListener("keydown", (e) => {
  keys[e.code] = true;

  if (e.code.startsWith("Digit")) {
    const number = Number(e.code.slice(5));

    if (number >= 1 && number <= 4) {
      selectedBlock = blockTypes[number - 1];
      updateHotbar();
    }
  }
});

document.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

// MOUSE
const overlay = document.getElementById("overlay");

document.getElementById("start").onclick = () => {
  renderer.domElement.requestPointerLock();
};

document.addEventListener("pointerlockchange", () => {
  overlay.style.display =
    document.pointerLockElement === renderer.domElement
      ? "none"
      : "flex";
});

document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement !== renderer.domElement) {
    return;
  }

  yaw -= e.movementX * 0.002;
  pitch -= e.movementY * 0.002;

  pitch = Math.max(
    -Math.PI / 2,
    Math.min(Math.PI / 2, pitch)
  );
});

// BLOCK INTERACTION
const raycaster = new THREE.Raycaster();

let selectedBlock = "grass";

function getTarget() {
  raycaster.setFromCamera(
    new THREE.Vector2(0, 0),
    camera
  );

  const hits = raycaster.intersectObjects(
    [...blocks.values()]
  );

  return hits.length && hits[0].distance < 6
    ? hits[0]
    : null;
}

renderer.domElement.addEventListener("contextmenu", e => {
  e.preventDefault();
});

renderer.domElement.addEventListener("mousedown", (e) => {
  if (document.pointerLockElement !== renderer.domElement) {
    return;
  }

  const hit = getTarget();

  if (!hit) return;

  if (e.button === 0) {
    // BREAK BLOCK
    removeBlock(hit.object);
  }

  if (e.button === 2) {
    // PLACE BLOCK
    const normal = hit.face.normal;

    const p = hit.object.position;

    const x = p.x + Math.round(normal.x);
    const y = p.y + Math.round(normal.y);
    const z = p.z + Math.round(normal.z);

    addBlock(x, y, z, selectedBlock);
  }
});

// HOTBAR
function updateHotbar() {
  const hotbar = document.getElementById("hotbar");

  hotbar.innerHTML = "";

  blockTypes.forEach((type, i) => {
    const slot = document.createElement("div");

    slot.className =
      "slot " + (selectedBlock === type ? "selected" : "");

    slot.textContent = `${i + 1}: ${type}`;

    hotbar.appendChild(slot);
  });
}

updateHotbar();

// MOVEMENT AND COLLISION WITH TERRAIN
function updatePlayer(dt) {
  const forward = new THREE.Vector3(
    -Math.sin(yaw), 0, -Math.cos(yaw)
  );

  const right = new THREE.Vector3(
    Math.cos(yaw), 0, -Math.sin(yaw)
  );

  const movement = new THREE.Vector3();

  if (keys.KeyW) movement.add(forward);
  if (keys.KeyS) movement.sub(forward);
  if (keys.KeyD) movement.add(right);
  if (keys.KeyA) movement.sub(right);

  if (movement.lengthSq() > 0) {
    movement.normalize();

    player.x += movement.x * SPEED * dt;
    player.z += movement.z * SPEED * dt;
  }

  // Keep player inside world
  player.x = THREE.MathUtils.clamp(player.x, -11, 11);
  player.z = THREE.MathUtils.clamp(player.z, -11, 11);

  // Jump
  if (keys.Space && player.grounded) {
    player.velocityY = JUMP;
    player.grounded = false;
  }

  // Gravity
  player.velocityY -= GRAVITY * dt;
  player.y += player.velocityY * dt;

  // Ground collision
  const ground = terrainHeight(
    Math.round(player.x),
    Math.round(player.z)
  ) + 1.8;

  if (player.y <= ground) {
    player.y = ground;
    player.velocityY = 0;
    player.grounded = true;
  }

  camera.position.set(
    player.x,
    player.y,
    player.z
  );

  camera.rotation.order = "YXZ";
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}

// GAME LOOP
let previousTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();

  const dt = Math.min(
    (now - previousTime) / 1000,
    0.05
  );

  previousTime = now;

  updatePlayer(dt);

  renderer.render(scene, camera);
}

animate();

// RESIZE
window.addEventListener("resize", () => {
  camera.aspect =
    window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );
});
