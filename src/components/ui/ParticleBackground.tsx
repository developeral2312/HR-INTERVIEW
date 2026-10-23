import React from 'react';
import './ParticleBackground.css';

interface ParticleBackgroundProps {
  isVisible?: boolean;
}

const ParticleBackground: React.FC<ParticleBackgroundProps> = ({ isVisible = true }) => {
  return (
    <div className={`particle-container ${!isVisible ? 'hidden' : ''}`}>
      {/* Subtle ambient lighting gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[450px] h-[300px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      
      {Array.from({ length: 24 }).map((_, index) => {
        const size = Math.random() * 3 + 2; // Subtle 2-5px glowing micro-orbs
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        const delay = Math.random() * 5;
        const duration = Math.random() * 6 + 8; // Gentle slow float (8-14s)
        
        return (
          <div
            key={index}
            className="particle"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              left: `${left}%`,
              top: `${top}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
    </div>
  );
};

export default ParticleBackground; 