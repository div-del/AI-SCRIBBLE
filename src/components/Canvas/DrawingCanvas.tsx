import { useEffect, useRef } from 'react';
import { DrawCommand } from '@/types';

interface Props {
  commands: DrawCommand[];
  image?: string | null;
}

export default function DrawingCanvas({ commands, image }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current;

    // If we have an override image (SVG string), inject it
    if (image) {
      // Basic sanitization/check could go here. 
      // Assuming backend sends valid SVG or we inject it safely.
      // If it's a full SVG string, we might need to parse or replace innerHTML.
      // If it's pure standard SVG content without <svg> tag, innerHTML is fine.
      // If it's a full <svg> tag, we might want to replace the whole node or just inner content.
      // The backend uses sharp to generate SVG. It usually wraps in <svg>.
      // Let's assume we replace the inner content if it's path data, or if it's a full SVG, we might need a container.
      // To be safe and simple: If image starts with <svg, we render it as a data uri or just use a div wrapper.
      // Actually simpler: Just set innerHTML, but if it has <svg> tag, it nests svgs.
      // Let's rely on the image being "content" or handle if it's base64 PNG.

      if (image.startsWith('data:image')) {
        // It's a base64 image (PNG probably)
        svg.innerHTML = '';
        const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        img.setAttribute('href', image);
        img.setAttribute('width', '100%');
        img.setAttribute('height', '100%');
        svg.appendChild(img);
        return;
      } else if (image.trim().startsWith('<svg')) {
        // It's a full SVG string. We can't easily put <svg> inside <svg> (valid but maybe sizing issues).
        // Better to put it in a container DIV above the SVG or replace the SVG.
        // Let's handle this in the return JSX.
      } else {
        // Assume it's SVG inner content (paths)
        svg.innerHTML = image;
        return;
      }
    }

    svg.innerHTML = ''; // Clear previous commands if no image or fallback

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
  }, [commands, image]);

  return (
    <div className="flex justify-center">
      <div className="relative w-[400px] h-[400px]">
        {image && image.trim().startsWith('<svg') ? (
          <div
            className="absolute inset-0 w-full h-full border-4 border-white/30 rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 shadow-2xl overflow-hidden [&>svg]:w-full [&>svg]:h-full"
            dangerouslySetInnerHTML={{ __html: image }}
          />
        ) : (
          <svg
            ref={svgRef}
            width="400"
            height="400"
            viewBox="0 0 400 400"
            className="w-full h-full border-4 border-white/30 rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 shadow-2xl"
          />
        )}
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