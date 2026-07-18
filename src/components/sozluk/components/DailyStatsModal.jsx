import React, { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { CheckCircle2, XCircle, Target, TrendingUp, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const DailyStatsModal = ({ show, onHide, dailyStats, todayStr }) => {
  const [selectedDate, setSelectedDate] = useState(todayStr || new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'monthly'
  const [calendarMonth, setCalendarMonth] = useState(new Date(selectedDate || new Date()));

  // Navigate days
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const selectedStats = dailyStats?.[selectedDate] || {};
  const selectedWords = selectedStats.words || {};
  const selectedWordsArray = Object.values(selectedWords).sort((a, b) =>
    (b.correct + b.incorrect) - (a.correct + a.incorrect)
  );

  const totalQuestions = selectedWordsArray.reduce((sum, w) => sum + w.correct + w.incorrect, 0);
  const totalCorrect = selectedWordsArray.reduce((sum, w) => sum + w.correct, 0);
  const totalIncorrect = selectedWordsArray.reduce((sum, w) => sum + w.incorrect, 0);
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const displayDate = new Date(selectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
  const isToday = selectedDate === todayStr;

  // Calendar logic
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay(); // 0 (Sun) to 6 (Sat)
  const startingEmptyCells = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Adjust for Monday start

  const handlePrevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const monthName = calendarMonth.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

  return (
    <Modal show={show} onHide={onHide} centered size="lg" contentClassName="border-0 bg-transparent shadow-none">
      <div className="position-relative mx-auto w-100" style={{ maxWidth: '750px' }}>
        
        {/* Close Button */}
        <Button
          variant="light"
          className="position-absolute rounded-circle d-flex align-items-center justify-content-center p-0 shadow-sm border-0"
          style={{ width: '36px', height: '36px', zIndex: 10, top: '20px', right: '20px', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)' }}
          onClick={onHide}
        >
          <i className="bi bi-x fs-5 text-dark"></i>
        </Button>

        {/* Modal Body */}
        <div className="bg-white rounded-4 overflow-hidden shadow-lg text-body">
          
          {/* Header Section */}
          <div className="position-relative p-4 p-md-5 bg-primary bg-opacity-10" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%)' }}>
            
            {/* View Mode Toggle */}
            <div className="d-flex justify-content-center mb-4">
              <div className="bg-white rounded-pill p-1 shadow-sm d-flex border">
                <button 
                  className={`btn btn-sm rounded-pill px-4 fw-bold transition-all ${viewMode === 'daily' ? 'btn-primary shadow-sm' : 'btn-white text-muted border-0'}`}
                  onClick={() => setViewMode('daily')}
                >
                  <i className="bi bi-list-check me-2"></i>Günlük Detay
                </button>
                <button 
                  className={`btn btn-sm rounded-pill px-4 fw-bold transition-all ${viewMode === 'monthly' ? 'btn-primary shadow-sm' : 'btn-white text-muted border-0'}`}
                  onClick={() => setViewMode('monthly')}
                >
                  <i className="bi bi-calendar3 me-2"></i>Aylık Takvim
                </button>
              </div>
            </div>

            {viewMode === 'daily' ? (
              <>
                {/* Date Navigation */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <button onClick={handlePrevDay} className="btn btn-sm btn-white rounded-pill shadow-sm d-flex align-items-center gap-1 border hover-scale transition-all">
                    <ChevronLeft size={16} className="text-secondary" />
                    <span className="d-none d-sm-inline text-muted fw-medium" style={{ fontSize: '13px' }}>Önceki</span>
                  </button>
                  
                  <div className="d-flex align-items-center gap-2 bg-white px-4 py-2 rounded-pill shadow-sm border">
                    <CalendarIcon size={16} className="text-primary" />
                    <span className="fw-bold text-dark" style={{ fontSize: '14px' }}>
                      {isToday ? "Bugün" : displayDate}
                    </span>
                  </div>
                  
                  <button 
                    onClick={handleNextDay} 
                    className={`btn btn-sm btn-white rounded-pill shadow-sm d-flex align-items-center gap-1 border hover-scale transition-all ${isToday ? 'opacity-50 pe-none' : ''}`}
                  >
                    <span className="d-none d-sm-inline text-muted fw-medium" style={{ fontSize: '13px' }}>Sonraki</span>
                    <ChevronRight size={16} className="text-secondary" />
                  </button>
                </div>

                {/* Overall Stats */}
                <div className="row g-3">
                  <div className="col-6 col-md-3">
                    <div className="bg-white rounded-4 p-3 shadow-sm border-0 h-100 d-flex flex-column justify-content-center">
                      <div className="d-flex align-items-center gap-2 mb-2 text-primary">
                        <Target size={18} />
                        <span className="fw-bold" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>ÇÖZÜLEN</span>
                      </div>
                      <div className="fs-3 fw-bold text-dark lh-1">{totalQuestions}</div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="bg-white rounded-4 p-3 shadow-sm border-0 h-100 d-flex flex-column justify-content-center">
                      <div className="d-flex align-items-center gap-2 mb-2 text-success">
                        <CheckCircle2 size={18} />
                        <span className="fw-bold" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>DOĞRU</span>
                      </div>
                      <div className="fs-3 fw-bold text-dark lh-1">{totalCorrect}</div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="bg-white rounded-4 p-3 shadow-sm border-0 h-100 d-flex flex-column justify-content-center">
                      <div className="d-flex align-items-center gap-2 mb-2 text-danger">
                        <XCircle size={18} />
                        <span className="fw-bold" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>YANLIŞ</span>
                      </div>
                      <div className="fs-3 fw-bold text-dark lh-1">{totalIncorrect}</div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="bg-white rounded-4 p-3 shadow-sm border-0 h-100 d-flex flex-column justify-content-center">
                      <div className="d-flex align-items-center gap-2 mb-2 text-info">
                        <TrendingUp size={18} />
                        <span className="fw-bold" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>BAŞARI</span>
                      </div>
                      <div className="fs-3 fw-bold text-dark lh-1">%{accuracy}</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Monthly Navigation */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <button onClick={handlePrevMonth} className="btn btn-sm btn-white rounded-pill shadow-sm d-flex align-items-center gap-1 border hover-scale transition-all">
                    <ChevronLeft size={16} className="text-secondary" />
                    <span className="text-muted fw-medium" style={{ fontSize: '13px' }}>Önceki</span>
                  </button>
                  
                  <div className="fw-bold text-dark fs-5 text-capitalize">
                    {monthName}
                  </div>
                  
                  <button onClick={handleNextMonth} className="btn btn-sm btn-white rounded-pill shadow-sm d-flex align-items-center gap-1 border hover-scale transition-all">
                    <span className="text-muted fw-medium" style={{ fontSize: '13px' }}>Sonraki</span>
                    <ChevronRight size={16} className="text-secondary" />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="bg-white rounded-4 p-4 shadow-sm border-0">
                  <div className="mb-3 text-center fw-bold text-muted" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', fontSize: '12px' }}>
                    <div>Pzt</div><div>Sal</div><div>Çar</div>
                    <div>Per</div><div>Cum</div><div>Cmt</div><div>Paz</div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                    {Array.from({ length: startingEmptyCells }).map((_, i) => (
                      <div key={`empty-${i}`}>
                        <div className="w-100 rounded-3 bg-light opacity-50" style={{ paddingTop: '100%' }}></div>
                      </div>
                    ))}
                    
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const dateObj = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                      const tzOffset = dateObj.getTimezoneOffset() * 60000;
                      const dStr = new Date(dateObj.getTime() - tzOffset).toISOString().split('T')[0];
                      
                      const dStats = dailyStats?.[dStr] || {};
                      const correctAnswers = typeof dStats === 'number' ? dStats : (dStats.correctCount || 0);
                      const isStreak = correctAnswers >= 100;
                      const isFuture = dStr > todayStr;
                      const isSelected = selectedDate === dStr;

                      let cellBg = 'bg-light';
                      let cellText = 'text-body-secondary';
                      let cellBorder = 'border-secondary border-opacity-10';

                      if (isStreak) {
                        cellBg = 'bg-danger bg-opacity-10';
                        cellText = 'text-danger fw-bold';
                        cellBorder = 'border-danger border-opacity-25';
                      } else if (correctAnswers > 0) {
                        cellBg = 'bg-warning bg-opacity-10';
                        cellText = 'text-warning-emphasis fw-bold';
                        cellBorder = 'border-warning border-opacity-25';
                      }

                      if (isSelected) {
                        cellBorder = 'border-primary shadow-sm';
                        cellBg = isStreak ? 'bg-danger bg-opacity-25' : (correctAnswers > 0 ? 'bg-warning bg-opacity-25' : 'bg-primary bg-opacity-10');
                      }
                      
                      return (
                        <div key={`day-${day}`}>
                          <div 
                            className={`w-100 rounded-3 border d-flex flex-column align-items-center justify-content-center position-relative transition-all ${cellBg} ${cellBorder} ${isFuture ? 'opacity-25' : 'cursor-pointer hover-scale'}`}
                            style={{ aspectRatio: '1', cursor: isFuture ? 'default' : 'pointer' }}
                            onClick={() => {
                              if (!isFuture) {
                                setSelectedDate(dStr);
                                setViewMode('daily');
                              }
                            }}
                          >
                            <span className={cellText} style={{ fontSize: '15px' }}>{day}</span>
                            {correctAnswers > 0 && (
                              <div className="position-absolute bottom-0 w-100 text-center pb-1 d-flex flex-column align-items-center justify-content-center">
                                {isStreak && (
                                  <i className="bi bi-fire text-danger mb-1" style={{ fontSize: '12px' }}></i>
                                )}
                                <div className={`fw-bold px-1 rounded-pill ${isStreak ? 'bg-danger bg-opacity-25 text-danger' : 'bg-warning bg-opacity-25 text-warning-emphasis'}`} style={{ fontSize: '9px', lineHeight: '1.2' }}>
                                  {correctAnswers} Doğru
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Words List Section (Only visible in Daily view) */}
          {viewMode === 'daily' && (
            <div className="p-4 p-md-5 bg-white">
              <h5 className="fw-bold mb-4 text-dark d-flex align-items-center gap-2">
                <i className="bi bi-card-checklist text-primary opacity-75"></i>
                Kelime Bazlı Performans
              </h5>

              {selectedWordsArray.length > 0 ? (
                <div className="d-flex flex-column gap-3 pe-2 custom-scrollbar" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {selectedWordsArray.map((wStats, idx) => {
                    const total = wStats.correct + wStats.incorrect;
                    const correctPercent = total > 0 ? Math.round((wStats.correct / total) * 100) : 0;
                    
                    return (
                      <div key={idx} className="d-flex flex-column flex-sm-row align-items-sm-center gap-3 p-3 rounded-4 border border-secondary border-opacity-10 bg-light bg-opacity-50 transition-all hover-bg-white hover-shadow-sm">
                        <div className="fw-bold text-dark text-truncate" style={{ width: '120px', fontSize: '15px' }} title={wStats.term}>
                          {wStats.term}
                        </div>
                        
                        <div className="flex-grow-1 d-flex align-items-center gap-3">
                          <div className="flex-grow-1 position-relative d-flex rounded-pill overflow-hidden shadow-sm" style={{ height: '14px', backgroundColor: 'rgba(239, 68, 68, 0.15)' }}>
                            <div
                              className="h-100 transition-all"
                              style={{ 
                                width: `${correctPercent}%`,
                                background: 'linear-gradient(90deg, #22c55e, #10b981)',
                                boxShadow: correctPercent > 0 && correctPercent < 100 ? '2px 0 4px rgba(0,0,0,0.1)' : 'none'
                              }}
                            ></div>
                            <div
                              className="h-100 flex-grow-1 transition-all"
                              style={{ 
                                background: 'linear-gradient(90deg, #ef4444, #f43f5e)',
                                opacity: wStats.incorrect > 0 ? 1 : 0
                              }}
                            ></div>
                          </div>
                          
                          <div className="d-flex gap-2 flex-shrink-0" style={{ width: '80px' }}>
                            <div className="d-flex align-items-center justify-content-center bg-success bg-opacity-10 text-success rounded-pill px-2 py-1 fw-bold" style={{ fontSize: '11px', minWidth: '35px' }}>
                              {wStats.correct}
                            </div>
                            <div className="d-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger rounded-pill px-2 py-1 fw-bold" style={{ fontSize: '11px', minWidth: '35px' }}>
                              {wStats.incorrect}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-5 text-center d-flex flex-column align-items-center justify-content-center rounded-4 border border-dashed border-secondary border-opacity-25 bg-light">
                  <div className="bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm mb-3" style={{ width: '64px', height: '64px' }}>
                    <i className="bi bi-inbox fs-2 text-secondary opacity-50"></i>
                  </div>
                  <h6 className="fw-bold text-dark mb-1">Kayıt Bulunamadı</h6>
                  <p className="text-muted small mb-0">Bu tarihte herhangi bir test çözülmemiş veya kelime çalışılmamış.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`
        .hover-scale:hover { transform: scale(1.05); }
        .hover-bg-white:hover { background-color: #ffffff !important; }
        .hover-shadow-sm:hover { box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075) !important; }
      `}</style>
    </Modal>
  );
};

export default DailyStatsModal;
