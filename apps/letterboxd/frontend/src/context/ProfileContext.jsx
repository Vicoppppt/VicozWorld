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
    // 1. Extraire le code invité depuis l'URL (?guest=123456 ou #/?guest=123456)
    let guestCode = null;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      guestCode = searchParams.get('guest');
      if (!guestCode && window.location.hash.includes('guest=')) {
        const hashPart = window.location.hash.includes('?') 
          ? window.location.hash.split('?')[1] 
          : window.location.hash;
        const hashParams = new URLSearchParams(hashPart);
        guestCode = hashParams.get('guest');
      }
    } catch (e) {
      console.warn('Erreur lecture guest code:', e);
    }

    if (guestCode) {
      // Les cookies de session invité sont désormais gérés exclusivement
      // par le backend (Set-Cookie avec HttpOnly et Secure).
      selectProfile('invite');
    }

    const saved = localStorage.getItem('vicoz_active_profile');
    const endpoint = guestCode 
      ? `/api/auth/device-info?guest=${encodeURIComponent(guestCode)}`
      : '/api/auth/device-info';
    
    fetch(endpoint)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setDeviceInfo(data);
          if (data.authenticated && !data.is_guest && data.profile_hint) {
            // Utilisateur légitime avec badge matériel mTLS (Victor / Claire)
            document.cookie = 'vw_guest=; path=/; max-age=0';
            document.cookie = 'vicoz_guest_session=; path=/; max-age=0';
            selectProfile(data.profile_hint);
            return;
          } else if (data.is_guest || data.profile_hint === 'invite' || guestCode) {
            selectProfile('invite');
            return;
          }
        }
        if (!saved && !guestCode) {
          setShowProfileSelector(true);
        }
      })
      .catch(() => {
        if (!saved && !guestCode) {
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
