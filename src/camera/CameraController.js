import * as THREE from 'three';

const _t = new THREE.Vector3();
const _d = new THREE.Vector3();

// Third-person orbit camera with wall collision, and a first-person mode (V toggles).
export class CameraController {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    this.mode = 'third';
    this.yaw = 0; // 0 = looking north (towards reception)
    this.pitch = 0.3;
    this.dist = 5.2;
    this.curDist = 5.2;
    this.sensitivity = 0.0026;
    this.target = new THREE.Vector3();
    this.bob = 0;
    this.focus = null; // optional {x,y,z} to glance at during dialogs
  }

  toggle() {
    this.setMode(this.mode === 'third' ? 'first' : 'third');
  }

  setMode(mode) {
    this.mode = mode;
    this.pitch = mode === 'third' ? 0.3 : 0.02;
  }

  handleInput(input) {
    const look = input.consumeLook();
    this.yaw -= look.x * this.sensitivity;
    this.pitch += look.y * this.sensitivity;
    if (this.mode === 'third') this.pitch = THREE.MathUtils.clamp(this.pitch, -0.35, 1.25);
    else this.pitch = THREE.MathUtils.clamp(this.pitch, -1.35, 1.35);
    const w = input.consumeWheel();
    if (w && this.mode === 'third') this.dist = THREE.MathUtils.clamp(this.dist + w * 0.45, 1.8, 9);
  }

  forward() {
    return { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
  }

  update(dt, player) {
    const cam = this.camera;
    if (this.mode === 'third') {
      _t.set(player.position.x, player.position.y + 1.7, player.position.z);
      this.target.lerp(_t, 1 - Math.exp(-dt * 18));
      if (this.target.distanceToSquared(_t) > 4) this.target.copy(_t);
      const cp = Math.cos(this.pitch);
      _d.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp).normalize();
      // portrait screens need more distance to keep the avatar from filling the view
      const dist = this.dist * (cam.aspect < 0.85 ? 1.35 : 1);
      const hit = this.world.raycastCamera(this.target, _d, dist + 0.35);
      const want = Math.max(0.6, Math.min(dist, hit - 0.3));
      // snap in quickly when blocked, ease out slowly
      const rate = want < this.curDist ? 22 : 4;
      this.curDist += (want - this.curDist) * (1 - Math.exp(-dt * rate));
      cam.position.copy(this.target).addScaledVector(_d, this.curDist);
      cam.lookAt(this.target);
      player.model.visible = this.curDist > 0.9;
    } else {
      const moving = player.speed > 0.3;
      this.bob += dt * (moving ? player.speed * 4.2 : 0);
      const bobY = moving ? Math.sin(this.bob) * 0.025 : 0;
      const f = this.forward();
      cam.position.set(player.position.x + f.x * 0.12, player.position.y + 1.62 + bobY, player.position.z + f.z * 0.12);
      cam.rotation.set(-this.pitch, this.yaw, 0, 'YXZ');
      player.model.visible = false;
    }
  }
}
