import React from 'react';

export default function VisualBin({
  fillPercentage = 0,
  distanceCm = 40.0,
  status = 'LOW',
  sensorValid = true,
  isOnline = true,
  emptyDistance = 40.0,
  fullDistance = 5.0,
  isSimulating = true
}) {
  const normStatus = (status || 'LOW').toUpperCase();
  const clampedFill = fillPercentage !== null ? Math.min(100, Math.max(0, fillPercentage)) : 0;

  // Determine color class
  let fillClass = 'low';
  if (!sensorValid || normStatus === 'SENSOR ERROR') {
    fillClass = 'error';
  } else if (clampedFill >= 95 || normStatus === 'FULL') {
    fillClass = 'full';
  } else if (clampedFill >= 80 || normStatus === 'HIGH') {
    fillClass = 'high';
  } else if (clampedFill >= 50 || normStatus === 'MEDIUM') {
    fillClass = 'medium';
  }

  // Calculate waste height in pixels (max usable height inside bin shell is approx 250px)
  const wasteHeightPx = sensorValid && isOnline ? (clampedFill / 100) * 250 : 0;

  return (
    <div className="bin-graphic-wrapper">
      {/* HC-SR04 Ultrasonic Sensor Module */}
      <div className="sensor-device" title="HC-SR04 Ultrasonic Distance Sensor">
        {/* Transmitter Transducer */}
        <div className="sensor-transducer" title="Transmitter (40 kHz Ping)">
          <span className="transducer-label">T</span>
        </div>
        
        {/* Crystal Oscillator */}
        <div className="crystal-oscillator" />

        {/* Receiver Transducer */}
        <div className="sensor-transducer" title="Receiver (Echo Pulse)">
          <span className="transducer-label">R</span>
        </div>
      </div>

      {/* Ultrasonic Sound Wave Cones (Active when sensor is online and functioning) */}
      {sensorValid && isOnline && isSimulating && (
        <div className="sound-beam">
          <div className="wave-ring" />
          <div className="wave-ring" />
          <div className="wave-ring" />
          <div className="wave-ring" />
        </div>
      )}

      {/* Bin Ruler / Height Markers */}
      <div className="bin-ticks">
        <span>{fullDistance} cm (100%)</span>
        <span>{((emptyDistance + fullDistance) / 2).toFixed(1)} cm (50%)</span>
        <span>{emptyDistance} cm (0%)</span>
      </div>

      {/* Bin Shell Container */}
      <div className="bin-shell">
        {/* Dynamic Waste Level */}
        <div
          className={`waste-mass ${fillClass}`}
          style={{
            height: `${wasteHeightPx}px`
          }}
        >
          {wasteHeightPx > 35 && (
            <span className="waste-label">
              {sensorValid && fillPercentage !== null ? `${clampedFill}%` : 'FAULT'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
