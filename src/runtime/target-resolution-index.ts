interface ResolutionEntry<T> {
  target: string;
  value: T;
}

/**
 * Caches target resolution by stable Dock item ID and configured target value.
 * Null/missing resolutions are cached as normal values so repeated geometry
 * refreshes do not repeatedly query the vault/link resolver.
 */
export class TargetResolutionIndex<T> {
  private readonly entries = new Map<string, ResolutionEntry<T>>();

  resolve(itemId: string, target: string, resolver: (target: string) => T): T {
    const cached = this.entries.get(itemId);
    if (cached && cached.target === target) return cached.value;

    const value = resolver(target);
    this.entries.set(itemId, { target, value });
    return value;
  }

  invalidateItem(itemId: string): void {
    this.entries.delete(itemId);
  }

  invalidateAll(): void {
    this.entries.clear();
  }

  invalidateWhere(predicate: (itemId: string, target: string, value: T) => boolean): void {
    for (const [itemId, entry] of this.entries) {
      if (predicate(itemId, entry.target, entry.value)) this.entries.delete(itemId);
    }
  }

  get size(): number {
    return this.entries.size;
  }
}
