import React, { useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import { Plus, Edit2, Trash2, Sliders, Check, X, AlertCircle } from 'lucide-react';
import * as api from '../services/api';

export default function BinManagementPage({ bins = [], onRefresh }) {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [editingBin, setEditingBin] = useState(null);
  const [deletingBin, setDeletingBin] = useState(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Bin Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    location: '',
    empty_distance: 40.0,
    full_distance: 5.0,
    collection_threshold: 80,
    urgent_threshold: 95
  });

  const handleOpenRegister = () => {
    setFormData({
      id: `BIN-00${bins.length + 1}`,
      name: `Municipal Bin ${bins.length + 1}`,
      location: '',
      empty_distance: 40.0,
      full_distance: 5.0,
      collection_threshold: 80,
      urgent_threshold: 95
    });
    setFormError('');
    setIsRegisterOpen(true);
  };

  const handleCreateBin = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.id.trim()) {
      setFormError('Bin ID is required.');
      return;
    }
    if (!formData.location.trim()) {
      setFormError('Bin location is required.');
      return;
    }
    if (Number(formData.empty_distance) <= Number(formData.full_distance)) {
      setFormError('Empty distance (cm) must be greater than Full distance (cm).');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createBin(formData);
      setIsRegisterOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setFormError(err.response?.data?.error || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBin = async (e) => {
    e.preventDefault();
    setFormError('');

    if (Number(editingBin.empty_distance) <= Number(editingBin.full_distance)) {
      setFormError('Empty distance (cm) must be greater than Full distance (cm).');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.updateBin(editingBin.id, editingBin);
      setEditingBin(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      setFormError(err.response?.data?.error || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBin = async () => {
    if (!deletingBin) return;
    try {
      setIsSubmitting(true);
      await api.deleteBin(deletingBin.id);
      setDeletingBin(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Failed to delete bin: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner and Register Action */}
      <div className="content-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 className="card-title">Municipal Receptacle Inventory & Configuration</h2>
            <p className="card-subtitle">
              Manage installed ESP8266 node metadata, ultrasonic sensor calibration baselines, and alert thresholds.
            </p>
          </div>

          <button className="btn btn-primary" onClick={handleOpenRegister} id="btn-register-bin">
            <Plus size={16} />
            <span>Register New Bin</span>
          </button>
        </div>
      </div>

      {/* Receptacles Table */}
      <div className="content-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Bin ID</th>
                <th>Name / Label</th>
                <th>Location</th>
                <th>Empty Ref</th>
                <th>Full Ref</th>
                <th>Thresholds (Coll / Urg)</th>
                <th>Current Status</th>
                <th>Device Link</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bins.map(bin => (
                <tr key={bin.id}>
                  <td style={{ fontWeight: 800 }}>{bin.id}</td>
                  <td style={{ fontWeight: 600 }}>{bin.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{bin.location}</td>
                  <td>{bin.empty_distance} cm</td>
                  <td>{bin.full_distance} cm</td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{bin.collection_threshold}%</span> / <span style={{ color: '#DC2626', fontWeight: 600 }}>{bin.urgent_threshold}%</span>
                  </td>
                  <td>
                    <StatusBadge status={bin.status} />
                  </td>
                  <td>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: bin.is_online ? '#16A34A' : '#DC2626' }}>
                      {bin.is_online ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setEditingBin({ ...bin });
                          setFormError('');
                        }}
                        title="Edit Bin Configuration"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setDeletingBin(bin)}
                        title="Remove Bin"
                        style={{ color: '#DC2626' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register New Bin */}
      {isRegisterOpen && (
        <div className="modal-backdrop" onClick={() => setIsRegisterOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Register New Garbage Bin</h3>
              <button className="collapse-btn" onClick={() => setIsRegisterOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateBin}>
              <div className="modal-body">
                {formError && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#B91C1C', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Bin ID *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. BIN-007"
                      value={formData.id}
                      onChange={e => setFormData({ ...formData, id: e.target.value })}
                      required
                    />
                    <span className="form-help">Must match firmware DEVICE_BIN_ID</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Descriptive Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Science Complex Receptacle"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Municipal Location *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Engineering Gate 3"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Empty Distance (cm) *</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-input"
                      value={formData.empty_distance}
                      onChange={e => setFormData({ ...formData, empty_distance: parseFloat(e.target.value) })}
                      required
                    />
                    <span className="form-help">Sensor height when bin is empty</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Full Distance (cm) *</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-input"
                      value={formData.full_distance}
                      onChange={e => setFormData({ ...formData, full_distance: parseFloat(e.target.value) })}
                      required
                    />
                    <span className="form-help">Sensor clearance when 100% full</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Collection Threshold (%)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.collection_threshold}
                      onChange={e => setFormData({ ...formData, collection_threshold: parseInt(e.target.value, 10) })}
                    />
                    <span className="form-help">Triggers HIGH / Schedule Dispatch</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Urgent Threshold (%)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.urgent_threshold}
                      onChange={e => setFormData({ ...formData, urgent_threshold: parseInt(e.target.value, 10) })}
                    />
                    <span className="form-help">Triggers FULL / Urgent Dispatch</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsRegisterOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Registering...' : 'Register Bin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Bin */}
      {editingBin && (
        <div className="modal-backdrop" onClick={() => setEditingBin(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Edit Bin: {editingBin.id}</h3>
              <button className="collapse-btn" onClick={() => setEditingBin(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateBin}>
              <div className="modal-body">
                {formError && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#B91C1C', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Descriptive Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingBin.name}
                    onChange={e => setEditingBin({ ...editingBin, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Municipal Location</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingBin.location}
                    onChange={e => setEditingBin({ ...editingBin, location: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Empty Reference (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-input"
                      value={editingBin.empty_distance}
                      onChange={e => setEditingBin({ ...editingBin, empty_distance: parseFloat(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Full Reference (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-input"
                      value={editingBin.full_distance}
                      onChange={e => setEditingBin({ ...editingBin, full_distance: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Collection Threshold (%)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingBin.collection_threshold}
                      onChange={e => setEditingBin({ ...editingBin, collection_threshold: parseInt(e.target.value, 10) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Urgent Threshold (%)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingBin.urgent_threshold}
                      onChange={e => setEditingBin({ ...editingBin, urgent_threshold: parseInt(e.target.value, 10) })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingBin(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deletingBin && (
        <div className="modal-backdrop" onClick={() => setDeletingBin(null)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#DC2626' }}>Confirm Removal</h3>
              <button className="collapse-btn" onClick={() => setDeletingBin(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                Are you sure you want to remove <strong>{deletingBin.id}</strong> ({deletingBin.location}) from municipal monitoring?
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                This will unregister the node from the active monitoring dashboard.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeletingBin(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeleteBin} disabled={isSubmitting}>
                {isSubmitting ? 'Deleting...' : 'Delete Bin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
