import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../redux';
import { motion } from 'motion/react';
import { Download, FileText, FileSpreadsheet, Calendar, CheckCircle2, Loader2, ChevronLeft, ChevronDown, ArrowRight, Share2, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

// Import all fetch actions to ensure we have data
import { fetchEntries as fetchTractor } from '../redux/slices/tractorSlice';
import { fetchKhatEntries } from '../redux/slices/khatSlice';
import { fetchSeedEntries } from '../redux/slices/seedSlice';
import { fetchAushadEntries } from '../redux/slices/aushadSlice';
import { fetchWorkerEntries } from '../redux/slices/workerSlice';
import { fetchHarvestEntries } from '../redux/slices/harvestSlice';
import { fetchDairyExpenses } from '../redux/slices/dairyExpenseSlice';
import { fetchMilkEntries } from '../redux/slices/milkSlice';
import { fetchOtherExpenses } from '../redux/slices/otherExpenseSlice';
import { fetchFarms } from '../redux/slices/farmSlice';


const MODULES = [
  { id: 'all', label: 'All Modules' },
  { id: 'farms', label: 'Farms' },
  { id: 'tractor', label: 'Tractor' },
  { id: 'khat', label: 'Fertilizer' },
  { id: 'seeds', label: 'Seeds' },
  { id: 'aushad', label: 'Pesticides' },
  { id: 'worker', label: 'Workers' },
  { id: 'harvest', label: 'Profit / Harvest' },
  { id: 'dairy_milk', label: 'Milk Records' },
  { id: 'dairy_expense', label: 'Dairy Expenses' },
  { id: 'other_expenses', label: 'Other Expenses' },
];

const DataExportScreen = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  // Redux state
  const tractorData = useSelector((state: RootState) => state.tractor.entries);
  const khatData = useSelector((state: RootState) => state.khat.entries);
  const seedData = useSelector((state: RootState) => state.seed.entries);
  const aushadData = useSelector((state: RootState) => state.aushad.entries);
  const workerData = useSelector((state: RootState) => state.worker.entries);
  const harvestData = useSelector((state: RootState) => state.harvest.entries);
  const milkData = useSelector((state: RootState) => state.milk.entries);
  const dairyExpenseData = useSelector((state: RootState) => state.dairyExpense.entries);
  const otherExpenseData = useSelector((state: RootState) => state.otherExpense.items);
  const farms = useSelector((state: RootState) => state.farm.farms);

  React.useEffect(() => {
    dispatch(fetchFarms());
  }, [dispatch]);

  // Derive available years from farms
  const availableYears = React.useMemo(() => {
    const years = [...new Set(farms.map(f => f.year))].sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));
    return years;
  }, [farms]);

  // Set default year when availableYears changes
  React.useEffect(() => {
    if (availableYears.length > 0 && selectedYear === null) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // Farm to Year Mapping for filtering
  const farmYearMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    farms.forEach(f => {
      map[f.id] = f.year;
    });
    return map;
  }, [farms]);

  const filterByYear = (data: any[]) => {
    return data.filter(item => {
      if (item.farmId && farmYearMap[item.farmId]) {
        return farmYearMap[item.farmId] === selectedYear;
      }
      // Fallback for independent records (Dairy) based on year field or date year
      if (item.year !== undefined) {
        return item.year.toString() === selectedYear;
      }
      const date = new Date(item.date || item.createdAt);
      return date.getFullYear().toString() === selectedYear;
    });
  };

  const handleExportPDF = async () => {
    if (!selectedYear) {
      toast.error('Please select a year');
      return;
    }
    setIsExporting(true);
    const toastId = toast.loading('Generating PDF Report...');
    console.log("[PDF Export] Starting Export", { selectedYear, selectedModule });
    
    try {
      // 1. Fetch Latest Data
      await Promise.all([
        dispatch(fetchTractor(undefined)),
        dispatch(fetchKhatEntries(undefined)),
        dispatch(fetchSeedEntries(undefined)),
        dispatch(fetchAushadEntries(undefined)),
        dispatch(fetchWorkerEntries(undefined)),
        dispatch(fetchHarvestEntries(undefined)),
        dispatch(fetchDairyExpenses()),
        dispatch(fetchMilkEntries()),
        dispatch(fetchOtherExpenses(undefined)),
        dispatch(fetchFarms()),
      ]);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // 2. Formatting Helpers
      const getFarmName = (id: string | undefined) => {
        if (!id) return '-';
        const farm = farms.find(f => f.id === id);
        return sanitizeDataForPDF(farm?.name || '-');
      };

      /**
       * HELPER: Sanitize data for PDF export.
       * Default jsPDF fonts (Helvetica) do not support Devanagari (Marathi).
       * We map common terms to English and strip non-ASCII to prevent corruption symbols.
       * This ensures stability in the AI Studio and mobile environments.
       */
      const sanitizeDataForPDF = (val: any): string => {
        if (val === null || val === undefined) return '-';
        const str = String(val).trim();
        
        // Comprehensive mapping for the most common farming terms
        const marathiMap: Record<string, string> = {
          'ट्रॅक्टर': 'Tractor', 'नांगरणी': 'Plowing', 'पेरणी': 'Sowing',
          'कापणी': 'Harvesting', 'खुरपणी': 'Weeding', 'फवारणी': 'Spraying',
          'मजूर': 'Worker', 'माजूर': 'Worker', 'खत': 'Fertilizer',
          'औषध': 'Medicine', 'बीज': 'Seed', 'गहू': 'Wheat',
          'बाजरी': 'Bajra', 'कापूस': 'Cotton', 'ऊस': 'Sugarcane',
          'सोयाबीन': 'Soybean', 'एकूण': 'Total', 'बाकी': 'Remaining',
          'जमा': 'Paid', 'नफा': 'Profit', 'तोटा': 'Loss'
        };

        if (marathiMap[str]) return marathiMap[str];

        // Process potential sentences or mixed strings
        let processed = str;
        Object.entries(marathiMap).forEach(([marathi, english]) => {
          processed = processed.replace(new RegExp(marathi, 'g'), english);
        });

        // Strip any remaining Unicode to ensure zero corruption symbols
        const hasUnicode = /[\u0900-\u097F]/.test(processed);
        if (hasUnicode) {
          const asciiOnly = processed.replace(/[\u0900-\u097F]/g, '').trim();
          return asciiOnly || 'Record';
        }

        return processed || '-';
      };

      const filterRecordsByYear = (data: any[]) => {
        return (data || []).filter(item => {
          if (item?.farmId && farmYearMap[item.farmId]) {
            return String(farmYearMap[item.farmId]) === String(selectedYear);
          }
          if (item?.year !== undefined && item?.year !== null) {
            return String(item.year) === String(selectedYear);
          }
          const dateStr = item?.date || item?.createdAt;
          if (dateStr) {
            try {
              const date = new Date(dateStr);
              return String(date.getFullYear()) === String(selectedYear);
            } catch (e) { return false; }
          }
          return false;
        });
      };

      // 3. Data Preparation Modules
      const getModuleData = (name: string) => {
        let rawData: any[] = [];
        let headers: string[] = [];
        let mapFn: (i: any) => any[] = (i) => [];
        let numericIndices: number[] = [];

        switch (name) {
          case 'Tractor':
            rawData = tractorData;
            headers = ['Date', 'Farm', 'Work', 'Supplier', 'Amount', 'Paid', 'Pending'];
            mapFn = (i) => [
              i.date ? format(new Date(i.date), 'dd/MM/yy') : '-',
              getFarmName(i.farmId),
              sanitizeDataForPDF(i.workType || '-'),
              sanitizeDataForPDF(i.providerName || '-'),
              Number(i.totalAmount || 0),
              Number(i.totalPaidAmount || 0),
              Number(i.remainingAmount || 0)
            ];
            numericIndices = [4, 5, 6];
            break;
          case 'Fertilizer':
            rawData = khatData;
            headers = ['Date', 'Farm', 'Fertilizer', 'Qty', 'Supplier', 'Bill #', 'Amount', 'Paid', 'Pending'];
            mapFn = (i) => [
              i.date ? format(new Date(i.date), 'dd/MM/yy') : '-',
              getFarmName(i.farmId),
              sanitizeDataForPDF(i.khatName || '-'),
              sanitizeDataForPDF(i.quantity || '-'),
              sanitizeDataForPDF(i.providerName || '-'),
              sanitizeDataForPDF(i.billNumber || '-'),
              Number(i.totalAmount || 0),
              Number(i.totalPaidAmount || 0),
              Number(i.remainingAmount || 0)
            ];
            numericIndices = [6, 7, 8];
            break;
          case 'Seeds':
            rawData = seedData;
            headers = ['Date', 'Farm', 'Seed', 'Supplier', 'Bill #', 'Amount', 'Paid', 'Pending'];
            mapFn = (i) => [
              i.date ? format(new Date(i.date), 'dd/MM/yy') : '-',
              getFarmName(i.farmId),
              sanitizeDataForPDF(i.seedName || '-'),
              sanitizeDataForPDF(i.providerName || i.seedCompany || '-'),
              sanitizeDataForPDF(i.billNumber || '-'),
              Number(i.totalAmount || 0),
              Number(i.totalPaidAmount || 0),
              Number(i.remainingAmount || 0)
            ];
            numericIndices = [5, 6, 7];
            break;
          case 'Pesticides':
            rawData = aushadData;
            headers = ['Date', 'Farm', 'Medicine', 'Purpose', 'Bill #', 'Amount', 'Paid', 'Pending'];
            mapFn = (i) => [
              i.date ? format(new Date(i.date), 'dd/MM/yy') : '-',
              getFarmName(i.farmId),
              sanitizeDataForPDF(i.medicineName || '-'),
              sanitizeDataForPDF(i.type || '-'),
              sanitizeDataForPDF(i.billNumber || '-'),
              Number(i.totalAmount || 0),
              Number(i.totalPaidAmount || 0),
              Number(i.remainingAmount || 0)
            ];
            numericIndices = [5, 6, 7];
            break;
          case 'Workers':
            rawData = workerData;
            headers = ['Date', 'Worker', 'Work', 'Farm', 'Amount', 'Paid', 'Pending'];
            mapFn = (i) => [
              i.date ? format(new Date(i.date), 'dd/MM/yy') : '-',
              sanitizeDataForPDF(i.workerName || '-'),
              sanitizeDataForPDF(i.workType || '-'),
              getFarmName(i.farmId),
              Number(i.totalAmount || 0),
              Number(i.totalPaidAmount || 0),
              Number(i.remainingAmount || 0)
            ];
            numericIndices = [4, 5, 6];
            break;
          case 'Harvest':
            rawData = harvestData;
            headers = ['Farm', 'Crop', 'Quantity', 'Income', 'Expense', 'Profit'];
            mapFn = (i) => [
              getFarmName(i.farmId),
              sanitizeDataForPDF(i.cropName || '-'),
              sanitizeDataForPDF(`${i.quantity || 0} ${i.unit || ''}`),
              Number(i.totalSale || 0),
              Number(i.totalExpense || 0),
              Number(i.profit || 0)
            ];
            numericIndices = [3, 4, 5];
            break;
          case 'MilkRecords':
            rawData = milkData;
            headers = ['Date', 'Source', 'Milk (L)', 'FAT', 'Rate', 'Income'];
            mapFn = (i) => [
              i.date ? format(new Date(i.date), 'dd/MM/yy') : '-',
              sanitizeDataForPDF(i.cowName || 'Bulk'),
              Number(i.totalMilk || 0),
              sanitizeDataForPDF(i.fat || '-'),
              Number(i.milkPrice || 0),
              Number(i.totalSale || 0)
            ];
            numericIndices = [2, 4, 5];
            break;
          case 'DairyExpenses':
            rawData = dairyExpenseData;
            headers = ['Date', 'Expense', 'Amount', 'Paid', 'Pending'];
            mapFn = (i) => [
              i.date ? format(new Date(i.date), 'dd/MM/yy') : '-',
              sanitizeDataForPDF(i.expenseType || '-'),
              Number(i.totalAmount || 0),
              Number(i.totalPaidAmount || 0),
              Number(i.remainingAmount || 0)
            ];
            numericIndices = [2, 3, 4];
            break;
          case 'OtherExpenses':
            rawData = otherExpenseData;
            headers = ['Date', 'Category', 'Expense', 'Supplier', 'Amount', 'Paid', 'Pending', 'Status'];
            mapFn = (i) => {
              const rem = Number(i.remainingAmount || 0);
              const paid = Number(i.paidAmount || 0);
              let status = 'Unpaid';
              if (rem === 0) status = 'Paid';
              else if (paid > 0) status = 'Partial';
              
              return [
                i.date ? format(new Date(i.date), 'dd/MM/yy') : '-',
                sanitizeDataForPDF(i.category || '-'),
                sanitizeDataForPDF(i.expenseName || '-'),
                sanitizeDataForPDF(i.sellerName || '-'),
                Number(i.totalAmount || 0),
                Number(i.paidAmount || 0),
                Number(i.remainingAmount || 0),
                status
              ];
            };
            numericIndices = [4, 5, 6];
            break;
        }

        const filtered = filterRecordsByYear(rawData);
        const rows = filtered.map(mapFn);
        
        // Calculate Totals row if data exists
        if (rows.length > 0) {
          const totalsRow = new Array(headers.length).fill('');
          totalsRow[0] = 'TOTAL';
          numericIndices.forEach(idx => {
            totalsRow[idx] = rows.reduce((sum, row) => sum + (Number(row[idx]) || 0), 0);
          });
          rows.push([]);
          rows.push(totalsRow);
        }

        return { headers, rows };
      };

      // 4. Document Construction
      // Header Section
      doc.setFontSize(22);
      doc.setTextColor(22, 163, 74);
      doc.text('KhetiHisab Report', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Year: ${selectedYear}`, pageWidth / 2, 28, { align: 'center' });
      doc.text(`Exported: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, pageWidth / 2, 33, { align: 'center' });
      doc.line(20, 38, pageWidth - 20, 38);

      let currentY = 45;
      let hasData = false;

      const addModuleToPDF = (displayName: string, internalName: string) => {
        const { headers, rows } = getModuleData(internalName);
        if (rows.length === 0) return;

        hasData = true;
        if (currentY > 230) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text(displayName, 20, currentY);
        currentY += 5;

        autoTable(doc, {
          startY: currentY,
          head: [headers],
          body: rows,
          theme: 'striped',
          headStyles: { fillColor: [22, 163, 74] },
          styles: { font: 'helvetica', fontSize: 8 },
          margin: { left: 20, right: 20 },
          didDrawPage: (data) => {
            currentY = data.cursor ? data.cursor.y + 15 : currentY + 15;
          }
        });
      };

      const modulePdfMap: Record<string, string> = {
        tractor: 'Tractor',
        khat: 'Fertilizer',
        seeds: 'Seeds',
        aushad: 'Pesticides',
        worker: 'Workers',
        harvest: 'Harvest',
        dairy_milk: 'MilkRecords',
        dairy_expense: 'DairyExpenses',
        other_expenses: 'OtherExpenses'
      };

      if (selectedModule === 'all') {
        Object.entries(modulePdfMap).forEach(([id, name]) => {
          addModuleToPDF(name, name);
        });
      } else {
        const name = modulePdfMap[selectedModule];
        if (name) {
          addModuleToPDF(name, name);
        } else if (selectedModule === 'farms') {
          const farmRows = farms.filter(f => String(f.year) === String(selectedYear)).map(f => [
            sanitizeDataForPDF(f.name || '-'),
            sanitizeDataForPDF(f.year || '-'),
            f.createdAt ? format(new Date(f.createdAt), 'dd/MM/yy') : '-'
          ]);
          if (farmRows.length > 0) {
            hasData = true;
            doc.setFontSize(14);
            doc.text('Farming Locations', 20, currentY);
            autoTable(doc, {
              startY: currentY + 5,
              head: [['Farm Name', 'Year', 'Created At']],
              body: farmRows,
              theme: 'striped',
              headStyles: { fillColor: [22, 163, 74] },
              margin: { left: 20, right: 20 }
            });
          }
        }
      }

      if (!hasData) {
        toast.error('No records found for the selected filter.', { id: toastId });
        return;
      }

      const label = MODULES.find(m => m.id === selectedModule)?.label.replace(/\s+/g, '') || 'Report';
      doc.save(`${label}_${selectedYear}_Report.pdf`);
      toast.success('PDF report exported successfully!', { id: toastId });
    } catch (error: any) {
      console.error('[PDF Export] Error:', error);
      toast.error(error?.message || 'Failed to generate PDF report.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!selectedYear) {
      toast.error('Please select a year');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading('Generating Excel Report...');
    
    try {
      console.log("[Excel Export] Starting Export", { selectedYear, selectedModule });
      
      // 1. Fetch Latest Data
      await Promise.all([
        dispatch(fetchTractor(undefined)),
        dispatch(fetchKhatEntries(undefined)),
        dispatch(fetchSeedEntries(undefined)),
        dispatch(fetchAushadEntries(undefined)),
        dispatch(fetchWorkerEntries(undefined)),
        dispatch(fetchHarvestEntries(undefined)),
        dispatch(fetchDairyExpenses()),
        dispatch(fetchMilkEntries()),
        dispatch(fetchOtherExpenses(undefined)),
        dispatch(fetchFarms()),
      ]);

      const workbook = XLSX.utils.book_new();
      if (!workbook) throw new Error("Failed to create Excel workbook");

      const getFarmName = (id: string | undefined) => {
        if (!id) return '-';
        return farms.find(f => f.id === id)?.name || '-';
      };

      // 2. Data Filtering & Sanitization Logic
      const filterRecordsByYear = (data: any[]) => {
        return (data || []).filter(item => {
          // Priority 1: Match by Farm's Year if farmId exists
          if (item?.farmId && farmYearMap[item.farmId]) {
            return String(farmYearMap[item.farmId]) === String(selectedYear);
          }
          // Priority 2: Match by direct year field
          if (item?.year !== undefined && item?.year !== null) {
            return String(item.year) === String(selectedYear);
          }
          // Priority 3: Fallback to Date year
          const dateStr = item?.date || item?.createdAt;
          if (dateStr) {
            try {
              const date = new Date(dateStr);
              return String(date.getFullYear()) === String(selectedYear);
            } catch (e) {
              return false;
            }
          }
          return false;
        });
      };

      // Helper to generate clean, safe rows for Excel
      const createSheetData = (moduleName: string) => {
        let rawData: any[] = [];
        let mapFn: (i: any) => any = (i) => i;

        switch (moduleName) {
          case 'Tractor':
            rawData = tractorData;
            mapFn = (i) => ({
              Date: i.date ? format(new Date(i.date), 'yyyy-MM-dd') : '-',
              Farm: getFarmName(i.farmId),
              Work: i.workType || '-',
              Supplier: i.providerName || '-',
              Amount: Number(i.totalAmount || 0),
              Paid: Number(i.totalPaidAmount || 0),
              Remaining: Number(i.remainingAmount || 0)
            });
            break;
          case 'Fertilizer':
            rawData = khatData;
            mapFn = (i) => ({
              Date: i.date ? format(new Date(i.date), 'yyyy-MM-dd') : '-',
              Farm: getFarmName(i.farmId),
              Fertilizer: i.khatName || '-',
              Qty: i.quantity || '-',
              Supplier: i.providerName || '-',
              'Bill Number': i.billNumber || '-',
              Amount: Number(i.totalAmount || 0),
              Paid: Number(i.totalPaidAmount || 0),
              Remaining: Number(i.remainingAmount || 0)
            });
            break;
          case 'Seeds':
            rawData = seedData;
            mapFn = (i) => ({
              Date: i.date ? format(new Date(i.date), 'yyyy-MM-dd') : '-',
              Farm: getFarmName(i.farmId),
              Seed: i.seedName || '-',
              Supplier: i.providerName || i.seedCompany || '-',
              'Bill Number': i.billNumber || '-',
              Amount: Number(i.totalAmount || 0),
              Paid: Number(i.totalPaidAmount || 0),
              Remaining: Number(i.remainingAmount || 0)
            });
            break;
          case 'Pesticides':
            rawData = aushadData;
            mapFn = (i) => ({
              Date: i.date ? format(new Date(i.date), 'yyyy-MM-dd') : '-',
              Farm: getFarmName(i.farmId),
              Medicine: i.medicineName || '-',
              Supplier: i.providerName || '-',
              'Bill Number': i.billNumber || '-',
              Purpose: i.type || '-',
              Amount: Number(i.totalAmount || 0),
              Paid: Number(i.totalPaidAmount || 0),
              Remaining: Number(i.remainingAmount || 0)
            });
            break;
          case 'Workers':
            rawData = workerData;
            mapFn = (i) => ({
              Date: i.date ? format(new Date(i.date), 'yyyy-MM-dd') : '-',
              Worker: i.workerName || '-',
              Work: i.workType || '-',
              Farm: getFarmName(i.farmId),
              Amount: Number(i.totalAmount || 0),
              Paid: Number(i.totalPaidAmount || 0),
              Remaining: Number(i.remainingAmount || 0)
            });
            break;
          case 'Harvest':
            rawData = harvestData;
            mapFn = (i) => ({
              Date: i.date ? format(new Date(i.date), 'yyyy-MM-dd') : '-',
              Farm: getFarmName(i.farmId),
              Crop: i.cropName || '-',
              Quantity: `${i.quantity || 0} ${i.unit || ''}`,
              Income: Number(i.totalSale || 0),
              Expense: Number(i.totalExpense || 0),
              Profit: Number(i.profit || 0)
            });
            break;
          case 'Dairy_Milk':
            rawData = milkData;
            mapFn = (i) => ({
              Date: i.date ? format(new Date(i.date), 'yyyy-MM-dd') : '-',
              Source: i.cowName || 'Bulk',
              Milk_L: Number(i.totalMilk || 0),
              FAT: i.fat || '-',
              Rate: Number(i.milkPrice || 0),
              Income: Number(i.totalSale || 0)
            });
            break;
          case 'Dairy_Expense':
            rawData = dairyExpenseData;
            mapFn = (i) => ({
              Date: i.date ? format(new Date(i.date), 'yyyy-MM-dd') : '-',
              Expense: i.expenseType || '-',
              Amount: Number(i.totalAmount || 0),
              Paid: Number(i.totalPaidAmount || 0),
              Remaining: Number(i.remainingAmount || 0)
            });
            break;
          case 'Other_Expenses':
            rawData = otherExpenseData;
            mapFn = (i) => {
              const rem = Number(i.remainingAmount || 0);
              const paid = Number(i.paidAmount || 0);
              let status = 'Unpaid';
              if (rem === 0) status = 'Paid';
              else if (paid > 0) status = 'Partial';

              return {
                Date: i.date ? format(new Date(i.date), 'yyyy-MM-dd') : '-',
                Category: i.category || '-',
                Expense: i.expenseName || '-',
                Supplier: i.sellerName || '-',
                Amount: Number(i.totalAmount || 0),
                Paid: Number(i.paidAmount || 0),
                Remaining: Number(i.remainingAmount || 0),
                Status: status
              };
            };
            break;
          case 'Farms':
            rawData = farms.filter(f => String(f.year) === String(selectedYear));
            mapFn = (i) => ({
              'Farm Name': i.name || '-',
              'Year': i.year || '-',
              'Created At': i.createdAt ? format(new Date(i.createdAt), 'yyyy-MM-dd') : '-'
            });
            return rawData.map(mapFn); // No totals for farms list
          default:
            return [];
        }

        const filtered = filterRecordsByYear(rawData);
        return filtered.map(mapFn);
      };

      // Helper to calculate totals and append to worksheet
      const appendSheetWithCalculations = (sheetName: string, data: any[]) => {
        if (!data || data.length === 0) {
          console.log(`[Excel Export] Skipping empty sheet: ${sheetName}`);
          return false;
        }

        const keys = Object.keys(data[0]);
        const numericKeys = keys.filter(k => 
          ['Amount', 'Paid', 'Remaining', 'Income', 'Expense', 'Profit', 'Milk_L'].includes(k)
        );

        const totals: any = {};
        keys.forEach(k => {
          if (k === keys[0]) {
            totals[k] = 'TOTAL';
          } else if (numericKeys.includes(k)) {
            const sum = data.reduce((acc, row) => acc + (Number(row[k]) || 0), 0);
            totals[k] = sum;
          } else {
            totals[k] = '';
          }
        });

        const finalData = [...data, {}, totals];
        const worksheet = XLSX.utils.json_to_sheet(finalData);
        if (!worksheet) throw new Error(`Worksheet generation failed for ${sheetName}`);

        // Set column widths
        worksheet['!cols'] = keys.map(k => ({ wch: Math.max(k.length + 8, 15) }));

        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));
        return true;
      };

      let hasExportedAny = false;

      // 3. Execution Phase
      const moduleKeyMap: Record<string, string> = {
        tractor: 'Tractor',
        khat: 'Fertilizer',
        seeds: 'Seeds',
        aushad: 'Pesticides',
        worker: 'Workers',
        harvest: 'Harvest',
        dairy_milk: 'Dairy_Milk',
        dairy_expense: 'Dairy_Expense',
        other_expenses: 'Other_Expenses',
        farms: 'Farms'
      };

      if (selectedModule === 'all') {
        console.log("[Excel Export] Processing All Modules");
        
        // Add individual sheets
        Object.entries(moduleKeyMap).forEach(([id, name]) => {
          try {
            const data = createSheetData(name);
            if (appendSheetWithCalculations(name, data)) {
              hasExportedAny = true;
            }
          } catch (e) {
            console.error(`[Excel Export] Error appending sheet ${name}:`, e);
          }
        });
      } else {
        const name = moduleKeyMap[selectedModule];
        if (name) {
          console.log(`[Excel Export] Processing Single Module: ${name}`);
          const data = createSheetData(name);
          if (appendSheetWithCalculations(name, data)) {
            hasExportedAny = true;
          }
        }
      }

      if (!hasExportedAny) {
        toast.error('No records found for the selected year and module.', { id: toastId });
        return;
      }

      // 4. File Generation
      const label = MODULES.find(m => m.id === selectedModule)?.label.replace(/\s+/g, '') || 'Report';
      const fileName = `${label}_${selectedYear}_Export.xlsx`;
      
      console.log(`[Excel Export] Writing File: ${fileName}`);
      XLSX.writeFile(workbook, fileName);
      
      toast.success('Excel exported successfully!', { id: toastId });
    } catch (error: any) {
      console.error('[Excel Export] CRITICAL ERROR:', error);
      toast.error(error?.message || 'Failed to generate Excel report.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => navigate(-1)}
          className="p-3 bg-card-secondary rounded-2xl text-muted-foreground hover:text-foreground transition-all active:scale-95 border border-border"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black uppercase text-foreground leading-none">Data Export</h1>
          <p className="text-[10px] font-black uppercase text-muted-foreground mt-1 tracking-widest leading-none">Settings → Export</p>
        </div>
      </div>

      <div className="premium-card p-8 space-y-8 bg-card border-border shadow-xl">
        <div className="space-y-6">
          {/* Year Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Year</label>
            {availableYears.length > 0 ? (
              <div className="relative">
                <select
                  className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-bold transition-all text-sm appearance-none cursor-pointer pr-12"
                  value={selectedYear || ''}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            ) : (
              <div className="p-4 bg-muted/50 rounded-2xl border border-dashed border-border text-center">
                <p className="text-xs font-black uppercase text-muted-foreground py-2">No farm years available</p>
              </div>
            )}
          </div>

          {/* Module Selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Module Selection</label>
            <div className="relative">
              <select
                className="w-full bg-card-secondary border border-border rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-bold transition-all text-sm appearance-none cursor-pointer"
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
              >
                {MODULES.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 pt-4">
          <button
            disabled={isExporting || availableYears.length === 0}
            onClick={handleExportPDF}
            className="w-full group relative overflow-hidden bg-gradient-to-br from-red-500 to-red-600 p-5 rounded-3xl flex items-center justify-between transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-xl shadow-red-500/10"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl text-white">
                <FileText size={20} className="group-hover:rotate-12 transition-transform" />
              </div>
              <div className="text-left">
                <span className="block text-white font-black uppercase tracking-widest text-sm">Download PDF</span>
                <span className="block text-[9px] text-white/70 font-bold uppercase tracking-tight">Best for Printing & Sharing</span>
              </div>
            </div>
            {isExporting ? <Loader2 size={24} className="animate-spin text-white" /> : <ChevronLeft size={20} className="text-white rotate-180" />}
          </button>

          <button
            disabled={isExporting || availableYears.length === 0}
            onClick={handleExportExcel}
            className="w-full group relative overflow-hidden bg-gradient-to-br from-green-600 to-green-700 p-5 rounded-3xl flex items-center justify-between transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-xl shadow-green-600/10"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl text-white">
                <FileSpreadsheet size={20} className="group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-left">
                <span className="block text-white font-black uppercase tracking-widest text-sm">Export Excel</span>
                <span className="block text-[9px] text-white/70 font-bold uppercase tracking-tight">Best for Data & Calculations</span>
              </div>
            </div>
            {isExporting ? <Loader2 size={24} className="animate-spin text-white" /> : <ChevronLeft size={20} className="text-white rotate-180" />}
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 gap-4 pt-4">
           <div className="p-4 bg-muted/50 rounded-3xl border border-border flex flex-col items-center text-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              <span className="text-[10px] font-black uppercase text-muted-foreground">Yearly Reports</span>
           </div>
           <div className="p-4 bg-muted/50 rounded-3xl border border-border flex flex-col items-center text-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              <span className="text-[10px] font-black uppercase text-muted-foreground">Detailed Tables</span>
           </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 px-10 text-muted-foreground">
        <div className="flex flex-col items-center gap-1">
          <Share2 size={18} />
          <span className="text-[9px] font-bold uppercase">Share</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Printer size={18} />
          <span className="text-[9px] font-bold uppercase">Print</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Calendar size={18} />
          <span className="text-[9px] font-bold uppercase">Archive</span>
        </div>
      </div>
    </div>
  );
};

export default DataExportScreen;
