import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, Minus, Trash2, User, Tag, Percent, ChevronRight, CreditCard, Banknote, Gift, X, Check } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

const P = { bg:'#0B0C10', card:'#1A1B20', border:'#2A2B30', accent:'#7C3AED', text:'#F0F0FF', textSec:'#9090B0', textTer:'#5A5A7A', green:'#10B981', danger:'#E85454', amber:'#F59E0B', divider:'#1E1F24', surface:'#242530' };

type CartItem = { id: string; name: string; price: number; qty: number; barber_name?: string; service_id?: string };
type PaymentMethod = { method: 'cash' | 'card' | 'gift_card' | 'other'; amount: number };

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash', icon: Banknote, color: '#10B981' },
  { key: 'card', label: 'Card', icon: CreditCard, color: '#7C3AED' },
  { key: 'gift_card', label: 'Gift Card', icon: Gift, color: '#F59E0B' },
  { key: 'other', label: 'Other', icon: Tag, color: '#06B6D4' },
];

function NewSaleInner() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const shopId = (profile as any)?.shop_id;
  const params = useLocalSearchParams<{ clientName?: string; serviceName?: string; bookingId?: string }>();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [clientName, setClientName] = useState('');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [tip, setTip] = useState(0);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [notes, setNotes] = useState('');
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [saving, setSaving] = useState(false);

  const [showServiceSheet, setShowServiceSheet] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [showDiscountSheet, setShowDiscountSheet] = useState(false);
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'gift_card' | 'other'>('cash');
  const [payAmount, setPayAmount] = useState('');

  useEffect(() => {
    if (!shopId) return;
    console.log('[POS/New] Fetching services for shop:', shopId);
    supabase.from('services').select('id, name_en, price_bhd, duration_minutes').eq('shop_id', shopId).then(({ data, error }) => {
      if (error) console.log('[POS/New] Services fetch error:', error.message);
      if (data) {
        console.log('[POS/New] Loaded', data.length, 'services');
        setServices(data);
      }
    });
  }, [shopId]);

  // Pre-fill from calendar checkout
  useEffect(() => {
    if (params.clientName) {
      const decoded = decodeURIComponent(params.clientName);
      console.log('[POS/New] Pre-filling client name from calendar:', decoded);
      setClientName(decoded);
    }
  }, [params.clientName]);

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = discountType === 'percent' ? subtotal * (discount / 100) : discount;
  const total = Math.max(0, subtotal - discountAmt + tip + serviceCharge);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);

  const subtotalDisplay = subtotal.toFixed(2);
  const discountAmtDisplay = discountAmt.toFixed(2);
  const tipDisplay = tip.toFixed(2);
  const serviceChargeDisplay = serviceCharge.toFixed(2);
  const totalDisplay = total.toFixed(2);
  const remainingDisplay = remaining.toFixed(2);
  const changeDue = Math.max(0, totalPaid - total);
  const changeDueDisplay = changeDue.toFixed(2);
  const hasChange = totalPaid > total + 0.01;

  const addToCart = (svc: any) => {
    console.log('[POS/New] Add to cart:', svc.name_en, 'price:', svc.price_bhd);
    setCart(prev => {
      const existing = prev.find(i => i.service_id === svc.id);
      if (existing) return prev.map(i => i.service_id === svc.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: Date.now().toString(), name: svc.name_en, price: Number(svc.price_bhd), qty: 1, service_id: svc.id }];
    });
    setShowServiceSheet(false);
  };

  const removeFromCart = (id: string) => {
    console.log('[POS/New] Remove from cart, item id:', id);
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQty = (id: string, delta: number) => {
    console.log('[POS/New] Update qty, item id:', id, 'delta:', delta);
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  };

  const addPayment = () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return;
    console.log('[POS/New] Add payment:', payMethod, 'amount:', amt);
    setPayments(prev => [...prev, { method: payMethod, amount: amt }]);
    setPayAmount('');
  };

  const handleCheckout = async () => {
    console.log('[POS/New] Checkout pressed, cart items:', cart.length, 'total:', total);
    if (cart.length === 0) { Alert.alert('Empty cart', 'Add at least one service'); return; }
    if (remaining > 0.01) { Alert.alert('Payment incomplete', `BHD ${remaining.toFixed(2)} still remaining`); return; }
    setSaving(true);
    try {
      console.log('[POS/New] Inserting sale to Supabase...');
      const { data: sale, error } = await supabase.from('sales').insert({
        shop_id: shopId,
        customer_name: clientName || 'Walk-In',
        status: 'completed',
        subtotal,
        discount_amount: discountAmt,
        discount_type: discountType,
        tip_amount: tip,
        service_charge: serviceCharge,
        total,
        amount_paid: totalPaid,
        change_due: Math.max(0, totalPaid - total),
        notes,
        completed_at: new Date().toISOString(),
      }).select().single();
      if (error) throw error;
      console.log('[POS/New] Sale created, id:', sale.id);

      console.log('[POS/New] Inserting', cart.length, 'sale items...');
      await supabase.from('sale_items').insert(cart.map(i => ({
        sale_id: sale.id,
        service_id: i.service_id,
        item_name: i.name,
        item_type: 'service',
        quantity: i.qty,
        unit_price: i.price,
        line_total: i.price * i.qty,
      })));

      console.log('[POS/New] Inserting', payments.length, 'payments...');
      await supabase.from('sale_payments').insert(payments.map(p => ({ sale_id: sale.id, method: p.method, amount: p.amount })));

      await supabase.from('sale_activity').insert({
        sale_id: sale.id,
        actor_name: profile?.full_name ?? 'Staff',
        action: 'Sale completed',
        detail: `Total: BHD ${total.toFixed(2)}`,
      });

      console.log('[POS/New] Sale saved successfully, navigating to detail:', sale.id);
      router.replace(`/(partner)/pos/${sale.id}` as never);
    } catch (e: any) {
      console.log('[POS/New] Checkout error:', e?.message ?? e);
      Alert.alert('Error', e.message ?? 'Could not save sale');
    } finally {
      setSaving(false);
    }
  };

  const discountLabel = discount > 0
    ? (discountType === 'percent' ? `${discount}%` : `BHD ${discount.toFixed(2)}`)
    : 'None';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            console.log('[POS/New] Back button pressed');
            router.back();
          }}
          style={styles.backBtn}
        >
          <ArrowLeft size={20} color={P.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Sale</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        {/* Client */}
        <View style={styles.section}>
          <View style={styles.clientRow}>
            <User size={18} color={P.textSec} />
            <TextInput
              style={styles.clientInput}
              placeholder="Client name (optional)"
              placeholderTextColor={P.textTer}
              value={clientName}
              onChangeText={v => {
                console.log('[POS/New] Client name changed:', v);
                setClientName(v);
              }}
            />
          </View>
        </View>

        {/* Cart */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Services</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                console.log('[POS/New] Add service button pressed');
                setShowServiceSheet(true);
              }}
            >
              <Plus size={16} color={P.accent} />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
          {cart.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyCart}
              onPress={() => {
                console.log('[POS/New] Empty cart tapped — open service sheet');
                setShowServiceSheet(true);
              }}
            >
              <Plus size={20} color={P.textTer} />
              <Text style={styles.emptyCartText}>Tap to add services</Text>
            </TouchableOpacity>
          ) : (
            cart.map(item => {
              const itemTotalDisplay = (item.price * item.qty).toFixed(2);
              const itemPriceDisplay = item.price.toFixed(2);
              return (
                <View key={item.id} style={styles.cartItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemPrice}>BHD {itemPriceDisplay} each</Text>
                  </View>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, -1)}>
                      <Minus size={14} color={P.text} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.qty}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, 1)}>
                      <Plus size={14} color={P.text} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cartItemTotal}>BHD {itemTotalDisplay}</Text>
                  <TouchableOpacity onPress={() => removeFromCart(item.id)} style={{ marginLeft: 10 }}>
                    <Trash2 size={16} color={P.danger} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* Adjustments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adjustments</Text>
          <TouchableOpacity
            style={styles.adjustRow}
            onPress={() => {
              console.log('[POS/New] Discount row pressed');
              setShowDiscountSheet(true);
            }}
          >
            <Percent size={16} color={P.textSec} />
            <Text style={styles.adjustLabel}>Discount</Text>
            <Text style={styles.adjustValue}>{discountLabel}</Text>
            <ChevronRight size={14} color={P.textTer} />
          </TouchableOpacity>
          <View style={styles.adjustRow}>
            <Tag size={16} color={P.textSec} />
            <Text style={styles.adjustLabel}>Tip</Text>
            <TextInput
              style={styles.adjustInput}
              value={tip > 0 ? String(tip) : ''}
              onChangeText={v => {
                console.log('[POS/New] Tip changed:', v);
                setTip(parseFloat(v) || 0);
              }}
              placeholder="0.00"
              placeholderTextColor={P.textTer}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.adjustRow, { borderBottomWidth: 0 }]}>
            <Tag size={16} color={P.textSec} />
            <Text style={styles.adjustLabel}>Service Charge</Text>
            <TextInput
              style={styles.adjustInput}
              value={serviceCharge > 0 ? String(serviceCharge) : ''}
              onChangeText={v => {
                console.log('[POS/New] Service charge changed:', v);
                setServiceCharge(parseFloat(v) || 0);
              }}
              placeholder="0.00"
              placeholderTextColor={P.textTer}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Totals */}
        <View style={styles.section}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>BHD {subtotalDisplay}</Text>
          </View>
          {discountAmt > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: P.green }]}>Discount</Text>
              <Text style={[styles.totalValue, { color: P.green }]}>-BHD {discountAmtDisplay}</Text>
            </View>
          )}
          {tip > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tip</Text>
              <Text style={styles.totalValue}>BHD {tipDisplay}</Text>
            </View>
          )}
          {serviceCharge > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Service Charge</Text>
              <Text style={styles.totalValue}>BHD {serviceChargeDisplay}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>BHD {totalDisplay}</Text>
          </View>
        </View>

        {/* Payments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                console.log('[POS/New] Add payment button pressed');
                setShowPaymentSheet(true);
              }}
            >
              <Plus size={16} color={P.accent} />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
          {payments.map((p, i) => {
            const methodLabel = p.method.replace('_', ' ');
            const amtDisplay = p.amount.toFixed(2);
            return (
              <View key={i} style={styles.paymentRow}>
                <Text style={styles.paymentMethod}>{methodLabel}</Text>
                <Text style={styles.paymentAmount}>BHD {amtDisplay}</Text>
                <TouchableOpacity
                  onPress={() => {
                    console.log('[POS/New] Remove payment at index:', i);
                    setPayments(prev => prev.filter((_, j) => j !== i));
                  }}
                >
                  <X size={14} color={P.danger} />
                </TouchableOpacity>
              </View>
            );
          })}
          {remaining > 0.01 && (
            <View style={styles.remainingRow}>
              <Text style={styles.remainingLabel}>Remaining</Text>
              <Text style={styles.remainingValue}>BHD {remainingDisplay}</Text>
            </View>
          )}
          {hasChange && (
            <View style={styles.remainingRow}>
              <Text style={[styles.remainingLabel, { color: P.green }]}>Change Due</Text>
              <Text style={[styles.remainingValue, { color: P.green }]}>BHD {changeDueDisplay}</Text>
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={v => {
              console.log('[POS/New] Notes changed');
              setNotes(v);
            }}
            placeholder="Add a note..."
            placeholderTextColor={P.textTer}
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>

      {/* Checkout button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.checkoutBtn, (saving || cart.length === 0) && { opacity: 0.5 }]}
          onPress={handleCheckout}
          disabled={saving || cart.length === 0}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Check size={20} color="#fff" />
              <Text style={styles.checkoutBtnText}>Complete Sale · BHD {totalDisplay}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Service picker sheet */}
      <Modal visible={showServiceSheet} transparent animationType="slide" onRequestClose={() => setShowServiceSheet(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add Service</Text>
              <TouchableOpacity onPress={() => {
                console.log('[POS/New] Service sheet closed');
                setShowServiceSheet(false);
              }}>
                <X size={20} color={P.textSec} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {services.length === 0 ? (
                <Text style={{ color: P.textSec, textAlign: 'center', padding: 24 }}>No services found. Add services in Catalog first.</Text>
              ) : (
                services.map(svc => {
                  const svcPrice = Number(svc.price_bhd).toFixed(2);
                  return (
                    <TouchableOpacity
                      key={svc.id}
                      style={styles.serviceRow}
                      onPress={() => addToCart(svc)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceName}>{svc.name_en}</Text>
                        <Text style={styles.serviceDuration}>{svc.duration_minutes}min</Text>
                      </View>
                      <Text style={styles.servicePrice}>BHD {svcPrice}</Text>
                      <Plus size={18} color={P.accent} style={{ marginLeft: 12 }} />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Payment sheet */}
      <Modal visible={showPaymentSheet} transparent animationType="slide" onRequestClose={() => setShowPaymentSheet(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add Payment</Text>
              <TouchableOpacity onPress={() => {
                console.log('[POS/New] Payment sheet closed');
                setShowPaymentSheet(false);
              }}>
                <X size={20} color={P.textSec} />
              </TouchableOpacity>
            </View>
            <View style={styles.payMethodGrid}>
              {PAYMENT_METHODS.map(m => {
                const Icon = m.icon;
                const isSelected = payMethod === m.key;
                return (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.payMethodCard, isSelected && { borderColor: m.color, backgroundColor: m.color + '22' }]}
                    onPress={() => {
                      console.log('[POS/New] Payment method selected:', m.key);
                      setPayMethod(m.key as any);
                    }}
                  >
                    <Icon size={22} color={isSelected ? m.color : P.textSec} />
                    <Text style={[styles.payMethodLabel, isSelected && { color: m.color }]}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.payAmountRow}>
              <Text style={styles.payAmountLabel}>Amount (BHD)</Text>
              <TextInput
                style={styles.payAmountInput}
                value={payAmount}
                onChangeText={v => {
                  console.log('[POS/New] Pay amount changed:', v);
                  setPayAmount(v);
                }}
                placeholder={remaining.toFixed(2)}
                placeholderTextColor={P.textTer}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
            {/* Quick amount chips */}
            <View style={styles.quickAmounts}>
              {[remaining, 5, 10, 20, 50]
                .filter((v, i, a) => a.indexOf(v) === i && v > 0)
                .slice(0, 5)
                .map(amt => {
                  const amtLabel = amt.toFixed(0);
                  return (
                    <TouchableOpacity
                      key={amt}
                      style={styles.quickChip}
                      onPress={() => {
                        console.log('[POS/New] Quick amount chip pressed:', amt);
                        setPayAmount(amt.toFixed(2));
                      }}
                    >
                      <Text style={styles.quickChipText}>BHD {amtLabel}</Text>
                    </TouchableOpacity>
                  );
                })}
            </View>
            <TouchableOpacity
              style={styles.addPayBtn}
              onPress={() => {
                console.log('[POS/New] Add payment confirmed, method:', payMethod, 'amount:', payAmount);
                addPayment();
                setShowPaymentSheet(false);
              }}
            >
              <Text style={styles.addPayBtnText}>Add Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Discount sheet */}
      <Modal visible={showDiscountSheet} transparent animationType="slide" onRequestClose={() => setShowDiscountSheet(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Discount</Text>
              <TouchableOpacity onPress={() => {
                console.log('[POS/New] Discount sheet closed');
                setShowDiscountSheet(false);
              }}>
                <X size={20} color={P.textSec} />
              </TouchableOpacity>
            </View>
            <View style={styles.discountTypeRow}>
              {(['percent', 'fixed'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.discountTypeBtn, discountType === t && styles.discountTypeBtnActive]}
                  onPress={() => {
                    console.log('[POS/New] Discount type changed to:', t);
                    setDiscountType(t);
                  }}
                >
                  <Text style={[styles.discountTypeBtnText, discountType === t && { color: P.accent }]}>
                    {t === 'percent' ? 'Percentage %' : 'Fixed Amount'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.discountInput}
              value={discount > 0 ? String(discount) : ''}
              onChangeText={v => {
                console.log('[POS/New] Discount value changed:', v);
                setDiscount(parseFloat(v) || 0);
              }}
              placeholder={discountType === 'percent' ? 'e.g. 10' : 'e.g. 5.00'}
              placeholderTextColor={P.textTer}
              keyboardType="decimal-pad"
              autoFocus
            />
            <TouchableOpacity
              style={styles.addPayBtn}
              onPress={() => {
                console.log('[POS/New] Discount applied:', discount, discountType);
                setShowDiscountSheet(false);
              }}
            >
              <Text style={styles.addPayBtnText}>Apply Discount</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function NewSale() {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => { setReady(true); }, []);
  if (!ready) return (
    <View style={{ flex: 1, backgroundColor: '#0B0C10', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#7C3AED" size="large" />
    </View>
  );
  return <NewSaleInner />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: P.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: P.border },
  headerTitle: { color: P.text, fontSize: 20, fontWeight: '800' },
  section: { marginHorizontal: 16, marginBottom: 12, backgroundColor: P.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: P.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: P.text, fontSize: 15, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: P.accent + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  addBtnText: { color: P.accent, fontSize: 13, fontWeight: '600' },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clientInput: { flex: 1, color: P.text, fontSize: 15 },
  emptyCart: { alignItems: 'center', paddingVertical: 24, gap: 8, borderWidth: 1, borderColor: P.border, borderRadius: 12, borderStyle: 'dashed' },
  emptyCartText: { color: P.textTer, fontSize: 14 },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: P.divider },
  cartItemName: { color: P.text, fontSize: 14, fontWeight: '600' },
  cartItemPrice: { color: P.textSec, fontSize: 12, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: P.surface, alignItems: 'center', justifyContent: 'center' },
  qtyText: { color: P.text, fontSize: 15, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  cartItemTotal: { color: P.text, fontSize: 14, fontWeight: '700', minWidth: 60, textAlign: 'right' },
  adjustRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: P.divider },
  adjustLabel: { flex: 1, color: P.text, fontSize: 14 },
  adjustValue: { color: P.textSec, fontSize: 14 },
  adjustInput: { color: P.text, fontSize: 14, textAlign: 'right', minWidth: 60 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalLabel: { color: P.textSec, fontSize: 14 },
  totalValue: { color: P.text, fontSize: 14 },
  grandTotal: { borderTopWidth: 1, borderTopColor: P.border, marginTop: 8, paddingTop: 12 },
  grandTotalLabel: { color: P.text, fontSize: 18, fontWeight: '800' },
  grandTotalValue: { color: P.accent, fontSize: 22, fontWeight: '900' },
  paymentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12, borderBottomWidth: 1, borderBottomColor: P.divider },
  paymentMethod: { flex: 1, color: P.text, fontSize: 14, textTransform: 'capitalize' },
  paymentAmount: { color: P.green, fontSize: 14, fontWeight: '700' },
  remainingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 },
  remainingLabel: { color: P.amber, fontSize: 14, fontWeight: '600' },
  remainingValue: { color: P.amber, fontSize: 14, fontWeight: '700' },
  notesInput: { color: P.text, fontSize: 14, minHeight: 70, textAlignVertical: 'top' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: P.bg, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: P.border },
  checkoutBtn: { backgroundColor: P.accent, borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  checkoutBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: P.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: P.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { color: P.text, fontSize: 18, fontWeight: '700' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: P.divider },
  serviceName: { color: P.text, fontSize: 15, fontWeight: '600' },
  serviceDuration: { color: P.textSec, fontSize: 12, marginTop: 2 },
  servicePrice: { color: P.accent, fontSize: 15, fontWeight: '700' },
  payMethodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  payMethodCard: { width: '47%', backgroundColor: P.bg, borderRadius: 14, padding: 14, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: P.border },
  payMethodLabel: { color: P.textSec, fontSize: 13, fontWeight: '600' },
  payAmountRow: { marginBottom: 12 },
  payAmountLabel: { color: P.textSec, fontSize: 13, marginBottom: 6 },
  payAmountInput: { backgroundColor: P.bg, borderRadius: 12, padding: 14, color: P.text, fontSize: 22, fontWeight: '700', borderWidth: 1, borderColor: P.border },
  quickAmounts: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  quickChip: { backgroundColor: P.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: P.border },
  quickChipText: { color: P.text, fontSize: 13, fontWeight: '600' },
  addPayBtn: { backgroundColor: P.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  addPayBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  discountTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  discountTypeBtn: { flex: 1, backgroundColor: P.bg, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: P.border },
  discountTypeBtnActive: { borderColor: P.accent, backgroundColor: P.accent + '22' },
  discountTypeBtnText: { color: P.textSec, fontSize: 14, fontWeight: '600' },
  discountInput: { backgroundColor: P.bg, borderRadius: 12, padding: 14, color: P.text, fontSize: 22, fontWeight: '700', borderWidth: 1, borderColor: P.border, marginBottom: 16 },
});
