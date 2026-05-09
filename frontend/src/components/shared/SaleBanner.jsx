import React, { useState, useEffect, useRef } from 'react';
import { Spotlight, X,Zap, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import toast from 'react-hot-toast';

const SaleBanner = ({ onHeightChange }) => {
    const [banner, setBanner] = useState(null);
    const [timeLeftUnits, setTimeLeftUnits] = useState({ days: '00', hours: '00', minutes: '00', seconds: '00' });
    const [isVisible, setIsVisible] = useState(false);
    const bannerRef = useRef(null);

    // Notify parent of height whenever visibility or content changes
    useEffect(() => {
        const height = (isVisible && banner && bannerRef.current)
            ? bannerRef.current.getBoundingClientRect().height
            : 0;
        onHeightChange?.(height);
        document.documentElement.style.setProperty('--banner-height', `${height}px`);
    }, [isVisible, banner]);

    useEffect(() => {
        fetchActiveBanner();
        return () => {
            // Clean up on unmount
            document.documentElement.style.setProperty('--banner-height', '0px');
            onHeightChange?.(0);
        };
    }, []);

    useEffect(() => {
        if (banner) {
            const isDismissed = sessionStorage.getItem(`sale_banner_dismissed_${banner.id}`);
            if (!isDismissed) {
                setIsVisible(true);
            }
        }
    }, [banner]);

    const handleDismiss = () => {
        setIsVisible(false);
        if (banner?.id) {
            sessionStorage.setItem(`sale_banner_dismissed_${banner.id}`, 'true');
        }
    };

    const fetchActiveBanner = async () => {
        try {
            const response = await apiClient.get('/sales/active-banner');
            if (response.data.banner) {
                setBanner(response.data.banner);
                startTimer(response.data.banner.endTime);
            }
        } catch (error) {
            console.error('Failed to fetch sale banner');
        }
    };

    const startTimer = (endTime) => {
        if (!endTime) return;
        
        const updateTimer = () => {
            const now = new Date().getTime();
            const distance = new Date(endTime).getTime() - now;

            if (distance < 0) {
                setBanner(null);
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setTimeLeftUnits({
                days: days.toString().padStart(2, '0'),
                hours: hours.toString().padStart(2, '0'),
                minutes: minutes.toString().padStart(2, '0'),
                seconds: seconds.toString().padStart(2, '0')
            });
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    };

    if (!banner || !isVisible) return null;

    return (
        <div 
            ref={bannerRef}
            className="w-full py-2 px-4 relative z-[100] bg-[#7d63f2] text-white border-b border-white/10 shadow-[0_4px_20px_rgba(125,99,242,0.2)]"
        >
            <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
                {/* Left: Promotional Text */}
                <div className="flex-1 flex items-center gap-3 min-w-0">
                    <div className="animate-pulse hidden sm:block shrink-0">
                        <Spotlight size={24} className="text-white" fill="white" />
                    </div>
                    <div className="flex items-baseline gap-2 min-w-0 truncate">
                        <span className="text-lg font-bold text-white shrink-0">{banner.title}</span>
                        {banner.subtitle && (
                            <span className="text-sm text-white/70 font-semibold hidden md:block truncate">{banner.subtitle}</span>
                        )}
                    </div>
                </div>

                {/* Center: Professional Counter */}
                <div className="flex-none flex items-center gap-1 sm:gap-3">
                    {[
                        { label: 'Day', value: timeLeftUnits.days },
                        { label: 'Hour', value: timeLeftUnits.hours },
                        { label: 'Minute', value: timeLeftUnits.minutes },
                        { label: 'Second', value: timeLeftUnits.seconds }
                    ].map((unit, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg border border-white/10 backdrop-blur-md">
                            <span className="text-[10px] font-bold text-white/50">{unit.label}</span>
                            <span className="text-sm font-bold text-white">{unit.value}</span>
                        </div>
                    ))}
                </div>

                {/* Right: Coupon & Action Button */}
                <div className="flex-1 flex items-center justify-end gap-4">
                    {banner.couponCode && (
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(banner.couponCode);
                                toast.success(`Coupon ${banner.couponCode} copied!`);
                            }}
                            className="group relative flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all active:scale-95 shadow-lg shrink-0"
                        >
                            <span className="opacity-70">Use Code:</span>
                            <span className="text-amber-400">{banner.couponCode}</span>
                        </button>
                    )}

                    <Link 
                        to={banner.buttonLink || '/pricing'}
                        className="px-6 py-2 rounded-2xl text-[13px] font-bold transition-all flex items-center justify-center shadow-lg active:scale-95 shrink-0"
                        style={{ backgroundColor: 'white' }}
                    >
                        <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                            {banner.buttonText}
                        </span>
                    </Link>

                    <button 
                        onClick={handleDismiss}
                        className="text-white/40 hover:text-white transition-colors p-1 shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaleBanner;
