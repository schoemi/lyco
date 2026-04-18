"use client";

import { useEffect, useRef } from "react";

interface VuMeterProps {
  /** AnalyserNode from the active AudioContext */
  analyser: AnalyserNode | null;
  /** Whether the meter is active (recording) */
  active: boolean;
}

/**
 * Simple VU meter that visualizes microphone input level.
 * Uses requestAnimationFrame to read from an AnalyserNode.
 */
export function VuMeter({ analyser, active }: VuMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

// eslint-disable-next-line react-hooks/immutability -- AnalyserNode.fftSize is a Web Audio API property, not React state
  useEffect(() => {
    if (!active || !analyser) {
      // Clear canvas when inactive
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Configure analyser – AnalyserNode.fftSize is a Web Audio API property
    // that must be set imperatively; this is not a React state mutation.
    // eslint-disable-next-line react-hooks/immutability
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    // Capture non-null analyser for use in the draw closure
    const activeAnalyser = analyser;

    function draw() {
      rafRef.current = requestAnimationFrame(draw);

      activeAnalyser.getByteFrequencyData(dataArray);

      // Calculate RMS level (0-1)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 255;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / bufferLength);
      const level = Math.min(1, rms * 2.5); // amplify for visibility

      const w = canvas!.width;
      const h = canvas!.height;
      const barCount = 20;
      const barWidth = (w - (barCount - 1) * 2) / barCount;

      ctx!.clearRect(0, 0, w, h);

      for (let i = 0; i < barCount; i++) {
        const threshold = i / barCount;
        const isLit = level > threshold;

        if (isLit) {
          if (i < barCount * 0.6) {
            ctx!.fillStyle = "#22c55e"; // green
          } else if (i < barCount * 0.85) {
            ctx!.fillStyle = "#eab308"; // yellow
          } else {
            ctx!.fillStyle = "#ef4444"; // red
          }
        } else {
          ctx!.fillStyle = "rgba(255, 255, 255, 0.1)";
        }

        const x = i * (barWidth + 2);
        ctx!.fillRect(x, 2, barWidth, h - 4);
      }
    }

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, active]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={16}
      className="rounded"
      aria-label="Mikrofon-Pegel"
      role="meter"
      aria-valuenow={0}
      aria-valuemin={0}
      aria-valuemax={100}
    />
  );
}
