// Preload voices to prevent the "first click wrong voice" issue in Chrome/Safari
let cachedVoices = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  // Trigger voice fetching immediately on module load
  cachedVoices = window.speechSynthesis.getVoices();
  
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    cachedVoices = window.speechSynthesis.getVoices();
  });
}

export const playAudio = (text) => {
  if (!('speechSynthesis' in window)) return;
  
  // Cancel any ongoing speech to prevent getting stuck
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  
  // Try to find a high-quality English voice
  // Use cached voices if ready, otherwise try to fetch directly
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  
  if (voices.length > 0) {
    // Prioritize Google US English, then other US English, then any English
    const enVoice = voices.find(v => v.name.includes('Google US English')) ||
                    voices.find(v => v.name.includes('Google UK English Female')) ||
                    voices.find(v => v.name.includes('English (United States)')) ||
                    voices.find(v => v.lang === 'en-US') ||
                    voices.find(v => v.lang.startsWith('en'));
                    
    if (enVoice) {
      utterance.voice = enVoice;
    }
  }
  
  utterance.rate = 0.9; // Slightly slower for better clarity
  
  window.speechSynthesis.speak(utterance);
};
