import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LostItem, Claim, ActivityLog } from '../types';
import { supabase } from '../lib/supabase/client';
import {
  getVerifiedItems,
  getAllActivityLogs,
  getUserClaims,
  createActivityLog as dbCreateActivityLog,
  markNotificationsAsViewed as dbMarkNotificationsAsViewed,
  clearAllActivityLogs,
  deleteUserActivityLogs,
  deleteUserReportedItems,
  deleteUserClaims,
  getUnviewedNotificationCount as dbGetUnviewedNotificationCount,
} from '../lib/supabase/database';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  items: LostItem[];
  setItems: (items: LostItem[]) => void;
  claims: Claim[];
  setClaims: (claims: Claim[]) => void;
  addClaim: (claim: Claim) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  selectedItem: LostItem | null;
  setSelectedItem: (item: LostItem | null) => void;
  activityLogs: ActivityLog[];
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  clearActivityLogs: (userId?: string) => void;
  clearUserReportedItems: (userId: string) => void;
  clearUserClaimedItems: (userId: string) => void;
  markNotificationsAsViewed: (userId: string) => void;
  getUnviewedNotificationCount: (userId: string) => number;
  refreshItems: () => Promise<void>;
  refreshLogs: () => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [unviewedNotificationCount, setUnviewedNotificationCount] = useState<number>(0);
  
  // ✅ CHECK FOR RECOVERY FLOW FIRST, THEN RESTORE FROM LOCALSTORAGE
  const [currentPage, setCurrentPageState] = useState<string>(() => {
    // Check URL for recovery/email verification flows
    const searchParams = new URLSearchParams(window.location.search);
    const queryType = searchParams.get('type');
    
    const hash = window.location.hash;
    let hashType = null;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      hashType = hashParams.get('type');
    }
    
    const type = queryType || hashType;
    
    if (type === 'recovery') {
      console.log('🔑 Password recovery detected - setting page to reset-password');
      return 'reset-password';
    } else if (type === 'email' || type === 'signup') {
      console.log('📧 Email verification detected - setting page to email-verified');
      return 'email-verified';
    }
    
    // Otherwise restore from localStorage
    const saved = localStorage.getItem('plv_current_page');
    console.log('📄 Restoring page from localStorage:', saved || 'landing');
    
    // ✅ FIX: Only clear 'landing' from localStorage, keep login/register
    if (saved === 'landing') {
      console.log('🔄 Clearing "landing" from localStorage');
      localStorage.removeItem('plv_current_page');
      return 'landing';
    }
    
    return saved || 'landing';
  });
  
  const [selectedItem, setSelectedItem] = useState<LostItem | null>(null);
  const [items, setItems] = useState<LostItem[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ FIX: Save login/register/forgot-password to localStorage, but not landing
  const setCurrentPage = (page: string) => {
    console.log('📝 Setting page to:', page);
    setCurrentPageState(page);
    
    // Pages that should NOT be persisted in localStorage
    const nonPersistentPages = ['landing'];
    
    if (nonPersistentPages.includes(page)) {
      // Clear localStorage for non-persistent pages
      console.log('🧹 Clearing localStorage for non-persistent page:', page);
      localStorage.removeItem('plv_current_page');
    } else if (page) {
      // Save everything else (including login/register/forgot-password and authenticated pages)
      localStorage.setItem('plv_current_page', page);
    }
  };

  // Helper function to fetch user profile from database
  const fetchUserProfile = async (authUserId: string): Promise<User | null> => {
    try {
      console.log('🔍 Fetching profile for auth_id:', authUserId);
      
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUserId)
        .single();

      if (error) {
        console.error('❌ Profile fetch error:', error);
        return null;
      }

      if (!profile) {
        console.error('❌ No profile data returned');
        return null;
      }

      console.log('✅ Profile fetched:', profile.full_name);

      return {
        id: profile.id,
        authId: profile.auth_id,
        fullName: profile.full_name,
        studentId: profile.student_id,
        contactNumber: profile.contact_number,
        email: profile.email,
        role: profile.role === 'admin' ? 'admin' : 'finder',
      };
    } catch (error) {
      console.error('❌ Unexpected error fetching profile:', error);
      return null;
    }
  };

  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true;
    let initialCheckDone = false;
    let userLoadedFromGetSession = false; // ✅ TRACK IF USER WAS LOADED FROM getSession

    const initAuth = async () => {
      console.log('🔄 Initializing auth...');
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        initialCheckDone = true;
        console.log('📡 getSession result:', session ? 'Session found' : 'No session');
        
        if (error) {
          console.error('❌ getSession error:', error);
          setCurrentUser(null);
          setCurrentPage('landing');
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          console.log('👤 Loading profile from getSession...');
          
          const user = await fetchUserProfile(session.user.id);
          
          if (user) {
            console.log('✅ User loaded:', user.fullName, user.role);
            setCurrentUser(user);
            userLoadedFromGetSession = true; // ✅ MARK THAT WE LOADED USER
            
            // ✅ CHECK IF WE'RE IN A SPECIAL FLOW (recovery/email verification)
            const searchParams = new URLSearchParams(window.location.search);
            const queryType = searchParams.get('type');
            const hash = window.location.hash;
            let hashType = null;
            if (hash) {
              const hashParams = new URLSearchParams(hash.substring(1));
              hashType = hashParams.get('type');
            }
            const type = queryType || hashType;
            
            if (type === 'recovery') {
              console.log('🔑 Recovery flow active - staying on reset-password');
              setCurrentPage('reset-password');
            } else if (type === 'email' || type === 'signup') {
              console.log('📧 Email verification flow active - staying on email-verified');
              setCurrentPage('email-verified');
            } else {
              // ✅ ONLY SET DEFAULT PAGE IF ON PUBLIC/LANDING PAGES
              const savedPage = localStorage.getItem('plv_current_page');
              const publicPages = ['landing', 'login', 'register', 'forgot-password', 'reset-password', 'email-verified'];
              
              if (!savedPage || publicPages.includes(savedPage)) {
                const defaultPage = user.role === 'admin' ? 'admin' : 'board';
                console.log('🔀 Setting default page:', defaultPage);
                setCurrentPage(defaultPage);
              } else {
                console.log('🔀 Keeping saved page:', savedPage);
                // Page is already set from localStorage initialization
              }
            }
          } else {
            console.log('❌ No profile found');
            setCurrentUser(null);
            setCurrentPage('landing');
          }
          setLoading(false);
        } else {
          console.log('🚪 No session');
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Init auth error:', error);
        if (mounted) {
          initialCheckDone = true;
          setCurrentUser(null);
          setCurrentPage('landing');
          setLoading(false);
        }
      }
    };

    // Safety timeout - reduced to 3 seconds
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('⏰ Safety timeout - completing auth');
        setLoading(false);
      }
    }, 3000);

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth event:', event);
        
        if (!mounted) return;
        
        // ✅ IGNORE ALL EVENTS UNTIL INITIAL CHECK IS DONE
        if (!initialCheckDone) {
          console.log('⏭️ Ignoring', event, '- initial check not complete');
          return;
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
          userLoadedFromGetSession = false; // ✅ RESET FLAG ON LOGOUT
          setCurrentUser(null);
          setItems([]);
          setClaims([]);
          setActivityLogs([]);
          localStorage.removeItem('plv_current_page'); // ✅ Clear page persistence
          localStorage.removeItem('admin-active-tab'); // ✅ Clear admin tab persistence
          setCurrentPage('landing'); // This will also clear localStorage via setCurrentPage
          setLoading(false);
        } 
        else if (event === 'SIGNED_IN' && session?.user) {
          // ✅ SKIP IF USER WAS ALREADY LOADED FROM getSession (REFRESH CASE)
          if (userLoadedFromGetSession) {
            console.log('⏭️ SIGNED_IN - user already loaded from getSession, skipping');
            return;
          }
          
          console.log('✅ SIGNED_IN - loading profile (fresh login)...');
          
          const user = await fetchUserProfile(session.user.id);
          
          if (user && mounted) {
            console.log('✅ Profile loaded:', user.fullName, user.role);
            setCurrentUser(user);
            userLoadedFromGetSession = true; // ✅ SET FLAG AFTER FRESH LOGIN
            
            // ✅ CHECK IF WE'RE IN RECOVERY FLOW - DON'T REDIRECT
            const searchParams = new URLSearchParams(window.location.search);
            const queryType = searchParams.get('type');
            const hash = window.location.hash;
            let hashType = null;
            if (hash) {
              const hashParams = new URLSearchParams(hash.substring(1));
              hashType = hashParams.get('type');
            }
            const type = queryType || hashType;
            
            if (type === 'recovery') {
              console.log('🔑 Recovery flow - staying on reset-password');
              setCurrentPage('reset-password');
            } else if (type === 'email' || type === 'signup') {
              console.log('📧 Email verification - staying on email-verified');
              setCurrentPage('email-verified');
            } else {
              const defaultPage = user.role === 'admin' ? 'admin' : 'board';
              console.log('🔀 Navigating to:', defaultPage);
              setCurrentPage(defaultPage);
            }
            setLoading(false);
          } else {
            console.log('❌ Profile not found');
            setCurrentUser(null);
            setCurrentPage('landing');
            setLoading(false);
          }
        }
        else if (event === 'USER_UPDATED' && currentUser && session?.user) {
          console.log('📝 User updated - refreshing profile');
          const user = await fetchUserProfile(session.user.id);
          if (user) {
            setCurrentUser(user);
          }
        }
        else if (event === 'INITIAL_SESSION') {
          console.log('🎬 Initial session event (ignored)');
        }
        else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refreshed');
        }
      }
    );

    return () => {
      console.log('🧹 Cleaning up auth');
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Handle Supabase auth callbacks (email verification, password reset)
  useEffect(() => {
    // Check URL query parameters (?type=recovery or ?type=email)
    const searchParams = new URLSearchParams(window.location.search);
    const queryType = searchParams.get('type');
    
    // Check URL hash parameters (#type=recovery or #type=email) - fallback
    const hash = window.location.hash;
    let hashType = null;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      hashType = hashParams.get('type');
    }
    
    const type = queryType || hashType;
    
    if (type === 'recovery') {
      console.log('🔑 Password recovery flow detected');
      setCurrentPage('reset-password');
      // Don't clear URL - ResetPasswordPage needs the tokens!
    } else if (type === 'email' || type === 'signup') {
      console.log('📧 Email verification flow detected');
      setCurrentPage('email-verified');
      // Clear the URL after navigating
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Load verified items
  const refreshItems = async () => {
    const result = await getVerifiedItems();
    if (result.success) {
      setItems(result.data);
    }
  };

  // Load user claims
  const refreshClaims = async () => {
    if (currentUser) {
      const result = await getUserClaims(currentUser.id);
      if (result.success) {
        setClaims(result.data);
      }
    }
  };

  // Load activity logs
  const refreshLogs = async () => {
    if (currentUser?.role === 'admin') {
      const result = await getAllActivityLogs();
      if (result.success) {
        setActivityLogs(result.data);
      }
    }
  };

  // Load items and claims when user logs in
  useEffect(() => {
    if (currentUser) {
      refreshItems();
      refreshClaims();
      refreshLogs();
      refreshNotificationCount();
    }
  }, [currentUser]);

  // Refresh notification count periodically for non-admin users
  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin') return;

    // Refresh immediately
    refreshNotificationCount();

    // Then refresh every 30 seconds
    const interval = setInterval(() => {
      refreshNotificationCount();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [currentUser]);

  const addActivityLog = async (log: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    const result = await dbCreateActivityLog(log);
    if (result.success) {
      await refreshLogs();
    }
  };

  const clearActivityLogs = async (userId?: string) => {
    if (userId) {
      // User clearing their own logs
      const result = await deleteUserActivityLogs(userId);
      if (result.success) {
        // Filter out the cleared logs from local state
        // Remove both: logs created by user AND logs notifying the user
        setActivityLogs(prev => prev.filter(log => 
          log.userId !== userId && log.notifyUserId !== userId
        ));
      }
      return result;
    } else {
      // Admin clearing all logs
      const result = await clearAllActivityLogs();
      if (result.success) {
        // Refresh logs to update UI
        await refreshLogs();
      }
      return result;
    }
  };

  const clearUserReportedItems = async (userId: string) => {
    const result = await deleteUserReportedItems(userId);
    if (result.success) {
      setItems(prev => prev.filter(item => item.reportedBy !== userId));
    }
    return result;
  };

  const clearUserClaimedItems = async (userId: string) => {
    const result = await deleteUserClaims(userId);
    if (result.success) {
      setClaims(prev => prev.filter(claim => claim.claimantId !== userId));
    }
    return result;
  };

  const addClaim = (claim: Claim) => {
    setClaims(prev => [...prev, claim]);
  };

  const markNotificationsAsViewed = async (userId: string) => {
    await dbMarkNotificationsAsViewed(userId);
    await refreshLogs();
    // Refresh notification count after marking as viewed
    await refreshNotificationCount();
  };

  const getUnviewedNotificationCount = (userId: string) => {
    return unviewedNotificationCount;
  };

  // Refresh notification count from database
  const refreshNotificationCount = async () => {
    if (currentUser && currentUser.role !== 'admin') {
      const count = await dbGetUnviewedNotificationCount(currentUser.id);
      setUnviewedNotificationCount(count);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        items,
        setItems,
        claims,
        setClaims,
        addClaim,
        currentPage,
        setCurrentPage,
        selectedItem,
        setSelectedItem,
        activityLogs,
        addActivityLog,
        clearActivityLogs,
        clearUserReportedItems,
        clearUserClaimedItems,
        markNotificationsAsViewed,
        getUnviewedNotificationCount,
        refreshItems,
        refreshLogs,
        loading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
