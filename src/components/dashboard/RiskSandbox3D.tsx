import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import type { SamplePayload } from '@/lib/api'
import { riskColor, sortedByRisk } from '@/lib/dashboard-utils'
import { AnimatedCard } from '@/components/ui/animated-card'
import { Badge } from '@/components/ui/badge'
import { CardContent } from '@/components/ui/card'
import { SectionTitle } from '@/components/dashboard/SectionTitle'

interface RiskSandbox3DProps {
  samples: SamplePayload[]
  selectedId?: string
  onSelect: (sample: SamplePayload) => void
}

type GeoPosition = [number, number] | [number, number, number]
type GeoRing = GeoPosition[]
type GeoPolygon = GeoRing[]
type GeoMultiPolygon = GeoPolygon[]

interface SichuanFeature {
  type: 'Feature'
  properties?: Record<string, unknown>
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: GeoPolygon | GeoMultiPolygon
  }
}

interface SichuanGeoJSON {
  type: 'FeatureCollection'
  features: SichuanFeature[]
}

interface GeoBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

interface PositionedSample {
  sample: SamplePayload
  x: number
  z: number
}

interface DisposableObject {
  geometry?: { dispose: () => void }
  material?: { dispose: () => void } | Array<{ dispose: () => void }>
}

interface TraversableScene {
  traverse: (visitor: (object: unknown) => void) => void
}

interface RotatingRing {
  rotation: { z: number }
  userData: { rotationSpeed: number }
}

type ProjectLonLat = (lon: number, lat: number, y?: number) => InstanceType<typeof THREE.Vector3>

const MAP_SURFACE_Y = 0.04
const MAP_EXTRUDE_DEPTH = 0.28

function clamp01(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function isMappableSample(sample: SamplePayload) {
  return Number.isFinite(sample.longitude) && Number.isFinite(sample.latitude)
}

function geometryToPolygons(feature: SichuanFeature): GeoPolygon[] {
  if (feature.geometry.type === 'Polygon') return [feature.geometry.coordinates as GeoPolygon]
  return feature.geometry.coordinates as GeoMultiPolygon
}

function lonLatToMercator(lon: number, lat: number) {
  const longitude = (lon * Math.PI) / 180
  const latitude = Math.max(-85, Math.min(85, lat))
  const sinLat = Math.sin((latitude * Math.PI) / 180)

  return {
    x: longitude,
    y: Math.log((1 + sinLat) / (1 - sinLat)) / 2,
  }
}

function collectBoundsFromGeo(geojson: SichuanGeoJSON): GeoBounds {
  const bounds: GeoBounds = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  }

  geojson.features.forEach((feature) => {
    geometryToPolygons(feature).forEach((polygon) => {
      polygon.forEach((ring) => {
        ring.forEach(([lon, lat]) => {
          const point = lonLatToMercator(Number(lon), Number(lat))
          bounds.minX = Math.min(bounds.minX, point.x)
          bounds.maxX = Math.max(bounds.maxX, point.x)
          bounds.minY = Math.min(bounds.minY, point.y)
          bounds.maxY = Math.max(bounds.maxY, point.y)
        })
      })
    })
  })

  return bounds
}

function createProjectLonLat(bounds: GeoBounds): ProjectLonLat {
  const width = Math.max(bounds.maxX - bounds.minX, 0.000001)
  const height = Math.max(bounds.maxY - bounds.minY, 0.000001)
  const scale = 9.2 / Math.max(width, height)
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2

  return (lon: number, lat: number, y = 0) => {
    const point = lonLatToMercator(lon, lat)
    return new THREE.Vector3((point.x - centerX) * scale, y, -(point.y - centerY) * scale)
  }
}

function polygonArea(points: Array<InstanceType<typeof THREE.Vector2>>) {
  let area = 0
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    area += current.x * next.y - next.x * current.y
  }
  return area / 2
}

function ringToShape(ring: GeoRing, projectLonLat: ProjectLonLat) {
  const points = ring
    .map(([lon, lat]) => {
      const point = projectLonLat(Number(lon), Number(lat))
      return new THREE.Vector2(point.x, point.z)
    })
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))

  if (points.length < 3) return null
  if (polygonArea(points) < 0) points.reverse()

  return new THREE.Shape(points)
}

function addGeoFeature(feature: SichuanFeature, projectLonLat: ProjectLonLat, group: InstanceType<typeof THREE.Group>) {
  geometryToPolygons(feature).forEach((polygon) => {
    if (polygon.length === 0) return

    const shape = ringToShape(polygon[0], projectLonLat)
    if (!shape) return

    polygon.slice(1).forEach((ring) => {
      const holePoints = ring
        .map(([lon, lat]) => {
          const point = projectLonLat(Number(lon), Number(lat))
          return new THREE.Vector2(point.x, point.z)
        })
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))

      if (holePoints.length > 2) {
        if (polygonArea(holePoints) > 0) holePoints.reverse()
        shape.holes.push(new THREE.Path(holePoints))
      }
    })

    const geometry = new THREE.ExtrudeGeometry(shape, { depth: MAP_EXTRUDE_DEPTH, bevelEnabled: false })
    geometry.rotateX(Math.PI / 2)
    geometry.translate(0, MAP_SURFACE_Y - MAP_EXTRUDE_DEPTH, 0)

    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: 0x0c2340,
        emissive: 0x061428,
        emissiveIntensity: 0.48,
        metalness: 0.32,
        roughness: 0.48,
        transparent: true,
        opacity: 0.94,
      })
    )
    mesh.userData.name = feature.properties?.name ?? feature.properties?.fullname ?? '四川区域'
    group.add(mesh)

    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 })
    )
    edge.renderOrder = 2
    group.add(edge)
  })
}

function addOutlineFeature(feature: SichuanFeature, projectLonLat: ProjectLonLat, group: InstanceType<typeof THREE.Group>) {
  geometryToPolygons(feature).forEach((polygon) => {
    polygon.forEach((ring, ringIndex) => {
      const points = ring
        .map(([lon, lat]) => {
          const point = projectLonLat(Number(lon), Number(lat), MAP_SURFACE_Y + 0.02 + ringIndex * 0.002)
          return new THREE.Vector3(point.x, point.y, point.z)
        })
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z))

      if (points.length < 2) return

      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: ringIndex === 0 ? 0.72 : 0.3,
        })
      )
      line.renderOrder = 3
      group.add(line)
    })
  })
}

function positionedSamples(samples: SamplePayload[], projectLonLat: ProjectLonLat): PositionedSample[] {
  return samples.filter(isMappableSample).map((sample) => {
    const point = projectLonLat(sample.longitude, sample.latitude)

    return {
      sample,
      x: point.x,
      z: point.z,
    }
  })
}

function isDisposableObject(object: unknown): object is DisposableObject {
  return typeof object === 'object' && object !== null
}

function disposeScene(scene: TraversableScene) {
  scene.traverse((object: unknown) => {
    if (!isDisposableObject(object)) return
    object.geometry?.dispose()
    if (Array.isArray(object.material)) {
      object.material.forEach((material) => material.dispose())
    } else {
      object.material?.dispose()
    }
  })
}

async function fetchGeoJSON(path: string) {
  const response = await fetch(path)
  if (!response.ok) throw new Error(path + ' 加载失败：' + response.status)
  return (await response.json()) as SichuanGeoJSON
}

export function RiskSandbox3D({ samples, selectedId, onSelect }: RiskSandbox3DProps) {
  const sandboxRef = useRef<HTMLDivElement | null>(null)
  const [geojson, setGeojson] = useState<SichuanGeoJSON | null>(null)
  const [outlineGeojson, setOutlineGeojson] = useState<SichuanGeoJSON | null>(null)
  const [mapAssetError, setMapAssetError] = useState<string | null>(null)
  const geoBounds = useMemo(() => (geojson ? collectBoundsFromGeo(geojson) : null), [geojson])
  const projectLonLat = useMemo(() => (geoBounds ? createProjectLonLat(geoBounds) : null), [geoBounds])
  const positioned = useMemo(() => (projectLonLat ? positionedSamples(samples, projectLonLat) : []), [projectLonLat, samples])
  const top20Ids = useMemo(() => new Set(sortedByRisk(samples).slice(0, 20).map((sample) => sample.sample_id)), [samples])
  const selectedSample = useMemo(() => samples.find((sample) => sample.sample_id === selectedId), [samples, selectedId])

  useEffect(() => {
    let ignore = false

    Promise.all([fetchGeoJSON('/sc.json'), fetchGeoJSON('/sc_outline.json')])
      .then(([shape, outline]) => {
        if (ignore) return
        setGeojson(shape)
        setOutlineGeojson(outline)
        setMapAssetError(null)
      })
      .catch((error: unknown) => {
        if (!ignore) setMapAssetError(error instanceof Error ? error.message : '四川GeoJSON加载失败')
      })

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    const mount = sandboxRef.current
    if (!mount || !geojson || !projectLonLat) return

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x06101f, 8, 24)

    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(8.8, 7.3, 10.8)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.autoRotateSpeed = 0.42
    controls.maxDistance = 21
    controls.minDistance = 7
    controls.target.set(0, 0.62, 0)

    let lastInteractionAt = performance.now()
    const markInteraction = () => {
      lastInteractionAt = performance.now()
      controls.autoRotate = false
    }
    controls.addEventListener('start', markInteraction)
    controls.addEventListener('end', markInteraction)

    scene.add(new THREE.HemisphereLight(0xdffbff, 0x0b2744, 1.55))
    const sun = new THREE.DirectionalLight(0xffffff, 2.9)
    sun.position.set(5, 8, 5)
    scene.add(sun)

    const sideLight = new THREE.DirectionalLight(0x8bdcff, 1.45)
    sideLight.position.set(-7, 4.5, 2.5)
    scene.add(sideLight)

    const ambientGlow = new THREE.PointLight(0x38bdf8, 18, 13)
    ambientGlow.position.set(0, 3.4, 0)
    scene.add(ambientGlow)

    const mapGroup = new THREE.Group()
    geojson.features.forEach((feature) => addGeoFeature(feature, projectLonLat, mapGroup))
    outlineGeojson?.features.forEach((feature) => addOutlineFeature(feature, projectLonLat, mapGroup))
    scene.add(mapGroup)

    const selectableBars: unknown[] = []
    const rotatingRings: RotatingRing[] = []
    positioned.forEach(({ sample, x, z }) => {
      const risk = clamp01(sample.risk_probability)
      const height = Math.max(0.18, risk * 2.8)
      const color = new THREE.Color(riskColor(sample.risk_level))
      const active = selectedId === sample.sample_id
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(active ? 0.095 : 0.068, active ? 0.13 : 0.092, height, 22, 1, true),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: active ? 1.65 : 1.05,
          roughness: 0.22,
          metalness: 0.08,
          transparent: true,
          opacity: active ? 0.98 : 0.78,
        })
      )
      bar.position.set(x, MAP_SURFACE_Y + 0.03 + height / 2, z)
      bar.userData.sample = sample
      scene.add(bar)
      selectableBars.push(bar)

      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(active ? 0.13 : 0.085, 18, 10),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.35, transparent: true, opacity: active ? 0.98 : 0.78 })
      )
      cap.position.set(x, MAP_SURFACE_Y + 0.08 + height, z)
      scene.add(cap)

      if (top20Ids.has(sample.sample_id)) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(active ? 0.31 : 0.24, 0.018, 8, 48),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: active ? 0.96 : 0.72 })
        )
        ring.rotation.x = Math.PI / 2
        ring.position.set(x, MAP_SURFACE_Y + 0.06, z)
        ring.userData.rotationSpeed = active ? 0.026 : 0.016
        scene.add(ring)
        rotatingRings.push(ring as RotatingRing)
      }
    })

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    function updatePointer(event: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    }

    function handleClick(event: MouseEvent) {
      markInteraction()
      updatePointer(event)
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(selectableBars, false)[0]
      const sample = hit?.object.userData.sample as SamplePayload | undefined
      if (sample) onSelect(sample)
    }

    function handlePointerMove(event: MouseEvent) {
      markInteraction()
      updatePointer(event)
      raycaster.setFromCamera(pointer, camera)
      renderer.domElement.style.cursor = raycaster.intersectObjects(selectableBars, false).length > 0 ? 'pointer' : 'grab'
    }

    renderer.domElement.addEventListener('click', handleClick)
    renderer.domElement.addEventListener('pointermove', handlePointerMove)

    const resizeObserver = new ResizeObserver(() => {
      const width = mount.clientWidth
      const height = mount.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    })
    resizeObserver.observe(mount)

    let frameId = 0
    function animate() {
      const elapsed = performance.now() * 0.001
      controls.autoRotate = performance.now() - lastInteractionAt > 5000
      controls.update()

      mapGroup.rotation.y = Math.sin(elapsed * 0.18) * 0.025

      rotatingRings.forEach((ring) => {
        ring.rotation.z += ring.userData.rotationSpeed
      })

      renderer.render(scene, camera)
      frameId = window.requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('click', handleClick)
      renderer.domElement.removeEventListener('pointermove', handlePointerMove)
      controls.removeEventListener('start', markInteraction)
      controls.removeEventListener('end', markInteraction)
      controls.dispose()
      disposeScene(scene)
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [geojson, onSelect, outlineGeojson, positioned, projectLonLat, selectedId, top20Ids])

  const highRiskCount = samples.filter((sample) => sample.risk_level === '高风险' || sample.risk_level === '极高风险').length
  const extremeRiskCount = samples.filter((sample) => sample.risk_level === '极高风险').length

  return (
    <AnimatedCard variant="solid" hover={false} className="overflow-hidden">
      <CardContent className="relative z-10 space-y-4 p-5 lg:p-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/82 p-4 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/14 dark:bg-slate-950/50 lg:flex-row lg:items-center lg:justify-between">
          <SectionTitle
            eyebrow="3D Risk Sandbox"
            title="四川3D数字孪生沙盘"
            description={`严格使用 ${samples.length || '--'} 条 /api/samples 模型输出；光柱位置=样本经纬度，高度=risk_probability×2.8，颜色=风险等级。`}
            action={<Badge className="h-8 rounded-full bg-sky-50 px-4 font-black text-sky-700 ring-1 ring-sky-100 dark:bg-white/10 dark:text-sky-100 dark:ring-white/15">GeoJSON底板</Badge>}
          />
          <div className="grid grid-cols-3 gap-2 text-center lg:min-w-[340px]">
            <div className="rounded-2xl bg-sky-50 px-3 py-2 ring-1 ring-sky-100 dark:bg-white/8 dark:ring-white/12">
              <strong className="block text-xl font-black text-sky-700 dark:text-sky-200">{positioned.length || samples.length}</strong>
              <span className="text-[10px] font-bold text-slate-500 dark:text-white/58">模型点位</span>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100 dark:bg-white/8 dark:ring-white/12">
              <strong className="block text-xl font-black text-emerald-700 dark:text-emerald-200">{geojson?.features.length ?? '--'}</strong>
              <span className="text-[10px] font-bold text-slate-500 dark:text-white/58">四川分区</span>
            </div>
            <div className="rounded-2xl bg-rose-50 px-3 py-2 ring-1 ring-rose-100 dark:bg-white/8 dark:ring-white/12">
              <strong className="block text-xl font-black text-rose-700 dark:text-rose-200">{highRiskCount}</strong>
              <span className="text-[10px] font-bold text-slate-500 dark:text-white/58">高/极高</span>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[24px] bg-[radial-gradient(circle_at_50%_18%,rgba(14,165,233,.28),transparent_34%),radial-gradient(circle_at_78%_22%,rgba(16,185,129,.20),transparent_30%),linear-gradient(135deg,#020617,#071426_48%,#0f172a)]">
          <div ref={sandboxRef} className="h-[500px] w-full lg:h-[520px]" aria-label="四川真实轮廓样本风险三维沙盘" />
          {!geojson || positioned.length === 0 ? (
            <div className="absolute inset-0 grid place-items-center bg-[#081a30]/72 text-sm font-black text-white">
              {mapAssetError ?? '正在加载四川真实轮廓GeoJSON与样本风险评分数据'}
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white/76 p-4 text-xs font-bold leading-5 text-slate-600 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/6 dark:text-white/66 lg:grid-cols-[1.4fr_.9fr]">
          <p>
            数据链路：202条训练样本 → Step133 LogisticElasticNet模型在线预测链路 → /api/samples → Three.js渲染。
            已移除随机装饰点，画面中的立柱/圆点只代表真实样本；蓝色四川GeoJSON仅作为地理底板，不参与风险计算。
          </p>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {['低风险', '中风险', '高风险', '极高风险'].map((level) => (
              <span key={level} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600 dark:bg-white/10 dark:text-white/70">
                <span className="size-2 rounded-full" style={{ backgroundColor: riskColor(level) }} />
                {level}
              </span>
            ))}
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-700 ring-1 ring-rose-100 dark:bg-rose-400/10 dark:text-rose-100 dark:ring-white/10">
              极高风险 {extremeRiskCount}
            </span>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black text-sky-700 ring-1 ring-sky-100 dark:bg-sky-400/10 dark:text-sky-100 dark:ring-white/10">
              当前：{selectedSample?.sample_id ?? '联动选择'}
            </span>
          </div>
        </div>
      </CardContent>
    </AnimatedCard>
  )
}
