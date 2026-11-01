import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ActionButton, AppScreen, BrandLockup, Card } from "@/components/app-ui";
import { useAppStore } from "@/lib/app-store";
import { usePerformAuth } from "@/lib/perform-auth";
import { BILLING_CYCLES, type BillingCycle, type SubscriptionPlan, formatPlanAmount, formatPlanCycle, useSubscriptionCatalog } from "@/lib/subscription-catalog";

export default function AdminSubscriptionsScreen() {
  const { palette } = useAppStore();
  const { account, csrfToken } = usePerformAuth();
  const { plans, loading, save } = useSubscriptionCatalog();
  const [draft, setDraft] = useState<SubscriptionPlan[] | null>(null);
  const [saving, setSaving] = useState(false);
  const workingPlans = draft ?? plans;
  if (account?.role !== "admin") return <AppScreen contentStyle={styles.screen}><BrandLockup compact /><Card style={styles.denied}><MaterialIcons name="lock-outline" size={28} color={palette.warning} /><Text style={[styles.title, { color: palette.text }]}>Administrator access only</Text><Text style={[styles.body, { color: palette.muted }]}>Subscription settings can only be viewed and changed by a configured PERFORM AI administrator.</Text><ActionButton label="Back to profile" icon="arrow-back" onPress={() => router.replace("/(tabs)/profile")} /></Card></AppScreen>;

  const change = (id: string, patch: Partial<SubscriptionPlan>) => setDraft((current) => (current ?? plans).map((plan) => plan.id === id ? { ...plan, ...patch } : plan));
  const cycle = (value: BillingCycle) => BILLING_CYCLES[(BILLING_CYCLES.indexOf(value) + 1) % BILLING_CYCLES.length];
  const submit = async () => {
    setSaving(true);
    const result = await save(workingPlans, csrfToken);
    setSaving(false);
    if (!result.ok) Alert.alert("Subscription settings not saved", result.error ?? "Try again.");
    else Alert.alert("Subscription settings saved", "The new prices and billing cycles are now used by registration and the public package preview.");
  };

  return <AppScreen scroll contentStyle={styles.screen}><View style={styles.top}><Pressable accessibilityLabel="Close subscription administration" onPress={() => router.back()} style={({ pressed }) => [styles.close, { borderColor: palette.border }, pressed && styles.pressed]}><MaterialIcons name="close" size={22} color={palette.text} /></Pressable><BrandLockup compact /></View><View style={styles.heading}><Text style={[styles.eyebrow, { color: palette.accent }]}>ADMINISTRATION</Text><Text style={[styles.title, { color: palette.text }]}>Subscription settings</Text><Text style={[styles.body, { color: palette.muted }]}>Change the displayed amount and billing cadence. Saving writes only to private PHP storage outside the public web root. It does not activate customer payment automatically.</Text></View><View style={styles.list}>{workingPlans.map((plan) => <Card key={plan.id} style={styles.plan}><View style={styles.planHeader}><View><Text style={[styles.planName, { color: palette.text }]}>{plan.label}</Text><Text style={[styles.body, { color: palette.muted }]}>{formatPlanAmount(plan)} · {formatPlanCycle(plan.cycle)}</Text></View><View style={[styles.idBadge, { backgroundColor: `${palette.primary}18` }]}><Text style={[styles.idText, { color: palette.primary }]}>{plan.id.toUpperCase()}</Text></View></View><Text style={[styles.label, { color: palette.muted }]}>AMOUNT IN GBP</Text><TextInput value={String(plan.amount)} keyboardType="decimal-pad" onChangeText={(value) => change(plan.id, { amount: Number(value.replace(",", ".")) || 0 })} style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.background }]} /><Text style={[styles.label, { color: palette.muted }]}>BILLING CYCLE</Text><Pressable onPress={() => change(plan.id, { cycle: cycle(plan.cycle) })} style={({ pressed }) => [styles.cycle, { borderColor: palette.border, backgroundColor: palette.background }, pressed && styles.pressed]}><Text style={[styles.cycleText, { color: palette.text }]}>{formatPlanCycle(plan.cycle)}</Text><MaterialIcons name="sync" size={18} color={palette.accent} /></Pressable></Card>)}</View><ActionButton label={saving ? "Saving…" : loading ? "Loading…" : "Save subscription settings"} icon="save" disabled={saving || loading || workingPlans.length !== 5} onPress={submit} /></AppScreen>;
}

const styles = StyleSheet.create({ screen:{paddingTop:16,paddingBottom:46,gap:15}, top:{flexDirection:"row",alignItems:"flex-start",gap:12},close:{width:43,height:43,borderWidth:1,borderRadius:14,alignItems:"center",justifyContent:"center"},heading:{gap:7,marginTop:18},eyebrow:{fontSize:10,letterSpacing:2,fontWeight:"800"},title:{fontSize:33,lineHeight:40,fontFamily:"serif",fontWeight:"700"},body:{fontSize:13,lineHeight:20},list:{gap:12},plan:{gap:9},planHeader:{flexDirection:"row",justifyContent:"space-between",gap:10},planName:{fontSize:17,lineHeight:22,fontWeight:"800"},idBadge:{borderRadius:10,paddingHorizontal:8,paddingVertical:5,alignSelf:"flex-start"},idText:{fontSize:9,fontWeight:"800",letterSpacing:1},label:{fontSize:10,fontWeight:"800",letterSpacing:1.3,marginTop:3},input:{minHeight:49,borderWidth:1,borderRadius:14,paddingHorizontal:14,fontSize:15},cycle:{minHeight:48,borderWidth:1,borderRadius:14,paddingHorizontal:14,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},cycleText:{fontSize:14,fontWeight:"700"},denied:{marginTop:50,alignItems:"center",gap:12},pressed:{opacity:.72,transform:[{scale:.98}]}});
