import React from 'react';
import {
  Grid, Card, CardContent, Typography, Box, CircularProgress,
  Alert, LinearProgress, Chip
} from '@mui/material';
import {
  Warehouse, Inventory2, Warning, Assignment,
  ShoppingCart, TrendingUp, LocalShipping
} from '@mui/icons-material';
import { useFetch } from '../hooks/useFetch';
import { api } from '../services/api';
import { PageHeader } from '../components/PageHeader';

const StatCard = ({ title, value, icon, color, subtitle }) => (
  <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>{title}</Typography>
          <Typography variant="h4" fontWeight={700} mt={0.5}>{value ?? '—'}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
        <Box sx={{ bgcolor: `${color}.lighter`, p: 1.5, borderRadius: 2 }}>
          {React.cloneElement(icon, { sx: { color: `${color}.main`, fontSize: 28 } })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const { data: dash, loading: l1, error: e1 } = useFetch(api.dashboard);
  const { data: stock, loading: l2, error: e2 } = useFetch(api.stockSummary);
  const { data: cons, loading: l3, error: e3 } = useFetch(api.consumption);

  const consList = cons ?? [];
  const topConsumption = [...consList].sort((a, b) => b.totalConsumed - a.totalConsumed).slice(0, 5);

  if (l1 || l2 || l3) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (e1 || e2 || e3) return <Alert severity="error">Failed to load dashboard data: {e1 || e2 || e3}</Alert>;

  return (
    <Box>
      <PageHeader title="Dashboard" subtitle="Construction Material Inventory Overview" />

      {/* Stat Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Active Warehouses"   value={dash?.totalWarehouses}     icon={<Warehouse />}     color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Total Materials"     value={dash?.totalMaterials}      icon={<Inventory2 />}    color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Low Stock Alerts"    value={dash?.lowStockItems}       icon={<Warning />}       color="error"   subtitle="Items below reorder level" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Pending Requisitions" value={dash?.pendingRequisitions} icon={<Assignment />}    color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Active POs"          value={dash?.activePOs}           icon={<ShoppingCart />}  color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Inventory Value"     value={`₹${(dash?.totalInventoryValue || 0).toLocaleString()}`} icon={<TrendingUp />} color="secondary" subtitle="Delivered POs total" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Stock per Warehouse */}
        <Grid item xs={12} md={7}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Stock by Warehouse</Typography>
              {stock?.map(wh => (
                <Box key={wh.warehouseId} mb={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={600}>{wh.warehouseName}</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip label={`${wh.totalItems} items`} size="small" color="primary" variant="outlined" />
                      {wh.lowStockCount > 0 && <Chip label={`${wh.lowStockCount} low`} size="small" color="error" />}
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={wh.totalItems > 0 ? ((wh.totalItems - wh.lowStockCount) / wh.totalItems) * 100 : 100}
                    color={wh.lowStockCount > 0 ? 'warning' : 'success'}
                    sx={{ borderRadius: 1, height: 8 }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Top Consumption */}
        <Grid item xs={12} md={5}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Top Material Consumption</Typography>
              {topConsumption.map(c => (
                <Box key={c.materialId} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalShipping sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">{c.materialName}</Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={700} color="primary.main">
                    {c.totalConsumed} {c.unit}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
