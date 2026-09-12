import { createContext, useContext, useState, useEffect } from 'react';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const [activeProfile, setActiveProfile] = useState(() => {
    return localStorage.getItem('vicoz_active_profile') || null;
  });
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('vicoz_active_profile');
    
    fetch('/api/auth/device-info')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setDeviceInfo(data);
          if (!saved && data.authenticated && data.profile_hint) {
            selectProfile(data.profile_hint);
            return;
          }
        }
        if (!saved) {
          setShowProfileSelector(true);
        }
      })
      .catch(() => {
        if (!saved) {
          setShowProfileSelector(true);
        }
      });
  }, []);

  const selectProfile = (profile) => {
    setActiveProfile(profile);
    localStorage.setItem('vicoz_active_profile', profile);
    setShowProfileSelector(false);
  };

  const openProfileSelector = () => {
    setShowProfileSelector(true);
  };

  const isMaman = activeProfile === 'claire';

  return (
    <ProfileContext.Provider
      value={{
        activeProfile,
        isMaman,
        selectProfile,
        openProfileSelector,
        showProfileSelector,
        setShowProfileSelector,
        deviceInfo,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
