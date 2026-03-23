import React from 'react';
import { Grid, Card, CardContent, Typography, Box, CircularProgress, LinearProgress, Alert } from '@mui/material';
import { useFetch } from '../hooks/useFetch';
import { api } from '../services/api';
import { PageHeader } from '../components/PageHeader';

const PieBar = ({ data, colorMap }) => {
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  const colors = { pending: '#ff9800', approved: '#4caf50', rejected: '#f44336', delivered: '#4caf50', sent: '#2196f3', in_transit: '#ff9800', generated: '#9e9e9e', awaiting_procurement: '#03a9f4', po_raised: '#03a9f4' };

  return (
    <Box>
      {Object.entries(data).map(([status, count]) => (
        <Box key={status} mb={1.5}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" textTransform="capitalize">{status.replace(/_/g, ' ')}</Typography>
            <Typography variant="body2" fontWeight={700}>{count} ({Math.round((count / total) * 100)}%)</Typography>
          </Box>
          <LinearProgress variant="determinate" value={(count / total) * 100}
            sx={{ borderRadius: 1, height: 10, bgcolor: 'grey.200', '& .MuiLinearProgress-bar': { bgcolor: colors[status] || '#757575' } }} />
        </Box>
      ))}
    </Box>
  );
};

export default function Analytics() {
  const { data: proc, loading: l1, error: e1 } = useFetch(api.procurementSummary);
  const { data: reqSummary, loading: l2, error: e2 } = useFetch(api.requisitionSummary);
  const { data: cons, loading: l3, error: e3 } = useFetch(api.consumption);
  const { data: stock, loading: l4, error: e4 } = useFetch(api.stockSummary);

  const consList = cons ?? [];
  const sortedConsumption = [...consList].sort((a, b) => b.totalConsumed - a.totalConsumed);

  if (l1 || l2 || l3 || l4) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (e1 || e2 || e3 || e4) return <Alert severity="error">Failed to load analytics data: {e1 || e2 || e3 || e4}</Alert>;

  return (
    <Box>
      <PageHeader title="Analytics" subtitle="Inventory insights and procurement reports" />

      <Grid container spacing={3}>
        {/* Procurement Summary */}
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={0.5}>Purchase Order Status</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Total: {proc?.totalOrders} orders · Spent: ₹{proc?.totalSpend?.toLocaleString()}
              </Typography>
              {proc?.statusGroups && <PieBar data={proc.statusGroups} />}
            </CardContent>
          </Card>
        </Grid>

        {/* Requisition Summary */}
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={0.5}>Requisition Status</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>Total: {reqSummary?.total} requisitions</Typography>
              {reqSummary?.statusGroups && <PieBar data={reqSummary.statusGroups} />}
            </CardContent>
          </Card>
        </Grid>

        {/* Consumption Table */}
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Material Consumption</Typography>
              {sortedConsumption.map(c => (
                <Box key={c.materialId} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body2" fontWeight={600}>{c.materialName}</Typography>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" fontWeight={700} color="primary.main">{c.totalConsumed} {c.unit}</Typography>
                    <Typography variant="caption" color="text.secondary">{c.count} transactions</Typography>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Stock by Warehouse */}
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Stock Health by Warehouse</Typography>
              {stock?.map(wh => (
                <Box key={wh.warehouseId} mb={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight={700}>{wh.warehouseName}</Typography>
                    <Typography variant="caption" color={wh.lowStockCount > 0 ? 'error.main' : 'success.main'}>
                      {wh.lowStockCount > 0 ? `${wh.lowStockCount} low` : 'All OK'}
                    </Typography>
                  </Box>
                  {wh.items.map(item => (
                    <Box key={item.materialId} sx={{ display: 'flex', justifyContent: 'space-between', pl: 1, py: 0.3 }}>
                      <Typography variant="caption" color="text.secondary">{item.materialName}</Typography>
                      <Typography variant="caption" fontWeight={600} color={item.status === 'low' ? 'error.main' : 'text.primary'}>
                        {item.quantity} {item.unit}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
