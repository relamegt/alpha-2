import React, { useState, useEffect } from 'react';
import { X, Check, ArrowRight, Shield, Zap, Tag, Loader2, Info, Building, Phone, GraduationCap, Mail, User } from 'lucide-react';
import apiClient from '../../../services/apiClient';
import toast from 'react-hot-toast';

const CheckoutModal = ({ isOpen, onClose, plan, user, onPaymentSuccess, currentPlan }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [validatingCoupon, setValidatingCoupon] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [availableCoupons, setAvailableCoupons] = useState([]);

    const [formData, setFormData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        institution: user?.institution || '',
        phone: user?.phone || '',
        endYear: user?.endYear || '2026',
        agreed: false
    });

    useEffect(() => {
        if (isOpen) {
            fetchAvailableCoupons();
        }
    }, [isOpen]);

    const fetchAvailableCoupons = async () => {
        try {
            const response = await apiClient.get('/coupons/available-promos');
            setAvailableCoupons(response.data.coupons || []);
        } catch (error) {
            console.error('Failed to fetch coupons', error);
        }
    };

    const handleNext = () => {
        if (!formData.firstName || !formData.institution || !formData.phone || !formData.agreed) {
            toast.error('Please complete all details and agree to terms');
            return;
        }
        setStep(2);
    };

    const handleApplyCoupon = async (code = couponCode) => {
        const codeToApply = code || couponCode;
        if (!codeToApply) return;
        
        setValidatingCoupon(true);
        try {
            // Get correct base price for validation
            let basePrice = plan.price;
            if (plan.selectedDuration && plan.pricingOptions) {
                const opt = plan.pricingOptions.find(o => o.duration === plan.selectedDuration);
                if (opt) basePrice = opt.price;
            }

            const response = await apiClient.post('/coupons/validate', {
                code: codeToApply,
                amount: basePrice
            });
            setAppliedCoupon(response.data.coupon);
            setCouponCode(codeToApply);
            toast.success('Coupon applied successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid coupon code');
            setAppliedCoupon(null);
        } finally {
            setValidatingCoupon(false);
        }
    };

    const calculateTotal = () => {
        // Find the base price for the selected duration
        let basePrice = plan.price;
        if (plan.selectedDuration && plan.pricingOptions) {
            const opt = plan.pricingOptions.find(o => o.duration === plan.selectedDuration);
            if (opt) basePrice = opt.price;
        }

        // Handle Upgrade: Subtract current plan price if applicable
        if (currentPlan && currentPlan.plan !== 'FREE' && currentPlan.planDetails) {
            const currentPrice = currentPlan.planDetails.price || 0;
            if (basePrice > currentPrice) {
                basePrice = Math.max(0, basePrice - currentPrice);
            }
        }

        let discount = 0;
        if (appliedCoupon) {
            if (appliedCoupon.discountPercent) {
                discount = (basePrice * appliedCoupon.discountPercent) / 100;
            } else if (appliedCoupon.discountAmount) {
                discount = appliedCoupon.discountAmount;
            }
        }
        
        const priceAfterDiscount = Math.max(0, basePrice - discount);
        const gst = plan.gstEnabled ? Math.round(priceAfterDiscount * 0.18) : 0;
        const total = priceAfterDiscount + gst;
        
        return { price: basePrice, gst, discount, total };
    };

    const handlePayment = async () => {
        setLoading(true);
        try {
            // 1. Create Order on Backend (Always do this first to check if free)
            const { price, gst, discount, total } = calculateTotal();
            const { data } = await apiClient.post('/subscriptions/create-order', {
                planId: plan.id,
                couponCode: appliedCoupon?.code,
                userDetails: formData,
                selectedDuration: plan.selectedDuration
            });

            // 2. If order is free, backend already completed it
            if (data.isFree) {
                toast.success(data.message || 'Subscribed successfully for free!');
                onPaymentSuccess();
                onClose();
                return;
            }

            // 3. Load Razorpay Script for paid orders
            const res = await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.onload = () => resolve(true);
                script.onerror = () => resolve(false);
                document.body.appendChild(script);
            });

            if (!res) {
                toast.error('Razorpay SDK failed to load');
                setLoading(false);
                return;
            }

            // 4. Open Razorpay
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: data.order.amount,
                currency: data.order.currency,
                name: 'AlphaLearn',
                description: `Subscription to ${plan.name}`,
                order_id: data.order.id,
                handler: async (response) => {
                    try {
                        const verifyRes = await apiClient.post('/subscriptions/verify-payment', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });

                        if (verifyRes.data.success) {
                            toast.success('Payment Successful! Welcome to Premium.');
                            onPaymentSuccess();
                            onClose();
                        }
                    } catch (err) {
                        toast.error('Verification failed. Please contact support.');
                    } finally {
                        setLoading(false);
                    }
                },
                prefill: {
                    name: `${formData.firstName} ${formData.lastName}`,
                    email: user.email,
                    contact: formData.phone
                },
                theme: { color: '#7d63f2' },
                modal: {
                    ondismiss: () => setLoading(false)
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to initiate payment');
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const { price, gst, discount, total } = calculateTotal();

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/40 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[var(--color-bg-card)] w-full max-w-lg rounded-[2rem] border border-[var(--color-border)] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300">
                
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors z-10 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <X size={20} />
                </button>

                {/* Progress Header */}
                <div className="pt-10 pb-6 px-10 flex justify-center items-center gap-8 border-b border-[var(--color-border-light)] bg-gray-50/30 dark:bg-white/[0.02]">
                    <div className="flex flex-col items-center gap-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${step >= 1 ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-200 dark:border-white/20 text-gray-400 dark:text-gray-500'}`}>
                            {step > 1 ? <Check size={18} /> : '1'}
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${step >= 1 ? 'text-primary-600 dark:text-primary-500' : 'text-gray-400 dark:text-gray-500'}`}>Details</span>
                    </div>
                    <div className={`h-[2px] w-20 rounded-full transition-colors ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200 dark:bg-white/10'}`} />
                    <div className="flex flex-col items-center gap-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${step >= 2 ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-200 dark:border-white/20 text-gray-400 dark:text-gray-500'}`}>
                            2
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${step >= 2 ? 'text-primary-600 dark:text-primary-500' : 'text-gray-400 dark:text-gray-500'}`}>Payment</span>
                    </div>
                </div>

                {step === 1 ? (
                    /* Step 1: Contact Details */
                    <div className="p-10 space-y-6">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contact details</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Please provide your account details to continue.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-600 transition-colors" size={18} />
                                <input 
                                    type="email" disabled value={user.email}
                                    className="input-field pl-12 bg-gray-100 dark:bg-[var(--color-bg-input)] cursor-not-allowed opacity-70"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-600 transition-colors" size={18} />
                                    <input 
                                        type="text" placeholder="First Name"
                                        className="input-field pl-12"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                                    />
                                </div>
                                <div className="relative group">
                                    <input 
                                        type="text" placeholder="Last Name"
                                        className="input-field"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="relative group">
                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-600 transition-colors" size={18} />
                                <input 
                                    type="text" placeholder="College / Institution Name"
                                    className="input-field pl-12"
                                    value={formData.institution}
                                    onChange={(e) => setFormData({...formData, institution: e.target.value})}
                                />
                            </div>

                            <div className="relative group">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-600 transition-colors" size={18} />
                                <input 
                                    type="text" placeholder="+91 88866 16565"
                                    className="input-field pl-12"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                />
                            </div>

                            <div className="relative group">
                                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-600 transition-colors" size={18} />
                                <select 
                                    className="input-field pl-12 appearance-none"
                                    value={formData.endYear}
                                    onChange={(e) => setFormData({...formData, endYear: e.target.value})}
                                >
                                    {[2024, 2025, 2026, 2027, 2028, 2029].map(y => (
                                        <option key={y} value={y} className="dark:bg-black">{y}</option>
                                    ))}
                                </select>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer group pt-2">
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${formData.agreed ? 'bg-primary-600 border-primary-600' : 'border-gray-300 dark:border-white/20 group-hover:border-primary-500'}`}>
                                    {formData.agreed && <Check size={14} className="text-white" />}
                                    <input 
                                        type="checkbox" className="sr-only" 
                                        checked={formData.agreed} 
                                        onChange={(e) => setFormData({...formData, agreed: e.target.checked})}
                                    />
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">I agree to the Terms and Conditions.</span>
                            </label>
                        </div>

                        <button 
                            onClick={handleNext}
                            className="btn-primary w-full !py-4 rounded-2xl text-base"
                        >
                            Next <ArrowRight size={18} />
                        </button>
                        <p className="text-[10px] text-center text-gray-500">You can add coupon code on the next step</p>
                    </div>
                ) : (
                    /* Step 2: Summary & Payment */
                    <div className="p-10 space-y-6">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Summary</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Review your details before proceeding.</p>
                        </div>

                        <div className="space-y-4 pt-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">
                                    {plan.name} ({plan.pricingOptions?.find(o => o.duration === plan.selectedDuration)?.label || `${Math.round(plan.durationInDays / 30)} Months`})
                                </span>
                                <span className="text-gray-900 dark:text-white font-medium">₹{price.toLocaleString()}</span>
                            </div>
                            
                            {plan.gstEnabled && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">GST (18%)</span>
                                    <span className="text-gray-900 dark:text-white font-medium">₹{gst.toLocaleString()}</span>
                                </div>
                            )}

                            {discount > 0 && (
                                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                                    <span>Discount</span>
                                    <span>-₹{discount.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="h-px bg-gray-100 dark:bg-white/10 my-4" />
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
                                <span className="text-2xl font-black text-gray-900 dark:text-white">₹{total.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Coupon Section */}
                        <div className="space-y-3 pt-4">
                            <div className="relative group">
                                <input 
                                    type="text" placeholder="Enter coupon code"
                                    className="input-field pr-24 uppercase"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value)}
                                />
                                <button 
                                    onClick={() => handleApplyCoupon()}
                                    disabled={validatingCoupon || !couponCode}
                                    className="absolute right-2 top-2 bottom-2 px-4 bg-primary-600/10 text-primary-600 hover:bg-primary-600/20 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                                >
                                    {validatingCoupon ? '...' : 'Apply'}
                                </button>
                            </div>

                            {availableCoupons.length > 0 && !appliedCoupon && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Available coupons:</p>
                                    <div className="flex flex-col gap-2">
                                        {availableCoupons.slice(0, 2).map(cp => (
                                            <div key={cp.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-primary-600/10 rounded-lg text-primary-600">
                                                        <Tag size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-900 dark:text-white uppercase">{cp.code}</p>
                                                        <p className="text-[10px] text-gray-500">{cp.discountPercent}% off</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleApplyCoupon(cp.code)}
                                                    className="text-[10px] font-bold text-primary-600 hover:underline"
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {appliedCoupon && (
                                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-xl border border-green-500/20 animate-in slide-in-from-top-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-500/20 rounded-lg text-green-600 dark:text-green-500">
                                            <Check size={14} />
                                        </div>
                                        <p className="text-xs font-medium text-gray-900 dark:text-white uppercase"><strong>{appliedCoupon.code}</strong> applied!</p>
                                    </div>
                                    <button onClick={() => setAppliedCoupon(null)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={handlePayment}
                            disabled={loading}
                            className="btn-primary w-full !py-4 rounded-2xl text-base"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <>Pay ₹{total.toLocaleString()}</>}
                        </button>

                        <div className="flex items-center justify-center gap-6 pt-2">
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500">
                                <Shield size={12} /> SSL Secured
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500">
                                <Zap size={12} /> Instant Activation
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-gray-50 dark:bg-white/5 p-4 text-center border-t border-[var(--color-border-light)]">
                    <p className="text-[10px] text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em] font-bold">AlphaLearn Secure Payments</p>
                </div>
            </div>
        </div>
    );
};

export default CheckoutModal;
