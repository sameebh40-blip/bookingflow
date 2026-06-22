import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronRight,
  Plus,
  X,
  ArrowLeft,
  MoreVertical,
  SlidersHorizontal,
  LayoutGrid,
  CreditCard,
  Package,
  ClipboardList,
  Truck,
  Users,
  MessageCircle,
  Bell,
  Search,
} from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

const P = {
  bg: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceElevated: '#242438',
  border: '#2A2A45',
  accent: '#7C3AED',
  accentLight: 'rgba(124,58,237,0.15)',
  gold: '#C9A84C',
  text: '#F0F0FF',
  textSecondary: '#9090B0',
  textTertiary: '#5A5A7A',
  success: '#4CAF7D',
  danger: '#E85454',
  warning: '#F59E0B',
  divider: '#1E1E35',
};

type Screen = 'home' | 'services' | 'memberships' | 'products' | 'stocktakes' | 'stock-orders' | 'suppliers';

interface Service {
  id: string;
  name: string;
  price_bhd: number;
  duration_minutes: number;
  category: string;
  is_active: boolean;
  shop_id: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price_bhd?: number;
  stock?: number;
  image_url?: string;
  shop_id: string;
}

interface Barber {
  id: string;
  name: string;
  avatar_url?: string;
}

const DEMO_SERVICES: Service[] = [
  { id: 'ds1', name: 'Haircut', duration_minutes: 45, price_bhd: 5, category: 'Hair & styling', is_active: true, shop_id: '' },
  { id: 'ds2', name: 'Hair Color', duration_minutes: 75, price_bhd: 12, category: 'Hair & styling', is_active: true, shop_id: '' },
  { id: 'ds3', name: 'Beard Trim', duration_minutes: 30, price_bhd: 3, category: 'Beard', is_active: true, shop_id: '' },
  { id: 'ds4', name: 'Haircut + Beard', duration_minutes: 60, price_bhd: 8, category: 'Beard', is_active: true, shop_id: '' },
];

const TREATMENT_TYPES = ['Haircut', 'Color', 'Beard', 'Facial', 'Massage', 'Nails', 'Other'];
const DEFAULT_CATEGORIES = ['Hair & styling', 'Beard', 'Color', 'Facial', 'Other'];

type ServiceTab = 'basic' | 'team' | 'resources';

interface ServiceForm {
  name: string;
  category: string;
  treatmentType: string;
  description: string;
  hours: string;
  minutes: string;
  price: string;
  deposit: boolean;
  onlineBooking: boolean;
}

const emptyServiceForm: ServiceForm = {
  name: '',
  category: '',
  treatmentType: '',
  description: '',
  hours: '0',
  minutes: '30',
  price: '',
  deposit: false,
  onlineBooking: true,
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h} hr, ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
}

function formatPrice(price: number): string {
  return `BHD ${Number(price).toFixed(3)}`;
}

export default function PartnerCatalog() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const shopId = profile?.shop_id ?? '';

  const [screen, setScreen] = useState<Screen>('home');
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Sheets
  const [showAddTypeSheet, setShowAddTypeSheet] = useState(false);
  const [showServiceSheet, setShowServiceSheet] = useState(false);
  const [showBundleSheet, setShowBundleSheet] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showProductSheet, setShowProductSheet] = useState(false);
  const [showMembershipSheet, setShowMembershipSheet] = useState(false);

  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceTab, setServiceTab] = useState<ServiceTab>('basic');
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyServiceForm);
  const [saving, setSaving] = useState(false);

  // Bundle form
  const [bundleName, setBundleName] = useState('');
  const [bundlePrice, setBundlePrice] = useState('');
  const [bundleSelected, setBundleSelected] = useState<string[]>([]);

  // Category form
  const [newCategoryName, setNewCategoryName] = useState('');

  // Product form
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', stock: '' });

  // Membership form
  const [membershipForm, setMembershipForm] = useState({ name: '', price: '', duration: '', description: '' });

  // Barber toggles for service
  const [barberToggles, setBarberToggles] = useState<Record<string, boolean>>({});

  const fetchServices = useCallback(async () => {
    console.log('[Catalog] fetchServices called, shopId:', shopId);
    setLoading(true);
    try {
      if (!shopId) {
        setServices(DEMO_SERVICES);
        return;
      }
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('category')
        .order('name');
      console.log('[Catalog] fetchServices result:', data?.length, 'services, error:', error?.message);
      setServices((data as Service[]) ?? DEMO_SERVICES);
    } catch (err) {
      console.log('[Catalog] fetchServices error:', err);
      setServices(DEMO_SERVICES);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  const fetchProducts = useCallback(async () => {
    console.log('[Catalog] fetchProducts called, shopId:', shopId);
    if (!shopId) return;
    try {
      const { data, error } = await supabase.from('products').select('*').eq('shop_id', shopId);
      console.log('[Catalog] fetchProducts result:', data?.length, 'products, error:', error?.message);
      setProducts((data as Product[]) ?? []);
    } catch (err) {
      console.log('[Catalog] fetchProducts error:', err);
    }
  }, [shopId]);

  const fetchBarbers = useCallback(async () => {
    if (!shopId) return;
    try {
      const { data } = await supabase.from('barbers').select('id, name:display_name, avatar_url').eq('shop_id', shopId);
      setBarbers((data as Barber[]) ?? []);
    } catch (err) {
      console.log('[Catalog] fetchBarbers error:', err);
    }
  }, [shopId]);

  useEffect(() => {
    fetchServices();
    fetchBarbers();
  }, [fetchServices, fetchBarbers]);

  useEffect(() => {
    if (screen === 'products') fetchProducts();
  }, [screen, fetchProducts]);

  // Derive unique categories from services
  const uniqueCategories = Array.from(new Set(services.map(s => s.category).filter(Boolean)));

  const filteredServices = services.filter(s => {
    const matchesSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const groupedServices = uniqueCategories.reduce((acc, cat) => {
    const items = filteredServices.filter(s => s.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<string, Service[]>);

  const openServiceSheet = (service: Service | null) => {
    console.log('[Catalog] openServiceSheet, editing:', service?.id ?? 'new');
    setEditingService(service);
    if (service) {
      const h = Math.floor(service.duration_minutes / 60);
      const m = service.duration_minutes % 60;
      setServiceForm({
        name: service.name,
        category: service.category,
        treatmentType: '',
        description: '',
        hours: String(h),
        minutes: String(m),
        price: String(service.price_bhd),
        deposit: false,
        onlineBooking: true,
      });
    } else {
      setServiceForm(emptyServiceForm);
    }
    setServiceTab('basic');
    setShowServiceSheet(true);
  };

  const saveService = async () => {
    if (!serviceForm.name) return;
    console.log('[Catalog] saveService pressed, name:', serviceForm.name, 'shopId:', shopId);
    setSaving(true);
    try {
      const durationMinutes = parseInt(serviceForm.hours || '0') * 60 + parseInt(serviceForm.minutes || '0');
      const payload = {
        shop_id: shopId || undefined,
        name: serviceForm.name,
        category: serviceForm.category || 'Other',
        duration_minutes: durationMinutes,
        price_bhd: parseFloat(serviceForm.price) || 0,
        is_active: true,
        active: true,
        owner_type: 'shop',
        owner_id: shopId || undefined,
      };
      if (editingService) {
        const { error } = await supabase.from('services').update(payload).eq('id', editingService.id);
        console.log('[Catalog] update service result, error:', error?.message);
      } else {
        const { error } = await supabase.from('services').upsert({ ...payload, id: undefined });
        console.log('[Catalog] insert service result, error:', error?.message);
      }
      await fetchServices();
      setShowServiceSheet(false);
    } catch (err) {
      console.log('[Catalog] saveService error:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (id: string) => {
    console.log('[Catalog] deleteService pressed, id:', id);
    Alert.alert('Delete Service', 'Are you sure you want to delete this service?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('services').update({ is_active: false }).eq('id', id);
          console.log('[Catalog] deleteService result, error:', error?.message);
          await fetchServices();
        }
      },
    ]);
  };

  const saveBundle = async () => {
    if (!bundleName) return;
    console.log('[Catalog] saveBundle pressed, name:', bundleName, 'price:', bundlePrice);
    setSaving(true);
    try {
      const { error } = await supabase.from('services').insert({
        shop_id: shopId || undefined,
        name: bundleName,
        category: 'Bundle',
        duration_minutes: 60,
        price_bhd: parseFloat(bundlePrice) || 0,
        is_active: true,
      });
      console.log('[Catalog] saveBundle result, error:', error?.message);
      await fetchServices();
      setShowBundleSheet(false);
      setBundleName('');
      setBundlePrice('');
      setBundleSelected([]);
    } catch (err) {
      console.log('[Catalog] saveBundle error:', err);
    } finally {
      setSaving(false);
    }
  };

  const saveCategory = () => {
    if (!newCategoryName.trim()) return;
    console.log('[Catalog] saveCategory pressed, name:', newCategoryName);
    setCategories(prev => [...prev, newCategoryName.trim()]);
    setNewCategoryName('');
    setShowCategorySheet(false);
  };

  const saveProduct = async () => {
    if (!productForm.name) return;
    console.log('[Catalog] saveProduct pressed, name:', productForm.name);
    setSaving(true);
    try {
      const { error } = await supabase.from('products').insert({
        shop_id: shopId || undefined,
        name: productForm.name,
        description: productForm.description,
        price_bhd: parseFloat(productForm.price) || 0,
        stock: parseInt(productForm.stock) || 0,
      });
      console.log('[Catalog] saveProduct result, error:', error?.message);
      await fetchProducts();
      setShowProductSheet(false);
      setProductForm({ name: '', description: '', price: '', stock: '' });
    } catch (err) {
      console.log('[Catalog] saveProduct error:', err);
    } finally {
      setSaving(false);
    }
  };

  const saveMembership = () => {
    console.log('[Catalog] saveMembership pressed, name:', membershipForm.name);
    Alert.alert('Coming Soon', 'Memberships will be available soon.');
    setShowMembershipSheet(false);
  };

  // ─── HOME SCREEN ───────────────────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Catalog</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIcon} onPress={() => console.log('[Catalog] Chat icon pressed')}>
              <MessageCircle size={20} color={P.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIcon} onPress={() => console.log('[Catalog] Bell icon pressed')}>
              <Bell size={20} color={P.textSecondary} />
            </TouchableOpacity>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{profile?.full_name?.charAt(0) ?? 'U'}</Text>
            </View>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Main section */}
          <View style={styles.section}>
            <HomeRow
              icon={<LayoutGrid size={18} color={P.accent} />}
              label="Service menu"
              onPress={() => { console.log('[Catalog] Service menu pressed'); setScreen('services'); }}
            />
            <View style={styles.rowDivider} />
            <HomeRow
              icon={<CreditCard size={18} color={P.gold} />}
              label="Memberships"
              onPress={() => { console.log('[Catalog] Memberships pressed'); setScreen('memberships'); }}
              iconBg="rgba(201,168,76,0.15)"
            />
            <View style={styles.rowDivider} />
            <HomeRow
              icon={<Package size={18} color={P.success} />}
              label="Products"
              onPress={() => { console.log('[Catalog] Products pressed'); setScreen('products'); }}
              iconBg="rgba(76,175,125,0.15)"
            />
          </View>

          {/* Inventory section */}
          <Text style={styles.sectionHeader}>Inventory</Text>
          <View style={styles.section}>
            <HomeRow
              icon={<ClipboardList size={18} color={P.warning} />}
              label="Stocktakes"
              onPress={() => { console.log('[Catalog] Stocktakes pressed'); setScreen('stocktakes'); }}
              iconBg="rgba(245,158,11,0.15)"
            />
            <View style={styles.rowDivider} />
            <HomeRow
              icon={<Truck size={18} color="#60A5FA" />}
              label="Stock orders"
              onPress={() => { console.log('[Catalog] Stock orders pressed'); setScreen('stock-orders'); }}
              iconBg="rgba(96,165,250,0.15)"
            />
            <View style={styles.rowDivider} />
            <HomeRow
              icon={<Users size={18} color="#F472B6" />}
              label="Suppliers"
              onPress={() => { console.log('[Catalog] Suppliers pressed'); setScreen('suppliers'); }}
              iconBg="rgba(244,114,182,0.15)"
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── SERVICES SCREEN ───────────────────────────────────────────────────────
  if (screen === 'services') {
    const allCount = services.length;
    const catCounts = uniqueCategories.reduce((acc, c) => {
      acc[c] = services.filter(s => s.category === c).length;
      return acc;
    }, {} as Record<string, number>);

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { console.log('[Catalog] Back from services'); setScreen('home'); }} style={styles.backBtn}>
            <ArrowLeft size={20} color={P.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.headerIcon} onPress={() => console.log('[Catalog] Services menu pressed')}>
            <MoreVertical size={20} color={P.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => { console.log('[Catalog] Add button pressed'); setShowAddTypeSheet(true); }}
          >
            <Plus size={14} color="#fff" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={styles.screenTitle}>Service menu</Text>
          <Text style={styles.screenSubtitle}>View and manage the services offered by your business.</Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Search size={16} color={P.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search service name"
            placeholderTextColor={P.textTertiary}
            value={searchQuery}
            onChangeText={v => { console.log('[Catalog] Search query changed:', v); setSearchQuery(v); }}
          />
          <TouchableOpacity onPress={() => console.log('[Catalog] Filter icon pressed')}>
            <SlidersHorizontal size={16} color={P.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          <TouchableOpacity
            style={[styles.chip, selectedCategory === 'all' && styles.chipActive]}
            onPress={() => { console.log('[Catalog] Category chip pressed: all'); setSelectedCategory('all'); }}
          >
            <Text style={[styles.chipText, selectedCategory === 'all' && styles.chipTextActive]}>
              All categories {allCount}
            </Text>
          </TouchableOpacity>
          {uniqueCategories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selectedCategory === cat && styles.chipActive]}
              onPress={() => { console.log('[Catalog] Category chip pressed:', cat); setSelectedCategory(cat); }}
            >
              <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
                {cat} {catCounts[cat]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.loadingWrap}><ActivityIndicator color={P.accent} /></View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
            {Object.keys(groupedServices).length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No services yet</Text>
                <Text style={styles.emptySub}>Tap + Add to create your first service</Text>
              </View>
            ) : (
              Object.entries(groupedServices).map(([cat, items]) => (
                <View key={cat} style={{ marginBottom: 20 }}>
                  <View style={styles.catHeader}>
                    <Text style={styles.catLabel}>{cat}</Text>
                    <TouchableOpacity onPress={() => console.log('[Catalog] Category menu pressed:', cat)}>
                      <MoreVertical size={16} color={P.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.serviceGroup}>
                    {items.map((s, idx) => {
                      const priceText = formatPrice(s.price_bhd);
                      const durationText = formatDuration(s.duration_minutes);
                      return (
                        <View key={s.id}>
                          {idx > 0 && <View style={styles.rowDivider} />}
                          <View style={styles.serviceRow}>
                            <View style={styles.serviceBorder} />
                            <View style={{ flex: 1, paddingLeft: 12 }}>
                              <Text style={styles.serviceName}>{s.name}</Text>
                              <Text style={styles.serviceMeta}>{durationText}</Text>
                              <Text style={styles.serviceMeta}>{priceText}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.serviceMenu}
                              onPress={() => {
                                console.log('[Catalog] Service menu pressed:', s.id);
                                Alert.alert(s.name, '', [
                                  { text: 'Edit', onPress: () => openServiceSheet(s) },
                                  { text: 'Delete', style: 'destructive', onPress: () => deleteService(s.id) },
                                  { text: 'Cancel', style: 'cancel' },
                                ]);
                              }}
                            >
                              <MoreVertical size={16} color={P.textSecondary} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* Add type sheet */}
        <Modal visible={showAddTypeSheet} transparent animationType="slide" onRequestClose={() => setShowAddTypeSheet(false)}>
          <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShowAddTypeSheet(false)}>
            <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.sheetHandle} />
              <TouchableOpacity
                style={styles.addTypeRow}
                onPress={() => {
                  console.log('[Catalog] Add type: Single service');
                  setShowAddTypeSheet(false);
                  openServiceSheet(null);
                }}
              >
                <Text style={styles.addTypeText}>Single service</Text>
              </TouchableOpacity>
              <View style={styles.rowDivider} />
              <TouchableOpacity
                style={styles.addTypeRow}
                onPress={() => {
                  console.log('[Catalog] Add type: Bundle');
                  setShowAddTypeSheet(false);
                  setShowBundleSheet(true);
                }}
              >
                <Text style={styles.addTypeText}>Bundle</Text>
              </TouchableOpacity>
              <View style={styles.rowDivider} />
              <TouchableOpacity
                style={styles.addTypeRow}
                onPress={() => {
                  console.log('[Catalog] Add type: Category');
                  setShowAddTypeSheet(false);
                  setShowCategorySheet(true);
                }}
              >
                <Text style={styles.addTypeText}>Category</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Service sheet */}
        <Modal visible={showServiceSheet} animationType="slide" onRequestClose={() => setShowServiceSheet(false)}>
          <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => { console.log('[Catalog] Close service sheet'); setShowServiceSheet(false); }}>
                <X size={20} color={P.text} />
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>{editingService ? 'Edit service' : 'New service'}</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabRow}>
              {(['basic', 'team', 'resources'] as ServiceTab[]).map(tab => {
                const labels: Record<ServiceTab, string> = { basic: 'Basic details', team: 'Team members', resources: 'Resources' };
                const teamCount = barbers.length;
                const label = tab === 'team' ? `Team members ${teamCount}` : labels[tab];
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tabBtn, serviceTab === tab && styles.tabBtnActive]}
                    onPress={() => { console.log('[Catalog] Service tab pressed:', tab); setServiceTab(tab); }}
                  >
                    <Text style={[styles.tabBtnText, serviceTab === tab && styles.tabBtnTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
              {serviceTab === 'basic' && (
                <>
                  <View style={styles.fieldGroup}>
                    <View style={styles.fieldLabelRow}>
                      <Text style={styles.fieldLabel}>Service name</Text>
                      <Text style={styles.charCounter}>{serviceForm.name.length}/255</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Add a service name, e.g. Men's Haircut"
                      placeholderTextColor={P.textTertiary}
                      value={serviceForm.name}
                      onChangeText={v => setServiceForm(f => ({ ...f, name: v.slice(0, 255) }))}
                      maxLength={255}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Menu category</Text>
                    <TouchableOpacity
                      style={styles.dropdownBtn}
                      onPress={() => {
                        console.log('[Catalog] Menu category dropdown pressed');
                        Alert.alert('Select Category', '', [
                          ...categories.map(c => ({ text: c, onPress: () => setServiceForm(f => ({ ...f, category: c })) })),
                          { text: 'Cancel', style: 'cancel' },
                        ]);
                      }}
                    >
                      <Text style={serviceForm.category ? styles.dropdownValue : styles.dropdownPlaceholder}>
                        {serviceForm.category || 'Select category'}
                      </Text>
                      <ChevronRight size={16} color={P.textTertiary} style={{ transform: [{ rotate: '90deg' }] }} />
                    </TouchableOpacity>
                    <Text style={styles.fieldHint}>The category displayed to you, and to clients online</Text>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Treatment type</Text>
                    <TouchableOpacity
                      style={styles.dropdownBtn}
                      onPress={() => {
                        console.log('[Catalog] Treatment type dropdown pressed');
                        Alert.alert('Select Treatment Type', '', [
                          ...TREATMENT_TYPES.map(t => ({ text: t, onPress: () => setServiceForm(f => ({ ...f, treatmentType: t })) })),
                          { text: 'Cancel', style: 'cancel' },
                        ]);
                      }}
                    >
                      <Text style={serviceForm.treatmentType ? styles.dropdownValue : styles.dropdownPlaceholder}>
                        {serviceForm.treatmentType || 'Select treatment type'}
                      </Text>
                      <ChevronRight size={16} color={P.textTertiary} style={{ transform: [{ rotate: '90deg' }] }} />
                    </TouchableOpacity>
                    <Text style={styles.fieldHint}>Used to help clients find your service on the marketplace</Text>
                  </View>

                  <View style={styles.fieldGroup}>
                    <View style={styles.fieldLabelRow}>
                      <Text style={styles.fieldLabel}>Description (Optional)</Text>
                      <Text style={styles.charCounter}>{serviceForm.description.length}/1000</Text>
                    </View>
                    <TextInput
                      style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                      placeholder="Add a short description"
                      placeholderTextColor={P.textTertiary}
                      value={serviceForm.description}
                      onChangeText={v => setServiceForm(f => ({ ...f, description: v.slice(0, 1000) }))}
                      multiline
                      maxLength={1000}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Duration</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          style={styles.input}
                          placeholder="Hours"
                          placeholderTextColor={P.textTertiary}
                          value={serviceForm.hours}
                          onChangeText={v => setServiceForm(f => ({ ...f, hours: v }))}
                          keyboardType="number-pad"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          style={styles.input}
                          placeholder="Minutes"
                          placeholderTextColor={P.textTertiary}
                          value={serviceForm.minutes}
                          onChangeText={v => setServiceForm(f => ({ ...f, minutes: v }))}
                          keyboardType="number-pad"
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Price BHD</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.000"
                      placeholderTextColor={P.textTertiary}
                      value={serviceForm.price}
                      onChangeText={v => setServiceForm(f => ({ ...f, price: v }))}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={styles.toggleRow}>
                    <Text style={styles.fieldLabel}>Deposit</Text>
                    <Switch
                      value={serviceForm.deposit}
                      onValueChange={v => { console.log('[Catalog] Deposit toggle:', v); setServiceForm(f => ({ ...f, deposit: v })); }}
                      trackColor={{ false: P.border, true: P.accent }}
                      thumbColor="#fff"
                    />
                  </View>

                  <View style={styles.toggleRow}>
                    <Text style={styles.fieldLabel}>Online booking</Text>
                    <Switch
                      value={serviceForm.onlineBooking}
                      onValueChange={v => { console.log('[Catalog] Online booking toggle:', v); setServiceForm(f => ({ ...f, onlineBooking: v })); }}
                      trackColor={{ false: P.border, true: P.accent }}
                      thumbColor="#fff"
                    />
                  </View>
                </>
              )}

              {serviceTab === 'team' && (
                <View>
                  {barbers.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyTitle}>No team members</Text>
                      <Text style={styles.emptySub}>Add barbers to your team first</Text>
                    </View>
                  ) : (
                    barbers.map(b => (
                      <View key={b.id} style={styles.teamRow}>
                        <View style={styles.teamAvatar}>
                          <Text style={styles.teamAvatarText}>{b.name?.charAt(0) ?? 'B'}</Text>
                        </View>
                        <Text style={styles.teamName}>{b.name}</Text>
                        <Switch
                          value={barberToggles[b.id] ?? false}
                          onValueChange={v => {
                            console.log('[Catalog] Barber toggle:', b.id, v);
                            setBarberToggles(prev => ({ ...prev, [b.id]: v }));
                          }}
                          trackColor={{ false: P.border, true: P.accent }}
                          thumbColor="#fff"
                        />
                      </View>
                    ))
                  )}
                </View>
              )}

              {serviceTab === 'resources' && (
                <View style={styles.emptyState}>
                  <Package size={40} color={P.textTertiary} />
                  <Text style={styles.emptyTitle}>No resources added</Text>
                  <Text style={styles.emptySub}>Resources will appear here</Text>
                </View>
              )}
            </ScrollView>

            <View style={[styles.sheetFooter, { paddingBottom: insets.bottom + 16 }]}>
              <TouchableOpacity
                style={[styles.saveBtn, (!serviceForm.name || saving) && { opacity: 0.5 }]}
                onPress={saveService}
                disabled={!serviceForm.name || saving}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Bundle sheet */}
        <Modal visible={showBundleSheet} transparent animationType="slide" onRequestClose={() => setShowBundleSheet(false)}>
          <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => { console.log('[Catalog] Close bundle sheet'); setShowBundleSheet(false); }}>
                <X size={20} color={P.text} />
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>New bundle</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
              <Text style={styles.fieldLabel}>Bundle name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Haircut + Beard"
                placeholderTextColor={P.textTertiary}
                value={bundleName}
                onChangeText={setBundleName}
              />
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Bundle price (BHD)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.000"
                placeholderTextColor={P.textTertiary}
                value={bundlePrice}
                onChangeText={setBundlePrice}
                keyboardType="decimal-pad"
              />
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Services</Text>
              {services.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.bundleServiceRow}
                  onPress={() => {
                    console.log('[Catalog] Bundle service toggle:', s.id);
                    setBundleSelected(prev =>
                      prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                    );
                  }}
                >
                  <View style={[styles.checkbox, bundleSelected.includes(s.id) && styles.checkboxActive]}>
                    {bundleSelected.includes(s.id) && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
                  </View>
                  <Text style={styles.bundleServiceName}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={[styles.sheetFooter, { paddingBottom: insets.bottom + 16 }]}>
              <TouchableOpacity style={[styles.saveBtn, !bundleName && { opacity: 0.5 }]} onPress={saveBundle} disabled={!bundleName || saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Category sheet */}
        <Modal visible={showCategorySheet} transparent animationType="slide" onRequestClose={() => setShowCategorySheet(false)}>
          <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShowCategorySheet(false)}>
            <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>New category</Text>
              <TextInput
                style={[styles.input, { marginTop: 16 }]}
                placeholder="Category name"
                placeholderTextColor={P.textTertiary}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />
              <TouchableOpacity style={[styles.saveBtn, { marginTop: 16 }]} onPress={saveCategory}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  // ─── MEMBERSHIPS SCREEN ────────────────────────────────────────────────────
  if (screen === 'memberships') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { console.log('[Catalog] Back from memberships'); setScreen('home'); }} style={styles.backBtn}>
            <ArrowLeft size={20} color={P.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Memberships</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyStateCenter}>
          <CreditCard size={48} color={P.textTertiary} />
          <Text style={styles.emptyTitle}>No memberships yet</Text>
          <Text style={styles.emptySub}>Create your first membership to offer clients recurring value</Text>
          <TouchableOpacity
            style={[styles.saveBtn, { marginTop: 24, paddingHorizontal: 24 }]}
            onPress={() => { console.log('[Catalog] Create membership pressed'); setShowMembershipSheet(true); }}
          >
            <Text style={styles.saveBtnText}>+ Create membership</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={showMembershipSheet} transparent animationType="slide" onRequestClose={() => setShowMembershipSheet(false)}>
          <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShowMembershipSheet(false)}>
            <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>New membership</Text>
              <TextInput style={[styles.input, { marginTop: 16 }]} placeholder="Membership name" placeholderTextColor={P.textTertiary} value={membershipForm.name} onChangeText={v => setMembershipForm(f => ({ ...f, name: v }))} />
              <TextInput style={[styles.input, { marginTop: 12 }]} placeholder="Price (BHD/month)" placeholderTextColor={P.textTertiary} value={membershipForm.price} onChangeText={v => setMembershipForm(f => ({ ...f, price: v }))} keyboardType="decimal-pad" />
              <TextInput style={[styles.input, { marginTop: 12 }]} placeholder="Duration (months)" placeholderTextColor={P.textTertiary} value={membershipForm.duration} onChangeText={v => setMembershipForm(f => ({ ...f, duration: v }))} keyboardType="number-pad" />
              <TextInput style={[styles.input, { marginTop: 12 }]} placeholder="Description" placeholderTextColor={P.textTertiary} value={membershipForm.description} onChangeText={v => setMembershipForm(f => ({ ...f, description: v }))} />
              <TouchableOpacity style={[styles.saveBtn, { marginTop: 16 }]} onPress={saveMembership}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  // ─── PRODUCTS SCREEN ───────────────────────────────────────────────────────
  if (screen === 'products') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { console.log('[Catalog] Back from products'); setScreen('home'); }} style={styles.backBtn}>
            <ArrowLeft size={20} color={P.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Products</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => { console.log('[Catalog] Add product pressed'); setShowProductSheet(true); }}
          >
            <Plus size={14} color="#fff" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}><ActivityIndicator color={P.accent} /></View>
        ) : products.length === 0 ? (
          <View style={styles.emptyStateCenter}>
            <Package size={48} color={P.textTertiary} />
            <Text style={styles.emptyTitle}>No products yet</Text>
            <Text style={styles.emptySub}>Add your first product to get started</Text>
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            renderItem={({ item }) => {
              const priceText = formatPrice(item.price_bhd ?? 0);
              return (
                <View style={styles.productRow}>
                  <View style={styles.productIcon}>
                    <Package size={20} color={P.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceName}>{item.name}</Text>
                    <Text style={styles.serviceMeta}>{priceText}</Text>
                    {item.stock !== undefined && (
                      <Text style={styles.serviceMeta}>Stock: {item.stock}</Text>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}

        <Modal visible={showProductSheet} transparent animationType="slide" onRequestClose={() => setShowProductSheet(false)}>
          <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShowProductSheet(false)}>
            <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>New product</Text>
              <TextInput style={[styles.input, { marginTop: 16 }]} placeholder="Product name" placeholderTextColor={P.textTertiary} value={productForm.name} onChangeText={v => setProductForm(f => ({ ...f, name: v }))} />
              <TextInput style={[styles.input, { marginTop: 12 }]} placeholder="Description" placeholderTextColor={P.textTertiary} value={productForm.description} onChangeText={v => setProductForm(f => ({ ...f, description: v }))} />
              <TextInput style={[styles.input, { marginTop: 12 }]} placeholder="Price (BHD)" placeholderTextColor={P.textTertiary} value={productForm.price} onChangeText={v => setProductForm(f => ({ ...f, price: v }))} keyboardType="decimal-pad" />
              <TextInput style={[styles.input, { marginTop: 12 }]} placeholder="Stock quantity" placeholderTextColor={P.textTertiary} value={productForm.stock} onChangeText={v => setProductForm(f => ({ ...f, stock: v }))} keyboardType="number-pad" />
              <TouchableOpacity style={[styles.saveBtn, { marginTop: 16 }, !productForm.name && { opacity: 0.5 }]} onPress={saveProduct} disabled={!productForm.name || saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  // ─── COMING SOON SCREENS ───────────────────────────────────────────────────
  const comingSoonConfig: Record<string, { title: string; icon: React.ReactNode }> = {
    stocktakes: { title: 'Stocktakes', icon: <ClipboardList size={48} color={P.textTertiary} /> },
    'stock-orders': { title: 'Stock orders', icon: <Truck size={48} color={P.textTertiary} /> },
    suppliers: { title: 'Suppliers', icon: <Users size={48} color={P.textTertiary} /> },
  };
  const config = comingSoonConfig[screen];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { console.log('[Catalog] Back from', screen); setScreen('home'); }} style={styles.backBtn}>
          <ArrowLeft size={20} color={P.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{config?.title ?? screen}</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.emptyStateCenter}>
        {config?.icon}
        <Text style={styles.emptyTitle}>{config?.title}</Text>
        <Text style={styles.emptySub}>Coming soon</Text>
      </View>
    </View>
  );
}

function HomeRow({
  icon,
  label,
  onPress,
  iconBg = P.accentLight,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  iconBg?: string;
}) {
  return (
    <TouchableOpacity style={styles.homeRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.homeRowIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <Text style={styles.homeRowLabel}>{label}</Text>
      <ChevronRight size={16} color={P.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  headerTitle: { flex: 1, color: P.text, fontSize: 20, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  avatarCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: P.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: P.accent, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  section: { marginHorizontal: 16, marginBottom: 8, backgroundColor: P.surface, borderRadius: 12, borderWidth: 1, borderColor: P.border, overflow: 'hidden' },
  sectionHeader: { color: P.textSecondary, fontSize: 13, fontWeight: '700', marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  homeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  homeRowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  homeRowLabel: { flex: 1, color: P.text, fontSize: 15, fontWeight: '600' },
  rowDivider: { height: 1, backgroundColor: P.divider, marginLeft: 64 },
  screenTitle: { color: P.text, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  screenSubtitle: { color: P.textSecondary, fontSize: 13 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginVertical: 12, backgroundColor: P.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: P.border },
  searchInput: { flex: 1, color: P.text, fontSize: 14 },
  chipsScroll: { maxHeight: 44, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: P.surface, borderWidth: 1, borderColor: P.border },
  chipActive: { backgroundColor: '#1A1A2E', borderColor: P.text },
  chipText: { color: P.textSecondary, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: P.text, fontWeight: '700' },
  catHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  catLabel: { color: P.text, fontSize: 14, fontWeight: '700' },
  serviceGroup: { backgroundColor: P.surface, borderRadius: 12, borderWidth: 1, borderColor: P.border, overflow: 'hidden' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingRight: 14 },
  serviceBorder: { width: 4, alignSelf: 'stretch', backgroundColor: P.accent, borderRadius: 2 },
  serviceName: { color: P.text, fontSize: 15, fontWeight: '600' },
  serviceMeta: { color: P.textSecondary, fontSize: 13, marginTop: 2 },
  serviceMenu: { padding: 8 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyStateCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  emptyTitle: { color: P.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptySub: { color: P.textSecondary, fontSize: 14, textAlign: 'center' },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: P.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sheetHandle: { width: 40, height: 4, backgroundColor: P.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { color: P.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  sheetFooter: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: P.border },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: P.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: P.accent },
  tabBtnText: { color: P.textSecondary, fontSize: 13, fontWeight: '500' },
  tabBtnTextActive: { color: P.accent, fontWeight: '700' },
  fieldGroup: { marginBottom: 16 },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  fieldLabel: { color: P.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  charCounter: { color: P.textTertiary, fontSize: 12 },
  fieldHint: { color: P.textTertiary, fontSize: 12, marginTop: 4 },
  input: { backgroundColor: P.surfaceElevated, borderRadius: 10, padding: 14, color: P.text, borderWidth: 1, borderColor: P.border, fontSize: 15 },
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: P.surfaceElevated, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: P.border },
  dropdownValue: { color: P.text, fontSize: 15 },
  dropdownPlaceholder: { color: P.textTertiary, fontSize: 15 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: P.divider },
  saveBtn: { backgroundColor: '#000', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: P.divider },
  teamAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center' },
  teamAvatarText: { color: P.accent, fontSize: 14, fontWeight: '700' },
  teamName: { flex: 1, color: P.text, fontSize: 15 },
  addTypeRow: { paddingVertical: 16 },
  addTypeText: { color: P.text, fontSize: 16 },
  bundleServiceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  bundleServiceName: { color: P.text, fontSize: 15 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: P.border, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: P.accent, borderColor: P.accent },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: P.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: P.border },
  productIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center' },
});
