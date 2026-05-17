import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Download, TrendingUp, History, ShoppingBag } from 'lucide-react';
import { KhatEntry, Farm } from '../types';
import { storage } from '../api/storage';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import jsPDF from 'jspdf';

export default function KhatTransactionDetailScreen() {
  const { farmId, entryId } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState<KhatEntry[]>([]);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (entryId && farmId) {
        try {
          const [historyData, farms] = await Promise.all([
            storage.getKhatHistory(entryId),
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
    doc.setTextColor(22, 163, 74); // Green-600
    doc.setFont('helvetica', 'bold');
    doc.text('Fertilizer (Khat) Audit Report', 14, 20);
    
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
    doc.text('Item Details:', 14, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(`${original.khatName} | ${original.quantity} Qty | ₹${original.price}/Qty`, 45, 50);

    if (original.providerName) {
      doc.setFont('helvetica', 'bold');
      doc.text('From:', 14, 58);
      doc.setFont('helvetica', 'normal');
      doc.text(original.providerName, 45, 58);
    }

    // --- SECTION 2: BILLING SUMMARY ---
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'bold');
    doc.text('BILLING SUMMARY', 14, 65);

    const drawCard = (x: number, title: string, value: string, color: [number, number, number]) => {
      doc.setDrawColor(230);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, 70, 58, 25, 3, 3, 'FD');
      
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.setFont('helvetica', 'bold');
      doc.text(title.toUpperCase(), x + 5, 78);
      
      doc.setFontSize(14);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(value, x + 5, 88);
    };

    drawCard(14, 'Total Bill', `RS ${latest.totalAmount.toLocaleString()}`, [22, 163, 74]);
    drawCard(77, 'Total Paid', `RS ${latest.totalPaidAmount.toLocaleString()}`, [37, 99, 235]);
    drawCard(140, 'Remaining', `RS ${latest.remainingAmount.toLocaleString()}`, [220, 38, 38]);

    // --- SECTION 3: PAYMENT TIMELINE ---
    let currentY = 110;
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'bold');
    doc.text('TRANSACTION HISTORY', 14, currentY);
    currentY += 10;

    history.forEach((entry, idx) => {
      const isOriginal = idx === 0;
      
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFillColor(isOriginal ? 245 : 240, isOriginal ? 245 : 248, isOriginal ? 245 : 255);
      doc.roundedRect(14, currentY, 182, 40, 3, 3, 'F');
      
      doc.setFontSize(9);
      doc.setTextColor(isOriginal ? 100 : 37, isOriginal ? 100 : 99, isOriginal ? 100 : 235);
      doc.setFont('helvetica', 'bold');
      doc.text(`STEP ${idx + 1}: ${isOriginal ? 'ORIGINAL PURCHASE' : 'PAYMENT UPDATE'}`, 18, currentY + 8);
      
      doc.setTextColor(150);
      doc.setFont('helvetica', 'normal');
      doc.text(format(new Date(entry.createdAt), 'dd MMM yyyy HH:mm'), 150, currentY + 8);

      doc.setTextColor(50);
      doc.setFontSize(10);
      if (isOriginal) {
        doc.setFont('helvetica', 'bold');
        doc.text('Item Name:', 18, currentY + 20);
        doc.setFont('helvetica', 'normal');
        doc.text(entry.khatName, 45, currentY + 20);

        doc.setFont('helvetica', 'bold');
        doc.text('Amount:', 18, currentY + 30);
        doc.setFont('helvetica', 'normal');
        doc.text(`RS ${entry.totalAmount.toLocaleString()}`, 45, currentY + 30);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.text('Paid Now:', 18, currentY + 20);
        doc.setFont('helvetica', 'normal');
        doc.text(`RS ${entry.paidAmountNow.toLocaleString()}`, 45, currentY + 20);

        doc.setFont('helvetica', 'bold');
        doc.text('Balance:', 18, currentY + 30);
        doc.setTextColor(220, 38, 38);
        doc.text(`RS ${entry.remainingAmount.toLocaleString()}`, 45, currentY + 30);
        doc.setTextColor(50);
      }

      if (entry.description) {
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(`Note: ${entry.description}`, 100, currentY + 20, { maxWidth: 80 });
      }

      currentY += 45;
    });

    doc.save(`Khat_Audit_${farm.name}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  if (isLoading) return <div className="p-10 text-center font-bold text-gray-400">Loading history...</div>;
  if (history.length === 0) return <div className="p-10 text-center">No history found.</div>;

  const original = history[0];
  const latest = history[history.length - 1];

  return (
    <div className="space-y-6 pb-20 p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2.5 bg-card rounded-2xl shadow-sm border border-border hover:bg-card-secondary active:scale-95 transition-all text-muted-foreground">
            <ArrowLeft size={20} />
          </button>
          <div className="text-left">
            <h2 className="text-xl font-black text-foreground tracking-tight text-left">Khat Audit Trail</h2>
            <p className="text-xs text-muted-foreground font-black uppercase tracking-widest text-left">{original.khatName} | {original.quantity} Qty</p>
          </div>
        </div>
        <button 
          onClick={generatePDF}
          className="flex items-center gap-3 bg-green-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg transition-all active:scale-95"
        >
          <Download size={18} />
          Export PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Bill', value: latest.totalAmount, color: 'text-foreground' },
          { label: 'Total Paid', value: latest.totalPaidAmount, color: 'text-blue-500', barColor: 'border-l-blue-500' },
          { label: 'Remaining', value: latest.remainingAmount, color: 'text-red-500', barColor: 'border-l-red-500' }
        ].map((s, i) => (
          <div key={i} className={`bg-card p-6 rounded-[2.5rem] border border-border shadow-sm ${s.barColor ? `border-l-4 ${s.barColor}` : ''} text-left relative overflow-hidden group`}>
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 text-left">{s.label}</p>
             <p className={`text-2xl font-black ${s.color} font-mono italic tracking-tighter text-left`}>₹{s.value.toLocaleString()}</p>
             <ShoppingBag size={48} className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] px-1 text-center py-4 opacity-50">Transaction History</h3>
        
        <div className="relative ml-4 space-y-8 before:absolute before:inset-0 before:ml-1 before:-translate-x-px before:h-full before:w-0.5 before:bg-border">
          {history.map((entry, idx) => {
            const isOriginal = idx === 0;
            
            return (
              <motion.div 
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="relative flex items-start gap-4"
              >
                <div className={`absolute left-0 mt-1.5 h-3 w-3 rounded-full ring-4 ring-background z-10 transition-transform group-hover:scale-125 ${
                  isOriginal ? 'bg-muted-foreground' : 'bg-green-500 shadow-md'
                }`} />
                
                <div className="ml-6 flex-1 text-left">
                  <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden text-left hover:border-green-500/30 transition-all">
                    <div className={`px-6 py-3.5 flex justify-between items-center ${
                      isOriginal ? 'bg-muted/30 text-muted-foreground' : 'bg-green-500/10 text-green-500 font-black uppercase tracking-widest'
                    }`}>
                      <h4 className="font-black text-[10px] uppercase tracking-widest text-left">
                        {isOriginal ? 'Step 1: Original purchase' : `Step ${idx + 1}: Payment Update`}
                      </h4>
                      <div className="text-[10px] font-black opacity-60 font-mono">
                        {format(new Date(entry.createdAt), 'dd MMM yyyy HH:mm')}
                      </div>
                    </div>

                    <div className="p-6 space-y-6 text-left">
                      {isOriginal ? (
                        <div className="grid grid-cols-2 gap-4 text-left">
                          <div className="bg-card-secondary/50 p-4 rounded-[1.5rem] border border-border/50 text-left">
                            <p className="text-[8px] font-black text-muted-foreground uppercase mb-1 tracking-widest text-left">Item Name</p>
                            <p className="text-sm font-black text-foreground text-left">{entry.khatName}</p>
                          </div>
                          {entry.providerName && (
                            <div className="bg-card-secondary/50 p-4 rounded-[1.5rem] border border-border/50 text-left">
                              <p className="text-[8px] font-black text-muted-foreground uppercase mb-1 tracking-widest text-left">Supplier</p>
                              <p className="text-sm font-black text-green-600 text-left">{entry.providerName}</p>
                            </div>
                          )}
                          <div className="bg-card-secondary/50 p-4 rounded-[1.5rem] border border-border/50 text-left">
                            <p className="text-[8px] font-black text-muted-foreground uppercase mb-1 tracking-widest text-left">Total Amount</p>
                            <p className="text-sm font-black text-foreground font-mono text-left italic">₹{entry.totalAmount.toLocaleString()}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                          <div className="bg-green-500/10 p-4 rounded-[1.5rem] border border-green-500/20 text-left">
                            <p className="text-[8px] font-black text-green-500 uppercase mb-1 tracking-widest text-left">Paid Now</p>
                            <p className="text-lg font-black text-green-500 font-mono italic text-left">₹{entry.paidAmountNow.toLocaleString()}</p>
                          </div>
                          <div className="bg-card-secondary/50 p-4 rounded-[1.5rem] border border-border/50 text-left">
                            <p className="text-[8px] font-black text-muted-foreground uppercase mb-1 tracking-widest text-left">Total Paid</p>
                            <p className="text-sm font-black text-foreground font-mono italic text-left">₹{entry.totalPaidAmount.toLocaleString()}</p>
                          </div>
                          <div className="bg-red-500/10 p-4 rounded-[1.5rem] border border-red-500/20 text-left">
                            <p className="text-[8px] font-black text-red-500 uppercase mb-1 tracking-widest text-left">Remaining</p>
                            <p className="text-sm font-black text-red-500 font-mono italic text-left">₹{entry.remainingAmount.toLocaleString()}</p>
                          </div>
                        </div>
                      )}

                      {entry.description && (
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
