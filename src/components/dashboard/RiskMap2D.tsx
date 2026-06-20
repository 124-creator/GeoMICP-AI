import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type { SamplePayload } from '@/lib/api'
import { riskColor, riskOrder } from '@/lib/dashboard-utils'
import { AnimatedCard } from '@/components/ui/animated-card'
import { Badge } from '@/components/ui/badge'
import { CardContent } from '@/components/ui/card'
import { SectionTitle } from '@/components/dashboard/SectionTitle'

interface RiskMap2DProps {
  samples: SamplePayload[]
  selectedId?: string
  onSelect: (sample: SamplePayload) => void
}

export interface RiskMap2DHandle {
  flyTo: (sample: SamplePayload) => void
}

const LIGHT_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const DARK_TILE_URL = 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png'

function createTileLayer(darkMode: boolean) {
  return L.tileLayer(darkMode ? DARK_TILE_URL : LIGHT_TILE_URL, {
    maxZoom: 18,
    attribution: darkMode ? '&copy; Stadia Maps &copy; OpenMapTiles &copy; OpenStreetMap contributors' : '&copy; OpenStreetMap contributors',
  })
}

function isRootDarkMode() {
  return document.documentElement.classList.contains('dark')
}

function isMappableSample(sample: SamplePayload) {
  return Number.isFinite(sample.longitude) && Number.isFinite(sample.latitude)
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }

    return entities[char] ?? char
  })
}

function popupHtml(sample: SamplePayload, darkMode: boolean) {
  const level = sample.risk_level ?? '未知等级'
  const color = riskColor(level)

  return [
    '<div style="min-width:156px;border-radius:14px;padding:10px 12px;font-family:Inter,system-ui,sans-serif;background:',
    darkMode ? '#0f172a' : '#ffffff',
    ';color:',
    darkMode ? '#f8fafc' : '#0f2743',
    '">',
    '<strong style="display:block;font-size:13px;margin-bottom:6px;color:inherit">样本ID：',
    escapeHtml(sample.sample_id),
    '</strong>',
    '<span style="display:inline-flex;align-items:center;gap:7px;color:',
    color,
    ';font-weight:900;font-size:12px">',
    '<i style="display:inline-block;width:8px;height:8px;border-radius:999px;background:',
    color,
    ';box-shadow:0 0 0 5px ',
    color,
    '22"></i>',
    escapeHtml(level),
    '</span>',
    '</div>',
  ].join('')
}

export const RiskMap2D = forwardRef<RiskMap2DHandle, RiskMap2DProps>(function RiskMap2D({ samples, selectedId, onSelect }, ref) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const fittedSignatureRef = useRef('')
  const [darkTile, setDarkTile] = useState(() => isRootDarkMode())
  const mappableSamples = useMemo(() => samples.filter(isMappableSample), [samples])
  const onlinePredictionCount = useMemo(() => mappableSamples.filter((sample) => sample.offline_demo).length, [mappableSamples])
  const baseSampleCount = Math.max(0, mappableSamples.length - onlinePredictionCount)
  const sampleCountLabel = onlinePredictionCount > 0 ? `${baseSampleCount}样本 + ${onlinePredictionCount}新路段` : `${mappableSamples.length || '--'}样本`
  const sampleSignature = useMemo(
    () => mappableSamples.map((sample) => `${sample.sample_id}:${sample.longitude.toFixed(5)}:${sample.latitude.toFixed(5)}`).join('|'),
    [mappableSamples]
  )

  useImperativeHandle(ref, () => ({
    flyTo(sample) {
      const map = mapRef.current
      if (!map || !isMappableSample(sample)) return

      map.invalidateSize()
      map.flyTo([sample.latitude, sample.longitude], Math.max(map.getZoom(), 8), {
        animate: true,
        duration: 0.85,
      })
    },
  }))

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) return

    const map = L.map(mapNodeRef.current, {
      attributionControl: false,
      center: [30.65, 104.08],
      zoom: 6,
      zoomControl: false,
    })

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    const layer = L.layerGroup().addTo(map)
    mapRef.current = map
    layerRef.current = layer

    window.setTimeout(() => map.invalidateSize(), 80)

    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
      tileLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    const observer = new MutationObserver(() => setDarkTile(isRootDarkMode()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    setDarkTile(isRootDarkMode())

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    tileLayerRef.current?.remove()
    tileLayerRef.current = createTileLayer(darkTile).addTo(map)
  }, [darkTile])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()

    const latLngs: L.LatLngTuple[] = []
    mappableSamples.forEach((sample) => {
      const active = selectedId === sample.sample_id
      const color = riskColor(sample.risk_level)
      const position: L.LatLngTuple = [sample.latitude, sample.longitude]
      latLngs.push(position)

      L.circleMarker(position, {
        color,
        fillColor: color,
        fillOpacity: active ? 0.96 : 0.74,
        opacity: 0.95,
        radius: active ? 8.5 : 5,
        weight: active ? 3 : 1.5,
      })
        .bindPopup(popupHtml(sample, darkTile), {
          autoPan: false,
          closeButton: false,
          className: darkTile ? 'risk-map-popup risk-map-popup-dark' : 'risk-map-popup risk-map-popup-light',
        })
        .on('mouseover', (event) => event.target.openPopup())
        .on('mouseout', (event) => event.target.closePopup())
        .on('click', () => onSelect(sample))
        .addTo(layer)
    })

    if (latLngs.length > 0) {
      if (fittedSignatureRef.current !== sampleSignature) {
        map.fitBounds(L.latLngBounds(latLngs).pad(0.16), { animate: false })
        fittedSignatureRef.current = sampleSignature
      }
    } else {
      fittedSignatureRef.current = ''
      map.setView([30.65, 104.08], 6)
    }

    window.setTimeout(() => map.invalidateSize(), 80)
  }, [darkTile, mappableSamples, onSelect, sampleSignature, selectedId])

  return (
    <AnimatedCard
      variant="solid"
      className="overflow-hidden border-slate-200/80 bg-white/88 shadow-[0_16px_48px_rgba(42,80,130,.12)] backdrop-blur-[18px] dark:border-white/15 dark:bg-slate-950/56 dark:shadow-[0_18px_64px_rgba(2,6,23,.34)]"
    >
      <CardContent className="p-6">
        <SectionTitle
          eyebrow="Risk Map"
          title={`四川${sampleCountLabel}风险地图`}
          description="Leaflet 按经纬度绘制样本点，颜色对应风险等级；悬停弹出样本ID与风险等级，点击联动当前样本。"
          action={
            <Badge className="h-8 rounded-full bg-sky-500/12 px-4 font-black text-sky-700 dark:bg-sky-300/12 dark:text-sky-100">
              {onlinePredictionCount > 0 ? `${baseSampleCount}+${onlinePredictionCount}` : mappableSamples.length} 点
            </Badge>
          }
        />
        <div className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-sky-50 dark:border-white/12 dark:bg-slate-950/80">
          <div ref={mapNodeRef} className="h-[460px] w-full" aria-label="四川样本风险二维地图" />
          {mappableSamples.length === 0 ? (
            <div className="absolute inset-0 grid place-items-center bg-white/70 text-sm font-black text-slate-600 dark:bg-slate-950/72 dark:text-white/72">
              等待四川样本经纬度数据
            </div>
          ) : null}
          <div
            className="absolute bottom-4 left-4 right-4 z-[500] flex flex-wrap gap-2 rounded-2xl border border-white/70 bg-white/88 p-3 shadow-[0_14px_34px_rgba(15,39,67,.12)] backdrop-blur-xl dark:border-white/14 dark:bg-slate-950/78"
          >
            {riskOrder.map((level) => (
              <span
                key={level}
                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm dark:bg-white/10 dark:text-white/82"
              >
                <span className="size-2.5 rounded-full" style={{ backgroundColor: riskColor(level) }} />
                {level}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </AnimatedCard>
  )
})
