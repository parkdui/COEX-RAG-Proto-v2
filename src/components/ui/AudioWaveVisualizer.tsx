'use client';

import React, { useEffect, useRef, useState } from 'react';

interface AudioWaveVisualizerProps {
  stream: MediaStream | null;
  isActive: boolean;
}

export default function AudioWaveVisualizer({ stream, isActive }: AudioWaveVisualizerProps) {
  const [amplitudes, setAmplitudes] = useState<number[]>([0, 0, 0, 0]);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || !isActive) {
      setAmplitudes([0, 0, 0, 0]);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({
        sampleRate: 16000,
        latencyHint: 'interactive'
      });
      
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 32; // 작은 값으로 빠른 반응
      analyser.smoothingTimeConstant = 0.3; // 부드러운 애니메이션
      
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateAmplitudes = () => {
        if (!analyserRef.current || !isActive) {
          return;
        }

        analyserRef.current.getByteFrequencyData(dataArray);
        
        // 4개의 line을 위한 amplitude 값 계산
        // 전체 주파수 대역을 4개로 나누어 각 line의 amplitude 계산
        const newAmplitudes: number[] = [];
        const chunkSize = Math.floor(dataArray.length / 4);
        
        for (let i = 0; i < 4; i++) {
          const start = i * chunkSize;
          const end = start + chunkSize;
          let sum = 0;
          let count = 0;
          
          for (let j = start; j < end && j < dataArray.length; j++) {
            sum += dataArray[j];
            count++;
          }
          
          const avg = count > 0 ? sum / count : 0;
          // 0-255 범위를 0-1로 정규화하고, 최소 높이를 보장
          const normalized = Math.max(0.1, avg / 255);
          newAmplitudes.push(normalized);
        }
        
        setAmplitudes(newAmplitudes);
        
        if (isActive) {
          animationFrameRef.current = requestAnimationFrame(updateAmplitudes);
        }
      };

      updateAmplitudes();
    } catch (error) {
      console.error('Audio visualization error:', error);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
    };
  }, [stream, isActive]);

  if (!isActive) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
      style={{
        bottom: '120px', // 입력창 위에 표시
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '12px 16px',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '24px',
      }}
    >
      {amplitudes.map((amplitude, index) => (
        <div
          key={index}
          style={{
            width: '4px',
            height: `${Math.max(8, amplitude * 40)}px`, // 최소 8px, 최대 40px
            background: 'linear-gradient(180deg, rgba(118, 212, 255, 0.8) 0%, rgba(77, 255, 138, 0.8) 100%)',
            borderRadius: '2px',
            transition: 'height 0.1s ease-out',
            minHeight: '8px',
          }}
        />
      ))}
    </div>
  );
}

