import React, { useState } from 'react';
import {
  Box, Card, CardContent, Table, TableBody, TableCell, TableHead, TableRow,
  Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Alert, Chip, Tabs, Tab
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useFetch } from '../hooks/useFetch';
import { api } from '../services/api';
import { PageHeader, StatusChip } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { can } from '../services/permissions';

const GRN_MIN_Form = ({ open, onClose, onSubmit, type, warehouses, materials }) => {
  const [form, setForm] = useState({ warehouseId: '', materialId: '', quantity: '', referenceNo: '', remarks: '' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    await onSubmit({ ...form, quantity: Number(form.quantity) });
    setForm({ warehouseId: '', materialId: '', quantity: '', referenceNo: '', remarks: '' });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>{type === 'grn' ? '📥 Record GRN (Stock In)' : '📤 Record MIN (Stock Out)'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <TextField select label="Warehouse" value={form.warehouseId} onChange={e => set('warehouseId', e.target.value)} fullWidth>
          {warehouses?.map(w => <MenuItem key={w.warehouseId} value={w.warehouseId}>{w.name}</MenuItem>)}
        </TextField>
        <TextField select label="Material" value={form.materialId} onChange={e => set('materialId', e.target.value)} fullWidth>
          {materials?.map(m => <MenuItem key={m.materialId} value={m.materialId}>{m.name} ({m.unit})</MenuItem>)}
        </TextField>
        <TextField label="Quantity" type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)} fullWidth />
        <TextField label="Reference No (PO/REQ)" value={form.referenceNo} onChange={e => set('referenceNo', e.target.value)} fullWidth />
        <TextField label="Remarks" value={form.remarks} onChange={e => set('remarks', e.target.value)} fullWidth multiline rows={2} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} color={type === 'grn' ? 'success' : 'warning'}>
          {type === 'grn' ? 'Record GRN' : 'Record MIN'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default function Inventory() {
  const { auth } = useAuth();
  const [tab,     setTab]     = useState(0);
  const [dialog,  setDialog]  = useState(null); // 'grn' | 'min' | null
  const [msg,     setMsg]     = useState(null);

  const { data: inventory, loading, reload } = useFetch(api.getInventory);
  const { data: lowStock, reload: reloadLow } = useFetch(api.getLowStock);
  const { data: warehouses } = useFetch(api.getWarehouses);
  const { data: materials  } = useFetch(api.getMaterials);

  const handleSubmit = async (body) => {
    const res = await (dialog === 'grn' ? api.recordGRN(body) : api.recordMIN(body));
    setMsg(res.success ? { type: 'success', text: res.data.message } : { type: 'error', text: res.message });
    reload(); reloadLow();
  };

  const rows = tab === 0 ? inventory : lowStock;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader
        title="Inventory"
        subtitle="Real-time stock levels across all warehouses"
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            {can(auth?.role, 'canRecordGRN') && <Button variant="outlined" color="success" startIcon={<Add />} onClick={() => setDialog('grn')}>GRN</Button>}
            {can(auth?.role, 'canRecordMIN') && <Button variant="outlined" color="warning" startIcon={<Add />} onClick={() => setDialog('min')}>MIN</Button>}
          </Box>
        }
      />

      {msg && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`All Stock (${inventory?.length || 0})`} />
        <Tab label={`⚠ Low Stock (${lowStock?.length || 0})`} />
      </Tabs>

      <Card elevation={2} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell><b>Material</b></TableCell>
              <TableCell><b>Warehouse</b></TableCell>
              <TableCell align="right"><b>Quantity</b></TableCell>
              <TableCell align="right"><b>Reorder Level</b></TableCell>
              <TableCell><b>Status</b></TableCell>
              <TableCell><b>Last Updated</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows?.map((row, i) => (
              <TableRow key={i} hover>
                <TableCell><Typography variant="body2" fontWeight={600}>{row.materialName}</Typography></TableCell>
                <TableCell><Typography variant="body2" color="text.secondary">{row.warehouseName}</Typography></TableCell>
                <TableCell align="right"><Typography variant="body2" fontWeight={700}>{row.quantity} {row.unit}</Typography></TableCell>
                <TableCell align="right"><Typography variant="body2" color="text.secondary">{row.reorderLevel}</Typography></TableCell>
                <TableCell><StatusChip status={row.status} /></TableCell>
                <TableCell><Typography variant="body2" color="text.secondary">{row.lastUpdated}</Typography></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <GRN_MIN_Form open={!!dialog} onClose={() => setDialog(null)} onSubmit={handleSubmit} type={dialog} warehouses={warehouses} materials={materials} />
    </Box>
  );
}
