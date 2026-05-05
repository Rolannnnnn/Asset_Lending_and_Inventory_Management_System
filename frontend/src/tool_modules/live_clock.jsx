import React, { useState, useEffect } from 'react';

function LiveClock({ className }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <span className={className}>
      {formattedDate}
      <br />
      <strong>{formattedTime}</strong>
    </span>
  );
}

export default LiveClock;