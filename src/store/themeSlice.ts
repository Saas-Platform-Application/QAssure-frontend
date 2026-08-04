import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { themeService } from '@/services/theme-service';
import { extractDomainFromUrl, applyThemeColors } from '@/utils/theme';

export interface ThemeData {
  id: string;
  name: string;
  logo_file_path: string | null;
  favicon_file_path: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
}

interface ThemeState {
  theme: ThemeData | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

// Default theme (super admin theme)
const defaultTheme: ThemeData = {
  id: '',
  name: 'Default',
  logo_file_path: null,
  favicon_file_path: null,
  primary_color: '#112868',
  secondary_color: '#23DCE1',
  accent_color: '#084CC8',
};

const initialState: ThemeState = {
  theme: null,
  logoUrl: null,
  faviconUrl: null,
  isLoading: false,
  error: null,
  isInitialized: false,
};

// Async thunk to fetch theme
export const fetchThemeAsync = createAsyncThunk<
  ThemeData,
  string | undefined,
  { rejectValue: { message: string } }
>('theme/fetch', async (domain, { rejectWithValue }) => {
  try {
    const domainToUse = domain || extractDomainFromUrl();
    if (!domainToUse) {
      return rejectWithValue({ message: 'Domain not found' });
    }
    
    const response = await themeService.getTheme(domainToUse);
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue({ message: 'Failed to fetch theme' });
  } catch (error: any) {
    return rejectWithValue({
      message: error?.response?.data?.error?.message || error?.message || 'Failed to fetch theme',
    });
  }
});

// Async thunk to fetch authenticated theme
export const fetchAuthThemeAsync = createAsyncThunk<
  ThemeData,
  void,
  { rejectValue: { message: string } }
>('theme/fetchAuth', async (_, { rejectWithValue }) => {
  try {
    const response = await themeService.getAuthTenantTheme();
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue({ message: 'Failed to fetch authenticated theme' });
  } catch (error: any) {
    return rejectWithValue({
      message: error?.response?.data?.error?.message || error?.message || 'Failed to fetch authenticated theme',
    });
  }
});

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setDefaultTheme: (state) => {
      state.theme = defaultTheme;
      state.logoUrl = null;
      state.faviconUrl = null;
      applyThemeColors(defaultTheme.primary_color, defaultTheme.secondary_color, defaultTheme.accent_color);
    },
    clearTheme: (state) => {
      state.theme = null;
      state.logoUrl = null;
      state.faviconUrl = null;
      state.error = null;
      applyThemeColors(defaultTheme.primary_color, defaultTheme.secondary_color, defaultTheme.accent_color);
    },
    updateTheme: (state, action: PayloadAction<Partial<ThemeData>>) => {
      if (state.theme) {
        state.theme = { ...state.theme, ...action.payload };
        if (action.payload.logo_file_path !== undefined) {
          state.logoUrl = action.payload.logo_file_path;
        }
        if (action.payload.favicon_file_path !== undefined) {
          state.faviconUrl = action.payload.favicon_file_path;
        }
        const primaryColor = action.payload.primary_color ?? state.theme.primary_color;
        const secondaryColor = action.payload.secondary_color ?? state.theme.secondary_color;
        const accentColor = action.payload.accent_color ?? state.theme.accent_color;
        if (primaryColor || secondaryColor || accentColor) {
          applyThemeColors(primaryColor, secondaryColor, accentColor);
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchThemeAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchThemeAsync.fulfilled, (state, action: PayloadAction<ThemeData>) => {
        state.isLoading = false;
        state.theme = action.payload;
        // Use URLs directly from API response (logo_file_path and favicon_file_path contain full URLs)
        state.logoUrl = action.payload.logo_file_path;
        state.faviconUrl = action.payload.favicon_file_path;
        state.error = null;
        state.isInitialized = true;
        
        // Apply theme colors
        applyThemeColors(
          action.payload.primary_color,
          action.payload.secondary_color,
          action.payload.accent_color
        );
      })
      .addCase(fetchThemeAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to fetch theme';
        // Use default theme on error
        state.theme = defaultTheme;
        state.logoUrl = null;
        state.faviconUrl = null;
        state.isInitialized = true;
        applyThemeColors(defaultTheme.primary_color, defaultTheme.secondary_color, defaultTheme.accent_color);
      })
      .addCase(fetchAuthThemeAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAuthThemeAsync.fulfilled, (state, action: PayloadAction<ThemeData>) => {
        state.isLoading = false;
        state.theme = action.payload;
        state.logoUrl = action.payload.logo_file_path;
        state.faviconUrl = action.payload.favicon_file_path;
        state.error = null;
        state.isInitialized = true;
        
        applyThemeColors(
          action.payload.primary_color,
          action.payload.secondary_color,
          action.payload.accent_color
        );
      })
      .addCase(fetchAuthThemeAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to fetch authenticated theme';
        if (!state.theme) state.theme = defaultTheme;
        state.isInitialized = true;
        applyThemeColors(
          state.theme.primary_color || defaultTheme.primary_color,
          state.theme.secondary_color || defaultTheme.secondary_color,
          state.theme.accent_color || defaultTheme.accent_color
        );
      });
  },
});

export const { setDefaultTheme, clearTheme, updateTheme } = themeSlice.actions;
export default themeSlice.reducer;
