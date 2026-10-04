import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { saveUser } from '../lib/storage';
import { 
  X, 
  UserPlus, 
  User, 
  Mail, 
  Phone, 
  GraduationCap, 
  Building, 
  Shield, 
  Check, 
  AlertCircle 
} from 'lucide-react';

interface AdminAddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: (newUser: UserProfile) => void;
}

export const AdminAddUserModal: React.FC<AdminAddUserModalProps> = ({
  isOpen,
  onClose,
  onUserCreated,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [uidOrRoll, setUidOrRoll] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering (CSE)');
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escape key listener to dismiss modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide user name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const generatedId = `user_${Date.now()}`;
    const newUser: UserProfile = {
      id: generatedId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      uidOrRoll: uidOrRoll.trim().toUpperCase() || `21BCS${Math.floor(1000 + Math.random() * 9000)}`,
      phone: phone.trim() || '+91 9878XXXXXX',
      department: department.trim() || 'University Campus',
      role,
      joinedDate: new Date().toISOString().split('T')[0],
      profileCompleted: true,
    };

    saveUser(newUser);
    setIsSubmitting(false);
    onUserCreated(newUser);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden my-auto max-h-[92vh] sm:max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header with Prominent Close Button */}
        <div className="sticky top-0 z-30 shrink-0 bg-slate-900 text-white p-4 sm:p-6 pr-14 relative border-b border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/25 active:scale-95 transition-all cursor-pointer ring-1 ring-white/15"
            aria-label="Close modal"
            title="Close (Esc)"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-red-500" />
            <span>Add Campus Member / Staff</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Register a student or security administrator to the central platform registry.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain flex flex-col">
          <div className="p-4 sm:p-6 space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Gurpreet Singh"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="gurpreet.cse@cuchd.in"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                CU UID / Roll Number
              </label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={uidOrRoll}
                  onChange={e => setUidOrRoll(e.target.value)}
                  placeholder="e.g. 23BCS10890"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 uppercase"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 9878XXXXXX"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Assigned Role
              </label>
              <div className="relative">
                <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as 'student' | 'admin')}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="student">Student / Campus Member</option>
                  <option value="admin">Administrator / Security Officer</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Academic Department / Unit
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science & Engineering (CSE)"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>
          </div>

          {/* Sticky Actions Bar */}
          <div className="sticky bottom-0 z-20 shrink-0 p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50/95 backdrop-blur-md flex items-center justify-end gap-2.5 mt-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full text-xs font-extrabold text-white bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 active:scale-95 transition-all shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Registering...' : 'Register User'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
