import { describe, it, expect } from 'vitest';
import { filtereGruppierteTagDefinitionen } from '@/lib/vocal-tag/tag-gruppierung';
import type {
  GruppierteTagDefinitionen,
  TagDefinitionData,
  TagKategorieData,
} from '@/types/vocal-tag';

function makeTag(overrides: Partial<TagDefinitionData> = {}): TagDefinitionData {
  return {
    id: 'tag-1',
    tag: 'belting',
    label: 'Belting',
    icon: '🎤',
    color: '#ff0000',
    indexNr: 0,
    categoryId: null,
    ...overrides,
  };
}

function makeKategorie(overrides: Partial<TagKategorieData> = {}): TagKategorieData {
  return {
    id: 'kat-1',
    title: 'Technik',
    slug: 'technik',
    orderIndex: 0,
    ...overrides,
  };
}

describe('filtereGruppierteTagDefinitionen', () => {
  it('should return all groups when search term is empty', () => {
    const gruppen: GruppierteTagDefinitionen[] = [
      {
        kategorie: makeKategorie(),
        tags: [makeTag({ tag: 'belting', label: 'Belting' })],
      },
    ];

    const result = filtereGruppierteTagDefinitionen(gruppen, '');
    expect(result).toHaveLength(1);
    expect(result[0].tags).toHaveLength(1);
  });

  it('should filter tags by tag field (case-insensitive)', () => {
    const gruppen: GruppierteTagDefinitionen[] = [
      {
        kategorie: makeKategorie(),
        tags: [
          makeTag({ id: '1', tag: 'belting', label: 'Belting' }),
          makeTag({ id: '2', tag: 'falsett', label: 'Falsett' }),
        ],
      },
    ];

    const result = filtereGruppierteTagDefinitionen(gruppen, 'BELT');
    expect(result).toHaveLength(1);
    expect(result[0].tags).toHaveLength(1);
    expect(result[0].tags[0].tag).toBe('belting');
  });

  it('should filter tags by label field (case-insensitive)', () => {
    const gruppen: GruppierteTagDefinitionen[] = [
      {
        kategorie: makeKategorie(),
        tags: [
          makeTag({ id: '1', tag: 'belt', label: 'Belting-Technik' }),
          makeTag({ id: '2', tag: 'fals', label: 'Falsett' }),
        ],
      },
    ];

    const result = filtereGruppierteTagDefinitionen(gruppen, 'technik');
    expect(result).toHaveLength(1);
    expect(result[0].tags).toHaveLength(1);
    expect(result[0].tags[0].tag).toBe('belt');
  });

  it('should remove groups that become empty after filtering', () => {
    const kat1 = makeKategorie({ id: 'kat-1', title: 'Technik' });
    const kat2 = makeKategorie({ id: 'kat-2', title: 'Emotion' });

    const gruppen: GruppierteTagDefinitionen[] = [
      {
        kategorie: kat1,
        tags: [makeTag({ id: '1', tag: 'belting', label: 'Belting', categoryId: 'kat-1' })],
      },
      {
        kategorie: kat2,
        tags: [makeTag({ id: '2', tag: 'freude', label: 'Freude', categoryId: 'kat-2' })],
      },
    ];

    const result = filtereGruppierteTagDefinitionen(gruppen, 'belt');
    expect(result).toHaveLength(1);
    expect(result[0].kategorie?.title).toBe('Technik');
  });

  it('should return empty array when no tags match', () => {
    const gruppen: GruppierteTagDefinitionen[] = [
      {
        kategorie: makeKategorie(),
        tags: [makeTag({ tag: 'belting', label: 'Belting' })],
      },
    ];

    const result = filtereGruppierteTagDefinitionen(gruppen, 'xyz');
    expect(result).toHaveLength(0);
  });

  it('should handle groups with kategorie: null', () => {
    const gruppen: GruppierteTagDefinitionen[] = [
      {
        kategorie: null,
        tags: [
          makeTag({ id: '1', tag: 'belting', label: 'Belting' }),
          makeTag({ id: '2', tag: 'falsett', label: 'Falsett' }),
        ],
      },
    ];

    const result = filtereGruppierteTagDefinitionen(gruppen, 'fals');
    expect(result).toHaveLength(1);
    expect(result[0].kategorie).toBeNull();
    expect(result[0].tags).toHaveLength(1);
    expect(result[0].tags[0].tag).toBe('falsett');
  });

  it('should match partial strings', () => {
    const gruppen: GruppierteTagDefinitionen[] = [
      {
        kategorie: makeKategorie(),
        tags: [makeTag({ tag: 'belting', label: 'Belting-Technik' })],
      },
    ];

    const result = filtereGruppierteTagDefinitionen(gruppen, 'elt');
    expect(result).toHaveLength(1);
    expect(result[0].tags).toHaveLength(1);
  });

  it('should handle empty groups input', () => {
    const result = filtereGruppierteTagDefinitionen([], 'test');
    expect(result).toHaveLength(0);
  });
});
