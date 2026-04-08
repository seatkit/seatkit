/**
 * Presence Zustand store
 * Tracks connected staff and their current reservation/state.
 */
import { create } from 'zustand';

import type { PresenceEntry } from '../lib/api-types.js';

type PresenceStore = {
	/** All currently active presence entries, keyed by sessionId */
	entries: Record<string, PresenceEntry>;
	/** Replace all entries (called when server sends a presence-update broadcast) */
	setEntries: (entries: PresenceEntry[]) => void;
	/** Clear all entries (e.g., on disconnect) */
	clearEntries: () => void;
};

export const usePresenceStore = create<PresenceStore>((set) => ({
	entries: {},
	setEntries: (entries: PresenceEntry[]) => {
		const map: Record<string, PresenceEntry> = {};
		for (const entry of entries) {
			map[entry.sessionId] = entry;
		}
		set({ entries: map });
	},
	clearEntries: () => set({ entries: {} }),
}));
