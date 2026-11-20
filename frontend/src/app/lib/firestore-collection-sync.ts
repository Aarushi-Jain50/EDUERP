import { WritableSignal } from '@angular/core';
import { onAuthStateChanged, Unsubscribe } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { handleFirestoreError, OperationType } from './firestore-errors';

export function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      clean[key] = val.map(item =>
        item && typeof item === 'object' && !Array.isArray(item)
          ? stripUndefined(item as Record<string, unknown>)
          : item
      );
    } else if (val && typeof val === 'object' && !(val instanceof Date)) {
      clean[key] = stripUndefined(val as Record<string, unknown>);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export class FirestoreCollectionSync<T extends { id: string }> {
  private unsubAuth: Unsubscribe | null = null;
  private unsubSnapshot: Unsubscribe | null = null;

  constructor(
    private readonly collectionName: string,
    private readonly storageKey: string,
    private readonly targetSignal: WritableSignal<T[]>,
    private readonly isBrowser: boolean,
    private readonly mergeOrder: 'prepend-new' | 'preserve-order' = 'prepend-new'
  ) {}

  loadInitial(seeds: T[]): T[] {
    if (!this.isBrowser) return seeds;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as T[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore corrupted local cache
    }
    return seeds;
  }

  saveLocal(list: T[]): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(list));
    } catch {
      // ignore storage quota errors
    }
  }

  startSync(): void {
    if (!this.isBrowser) return;

    this.unsubAuth = onAuthStateChanged(auth, user => {
      this.teardownSnapshot();
      if (user?.uid) {
        this.attachSnapshot();
      }
    });

    if (auth.currentUser?.uid) {
      this.attachSnapshot();
    }
  }

  private teardownSnapshot(): void {
    this.unsubSnapshot?.();
    this.unsubSnapshot = null;
  }

  private attachSnapshot(): void {
    this.teardownSnapshot();
    this.unsubSnapshot = onSnapshot(
      collection(db, this.collectionName),
      snapshot => {
        if (snapshot.empty) return;
        this.targetSignal.update(local => {
          const byId = new Map(local.map(item => [item.id, item]));
          for (const d of snapshot.docs) {
            const remote = d.data() as T;
            if (remote?.id) {
              byId.set(remote.id, remote);
            }
          }
          const merged =
            this.mergeOrder === 'prepend-new'
              ? Array.from(byId.values())
              : Array.from(byId.values());
          this.saveLocal(merged);
          return merged;
        });
      },
      error => {
        // Only log cleanly without breaking open-auth preview
        try {
          handleFirestoreError(error, OperationType.LIST, this.collectionName);
        } catch {
          // ignore unauthenticated/permission rejections gracefully in preview
        }
      }
    );
  }

  syncUpsert(item: T): void {
    this.saveLocal(this.targetSignal());
    if (!this.isBrowser) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const payload = stripUndefined({
      ...(item as unknown as Record<string, unknown>),
      id: item.id,
      ownerUid: uid,
      updatedAt: new Date().toISOString()
    });

    void setDoc(doc(db, this.collectionName, item.id), payload, { merge: true }).catch(err => {
      try {
        handleFirestoreError(err, OperationType.WRITE, `${this.collectionName}/${item.id}`);
      } catch {
        // keep localStorage state active
      }
    });
  }

  syncDelete(id: string): void {
    this.saveLocal(this.targetSignal());
    if (!this.isBrowser) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    void deleteDoc(doc(db, this.collectionName, id)).catch(err => {
      try {
        handleFirestoreError(err, OperationType.DELETE, `${this.collectionName}/${id}`);
      } catch {
        // keep localStorage state active
      }
    });
  }

  destroy(): void {
    this.teardownSnapshot();
    this.unsubAuth?.();
    this.unsubAuth = null;
  }
}
