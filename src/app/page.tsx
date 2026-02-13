'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

// ============================================
// MODULAR FILTER CONFIGURATION
// Easy to modify or add new filters in future
// ============================================
const FILTER_CONFIG = {
  excludeDSPInitiated: {
    id: 'excludeDSPInitiated',
    name: 'Exclude DSP Initiated Work',
    description: 'Filters out cells starting with "DSP Initiated Work"',
    active: true,
    fn: (value: any) => {
      const str = String(value || '').toLowerCase().trim();
      return !str.startsWith('dsp initiated work');
    }
  },
  excludeBlank: {
    id: 'excludeBlank',
    name: 'Exclude Blank Cells',
    description: 'Filters out empty or blank cells',
    active: true,
    fn: (value: any) => {
      if (value === null || value === undefined) return false;
      return String(value).trim() !== '';
    }
  },
  excludeNumeric: {
    id: 'excludeNumeric',
    name: 'Exclude Numeric Values',
    description: 'Filters out pure numeric values',
    active: true,
    fn: (value: any) => {
      const str = String(value).trim();
      if (str === '') return true; // Let excludeBlank handle empty
      return isNaN(Number(str));
    }
  }
};

// Function to get active filters (easy to extend)
const getActiveFilters = (customFilters = FILTER_CONFIG) => {
  return Object.values(customFilters).filter(f => f.active);
};

// Apply all active filters to a value
const passesAllFilters = (value: any, filters = getActiveFilters()) => {
  return filters.every(filter => filter.fn(value));
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
const parseExcelFile = async (file: File) => {
  return new Promise<{ jsonData: any[]; worksheet: any }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as any[][];
        resolve({ jsonData, worksheet });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

const extractFileInfo = (jsonData: any[][]) => {
  // B2 = Company name (row index 1, column index 1)
  const companyName = jsonData[1]?.[1] || 'Unknown Company';
  // C2 = Station name (row index 1, column index 2)
  const stationName = jsonData[1]?.[2] || 'Unknown Station';
  
  return { companyName, stationName };
};

const processData = (jsonData: any[][]) => {
  // Data starts from row 4 (index 3)
  // C4 onwards are dates (column index 2 onwards)
  
  if (jsonData.length < 4) {
    return { dates: [], counts: [] };
  }
  
  // Get dates from row 4 (index 3)
  const dateRow = jsonData[3] || [];
  const dates: any[] = [];
  const counts: any[] = [];
  
  // Start from column C (index 2)
  for (let colIndex = 2; colIndex < dateRow.length; colIndex++) {
    const dateValue = dateRow[colIndex];
    if (dateValue) {
      dates.push({
        column: colIndex,
        value: dateValue,
        formatted: formatDate(dateValue)
      });
    }
  }
  
  // Count valid cells under each date
  dates.forEach(dateInfo => {
    let count = 0;
    // Start from row 5 (index 4) - data rows
    for (let rowIndex = 4; rowIndex < jsonData.length; rowIndex++) {
      const cellValue = jsonData[rowIndex]?.[dateInfo.column];
      if (passesAllFilters(cellValue)) {
        count++;
      }
    }
    counts.push({
      date: dateInfo.formatted,
      rawDate: dateInfo.value,
      column: dateInfo.column,
      count
    });
  });
  
  return { dates, counts };
};

const formatDate = (dateValue: any) => {
  if (!dateValue) return 'N/A';
  
  // If it's already a Date object
  if (dateValue instanceof Date) {
    return dateValue.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  // Try to parse as date
  const parsed = new Date(dateValue);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  // Return as string if not a valid date
  return String(dateValue);
};

// ============================================
// ANIMATION VARIANTS
// ============================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

// ============================================
// COMPONENTS
// ============================================

// Animated Background
const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      
      {/* Animated orbs */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)',
          top: '-10%',
          right: '-10%',
        }}
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)',
          bottom: '-5%',
          left: '-5%',
        }}
        animate={{
          x: [0, -40, 0],
          y: [0, -40, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
    </div>
  );
};

// Upload Zone Component
interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
}

const UploadZone = ({ onFilesSelected, isDragging, setIsDragging }: UploadZoneProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, [setIsDragging]);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, [setIsDragging]);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    );
    
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected, setIsDragging]);
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);
  
  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 ${
        isDragging 
          ? 'border-emerald-400 bg-emerald-500/10' 
          : 'border-slate-600 hover:border-emerald-500/50 bg-slate-800/30'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Animated border on drag */}
      {isDragging && (
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.3), transparent)',
            backgroundSize: '200% 100%'
          }}
          animate={{
            backgroundPosition: ['200% 0', '-200% 0']
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
      )}
      
      <div className="p-8 text-center">
        <motion.div
          className="mx-auto w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center"
          animate={isDragging ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
        >
          <svg 
            className={`w-10 h-10 ${isDragging ? 'text-emerald-400' : 'text-slate-400'}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          </svg>
        </motion.div>
        
        <h3 className="text-xl font-semibold text-white mb-2">
          {isDragging ? 'Drop your files here' : 'Drag and drop Excel files'}
        </h3>
        <p className="text-slate-400 mb-6">or click to browse multiple files</p>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept=".xlsx,.xls"
          className="hidden"
        />
        
        <motion.button
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-shadow"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Select Files
        </motion.button>
        
        <p className="text-slate-500 text-sm mt-4">Supports .xlsx and .xls files</p>
      </div>
    </motion.div>
  );
};

// Filter Info Panel
const FilterPanel = () => {
  const activeFilters = getActiveFilters();
  
  return (
    <motion.div
      className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Active Filters
      </h4>
      <div className="flex flex-wrap gap-2">
        {activeFilters.map((filter, index) => (
          <motion.div
            key={filter.id}
            className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-sm text-slate-300 border border-slate-600/50"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            {filter.name}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// File Card Component
interface FileData {
  id: string;
  fileName: string;
  companyName: string;
  stationName: string;
  counts: Array<{
    date: string;
    rawDate: any;
    column: number;
    count: number;
  }>;
}

interface FileCardProps {
  fileData: FileData;
  onRemove: (id: string) => void;
  index: number;
}

const FileCard = ({ fileData, onRemove }: FileCardProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  return (
    <motion.div
      className="bg-slate-800/60 rounded-2xl border border-slate-700/50 overflow-hidden backdrop-blur-sm"
      variants={itemVariants}
      layout
    >
      {/* Header */}
      <div 
        className="p-5 cursor-pointer hover:bg-slate-700/20 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <motion.div
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0"
              animate={{ rotate: isExpanded ? 0 : -5 }}
            >
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </motion.div>
            
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-white truncate">{fileData.fileName}</h3>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {fileData.companyName}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 text-sm">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {fileData.stationName}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(fileData.id);
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </motion.button>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="p-2 text-slate-400"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Data Table */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-5 pb-5">
              <div className="border-t border-slate-700/50 pt-4">
                <h4 className="text-sm font-medium text-slate-400 mb-3">Date-wise Count</h4>
                
                {fileData.counts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left">
                          <th className="px-4 py-2 text-xs font-medium text-slate-400 uppercase tracking-wider bg-slate-900/50 rounded-tl-lg">Date</th>
                          <th className="px-4 py-2 text-xs font-medium text-slate-400 uppercase tracking-wider bg-slate-900/50 rounded-tr-lg text-right">Valid Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/30">
                        {fileData.counts.map((item, idx) => (
                          <motion.tr
                            key={idx}
                            className="hover:bg-slate-700/20 transition-colors"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                          >
                            <td className="px-4 py-3 text-slate-200 font-medium">{item.date}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
                                {item.count}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No data found in this file
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Summary Stats
interface SummaryStatsProps {
  files: FileData[];
}

const SummaryStats = ({ files }: SummaryStatsProps) => {
  const totalFiles = files.length;
  const totalValidCounts = files.reduce((sum, f) => 
    sum + f.counts.reduce((s, c) => s + c.count, 0), 0
  );
  
  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {[
        { label: 'Files Processed', value: totalFiles, color: 'emerald', icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )},
        { label: 'Total Valid Entries', value: totalValidCounts, color: 'cyan', icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        )},
      ].map((stat, index) => (
        <motion.div
          key={stat.label}
          className={`bg-slate-800/50 rounded-xl p-4 border border-slate-700/50`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 + index * 0.05 }}
          whileHover={{ scale: 1.02, borderColor: 'rgba(16,185,129,0.3)' }}
        >
          <div className={`w-10 h-10 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-400 mb-3`}>
            {stat.icon}
          </div>
          <p className="text-2xl font-bold text-white">{stat.value}</p>
          <p className="text-sm text-slate-400">{stat.label}</p>
        </motion.div>
      ))}
    </motion.div>
  );
};

// Loading Spinner
interface LoadingSpinnerProps {
  fileName: string;
}

const LoadingSpinner = ({ fileName }: LoadingSpinnerProps) => (
  <motion.div
    className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-5"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
        <motion.div
          className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      <div>
        <p className="text-white font-medium">{fileName}</p>
        <p className="text-slate-400 text-sm">Processing...</p>
      </div>
    </div>
  </motion.div>
);

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function Home() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loadingFiles, setLoadingFiles] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const handleFilesSelected = useCallback(async (selectedFiles: File[]) => {
    const newLoadingFiles = selectedFiles.map(f => f.name);
    setLoadingFiles(prev => [...prev, ...newLoadingFiles]);
    
    for (const file of selectedFiles) {
      try {
        const { jsonData } = await parseExcelFile(file);
        const { companyName, stationName } = extractFileInfo(jsonData);
        const { counts } = processData(jsonData);
        
        const fileData: FileData = {
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          fileName: file.name,
          companyName,
          stationName,
          counts
        };
        
        setFiles(prev => [...prev, fileData]);
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      } finally {
        setLoadingFiles(prev => prev.filter(f => f !== file.name));
      }
    }
  }, []);
  
  const handleRemoveFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);
  
  return (
    <div className="min-h-screen bg-slate-950 relative">
      <AnimatedBackground />
      
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.header
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Excel Data Processor
          </motion.div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400">
              Upload and Analyze
            </span>
            <br />
            Your Excel Files
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            Drag and drop your Scheduling files for visualizations
          </p>
        </motion.header>
        
        {/* Upload Zone */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <UploadZone
            onFilesSelected={handleFilesSelected}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
          />
        </motion.section>
        
        {/* Filter Panel */}
        <motion.section className="mb-8">
          <FilterPanel />
        </motion.section>
        
        {/* Summary Stats */}
        {files.length > 0 && (
          <motion.section className="mb-8">
            <SummaryStats files={files} />
          </motion.section>
        )}
        
        {/* Loading Files */}
        <AnimatePresence>
          {loadingFiles.length > 0 && (
            <motion.section className="mb-6 space-y-3">
              {loadingFiles.map((fileName, idx) => (
                <LoadingSpinner key={idx} fileName={fileName} />
              ))}
            </motion.section>
          )}
        </AnimatePresence>
        
        {/* File Cards */}
        {files.length > 0 && (
          <motion.section
            className="space-y-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence mode="popLayout">
              {files.map((file, index) => (
                <FileCard
                  key={file.id}
                  fileData={file}
                  onRemove={handleRemoveFile}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </motion.section>
        )}
        
        {/* Empty State */}
        {files.length === 0 && loadingFiles.length === 0 && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <motion.div
              className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-slate-800/50 flex items-center justify-center"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </motion.div>
            <p className="text-slate-500">No files uploaded yet. Start by dragging or selecting Excel files.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
