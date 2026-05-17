import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle2, Clock, Download, Info, TrendingUp, Layers, Check, AlertCircle } from 'lucide-react';
import { TractorEntry, Farm } from '../types';
import { storage } from '../api/storage';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function TransactionDetailScreen() {
  const { farmId, entryId } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState<TractorEntry[]>([]);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (entryId && farmId) {
        try {
          const [historyData, farms] = await Promise.all([
            storage.getTractorHistory(entryId),
            storage.getFarms()
          ]);
          setHistory(historyData);
          setFarm(farms.find(f => f.id === farmId) || null);
        } catch (err) {
          console.error("Failed to load audit data", err);
        } finally {
          setIsLoading(false);
        }
      }
    }
    loadData();
  }, [entryId, farmId]);

  const generatePDF = () => {
    if (!history.length || !farm) return;
    
    const doc = new jsPDF();
    const latest = history[history.length - 1];
    const original = history[0];

    // --- SECTION 1: HEADER & FARM INFO ---
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.setFont('helvetica', 'bold');
    doc.text('Tractor Work Audit Report', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 14, 28);

    doc.setDrawColor(240);
    doc.line(14, 32, 196, 32);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Farm Details:', 14, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(`${farm.name} (${farm.year})`, 45, 42);

    doc.setFont('helvetica', 'bold');
    doc.text('Work Details:', 14, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(`${original.workType} | ${original.landSize} Gunta | ₹${original.rate}/Acre`, 45, 50);

    if (original.providerName) {
      doc.setFont('helvetica', 'bold');
      doc.text('Provider:', 14, 58);
      doc.setFont('helvetica', 'normal');
      doc.text(original.providerName, 45, 58);
    }

    // --- SECTION 2: BILLING SUMMARY (UI MATCH) ---
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'bold');
    doc.text('BILLING SUMMARY', 14, 65);

    // Draw 3 Summary Cards
    const cardWidth = 58;
    const cardY = 70;
    const cardHeight = 25;

    const drawCard = (x: number, title: string, value: string, color: [number, number, number]) => {
      doc.setDrawColor(230);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, cardY, cardWidth, cardHeight, 3, 3, 'FD');
      
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.setFont('helvetica', 'bold');
      doc.text(title.toUpperCase(), x + 5, cardY + 8);
      
      doc.setFontSize(14);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(value, x + 5, cardY + 18);
    };

    drawCard(14, 'Total Bill', `RS ${latest.totalAmount.toLocaleString()}`, [37, 99, 235]);
    drawCard(14 + cardWidth + 5, 'Total Paid', `RS ${latest.totalPaidAmount.toLocaleString()}`, [22, 163, 74]);
    drawCard(14 + (cardWidth + 5) * 2, 'Remaining', `RS ${latest.remainingAmount.toLocaleString()}`, [220, 38, 38]);

    // --- SECTION 3: PAYMENT TIMELINE (UI MATCH) ---
    let currentY = 110;
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT TIMELINE', 14, currentY);
    currentY += 10;

    if (history && Array.isArray(history)) {
      history.forEach((entry, idx) => {
        const isOriginal = idx === 0;
        const prevEntry = idx > 0 ? history[idx - 1] : null;
        const isRateUpdate = entry.description === "Rate updated";
        
        // Page break check
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        // Step Header
        let stepTitle = isOriginal ? 'ORIGINAL ENTRY' : 'PAYMENT UPDATE';
        if (isRateUpdate) stepTitle = 'RATE REVISION';

        doc.setFillColor(isOriginal ? 245 : (isRateUpdate ? 255 : 240), isOriginal ? 245 : (isRateUpdate ? 248 : 248), isOriginal ? 245 : (isRateUpdate ? 241 : 255));
        doc.roundedRect(14, currentY, 182, 40, 3, 3, 'F');
        
        doc.setFontSize(9);
        doc.setTextColor(isOriginal ? 100 : (isRateUpdate ? 217 : 37), isOriginal ? 100 : (isRateUpdate ? 119 : 99), isOriginal ? 100 : (isRateUpdate ? 6 : 235));
        doc.setFont('helvetica', 'bold');
        doc.text(`STEP ${idx + 1}: ${stepTitle}`, 18, currentY + 8);
        
        doc.setTextColor(150);
        doc.setFont('helvetica', 'normal');
        doc.text(format(new Date(entry.paidDate), 'dd MMM yyyy'), 160, currentY + 8);

        // Data Row
        doc.setTextColor(50);
        doc.setFontSize(10);
        if (isOriginal) {
          doc.setFont('helvetica', 'bold');
          doc.text('Work Type:', 18, currentY + 20);
          doc.setFont('helvetica', 'normal');
          doc.text(entry.workType, 45, currentY + 20);

          doc.setFont('helvetica', 'bold');
          doc.text('Total Bill:', 18, currentY + 30);
          doc.setFont('helvetica', 'normal');
          doc.text(`RS ${entry.totalAmount.toLocaleString()}`, 45, currentY + 30);
        } else if (isRateUpdate) {
          doc.setFont('helvetica', 'bold');
          doc.text('Old Total:', 18, currentY + 20);
          doc.setFont('helvetica', 'normal');
          doc.text(`RS ${prevEntry?.totalAmount.toLocaleString()}`, 45, currentY + 20);

          doc.setFont('helvetica', 'bold');
          doc.text('New Total:', 18, currentY + 30);
          doc.setTextColor(37, 99, 235);
          doc.text(`RS ${entry.totalAmount.toLocaleString()}`, 45, currentY + 30);
          doc.setTextColor(50);
        } else {
          doc.setFont('helvetica', 'bold');
          doc.text('Paid Now:', 18, currentY + 20);
          doc.setFont('helvetica', 'normal');
          doc.text(`RS ${entry.paidAmountNow.toLocaleString()}`, 45, currentY + 20);

          doc.setFont('helvetica', 'bold');
          doc.text('Remaining:', 18, currentY + 30);
          doc.setTextColor(220, 38, 38);
          doc.text(`RS ${entry.remainingAmount.toLocaleString()}`, 45, currentY + 30);
          doc.setTextColor(50);
        }

        // Description if exists
        if (entry.description && !isRateUpdate) {
          doc.setFontSize(8);
          doc.setTextColor(120);
          doc.text(`Note: ${entry.description}`, 100, currentY + 20, { maxWidth: 80 });
        }

        currentY += 45;
      });
    }

    doc.save(`Audit_${farm.name}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  if (isLoading) return <div className="p-10 text-center font-bold text-slate-400 dark:text-slate-600">Loading History...</div>;
  if (history.length === 0) return <div className="p-10 text-center text-slate-500 dark:text-slate-400">No history found.</div>;

  const original = history[0];
  const latest = history[history.length - 1];
  const timeline = history; // Oldest to newest as requested for logical flow

  return (
    <div className="space-y-6 pb-20 p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2.5 bg-card border border-border rounded-2xl shadow-sm text-muted-foreground hover:bg-card-secondary active:scale-95 transition-all">
            <ArrowLeft size={24} />
          </button>
          <div className="text-left">
            <h2 className="text-xl font-black text-foreground tracking-tight text-left">Transaction Audit</h2>
            <p className="text-xs text-muted-foreground font-black uppercase tracking-widest text-left italic">{original.workType} | {original.landSize} Gunta | ₹{original.rate}/Acre</p>
          </div>
        </div>
        <button 
          onClick={generatePDF}
          className="flex items-center gap-3 bg-blue-600 dark:bg-blue-500 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg transition-all active:scale-95"
        >
          <Download size={16} />
          Export PDF
        </button>
      </div>

      {/* Summary Section */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] px-1 text-center py-4 opacity-50">Billing Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm relative overflow-hidden group text-left">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 text-left">Total Bill</p>
             <p className="text-2xl font-black text-blue-500 font-mono italic tracking-tighter text-left">₹{latest.totalAmount.toLocaleString()}</p>
          </div>
          <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm border-l-4 border-l-green-500 relative overflow-hidden group text-left">
             <p className="text-[10px] font-black text-muted-foreground uppercase mb-1 font-mono tracking-widest text-left">Paid</p>
             <p className="text-2xl font-black text-green-500 font-mono italic tracking-tighter text-left">₹{latest.totalPaidAmount.toLocaleString()}</p>
          </div>
          <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm border-l-4 border-l-red-500 relative overflow-hidden group text-left">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 text-left">Remaining</p>
             <p className="text-2xl font-black text-red-500 font-mono italic tracking-tighter text-left">₹{latest.remainingAmount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] px-1 text-center py-4 opacity-50">Payment Timeline (Old → New)</h3>
        
        <div className="relative ml-4 space-y-8 before:absolute before:inset-0 before:ml-1 before:-translate-x-px before:h-full before:w-0.5 before:bg-border">
          {timeline.map((entry, idx) => {
            const isOriginal = idx === 0;
            const prevEntry = idx > 0 ? timeline[idx - 1] : null;
            const isRateUpdate = entry.description === "Rate updated";
            
            return (
              <motion.div 
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="relative flex items-start gap-4"
              >
                <div className={`absolute left-0 mt-1.5 h-3 w-3 rounded-full ring-4 ring-background z-10 transition-transform hover:scale-125 ${
                  isOriginal ? 'bg-muted-foreground' : (isRateUpdate ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]')
                }`} />
                
                <div className="ml-6 flex-1 text-left">
                  <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden text-left transition-all hover:border-blue-500/30">
                    {/* Header: Step Info */}
                    <div className={`px-6 py-3.5 flex justify-between items-center ${
                      isOriginal ? 'bg-muted/30 text-muted-foreground' : (isRateUpdate ? 'bg-orange-500/10 text-orange-500 font-black uppercase' : 'bg-blue-500/10 text-blue-500 font-black uppercase')
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest">Step {idx + 1}</span>
                        <h4 className="font-black text-[10px] uppercase tracking-tight flex items-center gap-1">
                          {isOriginal ? '📝 Original Entry' : (isRateUpdate ? '🔄 Rate Updated' : '🟢 Payment Update')}
                        </h4>
                      </div>
                      <div className="text-[10px] font-black opacity-60 font-mono">
                        {format(new Date(entry.paidDate), 'dd MMM yyyy')}
                      </div>
                    </div>

                    {/* Body: Data */}
                    <div className="p-6 space-y-6 text-left">
                      {isOriginal ? (
                        <div className="grid grid-cols-2 gap-4 text-left">
                          <div className="bg-card-secondary/50 p-4 rounded-[1.5rem] border border-border/50 text-left">
                            <p className="text-[9px] font-black text-muted-foreground uppercase mb-1 tracking-widest text-left">Work Type</p>
                            <p className="text-md font-black text-foreground text-left italic">{entry.workType}</p>
                          </div>
                          {entry.providerName && (
                            <div className="bg-card-secondary/50 p-4 rounded-[1.5rem] border border-border/50 text-left">
                              <p className="text-[9px] font-black text-muted-foreground uppercase mb-1 tracking-widest text-left">Provider</p>
                              <p className="text-md font-black text-blue-500 text-left italic">{entry.providerName}</p>
                            </div>
                          )}
                          <div className="bg-card-secondary/50 p-4 rounded-[1.5rem] border border-border/50 text-left">
                            <p className="text-[9px] font-black text-muted-foreground uppercase mb-1 tracking-widest text-left">Total Bill</p>
                            <p className="text-md font-black text-foreground font-mono text-left italic">₹{entry.totalAmount.toLocaleString()}</p>
                          </div>
                        </div>
                      ) : isRateUpdate ? (
                        <div className="grid grid-cols-2 gap-4 text-left">
                          <div className="bg-orange-500/5 p-4 rounded-[1.5rem] border border-orange-500/10 text-left">
                            <p className="text-[9px] font-black text-orange-500 uppercase mb-1 tracking-widest text-left">Old Total</p>
                            <p className="text-lg font-black text-muted-foreground line-through font-mono decoration-2 text-left italic">₹{prevEntry?.totalAmount.toLocaleString()}</p>
                          </div>
                          <div className="bg-blue-500/10 p-4 rounded-[1.5rem] border border-blue-500/20 text-left">
                            <p className="text-[9px] font-black text-blue-500 uppercase mb-1 tracking-widest text-left">New Total</p>
                            <p className="text-xl font-black text-blue-500 font-mono text-left italic">₹{entry.totalAmount.toLocaleString()}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                          <div className="bg-green-500/10 p-4 rounded-[1.5rem] border border-green-500/20 text-left">
                            <p className="text-[9px] font-black text-green-500 uppercase mb-1 tracking-widest text-left">Paid Now</p>
                            <p className="text-xl font-black text-green-600 dark:text-green-500 font-mono text-left italic tracking-tighter">₹{entry.paidAmountNow.toLocaleString()}</p>
                          </div>
                          <div className="bg-card-secondary/50 p-4 rounded-[1.5rem] border border-border/50 text-left">
                            <p className="text-[9px] font-black text-muted-foreground uppercase mb-1 tracking-widest text-left">Total Paid</p>
                            <p className="text-md font-black text-foreground font-mono text-left italic">₹{entry.totalPaidAmount.toLocaleString()}</p>
                          </div>
                          <div className="bg-red-500/10 p-4 rounded-[1.5rem] border border-red-500/20 text-left">
                            <p className="text-[9px] font-black text-red-500 uppercase mb-1 tracking-widest text-left">Remaining</p>
                            <p className="text-md font-black text-red-500 font-mono text-left italic">₹{entry.remainingAmount.toLocaleString()}</p>
                          </div>
                        </div>
                      )}

                      {entry.description && !isRateUpdate && (
                        <div className="flex items-start gap-3 bg-card-secondary p-4 rounded-[1.5rem] border border-border text-left">
                          <FileText size={16} className="mt-0.5 text-muted-foreground/30" />
                          <p className="text-xs text-muted-foreground italic leading-relaxed text-left">{entry.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
