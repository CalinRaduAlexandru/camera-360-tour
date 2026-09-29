import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';

const viewer = window.tourViewer;
const host = document.getElementById('panorama');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 100);
camera.position.y = 1.6;
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.id = 'room-character';
renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';
host.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xfff4e8, 0x72614c, 2));
const light = new THREE.DirectionalLight(0xfff5e7, 2.3);
light.position.set(-1, 5, 1);
light.castShadow = true;
light.shadow.mapSize.set(1024, 1024);
light.shadow.camera.left = -5;
light.shadow.camera.right = 5;
light.shadow.camera.top = 5;
light.shadow.camera.bottom = -5;
light.shadow.normalBias = 0.025;
scene.add(light);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20),
  new THREE.ShadowMaterial({ opacity: 0.24 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
let mixer;
let idle;
let wave;
let nextWave = 0;
let lastScene;
new GLTFLoader().load('./vendor/RobotExpressive.glb', gltf => {
  const robot = new THREE.Group();
  robot.add(gltf.scene);
  robot.updateMatrixWorld(true);
  robot.traverse(obj => { if (obj.isSkinnedMesh) obj.skeleton.update(); });
  const bounds = new THREE.Box3().setFromObject(robot, true);
  robot.scale.setScalar(1.5 / bounds.getSize(new THREE.Vector3()).y);
  bounds.setFromObject(robot, true);
  const yaw = THREE.MathUtils.degToRad(-75);
  robot.position.set(Math.sin(yaw) * 2.8, -bounds.min.y, -Math.cos(yaw) * 2.8);
  robot.rotation.y = Math.atan2(-robot.position.x, -robot.position.z);
  robot.traverse(obj => { if (obj.isMesh) obj.castShadow = true; });
  scene.add(robot);
  mixer = new THREE.AnimationMixer(gltf.scene);
  idle = mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, 'Idle'));
  wave = mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, 'Wave'));
  wave.setLoop(THREE.LoopOnce, 1);
  wave.clampWhenFinished = true;
  idle.play();
  mixer.addEventListener('finished', () => {
    idle.reset().play();
    wave.crossFadeTo(idle, 0.4, false);
  });
  renderer.domElement.dataset.ready = 'true';
}, undefined, error => {
  console.error('Character could not load', error);
  const notice = document.createElement('div');
  notice.textContent = 'Personajul nu s-a încărcat. Reîncarcă pagina.';
  notice.className = 'hint';
  host.appendChild(notice);
});
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.1);
  const active = viewer.getScene() === 'camera';
  renderer.domElement.style.visibility = active ? 'visible' : 'hidden';
  if (!active) { lastScene = false; return; }
  const width = host.clientWidth;
  const height = host.clientHeight;
  if (!width || !height) return;
  if (renderer.domElement.width !== Math.floor(width * renderer.getPixelRatio()) ||
      renderer.domElement.height !== Math.floor(height * renderer.getPixelRatio())) {
    renderer.setSize(width, height, false);
  }
  camera.aspect = width / height;
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(
    Math.tan(THREE.MathUtils.degToRad(viewer.getHfov()) / 2) / camera.aspect));
  camera.rotation.set(THREE.MathUtils.degToRad(viewer.getPitch()),
    -THREE.MathUtils.degToRad(viewer.getYaw()), 0, 'YXZ');
  camera.updateProjectionMatrix();
  if (mixer) {
    if (!lastScene || performance.now() > nextWave) {
      wave.reset().play();
      idle.crossFadeTo(wave, 0.35, false);
      nextWave = performance.now() + 6500;
    }
    mixer.update(delta);
  }
  lastScene = true;
  renderer.render(scene, camera);
});
