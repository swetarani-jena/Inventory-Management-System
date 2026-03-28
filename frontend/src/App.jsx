import React, { useState } from 'react';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Toolbar, AppBar, Typography, IconButton,
  Avatar, Menu, MenuItem, Chip, Divider, ListSubheader
} from '@mui/material';
import {
  Dashboard, Inventory2, Assignment, ShoppingCart,
  SwapHoriz, Analytics, Warehouse, Category,
  People, Logout, BarChart
} from '@mui/icons-material';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import DashboardPage      from './pages/Dashboard';
import InventoryPage      from './pages/Inventory';
import RequisitionsPage   from './pages/Requisitions';
import PurchaseOrdersPage from './pages/PurchaseOrders';
import TransfersPage      from './pages/Transfers';
import AnalyticsPage      from './pages/Analytics';
import { Warehouses, Materials, Vendors } from './pages/MasterData';

const DRAWER_WIDTH = 252;

const NAV_MAIN = [
  { label: 'Dashboard',       icon: <Dashboard />,    page: 'dashboard'       },
  { label: 'Inventory',       icon: <Inventory2 />,   page: 'inventory'       },
  { label: 'Requisitions',    icon: <Assignment />,   page: 'requisitions'    },
  { label: 'Purchase Orders', icon: <ShoppingCart />, page: 'purchase-orders' },
  { label: 'Transfers',       icon: <SwapHoriz />,    page: 'transfers'       },
  { label: 'Analytics',       icon: <BarChart />,     page: 'analytics'       },
];

const NAV_MASTER = [
  { label: 'Warehouses', icon: <Warehouse />, page: 'warehouses' },
  { label: 'Materials',  icon: <Category />,  page: 'materials'  },
  { label: 'Vendors',    icon: <People />,    page: 'vendors'    },
];

const ROLE_COLORS = {
  admin:               'error',
  warehouse_manager:   'primary',
  procurement_officer: 'warning',
  site_engineer:       'success',
};

const ROLE_LABELS = {
  admin:               'Admin',
  warehouse_manager:   'Warehouse Manager',
  procurement_officer: 'Procurement Officer',
  site_engineer:       'Site Engineer',
};

function AppShell() {
  const { auth, logout } = useAuth();
  const [page,     setPage]     = useState('dashboard');
  const [anchorEl, setAnchorEl] = useState(null);
  const [loggedIn, setLoggedIn] = useState(!!auth);

  if (!loggedIn || !auth) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':       return <DashboardPage />;
      case 'inventory':       return <InventoryPage />;
      case 'requisitions':    return <RequisitionsPage />;
      case 'purchase-orders': return <PurchaseOrdersPage />;
      case 'transfers':       return <TransfersPage />;
      case 'analytics':       return <AnalyticsPage />;
      case 'warehouses':      return <Warehouses />;
      case 'materials':       return <Materials />;
      case 'vendors':         return <Vendors />;
      default:                return <DashboardPage />;
    }
  };

  const NavItem = ({ item }) => (
    <ListItem disablePadding sx={{ px: 1, mb: 0.5 }}>
      <ListItemButton
        selected={page === item.page}
        onClick={() => setPage(item.page)}
        sx={{
          borderRadius: 2,
          py: 1,
          '&.Mui-selected': {
            bgcolor: 'primary.main',
            color: 'white',
            '& .MuiListItemIcon-root': { color: 'white' },
            '&:hover': { bgcolor: 'primary.dark' },
          },
          '&:hover:not(.Mui-selected)': { bgcolor: 'grey.100' },
        }}
      >
        <ListItemIcon sx={{ minWidth: 36, color: page === item.page ? 'white' : 'grey.600' }}>
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{ fontSize: 14, fontWeight: page === item.page ? 600 : 400 }}
        />
      </ListItemButton>
    </ListItem>
  );

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8f9fb', minHeight: '100vh' }}>

      {/* AppBar */}
      <AppBar position="fixed" elevation={0} sx={{
        zIndex: t => t.zIndex.drawer + 1,
        bgcolor: 'white',
        borderBottom: '1px solid',
        borderColor: 'grey.200',
        color: 'text.primary',
      }}>
        <Toolbar sx={{ gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
            <Box sx={{
              width: 32, height: 32, borderRadius: 1.5,
              bgcolor: 'primary.main', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Inventory2 sx={{ color: 'white', fontSize: 18 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                Inventory Management
              </Typography>
              <Typography variant="caption" color="text.secondary" lineHeight={1}>
                Construction Materials System
              </Typography>
            </Box>
          </Box>

          <Chip
            label={ROLE_LABELS[auth.role] || auth.role}
            color={ROLE_COLORS[auth.role] || 'default'}
            size="small"
            sx={{ fontWeight: 600, fontSize: 11 }}
          />

          <IconButton onClick={e => setAnchorEl(e.currentTarget)} size="small">
            <Avatar sx={{
              width: 34, height: 34,
              bgcolor: 'primary.main',
              fontSize: 14, fontWeight: 700,
            }}>
              {auth.email?.[0]?.toUpperCase()}
            </Avatar>
          </IconButton>

          <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{ elevation: 2, sx: { borderRadius: 2, minWidth: 200, mt: 0.5 } }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="body2" fontWeight={600}>{auth.email}</Typography>
              <Typography variant="caption" color="text.secondary">
                {ROLE_LABELS[auth.role]}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => { logout(); setLoggedIn(false); setAnchorEl(null); }}
              sx={{ gap: 1.5, color: 'error.main', py: 1.5 }}>
              <Logout fontSize="small" /> Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer variant="permanent" sx={{
        width: DRAWER_WIDTH,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          bgcolor: 'white',
          borderRight: '1px solid',
          borderColor: 'grey.200',
        },
      }}>
        <Toolbar />
        <Box sx={{ pt: 2, pb: 1 }}>

          {/* Main navigation */}
          <List dense disablePadding>
            {NAV_MAIN.map(item => <NavItem key={item.page} item={item} />)}
          </List>

          {/* Master Data section */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" fontWeight={700} color="text.disabled"
              sx={{ px: 2, letterSpacing: 1, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
              Master Data
            </Typography>
            <List dense disablePadding>
              {NAV_MASTER.map(item => <NavItem key={item.page} item={item} />)}
            </List>
          </Box>

        </Box>
      </Drawer>

      {/* Main content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, maxWidth: 'calc(100vw - 252px)' }}>
        {renderPage()}
      </Box>

    </Box>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}