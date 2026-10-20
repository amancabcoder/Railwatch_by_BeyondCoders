import React from 'react';
import { InspectionWorkOrder } from '../types';
import { FileText, Send, CheckCircle2, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';

interface WorkOrdersListProps {
  orders: InspectionWorkOrder[];
}

export const WorkOrdersList: React.FC<WorkOrdersListProps> = ({ orders }) => {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      
      {/* Header */}
      <div className="bg-[#1C2541] p-6 rounded-2xl border border-[#3A506B]/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-sky-400 font-mono text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Maintenance & Safety Operations
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Field Execution
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Dispatched Track Inspection Work Orders</h1>
          <p className="text-sm text-slate-300 max-w-2xl mt-1">
            When fused satellite, weather, and verified TinyFish intelligence exceeds risk thresholds, official P-Way inspection orders are automatically formatted and assigned to Delhi Division field squads.
          </p>
        </div>

        <div className="bg-[#0B132B] px-4 py-3 rounded-xl border border-[#3A506B]/40 text-center">
          <span className="text-xs text-slate-400 block">Active Tickets</span>
          <span className="text-2xl font-black text-sky-400">{orders.length}</span>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-[#1C2541] p-5 rounded-2xl border border-[#3A506B]/50 hover:border-sky-500/50 transition shadow-xl space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  {order.id}
                </span>
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                  order.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {order.priority} PRIORITY
                </span>
              </div>

              <div>
                <h3 className="font-bold text-white text-base leading-snug">{order.segment_name}</h3>
                <p className="text-xs font-mono text-emerald-400 mt-0.5">Corridor: {order.segment_id}</p>
              </div>

              <div className="bg-[#0B132B] p-3 rounded-xl border border-[#3A506B]/30 text-xs space-y-1.5">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Trigger Evidence</span>
                <p className="text-slate-200 text-xs leading-relaxed">{order.trigger_reason}</p>
              </div>

              <div className="text-xs text-slate-300 space-y-1 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Squad:</span>
                  <span className="font-medium text-slate-200">{order.assigned_crew}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Scheduled Date:</span>
                  <span>{new Date(order.scheduled_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#3A506B]/30 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> {order.status}
              </span>
              <span className="text-[11px] text-slate-400">P-Way Northern Rly</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

