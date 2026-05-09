import React, { useState, useEffect } from 'react';
import authService from '../../../services/authService';
import toast from 'react-hot-toast';
import { 
    Shield, 
    Smartphone, 
    Monitor, 
    Globe, 
    Clock, 
    LogOut, 
    AlertCircle, 
    ChevronRight,
    MapPin,
    Laptop,
    Tablet
} from 'lucide-react';

const SecuritySettings = () => {
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const data = await authService.getSessions();
            setSessions(data.sessions || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setSessionsLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await authService.changePassword(
                passwordData.currentPassword,
                passwordData.newPassword
            );
            toast.success('Password changed successfully');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            toast.error(error.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeSession = async (sessionId) => {
        const confirm = window.confirm('Are you sure you want to log out this device?');
        if (!confirm) return;

        try {
            await authService.revokeSession(sessionId);
            toast.success('Session revoked');
            setSessions(sessions.filter(s => s.id !== sessionId));
        } catch (error) {
            toast.error('Failed to revoke session');
        }
    };

    const getDeviceIcon = (os) => {
        const lowerOs = os?.toLowerCase() || '';
        if (lowerOs.includes('android') || lowerOs.includes('ios') || lowerOs.includes('iphone')) return Smartphone;
        if (lowerOs.includes('ipad')) return Tablet;
        return Monitor;
    };

    const getDeviceType = (os) => {
        const lowerOs = os?.toLowerCase() || '';
        if (lowerOs.includes('android') || lowerOs.includes('ios') || lowerOs.includes('iphone')) return 'Mobile device';
        if (lowerOs.includes('ipad')) return 'Tablet device';
        return 'Desktop device';
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Password Change Section */}
            <section className="bg-[var(--color-bg-primary)] p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <Shield size={22} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Account Password</h3>
                        <p className="text-xs text-gray-500">Update your password to keep your account secure</p>
                    </div>
                </div>

                <form onSubmit={handleChangePassword} className="max-w-2xl space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Current Password</label>
                            <input
                                type="password"
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                className="w-full px-5 py-4 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                placeholder="Enter current password"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">New Password</label>
                            <input
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                className="w-full px-5 py-4 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                placeholder="Min 6 characters"
                                required
                                minLength={6}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Confirm New Password</label>
                            <input
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                className="w-full px-5 py-4 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                placeholder="Repeat new password"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !passwordData.currentPassword || !passwordData.newPassword}
                        className="btn-primary flex items-center gap-2 px-8 py-4 rounded-2xl shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                    >
                        {loading ? 'Updating...' : 'Update Password'}
                        {!loading && <ChevronRight size={18} />}
                    </button>
                </form>
            </section>

            {/* Active Sessions Section */}
            <section className="bg-[var(--color-bg-primary)] p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <Monitor size={22} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Logged In Devices</h3>
                            <p className="text-xs text-gray-500">Manage all your active sessions and devices</p>
                        </div>
                    </div>
                    {sessions.length > 1 && (
                        <button 
                            className="text-xs font-bold text-red-500 hover:underline transition-all"
                            onClick={() => toast('Feature coming soon: Sign out of all other devices')}
                        >
                            Sign out of all other devices
                        </button>
                    )}
                </div>

                {sessionsLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="spinner border-emerald-500"></div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sessions.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 dark:bg-black/20 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                                <AlertCircle className="mx-auto text-gray-400 mb-2" size={32} />
                                <p className="text-sm text-gray-500 font-medium">No active sessions found</p>
                            </div>
                        ) : (
                            sessions.map((session, idx) => {
                                const Icon = getDeviceIcon(session.os);
                                const isCurrent = session.userAgent === navigator.userAgent; // Basic check

                                return (
                                    <div 
                                        key={session.id} 
                                        className={`flex items-center justify-between p-4 rounded-3xl border transition-all hover:bg-gray-50 dark:hover:bg-white/5 ${
                                            isCurrent ? 'bg-indigo-50/20 dark:bg-white/5 border-gray-100 dark:border-white/5' : 'border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0">
                                                <Icon size={24} />
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-bold text-gray-900 dark:text-white text-[15px]">
                                                        {session.browser?.split(' ')[0] || 'Browser'} on {session.os || 'Unknown OS'}
                                                    </h4>
                                                    {isCurrent && (
                                                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                                                            Current Session
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[13px] text-gray-500 dark:text-gray-400 font-medium flex flex-wrap items-center gap-1.5">
                                                    <span>{getDeviceType(session.os)}</span>
                                                    {session.ipAddress && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{session.ipAddress === '::1' ? '127.0.0.1' : session.ipAddress}</span>
                                                        </>
                                                    )}
                                                    {session.location && session.location !== 'Unknown Location' && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{session.location}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">
                                                    Active: {formatDate(session.lastActive)}
                                                </div>
                                            </div>
                                        </div>

                                        {!isCurrent && (
                                            <button 
                                                onClick={() => handleRevokeSession(session.id)}
                                                className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                                                title="Sign out device"
                                            >
                                                <LogOut size={20} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                <div className="mt-8 flex items-start gap-4 p-5 rounded-3xl bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20">
                    <div className="p-2 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
                        <AlertCircle size={20} />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-widest mb-1">Security Tip</h4>
                        <p className="text-[11px] text-amber-800/70 dark:text-amber-400/70 leading-relaxed">
                            If you don't recognize a device or location in the list above, we recommend revoking that session 
                            immediately and changing your account password for safety.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default SecuritySettings;
