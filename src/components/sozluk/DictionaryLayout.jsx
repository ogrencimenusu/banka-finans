import React, { useState } from 'react';
import { BookOpen, PlusCircle, Gamepad2, List } from 'lucide-react';
import DictionaryDashboard from './DictionaryDashboard';
import AddWordForm from './AddWordForm';
import PracticeMode from './PracticeMode';
import CustomListsPage from './components/pages/CustomListsPage';
import StickyNotesPage from './StickyNotesPage';

const DictionaryLayout = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [initialWordToOpen, setInitialWordToOpen] = useState(null);
  const [initialPracticeConfig, setInitialPracticeConfig] = useState(null);
  const [initialListId, setInitialListId] = useState(null);

  const navigateTo = (tabId, state = null) => {
    if (tabId === 'practice' && state?.config) {
      setInitialPracticeConfig(state.config);
    }
    if (tabId === 'dashboard') {
      if (state?.listId) {
        setInitialListId(state.listId);
      } else {
        setInitialListId(null);
      }
    }
    setActiveTab(tabId);
  };

  const handleWordClickFromNotes = (word) => {
    setInitialWordToOpen(word);
    navigateTo('dashboard');
  };

  const tabs = [
    { id: 'dashboard', label: 'Kelimelerim', icon: BookOpen },
    { id: 'add', label: 'Yeni Kelime Ekle', icon: PlusCircle },
    { id: 'practice', label: 'Pratik Yap', icon: Gamepad2 },
    { id: 'lists', label: 'Listelerim', icon: List },
    { id: 'stickynotes', label: 'Sticky Notlar', icon: BookOpen },
  ];

  return (
    <div className="container pt-3 pb-5 animate-fade-in">
      {/* Top Header / Title */}
      <div className="d-flex align-items-center mb-4 gap-3">
        <div className="bg-primary bg-opacity-10 rounded-circle p-2 d-flex align-items-center justify-content-center">
          <BookOpen size={24} className="text-primary" />
        </div>
        <h2 className="fw-bold h3 mb-0">Kelime Defteri</h2>
      </div>

      {/* Custom Tabs */}
      <div className="d-flex overflow-auto pb-2 mb-4 gap-2" style={{ scrollbarWidth: 'none' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`btn rounded-pill px-4 py-2 fw-medium d-flex align-items-center gap-2 transition-all text-nowrap border-0
                ${isActive ? 'bg-primary text-white shadow-sm' : 'bg-light text-muted hover-bg-light'}`}
              style={{ fontSize: '14px' }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="dictionary-content">
        {activeTab === 'dashboard' && (
          <DictionaryDashboard 
            navigateTo={navigateTo} 
            initialWordToOpen={initialWordToOpen} 
            clearInitialWord={() => setInitialWordToOpen(null)} 
            initialListId={initialListId}
            clearInitialListId={() => setInitialListId(null)}
          />
        )}
        {activeTab === 'add' && <AddWordForm onSave={() => navigateTo('dashboard')} />}
        {activeTab === 'practice' && <PracticeMode initialConfig={initialPracticeConfig} clearInitialConfig={() => setInitialPracticeConfig(null)} />}
        {activeTab === 'lists' && (
          <CustomListsPage navigateTo={navigateTo} />
        )}
        {activeTab === 'stickynotes' && (
          <StickyNotesPage navigateTo={navigateTo} onWordClick={handleWordClickFromNotes} />
        )}
      </div>
    </div>
  );
};

export default DictionaryLayout;
