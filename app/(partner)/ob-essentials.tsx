import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, X, Sparkles } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

const P = {
  bg: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceElevated: '#242438',
  border: '#2A2A45',
  accent: '#7C3AED',
  accentLight: 'rgba(124,58,237,0.15)',
  text: '#F0F0FF',
  textSecondary: '#9090B0',
  textTertiary: '#5A5A7A',
  success: '#4CAF7D',
  danger: '#E85454',
  divider: '#1E1E35',
};

const COUNTRY_CODES = [
  { code: '+973', label: 'BH' },
  { code: '+966', label: 'SA' },
  { code: '+971', label: 'AE' },
  { code: '+44', label: 'UK' },
  { code: '+1', label: 'US' },
];

const SAMPLE_ENHANCED =
  'H1 stands out as a dedicated hair salon in Awali, where skilled stylists transform hair into stunning works of art. Offering a comprehensive range of services, including expert haircuts, vibrant hair colors, luxurious blow dries, and the latest balayage techniques, each visit promises a refreshing experience. With a focus on personalized service, clients can expect to leave feeling rejuvenated and confident.';

export default function ObEssentials() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, user } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [countryCode, setCountryCode] = useState('+973');
  const [showCodePicker, setShowCodePicker] = useState(false);

  const [essentialsModalVisible, setEssentialsModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCountryCode, setEditCountryCode] = useState('+973');

  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  useEffect(() => {
    if (!profile?.shop_id) return;
    console.log('[ObEssentials] Fetching shop data for shop_id:', profile.shop_id);
    supabase
      .from('barbershops')
      .select('name, phone, description')
      .eq('id', profile.shop_id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.log('[ObEssentials] Error fetching shop:', error.message);
          return;
        }
        if (data) {
          console.log('[ObEssentials] Shop data loaded:', data.name);
          setDisplayName(data.name ?? '');
          const rawPhone: string = data.phone ?? '';
          const matched = COUNTRY_CODES.find((c) => rawPhone.startsWith(c.code));
          if (matched) {
            setCountryCode(matched.code);
            setPhone(rawPhone.slice(matched.code.length).trim());
          } else {
            setPhone(rawPhone);
          }
          setDescription(data.description ?? '');
        }
      });

    if (user?.id) {
      supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.email) setEmail(data.email);
        });
    }
  }, [profile?.shop_id, user?.id]);

  const openEssentialsModal = () => {
    console.log('[ObEssentials] Open essentials edit modal');
    setEditName(displayName);
    setEditPhone(phone);
    setEditEmail(email);
    setEditCountryCode(countryCode);
    setEssentialsModalVisible(true);
  };

  const openAboutModal = () => {
    console.log('[ObEssentials] Open about edit modal');
    setEditDescription(description);
    setAboutModalVisible(true);
  };

  const saveEssentials = async () => {
    if (!profile?.shop_id) return;
    console.log('[ObEssentials] Save essentials pressed — name:', editName, 'phone:', editCountryCode + editPhone);
    setSaving(true);
    const fullPhone = editCountryCode + ' ' + editPhone;
    const { error } = await supabase
      .from('barbershops')
      .update({ name: editName, phone: fullPhone })
      .eq('id', profile.shop_id);
    setSaving(false);
    if (error) {
      console.log('[ObEssentials] Error saving essentials:', error.message);
    } else {
      console.log('[ObEssentials] Essentials saved successfully');
      setDisplayName(editName);
      setPhone(editPhone);
      setCountryCode(editCountryCode);
      setEssentialsModalVisible(false);
    }
  };

  const saveAbout = async () => {
    if (!profile?.shop_id) return;
    console.log('[ObEssentials] Save about pressed — description length:', editDescription.length);
    setSaving(true);
    const { error } = await supabase
      .from('barbershops')
      .update({ description: editDescription })
      .eq('id', profile.shop_id);
    setSaving(false);
    if (error) {
      console.log('[ObEssentials] Error saving description:', error.message);
    } else {
      console.log('[ObEssentials] Description saved successfully');
      setDescription(editDescription);
      setAboutModalVisible(false);
    }
  };

  const handleEnhance = () => {
    console.log('[ObEssentials] Enhance description pressed');
    setEnhancing(true);
    setTimeout(() => {
      setEditDescription(SAMPLE_ENHANCED);
      setEnhancing(false);
    }, 1500);
  };

  const descCount = editDescription.length;
  const descValid = descCount >= 200;
  const fullPhoneDisplay = countryCode + ' ' + phone;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            console.log('[ObEssentials] Back pressed');
            router.back();
          }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color={P.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.editPill} onPress={openEssentialsModal} activeOpacity={0.8}>
          <Text style={styles.editPillText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Essentials</Text>

        {/* Venue essentials section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Venue essentials</Text>
            <TouchableOpacity style={styles.editPill} onPress={openEssentialsModal} activeOpacity={0.8}>
              <Text style={styles.editPillText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Display name</Text>
            <Text style={styles.fieldValue}>{displayName || '—'}</Text>
          </View>
          <View style={styles.fieldDivider} />
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Business phone number</Text>
            <Text style={styles.fieldValue}>{fullPhoneDisplay.trim() || '—'}</Text>
          </View>
          <View style={styles.fieldDivider} />
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Business email</Text>
            <Text style={styles.fieldValue}>{email || '—'}</Text>
          </View>
        </View>

        {/* About section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>About</Text>
            <TouchableOpacity style={styles.editPill} onPress={openAboutModal} activeOpacity={0.8}>
              <Text style={styles.editPillText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Venue description</Text>
            <Text style={styles.fieldValue}>{description || '—'}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Essentials Edit Modal */}
      <Modal
        visible={essentialsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEssentialsModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  console.log('[ObEssentials] Close essentials modal');
                  setEssentialsModalVisible(false);
                }}
                activeOpacity={0.7}
              >
                <X size={20} color={P.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalTitle}>Venue essentials</Text>
              <Text style={styles.modalSubtitle}>
                Add the display name you'd like to be known by and how clients can get in touch with you
              </Text>

              {/* Display name */}
              <View style={styles.modalFieldBlock}>
                <Text style={styles.modalLabel}>Location display name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editName}
                  onChangeText={(v) => {
                    console.log('[ObEssentials] Display name changed');
                    setEditName(v);
                  }}
                  placeholder="e.g. Trendy Salon London"
                  placeholderTextColor={P.textTertiary}
                />
                <Text style={styles.modalHelper}>
                  Public name visible to your clients in notifications and when booking online. E.g. Trendy Salon London
                </Text>
              </View>

              {/* Phone */}
              <View style={styles.modalFieldBlock}>
                <Text style={styles.modalLabel}>Business phone number</Text>
                <View style={styles.phoneRow}>
                  <TouchableOpacity
                    style={styles.countryCodePill}
                    onPress={() => {
                      console.log('[ObEssentials] Country code picker opened');
                      setShowCodePicker(!showCodePicker);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.countryCodeText}>{editCountryCode}</Text>
                    <Text style={{ color: P.textTertiary, fontSize: 10, marginLeft: 2 }}>▼</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.modalInput, { flex: 1 }]}
                    value={editPhone}
                    onChangeText={(v) => {
                      console.log('[ObEssentials] Phone number changed');
                      setEditPhone(v);
                    }}
                    placeholder="3421 0100"
                    placeholderTextColor={P.textTertiary}
                    keyboardType="phone-pad"
                  />
                </View>
                {showCodePicker && (
                  <View style={styles.codePickerDropdown}>
                    {COUNTRY_CODES.map((c) => (
                      <TouchableOpacity
                        key={c.code}
                        style={styles.codePickerItem}
                        onPress={() => {
                          console.log('[ObEssentials] Country code selected:', c.code);
                          setEditCountryCode(c.code);
                          setShowCodePicker(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.codePickerText}>{c.code} {c.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Email */}
              <View style={styles.modalFieldBlock}>
                <Text style={styles.modalLabel}>Business email</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editEmail}
                  onChangeText={(v) => {
                    console.log('[ObEssentials] Email changed');
                    setEditEmail(v);
                  }}
                  placeholder="email@example.com"
                  placeholderTextColor={P.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Text style={styles.modalHelper}>
                  Choose where clients replies are sent when they respond to appointment emails
                </Text>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 16 }]}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={saveEssentials}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* About Edit Modal */}
      <Modal
        visible={aboutModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAboutModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  console.log('[ObEssentials] Close about modal');
                  setAboutModalVisible(false);
                }}
                activeOpacity={0.7}
              >
                <X size={20} color={P.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalTitle}>Tell us a bit about this venue</Text>
              <Text style={styles.modalSubtitle}>
                The most effective descriptions showcase key details about your business and highlight what makes your venue stand out, helping to attract and engage clients
              </Text>

              <View style={styles.modalFieldBlock}>
                <View style={styles.descLabelRow}>
                  <Text style={styles.modalLabel}>Venue description</Text>
                  <Text style={[styles.modalHelper, { marginTop: 0 }]}>{descCount}/1200</Text>
                </View>
                <TextInput
                  style={[styles.modalInput, styles.descTextarea]}
                  value={editDescription}
                  onChangeText={(v) => {
                    console.log('[ObEssentials] Description changed, length:', v.length);
                    setEditDescription(v);
                  }}
                  placeholder="Describe your venue..."
                  placeholderTextColor={P.textTertiary}
                  multiline
                  maxLength={1200}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={styles.enhanceBtn}
                  onPress={handleEnhance}
                  disabled={enhancing}
                  activeOpacity={0.8}
                >
                  {enhancing ? (
                    <ActivityIndicator size="small" color={P.accent} />
                  ) : (
                    <>
                      <Sparkles size={14} color={P.accent} />
                      <Text style={styles.enhanceBtnText}>Enhance</Text>
                    </>
                  )}
                </TouchableOpacity>

                {!descValid && (
                  <Text style={styles.descError}>A minimum of 200 characters is required</Text>
                )}
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 16 }]}>
              <TouchableOpacity
                style={[styles.saveBtn, (!descValid || saving) && { opacity: 0.4 }]}
                onPress={saveAbout}
                disabled={!descValid || saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 4,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  editPillText: {
    color: P.text,
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 20,
  },
  pageTitle: {
    color: P.text,
    fontSize: 26,
    fontWeight: '800',
  },
  section: {
    backgroundColor: P.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: P.border,
    padding: 16,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: P.text,
    fontSize: 15,
    fontWeight: '700',
  },
  fieldBlock: {
    gap: 4,
  },
  fieldLabel: {
    color: P.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  fieldValue: {
    color: P.text,
    fontSize: 14,
    lineHeight: 20,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: P.divider,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: P.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: P.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 20,
  },
  modalTitle: {
    color: P.text,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  modalSubtitle: {
    color: P.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  modalFieldBlock: {
    gap: 6,
  },
  modalLabel: {
    color: P.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: P.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: P.text,
    fontSize: 15,
  },
  modalHelper: {
    color: P.textTertiary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  countryCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 4,
  },
  countryCodeText: {
    color: P.text,
    fontSize: 15,
    fontWeight: '600',
  },
  codePickerDropdown: {
    backgroundColor: P.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.border,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  codePickerItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: P.divider,
  },
  codePickerText: {
    color: P.text,
    fontSize: 14,
    fontWeight: '500',
  },
  descLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  descTextarea: {
    minHeight: 160,
    paddingTop: 12,
  },
  enhanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: P.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    marginTop: 4,
  },
  enhanceBtnText: {
    color: P.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  descError: {
    color: P.danger,
    fontSize: 12,
    marginTop: 4,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: P.divider,
    backgroundColor: P.bg,
  },
  saveBtn: {
    backgroundColor: P.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
