import { createContext, useContext, useState, useEffect } from 'react';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const [activeProfile, setActiveProfile] = useState(() => {
    return localStorage.getItem('vicoz_active_profile') || null;
  });
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);

  const isStrictGuest = deviceInfo?.is_guest === true || 
    (deviceInfo?.device_cn && (
      deviceInfo.device_cn.toLowerCase().includes('invité') || 
      deviceInfo.device_cn.toLowerCase().includes('guest') ||
      deviceInfo.device_cn === 'Anonyme / Non vérifié'
    ));

  useEffect(() => {
    const saved = localStorage.getItem('vicoz_active_profile');
    
    fetch('/api/auth/device-info')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setDeviceInfo(data);
          if (data.is_guest || data.profile_hint === 'invite') {
            selectProfile('invite');
            return;
          }
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
    if (isStrictGuest && profile !== 'invite') {
      return; // Empêcher un invité externe de basculer sur un profil privé
    }
    setActiveProfile(profile);
    localStorage.setItem('vicoz_active_profile', profile);
    setShowProfileSelector(false);
  };

  const openProfileSelector = () => {
    if (isStrictGuest) return;
    setShowProfileSelector(true);
  };

  const isGuest = isStrictGuest || activeProfile === 'invite';
  const isMaman = !isGuest && activeProfile === 'claire';
  const isVictor = !isGuest && !isMaman;

  return (
    <ProfileContext.Provider
      value={{
        activeProfile,
        isMaman,
        isGuest,
        isVictor,
        isStrictGuest,
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
