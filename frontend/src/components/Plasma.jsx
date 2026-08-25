import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";

// Adapted from React Bits' open-source Plasma background.
// https://reactbits.dev/backgrounds/plasma
const vertex = `#version 300 es
precision highp float;
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uSpeed;
uniform float uScale;
uniform float uOpacity;
uniform vec2 uMouse;
uniform vec2 uMouseSmooth;
out vec4 fragColor;

bool finiteValue(float value) {
  return !(isnan(value) || isinf(value));
}

vec3 safeColor(vec3 color) {
  return vec3(
    finiteValue(color.r) ? color.r : 0.0,
    finiteValue(color.g) ? color.g : 0.0,
    finiteValue(color.b) ? color.b : 0.0
  );
}

void mainImage(out vec4 outputColor, vec2 coordinate) {
  vec2 center = iResolution * 0.5;
  vec2 cursor = (uMouseSmooth - center) / max(iResolution.y, 1.0);
  coordinate = (coordinate - center) / uScale + center;
  coordinate += cursor * length(coordinate - center) * 0.22;

  float iteration = 0.0;
  float distanceField = 0.0;
  float depth = 0.0;
  float time = iTime * uSpeed;
  vec3 accumulated = vec3(0.0);
  vec3 point;
  vec3 source;

  for (vec2 resolution = iResolution, rotated; ++iteration < 52.0; accumulated += outputColor.w / distanceField * outputColor.xyz) {
    point = depth * normalize(vec3(coordinate - 0.5 * resolution, resolution.y));
    point.z -= 4.0;
    source = point;
    distanceField = point.y - time;
    point.x += 0.4 * (1.0 + point.y) * sin(distanceField + point.x * 0.1) * cos(0.34 * distanceField + point.x * 0.05);
    rotated = point.xz *= mat2(cos(point.y + vec4(0.0, 11.0, 33.0, 0.0) - time));
    depth += distanceField = abs(sqrt(length(rotated * rotated)) - 0.25 * (5.0 + source.y)) / 3.0 + 0.0008;
    outputColor = 1.0 + sin(source.y + point.z * 0.5 + source.z - length(source - point) + vec4(2.0, 1.0, 0.0, 8.0));
  }

  outputColor.xyz = tanh(accumulated / 10000.0);
}

void main() {
  vec4 plasma = vec4(0.0);
  mainImage(plasma, gl_FragCoord.xy);
  vec3 raw = safeColor(plasma.rgb);
  float intensity = clamp((raw.r + raw.g + raw.b) / 2.2, 0.0, 1.0);
  float cursorDistance = distance(gl_FragCoord.xy, uMouseSmooth) / max(iResolution.y, 1.0);
  float cursorGlow = smoothstep(0.48, 0.0, cursorDistance);
  vec3 palette = mix(uColorA, uColorB, clamp(intensity + cursorGlow * 0.32, 0.0, 1.0));
  vec3 finalColor = palette * (0.45 + intensity * 0.75 + cursorGlow * 0.2);
  float alpha = clamp((intensity * 0.82 + cursorGlow * 0.18) * uOpacity, 0.0, 0.9);
  fragColor = vec4(finalColor, alpha);
}`;

function hexToRgb(hex) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return [1, 1, 1];
  return [
    Number.parseInt(match[1], 16) / 255,
    Number.parseInt(match[2], 16) / 255,
    Number.parseInt(match[3], 16) / 255,
  ];
}

export default function Plasma({
  colorA = "#E8798A",
  colorB = "#5FBDB0",
  speed = 0.7,
  scale = 1.15,
  opacity = 0.72,
  mouseInteractive = true,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let renderer;
    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: true,
        antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, 1.35),
      });
    } catch {
      return undefined;
    }

    const gl = renderer.gl;
    const canvas = gl.canvas;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uColorA: { value: new Float32Array(hexToRgb(colorA)) },
        uColorB: { value: new Float32Array(hexToRgb(colorB)) },
        uSpeed: { value: speed * 0.4 },
        uScale: { value: scale },
        uOpacity: { value: opacity },
        uMouse: { value: new Float32Array([0, 0]) },
        uMouseSmooth: { value: new Float32Array([0, 0]) },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    function resize() {
      const bounds = container.getBoundingClientRect();
      renderer.setSize(Math.max(1, bounds.width * 0.68), Math.max(1, bounds.height * 0.68));
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      program.uniforms.iResolution.value[0] = gl.drawingBufferWidth;
      program.uniforms.iResolution.value[1] = gl.drawingBufferHeight;
      if (!program.uniforms.uMouse.value[0]) {
        program.uniforms.uMouse.value[0] = gl.drawingBufferWidth * 0.5;
        program.uniforms.uMouse.value[1] = gl.drawingBufferHeight * 0.5;
        program.uniforms.uMouseSmooth.value.set(program.uniforms.uMouse.value);
      }
    }

    function handlePointerMove(event) {
      if (!mouseInteractive) return;
      const bounds = container.getBoundingClientRect();
      program.uniforms.uMouse.value[0] = ((event.clientX - bounds.left) / bounds.width) * gl.drawingBufferWidth;
      program.uniforms.uMouse.value[1] = (1 - (event.clientY - bounds.top) / bounds.height) * gl.drawingBufferHeight;
    }

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    resize();

    let animationFrame;
    const startedAt = performance.now();
    function render(now) {
      const target = program.uniforms.uMouse.value;
      const smooth = program.uniforms.uMouseSmooth.value;
      smooth[0] += (target[0] - smooth[0]) * 0.075;
      smooth[1] += (target[1] - smooth[1]) * 0.075;
      program.uniforms.iTime.value = reduceMotion ? 0 : (now - startedAt) * 0.001;
      renderer.render({ scene: mesh });
      if (!reduceMotion) animationFrame = window.requestAnimationFrame(render);
    }
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      if (canvas.parentElement === container) container.removeChild(canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [colorA, colorB, mouseInteractive, opacity, scale, speed]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden" aria-hidden="true" />;
}
