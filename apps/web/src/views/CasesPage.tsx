import { useState } from 'react';
import { CaseList } from '@/components/cases/CaseList';
import { CaseDetail } from '@/components/cases/CaseDetail';
import { CaseCreateModal } from '@/components/cases/CaseCreateModal';

export default function CasesPage() {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  if (selectedCaseId) {
    return <CaseDetail caseId={selectedCaseId} onBack={() => setSelectedCaseId(null)} />;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <CaseList onSelect={setSelectedCaseId} onCreateNew={() => setCreateModalOpen(true)} />
      <CaseCreateModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
    </div>
  );
}
