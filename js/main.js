import * as THREE from './vendor/three.r170.module.min.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const smooth = (t) => t * t * (3 - 2 * t);

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ------------------------------------------------------------------ */
/* Project data                                                        */
/* ------------------------------------------------------------------ */
const PROJECTS = [
  {
    title: 'Lumen', kind: 'WebGL product configurator', year: '2026',
    role: 'Creative development, 3D', stack: 'Three.js, GLSL, TypeScript',
    a: '#8b5cf6', b: '#22d3ee',
    summary: 'A real time configurator that lets shoppers shape a lamp in light, material and form, rendered live in the browser.',
    body: [
      'Lumen sells designer lamps with hundreds of finish and shade combinations. Photographing every one was impossible, so the brief was simple: let people build their own lamp and see it exactly as it will arrive.',
      'I built a physically based scene with baked light maps and a handful of custom shaders, so every change of brass, glass or fabric feels instant, even on a mid range phone. Soft camera moves guide the eye without ever taking control away.',
      'The configurator now sits at the heart of the store, and it quietly does the job of a showroom.'
    ],
    stats: [['+38%', 'time on product pages'], ['60fps', 'on mobile devices'], ['1.2MB', 'total 3D payload']]
  },
  {
    title: 'Driftwood', kind: 'Brand identity and website', year: '2025',
    role: 'Art direction, design, development', stack: 'Figma, Astro, GSAP',
    a: '#f97316', b: '#ec4899',
    summary: 'A coastal hotel brand built around slow living, warm light and the rhythm of the tide.',
    body: [
      'Driftwood wanted a site that felt like the first evening of a holiday. We started with sound and motion before a single layout: waves, long shadows and a palette that shifts with the time of day.',
      'The website changes its colors based on the local hour at the hotel, and room pages unfold like postcards. Booking stays two clicks away at all times.',
      'The new identity rolled out across signage, menus and social, all from one flexible system.'
    ],
    stats: [['2x', 'direct bookings'], ['4', 'time of day palettes'], ['92', 'Lighthouse performance']]
  },
  {
    title: 'Pulse', kind: 'Audio reactive data visuals', year: '2025',
    role: 'Creative coding, shaders', stack: 'WebGL, Web Audio, React',
    a: '#10b981', b: '#a3e635',
    summary: 'Live visuals for a music festival that turn every track and every crowd cheer into moving light.',
    body: [
      'Pulse drove the giant screens of a three day electronic music festival. Each artist had a visual world that reacted to the beat, the frequency spectrum and the noise of the crowd picked up by stage microphones.',
      'Everything ran in a browser on stage machines, which made it easy for VJs to tweak parameters live from a tablet.',
      'After the event, the same engine became an interactive recap site where fans could replay any set.'
    ],
    stats: [['18', 'visual worlds'], ['3', 'days live on stage'], ['250k', 'recap site visitors']]
  },
  {
    title: 'Atlas', kind: 'Interactive story map', year: '2024',
    role: 'Design and development', stack: 'Mapbox GL, Three.js, D3',
    a: '#3b82f6', b: '#e879f9',
    summary: 'A scroll driven journey across five continents that follows the migration of a single bird.',
    body: [
      'Atlas was made with a nature magazine to tell a long form story in a new way. As you scroll, the globe turns, the seasons change and the path of the bird draws itself across the map.',
      'Real tracking data powers the route, while illustrated chapters open at each stopover. The whole piece works with keyboard and screen readers too.',
      'It became the most read feature of the year for the magazine.'
    ],
    stats: [['14 min', 'average read time'], ['5', 'continents'], ['1', 'very determined bird']]
  }
];

/* ------------------------------------------------------------------ */
/* Split text into animated characters                                 */
/* ------------------------------------------------------------------ */
function split(el, text) {
  text = (text ?? el.textContent).trim();
  el.setAttribute('aria-label', text);
  el.textContent = '';
  let i = 0;
  text.split(' ').forEach((word, wi, arr) => {
    const w = document.createElement('span');
    w.className = 'w';
    w.setAttribute('aria-hidden', 'true');
    for (const ch of word) {
      const c = document.createElement('span');
      c.className = 'c';
      c.textContent = ch;
      c.style.setProperty('--i', i++);
      w.appendChild(c);
    }
    el.appendChild(w);
    if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
  });
}
$$('[data-split]').forEach((el) => split(el));
$$('.year').forEach((el) => (el.textContent = new Date().getFullYear()));

/* ------------------------------------------------------------------ */
/* 3D scene                                                            */
/* ------------------------------------------------------------------ */
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const BLOB_VERT = /* glsl */ `
uniform float uTime; uniform float uAmp; uniform float uFreq; uniform float uHover; uniform float uIntro;
uniform vec3 uMouseDir;
varying vec3 vNormal; varying vec3 vView; varying float vDisp; varying float vFres;
${NOISE}
float disp(vec3 p){
  vec3 wdir = normalize(mat3(modelMatrix) * normalize(p));
  float n = snoise(p * uFreq + vec3(uTime * .22, uTime * .17, 0.));
  float n2 = snoise(p * uFreq * 2.4 - vec3(0., uTime * .35, uTime * .2)) * .3;
  float bulge = pow(max(dot(wdir, uMouseDir), 0.), 5.) * (0.18 + uHover * 0.35);
  return (n + n2) * uAmp + bulge;
}
void main(){
  vec3 p = position;
  vec3 nrm = normalize(normal);
  vec3 t = normalize(cross(nrm, abs(nrm.y) > .99 ? vec3(1.,0.,0.) : vec3(0.,1.,0.)));
  vec3 b = normalize(cross(nrm, t));
  float e = .015;
  float d0 = disp(p);
  vec3 P0 = p + normalize(p) * d0;
  vec3 P1 = (p + t * e); P1 += normalize(P1) * disp(P1);
  vec3 P2 = (p + b * e); P2 += normalize(P2) * disp(P2);
  vec3 dn = normalize(cross(P1 - P0, P2 - P0));
  if (dot(dn, nrm) < 0.) dn = -dn;
  vDisp = d0;
  vec4 mv = modelViewMatrix * vec4(P0 * uIntro, 1.);
  vNormal = normalize(normalMatrix * dn);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const BLOB_FRAG = /* glsl */ `
uniform vec3 uC1; uniform vec3 uC2; uniform float uTime; uniform float uHover;
varying vec3 vNormal; varying vec3 vView; varying float vDisp;
void main(){
  vec3 n = normalize(vNormal); vec3 V = normalize(vView);
  float f = pow(1. - max(dot(n, V), 0.), 2.2);
  vec3 pal = .5 + .5 * cos(6.28318 * (vec3(0., .33, .67) + vDisp * 1.6 + f * .5 + uTime * .04));
  vec3 base = mix(uC1, uC2, smoothstep(-.25, .35, vDisp) * .7 + f * .3);
  base = mix(base, pal, .28 + uHover * .15);
  vec3 L1 = normalize(vec3(.6, .8, .7)); vec3 L2 = normalize(vec3(-.8, -.3, .4));
  float diff = max(dot(n, L1), 0.) * .8 + max(dot(n, L2), 0.) * .25;
  float spec = pow(max(dot(reflect(-L1, n), V), 0.), 40.) * .9;
  vec3 col = base * (.25 + diff) + spec + f * mix(uC2, vec3(1.), .3) * 1.1;
  col = pow(col, vec3(.9));
  gl_FragColor = vec4(col, 1.);
}`;

const PART_VERT = /* glsl */ `
uniform float uOffset; uniform float uPixel; uniform vec2 uMouse; uniform float uTime;
attribute float aSize; attribute float aSeed;
varying float vAlpha; varying float vSeed;
void main(){
  vec3 p = position;
  p.z = mod(p.z + uOffset * (0.6 + aSeed * 0.8), 26.) - 20.;
  p.x += sin(uTime * .3 + aSeed * 30.) * .15;
  p.y += cos(uTime * .25 + aSeed * 20.) * .15;
  p.xy -= uMouse * (p.z + 20.) * .025;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(aSize * uPixel * (14. / -mv.z), 48.);
  vAlpha = smoothstep(-20., -13., p.z) * (1. - smoothstep(3.5, 5.6, p.z));
  vSeed = aSeed;
}`;

const PART_FRAG = /* glsl */ `
uniform vec3 uC1; uniform vec3 uC2;
varying float vAlpha; varying float vSeed;
void main(){
  float d = length(gl_PointCoord - .5);
  float a = smoothstep(.5, 0., d);
  a *= a;
  gl_FragColor = vec4(mix(uC1, uC2, vSeed) + .25, a * vAlpha * .9);
}`;

// One visual state per section: position, scale, distortion and colors.
const STATES = [
  { x: 1.85, y: 0.05, z: 0, s: 0.92, amp: 0.24, freq: 0.85, spin: 0.12, c1: '#5b21b6', c2: '#22d3ee' }, // hero
  { x: -2.9, y: 0.35, z: -2.2, s: 0.78, amp: 0.3, freq: 1.25, spin: 0.25, c1: '#c2410c', c2: '#ec4899' }, // work
  { x: 2.3, y: -0.1, z: -0.4, s: 0.95, amp: 0.16, freq: 0.6, spin: 0.08, c1: '#047857', c2: '#a3e635' }, // about
  { x: 0, y: 0.15, z: -2.8, s: 1.2, amp: 0.5, freq: 1.05, spin: 0.18, c1: '#1d4ed8', c2: '#e879f9' } // contact
].map((s) => ({ ...s, c1: new THREE.Color(s.c1), c2: new THREE.Color(s.c2) }));

function initScene() {
  const canvas = $('#scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  const small = Math.min(innerWidth, innerHeight) < 700;
  const blobUniforms = {
    uTime: { value: 0 }, uAmp: { value: 0.25 }, uFreq: { value: 0.9 }, uHover: { value: 0 }, uIntro: { value: 0.0001 },
    uMouseDir: { value: new THREE.Vector3(0, 0, 1) },
    uC1: { value: STATES[0].c1.clone() }, uC2: { value: STATES[0].c2.clone() }
  };
  const blob = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.45, small ? 40 : 72),
    new THREE.ShaderMaterial({ vertexShader: BLOB_VERT, fragmentShader: BLOB_FRAG, uniforms: blobUniforms })
  );
  const group = new THREE.Group();
  group.add(blob);
  scene.add(group);

  // particle field that becomes a warp tunnel during transitions
  const N = small ? 1400 : 2800;
  const pos = new Float32Array(N * 3), size = new Float32Array(N), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = 1.5 + Math.random() * 9;
    const a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r * 1.4;
    pos[i * 3 + 1] = Math.sin(a) * r;
    pos[i * 3 + 2] = Math.random() * 26 - 20;
    size[i] = 0.4 + Math.random() * Math.random() * 2.2;
    seed[i] = Math.random();
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  pGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const partUniforms = {
    uOffset: { value: 0 }, uPixel: { value: 1 }, uMouse: { value: new THREE.Vector2() }, uTime: { value: 0 },
    uC1: { value: STATES[0].c1.clone() }, uC2: { value: STATES[0].c2.clone() }
  };
  const points = new THREE.Points(pGeo, new THREE.ShaderMaterial({
    vertexShader: PART_VERT, fragmentShader: PART_FRAG, uniforms: partUniforms,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  points.frustumCulled = false;
  scene.add(points);

  // state
  const cur = { x: STATES[0].x, y: 0, z: 0, s: 1, amp: 0.25, freq: 0.9, spin: 0.12 };
  const mouse = { x: 0, y: 0, sx: 0, sy: 0, vel: 0 };
  const ray = new THREE.Raycaster();
  const sphere = new THREE.Sphere();
  const tmpC1 = new THREE.Color(), tmpC2 = new THREE.Color();
  let hovering = false, wasHovering = false, hover = 0, pulse = 0, warp = 0, warpTarget = 0, intro = 0, introOn = false;
  let narrow = innerWidth < 860;
  let anchors = [];

  function resize() {
    const w = innerWidth, h = innerHeight;
    narrow = w < 860;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    partUniforms.uPixel.value = dpr;
    anchors = $$('[data-section]').map((el) => {
      const r = el.getBoundingClientRect();
      return r.top + scrollY + r.height / 2;
    });
  }
  resize();
  addEventListener('resize', resize);
  addEventListener('load', resize);

  function sectionBlend() {
    const mid = scrollY + innerHeight / 2;
    if (!anchors.length || mid <= anchors[0]) return 0;
    for (let i = 0; i < anchors.length - 1; i++) {
      if (mid < anchors[i + 1]) return i + smooth((mid - anchors[i]) / (anchors[i + 1] - anchors[i]));
    }
    return anchors.length - 1;
  }

  addEventListener('pointermove', (e) => {
    const nx = (e.clientX / innerWidth) * 2 - 1;
    const ny = -(e.clientY / innerHeight) * 2 + 1;
    mouse.vel = Math.min(mouse.vel + Math.hypot(nx - mouse.x, ny - mouse.y) * 1.5, 1.5);
    mouse.x = nx; mouse.y = ny;
  }, { passive: true });

  const clock = new THREE.Clock();
  let time = 0, offset = 0;

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt * (reduceMotion ? 0.3 : 1);

    // where are we on the page?
    const f = sectionBlend();
    const i0 = Math.floor(f), i1 = Math.min(i0 + 1, STATES.length - 1), t = f - i0;
    const A = STATES[Math.min(i0, STATES.length - 1)], B = STATES[i1];
    let tx = lerp(A.x, B.x, t), ty = lerp(A.y, B.y, t), ts = lerp(A.s, B.s, t);
    let tz = lerp(A.z, B.z, t);
    if (narrow) { tx *= 0.15; ty += 0.9; ts *= 0.68; tz -= 1.6 * Math.min(f, 1); }
    const k = 3.2;
    cur.x = damp(cur.x, tx, k, dt);
    cur.y = damp(cur.y, ty, k, dt);
    cur.z = damp(cur.z, tz - warp * 2.5, k, dt);
    cur.s = damp(cur.s, ts, k, dt);
    cur.amp = damp(cur.amp, lerp(A.amp, B.amp, t), k, dt);
    cur.freq = damp(cur.freq, lerp(A.freq, B.freq, t), k, dt);
    cur.spin = damp(cur.spin, lerp(A.spin, B.spin, t), k, dt);
    tmpC1.copy(A.c1).lerp(B.c1, t); tmpC2.copy(A.c2).lerp(B.c2, t);
    const ck = 1 - Math.exp(-2.5 * dt);
    blobUniforms.uC1.value.lerp(tmpC1, ck); blobUniforms.uC2.value.lerp(tmpC2, ck);
    partUniforms.uC1.value.lerp(tmpC1, ck); partUniforms.uC2.value.lerp(tmpC2, ck);

    // pointer
    mouse.sx = damp(mouse.sx, mouse.x, 4, dt);
    mouse.sy = damp(mouse.sy, mouse.y, 4, dt);
    mouse.vel = damp(mouse.vel, 0, 2.5, dt);
    ray.setFromCamera({ x: mouse.x, y: mouse.y }, camera);
    sphere.set(group.position, 1.45 * cur.s * 1.15);
    hovering = finePointer && !document.documentElement.classList.contains('case-open') && ray.ray.intersectsSphere(sphere);
    hover = damp(hover, hovering ? 1 : 0, 5, dt);
    if (hovering !== wasHovering) {
      wasHovering = hovering;
      document.dispatchEvent(new CustomEvent('blobhover', { detail: hovering }));
    }
    const md = new THREE.Vector3(mouse.sx * 1.2, mouse.sy * 1.2, 1).normalize();
    blobUniforms.uMouseDir.value.copy(md);

    pulse = damp(pulse, 0, 2.2, dt);
    warp = damp(warp, warpTarget, 2.4, dt);
    if (introOn) intro = damp(intro, 1, 2.6, dt);

    group.position.set(cur.x + mouse.sx * 0.15, cur.y + mouse.sy * 0.1, cur.z);
    group.scale.setScalar(cur.s * (1 + pulse * 0.12));
    blob.rotation.y += dt * (cur.spin + mouse.vel * 0.6 + warp * 1.5);
    blob.rotation.x = damp(blob.rotation.x, -mouse.sy * 0.5, 3, dt);
    group.rotation.z = damp(group.rotation.z, mouse.sx * -0.15, 3, dt);

    blobUniforms.uTime.value = time;
    blobUniforms.uAmp.value = cur.amp + mouse.vel * 0.12 + hover * 0.08 + pulse * 0.55 + warp * 0.3;
    blobUniforms.uFreq.value = cur.freq + pulse * 0.6;
    blobUniforms.uHover.value = hover;
    blobUniforms.uIntro.value = Math.max(0.0001, 1 - Math.pow(1 - intro, 3) + Math.sin(intro * Math.PI) * 0.08);

    offset += dt * ((reduceMotion ? 0.1 : 0.6) + warp * 22 + pulse * 6);
    partUniforms.uOffset.value = offset;
    partUniforms.uTime.value = time;
    partUniforms.uMouse.value.set(mouse.sx, mouse.sy);
    points.rotation.z += dt * (0.01 + warp * 0.2);

    camera.position.x = damp(camera.position.x, mouse.sx * 0.25, 2, dt);
    camera.position.y = damp(camera.position.y, mouse.sy * 0.18, 2, dt);
    camera.fov = damp(camera.fov, 40 + warp * 22, 3, dt);
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, -2);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    get hovering() { return hovering; },
    start() { introOn = true; if (reduceMotion) intro = 1; },
    pulse() { pulse = 1; },
    warp(on) { warpTarget = on ? 1 : 0; if (on) pulse = Math.max(pulse, 0.6); },
    refresh: resize
  };
}

let gl = null;
try {
  gl = initScene();
} catch (err) {
  console.warn('WebGL unavailable, showing the flat version.', err);
  document.documentElement.classList.add('no-webgl');
}

/* ------------------------------------------------------------------ */
/* Loader and intro                                                    */
/* ------------------------------------------------------------------ */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('is-in');
    io.unobserve(e.target);
    const n = e.target.querySelector('[data-count]');
    if (n) countUp(e.target);
  }
}, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

function countUp(scope) {
  $$('[data-count]', scope).forEach((el) => {
    const end = +el.dataset.count, t0 = performance.now(), dur = reduceMotion ? 1 : 1600;
    const tick = (t) => {
      const p = clamp((t - t0) / dur, 0, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function runLoader() {
  return new Promise((resolve) => {
    const out = $('.loader__count');
    if (reduceMotion) { out.textContent = '100'; resolve(); return; }
    const t0 = performance.now(), dur = 1500;
    const tick = (t) => {
      const p = clamp((t - t0) / dur, 0, 1);
      out.textContent = Math.round((1 - Math.pow(1 - p, 3)) * 100);
      if (p < 1) requestAnimationFrame(tick); else setTimeout(resolve, 180);
    };
    requestAnimationFrame(tick);
  });
}

runLoader().then(() => {
  document.body.classList.remove('is-loading');
  document.body.classList.add('is-ready');
  setTimeout(() => gl?.start(), 350);
  setTimeout(() => {
    $$('[data-reveal],[data-split]').filter((el) => !el.closest('.case')).forEach((el) => io.observe(el));
  }, 650);
  setTimeout(() => $('.loader')?.remove(), 1800);
  gl?.refresh();
});

/* ------------------------------------------------------------------ */
/* Nav progress and active section                                     */
/* ------------------------------------------------------------------ */
const bar = $('.nav__progress span');
const navLinks = $$('[data-nav]');
const sections = $$('[data-section]');
function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  const mid = scrollY + innerHeight * 0.45;
  let active = 0;
  sections.forEach((s, i) => { if (s.offsetTop <= mid) active = i; });
  navLinks.forEach((a) => a.classList.toggle('is-active', +a.dataset.nav === active));
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ------------------------------------------------------------------ */
/* Custom cursor, magnetic elements, card tilt                         */
/* ------------------------------------------------------------------ */
const cursor = $('.cursor');
const label = $('.cursor__label');
if (finePointer && !reduceMotion) {
  document.documentElement.classList.add('has-cursor');
  const dot = $('.cursor__dot'), ring = $('.cursor__ring');
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, overUI = false, blobHover = false;
  addEventListener('pointermove', (e) => {
    x = e.clientX; y = e.clientY;
    const el = e.target.closest?.('a, button');
    overUI = !!el;
    const card = e.target.closest?.('.card');
    const lbl = card ? 'View' : el?.classList.contains('case__next') ? 'Next' : '';
    setCursor(lbl, !!el);
  }, { passive: true });
  document.addEventListener('blobhover', (e) => {
    if (e.detail === blobHover) return;
    blobHover = e.detail;
    if (!overUI) setCursor(blobHover ? 'Click' : '', false);
  });
  function setCursor(lbl, link) {
    if (!lbl && !overUI && blobHover) lbl = 'Click';
    label.textContent = lbl;
    cursor.classList.toggle('is-label', !!lbl);
    cursor.classList.toggle('is-link', link && !lbl);
  }
  addEventListener('pointerdown', () => cursor.classList.add('is-down'));
  addEventListener('pointerup', () => cursor.classList.remove('is-down'));
  document.addEventListener('pointerleave', () => (cursor.style.opacity = 0));
  document.addEventListener('pointerenter', () => (cursor.style.opacity = 1));
  (function loop() {
    rx = lerp(rx, x, 0.18); ry = lerp(ry, y, 0.18);
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    requestAnimationFrame(loop);
  })();

  $$('[data-magnetic]').forEach((el) => {
    const inner = el.querySelector('span') || el;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate3d(${dx * 0.25}px, ${dy * 0.3}px, 0)`;
      if (inner !== el) inner.style.transform = `translate3d(${dx * 0.12}px, ${dy * 0.12}px, 0)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = 'transform .7s cubic-bezier(.2,.8,.2,1)';
      inner.style.transition = 'transform .7s cubic-bezier(.2,.8,.2,1)';
      el.style.transform = ''; inner.style.transform = '';
      setTimeout(() => { el.style.transition = ''; inner.style.transition = ''; }, 700);
    });
  });

  $$('.card').forEach((card) => {
    const cover = card.querySelector('.card__cover');
    card.addEventListener('pointermove', (e) => {
      const r = cover.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.classList.add('is-tilting');
      cover.style.setProperty('--ry', `${(px - 0.5) * 14}deg`);
      cover.style.setProperty('--rx', `${(0.5 - py) * 12}deg`);
      cover.style.setProperty('--gx', `${px * 100}%`);
      cover.style.setProperty('--gy', `${py * 100}%`);
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-tilting');
      cover.style.setProperty('--rx', '0deg');
      cover.style.setProperty('--ry', '0deg');
    });
  });
}

// click the shape to make it pulse
addEventListener('pointerdown', (e) => {
  if (!gl || !gl.hovering) return;
  if (e.target.closest('a, button, input, .case')) return;
  gl.pulse();
});

/* ------------------------------------------------------------------ */
/* Case study overlay with circular reveal + warp                      */
/* ------------------------------------------------------------------ */
const caseEl = $('.case');
const caseTitle = $('[data-case-title]');
let current = -1, lastFocus = null, closing = null;

function fillCase(i) {
  const p = PROJECTS[i];
  current = i;
  caseEl.style.setProperty('--a', p.a);
  caseEl.style.setProperty('--b', p.b);
  $('.case__index').textContent = String(i + 1).padStart(2, '0');
  $('.case__kind').textContent = p.kind;
  split(caseTitle, p.title);
  caseTitle.classList.remove('is-in');
  $('.case__summary').textContent = p.summary;
  $('.case__year').textContent = p.year;
  $('.case__role').textContent = p.role;
  $('.case__stack').textContent = p.stack;
  $('.case__body').replaceChildren(...p.body.map((t) => Object.assign(document.createElement('p'), { textContent: t })));
  $('.case__stats').replaceChildren(...p.stats.map(([v, l]) => {
    const li = document.createElement('li');
    li.append(Object.assign(document.createElement('strong'), { textContent: v }), Object.assign(document.createElement('span'), { textContent: l }));
    return li;
  }));
  $('.case__next-title').textContent = PROJECTS[(i + 1) % PROJECTS.length].title;
  $('.case__scroll').scrollTop = 0;
}

function openCase(i, x, y) {
  clearTimeout(closing);
  lastFocus = document.activeElement;
  fillCase(i);
  cursor.classList.remove('is-label', 'is-link');
  caseEl.style.setProperty('--x', `${x}px`);
  caseEl.style.setProperty('--y', `${y}px`);
  caseEl.hidden = false;
  document.documentElement.classList.add('case-open');
  gl?.warp(true);
  void caseEl.offsetWidth; // commit the closed state so the circle animates
  requestAnimationFrame(() => {
    caseEl.classList.add('is-open');
    setTimeout(() => caseTitle.classList.add('is-in'), 50);
  });
  setTimeout(() => gl?.warp(false), 900);
  $('.case__close').focus({ preventScroll: true });
  history.replaceState(null, '', `#work/${PROJECTS[i].title.toLowerCase()}`);
}

function closeCase() {
  if (caseEl.hidden) return;
  caseEl.classList.remove('is-open');
  caseTitle.classList.remove('is-in');
  gl?.warp(true);
  setTimeout(() => gl?.warp(false), 500);
  closing = setTimeout(() => {
    caseEl.hidden = true;
    document.documentElement.classList.remove('case-open');
  }, reduceMotion ? 0 : 1000);
  history.replaceState(null, '', '#work');
  lastFocus?.focus?.({ preventScroll: true });
}

function nextCase() {
  const n = (current + 1) % PROJECTS.length;
  gl?.warp(true);
  caseEl.classList.add('is-swapping');
  caseTitle.classList.remove('is-in');
  setTimeout(() => {
    fillCase(n);
    caseEl.classList.remove('is-swapping');
    requestAnimationFrame(() => caseTitle.classList.add('is-in'));
    gl?.warp(false);
    history.replaceState(null, '', `#work/${PROJECTS[n].title.toLowerCase()}`);
  }, reduceMotion ? 0 : 550);
}

$$('.card').forEach((card) => {
  card.addEventListener('click', (e) => {
    const r = card.getBoundingClientRect();
    const x = e.clientX || r.left + r.width / 2;
    const y = e.clientY || r.top + r.height / 2;
    openCase(+card.dataset.project, x, y);
  });
});
$('.case__close').addEventListener('click', closeCase);
$('.case__next').addEventListener('click', nextCase);
addEventListener('keydown', (e) => {
  if (caseEl.hidden) return;
  if (e.key === 'Escape') closeCase();
  if (e.key === 'Tab') {
    const f = $$('button, a[href]', caseEl);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

// deep link like #work/lumen opens the project
const deep = location.hash.match(/^#work\/(\w+)/);
if (deep) {
  const i = PROJECTS.findIndex((p) => p.title.toLowerCase() === deep[1]);
  if (i >= 0) setTimeout(() => openCase(i, innerWidth / 2, innerHeight / 2), 1900);
}
