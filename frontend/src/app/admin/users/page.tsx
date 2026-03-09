'use client';
import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, Shield, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', icon: ShieldAlert, color: 'text-red-600 dark:text-red-400' },
  { value: 'ADMIN', label: 'Admin', icon: ShieldCheck, color: 'text-amber-600 dark:text-amber-400' },
  { value: 'EDITOR', label: 'Editor', icon: Shield, color: 'text-blue-600 dark:text-blue-400' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', displayName: '', role: 'EDITOR' });
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const data = await adminApi.getUsers();
      setUsers(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => {
    setEditingUser(null);
    setForm({ email: '', password: '', displayName: '', role: 'EDITOR' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({ email: user.email, password: '', displayName: user.displayName, role: user.role });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.email || !form.displayName) { setError('Email and display name are required'); return; }
    if (!editingUser && !form.password) { setError('Password is required for new users'); return; }

    setSaving(true);
    setError('');
    try {
      if (editingUser) {
        const data: any = { email: form.email, displayName: form.displayName, role: form.role };
        if (form.password) data.password = form.password;
        await adminApi.updateUser(editingUser.id, data);
      } else {
        await adminApi.createUser(form);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save user');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete user');
    }
    setDeleting(false);
  };

  const toggleActive = async (user: User) => {
    try {
      await adminApi.updateUser(user.id, { isActive: !user.isActive });
      fetchUsers();
    } catch {}
  };

  const getRoleInfo = (role: string) => ROLES.find(r => r.value === role) || ROLES[2];

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Users</h1>
        <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Add User</button>
      </div>

      {/* Users Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-zinc-700">
              <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">User</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Email</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Role</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Status</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Last Login</th>
              <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {users.map(user => {
              const roleInfo = getRoleInfo(user.role);
              const RoleIcon = roleInfo.icon;
              return (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-zinc-900/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 font-semibold text-sm">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white">{user.displayName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className={cn('flex items-center gap-1.5 text-xs font-medium', roleInfo.color)}>
                      <RoleIcon className="h-3.5 w-3.5" /> {roleInfo.label}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button onClick={() => toggleActive(user)} className={cn('px-2 py-0.5 rounded-full text-xs font-medium', user.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400')}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(user)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteTarget(user)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="py-12 text-center text-slate-400">No users found</div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-zinc-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{editingUser ? 'Edit User' : 'Add User'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />{error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Display Name</label>
                <input value={form.displayName} onChange={e => setForm({...form, displayName: e.target.value})} className="input-field" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" placeholder="admin@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Password {editingUser && <span className="text-xs text-slate-400">(leave blank to keep current)</span>}
                </label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input-field" placeholder={editingUser ? '••••••••' : 'Min 6 characters'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="input-field">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200 dark:border-zinc-700">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : editingUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Delete User</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Are you sure you want to permanently delete <strong className="text-slate-900 dark:text-white">{deleteTarget.displayName}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3 p-4 border-t border-slate-200 dark:border-zinc-700">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-900">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2">
                {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</> : <><Trash2 className="h-4 w-4" /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
