import React from 'react';
import { Box, Typography, Chip } from '@mui/material';

export const PageHeader = ({ title, subtitle, action }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
    <Box>
      <Typography variant="h5" fontWeight={700} color="text.primary">{title}</Typography>
      {subtitle && <Typography variant="body2" color="text.secondary" mt={0.5}>{subtitle}</Typography>}
    </Box>
    {action && <Box>{action}</Box>}
  </Box>
);

const statusColors = {
  active: 'success', inactive: 'default', normal: 'success', low: 'error',
  pending: 'warning', approved: 'success', rejected: 'error',
  awaiting_procurement: 'info', po_raised: 'info',
  generated: 'default', sent: 'primary', in_transit: 'warning',
  delivered: 'success', cancelled: 'error', completed: 'success',
};

export const StatusChip = ({ status }) => (
  <Chip
    label={status?.replace(/_/g, ' ').toUpperCase()}
    color={statusColors[status] || 'default'}
    size="small"
    sx={{ fontWeight: 600, fontSize: '0.65rem' }}
  />
);
