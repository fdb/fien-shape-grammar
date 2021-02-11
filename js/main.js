let instructions = `box 2 3 4

translate 5 0 0
box 2 10 4

reset
translate -5 0 0
box 2 7 4
`;
document.getElementById("code").textContent = instructions;

const canvas = document.querySelector("canvas.webgl");
const scene = new THREE.Scene();
const textureLoader = new THREE.TextureLoader();
const matcapTexture = textureLoader.load("./img/matcap_1.png");

const geometryGroup = new THREE.Group();
scene.add(geometryGroup);

const boxGeometry = new THREE.BoxBufferGeometry(0.98, 0.98, 0.98);
const boxMaterial = new THREE.MeshMatcapMaterial();
boxMaterial.matcap = matcapTexture;

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

  render();
});

const camera = new THREE.PerspectiveCamera(
  75,
  globalSize.width / globalSize.height,
  0.1,
  100
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
document.querySelector("textarea").addEventListener("input", (e) => {
  console.log("teset");
  console.log(e.target.value);
});

function clearError() {
  document.getElementById("error").textContent = "";
}

function setError(error) {
  document.getElementById("error").textContent = error;
  console.error();
}

function buildGeometry() {
  clearError();

  while (geometryGroup.children.length) {
    geometryGroup.remove(geometryGroup.children[0]);
  }

  const lines = instructions.trim().split("\n");

  let tx = (ty = tz = 0);

  // let geometry;
  for (let line = 0; line < lines.length; line++) {
    const [command, ...args] = lines[line].trim().split(" ");
    if (command === "box") {
      if (args.length !== 3) {
        setError(`Line ${line}: box needs three arguments, e.g. box 2 4 5`);
      }
      const width = args[0];
      const height = args[1];
      const depth = args[2];
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          for (let z = 0; z < depth; z++) {
            const mesh = new THREE.Mesh(boxGeometry, boxMaterial);
            mesh.position.set(x + tx, y + ty, z + tz);
            geometryGroup.add(mesh);
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
      tx = ty = tz = 0;
    } else if (command.trim() === "" || command.trim()[0] === "#") {
      // Empty line or comment
    } else {
      setError(`Line ${line}: unknown command "${command}".`);
    }
  }
}

document.getElementById("code").addEventListener("input", (e) => {
  instructions = e.target.value;
  buildGeometry();
});
