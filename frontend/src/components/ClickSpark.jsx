import { useCallback, useEffect, useRef } from "react";

// Adapted from React Bits' open-source Click Spark component.
// https://reactbits.dev/animations/click-spark
export default function ClickSpark({
  sparkColors = ["#FFD88A", "#E8798A", "#FFFFFF"],
  sparkSize = 12,
  sparkRadius = 28,
  sparkCount = 10,
  duration = 520,
  easing = "ease-out",
  extraScale = 1,
  children,
}) {
  const canvasRef = useRef(null);
  const sparksRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return undefined;

    let resizeTimeout;
    const resizeCanvas = () => {
      const { width, height } = parent.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const context = canvas.getContext("2d");
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const handleResize = () => {
      window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(resizeCanvas, 100);
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(parent);
    resizeCanvas();

    return () => {
      observer.disconnect();
      window.clearTimeout(resizeTimeout);
    };
  }, []);

  const ease = useCallback(
    (value) => {
      if (easing === "linear") return value;
      if (easing === "ease-in") return value * value;
      if (easing === "ease-in-out") {
        return value < 0.5 ? 2 * value * value : -1 + (4 - 2 * value) * value;
      }
      return value * (2 - value);
    },
    [easing],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext("2d");
    let animationFrame;

    const draw = (timestamp) => {
      const width = Number.parseFloat(canvas.style.width) || canvas.width;
      const height = Number.parseFloat(canvas.style.height) || canvas.height;
      context.clearRect(0, 0, width, height);

      sparksRef.current = sparksRef.current.filter((spark) => {
        const elapsed = timestamp - spark.startTime;
        if (elapsed >= duration) return false;

        const progress = elapsed / duration;
        const eased = ease(progress);
        const distance = eased * sparkRadius * extraScale;
        const lineLength = sparkSize * (1 - eased);
        const startX = spark.x + distance * Math.cos(spark.angle);
        const startY = spark.y + distance * Math.sin(spark.angle);
        const endX = spark.x + (distance + lineLength) * Math.cos(spark.angle);
        const endY = spark.y + (distance + lineLength) * Math.sin(spark.angle);

        context.save();
        context.globalAlpha = 1 - progress;
        context.strokeStyle = spark.color;
        context.shadowColor = spark.color;
        context.shadowBlur = 8;
        context.lineWidth = 2.2;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(startX, startY);
        context.lineTo(endX, endY);
        context.stroke();
        context.restore();
        return true;
      });

      animationFrame = window.requestAnimationFrame(draw);
    };

    animationFrame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [duration, ease, extraScale, sparkRadius, sparkSize]);

  function handleClick(event) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const startTime = performance.now();
    const nextSparks = Array.from({ length: sparkCount }, (_, index) => ({
      x,
      y,
      angle: (Math.PI * 2 * index) / sparkCount,
      startTime,
      color: sparkColors[index % sparkColors.length],
    }));
    sparksRef.current.push(...nextSparks);
  }

  return (
    <div className="relative min-h-full" onClick={handleClick}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-50"
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
