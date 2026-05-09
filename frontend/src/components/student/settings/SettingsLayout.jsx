import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { 
    User, 
    CreditCard, 
    Zap, 
    Bell, 
    Users, 
    Monitor,
    Camera,
    Save,
    X
} from 'lucide-react';
import PersonalDetails from './PersonalDetails';
import ProfessionalDetails from './ProfessionalDetails';
import SecuritySettings from './SecuritySettings';
import CodingProfiles from './CodingProfiles';
import SubscriptionSettings from './SubscriptionSettings';
import AiUsageSettings from './AiUsageSettings';
import toast from 'react-hot-toast';

const SettingsLayout = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('account');

    const tabs = [
        { id: 'account', label: 'Account', icon: User, title: 'Account Settings', desc: 'Manage your profile information and professional details.' },
        { id: 'subscription', label: 'Subscription', icon: CreditCard, title: 'Subscription & Plans', desc: 'Manage your current plan, view billing details and expiry dates.' },
        { id: 'ai-usage', label: 'AI Usage', icon: Zap, title: 'Daily Usage Limits', desc: 'Monitor your remaining AI tokens, compiler runs and submissions.' },
        { id: 'sessions', label: 'Security', icon: Monitor, title: 'Security & Sessions', desc: 'Manage your password and monitor active device sessions.' },
    ];

    const activeTabData = tabs.find(t => t.id === activeTab) || tabs[0];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'account':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
                        <PersonalDetails hideHeader={true} />
                        <div className="border-t border-[var(--color-border-interactive)] pt-8">
                            <ProfessionalDetails hideHeader={true} />
                        </div>
                        <div className="border-t border-[var(--color-border-interactive)] pt-8">
                            <CodingProfiles hideHeader={true} />
                        </div>
                    </div>
                );
            case 'subscription':
                return <SubscriptionSettings />;
            case 'ai-usage':
                return <AiUsageSettings />;
            case 'sessions':
                return <SecuritySettings hideHeader={true} />;
            default:
                return (
                    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-[#111117] rounded-2xl flex items-center justify-center text-gray-400 mb-4 border border-gray-100 dark:border-gray-800">
                            {React.createElement(activeTabData.icon, { size: 32 })}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Coming Soon</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                            The {activeTabData.label} management feature is currently under development.
                        </p>
                    </div>
                );
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="w-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="page-header-container">
                        <h1 className="page-header-title">{activeTabData.title}</h1>
                        <p className="page-header-desc">{activeTabData.desc}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="btn-secondary py-2 px-4">
                            Cancel
                        </button>
                        {/* Note: The Save button is usually handled by individual forms, but we show it here for aesthetic consistency with the screenshot */}
                        <button className="btn-primary py-2 px-6">
                            <Save size={16} />
                            Save Changes
                        </button>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex items-center p-1 bg-[var(--color-tab-container-bg)] border border-gray-100 dark:border-gray-800 rounded-full mb-8 overflow-x-auto no-scrollbar w-max">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                                activeTab === tab.id 
                                    ? 'bg-[var(--color-tab-bg-active)] text-[var(--color-tab-text-active)] shadow-md ring-1 ring-[var(--color-tab-ring-active)]' 
                                    : 'text-[var(--color-tab-text-inactive)] hover:text-gray-900 dark:hover:text-gray-300'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl shadow-xl shadow-black/5 p-8 overflow-hidden transition-colors">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default SettingsLayout;









