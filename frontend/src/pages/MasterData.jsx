import React, { useState, useEffect } from 'react';
import {
  Box, Card, Table, TableBody, TableCell, TableHead, TableRow,
  Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Alert, IconButton
} from '@mui/material';
import { Add, Edit } from '@mui/icons-material';
import { useFetch } from '../hooks/useFetch';
import { api } from '../services/api';
import { PageHeader, StatusChip } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { can } from '../services/permissions';

// ─── Reusable simple form dialog ────────────────────────────
const SimpleDialog = ({ open, onClose, title, fields, onSubmit, initial = {} }) => {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  React.useEffect(() => { if (open) setForm(initial); }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {fields.map(f => (
          <TextField key={f.key} label={f.label} value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)}
            type={f.type || 'text'} fullWidth multiline={f.multi} rows={f.multi ? 2 : 1} />
        ))}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => { onSubmit(form); onClose(); }}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── WAREHOUSES ──────────────────────────────────────────────
export function Warehouses() {
  const { auth } = useAuth();
  const [dialog, setDialog] = useState(null);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState(null);
  const { data: warehouses, loading, reload } = useFetch(api.getWarehouses);

  const fields = [
    { key: 'name',      label: 'Warehouse Name' },
    { key: 'location',  label: 'Location'       },
    { key: 'address',   label: 'Full Address', multi: true },
    { key: 'capacity',  label: 'Capacity',     type: 'number' },
  ];

  const handleSave = async (form) => {
    if (editing) {
      await api.updateWarehouse(editing.warehouseId, form);
      setMsg({ type: 'success', text: 'Warehouse updated!' });
    } else {
      await api.createWarehouse(form);
      setMsg({ type: 'success', text: 'Warehouse created!' });
    }
    reload();
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader title="Warehouses" subtitle="Manage storage locations"
        action={can(auth?.role, 'canEditMasterData') && <Button variant="contained" startIcon={<Add />} onClick={() => { setEditing(null); setDialog(true); }}>Add Warehouse</Button>}
      />
      {msg && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}
      <Card elevation={2} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell><b>Name</b></TableCell>
              <TableCell><b>Location</b></TableCell>
              <TableCell><b>Address</b></TableCell>
              <TableCell align="right"><b>Capacity</b></TableCell>
              <TableCell><b>Status</b></TableCell>
              <TableCell><b>Edit</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {warehouses?.map(w => (
              <TableRow key={w.warehouseId} hover>
                <TableCell><Typography variant="body2" fontWeight={700}>{w.name}</Typography></TableCell>
                <TableCell>{w.location}</TableCell>
                <TableCell><Typography variant="body2" color="text.secondary">{w.address}</Typography></TableCell>
                <TableCell align="right">{w.capacity}</TableCell>
                <TableCell><StatusChip status={w.status} /></TableCell>
                <TableCell>{can(auth?.role, 'canEditMasterData') && <IconButton size="small" onClick={() => { setEditing(w); setDialog(true); }}><Edit /></IconButton>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <SimpleDialog open={!!dialog} onClose={() => setDialog(null)} title={editing ? 'Edit Warehouse' : 'New Warehouse'}
        fields={fields} onSubmit={handleSave} initial={editing || {}} />
    </Box>
  );
}

// ─── MATERIALS ───────────────────────────────────────────────
export function Materials() {
  const { auth } = useAuth();
  const [dialog, setDialog] = useState(null);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState(null);
  const { data: materials, loading, reload } = useFetch(api.getMaterials);

  const fields = [
    { key: 'name',          label: 'Material Name' },
    { key: 'category',      label: 'Category'      },
    { key: 'unit',          label: 'Unit (bags/tons/pieces)' },
    { key: 'reorderLevel',  label: 'Reorder Level',  type: 'number' },
    { key: 'reorderQty',    label: 'Reorder Quantity', type: 'number' },
    { key: 'specifications',label: 'Specifications', multi: true },
  ];

  const handleSave = async (form) => {
    if (editing) {
      await api.updateMaterial(editing.materialId, form);
    } else {
      await api.createMaterial(form);
    }
    setMsg({ type: 'success', text: 'Saved!' });
    reload();
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader title="Materials" subtitle="Master list of all construction materials"
        action={can(auth?.role, 'canEditMasterData') && <Button variant="contained" startIcon={<Add />} onClick={() => { setEditing(null); setDialog(true); }}>Add Material</Button>}
      />
      {msg && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}
      <Card elevation={2} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell><b>Name</b></TableCell>
              <TableCell><b>Category</b></TableCell>
              <TableCell><b>Unit</b></TableCell>
              <TableCell align="right"><b>Reorder Level</b></TableCell>
              <TableCell align="right"><b>Reorder Qty</b></TableCell>
              <TableCell><b>Specifications</b></TableCell>
              <TableCell><b>Edit</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {materials?.map(m => (
              <TableRow key={m.materialId} hover>
                <TableCell><Typography variant="body2" fontWeight={700}>{m.name}</Typography></TableCell>
                <TableCell><Typography variant="body2">{m.category}</Typography></TableCell>
                <TableCell>{m.unit}</TableCell>
                <TableCell align="right">{m.reorderLevel}</TableCell>
                <TableCell align="right">{m.reorderQty}</TableCell>
                <TableCell><Typography variant="body2" color="text.secondary">{m.specifications}</Typography></TableCell>
                <TableCell>{can(auth?.role, 'canEditMasterData') && <IconButton size="small" onClick={() => { setEditing(m); setDialog(true); }}><Edit /></IconButton>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <SimpleDialog open={!!dialog} onClose={() => setDialog(null)} title={editing ? 'Edit Material' : 'New Material'}
        fields={fields} onSubmit={handleSave} initial={editing || {}} />
    </Box>
  );
}

// ─── VENDORS ─────────────────────────────────────────────────
export function Vendors() {
  const { auth } = useAuth();
  const [dialog, setDialog] = useState(null);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState(null);
  const { data: vendors, loading, reload } = useFetch(api.getVendors);

  const fields = [
    { key: 'name',          label: 'Vendor Name'    },
    { key: 'contactPerson', label: 'Contact Person' },
    { key: 'email',         label: 'Email'          },
    { key: 'phone',         label: 'Phone'          },
    { key: 'address',       label: 'Address', multi: true },
  ];

  const handleSave = async (form) => {
    if (editing) {
      await api.updateVendor(editing.vendorId, form);
    } else {
      await api.createVendor(form);
    }
    setMsg({ type: 'success', text: 'Saved!' });
    reload();
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader title="Vendors" subtitle="Supplier and vendor management"
        action={can(auth?.role, 'canEditMasterData') && <Button variant="contained" startIcon={<Add />} onClick={() => { setEditing(null); setDialog(true); }}>Add Vendor</Button>}
      />
      {msg && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}
      <Card elevation={2} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell><b>Name</b></TableCell>
              <TableCell><b>Contact</b></TableCell>
              <TableCell><b>Email</b></TableCell>
              <TableCell><b>Phone</b></TableCell>
              <TableCell><b>Address</b></TableCell>
              <TableCell align="right"><b>Rating</b></TableCell>
              <TableCell><b>Status</b></TableCell>
              <TableCell><b>Edit</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vendors?.map(v => (
              <TableRow key={v.vendorId} hover>
                <TableCell><Typography variant="body2" fontWeight={700}>{v.name}</Typography></TableCell>
                <TableCell>{v.contactPerson}</TableCell>
                <TableCell><Typography variant="body2" color="text.secondary">{v.email}</Typography></TableCell>
                <TableCell>{v.phone}</TableCell>
                <TableCell><Typography variant="body2" color="text.secondary">{v.address}</Typography></TableCell>
                <TableCell align="right">{'⭐'.repeat(Math.round(v.rating))} {v.rating}</TableCell>
                <TableCell><StatusChip status={v.status} /></TableCell>
                <TableCell>{can(auth?.role, 'canEditMasterData') && <IconButton size="small" onClick={() => { setEditing(v); setDialog(true); }}><Edit /></IconButton>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <SimpleDialog open={!!dialog} onClose={() => setDialog(null)} title={editing ? 'Edit Vendor' : 'New Vendor'}
        fields={fields} onSubmit={handleSave} initial={editing || {}} />
    </Box>
  );
}
