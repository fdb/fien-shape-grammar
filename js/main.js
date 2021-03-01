let instructions = `reset
translate -8 0 -8
plane 16 16

reset
translate -4 2 -4
plane 8 8

reset
translate -2 4 -2
plane 4 4

reset
translate -1 6 -1
plane 2 2

extrude 2
`;

document.getElementById("code").textContent = instructions;

const MAX_WIDTH = 256;
const MAX_HEIGHT = 256;
const MAX_DEPTH = 256;

const volume = new Uint8Array(MAX_WIDTH * MAX_HEIGHT * MAX_DEPTH);

const vset = (x, y, z) => {
  if (x < 0 || x >= MAX_WIDTH) return;
  if (y < 0 || y >= MAX_HEIGHT) return;
  if (z < 0 || z >= MAX_DEPTH) return;
  volume[x * (MAX_HEIGHT * MAX_DEPTH) + y * MAX_DEPTH + z] = 1;
};
const vunset = (x, y, z) => {
  if (x < 0 || x >= MAX_WIDTH) return;
  if (y < 0 || y >= MAX_HEIGHT) return;
  if (z < 0 || z >= MAX_DEPTH) return;
  volume[x * (MAX_HEIGHT * MAX_DEPTH) + y * MAX_DEPTH + z] = 0;
};

const vfull = (x, y, z) => {
  if (x < 0 || x >= MAX_WIDTH) return false;
  if (y < 0 || y >= MAX_HEIGHT) return false;
  if (z < 0 || z >= MAX_DEPTH) return false;
  return volume[x * (MAX_HEIGHT * MAX_DEPTH) + y * MAX_DEPTH + z] === 1;
};

const canvas = document.querySelector("canvas.webgl");
const scene = new THREE.Scene();
const textureLoader = new THREE.TextureLoader();
const matcapTexture = textureLoader.load("./img/matcap_1.png");

const geometryGroup = new THREE.Group();
scene.add(geometryGroup);

const boxGeometry = new THREE.BoxBufferGeometry(0.98, 0.98, 0.98);
const boxMaterial = new THREE.MeshMatcapMaterial();
boxMaterial.matcap = matcapTexture;

const gridHelper = new THREE.GridHelper(1000, 1000, 0x666666, 0x333333);
scene.add(gridHelper);

buildGeometry();

const bounds = canvas.parentElement.getBoundingClientRect();
const globalSize = {
  width: bounds.width,
  height: bounds.height,
};

window.addEventListener("resize", () => {
  // Update sizes
  const bounds = canvas.parentElement.getBoundingClientRect();

  globalSize.width = bounds.width;
  globalSize.height = bounds.height;

  // Update camera
  camera.aspect = globalSize.width / globalSize.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(globalSize.width, globalSize.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

const camera = new THREE.PerspectiveCamera(
  75,
  globalSize.width / globalSize.height,
  1,
  1024
);
camera.position.y = 5;
camera.position.z = 15;
scene.add(camera);

const controls = new THREE.OrbitControls(camera, canvas);

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});

renderer.setSize(globalSize.width, globalSize.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

function animate() {
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
}
animate();

function clearError() {
  document.getElementById("error").textContent = "";
}

function setError(error) {
  document.getElementById("error").textContent = error;
  console.error();
}

function buildVolume() {
  volume.fill(0);

  const lines = instructions.trim().split("\n");

  let tx = Math.round(MAX_WIDTH / 2);
  let ty = Math.round(MAX_HEIGHT / 2);
  let tz = Math.round(MAX_DEPTH / 2);

  // let geometry;
  for (let line = 1; line <= lines.length; line++) {
    const [command, ...args] = lines[line - 1].trim().split(/\s+/);
    if (command === "box") {
      if (args.length !== 3) {
        setError(`Line ${line}: box needs three arguments, e.g. box 2 4 5`);
      }
      const width = parseInt(args[0]);
      const height = parseInt(args[1]);
      const depth = parseInt(args[2]);
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          for (let z = 0; z < depth; z++) {
            vset(tx + x, ty + y, tz + z);
          }
        }
      }
    } else if (command === "plane") {
      if (args.length !== 2) {
        setError(`Line ${line}: plane needs three arguments, e.g. plane 4 8`);
      }
      const width = parseInt(args[0]);
      const depth = parseInt(args[1]);
      for (let x = 0; x < width; x++) {
        for (let z = 0; z < depth; z++) {
          vset(tx + x, ty, tz + z);
        }
      }
    } else if (command === "extrude") {
      if (args.length !== 1) {
        setError(`Line ${line}: extrude needs one arguments, e.g. extrude 10`);
      }
      const height = parseInt(args[0]);
      for (let x = 0; x < MAX_WIDTH; x++) {
        for (let y = MAX_HEIGHT - 1; y >= 0; y--) {
          for (let z = 0; z < MAX_DEPTH; z++) {
            if (vfull(x, y, z)) {
              for (let yy = y; yy < y + height; yy++) {
                vset(x, yy, z);
              }
            }
          }
        }
      }
    } else if (command === "translate") {
      if (args.length !== 3) {
        setError(
          `Line ${line}: translate needs three arguments, e.g. translate 2 4 5`
        );
      }
      tx += parseInt(args[0]);
      ty += parseInt(args[1]);
      tz += parseInt(args[2]);
    } else if (command === "reset") {
      tx = Math.round(MAX_WIDTH / 2);
      ty = Math.round(MAX_HEIGHT / 2);
      tz = Math.round(MAX_DEPTH / 2);
    } else if (command.trim() === "" || command.trim()[0] === "#") {
      // Empty line or comment
    } else {
      setError(`Line ${line}: unknown command "${command}".`);
    }
  }
}

function buildGeometry() {
  clearError();

  while (geometryGroup.children.length) {
    geometryGroup.remove(geometryGroup.children[0]);
  }
  geometryGroup.position.set(-MAX_WIDTH / 2, -MAX_HEIGHT / 2, -MAX_DEPTH / 2);

  buildVolume();

  let boxCount = 0;
  for (let i = 0; i < volume.length; i++) {
    if (volume[i]) boxCount++;
  }

  const mesh = new THREE.InstancedMesh(boxGeometry, boxMaterial, boxCount);
  geometryGroup.add(mesh);

  let index = 0;
  for (let x = 0; x < MAX_WIDTH; x++) {
    for (let y = 0; y < MAX_HEIGHT; y++) {
      for (let z = 0; z < MAX_DEPTH; z++) {
        if (vfull(x, y, z)) {
          const m = new THREE.Matrix4();
          m.makeTranslation(x, y, z);
          mesh.setMatrixAt(index, m);
          index++;
        }
      }
    }
  }
}

document.getElementById("code").addEventListener("input", (e) => {
  instructions = e.target.value;
  buildGeometry();
});
