import React, { useState, useMemo } from 'react';
import {
  Box, Card, Table, TableBody, TableCell, TableHead, TableRow,
  Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Alert, Chip, IconButton, Collapse,
  Tabs, Tab
} from '@mui/material';
import { Add, CheckCircle, Cancel, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useFetch } from '../hooks/useFetch';
import { api } from '../services/api';
import { PageHeader, StatusChip } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { can } from '../services/permissions';

const PRIORITIES = ['low', 'medium', 'high'];

const CreateDialog = ({ open, onClose, warehouses, materials, onSubmit }) => {
  const [form, setForm] = useState({ warehouseId: '', project: '', priority: 'medium', items: [{ materialId: '', quantity: '', unit: '', remarks: '' }] });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setItem = (i, k, v) => { const items = [...form.items]; items[i][k] = v; setForm(p => ({ ...p, items })); };
  const addItem    = () => setForm(p => ({ ...p, items: [...p.items, { materialId: '', quantity: '', unit: '', remarks: '' }] }));
  const removeItem = (i) => setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));

  const handleSubmit = async () => {
    const body = { ...form, items: form.items.map(it => ({ ...it, quantity: Number(it.quantity) })) };
    await onSubmit(body);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle fontWeight={700}>New Material Requisition</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField select label="Warehouse" value={form.warehouseId} onChange={e => set('warehouseId', e.target.value)} fullWidth>
            {warehouses?.map(w => <MenuItem key={w.warehouseId} value={w.warehouseId}>{w.name}</MenuItem>)}
          </TextField>
          <TextField select label="Priority" value={form.priority} onChange={e => set('priority', e.target.value)} sx={{ width: 160 }}>
            {PRIORITIES.map(p => <MenuItem key={p} value={p}>{p.toUpperCase()}</MenuItem>)}
          </TextField>
        </Box>
        <TextField label="Project Name" value={form.project} onChange={e => set('project', e.target.value)} fullWidth />
        <Typography variant="subtitle2" fontWeight={700} mt={1}>Items</Typography>
        {form.items.map((item, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField select label="Material" value={item.materialId} onChange={e => setItem(i, 'materialId', e.target.value)} sx={{ flex: 2 }}>
              {materials?.map(m => <MenuItem key={m.materialId} value={m.materialId}>{m.name}</MenuItem>)}
            </TextField>
            <TextField label="Qty"     type="number" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} sx={{ flex: 1 }} />
            <TextField label="Unit"    value={item.unit}    onChange={e => setItem(i, 'unit',    e.target.value)} sx={{ flex: 1 }} />
            <TextField label="Remarks" value={item.remarks} onChange={e => setItem(i, 'remarks', e.target.value)} sx={{ flex: 2 }} />
            {form.items.length > 1 && <IconButton onClick={() => removeItem(i)} color="error" size="small"><Cancel /></IconButton>}
          </Box>
        ))}
        <Button onClick={addItem} variant="outlined" size="small" startIcon={<Add />} sx={{ alignSelf: 'flex-start' }}>Add Item</Button>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>Submit Requisition</Button>
      </DialogActions>
    </Dialog>
  );
};

const ExpandableRow = ({ req, warehouseMap, materialMap, canApprove, canReject, onApprove, onReject }) => {
  const [open, setOpen] = useState(false);
  const priorityColor = { low: 'default', medium: 'warning', high: 'error' };

  return (
    <>
      <TableRow hover>
        <TableCell><Typography variant="body2" fontWeight={700}>{req.requisitionNo}</Typography></TableCell>
        <TableCell>{req.project}</TableCell>
        {/* ← FIXED: resolve name from warehouseMap */}
        <TableCell>{warehouseMap[req.warehouseId] || req.warehouseId}</TableCell>
        <TableCell><Chip label={req.priority?.toUpperCase()} size="small" color={priorityColor[req.priority] || 'default'} /></TableCell>
        <TableCell>{req.date}</TableCell>
        <TableCell><StatusChip status={req.status} /></TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {req.status === 'pending' && <>
              {canApprove && <IconButton size="small" color="success" onClick={() => onApprove(req.requisitionId)}><CheckCircle /></IconButton>}
              {canReject  && <IconButton size="small" color="error"   onClick={() => onReject(req.requisitionId)}><Cancel /></IconButton>}
            </>}
            <IconButton size="small" onClick={() => setOpen(o => !o)}>{open ? <ExpandLess /> : <ExpandMore />}</IconButton>
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{ py: 0 }}>
          <Collapse in={open}>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Items</Typography>
              {req.items?.map((item, i) => (
                <Box key={item.itemId || i} sx={{ display: 'flex', gap: 3, py: 0.5 }}>
                  {/* ← FIXED: resolve name from materialMap */}
                  <Typography variant="body2" fontWeight={600} sx={{ width: 180 }}>
                    {materialMap[item.materialId] || item.materialId}
                  </Typography>
                  <Typography variant="body2">{item.quantity} {item.unit}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.remarks}</Typography>
                </Box>
              ))}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export default function Requisitions() {
  const { auth } = useAuth();
  const [tab,    setTab]    = useState(0);
  const [dialog, setDialog] = useState(false);
  const [msg,    setMsg]    = useState(null);

  // ← FIXED: pass status as proper object, not raw string
  const statusFilters = [{}, { status: 'pending' }, { status: 'approved' }, { status: 'rejected' }];
  const { data: reqs, loading, reload } = useFetch(() => api.getRequisitions(statusFilters[tab]), [tab]);
  const { data: warehouses } = useFetch(api.getWarehouses);
  const { data: materials  } = useFetch(api.getMaterials);

  // ← NEW: lookup maps so rows can resolve names without backend enrichment
  const warehouseMap = useMemo(() =>
    Object.fromEntries((warehouses || []).map(w => [w.warehouseId, w.name])), [warehouses]);
  const materialMap = useMemo(() =>
    Object.fromEntries((materials || []).map(m => [m.materialId, m.name])), [materials]);

  const handleCreate  = async (body) => { await api.createRequisition(body); reload(); setMsg({ type: 'success', text: 'Requisition created!' }); };
  const handleApprove = async (id)   => { await api.approveRequisition(id, { approvedBy: auth.email }); reload(); setMsg({ type: 'success', text: 'Requisition approved!' }); };
  const handleReject  = async (id)   => { await api.rejectRequisition(id, { rejectedBy: auth.email, reason: 'Rejected by manager' }); reload(); setMsg({ type: 'success', text: 'Requisition rejected.' }); };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader title="Requisitions" subtitle="Material requisition and approval workflow"
        action={<Button variant="contained" startIcon={<Add />} onClick={() => setDialog(true)}>New Requisition</Button>}
      />
      {msg && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="All" /><Tab label="Pending" /><Tab label="Approved" /><Tab label="Rejected" />
      </Tabs>

      <Card elevation={2} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell><b>Req No</b></TableCell>
              <TableCell><b>Project</b></TableCell>
              <TableCell><b>Warehouse</b></TableCell>
              <TableCell><b>Priority</b></TableCell>
              <TableCell><b>Date</b></TableCell>
              <TableCell><b>Status</b></TableCell>
              <TableCell><b>Actions</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reqs?.map(req => (
              <ExpandableRow key={req.requisitionId} req={req}
                warehouseMap={warehouseMap} materialMap={materialMap}
                canApprove={can(auth?.role, 'canApproveRequisition')}
                canReject={can(auth?.role, 'canRejectRequisition')}
                onApprove={handleApprove} onReject={handleReject} />
            ))}
            {(!reqs || reqs.length === 0) && (
              <TableRow><TableCell colSpan={7} align="center">
                <Typography color="text.secondary" py={3}>No requisitions found</Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <CreateDialog open={dialog} onClose={() => setDialog(false)} warehouses={warehouses} materials={materials} onSubmit={handleCreate} />
    </Box>
  );
}