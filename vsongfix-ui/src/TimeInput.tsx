import React from 'react';

const TimeInput = ({ label, time, onTimeChange }) => {
  return (
    <div>
      <label>
        {label}:
        <input 
          type="time" 
          value={time} 
          onChange={(e) => onTimeChange(e.target.value)} 
        />
      </label>
    </div>
  );
};

export default TimeInput;