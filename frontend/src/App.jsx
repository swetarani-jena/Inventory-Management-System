import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItemButton,
  ListItemIcon, ListItemText, CssBaseline, IconButton, Divider,
  Avatar, Chip, useMediaQuery, createTheme, ThemeProvider
} from '@mui/material';
import {
  Dashboard, Inventory2, Assignment, ShoppingCart, SwapHoriz,
  Warehouse, Category, People, BarChart, Menu, Construction
} from '@mui/icons-material';

import DashboardPage    from './pages/Dashboard';
import InventoryPage    from './pages/Inventory';
import RequisitionsPage from './pages/Requisitions';
import PurchaseOrders   from './pages/PurchaseOrders';
import Transfers        from './pages/Transfers';
import Analytics        from './pages/Analytics';
import { Warehouses, Materials, Vendors } from './pages/MasterData';

const DRAWER_WIDTH = 240;

const theme = createTheme({
  palette: {
    primary:   { main: '#1565C0' },
    secondary: { main: '#FF6F00' },
    background:{ default: '#F4F6F9' },
  },
  typography: {
    fontFamily: '"DM Sans", "Roboto", sans-serif',
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCard:    { styleOverrides: { root: { borderRadius: 12 } } },
    MuiButton:  { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 } } },
    MuiTableCell:{ styleOverrides: { head: { fontWeight: 700, fontSize: '0.78rem' } } },
  },
});

const NAV = [
  { label: 'Dashboard',       icon: <Dashboard />,    path: '/'               },
  { label: 'Inventory',       icon: <Inventory2 />,   path: '/inventory'      },
  { label: 'Requisitions',    icon: <Assignment />,   path: '/requisitions'   },
  { label: 'Purchase Orders', icon: <ShoppingCart />, path: '/purchase-orders'},
  { label: 'Transfers',       icon: <SwapHoriz />,    path: '/transfers'      },
  { divider: true },
  { label: 'Warehouses',      icon: <Warehouse />,    path: '/warehouses'     },
  { label: 'Materials',       icon: <Category />,     path: '/materials'      },
  { label: 'Vendors',         icon: <People />,       path: '/vendors'        },
  { divider: true },
  { label: 'Analytics',       icon: <BarChart />,     path: '/analytics'      },
];

function SidebarContent({ onClose }) {
  const location = useLocation();
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ bgcolor: 'primary.main', borderRadius: 2, p: 0.8, display: 'flex' }}>
          <Construction sx={{ color: '#fff', fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={800} color="primary.main" lineHeight={1.1}>InvTrack</Typography>
          <Typography variant="caption" color="text.secondary">Construction Materials</Typography>
        </Box>
      </Box>
      <Divider />

      <List sx={{ flex: 1, px: 1, py: 1.5 }}>
        {NAV.map((item, i) => {
          if (item.divider) return <Divider key={`d${i}`} sx={{ my: 1 }} />;
          const active = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              onClick={onClose}
              sx={{
                borderRadius: 2, mb: 0.5,
                bgcolor:     active ? 'primary.main' : 'transparent',
                color:       active ? '#fff' : 'text.secondary',
                '&:hover':   { bgcolor: active ? 'primary.dark' : 'action.hover' },
                '& .MuiListItemIcon-root': { color: active ? '#fff' : 'text.secondary', minWidth: 36 },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.88rem', fontWeight: active ? 700 : 500 }} />
            </ListItemButton>
          );
        })}
      </List>

      <Divider />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: '0.8rem' }}>SJ</Avatar>
        <Box>
          <Typography variant="body2" fontWeight={700}>Swetarani Jena</Typography>
          <Typography variant="caption" color="text.secondary">Site Engineer</Typography>
        </Box>
      </Box>
    </Box>
  );
}

function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const currentPage = NAV.find(n => n.path === location.pathname)?.label || 'Dashboard';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />

      {/* Top AppBar */}
      <AppBar position="fixed" elevation={0} sx={{ zIndex: t => t.zIndex.drawer + 1, bgcolor: '#fff', borderBottom: '1px solid', borderColor: 'divider', width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { md: `${DRAWER_WIDTH}px` } }}>
        <Toolbar>
          {isMobile && <IconButton onClick={() => setMobileOpen(o => !o)} sx={{ mr: 1, color: 'text.primary' }}><Menu /></IconButton>}
          <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ flex: 1 }}>{currentPage}</Typography>
          <Chip label="Mock Data Mode" size="small" color="warning" variant="outlined" sx={{ fontSize: '0.7rem' }} />
        </Toolbar>
      </AppBar>

      {/* Sidebar — desktop */}
      <Drawer variant="permanent" sx={{ display: { xs: 'none', md: 'block' }, width: DRAWER_WIDTH, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', borderRight: '1px solid', borderColor: 'divider' } }}>
        <SidebarContent onClose={() => {}} />
      </Drawer>

      {/* Sidebar — mobile */}
      <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </Drawer>

      {/* Main content */}
      <Box component="main" sx={{ flex: 1, p: 3, mt: '64px', bgcolor: 'background.default', minHeight: 'calc(100vh - 64px)' }}>
        <Routes>
          <Route path="/"                element={<DashboardPage />}    />
          <Route path="/inventory"       element={<InventoryPage />}    />
          <Route path="/requisitions"    element={<RequisitionsPage />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />}   />
          <Route path="/transfers"       element={<Transfers />}        />
          <Route path="/warehouses"      element={<Warehouses />}       />
          <Route path="/materials"       element={<Materials />}        />
          <Route path="/vendors"         element={<Vendors />}          />
          <Route path="/analytics"       element={<Analytics />}        />
        </Routes>
      </Box>
    </Box>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Layout />
      </BrowserRouter>
    </ThemeProvider>
  );
}
