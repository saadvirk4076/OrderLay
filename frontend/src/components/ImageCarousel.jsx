import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ImageCarousel = ({ photos, altText }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!photos || photos.length === 0) {
    return (
      <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#9ca3af' }}>No Image</span>
      </div>
    );
  }

  if (photos.length === 1) {
    return (
      <img 
        src={photos[0]} 
        alt={altText} 
        style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }} 
      />
    );
  }

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', overflow: 'hidden' }}>
      <img 
        src={photos[currentIndex]} 
        alt={`${altText} - ${currentIndex + 1}`} 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
      />
      
      <button 
        onClick={handlePrev}
        style={{ position: 'absolute', top: '50%', left: '8px', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)' }}
      >
        <ChevronLeft size={20} />
      </button>
      <button 
        onClick={handleNext}
        style={{ position: 'absolute', top: '50%', right: '8px', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)' }}
      >
        <ChevronRight size={20} />
      </button>

      <div style={{ position: 'absolute', bottom: '12px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '6px' }}>
        {photos.map((_, idx) => (
          <div 
            key={idx} 
            style={{ 
              width: '8px', height: '8px', borderRadius: '50%', 
              background: idx === currentIndex ? 'var(--secondary)' : 'rgba(255,255,255,0.7)',
              transition: 'all 0.2s ease'
            }} 
          />
        ))}
      </div>
    </div>
  );
};

export default ImageCarousel;
