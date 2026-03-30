import React, { useState } from 'react';
import {
  Box, Card, Table, TableBody, TableCell, TableHead, TableRow,
  Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Alert, IconButton, Collapse, Chip, Tooltip
} from '@mui/material';
import { Add, Send, LocalShipping, ExpandMore, ExpandLess, Cancel, DirectionsBus } from '@mui/icons-material';
import { useFetch } from '../hooks/useFetch';
import { api } from '../services/api';
import { PageHeader, StatusChip } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { can } from '../services/permissions';

const CreateDialog = ({ open, onClose, vendors, materials, onSubmit }) => {
  const [form, setForm] = useState({ vendorId: '', expectedDeliveryDate: '', items: [{ materialId: '', quantity: '', unitPrice: '' }] });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setItem = (i, k, v) => { const items = [...form.items]; items[i][k] = v; setForm(p => ({ ...p, items })); };
  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { materialId: '', quantity: '', unitPrice: '' }] }));

  const handleSubmit = async () => {
    const body = { ...form, items: form.items.map(it => ({ ...it, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) })) };
    await onSubmit(body);
    onClose();
  };

  const total = form.items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unitPrice)), 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle fontWeight={700}>Create Purchase Order</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField select label="Vendor" value={form.vendorId} onChange={e => set('vendorId', e.target.value)} fullWidth>
            {vendors?.filter(v => v.status === 'active').map(v => <MenuItem key={v.vendorId} value={v.vendorId}>{v.name}</MenuItem>)}
          </TextField>
          <TextField label="Expected Delivery" type="date" value={form.expectedDeliveryDate} onChange={e => set('expectedDeliveryDate', e.target.value)} sx={{ width: 200 }} InputLabelProps={{ shrink: true }} />
        </Box>
        <Typography variant="subtitle2" fontWeight={700}>Items</Typography>
        {form.items.map((item, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1 }}>
            <TextField select label="Material" value={item.materialId} onChange={e => setItem(i, 'materialId', e.target.value)} sx={{ flex: 2 }}>
              {materials?.map(m => <MenuItem key={m.materialId} value={m.materialId}>{m.name}</MenuItem>)}
            </TextField>
            <TextField label="Qty" type="number" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} sx={{ flex: 1 }} />
            <TextField label="Unit Price ₹" type="number" value={item.unitPrice} onChange={e => setItem(i, 'unitPrice', e.target.value)} sx={{ flex: 1 }} />
          </Box>
        ))}
        <Button onClick={addItem} variant="outlined" size="small" startIcon={<Add />} sx={{ alignSelf: 'flex-start' }}>Add Item</Button>
        <Typography variant="subtitle1" fontWeight={700} color="primary.main">Total: ₹{total.toLocaleString()}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>Create PO</Button>
      </DialogActions>
    </Dialog>
  );
};

// Status flow: generated → sent → in_transit → delivered
//              any non-delivered/cancelled → cancelled
const PORow = ({ po, canSend, canDeliver, canCancel, onSend, onTransit, onDeliver, onCancel }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow hover>
        <TableCell><Typography variant="body2" fontWeight={700}>{po.poNumber}</Typography></TableCell>
        <TableCell>{po.vendorName}</TableCell>
        <TableCell>{po.date}</TableCell>
        <TableCell>{po.expectedDeliveryDate || '—'}</TableCell>
        <TableCell align="right"><Typography fontWeight={700} color="primary.main">₹{po.totalAmount?.toLocaleString()}</Typography></TableCell>
        <TableCell><StatusChip status={po.status} /></TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {/* generated → sent */}
            {canSend && po.status === 'generated' &&
              <Tooltip title="Send to Vendor"><IconButton size="small" color="primary" onClick={() => onSend(po.poId)}><Send fontSize="small" /></IconButton></Tooltip>}
            {/* sent → in_transit */}
            {canSend && po.status === 'sent' &&
              <Tooltip title="Mark In Transit"><IconButton size="small" color="warning" onClick={() => onTransit(po.poId)}><DirectionsBus fontSize="small" /></IconButton></Tooltip>}
            {/* in_transit → delivered */}
            {canDeliver && po.status === 'in_transit' &&
              <Tooltip title="Mark Delivered"><IconButton size="small" color="success" onClick={() => onDeliver(po.poId)}><LocalShipping fontSize="small" /></IconButton></Tooltip>}
            {/* cancel — any active status */}
            {canCancel && !['delivered', 'cancelled'].includes(po.status) &&
              <Tooltip title="Cancel Order"><IconButton size="small" color="error" onClick={() => onCancel(po.poId)}><Cancel fontSize="small" /></IconButton></Tooltip>}
            <IconButton size="small" onClick={() => setOpen(o => !o)}>{open ? <ExpandLess /> : <ExpandMore />}</IconButton>
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{ py: 0 }}>
          <Collapse in={open}>
            <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
              {/* Status timeline */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
                {['generated', 'sent', 'in_transit', 'delivered'].map((s, i, arr) => (
                  <React.Fragment key={s}>
                    <Chip
                      label={s.replace('_', ' ').toUpperCase()}
                      size="small"
                      variant={po.status === s ? 'filled' : 'outlined'}
                      color={po.status === s ? 'primary' : 'default'}
                      sx={{ fontWeight: po.status === s ? 700 : 400, opacity: ['cancelled'].includes(po.status) ? 0.4 : 1 }}
                    />
                    {i < arr.length - 1 && <Typography color="text.disabled">→</Typography>}
                  </React.Fragment>
                ))}
                {po.status === 'cancelled' && <Chip label="CANCELLED" size="small" color="error" />}
              </Box>
              {/* Items */}
              {po.items?.map(item => (
                <Box key={item.itemId} sx={{ display: 'flex', gap: 3, py: 0.5 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ width: 180 }}>{item.materialName}</Typography>
                  <Typography variant="body2">Qty: {item.quantity}</Typography>
                  <Typography variant="body2">₹{item.unitPrice}/unit</Typography>
                  <Typography variant="body2" fontWeight={700} color="primary.main">₹{item.totalPrice?.toLocaleString()}</Typography>
                </Box>
              ))}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export default function PurchaseOrders() {
  const { auth } = useAuth();
  const [dialog, setDialog] = useState(false);
  const [msg,    setMsg]    = useState(null);

  const { data: pos, loading, reload } = useFetch(api.getPurchaseOrders);
  const { data: vendors   } = useFetch(api.getVendors);
  const { data: materials } = useFetch(api.getMaterials);

  const handleCreate  = async (body) => { const r = await api.createPurchaseOrder(body); if (r.success) { reload(); setMsg({ type: 'success', text: 'PO created!' }); } };
  const handleSend    = async (id)   => { await api.sendPO(id);     reload(); setMsg({ type: 'success', text: 'PO sent to vendor!' }); };
  const handleTransit = async (id)   => { await api.transitPO(id);  reload(); setMsg({ type: 'success', text: 'PO marked in transit!' }); };
  const handleDeliver = async (id)   => { await api.deliverPO(id);  reload(); setMsg({ type: 'success', text: 'PO marked delivered!' }); };
  const handleCancel  = async (id)   => { await api.cancelPO(id);   reload(); setMsg({ type: 'success', text: 'PO cancelled.' }); };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader title="Purchase Orders" subtitle="Manage vendor purchase orders"
        action={can(auth?.role, 'canCreatePO') && <Button variant="contained" startIcon={<Add />} onClick={() => setDialog(true)}>Create PO</Button>}
      />
      {msg && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Card elevation={2} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell><b>PO Number</b></TableCell>
              <TableCell><b>Vendor</b></TableCell>
              <TableCell><b>Date</b></TableCell>
              <TableCell><b>Expected Delivery</b></TableCell>
              <TableCell align="right"><b>Amount</b></TableCell>
              <TableCell><b>Status</b></TableCell>
              <TableCell><b>Actions</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pos?.map(po => (
              <PORow key={po.poId} po={po}
                canSend={can(auth?.role, 'canSendPO')}
                canDeliver={can(auth?.role, 'canDeliverPO')}
                canCancel={can(auth?.role, 'canCreatePO')}
                onSend={handleSend}
                onTransit={handleTransit}
                onDeliver={handleDeliver}
                onCancel={handleCancel}
              />
            ))}
            {(!pos || pos.length === 0) && (
              <TableRow><TableCell colSpan={7} align="center">
                <Typography color="text.secondary" py={3}>No purchase orders found</Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      <CreateDialog open={dialog} onClose={() => setDialog(false)} vendors={vendors} materials={materials} onSubmit={handleCreate} />
    </Box>
  );
}