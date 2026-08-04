import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { Notification, NotificationPreferences, NotificationState } from '@/types/notification';
import { notificationService } from '@/services/notification-service';

const initialState: NotificationState = {
  notifications: [],
  unread_count: 0,
  preferences: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const response = await notificationService.getNotifications(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch notifications');
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationService.getUnreadCount();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch unread count');
    }
  }
);

export const markReadAsync = createAsyncThunk(
  'notifications/markRead',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await notificationService.markAsRead(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark notification as read');
    }
  }
);

export const readAllAsync = createAsyncThunk(
  'notifications/readAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationService.readAll();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark all as read');
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Notification>) => {
      // Add to notifications if not already present (avoid duplicates from WebSocket/initial load overlap)
      if (!state.notifications.find((n) => n.id === action.payload.id)) {
        state.notifications = [action.payload, ...state.notifications];
        // Increment unread count if it's a new unread notification
        if (!action.payload.is_read) {
          state.unread_count += 1;
        }
      }
    },
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unread_count = action.payload;
    },
    markReadLocal: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find((n) => n.id === action.payload);
      if (notification && !notification.is_read) {
        notification.is_read = true;
        state.unread_count = Math.max(0, state.unread_count - 1);
      }
    },
    dismissLocal: (state, action: PayloadAction<string>) => {
      const index = state.notifications.findIndex((n) => n.id === action.payload);
      if (index !== -1) {
        if (!state.notifications[index].is_read) {
          state.unread_count = Math.max(0, state.unread_count - 1);
        }
        state.notifications.splice(index, 1);
      }
    },
    setPreferences: (state, action: PayloadAction<NotificationPreferences>) => {
      state.preferences = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unread_count = action.payload.unread_count;
      })
      .addCase(markReadAsync.fulfilled, (state, action) => {
        const index = state.notifications.findIndex((n) => n.id === action.payload.id);
        if (index !== -1 && !state.notifications[index].is_read) {
          state.notifications[index].is_read = true;
          state.unread_count = Math.max(0, state.unread_count - 1);
        }
      })
      .addCase(readAllAsync.fulfilled, (state) => {
        state.notifications.forEach((n) => (n.is_read = true));
        state.unread_count = 0;
      });
  },
});

export const { addNotification, setUnreadCount, markReadLocal, dismissLocal, setPreferences } = notificationSlice.actions;
export default notificationSlice.reducer;
