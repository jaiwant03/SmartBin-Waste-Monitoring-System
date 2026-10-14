import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, HelpCircle, WifiOff } from 'lucide-react';

export default function StatusBadge({ status }) {
  const normStatus = (status || 'UNKNOWN').toUpperCase();

  switch (normStatus) {
    case 'LOW':
      return (
        <span className="status-badge low">
          <CheckCircle2 size={13} />
          Safe ({normStatus})
        </span>
      );
    case 'MEDIUM':
      return (
        <span className="status-badge medium">
          <CheckCircle2 size={13} />
          Normal ({normStatus})
        </span>
      );
    case 'HIGH':
      return (
        <span className="status-badge high">
          <AlertTriangle size={13} />
          Collection Needed
        </span>
      );
    case 'FULL':
      return (
        <span className="status-badge full">
          <AlertCircle size={13} />
          Critical Overflow
        </span>
      );
    case 'SENSOR ERROR':
      return (
        <span className="status-badge sensor_error">
          <HelpCircle size={13} />
          Sensor Fault
        </span>
      );
    case 'OFFLINE':
      return (
        <span className="status-badge offline">
          <WifiOff size={13} />
          Device Offline
        </span>
      );
    default:
      return (
        <span className="status-badge offline">
          {normStatus}
        </span>
      );
  }
}
