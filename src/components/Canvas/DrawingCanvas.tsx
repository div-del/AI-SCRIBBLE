import { useEffect, useRef } from 'react';
import { DrawCommand } from '@/types';

interface Props {
  commands: DrawCommand[];
}

export default function DrawingCanvas({ commands }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    svg.innerHTML = ''; // Clear previous commands

    commands.forEach((cmd, index) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', cmd.data);
      path.setAttribute('stroke', cmd.color);
      path.setAttribute('stroke-width', cmd.strokeWidth.toString());
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');

      // Animation
      path.style.strokeDasharray = '1000';
      path.style.strokeDashoffset = '1000';
      path.style.animation = `drawPath ${cmd.duration}ms ease-in-out ${index * 100}ms forwards`;

      svg.appendChild(path);
    });
  }, [commands]);

  return (
    <div className="flex justify-center">
      <div className="relative">
        <svg
          ref={svgRef}
          width="400"
          height="400"
          viewBox="0 0 400 400"
          className="border-4 border-white/30 rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 shadow-2xl"
        />
        <div className="absolute inset-0 border-4 border-white/20 rounded-2xl pointer-events-none"></div>
      </div>
      <style jsx>{`
        @keyframes drawPath {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}