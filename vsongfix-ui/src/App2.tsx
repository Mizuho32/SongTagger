import React, { useState } from 'react';
import TimeInput from './TimeInput';

const App2 = () => {
  const [times, setTimes] = useState({ time1: "00:00", time2: "00:00" });

  const handleTimeChange = (key, value) => {
    setTimes((prevTimes) => ({
      ...prevTimes,
      [key]: value,
    }));
  };

  const calculateTimeDifference = (time1, time2) => {
    const [hours1, minutes1] = time1.split(':').map(Number);
    const [hours2, minutes2] = time2.split(':').map(Number);

    const date1 = new Date();
    const date2 = new Date();

    date1.setHours(hours1, minutes1);
    date2.setHours(hours2, minutes2);

    const diffMs = Math.abs(date2 - date1);
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${diffHours} hours ${diffMinutes} minutes`;
  };

  const timeDifference = calculateTimeDifference(times.time1, times.time2);

  return (
    <div>
      <h1>Time Input Example</h1>
      <TimeInput 
        label="Time 1" 
        time={times.time1} 
        onTimeChange={(value) => handleTimeChange('time1', value)} 
      />
      <TimeInput 
        label="Time 2" 
        time={times.time2} 
        onTimeChange={(value) => handleTimeChange('time2', value)} 
      />
      <p>Time Difference: {timeDifference}</p>
    </div>
  );
};

export default App2;