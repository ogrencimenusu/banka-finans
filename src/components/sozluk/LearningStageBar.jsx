import React from 'react';

const LearningStageBar = ({ stage, totalStages = 10 }) => {
  const normalizedStage = Math.max(0, Math.min(totalStages, stage || 0));
  const percentage = (normalizedStage / totalStages) * 100;
  
  let color = 'bg-secondary';
  if (normalizedStage === 0) color = 'bg-info';
  else if (normalizedStage < 5) color = 'bg-danger';
  else if (normalizedStage < 9) color = 'bg-warning';
  else color = 'bg-success';

  return (
    <div className="w-100">
      <div className="d-flex justify-content-between mb-1" style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
        <span className="text-muted">ÖĞR. AŞAMASI</span>
        <span className={color.replace('bg-', 'text-')}>{normalizedStage}/{totalStages}</span>
      </div>
      <div className="progress rounded-pill bg-light" style={{ height: '4px' }}>
        <div 
          className={`progress-bar ${color}`} 
          role="progressbar" 
          style={{ width: `${percentage}%`, transition: 'width 0.5s ease-in-out' }} 
          aria-valuenow={percentage} 
          aria-valuemin="0" 
          aria-valuemax="100"
        ></div>
      </div>
    </div>
  );
};

export default LearningStageBar;
