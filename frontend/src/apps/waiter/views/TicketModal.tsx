import { useState, useEffect } from 'react';
import { X, Printer, Mail, FileText, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../../../api/client';

interface TicketModalProps {
  orderId: string;
  onClose: () => void;
}

export default function TicketModal({ orderId, onClose }: TicketModalProps) {
  const [ticketText, setTicketText] = useState<string>('Generando ticket...');
  const [isGeneratingCFDI, setIsGeneratingCFDI] = useState(false);
  const [cfdiResult, setCfdiResult] = useState<{ uuid: string; pdfUrl: string } | null>(null);

  useEffect(() => {
    async function fetchTicket() {
      try {
        const res = await apiClient.get(`/payments/orders/${orderId}/ticket`);
        setTicketText(res.data.ticket_text);
      } catch (err) {
        console.error('Error fetching ticket', err);
        setTicketText('Error al cargar el ticket.');
      }
    }
    fetchTicket();
  }, [orderId]);

  const handlePrint = () => {
    // En una app real, aquí se envía comando a la impresora ESC/POS o se imprime pantalla
    window.print();
  };

  const handleDownloadPDF = () => {
    const url = `${apiClient.defaults.baseURL}/payments/orders/${orderId}/ticket/pdf`;
    window.open(url, '_blank');
  };

  const handleGenerateCFDI = async () => {
    setIsGeneratingCFDI(true);
    try {
      const res = await apiClient.post(`/payments/invoices/${orderId}/cfdi`);
      setCfdiResult({ uuid: res.data.uuid_sat, pdfUrl: res.data.pdf_url });
    } catch (err) {
      console.error(err);
      alert('Error al simular CFDI');
    }
    setIsGeneratingCFDI(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-slate-100 dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col print:shadow-none print:bg-white print:max-w-none print:m-0 print:p-0 animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 bg-white dark:bg-slate-800 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 print:hidden">
          <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="text-emerald-500" /> Pago Exitoso
          </h2>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* CONTENIDO DEL TICKET */}
        <div className="p-6 overflow-y-auto max-h-[60vh] print:max-h-none print:p-0 flex justify-center bg-slate-100 dark:bg-slate-900">
          <div className="bg-white p-6 shadow-sm border border-slate-200 mx-auto w-full max-w-[320px] print:shadow-none print:border-none print:p-0 font-mono text-[11px] leading-tight text-black whitespace-pre">
            {ticketText}
          </div>
        </div>

        {/* ACCIONES */}
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 space-y-3 print:hidden">
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={handlePrint}
              className="py-3 flex flex-col items-center justify-center gap-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors text-[10px]"
            >
              <Printer size={16} /> Imprimir
            </button>
            <button 
              onClick={handleDownloadPDF}
              className="py-3 flex flex-col items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-[10px]"
            >
              <FileText size={16} /> PDF
            </button>
            <button className="py-3 flex flex-col items-center justify-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-xl transition-colors text-[10px]">
              <Mail size={16} /> Email
            </button>
          </div>

          {!cfdiResult ? (
            <button 
              onClick={handleGenerateCFDI}
              disabled={isGeneratingCFDI}
              className="w-full py-3 flex items-center justify-center gap-2 border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              <FileText size={18} /> 
              {isGeneratingCFDI ? 'Timbrando con SAT...' : 'Generar Factura (CFDI)'}
            </button>
          ) : (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center animate-in slide-in-from-top">
              <div className="text-emerald-700 dark:text-emerald-400 font-bold text-sm mb-1">¡CFDI Generado!</div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-500 break-all">{cfdiResult.uuid}</div>
              <div className="flex justify-center gap-2 mt-2">
                <a href={cfdiResult.pdfUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded">Descargar PDF</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
