'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ProductBrainScene() {
  const hostRef = useRef(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    camera.position.set(0, 0.2, 8)

    const group = new THREE.Group()
    scene.add(group)

    const coreGeometry = new THREE.IcosahedronGeometry(1.55, 2)
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c2c2c,
      roughness: 0.32,
      metalness: 0.72,
      wireframe: true,
    })
    const core = new THREE.Mesh(coreGeometry, coreMaterial)
    group.add(core)

    const nodeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0f0f0,
      roughness: 0.35,
      metalness: 0.25,
    })
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: 0xb7a36a,
      roughness: 0.3,
      metalness: 0.45,
    })
    const nodeGeometry = new THREE.SphereGeometry(0.08, 18, 18)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.42,
    })

    const nodes = [
      [-2.4, 1.1, 0.3],
      [2.5, 0.9, -0.2],
      [-1.7, -1.75, 0.55],
      [1.85, -1.5, 0.35],
      [0.1, 2.25, -0.4],
      [0.45, -2.35, -0.25],
      [-2.8, -0.15, -0.65],
      [2.85, -0.05, -0.45],
    ]

    nodes.forEach((position, index) => {
      const mesh = new THREE.Mesh(nodeGeometry, index % 3 === 0 ? accentMaterial : nodeMaterial)
      mesh.position.set(...position)
      group.add(mesh)

      const points = [new THREE.Vector3(...position), new THREE.Vector3(0, 0, 0)]
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial)
      group.add(line)
    })

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x1f1f1f,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    })
    const rings = [2.3, 3.05, 3.65].map((radius, index) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius + 0.01, 96), ringMaterial)
      ring.rotation.x = Math.PI / 2.5
      ring.rotation.y = index * 0.42
      group.add(ring)
      return ring
    })

    scene.add(new THREE.AmbientLight(0xffffff, 1.6))
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.1)
    keyLight.position.set(3, 4, 5)
    scene.add(keyLight)
    const goldLight = new THREE.PointLight(0xd7bd75, 9, 10)
    goldLight.position.set(-2.5, 1.5, 3.5)
    scene.add(goldLight)

    const pointer = { x: 0, y: 0 }
    const onPointerMove = (event) => {
      const rect = host.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2
    }

    const resize = () => {
      const rect = host.getBoundingClientRect()
      renderer.setSize(rect.width, rect.height, false)
      camera.aspect = rect.width / Math.max(rect.height, 1)
      camera.updateProjectionMatrix()
    }

    let frameId
    const startedAt = performance.now()
    const animate = () => {
      const elapsed = (performance.now() - startedAt) / 1000
      group.rotation.y = elapsed * 0.19 + pointer.x * 0.16
      group.rotation.x = -0.12 + Math.sin(elapsed * 0.55) * 0.05 - pointer.y * 0.1
      core.rotation.z = elapsed * 0.22
      rings.forEach((ring, index) => {
        ring.rotation.z = elapsed * (0.08 + index * 0.035)
      })
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }

    resize()
    animate()
    window.addEventListener('resize', resize)
    host.addEventListener('pointermove', onPointerMove)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
      host.removeEventListener('pointermove', onPointerMove)
      renderer.dispose()
      coreGeometry.dispose()
      nodeGeometry.dispose()
      coreMaterial.dispose()
      nodeMaterial.dispose()
      accentMaterial.dispose()
      lineMaterial.dispose()
      ringMaterial.dispose()
      host.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={hostRef}
      className="brain-scene"
      aria-label="Interactive 3D model of workspace knowledge flowing into SynapseIQ"
    />
  )
}
