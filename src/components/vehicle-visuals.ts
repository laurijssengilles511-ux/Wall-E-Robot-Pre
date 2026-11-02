import * as THREE from 'three'
import { JOINTS, type JointId } from '../content/robot-motion'
import { sampleTrack, type TrackPath } from '../content/robot-drive'
import type { Appearance } from '../content/robot-settings'

export type HighlightPart = JointId | 'tracks' | null

function wearTexture(original: THREE.Texture): THREE.Texture | null {
  const image = original.image as HTMLImageElement | ImageBitmap
  if (!image?.width || !image?.height) return null
  try {
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height), values = pixels.data
    let maximum = 1
    for (let i = 0; i < values.length; i += 4) maximum = Math.max(maximum, values[i] * .2126 + values[i + 1] * .7152 + values[i + 2] * .0722)
    for (let i = 0; i < values.length; i += 4) {
      const value = Math.round(255 * (values[i] * .2126 + values[i + 1] * .7152 + values[i + 2] * .0722) / maximum)
      values[i] = values[i + 1] = values[i + 2] = value
    }
    context.putImageData(pixels, 0, 0)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace; texture.flipY = original.flipY
    texture.wrapS = original.wrapS; texture.wrapT = original.wrapT
    return texture
  } catch { return null }
}

export function createVehicleVisuals(model: THREE.Object3D, path: TrackPath) {
  const moving: { mesh: THREE.Mesh; side: 'left' | 'right'; rest: THREE.Quaternion; kind: 'link' | 'wheel'; phase: number; angle: number; radius: number }[] = []
  const materials = new Set<THREE.MeshStandardMaterial>(), retiredTextures = new Set<THREE.Texture>()
  const highlighted: { mesh: THREE.Mesh; original: THREE.Material | THREE.Material[]; clones: THREE.Material[] }[] = []
  let active: HighlightPart = null
  let lastLeft = NaN, lastRight = NaN
  model.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material instanceof THREE.MeshStandardMaterial) materials.add(material)
    if (node.userData.drive_kind) moving.push({ mesh: node, side: node.userData.drive_side, kind: node.userData.drive_kind, phase: node.userData.drive_phase_mm ?? 0, angle: node.userData.drive_angle_rad ?? 0, radius: node.userData.drive_radius_mm ?? 21, rest: node.quaternion.clone() })
  })
  if (moving.filter(item => item.kind === 'link').length !== 210) throw new Error('履带动画节点不完整')
  const mapCache = new Map<THREE.Texture, THREE.Texture>()
  for (const material of materials) {
    if (!/^(ochre|track)(\.|$)/.test(material.name) || !material.map) continue
    const original = material.map
    let map = mapCache.get(original)
    if (!map) { const created = wearTexture(original); if (created) { map = created; mapCache.set(original, map) } }
    if (map) { material.map = map; material.needsUpdate = true; retiredTextures.add(original) }
  }
  const restoreHighlight = () => {
    for (const entry of highlighted) { entry.mesh.material = entry.original; entry.clones.forEach(material => material.dispose()) }
    highlighted.length = 0
  }
  function highlight(part: HighlightPart) {
    restoreHighlight(); active = part
    if (!part) return
    const selected = new Set<THREE.Mesh>()
    if (part === 'tracks') { for (const item of moving) selected.add(item.mesh) }
    else for (const target of JOINTS.find(joint => joint.id === part)!.targets) model.getObjectByName(target.node)?.traverse(node => { if (node instanceof THREE.Mesh) selected.add(node) })
    for (const mesh of selected) {
      const original = mesh.material, clones = (Array.isArray(original) ? original : [original]).map(material => {
        const clone = material.clone()
        if (clone instanceof THREE.MeshStandardMaterial) { clone.emissive.set('#e0a630'); clone.emissiveIntensity = .08 }
        return clone
      })
      mesh.material = Array.isArray(original) ? clones : clones[0]
      highlighted.push({ mesh, original, clones })
    }
  }
  return {
    highlight,
    appearance(next: Appearance) {
      const part = active; restoreHighlight()
      for (const material of materials) {
        if (/^ochre(\.|$)/.test(material.name)) material.color.set(next.body)
        else if (/^track(\.|$)/.test(material.name)) material.color.set(next.tracks)
        else if (/^lens(\.|$)/.test(material.name)) material.color.set(next.lens)
      }
      highlight(part)
    },
    tracks(leftMetres: number, rightMetres: number) {
      if (leftMetres === lastLeft && rightMetres === lastRight) return
      lastLeft = leftMetres; lastRight = rightMetres
      const axis = new THREE.Vector3(1, 0, 0), delta = new THREE.Quaternion()
      for (const item of moving) {
        const mm = (item.side === 'left' ? leftMetres : rightMetres) * 1000
        if (item.kind === 'link') {
          const sample = sampleTrack(path, item.phase + mm)
          item.mesh.position.y = sample.z; item.mesh.position.z = -sample.y
          delta.setFromAxisAngle(axis, sample.angle - item.angle)
        } else delta.setFromAxisAngle(axis, mm / item.radius)
        item.mesh.quaternion.copy(item.rest).premultiply(delta)
      }
    },
    dispose() { restoreHighlight(); retiredTextures.forEach(texture => texture.dispose()) },
  }
}
