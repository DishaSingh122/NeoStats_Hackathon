import React from 'react';
import { AlertCircle, RefreshCw, GitCompare } from 'lucide-react';
import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';
import { StatusBadge } from './StatusBadge.jsx';

export const ConflictModal = ({
  isOpen,
  onClose,
  latestTask,
  attemptedData,
  onReloadLatest,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Concurrent Edit Conflict Detected (HTTP 409)"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">Another team member modified this task while you were editing it.</p>
            <p className="mt-1 text-xs text-amber-700 leading-relaxed">
              To prevent accidental data loss, your changes were not applied. Review the latest saved values below before deciding to re-apply your changes.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-200">
            <span className="flex items-center">
              <GitCompare className="w-4 h-4 mr-1 text-indigo-500" /> Comparison
            </span>
            <span>Current DB Version: v{latestTask?.version || '?'}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-white rounded border border-slate-200 space-y-2">
              <span className="font-semibold text-slate-500 block uppercase">Latest Saved Values</span>
              <div>
                <span className="text-slate-400 block text-[10px]">Title:</span>
                <p className="font-medium text-slate-800">{latestTask?.title || '-'}</p>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Status:</span>
                <StatusBadge type={latestTask?.status} />
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Priority:</span>
                <StatusBadge type={latestTask?.priority} />
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Assignee:</span>
                <p className="font-medium text-slate-800">{latestTask?.assignedTo?.name || 'Unassigned'}</p>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/50 rounded border border-indigo-200 space-y-2">
              <span className="font-semibold text-indigo-700 block uppercase">Your Unsaved Edits</span>
              <div>
                <span className="text-slate-400 block text-[10px]">Title:</span>
                <p className="font-medium text-slate-800">{attemptedData?.title || latestTask?.title || '-'}</p>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Status:</span>
                <StatusBadge type={attemptedData?.status || latestTask?.status} />
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Priority:</span>
                <StatusBadge type={attemptedData?.priority || latestTask?.priority} />
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Assignee:</span>
                <p className="font-medium text-slate-800">
                  {attemptedData?.assigneeName || 'Keep Existing'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>
            Keep My Local Draft
          </Button>
          <Button
            variant="primary"
            icon={RefreshCw}
            onClick={() => {
              onReloadLatest(latestTask);
              onClose();
            }}
          >
            Load Latest Data (Recommended)
          </Button>
        </div>
      </div>
    </Modal>
  );
};
