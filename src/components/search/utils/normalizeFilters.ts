import { FilterFormData, NormalizedParams } from '../types';

export function normalizeFilters(
  values: FilterFormData,
  pagination = { limit_count: 20, offset_count: 0 }
): NormalizedParams {
  return {
    q: values.q?.length ? values.q : null,
    locations: values.locations && values.locations.length ? values.locations : null,
    visa: values.visa ?? 'any',
    stacks: values.stacks && values.stacks.length 
      ? values.stacks.map(s => s.toLowerCase()).filter((v, i, a) => a.indexOf(v) === i) // dedupe
      : null,
    ...pagination,
  };
}