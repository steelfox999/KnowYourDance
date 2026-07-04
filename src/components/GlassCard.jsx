import React from 'react';

export default function GlassCard({
  children,
  className = '',
  hoverEffect = false,
  showCorners = true,
  ...props
}) {
  const classes = ['glass-card', hoverEffect ? 'glass-card-interactive' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {showCorners && (
        <>
          <div className="ornament ornament-tl" />
          <div className="ornament ornament-tr" />
          <div className="ornament ornament-bl" />
          <div className="ornament ornament-br" />
        </>
      )}
      {children}
    </div>
  );
}
