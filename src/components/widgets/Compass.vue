<template>
  <div ref="compassRoot" class="compass">
    <canvas
      ref="canvasRef"
      :height="smallestDimension"
      :width="smallestDimension"
      class="rounded-[15%] bg-slate-950/70"
    ></canvas>
  </div>
  <Dialog v-model:show="widget.managerVars.configMenuOpen" class="w-72">
    <div class="w-full h-full">
      <div class="flex flex-col items-center justify-around">
        <div class="flex items-center justify-between w-full my-1">
          <span class="mr-1 text-slate-100">Heading style</span>
          <div class="w-40"><Dropdown v-model="widget.options.headingStyle" :options="headingOptions" /></div>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import gsap from 'gsap'
import { computed, onBeforeMount, ref, toRefs } from 'vue'

import Dialog from '@/components/Dialog.vue'
import Dropdown from '@/components/Dropdown.vue'
import { degrees, radians, resetCanvas, sequentialArray } from '@/libs/utils'
import { useMainVehicleStore } from '@/stores/mainVehicle'
import type { Widget } from '@/types/widgets'

const store = useMainVehicleStore()
const compassRoot = ref()
const canvasRef = ref<HTMLCanvasElement | undefined>()
const canvasContext = ref()

// Object used to store current render state
const renderVariables = {
  yawAngleDegrees: 0,
}

// Angles used for the main marks
const mainAngles = {
  [0]: 'N',
  [45]: 'NE',
  [90]: 'E',
  [135]: 'SE',
  [180]: 'S',
  [225]: 'SW',
  [270]: 'W',
  [315]: 'NW',
}

/**
 * Possible compass configurations.
 * North-up keeps the cardinal points fixed, while the vehicle rotates.
 * Head-up keeps the vehicle pointing up, while the cardinal points rotate.
 */
enum HeadingStyle {
  NORTH_UP = 'North Up',
  HEAD_UP = 'Head Up',
}
const headingOptions = Object.values(HeadingStyle)

const props = defineProps<{
  /**
   * Widget reference
   */
  widget: Widget
}>()
const widget = toRefs(props).widget

onBeforeMount(() => {
  // Set initial widget options if they don't exist
  if (Object.keys(widget.value.options).length === 0) {
    widget.value.options = {
      headingStyle: headingOptions[0],
    }
  }
})

// Calculates the smallest between the widget dimensions, so we can keep the inner content always inside it, without overlays
const { width, height } = useElementSize(compassRoot)
const smallestDimension = computed(() => (width.value < height.value ? width.value : height.value))

// Renders the updated canvas state
const renderCanvas = (): void => {
  if (canvasRef.value === undefined) return
  if (canvasContext.value === undefined) canvasContext.value = canvasRef.value.getContext('2d')
  const ctx = canvasContext.value
  resetCanvas(ctx)

  const halfCanvasSize = 0.5 * smallestDimension.value

  // Set canvas general properties
  const fontSize = 0.13 * smallestDimension.value
  const baseLineWidth = 0.03 * halfCanvasSize

  ctx.textAlign = 'center'
  ctx.strokeStyle = 'white'
  ctx.font = `bold ${fontSize}px Arial`
  ctx.fillStyle = 'white'
  ctx.lineWidth = baseLineWidth
  ctx.textBaseline = 'middle'

  const outerCircleRadius = 0.7 * halfCanvasSize
  const innerIndicatorRadius = 0.4 * halfCanvasSize
  const outerIndicatorRadius = 0.55 * halfCanvasSize

  // Start drawing from the center
  ctx.translate(halfCanvasSize, halfCanvasSize)

  // Draw central angle text
  ctx.font = `bold ${fontSize}px Arial`
  ctx.fillText(`${renderVariables.yawAngleDegrees.toFixed(0)}°`, 0.15 * fontSize, 0)

  // Set 0 degrees on the top position
  ctx.rotate(radians(-90))

  // Draw line and identification for each cardinal and sub-cardinal angle
  if (widget.value.options.headingStyle == HeadingStyle.HEAD_UP) {
    ctx.rotate(radians(renderVariables.yawAngleDegrees))
  }
  for (const [angleDegrees, angleName] of Object.entries(mainAngles)) {
    ctx.save()

    ctx.rotate(radians(Number(angleDegrees)))
    ctx.beginPath()
    ctx.moveTo(outerIndicatorRadius, 0)
    ctx.lineTo(outerCircleRadius, 0)

    // Draw angle text
    ctx.textBaseline = 'bottom'
    ctx.font = `bold ${0.7 * fontSize}px Arial`
    ctx.translate(outerCircleRadius * 1.025, 0)
    ctx.rotate(radians(90))
    ctx.fillText(angleName, 0, 0)

    ctx.stroke()
    ctx.restore()
  }

  // Draw line for each smaller angle, with 9 degree steps
  for (const angleDegrees of sequentialArray(360)) {
    if (angleDegrees % 9 !== 0) continue
    ctx.save()
    ctx.lineWidth = 0.25 * baseLineWidth
    ctx.rotate(radians(Number(angleDegrees)))
    ctx.beginPath()
    ctx.moveTo(1.1 * outerIndicatorRadius, 0)
    ctx.lineTo(outerCircleRadius, 0)
    ctx.stroke()
    ctx.restore()
  }

  // Draw outer circle
  ctx.beginPath()
  ctx.arc(0, 0, outerCircleRadius, 0, radians(360))
  ctx.stroke()

  // Draw central indicator
  if (widget.value.options.headingStyle == HeadingStyle.NORTH_UP) {
    ctx.rotate(radians(renderVariables.yawAngleDegrees))
  } else {
    ctx.rotate(-radians(renderVariables.yawAngleDegrees))
  }
  ctx.beginPath()
  ctx.lineWidth = 1
  ctx.strokeStyle = 'red'
  ctx.fillStyle = 'red'
  const triangleBaseSize = 0.05 * halfCanvasSize
  ctx.moveTo(innerIndicatorRadius, triangleBaseSize)
  ctx.lineTo(outerIndicatorRadius - 0.5 * triangleBaseSize, 0)
  ctx.lineTo(innerIndicatorRadius, -triangleBaseSize)
  ctx.lineTo(innerIndicatorRadius, triangleBaseSize)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

// Update canvas at 60fps
setInterval(() => {
  const angleDegrees = degrees(store.attitude.yaw ?? 0)
  const fullRangeAngleDegrees = angleDegrees < 0 ? angleDegrees + 360 : angleDegrees

  const fromWestToEast = renderVariables.yawAngleDegrees > 270 && fullRangeAngleDegrees < 90
  const fromEastToWest = renderVariables.yawAngleDegrees < 90 && fullRangeAngleDegrees > 270
  // If cruzing 0 degrees, use a chained animation, so the pointer does not turn 360 degrees to the other side (visual artifact)
  if (fromWestToEast) {
    gsap.to(renderVariables, 0.05, { yawAngleDegrees: 0 })
    gsap.fromTo(renderVariables, 0.05, { yawAngleDegrees: 0 }, { yawAngleDegrees: fullRangeAngleDegrees })
  } else if (fromEastToWest) {
    gsap.to(renderVariables, 0.05, { yawAngleDegrees: 360 })
    gsap.fromTo(renderVariables, 0.05, { yawAngleDegrees: 360 }, { yawAngleDegrees: fullRangeAngleDegrees })
  } else {
    gsap.to(renderVariables, 0.1, { yawAngleDegrees: fullRangeAngleDegrees })
  }
  renderCanvas()
}, 1000 / 60)
</script>

<style scoped>
.compass {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
</style>
