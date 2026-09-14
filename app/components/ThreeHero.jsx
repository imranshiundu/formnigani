'use client';

import { useEffect, useRef } from 'react';

// Brand-colored particle wave, lazy-loaded (next/dynamic, ssr:false) so the
// three.js bundle never touches the initial page load. Static gradient when
// the user prefers reduced motion.
export default function ThreeHero({ className = '' }) {
  const mount = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      const el = mount.current;
      if (!el || cancelled) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const THREE = await import('three');

      const w = el.clientWidth || 300;
      const h = el.clientHeight || 300;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h);
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
      camera.position.z = 7;

      // Particle wave
      const COUNT = 900;
      const pos = new Float32Array(COUNT * 3);
      const base = new Float32Array(COUNT * 2);
      for (let i = 0; i < COUNT; i++) {
        const x = (Math.random() - 0.5) * 12;
        const y = (Math.random() - 0.5) * 8;
        pos[i * 3] = x;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 3;
        base[i * 2] = x;
        base[i * 2 + 1] = y;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.055,
        transparent: true,
        opacity: 0.9,
        vertexColors: false,
        color: new THREE.Color('#F07BE8'),
        depthWrite: false,
      });
      const points = new THREE.Points(geo, mat);
      scene.add(points);

      // Soft glow orbs
      const orbGeo = new THREE.SphereGeometry(1, 24, 24);
      const orb1 = new THREE.Mesh(
        orbGeo,
        new THREE.MeshBasicMaterial({ color: '#D637C0', transparent: true, opacity: 0.35 })
      );
      orb1.position.set(-2.6, 1.6, -2.5);
      orb1.scale.setScalar(1.6);
      const orb2 = new THREE.Mesh(
        orbGeo,
        new THREE.MeshBasicMaterial({ color: '#5C1366', transparent: true, opacity: 0.5 })
      );
      orb2.position.set(2.8, -1.4, -2.5);
      orb2.scale.setScalar(2.1);
      scene.add(orb1, orb2);

      let mx = 0;
      let my = 0;
      const onMove = (e) => {
        const r = el.getBoundingClientRect();
        mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        my = ((e.clientY - r.top) / r.height - 0.5) * 2;
      };
      window.addEventListener('pointermove', onMove, { passive: true });

      const clock = new THREE.Clock();
      let raf = 0;
      const render = () => {
        const t = clock.getElapsedTime();
        const p = geo.attributes.position.array;
        for (let i = 0; i < COUNT; i++) {
          p[i * 3 + 1] = base[i * 2 + 1] + Math.sin(t * 0.9 + base[i * 2] * 0.9) * 0.28;
          p[i * 3] = base[i * 2] + Math.cos(t * 0.5 + base[i * 2 + 1]) * 0.12;
        }
        geo.attributes.position.needsUpdate = true;
        points.rotation.z = Math.sin(t * 0.12) * 0.08 + mx * 0.06;
        points.rotation.x = my * 0.06;
        orb1.position.y = 1.6 + Math.sin(t * 0.6) * 0.25;
        orb2.position.y = -1.4 + Math.cos(t * 0.5) * 0.25;
        renderer.render(scene, camera);
      };

      if (reduce) {
        render();
      } else {
        const loop = () => {
          render();
          raf = requestAnimationFrame(loop);
        };
        loop();
      }

      const onResize = () => {
        const nw = el.clientWidth || 300;
        const nh = el.clientHeight || 300;
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      };
      window.addEventListener('resize', onResize);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('resize', onResize);
        geo.dispose();
        mat.dispose();
        orbGeo.dispose();
        renderer.dispose();
        el.removeChild(renderer.domElement);
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return <div ref={mount} className={`three-hero ${className}`} aria-hidden="true" />;
}
