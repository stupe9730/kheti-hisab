import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Download, History, Users, IndianRupee } from 'lucide-react';
import { WorkerEntry, Farm } from '../types';
import { storage } from '../api/storage';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import jsPDF from 'jspdf';

export default function WorkerTransactionDetailScreen() {
  const { farmId, entryId } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState<WorkerEntry[]>([]);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (entryId && farmId) {
        try {
          const [historyData, farms] = await Promise.all([
            storage.getWorkerHistory(entryId),
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

    doc.setFontSize(22);
    doc.setTextColor(249, 115, 22); // Orange-500
    doc.setFont('helvetica', 'bold');
    doc.text('Worker Wages (मजुरी) Receipt', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Audit Trail Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 14, 28);
    doc.line(14, 32, 196, 32);

    doc.setFont('helvetica', 'bold'); doc.setTextColor(0); doc.text('Farm:', 14, 42);
    doc.setFont('helvetica', 'normal'); doc.text(`${farm.name} (${farm.year})`, 40, 42);

    doc.setFont('helvetica', 'bold'); doc.text('Worker:', 14, 50);
    doc.setFont('helvetica', 'normal'); doc.text(`${original.workerName} (${original.workType})`, 40, 50);

    doc.setFont('helvetica', 'bold'); doc.text('Rate:', 14, 58);
    doc.setFont('helvetica', 'normal'); doc.text(`RS ${original.ratePerDay}/day for ${original.workingDays} days`, 40, 58);

    const drawBox = (x: number, y: number, title: string, value: string, color: [number, number, number]) => {
      doc.setDrawColor(240);
      doc.roundedRect(x, y, 58, 25, 2, 2, 'S');
      doc.setFontSize(8); doc.setTextColor(150); doc.text(title.toUpperCase(), x + 5, y + 8);
      doc.setFontSize(14); doc.setTextColor(color[0], color[1], color[2]); doc.text(value, x + 5, y + 18);
    };

    drawBox(14, 70, 'Total Wages', `RS ${latest.totalAmount.toLocaleString()}`, [234, 88, 12]);
    drawBox(77, 70, 'Total Paid', `RS ${latest.totalPaidAmount.toLocaleString()}`, [22, 163, 74]);
    drawBox(140, 70, 'Remaining', `RS ${latest.remainingAmount.toLocaleString()}`, [220, 38, 38]);

    let currentY = 110;
    history.forEach((h, idx) => {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      doc.setFillColor(idx === 0 ? 254 : 252, idx === 0 ? 250 : 252, idx === 0 ? 240 : 252);
      doc.roundedRect(14, currentY, 182, 35, 2, 2, 'F');
      doc.setFontSize(9); doc.setTextColor(100); doc.text(`TRANSACTION STEP ${idx + 1}`, 18, currentY + 8);
      doc.text(format(new Date(h.createdAt), 'dd MMM yyyy HH:mm'), 150, currentY + 8);
      doc.setFontSize(11); doc.setTextColor(0);
      doc.text(idx === 0 ? 'Initial Logging' : 'Wage Payment Release', 18, currentY + 18);
      doc.text(`Paid: RS ${h.paidAmountNow.toLocaleString()}`, 18, currentY + 28);
      doc.setTextColor(220, 38, 38);
      doc.text(`Due: RS ${h.remainingAmount.toLocaleString()}`, 100, currentY + 28);
      currentY += 40;
    });

    doc.save(`Worker_Audit_${original.workerName.replace(/\s+/g,'_')}.pdf`);
  };

  if (isLoading) return <div className="p-10 text-center font-bold text-gray-400">Fetching audit logs...</div>;

  const original = history[0];
  const latest = history[history.length - 1];

  return (
    <div className="space-y-6 pb-20 p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2.5 bg-card border border-border rounded-2xl shadow-sm text-muted-foreground hover:bg-card-secondary active:scale-95 transition-all">
            <ArrowLeft size={18}/>
          </button>
          <div className="text-left">
            <h2 className="text-lg font-black text-foreground tracking-tight text-left italic font-mono uppercase">Labour Audit Log</h2>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest text-left">{original.workerName} • {original.workType}</p>
          </div>
        </div>
        <button onClick={generatePDF} className="p-3 bg-orange-600 text-white rounded-2xl shadow-lg active:scale-95 transition-all hover:brightness-110 tracking-widest uppercase font-black text-[10px]">
          <Download size={20}/>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Wages', value: latest.totalAmount, color: 'text-foreground' },
          { label: 'Total Settled', value: latest.totalPaidAmount, color: 'text-green-500' },
          { label: 'Pending Balance', value: latest.remainingAmount, color: 'text-red-500' }
        ].map((s, i) => (
          <div key={i} className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm border-b-4 border-b-orange-500/10 text-left relative overflow-hidden">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 text-left">{s.label}</p>
            <p className={`text-2xl font-black ${s.color} font-mono mt-1 text-left italic tracking-tighter`}>₹{s.value.toLocaleString()}</p>
            <IndianRupee size={48} className="absolute -right-2 -bottom-2 opacity-[0.03] rotate-12" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] text-center opacity-50 py-4">Wage Disbursement History</p>
        <div className="space-y-6 relative before:absolute before:left-6 before:top-0 before:bottom-0 before:w-0.5 before:bg-border">
           {history.map((h, i) => (
             <motion.div key={h.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="relative pl-12 group/item">
                <div className={`absolute left-[21px] top-4 w-3 h-3 rounded-full border-2 border-background z-10 transition-transform group-hover/item:scale-125 ${i === 0 ? 'bg-orange-200' : 'bg-orange-600 shadow-md animate-bounce'}`} />
                <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden hover:border-orange-500/30 transition-all">
                   <div className={`px-6 py-3.5 flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${i === 0 ? 'bg-orange-500/10 text-orange-500' : 'bg-orange-500/5 text-orange-400'}`}>
                      <span>{i === 0 ? 'Initial Log' : `Disbursement ${i + 1}`}</span>
                      <span className="font-mono">{format(new Date(h.createdAt), 'dd MMM yyyy')}</span>
                   </div>
                   <div className="p-6">
                      <div className="flex justify-between items-center bg-card-secondary/50 p-5 rounded-[2rem] border border-border/50">
                         <div className="text-left">
                            <p className="text-[8px] font-black text-muted-foreground uppercase mb-1 tracking-widest text-left">Paid Now</p>
                            <p className="text-xl font-black text-foreground font-mono italic">₹{h.paidAmountNow.toLocaleString()}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[8px] font-black text-muted-foreground uppercase mb-1 tracking-widest text-right">Remaining Due</p>
                            <p className="text-xl font-black text-red-500 font-mono italic text-right">₹{h.remainingAmount.toLocaleString()}</p>
                         </div>
                      </div>
                      {h.description && (
                         <div className="mt-4 flex gap-3 items-start px-4 py-3 bg-muted/20 rounded-2xl border border-border/50">
                            <FileText size={14} className="mt-0.5 text-muted-foreground/30"/>
                            <p className="text-xs text-muted-foreground leading-relaxed italic text-left">{h.description}</p>
                         </div>
                      )}
                   </div>
                </div>
             </motion.div>
           ))}
        </div>
      </div>
    </div>
  );
}
