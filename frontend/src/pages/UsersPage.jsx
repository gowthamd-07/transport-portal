import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Users, UserPlus, Edit2, Trash2, Shield, User, X } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const emptyUser = { username: '', password: '', full_name: '', email: '', role: 'user' };

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyUser);
  const [confirmModal, setConfirmModal] = useState(null);

  const fetchUsers = async () => {
    try { setUsers(await api.getUsers()); }
    catch { toast.error('Failed to load users'); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyUser);
    setShowForm(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({ username: u.username, password: '', full_name: u.full_name, email: u.email, role: u.role });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const payload = { full_name: form.full_name, email: form.email, role: form.role };
        if (form.password) payload.password = form.password;
        await api.updateUser(editingUser.id, payload);
        toast.success('User updated');
      } else {
        if (!form.username || !form.password || !form.full_name) {
          toast.error('Username, password, and full name are required');
          return;
        }
        await api.createUser(form);
        toast.success('User created');
      }
      setShowForm(false);
      fetchUsers();
    } catch (err) { toast.error(err.message); }
  };

  const handleDeactivate = (u) => {
    setConfirmModal({
      title: 'Deactivate User',
      message: `Deactivate ${u.full_name} (${u.username})? They won't be able to log in.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.deleteUser(u.id);
          toast.success('User deactivated');
          fetchUsers();
        } catch (err) { toast.error(err.message); }
        setConfirmModal(null);
      },
    });
  };

  const handleReactivate = async (u) => {
    try {
      await api.updateUser(u.id, { is_active: true });
      toast.success('User reactivated');
      fetchUsers();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p className="page-subtitle">{users.length} users registered</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <UserPlus size={16} /> Add User
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
            <button className="btn btn-outline btn-sm btn-icon" onClick={() => setShowForm(false)}><X size={14} /></button>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Username <span className="required">*</span></label>
                  <input type="text" placeholder="Enter username" value={form.username} onChange={e => handleChange('username', e.target.value)} disabled={!!editingUser} required={!editingUser} />
                </div>
                <div className="form-group">
                  <label>{editingUser ? 'New Password (leave blank to keep)' : 'Password'} {!editingUser && <span className="required">*</span>}</label>
                  <input type="password" placeholder={editingUser ? 'Leave blank to keep current' : 'Enter password'} value={form.password} onChange={e => handleChange('password', e.target.value)} required={!editingUser} />
                </div>
                <div className="form-group">
                  <label>Full Name <span className="required">*</span></label>
                  <input type="text" placeholder="Enter full name" value={form.full_name} onChange={e => handleChange('full_name', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" placeholder="Enter email" value={form.email} onChange={e => handleChange('email', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Role <span className="required">*</span></label>
                  <select value={form.role} onChange={e => handleChange('role', e.target.value)}>
                    <option value="user">User (Fleet Operator)</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="btn-row">
                <button type="submit" className="btn btn-primary">{editingUser ? 'Update User' : 'Create User'}</button>
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-wrapper users-table-desktop">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Username</th><th>Full Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr key={u.id} className={!u.is_active ? 'cancelled' : ''}>
                  <td>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{u.username}</td>
                  <td>{u.full_name}</td>
                  <td>{u.email || '-'}</td>
                  <td>
                    <span className={`status-badge ${u.role === 'admin' ? 'closed' : 'not-closed'}`}>
                      {u.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${u.is_active ? 'not-closed' : 'cancelled'}`}>
                      <span className="status-dot" />{u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{u.created_at?.slice(0, 10)}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-outline btn-sm btn-icon" title="Edit" onClick={() => openEdit(u)}><Edit2 size={14} /></button>
                      {u.id !== currentUser.id && (
                        u.is_active ?
                          <button className="btn btn-danger btn-sm btn-icon" title="Deactivate" onClick={() => handleDeactivate(u)}><Trash2 size={14} /></button> :
                          <button className="btn btn-success btn-sm btn-icon" title="Reactivate" onClick={() => handleReactivate(u)}><Shield size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="users-cards-mobile">
          {users.length === 0 ? (
            <div className="empty-state"><Users size={36} /><p>No users yet.</p></div>
          ) : users.map(u => (
            <div key={u.id} className={`vcard ${!u.is_active ? 'vcard-inactive' : ''}`}>
              <div className="vcard-header">
                <div className="vcard-top">
                  <span className="vcard-no">{u.full_name}</span>
                  <span className={`status-badge ${u.is_active ? 'not-closed' : 'cancelled'}`}>
                    <span className="status-dot" />{u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="vcard-sub">
                  @{u.username} &middot;
                  <span className={`status-badge ${u.role === 'admin' ? 'closed' : 'not-closed'}`} style={{ marginLeft: 4, fontSize: 10 }}>
                    {u.role === 'admin' ? <Shield size={10} /> : <User size={10} />} {u.role}
                  </span>
                </div>
                {u.email && <div className="vcard-sub" style={{ fontSize: 11, marginTop: 2 }}>{u.email}</div>}
              </div>
              <div className="vcard-footer">
                <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{u.created_at?.slice(0, 10)}</span>
                <div className="action-btns">
                  <button className="btn btn-outline btn-sm btn-icon" title="Edit" onClick={() => openEdit(u)}><Edit2 size={14} /></button>
                  {u.id !== currentUser.id && (
                    u.is_active ?
                      <button className="btn btn-danger btn-sm btn-icon" title="Deactivate" onClick={() => handleDeactivate(u)}><Trash2 size={14} /></button> :
                      <button className="btn btn-success btn-sm btn-icon" title="Reactivate" onClick={() => handleReactivate(u)}><Shield size={14} /></button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {confirmModal && <ConfirmModal {...confirmModal} onCancel={() => setConfirmModal(null)} />}
    </div>
  );
}
