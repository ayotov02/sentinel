import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { getCollaborationToken } from '@/lib/api';

interface CollaborationState {
  doc: Y.Doc | null;
  connected: boolean;
  error: string | null;
}

export function useCollaboration(docId: string | null) {
  const [state, setState] = useState<CollaborationState>({
    doc: null,
    connected: false,
    error: null,
  });
  const docRef = useRef<Y.Doc | null>(null);

  useEffect(() => {
    if (!docId) return;

    const doc = new Y.Doc();
    docRef.current = doc;

    async function connect() {
      try {
        const tokenData = await getCollaborationToken(docId!);
        // In production, would connect to Y-Sweet with the token
        // For now, create local doc
        setState({ doc, connected: true, error: null });
      } catch (err) {
        setState({ doc, connected: false, error: String(err) });
      }
    }

    connect();

    return () => {
      doc.destroy();
      docRef.current = null;
      setState({ doc: null, connected: false, error: null });
    };
  }, [docId]);

  return state;
}
