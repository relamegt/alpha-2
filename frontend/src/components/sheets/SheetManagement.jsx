import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../services/queryKeys';
import sheetService from '../../services/sheetService';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  RotateCw,
  ExternalLink,
  Youtube,
  ArrowLeft,
  Loader2,
  Unlink,
  Search,
  BookOpen,
  FileText,
  Code
} from 'lucide-react';
import YouTubeModal from '../shared/YouTubeModal';
import SheetEditorialRender from '../shared/SheetEditorialRender';

// ============= INLINE EDITABLE TEXT COMPONENT =============
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
        toast.success(`Updated successfully!`);
      } catch (error) {
        console.error('Save failed:', error);
        toast.error(`Failed to save changes: ${error.response?.data?.message || error.message}`);
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2" onClick={e => e.stopPropagation()}>
        {multiline ? (
          <textarea
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-3 py-2 border border-primary-300 dark:border-primary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#F1F3F4] dark:bg-slate-800 text-gray-900 dark:text-white text-sm resize-none min-w-0 disabled:opacity-50 disabled:cursor-not-allowed w-full font-normal"
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
            className="flex-1 px-3 py-2 border border-primary-300 dark:border-primary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#F1F3F4] dark:bg-slate-800 text-gray-900 dark:text-white text-sm min-w-0 disabled:opacity-50 disabled:cursor-not-allowed w-full font-normal"
            placeholder={placeholder}
            autoFocus
            disabled={saving}
          />
        )}
        <div className="flex space-x-2 w-full sm:w-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-none px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center justify-center space-x-1"
            title="Save"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            <span>Save</span>
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="flex-1 sm:flex-none px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-xs flex items-center justify-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Cancel"
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
      className={`group cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg px-3 py-2 transition-colors duration-200 ${className}`}
      onClick={startEdit}
      title="Click to edit"
    >
      <div className="flex items-center justify-between">
        <span className="group-hover:text-primary-600 dark:group-hover:text-primary-400">
          {value || <span className="text-gray-400">{placeholder}</span>}
        </span>
        <Edit className="w-3 h-3 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
      </div>
    </div>
  );
};

// ============= INLINE FIELD EDITOR FOR PROBLEMS =============
const InlineFieldEditor = ({ value, onSave, placeholder, type = 'text', disabled }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (tempValue !== value) {
      setSaving(true);
      try {
        await onSave(tempValue);
        setIsEditing(false);
      } catch (error) {
        toast.error('Failed to update');
      } finally {
        setSaving(false);
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setTempValue(value || '');
      setIsEditing(false);
    }
  };

  if (disabled) {
    return <span className="text-gray-900 dark:text-white text-sm">{value || placeholder}</span>;
  }

  if (isEditing) {
    return (
      <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          type={type}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="flex-1 px-2 py-1 border border-primary-400 dark:border-primary-500 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#F1F3F4] dark:bg-slate-700 text-gray-900 dark:text-white text-sm disabled:opacity-50 font-normal"
          disabled={saving}
        />
      </div>
    );
  }

  return (
    <div
      className="group cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded px-2 py-1 transition-colors"
      onClick={() => setIsEditing(true)}
      title="Click to edit"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
          {value || <span className="text-gray-400 text-xs font-normal">{placeholder}</span>}
        </span>
        <Edit className="w-3 h-3 text-gray-400 group-hover:text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
      </div>
    </div>
  );
};

// ============= PROBLEM SELECTOR COMPONENT =============
const ProblemSelector = ({ onSelect, selectedProblemIds = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        searchProblems();
        setShowDropdown(true);
      } else {
        setProblems([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  useEffect(() => {
    const handleScroll = () => {
      if (showDropdown && dropdownRef.current && searchInputRef.current) {
        updateDropdownPosition();
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [showDropdown]);

  const searchProblems = async () => {
    try {
      setLoading(true);
      const response = await sheetService.searchProblems({ q: searchTerm, limit: 20 });
      setProblems(response.problems || []);
    } catch (error) {
      console.error('Error searching problems:', error);
      toast.error('Failed to search problems');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (problem) => {
    if (selectedProblemIds.includes(problem.id)) {
      toast.info('Problem already added to this subsection');
      return;
    }
    onSelect(problem);
    setSearchTerm('');
    setProblems([]);
    setShowDropdown(false);
  };

  const updateDropdownPosition = () => {
    if (!searchInputRef.current || !dropdownRef.current) return;

    const rect = searchInputRef.current.getBoundingClientRect();
    dropdownRef.current.style.top = `${rect.bottom + window.scrollY + 8}px`;
    dropdownRef.current.style.left = `${rect.left + window.scrollX}px`;
    dropdownRef.current.style.width = `${rect.width}px`;
  };

  const DropdownPortal = () => {
    useEffect(() => {
      if (showDropdown) {
        updateDropdownPosition();
      }
    }, [showDropdown, problems]);

    if (!showDropdown || searchTerm.length < 2) return null;

    return createPortal(
      <div
        ref={dropdownRef}
        style={{
          position: 'absolute',
          zIndex: 999999,
          maxHeight: '400px'
        }}
        className="bg-[#F1F3F4] dark:bg-slate-800 rounded-xl shadow-2xl border border-primary-200 dark:border-primary-600 overflow-y-auto"
      >
        {loading ? (
          <div className="p-4 text-center text-gray-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
            <span className="text-sm">Searching...</span>
          </div>
        ) : problems.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No problems found.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {problems.map((problem) => {
              const isSelected = selectedProblemIds.includes(problem.id);
              return (
                <li
                  key={problem.id}
                  onClick={() => !isSelected && handleSelect(problem)}
                  className={`p-4 hover:bg-primary-50 dark:hover:bg-primary-900/20 cursor-pointer transition-colors ${isSelected ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {problem.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        {problem.platform && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {problem.platform}
                          </span>
                        )}
                        {problem.difficulty && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${problem.difficulty.toLowerCase() === 'easy'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : problem.difficulty.toLowerCase() === 'medium'
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}
                          >
                            {problem.difficulty}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>,
      document.body
    );
  };

  return (
    <div className="relative mb-4">
      <div ref={searchInputRef} className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm.length >= 2 && setShowDropdown(true)}
          placeholder="Search problems by title or platform..."
          className="w-full pl-10 pr-4 py-3 border border-primary-300 dark:border-primary-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#F1F3F4] dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
        />
      </div>

      <DropdownPortal />
    </div>
  );
};

// ============= PROBLEM FORM COMPONENT =============
const ProblemForm = ({ problem, onSubmit, onCancel, isEditing = false, canManageSheets }) => {
  const [formData, setFormData] = useState(problem);
  const [submitting, setSubmitting] = useState(false);
  const titleInputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
        titleInputRef.current.select();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!formData.title?.trim()) {
      toast.error('Problem title is required.');
      titleInputRef.current?.focus();
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F1F3F4] dark:bg-slate-800/50 rounded-xl p-4 md:p-6 border border-primary-200 dark:border-primary-800 mb-4 shadow-sm">
      <form onSubmit={handleFormSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Problem Title *
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-primary-300 dark:border-primary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#F1F3F4] dark:bg-slate-700 text-gray-900 dark:text-white disabled:opacity-50 text-sm font-medium"
              required
              disabled={!canManageSheets || submitting}
              placeholder="Enter problem title"
            />
          </div>

          {canManageSheets && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Platform</label>
                <input
                  type="text"
                  value={formData.platform || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}
                  className="w-full px-3 py-2 border border-primary-300 dark:border-primary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#F1F3F4] dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                  placeholder="e.g., LeetCode"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Practice Link</label>
                <input
                  type="url"
                  value={formData.practiceLink || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, practiceLink: e.target.value }))}
                  className="w-full px-3 py-2 border border-primary-300 dark:border-primary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#F1F3F4] dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                  placeholder="https://..."
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">YouTube Link</label>
                <input
                  type="url"
                  value={formData.youtubeLink || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, youtubeLink: e.target.value }))}
                  className="w-full px-3 py-2 border border-primary-300 dark:border-primary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#F1F3F4] dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                  placeholder="https://youtube.com/..."
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
                <select
                  value={formData.difficulty || 'Easy'}
                  onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                  className="w-full px-3 py-2 border border-primary-300 dark:border-primary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#F1F3F4] dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                  disabled={submitting}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Editorial Link</label>
                <input
                  type="url"
                  value={formData.editorialLink || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, editorialLink: e.target.value }))}
                  className="w-full px-3 py-2 border border-primary-300 dark:border-primary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#F1F3F4] dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                  placeholder="https://raw.githubusercontent.com/...md"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Notes Link</label>
                <input
                  type="url"
                  value={formData.notesLink || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notesLink: e.target.value }))}
                  className="w-full px-3 py-2 border border-primary-300 dark:border-primary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#F1F3F4] dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                  placeholder="Link to external notes/doc"
                  disabled={submitting}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="w-full sm:w-auto px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-semibold"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !formData.title?.trim()}
            className="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-sm font-semibold"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isEditing ? 'Updating...' : 'Adding...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditing ? 'Update' : 'Add'} Problem
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// ============= ADD ITEM FORM =============
const AddItemForm = ({
  onSubmit,
  onCancel,
  placeholder = "Enter name...",
  buttonText = "Add",
  value,
  onChange,
  multiFields = false,
  fields = {}
}) => {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (multiFields) {
      if (Object.values(fields).some(field => field.required && !field.value?.trim())) {
        toast.error('Please fill in all required fields');
        return;
      }
    } else {
      if (!value?.trim()) {
        toast.error('Please enter a value');
        return;
      }
    }

    try {
      setSubmitting(true);
      if (multiFields) {
        await onSubmit(fields);
      } else {
        await onSubmit(value);
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(`Failed to ${buttonText.toLowerCase()}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 bg-primary-50/50 dark:bg-primary-900/10 rounded-xl border border-primary-200 dark:border-primary-800 mb-4 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {multiFields ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(fields).map(([key, field]) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {field.label} {field.required && '*'}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 border border-primary-300 dark:border-primary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#F1F3F4] dark:bg-slate-700 text-gray-900 dark:text-white text-sm font-medium resize-none disabled:opacity-50"
                    rows={2}
                    required={field.required}
                    disabled={submitting}
                  />
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 border border-primary-300 dark:border-primary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#F1F3F4] dark:bg-slate-700 text-gray-900 dark:text-white text-sm font-medium disabled:opacity-50"
                    required={field.required}
                    disabled={submitting}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {placeholder}
            </label>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 border border-primary-300 dark:border-primary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#F1F3F4] dark:bg-slate-700 text-gray-900 dark:text-white text-sm font-medium disabled:opacity-50"
              autoFocus
              required
              disabled={submitting}
            />
          </div>
        )}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="w-full sm:w-auto px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center justify-center space-x-2 text-sm font-semibold disabled:opacity-50"
          >
            <X className="w-3 h-3" />
            <span>Cancel</span>
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center space-x-2 text-sm font-semibold disabled:opacity-50 shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{buttonText}ing...</span>
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" />
                <span>{buttonText}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// ============= MAIN SHEET MANAGEMENT COMPONENT =============
const SheetManagement = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManageSheets = user?.role === 'admin';

  const [expandedItems, setExpandedItems] = useState({});
  const [selectedSubsection, setSelectedSubsection] = useState(null);

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addingSection, setAddingSection] = useState({});
  const [addingSubsection, setAddingSubsection] = useState({});

  // Problem management states
  const [currentProblems, setCurrentProblems] = useState([]);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProblemId, setEditingProblemId] = useState(null);
  const [unlinkingId, setUnlinkingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showVideo, setShowVideo] = useState(null);
  const [showEditorial, setShowEditorial] = useState(null);

  const [newSheet, setNewSheet] = useState({ name: '', description: '' });
  const [newSectionName, setNewSectionName] = useState('');
  const [newSubsectionName, setNewSubsectionName] = useState('');

  // Queries
  const { data: sheets = [], isLoading } = useQuery({
    queryKey: queryKeys.sheets.all(),
    queryFn: sheetService.getAllSheets
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.sheets.all() });
  };

  useEffect(() => {
    if (selectedSubsection && sheets) {
      const sheet = sheets.find(s => s.id === selectedSubsection.sheetId);
      const section = sheet?.sections?.find(s => s.id === selectedSubsection.sectionId);
      const subsection = section?.subsections?.find(s => s.id === selectedSubsection.subsectionId);
      setCurrentProblems(subsection?.problems || []);
    }
  }, [selectedSubsection, sheets]);

  // Mutations
  const createSheetMutation = useMutation({
    mutationFn: sheetService.createSheet,
    onSuccess: () => {
      invalidate();
      setShowAddSheet(false);
      setNewSheet({ name: '', description: '' });
      toast.success('Sheet created successfully!');
    }
  });

  const updateSheetMutation = useMutation({
    mutationFn: ({ id, data }) => sheetService.updateSheet(id, data),
    onSuccess: invalidate
  });

  const deleteSheetMutation = useMutation({
    mutationFn: sheetService.deleteSheet,
    onSuccess: () => {
      invalidate();
      toast.success('Sheet deleted successfully!');
    }
  });

  const addSectionMutation = useMutation({
    mutationFn: ({ sheetId, data }) => sheetService.addSection(sheetId, data),
    onSuccess: () => {
      invalidate();
      setAddingSection({});
      setNewSectionName('');
      toast.success('Section added successfully!');
    }
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, data }) => sheetService.updateSection(id, data),
    onSuccess: invalidate
  });

  const deleteSectionMutation = useMutation({
    mutationFn: sheetService.deleteSection,
    onSuccess: () => {
      invalidate();
      toast.success('Section deleted successfully!');
    }
  });

  const addSubsectionMutation = useMutation({
    mutationFn: ({ sectionId, data }) => sheetService.addSubsection(sectionId, data),
    onSuccess: () => {
      invalidate();
      setAddingSubsection({});
      setNewSubsectionName('');
      toast.success('Subsection added successfully!');
    }
  });

  const updateSubsectionMutation = useMutation({
    mutationFn: ({ id, data }) => sheetService.updateSubsection(id, data),
    onSuccess: invalidate
  });

  const deleteSubsectionMutation = useMutation({
    mutationFn: sheetService.deleteSubsection,
    onSuccess: () => {
      invalidate();
      toast.success('Subsection deleted successfully!');
    }
  });

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Problem handlers
  const handleLinkProblem = async (problem) => {
    try {
      await sheetService.linkProblem(selectedSubsection.sheetId, selectedSubsection.sectionId, selectedSubsection.subsectionId, problem.id);
      toast.success('Linked successfully!');
      invalidate();
    } catch (error) {
      toast.error('Failed to link problem');
    }
  };

  const handleCreateAndLink = async (problemData) => {
    try {
      await sheetService.createProblemInSubsection(selectedSubsection.subsectionId, problemData);
      toast.success('Problem created and linked!');
      setShowCreateForm(false);
      invalidate();
    } catch (error) {
      toast.error('Failed to create problem');
    }
  };

  const handleUpdateProblem = async (problemId, data) => {
    try {
      await sheetService.updateSheetProblem(problemId, data);
      toast.success('Problem updated!');
      setEditingProblemId(null);
      invalidate();
    } catch (error) {
      toast.error('Update failed');
    }
  };

  const handleUnlink = async (problemId) => {
    try {
      setUnlinkingId(problemId);
      await sheetService.removeProblemFromSubsection(problemId);
      toast.success('Removed from subsection');
      invalidate();
    } catch (error) {
      toast.error('Unlink failed');
    } finally {
      setUnlinkingId(null);
    }
  };

  // Global delete doesn't apply to SheetProblems unless specifically deleting the problem entity 
  // However, removing from subsection practically does the same if we treat them as part of the subsection.
  // The backend API `removeProblemFromSubsection` unlinks it.
  const handleDeleteProblemGlobal = async (problemId) => {
    if (!window.confirm('WARNING: This will permanently delete the global SheetProblem from ALL sheets. Continue?')) return;
    try {
      setDeletingId(problemId);
      await sheetService.deleteSheetProblem(problemId);
      toast.success('Problem deleted globally');
      invalidate();
    } catch (error) {
      toast.error('Global delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  // ================= PROBLEM VIEW =================
  if (selectedSubsection) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <button
          onClick={() => setSelectedSubsection(null)}
          className="flex items-center gap-2 text-gray-500 hover:text-primary-600 transition-colors mb-6 font-bold text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sheets
        </button>

        <div className="mb-6">
          <span className="text-xs font-bold text-primary-600 dark:text-primary-400 block mb-1 uppercase tracking-wider">Subsection Management</span>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {selectedSubsection.subsectionName}
          </h2>
        </div>

        <div className="space-y-6">
          {/* Add Problems Card */}
          {canManageSheets && (
            <div className="bg-[#F1F3F4] dark:bg-slate-900 rounded-2xl p-5 md:p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary-500" />
                  Add Problems
                </h3>
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className={`w-full sm:w-auto px-4 py-2 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${showCreateForm ? 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-800 hover:bg-gray-200 dark:hover:bg-slate-700' : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'}`}
                >
                  {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {showCreateForm ? 'Cancel Creation' : 'Create New Problem'}
                </button>
              </div>

              <ProblemSelector
                onSelect={handleLinkProblem}
                selectedProblemIds={currentProblems.map(p => p.id)}
              />

              {showCreateForm && (
                <ProblemForm
                  problem={{ title: '', platform: '', practiceLink: '', youtubeLink: '', difficulty: 'Easy', editorialLink: '', notesLink: '' }}
                  onSubmit={handleCreateAndLink}
                  onCancel={() => setShowCreateForm(false)}
                  canManageSheets={canManageSheets}
                />
              )}
            </div>
          )}

          {/* Problems List Card */}
          <div className="bg-[#F1F3F4] dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-5 md:p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-800/30">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Problems ({currentProblems.length}) - Click field to inline edit
              </h3>
            </div>

            {loadingProblems ? (
              <div className="py-16 flex flex-col items-center justify-center text-gray-400 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                <p className="text-sm font-bold">Loading problems...</p>
              </div>
            ) : currentProblems.length === 0 ? (
              <div className="text-center py-16 px-4">
                <p className="text-gray-500 text-base font-bold">No problems added yet</p>
                <p className="text-gray-400 text-sm mt-1">Search for existing problems or create new ones above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-50/80 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        Title / Platform
                      </th>
                      <th className="px-6 py-4 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider w-32">
                        Difficulty
                      </th>
                      <th className="px-6 py-4 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider w-40">
                        Links
                      </th>
                      <th className="px-6 py-4 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider w-32">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                    {currentProblems.map((prob, idx) => (
                      <tr key={prob.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <span className="text-xs font-bold text-gray-400 mt-1.5 shrink-0">#{idx + 1}</span>
                            <div className="flex-1">
                              <div className="font-bold text-gray-900 dark:text-white">
                                <InlineFieldEditor
                                  value={prob.title}
                                  onSave={(val) => handleUpdateProblem(prob.id, { title: val })}
                                  placeholder="Problem title"
                                  disabled={!canManageSheets}
                                />
                              </div>
                              <div className="mt-0.5">
                                <InlineFieldEditor
                                  value={prob.platform}
                                  onSave={(val) => handleUpdateProblem(prob.id, { platform: val })}
                                  placeholder="Platform"
                                  disabled={!canManageSheets}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            {canManageSheets ? (
                              <select
                                value={prob.difficulty || 'Easy'}
                                onChange={(e) => handleUpdateProblem(prob.id, { difficulty: e.target.value })}
                                className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-full border-0 focus:ring-2 focus:ring-primary-500 cursor-pointer text-center outline-none ${prob.difficulty === 'Easy' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
                                    prob.difficulty === 'Medium' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' :
                                      'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                                  }`}
                              >
                                <option value="Easy">EASY</option>
                                <option value="Medium">MEDIUM</option>
                                <option value="Hard">HARD</option>
                              </select>
                            ) : (
                              <span className={`inline-flex px-2.5 py-1 text-[11px] font-bold uppercase rounded-full ${prob.difficulty === 'Easy' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
                                  prob.difficulty === 'Medium' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' :
                                    'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                                }`}>
                                {prob.difficulty || 'EASY'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3">
                            {prob.practiceLink && (
                              <a href={prob.practiceLink} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-gray-50 hover:bg-primary-50 dark:bg-gray-800 dark:hover:bg-primary-900/20 text-gray-500 hover:text-primary-500 rounded-md transition-colors" title="Practice Link">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {prob.youtubeLink && (
                              <button onClick={() => setShowVideo({ url: prob.youtubeLink, title: prob.title })} className="p-1.5 bg-gray-50 hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500 rounded-md transition-colors" title="Video Solution">
                                <Youtube className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {prob.editorialLink && (
                              <button onClick={() => setShowEditorial({ url: prob.editorialLink, title: prob.title, youtube: prob.youtubeLink, id: prob.id })} className="p-1.5 bg-gray-50 hover:bg-green-50 dark:bg-gray-800 dark:hover:bg-green-900/20 text-gray-500 hover:text-green-500 rounded-md transition-colors" title="Read Editorial">
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => window.open(`/admin/editorial-creator?problemId=${prob.id}&title=${encodeURIComponent(prob.title)}`, '_blank')}
                              className="p-1.5 bg-gray-50 hover:bg-indigo-50 dark:bg-gray-800 dark:hover:bg-indigo-900/20 text-gray-500 hover:text-indigo-500 rounded-md transition-colors"
                              title="Edit Editorial (Creator)"
                            >
                              <Code className="w-3.5 h-3.5" />
                            </button>
                            {prob.notesLink && (
                              <a href={prob.notesLink} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-gray-50 hover:bg-indigo-50 dark:bg-gray-800 dark:hover:bg-indigo-900/20 text-gray-500 hover:text-indigo-500 rounded-md transition-colors" title="My Notes">
                                <BookOpen className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleUnlink(prob.id)}
                              disabled={unlinkingId === prob.id}
                              className="p-2 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg transition-all disabled:opacity-50"
                              title="Unlink from Subsection"
                            >
                              {unlinkingId === prob.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteProblemGlobal(prob.id)}
                              disabled={deletingId === prob.id}
                              className="p-2 text-red-500 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all disabled:opacity-50"
                              title="Delete Globally"
                            >
                              {deletingId === prob.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <YouTubeModal
          isOpen={!!showVideo}
          onClose={() => setShowVideo(null)}
          videoUrl={showVideo?.url}
          problemName={showVideo?.title}
        />

        <SheetEditorialRender
          isOpen={!!showEditorial}
          onClose={() => setShowEditorial(null)}
          editorialUrl={showEditorial?.url}
          problemName={showEditorial?.title}
          youtubeLink={showEditorial?.youtube}
          problemId={showEditorial?.id}
        />
      </div>
    );
  }

  // ================= MAIN SCREEN =================
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500">

      {/* HEADER */}
      <div className="bg-[#F1F3F4] dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sheet Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage practice sheets, sections, and subsections</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={invalidate}
            className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all border border-gray-100 dark:border-gray-800"
          >
            <RotateCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddSheet(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold text-sm shadow-sm hover:bg-primary-700 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add New Sheet
          </button>
        </div>
      </div>

      {/* ADD SHEET FORM */}
      {showAddSheet && (
        <AddItemForm
          onSubmit={(fields) => createSheetMutation.mutate({ name: fields.name.value, description: fields.description.value })}
          onCancel={() => setShowAddSheet(false)}
          buttonText="Add Sheet"
          multiFields={true}
          fields={{
            name: { label: 'Sheet Name', value: newSheet.name, required: true, onChange: (v) => setNewSheet(p => ({ ...p, name: v })) },
            description: { label: 'Description', value: newSheet.description, required: false, type: 'textarea', onChange: (v) => setNewSheet(p => ({ ...p, description: v })) }
          }}
        />
      )}

      {/* LOADING */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center text-gray-400 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
          <p className="text-sm font-medium">Loading sheets...</p>
        </div>
      ) : sheets.length === 0 ? (
        <div className="text-center py-24 bg-[#F1F3F4] dark:bg-slate-900 rounded-2xl border border-dashed border-[var(--color-border-interactive)]">
          <Folder className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No sheets available</h3>
          <p className="text-sm text-gray-500">Create your first sheet to get started.</p>
        </div>
      ) : (
        /* SHEETS LIST */
        <div className="space-y-4">
          {sheets.map(sheet => (
            <div
              key={sheet.id}
              className={`bg-[#F1F3F4] dark:bg-slate-900 rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm
                ${expandedItems[`sheet_${sheet.id}`] ? 'border-primary-500 ring-1 ring-primary-500/10' : 'border-[var(--color-border-interactive)]'}
              `}
            >
              <div className="p-4 md:p-6 flex items-center gap-4 cursor-pointer" onClick={() => toggleExpand(`sheet_${sheet.id}`)}>
                <div className={`p-2.5 rounded-xl transition-all duration-300
                  ${expandedItems[`sheet_${sheet.id}`] ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 dark:bg-slate-800 text-gray-400'}
                `}>
                  {expandedItems[`sheet_${sheet.id}`] ? <FolderOpen className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div onClick={e => e.stopPropagation()}>
                    <InlineEditableText
                      value={sheet.name}
                      onSave={(val) => updateSheetMutation.mutate({ id: sheet.id, data: { name: val } })}
                      className="text-lg font-bold text-gray-900 dark:text-white"
                    />
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    <InlineEditableText
                      value={sheet.description}
                      placeholder="Add description..."
                      multiline={true}
                      onSave={(val) => updateSheetMutation.mutate({ id: sheet.id, data: { description: val } })}
                      className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1 font-normal"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddingSection(p => ({ ...p, [sheet.id]: true }));
                      if (!expandedItems[`sheet_${sheet.id}`]) toggleExpand(`sheet_${sheet.id}`);
                    }}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition-all border border-gray-100 dark:border-gray-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Section
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Delete this sheet?')) deleteSheetMutation.mutate(sheet.id);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className={`p-1.5 rounded-lg transition-all duration-300 ${expandedItems[`sheet_${sheet.id}`] ? 'rotate-180 text-primary-500' : 'text-gray-400'}`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* SHEET CONTENT (SECTIONS) */}
              {expandedItems[`sheet_${sheet.id}`] && (
                <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                  <div className="pt-4 border-t border-[var(--color-border-interactive)] space-y-4">

                    {addingSection[sheet.id] && (
                      <AddItemForm
                        onSubmit={(val) => addSectionMutation.mutate({ sheetId: sheet.id, data: { name: val } })}
                        onCancel={() => setAddingSection(p => ({ ...p, [sheet.id]: false }))}
                        buttonText="Add Section"
                        value={newSectionName}
                        onChange={setNewSectionName}
                      />
                    )}

                    {sheet.sections && sheet.sections.length > 0 ? (
                      sheet.sections.map((section) => (
                        <div key={section.id} className="relative pl-6 border-l border-[var(--color-border-interactive)] space-y-3">
                          <div className="absolute -left-[4.5px] top-0 w-2 h-2 bg-primary-500 rounded-full ring-2 ring-white dark:ring-slate-900" />

                          <div className="flex items-center justify-between gap-4 group/sec cursor-pointer" onClick={() => toggleExpand(`sec_${section.id}`)}>
                            <div className="flex-1" onClick={e => e.stopPropagation()}>
                              <InlineEditableText
                                value={section.name}
                                onSave={(val) => updateSectionMutation.mutate({ id: section.id, data: { name: val } })}
                                className="text-base font-bold text-gray-800 dark:text-gray-200"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAddingSubsection(p => ({ ...p, [section.id]: true }));
                                  if (!expandedItems[`sec_${section.id}`]) toggleExpand(`sec_${section.id}`);
                                }}
                                className="px-2 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-[10px] font-bold rounded-md hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                              >
                                Add Subsection
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Delete Section?')) deleteSectionMutation.mutate(section.id);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedItems[`sec_${section.id}`] ? 'rotate-180' : ''}`} />
                            </div>
                          </div>

                          {/* SECTION CONTENT (SUBSECTIONS) */}
                          {expandedItems[`sec_${section.id}`] && (
                            <div className="pl-4 space-y-3 pt-1">

                              {addingSubsection[section.id] && (
                                <AddItemForm
                                  onSubmit={(val) => addSubsectionMutation.mutate({ sectionId: section.id, data: { name: val } })}
                                  onCancel={() => setAddingSubsection(p => ({ ...p, [section.id]: false }))}
                                  buttonText="Add Subsection"
                                  value={newSubsectionName}
                                  onChange={setNewSubsectionName}
                                />
                              )}

                              {section.subsections && section.subsections.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {section.subsections.map(sub => (
                                    <div key={sub.id} className="group/sub p-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-primary-400 dark:hover:border-primary-600 transition-all relative">
                                      <div onClick={e => e.stopPropagation()} className="mb-2">
                                        <InlineEditableText
                                          value={sub.name}
                                          onSave={(val) => updateSubsectionMutation.mutate({ id: sub.id, data: { name: val } })}
                                          className="text-sm font-bold text-gray-700 dark:text-gray-300 block"
                                        />
                                      </div>

                                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--color-border-interactive)]">
                                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                                          {sub.problems?.length || 0} Problems
                                        </span>

                                        <div className="flex items-center gap-1.5">
                                          <button
                                            onClick={() => setSelectedSubsection({
                                              sheetId: sheet.id,
                                              sectionId: section.id,
                                              subsectionId: sub.id,
                                              subsectionName: sub.name
                                            })}
                                            className="px-2.5 py-1 bg-primary-600 text-white rounded-md text-[10px] font-bold hover:bg-primary-700 transition-all shadow-sm"
                                          >
                                            Manage
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (window.confirm('Delete Subsection?')) deleteSubsectionMutation.mutate(sub.id);
                                            }}
                                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-4 bg-gray-50 dark:bg-slate-800/20 border border-dashed border-[var(--color-border-interactive)] rounded-xl">
                                  <p className="text-xs text-gray-400 font-medium font-normal">No subsections added</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 bg-gray-50 dark:bg-slate-800/20 border border-dashed border-[var(--color-border-interactive)] rounded-2xl">
                        <p className="text-sm text-gray-400 font-normal">No sections found</p>
                        <button onClick={() => setAddingSection(p => ({ ...p, [sheet.id]: true }))} className="mt-2 text-primary-600 font-semibold text-sm hover:underline">Add first section</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SheetManagement;








