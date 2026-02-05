import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const UserProfileContext = createContext({});

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within UserProfileProvider');
  }
  return context;
};

export const UserProfileProvider = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 means "no rows returned" which is expected for new users
          console.error('Error fetching profile:', error);
          setProfile(null);
        } else {
          setProfile(data || null);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  const value = {
    profile,
    loading,
    isAdmin: profile?.role === 'FEDEX_ADMIN',
    isManager: profile?.role === 'DCA_MANAGER', 
    isAgent: profile?.role === 'DCA_AGENT',
    organizationId: profile?.organization_id
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};