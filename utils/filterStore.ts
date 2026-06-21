type FilterState = {
  options: string[];
  amenities: string[];
  serviceTypes: string[];
  onChange?: () => void;
};

const store: FilterState = { options: [], amenities: [], serviceTypes: [] };

export const filterStore = {
  get: () => ({ options: store.options, amenities: store.amenities, serviceTypes: store.serviceTypes }),
  setOptions: (v: string[]) => {
    console.log('[FilterStore] setOptions:', v);
    store.options = v;
    store.onChange?.();
  },
  setAmenities: (v: string[]) => {
    console.log('[FilterStore] setAmenities:', v);
    store.amenities = v;
    store.onChange?.();
  },
  setServiceTypes: (v: string[]) => {
    console.log('[FilterStore] setServiceTypes:', v);
    store.serviceTypes = v;
    store.onChange?.();
  },
  subscribe: (fn: () => void) => {
    store.onChange = fn;
    return () => { store.onChange = undefined; };
  },
};
