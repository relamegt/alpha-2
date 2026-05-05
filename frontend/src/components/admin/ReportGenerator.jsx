import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import reportService from '../../services/reportService';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';
import Leaderboard from '../student/Leaderboard';
import CustomDropdown from '../../components/shared/CustomDropdown';
import { Download, FileText, Database, Layers } from 'lucide-react';

const ReportGenerator = () => {
    const { user } = useAuth();
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState('');
    const [loading, setLoading] = useState(false);
    const [isExportingCSV, setIsExportingCSV] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);

    // Filter states for Export ONLY (Leaderboard handles its own display filtering)
    const [exportFilters, setExportFilters] = useState({
        branch: '',
        section: '',
    });

    useEffect(() => {
        if (user?.role === 'admin' || user?.role === 'instructor') {
            fetchBatches();
        }
    }, [user]);

    // Auto-select batch for instructors or if only one available
    useEffect(() => {
        if (batches.length > 0 && !selectedBatch) {
            if (user?.role === 'instructor') {
                // Default to current batchId if in list, else first one
                const currentBatch = batches.find(b => b._id === user.batchId);
                if (currentBatch) {
                    setSelectedBatch(currentBatch._id);
                } else {
                    setSelectedBatch(batches[0]._id);
                }
            } else if (batches.length === 1) {
                setSelectedBatch(batches[0]._id);
            }
        }
    }, [batches, user]);

    const fetchBatches = async () => {
        try {
            const data = await adminService.getAllBatches();
            setBatches(data.batches);
        } catch (error) {
            toast.error('Failed to fetch batches');
        }
    };

    const handleExportCSV = async () => {
        const batchToExport = selectedBatch || (user?.role === 'instructor' ? user.batchId : null);

        if (!batchToExport) {
            toast.error('Please select a batch');
            return;
        }

        setIsExportingCSV(true);
        try {
            await reportService.exportCSVReport(batchToExport, exportFilters);
            toast.success('CSV report downloaded successfully');
        } catch (error) {
            toast.error('Failed to export CSV report');
        } finally {
            setIsExportingCSV(false);
        }
    };

    const handleExportPDF = async () => {
        const batchToExport = selectedBatch || (user?.role === 'instructor' ? user.batchId : null);

        if (!batchToExport) {
            toast.error('Please select a batch');
            return;
        }

        setIsExportingPDF(true);
        try {
            await reportService.exportPDFReport(batchToExport, exportFilters);
            toast.success('PDF report downloaded successfully');
        } catch (error) {
            toast.error('Failed to export PDF report');
        } finally {
            setIsExportingPDF(false);
        }
    };

    // Prepare options for CustomDropdown
    const batchOptions = batches.map(b => ({ value: b._id, label: b.name }));

    return (
        <div className="admin-page-wrapper">
            <header className="page-header-container">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="page-header-title">
                            {user?.role === 'instructor' ? 'Batch Reports' : 'System Reports'}
                        </h1>
                        <p className="page-header-desc">
                            View student performance, track progress, and generate detailed analytical reports.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <button
                            onClick={handleExportCSV}
                            disabled={!selectedBatch && user?.role !== 'instructor' || isExportingCSV}
                            className="btn-secondary flex items-center justify-center gap-2 min-w-[140px]"
                        >
                            {isExportingCSV ? (
                                <>
                                    <div className="spinner border-2 !w-4 !h-4" />
                                    <span>Exporting...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={18} />
                                    <span>Export CSV</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleExportPDF}
                            disabled={!selectedBatch && user?.role !== 'instructor' || isExportingPDF}
                            className="btn-primary flex items-center justify-center gap-2 min-w-[140px]"
                        >
                            {isExportingPDF ? (
                                <>
                                    <div className="spinner border-2 !w-4 !h-4 border-white border-t-transparent" />
                                    <span>Exporting...</span>
                                </>
                            ) : (
                                <>
                                    <FileText size={18} />
                                    <span>Export PDF</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* Controls Section */}
            <div className="page-controls-bar bg-[var(--color-bg-card)] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
                    {/* Batch Selector */}
                    <div className="w-full md:w-80">
                        <CustomDropdown
                            options={batchOptions}
                            value={selectedBatch}
                            onChange={setSelectedBatch}
                            placeholder="Select a Batch to View Leaderboard"
                            icon={Layers}
                        />
                    </div>
                </div>
            </div>

            {/* Leaderboard Rendering */}
            {selectedBatch ? (
                <div className="animate-fade-in-up">
                    <Leaderboard batchId={selectedBatch} />
                </div>
            ) : (
                <div className="empty-state-container py-24">
                    <div className="empty-state-icon">
                        <Layers size={32} />
                    </div>
                    <p className="empty-state-text">No Batch Selected</p>
                    <p className="empty-state-subtext">
                        Please select a batch from the dropdown above to view the leaderboard and generate reports.
                    </p>
                </div>
            )}
        </div>
    );
};

export default ReportGenerator;








