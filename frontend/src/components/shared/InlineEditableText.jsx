import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const InlineEditableText = ({ 
  value, 
  onSave, 
  placeholder = "Click to edit", 
  multiline = false, 
  isEditable = true,
  className = ""
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTempValue(value || '');
  }, [value]);

  const startEdit = () => {
    if (isEditable) {
      setTempValue(value || '');
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (tempValue !== value) {
      setSaving(true);
      try {
        await onSave(tempValue);
        setIsEditing(false);
        toast.success('Updated successfully!');
      } catch (error) {
        console.error('Save failed:', error);
        toast.error('Failed to save changes.');
      } finally {
        setSaving(false);
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setTempValue(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (!isEditable) {
    return <span className={className}>{value || placeholder}</span>;
  }

  if (isEditing) {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
        {multiline ? (
          <textarea
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 border border-primary-300 dark:border-primary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:text-white text-sm resize-none disabled:opacity-50"
            placeholder={placeholder}
            autoFocus
            rows={2}
            disabled={saving}
          />
        ) : (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 border border-primary-300 dark:border-primary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:text-white text-sm disabled:opacity-50"
            placeholder={placeholder}
            autoFocus
            disabled={saving}
          />
        )}
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-none px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center justify-center gap-1 font-bold"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            <span>Save</span>
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="flex-1 sm:flex-none px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-xs flex items-center justify-center gap-1 font-bold disabled:opacity-50"
          >
            <X className="w-3 h-3" />
            <span>Cancel</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`group cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-lg px-2 py-1 transition-all duration-200 ${className}`}
      onClick={startEdit}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
          {value || <span className="text-gray-400 italic font-medium">{placeholder}</span>}
        </span>
        <Edit2 className="w-3 h-3 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
    </div>
  );
};

export default InlineEditableText;








