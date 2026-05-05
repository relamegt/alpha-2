import React, { useState } from 'react';
import { User, Shield, Save } from 'lucide-react';
import PersonalDetails from '../student/settings/PersonalDetails';
import SecuritySettings from '../student/settings/SecuritySettings';

const AdminSettingsLayout = () => {
    const [activeTab, setActiveTab] = useState('account');

    const tabs = [
        { id: 'account',  label: 'Account',  icon: User   },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'account':
                return <PersonalDetails hideHeader={true} />;
            case 'security':
                return <SecuritySettings hideHeader={true} />;
            default:
                return null;
        }
    };

    return (
        <div className="admin-page-wrapper pb-24 animate-fade-in">
            {/* Header */}
            <header className="page-header-container animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="page-header-title">Settings</h1>
                        <p className="page-header-desc">Manage your account information and security preferences.</p>
                    </div>
                </div>
            </header>

            {/* Tab Pills */}
            <div className="flex items-center p-1 bg-[var(--color-tab-container-bg)] border border-gray-100 dark:border-gray-800 rounded-full w-max shadow-sm overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'bg-[var(--color-tab-bg-active)] text-[var(--color-tab-text-active)] shadow-md ring-1 ring-[var(--color-tab-ring-active)]'
                                : 'text-[var(--color-tab-text-inactive)] hover:text-gray-900 dark:hover:text-gray-300'
                        }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Card */}
            <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl shadow-xl shadow-black/5 p-8 overflow-hidden transition-colors animate-fade-in">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default AdminSettingsLayout;
