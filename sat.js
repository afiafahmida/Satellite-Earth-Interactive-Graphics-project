// Import necessary Three.js modules
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; // Import GLTFLoader

// Create a scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // Black background for space

// Create a camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); 

let cameraDistance = 10; 
let cameraAngleX = 5; 
let cameraAngleY = 10; 
const cameraHeightOffset = 0.5; 
let satelliteRef; 

// Create a renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Textures ---
const textureLoader = new THREE.TextureLoader();

const starTexture = textureLoader.load('texture/starbg.gif');
const starGeometry = new THREE.SphereGeometry(40, 64, 64);
const starMaterial = new THREE.MeshBasicMaterial({
    map: starTexture,
    side: THREE.BackSide
});
const starMesh = new THREE.Mesh(starGeometry, starMaterial);
scene.add(starMesh);


// Earth textures
const earthTexture = textureLoader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg');
const earthBumpMap = textureLoader.load('https://threejs.org/examples/textures/planets/earth_bump_2048.jpg');
const earthSpecularMap = textureLoader.load('https://threejs.org/examples/textures/planets/earth_specular_2048.jpg');

// Satellite textures
//const solarPanelTexture = textureLoader.load('texture/white.jpg'); 
const customSatelliteTexture1 = textureLoader.load('texture/blue-sat.jpg');
const customSatelliteTexture2 = textureLoader.load('texture/black.avif');
const customSatelliteTexture3 = textureLoader.load('texture/white.jpg');
const customSatelliteTextures = [customSatelliteTexture1, customSatelliteTexture2, customSatelliteTexture3];
let currentSatelliteTextureIndex = 0;

// --- 3D Objects ---

// Earth
const earthGeometry = new THREE.SphereGeometry(2, 64, 64); 
const earthMaterial = new THREE.MeshPhongMaterial({
    map: earthTexture,
    bumpMap: earthBumpMap,
    bumpScale: 0.05,
    specularMap: earthSpecularMap,
    specular: new THREE.Color('grey'),
    shininess: 10
});
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);

// Satellite orbit group
const orbitGroup = new THREE.Group(); 
orbitGroup.position.set(0, 0, 0); 
scene.add(orbitGroup);

const satelliteContainer = new THREE.Group(); 
satelliteContainer.position.set(6, 0, 0); 
orbitGroup.add(satelliteContainer);

// fallback satellite creation
function createSatellite() {
  const satelliteGroup = new THREE.Group();

  // Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshPhongMaterial({ map: customSatelliteTexture2 }) // black.avif
  );
  satelliteGroup.add(body);

  // Left panel
  const leftPanel = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.05, 0.8),
    new THREE.MeshPhongMaterial({ map: customSatelliteTexture1 }) // blue-sat.jpg
  );
  leftPanel.position.set(-1.2, 0, 0);
  satelliteGroup.add(leftPanel);

  // Right panel
  const rightPanel = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.05, 0.8),
    new THREE.MeshPhongMaterial({ map: customSatelliteTexture1 }) 
  );
  rightPanel.position.set(1.2, 0, 0);
  satelliteGroup.add(rightPanel);

  return satelliteGroup;
}

// Load GLTF satellite
const loader = new GLTFLoader();
loader.load(
    'https://threejs.org/examples/models/gltf/Satellite.glb',
    function (gltf) {
        satelliteRef = gltf.scene;
        satelliteRef.scale.set(0.01, 0.01, 0.01); 
        satelliteRef.position.set(0, 0, 0); 
        satelliteContainer.add(satelliteRef);

        updateCameraPosition();
    },
    undefined, 
    function (error) {
        console.error('An error occurred loading the GLTF satellite model:', error);
        satelliteRef = createSatellite(); 
        satelliteContainer.add(satelliteRef);
        updateCameraPosition();
    }
);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5).normalize();
scene.add(directionalLight);

// Camera spherical coordinates
let theta = 0;          // horizontal angle
let phi = Math.PI ;  // vertical angle (from top)

// Camera update with full vertical rotation
function updateCameraPosition() {
    if (!satelliteRef) return;

    const satelliteWorldPosition = new THREE.Vector3();
    satelliteRef.getWorldPosition(satelliteWorldPosition);

    // Cartesian coordinates
    const x = satelliteWorldPosition.x + cameraDistance * Math.sin(phi) * Math.cos(theta);
    const y = satelliteWorldPosition.y + cameraDistance * Math.cos(phi);
    const z = satelliteWorldPosition.z + cameraDistance * Math.sin(phi) * Math.sin(theta);

    camera.position.set(x, y, z);

    // Flip up vector if phi is beyond the poles
    if (phi % (2 * Math.PI) > Math.PI) {
        camera.up.set(0, -1, 0); // upside down
    } else {
        camera.up.set(0, 1, 0);  // normal
    }

    camera.lookAt(satelliteWorldPosition);
}

// Keyboard interaction (remove phi clamping)
document.addEventListener('keydown', (event) => {
    const rotationSpeed = 0.05;

    switch (event.key) {
        case 'ArrowUp':
            phi -= rotationSpeed; // rotate up
            break;
        case 'ArrowDown':
            phi += rotationSpeed; // rotate down
            break;
        case 'ArrowLeft':
            theta += rotationSpeed; // rotate left
            break;
        case 'ArrowRight':
            theta -= rotationSpeed; // rotate right
            break;
    }

    updateCameraPosition();
});



// Mouse click: change texture
renderer.domElement.addEventListener('click', () => {
    if (satelliteRef) {
        currentSatelliteTextureIndex = (currentSatelliteTextureIndex + 1) % customSatelliteTextures.length;
        satelliteRef.traverse((child) => {
            if (child.isMesh && child.material && child.material.map) {
                child.material.map = customSatelliteTextures[currentSatelliteTextureIndex];
                child.material.needsUpdate = true;
            }
        });
        if (satelliteRef.material && satelliteRef.material.map) {
            satelliteRef.material.map = customSatelliteTextures[currentSatelliteTextureIndex];
            satelliteRef.material.needsUpdate = true;
        }
    }
});

// --- Animation loop ---
function animate() {
    requestAnimationFrame(animate);

    earth.rotation.y += 0.002;

    if (satelliteRef) {
        satelliteRef.rotation.y += 0.01;
        satelliteRef.rotation.x += 0.005;
    }

    orbitGroup.rotation.y += 0.005; 

    updateCameraPosition();
    renderer.render(scene, camera);
}
animate();
