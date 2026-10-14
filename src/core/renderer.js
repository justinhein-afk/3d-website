import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

export function createRenderer(canvas, labelsEl, quality) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1510);

  const aspect0 = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(aspect0 < 0.85 ? 70 : 60, aspect0, 0.05, 260);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.38, 0.5, 0.95);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const labels = new CSS2DRenderer({ element: labelsEl });
  labels.setSize(window.innerWidth, window.innerHeight);

  const ctx = {
    renderer,
    scene,
    camera,
    composer,
    bloom,
    labels,
    quality,
    reflector: null,
    floorOverlay: null,
    useBloom: quality.bloom,
    render() {
      if (ctx.useBloom) composer.render();
      else renderer.render(scene, camera);
      labels.render(scene, camera);
    },
    resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.fov = camera.aspect < 0.85 ? 70 : 60;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      labels.setSize(w, h);
      if (ctx.reflector) {
        const pr = renderer.getPixelRatio() * (ctx.quality.reflectorScale || 0.5);
        ctx.reflector.getRenderTarget().setSize(Math.round(w * pr), Math.round(h * pr));
      }
    },
    applyQuality(q) {
      ctx.quality = q;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.pixelRatio));
      ctx.useBloom = q.bloom;
      if (ctx.reflector) ctx.reflector.visible = !!q.reflector;
      if (ctx.floorOverlay) {
        ctx.floorOverlay.material.opacity = q.reflector ? 0.8 : 1;
        ctx.floorOverlay.material.transparent = !!q.reflector;
        ctx.floorOverlay.material.needsUpdate = true;
      }
      ctx.resize();
    },
  };
  window.addEventListener('resize', () => ctx.resize());
  return ctx;
}
