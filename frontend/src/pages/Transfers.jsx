import React, { useState, useMemo } from 'react';
import {
  Box, Card, Table, TableBody, TableCell, TableHead, TableRow,
  Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Alert, IconButton, Collapse, Tooltip
} from '@mui/material';
import { Add, CheckCircle, Cancel, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useFetch } from '../hooks/useFetch';
import { api } from '../services/api';
import { PageHeader, StatusChip } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { can } from '../services/permissions';

const CreateDialog = ({ open, onClose, warehouses, materials, onSubmit }) => {
  const [form, setForm] = useState({ fromWarehouse: '', toWarehouse: '', items: [{ materialId: '', quantity: '', unit: '' }] });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setItem = (i, k, v) => { const items = [...form.items]; items[i][k] = v; setForm(p => ({ ...p, items })); };
  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { materialId: '', quantity: '', unit: '' }] }));

  const handleSubmit = async () => {
    await onSubmit({ ...form, items: form.items.map(it => ({ ...it, quantity: Number(it.quantity) })) });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>New Transfer Request</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <TextField select label="From Warehouse" value={form.fromWarehouse} onChange={e => set('fromWarehouse', e.target.value)} fullWidth>
          {warehouses?.map(w => <MenuItem key={w.warehouseId} value={w.warehouseId}>{w.name}</MenuItem>)}
        </TextField>
        <TextField select label="To Warehouse" value={form.toWarehouse} onChange={e => set('toWarehouse', e.target.value)} fullWidth>
          {warehouses?.filter(w => w.warehouseId !== form.fromWarehouse).map(w => <MenuItem key={w.warehouseId} value={w.warehouseId}>{w.name}</MenuItem>)}
        </TextField>
        <Typography variant="subtitle2" fontWeight={700}>Materials to Transfer</Typography>
        {form.items.map((item, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1 }}>
            <TextField select label="Material" value={item.materialId} onChange={e => setItem(i, 'materialId', e.target.value)} sx={{ flex: 2 }}>
              {materials?.map(m => <MenuItem key={m.materialId} value={m.materialId}>{m.name}</MenuItem>)}
            </TextField>
            <TextField label="Qty"  type="number" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} sx={{ flex: 1 }} />
            <TextField label="Unit" value={item.unit} onChange={e => setItem(i, 'unit', e.target.value)} sx={{ flex: 1 }} />
          </Box>
        ))}
        <Button onClick={addItem} variant="outlined" size="small" startIcon={<Add />} sx={{ alignSelf: 'flex-start' }}>Add Item</Button>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>Submit Transfer</Button>
      </DialogActions>
    </Dialog>
  );
};

// ← FIXED: accept warehouseMap + materialMap as props
const TRow = ({ t, warehouseMap, materialMap, canApprove, onApprove, onReject }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow hover>
        <TableCell><Typography variant="body2" fontWeight={700}>{t.transferNo}</Typography></TableCell>
        <TableCell>{warehouseMap[t.fromWarehouse] || t.fromWarehouse}</TableCell>
        <TableCell>{warehouseMap[t.toWarehouse]   || t.toWarehouse}</TableCell>
        <TableCell>{t.date}</TableCell>
        <TableCell><StatusChip status={t.status} /></TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {canApprove && t.status === 'pending' && <>
              <Tooltip title="Approve Transfer">
                <IconButton size="small" color="success" onClick={() => onApprove(t.transferId)}><CheckCircle /></IconButton>
              </Tooltip>
              <Tooltip title="Reject Transfer">
                <IconButton size="small" color="error" onClick={() => onReject(t.transferId)}><Cancel /></IconButton>
              </Tooltip>
            </>}
            <IconButton size="small" onClick={() => setOpen(o => !o)}>{open ? <ExpandLess /> : <ExpandMore />}</IconButton>
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={6} sx={{ py: 0 }}>
          <Collapse in={open}>
            <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
              {t.items?.map((item, i) => (
                <Box key={item.itemId || i} sx={{ display: 'flex', gap: 3, py: 0.5 }}>
                  {/* ← FIXED: resolve material name from map */}
                  <Typography variant="body2" fontWeight={600} sx={{ width: 180 }}>
                    {materialMap[item.materialId] || item.materialId}
                  </Typography>
                  <Typography variant="body2">{item.quantity} {item.unit}</Typography>
                </Box>
              ))}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export default function Transfers() {
  const { auth } = useAuth();
  const [dialog, setDialog] = useState(false);
  const [msg,    setMsg]    = useState(null);

  const { data: transfers, loading, reload } = useFetch(api.getTransfers);
  const { data: warehouses } = useFetch(api.getWarehouses);
  const { data: materials  } = useFetch(api.getMaterials);

  const warehouseMap = useMemo(() =>
    Object.fromEntries((warehouses || []).map(w => [w.warehouseId, w.name])), [warehouses]);
  const materialMap = useMemo(() =>
    Object.fromEntries((materials || []).map(m => [m.materialId, m.name])), [materials]);

  const handleCreate  = async (body) => { await api.createTransfer(body);         reload(); setMsg({ type: 'success', text: 'Transfer requested!' }); };
  const handleApprove = async (id)   => { await api.approveTransfer(id, { approvedBy: auth.email }); reload(); setMsg({ type: 'success', text: 'Transfer approved and stock moved!' }); };
  const handleReject = async (id) => { await api.rejectTransfer(id, { reason: 'Rejected by manager' }); reload(); setMsg({ type: 'info', text: 'Transfer rejected.' }); };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader title="Transfers" subtitle="Move stock between warehouses"
        action={<Button variant="contained" startIcon={<Add />} onClick={() => setDialog(true)}>New Transfer</Button>}
      />
      {msg && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Card elevation={2} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell><b>Transfer No</b></TableCell>
              <TableCell><b>From</b></TableCell>
              <TableCell><b>To</b></TableCell>
              <TableCell><b>Date</b></TableCell>
              <TableCell><b>Status</b></TableCell>
              <TableCell><b>Actions</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transfers?.map(t => (
              <TRow key={t.transferId} t={t}
                warehouseMap={warehouseMap} materialMap={materialMap}
                canApprove={can(auth?.role, 'canApproveTransfer')}
                onApprove={handleApprove} onReject={handleReject} />
            ))}
          </TableBody>
        </Table>
      </Card>
      <CreateDialog open={dialog} onClose={() => setDialog(false)} warehouses={warehouses} materials={materials} onSubmit={handleCreate} />
    </Box>
  );
}