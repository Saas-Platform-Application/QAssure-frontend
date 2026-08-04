import { useEffect, useCallback, createContext, useContext, useRef, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppDispatch, useAppSelector } from '@/hooks/redux-hooks';
import { addNotification, fetchUnreadCount, setUnreadCount, markReadLocal } from '@/store/notificationSlice';
import { showToast } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';

interface SocketContextValue {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextValue>({ socket: null });

export const useNotificationSocket = () => useContext(SocketContext);

interface NotificationProviderProps {
  children: ReactNode;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
// Extract domain from VITE_API_BASE_URL if it exists, otherwise use it as is for socket.io
const SOCKET_URL = API_BASE_URL.replace('/api/v1', '');

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { accessToken, isAuthenticated } = useAppSelector((state) => state.auth);
  const socketRef = useRef<Socket | null>(null);

  const handleNotification = useCallback((data: any) => {
    console.log('WebSocket: Received notification event', data);
    if (data.type === 'new' && data.notification) {
      const notification = data.notification;
      dispatch(addNotification(notification));
      
      // Use showToast based on notification type
      const toastType = ['warning', 'action_required', 'escalation'].includes(notification.notification_type) ? 'warning' : 
                        notification.notification_type === 'success' ? 'success' : 'info';
      
      const action = notification.action_url ? {
        label: 'View',
        onClick: () => {
          if (['workflow', 'training'].includes(notification.category || '')) {
            navigate('/tenant/workflows/tasks');
          } else {
            navigate(notification.action_url);
          }
        }
      } : undefined;

      showToast[toastType](notification.title, notification.message, action);
    }
  }, [dispatch, navigate]);

  const handleUnreadCount = useCallback((data: any) => {
    console.log('WebSocket: Received unread_count event', data);
    if (typeof data.count === 'number') {
      dispatch(setUnreadCount(data.count));
    }
  }, [dispatch]);

  const handleNotificationRead = useCallback((data: any) => {
    console.log('WebSocket: Received notification_read event', data);
    if (data.id) {
      dispatch(markReadLocal(data.id));
    }
  }, [dispatch]);

  // Tracker for initial fetch to avoid duplicate calls on re-renders
  const hasInitialized = useRef(false);

  // Initial fetch of unread count only (notifications list fetched on-demand)
  useEffect(() => {
    if (isAuthenticated && accessToken && !hasInitialized.current) {
      console.log('NotificationProvider: Initial unread count fetch');
      dispatch(fetchUnreadCount());
      hasInitialized.current = true;
    }
    
    // Reset initialization tracker on logout
    if (!isAuthenticated) {
      hasInitialized.current = false;
    }
  }, [isAuthenticated, accessToken, dispatch]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (socketRef.current) {
        console.log('WebSocket: Disconnecting due to logout');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    if (socketRef.current?.connected) return;

    // Connect to WebSocket
    console.log('WebSocket: Connecting to', SOCKET_URL);
    const socket = io(SOCKET_URL, {
      auth: {
        token: accessToken
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true
    });

    socket.on('notification', handleNotification);
    socket.on('unread_count', handleUnreadCount);
    socket.on('notification_read', handleNotificationRead);

    socket.on('connect', () => {
      console.log('WebSocket: Connected');
      // If we've already initialized, re-fetch count on reconnect to be safe
      if (hasInitialized.current) {
        dispatch(fetchUnreadCount());
      }
    });

    socketRef.current = socket;

    return () => {
      // We don't want to disconnect on every route change, so we persist the socketRef
    };
  }, [isAuthenticated, accessToken, dispatch, handleNotification, handleUnreadCount, handleNotificationRead]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  );
};
