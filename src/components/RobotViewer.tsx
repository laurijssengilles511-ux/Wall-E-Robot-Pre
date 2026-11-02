import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { ArrowCounterClockwise, Cube } from '@phosphor-icons/react'
import { asset } from '../content/portfolio'
import { JOINTS, neutralPose, type Pose } from '../content/robot-motion'
import { calibratedPose, defaultSettings, type ViewerSettings } from '../content/robot-settings'
import { advanceDrive, initialDrive, STOP_DRIVE, TRACK_WIDTH, type DriveCommand, type DriveTelemetry, type TrackPath } from '../content/robot-drive'
import { createVehicleVisuals, type HighlightPart } from './vehicle-visuals'

export type ViewerStatus = 'loading' | 'ready' | 'failed'
type View = 'quarter' | 'front' | 'side' | 'back' | 'top'
const INITIAL_POSE = neutralPose(), INITIAL_SETTINGS = defaultSettings()
interface Props { pose?: Pose; settings?: ViewerSettings; drive?: DriveCommand; driveSpeed?: number; follow?: boolean; showArena?: boolean; driveResetToken?: number; highlight?: HighlightPart; onHighlight?: (part: HighlightPart) => void; onStatusChange?: (status: ViewerStatus) => void; onTelemetry?: (value: DriveTelemetry) => void; onDriveStop?: () => void }

function disposeModel(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    geometries.add(object.geometry)
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material)
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
    }
  })
  textures.forEach(texture => texture.dispose()); materials.forEach(material => material.dispose()); geometries.forEach(geometry => geometry.dispose())
}

export default function RobotViewer({ pose = INITIAL_POSE, settings = INITIAL_SETTINGS, drive = STOP_DRIVE, driveSpeed = .12, follow = true, showArena = false, driveResetToken = 0, highlight = null, onHighlight, onStatusChange, onTelemetry, onDriveStop }: Props) {
  const host = useRef<HTMLDivElement>(null), [status, setStatus] = useState<ViewerStatus>('loading'), [view, setView] = useState<View>('quarter')
  const live = useRef({ pose, settings, drive, driveSpeed, follow, showArena, highlight, onTelemetry, onDriveStop })
  live.current = { pose, settings, drive, driveSpeed, follow, showArena, highlight, onTelemetry, onDriveStop }
  const engine = useRef({ pose: () => {}, configure: () => {}, invalidate: () => {}, resetDrive: () => {}, setView: (_view: View) => {} })
  useEffect(() => engine.current.pose(), [pose, settings.calibration])
  useEffect(() => engine.current.configure(), [settings.appearance, highlight, follow, showArena])
  useEffect(() => engine.current.invalidate(), [drive, driveSpeed])
  useEffect(() => engine.current.resetDrive(), [driveResetToken])
  useEffect(() => { onStatusChange?.(status) }, [status, onStatusChange])

  useEffect(() => {
    const container = host.current!, controller = new AbortController()
    let stopped = false, frame = 0, visible = true, previousFrame = 0, previousTelemetry = 0, telemetryKey = ''
    let renderer: THREE.WebGLRenderer | undefined, controls: OrbitControls | undefined
    let resizeObserver: ResizeObserver | undefined, visibilityObserver: IntersectionObserver | undefined, environment: THREE.WebGLRenderTarget | undefined
    let visuals: ReturnType<typeof createVehicleVisuals> | undefined, grid: THREE.GridHelper | undefined, boundary: THREE.LineLoop | undefined
    let keyLight: THREE.DirectionalLight | undefined, vehicle: THREE.Group | undefined
    let driving = initialDrive(), baseYaw = 0, turnLeft = 0, turnRight = 0, targetY = .2, distance = .9, cameraView: View = 'quarter'
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, .005, 30)
    const stopDriving = () => { if (live.current.drive.left || live.current.drive.right) live.current.onDriveStop?.() }
    function report(now: number, force = false) {
      const heading = Math.atan2(Math.sin(driving.heading + baseYaw), Math.cos(driving.heading + baseYaw))
      const value: DriveTelemetry = { x: driving.x, z: driving.z, heading, leftVelocity: driving.leftVelocity, rightVelocity: driving.rightVelocity, boundary: driving.boundary }
      const signature = [value.x, value.z, value.heading, value.leftVelocity, value.rightVelocity].map(number => number.toFixed(5)).join('/') + value.boundary
      const moving = Boolean(live.current.drive.left || live.current.drive.right)
      if (force || (signature !== telemetryKey && (now - previousTelemetry > 80 || !moving))) { telemetryKey = signature; previousTelemetry = now; live.current.onTelemetry?.(value) }
    }
    function invalidate() {
      if (stopped || frame || !visible || document.hidden) return
      frame = requestAnimationFrame(now => {
        frame = 0
        const dt = previousFrame ? Math.min(.05, (now - previousFrame) / 1000) : 0
        previousFrame = now
        const beforeX = driving.x, beforeZ = driving.z, command = live.current.drive
        if (command.left || command.right || driving.leftVelocity || driving.rightVelocity) {
          driving = advanceDrive(driving, command, live.current.driveSpeed, dt, baseYaw)
          if (driving.boundary) { live.current.drive = STOP_DRIVE; live.current.onDriveStop?.() }
        }
        if (vehicle) {
          vehicle.position.set(driving.x, 0, driving.z); vehicle.rotation.y = driving.heading
          if (live.current.follow && controls) { const dx = driving.x - beforeX, dz = driving.z - beforeZ; camera.position.x += dx; camera.position.z += dz; controls.target.x += dx; controls.target.z += dz }
          visuals?.tracks(driving.leftDistance + turnLeft, driving.rightDistance + turnRight)
          if (keyLight) { keyLight.position.set(driving.x - .6, 1.2, driving.z + .8); keyLight.target.position.set(driving.x, 0, driving.z) }
        }
        controls?.update(); renderer?.render(scene, camera); report(now)
        if (live.current.drive.left || live.current.drive.right) invalidate()
      })
    }
    const contextLost = (event: Event) => { event.preventDefault(); stopDriving(); if (!stopped) setStatus('failed'); cancelAnimationFrame(frame); frame = 0; visible = false }
    const visibilityChanged = () => { if (document.hidden) stopDriving(); previousFrame = 0; invalidate() }
    function setCameraView(next: View) {
      if (!controls) return
      cameraView = next
      controls.enableDamping = false; controls.update()
      const centre = new THREE.Vector3(driving.x, targetY, driving.z)
      const offsets = { quarter: new THREE.Vector3(.57, .28, .82), front: new THREE.Vector3(0, .08, 1), side: new THREE.Vector3(1, .08, 0), back: new THREE.Vector3(0, .08, -1), top: new THREE.Vector3(0, 1, .001) }
      const offset = offsets[next].clone().multiplyScalar(distance).applyAxisAngle(new THREE.Vector3(0, 1, 0), driving.heading + baseYaw)
      camera.position.copy(centre).add(offset); controls.target.copy(centre); controls.update(); controls.saveState(); controls.enableDamping = true
      setView(next); invalidate()
    }
    function keyboard(event: KeyboardEvent) {
      if (!controls) return
      const step = Math.PI / 18
      switch (event.key) {
        case 'ArrowLeft': controls.rotateLeft(step); break
        case 'ArrowRight': controls.rotateLeft(-step); break
        case 'ArrowUp': controls.rotateUp(step); break
        case 'ArrowDown': controls.rotateUp(-step); break
        case '+': case '=': controls.dollyIn(1.1); break
        case '-': controls.dollyOut(1.1); break
        case 'Home': setCameraView('quarter'); break
        default: return
      }
      event.preventDefault(); invalidate()
    }
    async function load() {
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75)); renderer.setClearColor('#efeee8')
        renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25
        renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
        const canvas = renderer.domElement
        canvas.tabIndex = 0; canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', '瓦力整机三维模型，可拖动旋转；方向键旋转，加减键缩放，Home 键复位')
        canvas.addEventListener('webglcontextlost', contextLost); canvas.addEventListener('keydown', keyboard); container.appendChild(canvas)
        controls = new OrbitControls(camera, canvas)
        controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = .1
        controls.minPolarAngle = .03; controls.maxPolarAngle = Math.PI / 2 - .04; controls.addEventListener('change', invalidate)
        const studio = new RoomEnvironment(), generator = new THREE.PMREMGenerator(renderer)
        environment = generator.fromScene(studio, .04); scene.environment = environment.texture; studio.dispose(); generator.dispose()
        scene.add(new THREE.HemisphereLight(0xf7f7ef, 0x666351, 2))
        keyLight = new THREE.DirectionalLight(0xffedcf, 3.2); keyLight.position.set(-.6, 1.2, .8); keyLight.castShadow = true
        keyLight.shadow.mapSize.set(1024, 1024); keyLight.shadow.camera.left = keyLight.shadow.camera.bottom = -.6; keyLight.shadow.camera.right = keyLight.shadow.camera.top = .6
        keyLight.shadow.camera.near = .1; keyLight.shadow.camera.far = 4; keyLight.shadow.bias = -.0002; keyLight.shadow.normalBias = .001; keyLight.shadow.radius = 3
        scene.add(keyLight, keyLight.target)
        const fill = new THREE.DirectionalLight(0xd5e6ff, 1.5); fill.position.set(.8, .5, -.6); scene.add(fill)
        resizeObserver = new ResizeObserver(() => {
          if (!renderer || stopped) return
          const { width, height } = container.getBoundingClientRect()
          renderer.setSize(Math.max(width, 1), Math.max(height, 1)); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); invalidate()
        })
        resizeObserver.observe(container)
        visibilityObserver = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; if (!visible) stopDriving(); previousFrame = 0; if (visible) invalidate() })
        visibilityObserver.observe(container); document.addEventListener('visibilitychange', visibilityChanged)
        const [response, trackResponse] = await Promise.all([fetch(asset('portfolio/virtual/walle-assembled.glb'), { signal: controller.signal }), fetch(asset('portfolio/virtual/drive-rig.json'), { signal: controller.signal })])
        if (!response.ok || !trackResponse.ok) throw new Error('模型或履带数据加载失败')
        const [bytes, track] = await Promise.all([response.arrayBuffer(), trackResponse.json() as Promise<TrackPath>])
        if (track.version !== 1 || !Array.isArray(track.pathMm) || track.pathMm.length < 3 || !track.pathMm.every(point => point.length === 2 && point.every(Number.isFinite)) || !Number.isFinite(track.totalMm) || track.totalMm <= 0) throw new Error('履带路径无效')
        if (stopped) return
        const gltf = await new GLTFLoader().parseAsync(bytes, '')
        if (stopped) { disposeModel(gltf.scene); return }
        const model = gltf.scene, bounds = new THREE.Box3().setFromObject(model), centre = bounds.getCenter(new THREE.Vector3())
        model.position.x -= centre.x; model.position.z -= centre.z; model.position.y -= bounds.min.y
        model.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true } })
        vehicle = new THREE.Group(); vehicle.add(model); scene.add(vehicle)
        visuals = createVehicleVisuals(model, track)
        const bindings = JOINTS.flatMap(joint => joint.targets.map(target => {
          const node = model.getObjectByName(target.node)
          if (!node) throw new Error(`Missing joint ${target.node}`)
          return { joint: joint.id, node, rest: node.quaternion.clone(), axis: new THREE.Vector3(target.axis === 'x' ? 1 : 0, target.axis === 'y' ? 1 : 0, target.axis === 'z' ? 1 : 0), factor: target.factor }
        }))
        const delta = new THREE.Quaternion()
        const applyPose = () => {
          const mapped = calibratedPose(live.current.pose, live.current.settings.calibration)
          const nextYaw = THREE.MathUtils.degToRad(mapped.bodyYaw), yawDelta = nextYaw - baseYaw
          turnLeft += TRACK_WIDTH / 2 * yawDelta; turnRight -= TRACK_WIDTH / 2 * yawDelta; baseYaw = nextYaw
          for (const binding of bindings) { delta.setFromAxisAngle(binding.axis, THREE.MathUtils.degToRad(mapped[binding.joint] * binding.factor)); binding.node.quaternion.copy(binding.rest).multiply(delta) }
          visuals?.tracks(driving.leftDistance + turnLeft, driving.rightDistance + turnRight); invalidate()
        }
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.ShadowMaterial({ color: 0x4e4b3d, opacity: .2 }))
        floor.rotation.x = -Math.PI / 2; floor.position.y = -.001; floor.receiveShadow = true; scene.add(floor)
        grid = new THREE.GridHelper(3, 30, 0xb9b7a5, 0xdad9cd); grid.position.y = -.0006; scene.add(grid)
        boundary = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.25, 0, -1.25), new THREE.Vector3(1.25, 0, -1.25), new THREE.Vector3(1.25, 0, 1.25), new THREE.Vector3(-1.25, 0, 1.25)]), new THREE.LineBasicMaterial({ color: 0xb29b60, transparent: true, opacity: .5 })); scene.add(boundary)
        const size = bounds.getSize(new THREE.Vector3()); targetY = size.y * .49
        distance = Math.max(size.y, size.x / Math.min(camera.aspect || 1, 1)) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.38
        controls.minDistance = size.y * .75; controls.maxDistance = Math.max(distance * 2.5, 3)
        const configure = () => {
          visuals?.appearance(live.current.settings.appearance); visuals?.highlight(live.current.highlight)
          if (grid && boundary) grid.visible = boundary.visible = live.current.settings.appearance.grid || live.current.showArena
          if (live.current.follow && controls) { const shift = new THREE.Vector3(driving.x, targetY, driving.z).sub(controls.target); camera.position.add(shift); controls.target.add(shift) }
          invalidate()
        }
        engine.current = { pose: applyPose, configure, invalidate, setView: setCameraView, resetDrive: () => {
          stopDriving(); driving = initialDrive(); turnLeft = 0; turnRight = 0
          vehicle?.position.set(0, 0, 0); if (vehicle) vehicle.rotation.y = 0
          visuals?.tracks(0, 0); setCameraView(cameraView); report(performance.now(), true); invalidate()
        } }
        applyPose(); configure(); setCameraView('quarter'); setStatus('ready'); invalidate()
      } catch (error) { if (!stopped && !controller.signal.aborted) { console.warn('三维模型暂不可用，显示整机预览。', error); setStatus('failed') } }
    }
    void load()
    return () => {
      stopped = true; controller.abort(); cancelAnimationFrame(frame); resizeObserver?.disconnect(); visibilityObserver?.disconnect()
      document.removeEventListener('visibilitychange', visibilityChanged); controls?.dispose()
      engine.current = { pose: () => {}, configure: () => {}, invalidate: () => {}, resetDrive: () => {}, setView: () => {} }
      visuals?.dispose()
      if (grid) { grid.geometry.dispose(); for (const material of Array.isArray(grid.material) ? grid.material : [grid.material]) material.dispose() }
      if (boundary) { boundary.geometry.dispose(); (boundary.material as THREE.Material).dispose() }
      if (renderer) {
        renderer.domElement.removeEventListener('webglcontextlost', contextLost); renderer.domElement.removeEventListener('keydown', keyboard)
        renderer.domElement.remove(); disposeModel(scene); scene.traverse(object => { if (object instanceof THREE.DirectionalLight) object.shadow.dispose() })
        environment?.dispose(); renderer.dispose(); renderer.forceContextLoss()
      }
      scene.clear()
    }
  }, [])

  const highlightedLabel = highlight === 'tracks' ? '左右履带' : JOINTS.find(joint => joint.id === highlight)?.label
  return <section className="robot-viewer" aria-label="整机交互展示" data-status={status} data-highlight={highlight ?? ''}>
    <div className="viewer-toolbar"><span><Cube size={17} />整机观察</span><div className="viewer-view-controls"><select aria-label="标准视角" value={view} disabled={status !== 'ready'} onChange={event => engine.current.setView(event.target.value as View)}><option value="quarter">三分之四</option><option value="front">正面</option><option value="side">侧面</option><option value="back">背面</option><option value="top">俯视</option></select><button onClick={() => engine.current.setView('quarter')} disabled={status !== 'ready'}><ArrowCounterClockwise size={16} />视角复位</button></div></div>
    <div className="viewer-stage"><img className="viewer-poster" src={asset('portfolio/virtual/poster.png')} alt="瓦力虚拟装配整机，黄色机身、双眼与深灰履带" hidden={status === 'ready'} /><div ref={host} className="viewer-canvas" style={{ visibility: status === 'ready' ? 'visible' : 'hidden' }} aria-hidden={status !== 'ready'} />{status !== 'ready' && <p className="viewer-status" role="status">{status === 'loading' ? '正在加载整机模型…' : '当前显示整机预览，三维查看暂不可用。'}</p>}{highlightedLabel && <button className="viewer-highlight-tag" onClick={() => onHighlight?.(null)}>当前部件：{highlightedLabel} ×</button>}<span className="viewer-stage-label" aria-hidden="true">WALL·E / VIRTUAL ASSEMBLY</span></div>
    <div className="viewer-caption"><span>拖动旋转 · 滚轮缩放 · 触屏双指缩放</span><span>方向键旋转 · ＋/－缩放 · Home 复位</span></div>
  </section>
}
