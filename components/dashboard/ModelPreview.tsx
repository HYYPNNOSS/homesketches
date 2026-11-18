"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

function disposeObject(object: THREE.Object3D) {
  object.traverse(child => {
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose();
    if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
      material.dispose();
    }
  });
}
export function ModelPreview({ url }: { url: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const host = container.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setError("3D preview is unavailable in this browser. Download the model to open it."); setLoading(false); return; }
    let disposed = false;
    let frame = 0;
    setError(""); setLoading(true);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
    camera.position.set(3, 2, 3);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x646854, 3));
    const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(3, 5, 4); scene.add(light);
    const resize = () => {
      renderer.setSize(host.clientWidth, host.clientHeight);
      camera.aspect = host.clientWidth / Math.max(host.clientHeight, 1); camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    new GLTFLoader().load(url, gltf => {
      if (disposed) { disposeObject(gltf.scene); return; }
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3()).length() || 1;
      gltf.scene.position.sub(center); scene.add(gltf.scene);
      camera.position.set(size, size * 0.65, size); controls.target.set(0, 0, 0); controls.update();
      setLoading(false);
    }, undefined, () => { if (!disposed) { setLoading(false); setError("Could not load the 3D preview. Download the model to open it."); } });
    const tick = () => { frame = requestAnimationFrame(tick); controls.update(); renderer.render(scene, camera); }; tick();
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); disposeObject(scene); renderer.dispose(); renderer.domElement.remove(); };
  }, [url]);
  return <div className="model-preview"><div className="model-preview-canvas" ref={container} />{loading && <p role="status">Loading model…</p>}{error && <p role="alert">{error}</p>}<small>Drag to orbit · scroll to zoom</small></div>;
}
