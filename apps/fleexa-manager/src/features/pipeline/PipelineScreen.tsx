import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { MessageSquareText, MoveRight, RefreshCw } from 'lucide-react-native';

import { safeFleexaApiErrorMessage } from '@fleexa/api-client';
import type { AttributionRef, DealSummary, PipelineStage } from '@fleexa/domain';
import { Button, StatusPill, colors, spacing } from '@fleexa/ui';

import { useMoveDealStage, usePipelineDeals, usePipelineStages } from '@/src/api/queries';

const ALL_SOURCES = 'all';

const formatAmount = (amount: DealSummary['amount']): string => {
  if (!amount) return 'No value';
  return `${Number(amount.amount).toLocaleString()} ${amount.currency}`;
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return 'No activity';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No activity';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const qualificationTone = (value: DealSummary['qualificationStatus']): 'neutral' | 'success' | 'warning' | 'danger' => {
  if (value === 'qualified') return 'success';
  if (value === 'unqualified') return 'danger';
  return 'warning';
};

const sourceForDeal = (deal: DealSummary): AttributionRef | null => deal.source ?? deal.trafficSource ?? null;

const sourceKeyForDeal = (deal: DealSummary): string => sourceForDeal(deal)?.key ?? 'unknown';

const sourceLabelForDeal = (deal: DealSummary): string => sourceForDeal(deal)?.label ?? 'No source';

const leadOriginLabelForDeal = (deal: DealSummary): string => deal.leadOrigin?.label ?? 'No origin';

const dealBelongsToStage = (deal: DealSummary, stageId: string): boolean => deal.stageId === stageId || deal.stage.id === stageId;

const normalizeStageColor = (value: string): string => (/^#[0-9A-Fa-f]{6}$/.test(value) ? value : colors.teal);

export const PipelineScreen = ({ accountId }: { accountId: string | null }) => {
  const { width } = useWindowDimensions();
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>(ALL_SOURCES);
  const [lostReasonDrafts, setLostReasonDrafts] = useState<Record<string, string>>({});
  const stages = usePipelineStages(accountId);
  const deals = usePipelineDeals(accountId, { limit: 100, sort: 'last_activity_desc' });
  const moveDealStage = useMoveDealStage(accountId);
  const isCompact = width < 720;
  const stageRows = useMemo(() => stages.data?.data ?? [], [stages.data?.data]);
  const dealRows = useMemo(() => deals.data?.data ?? [], [deals.data?.data]);
  const sourceOptions = useMemo(() => {
    const seen = new Map<string, string>();

    dealRows.forEach(deal => {
      const source = sourceForDeal(deal);
      if (!source) return;
      seen.set(source.key, source.label);
    });

    return Array.from(seen, ([key, label]) => ({ key, label })).sort((left, right) =>
      left.label.localeCompare(right.label)
    );
  }, [dealRows]);
  const visibleDeals = useMemo(() => {
    if (sourceFilter === ALL_SOURCES) return dealRows;
    return dealRows.filter(deal => sourceKeyForDeal(deal) === sourceFilter);
  }, [dealRows, sourceFilter]);
  const selectedStage = useMemo(
    () => stageRows.find(stage => stage.id === selectedStageId) ?? stageRows[0] ?? null,
    [selectedStageId, stageRows]
  );
  const selectableDeals = useMemo(() => {
    if (!isCompact || !selectedStage) return visibleDeals;
    return visibleDeals.filter(deal => dealBelongsToStage(deal, selectedStage.id));
  }, [isCompact, selectedStage, visibleDeals]);
  const selectedDeal = useMemo(
    () => selectableDeals.find(deal => deal.id === selectedDealId) ?? selectableDeals[0] ?? null,
    [selectableDeals, selectedDealId]
  );
  const selectedDealVisualId = selectedDeal?.id ?? null;
  const selectedStageVisualId = selectedStage?.id ?? null;
  const lostReasonDraft = selectedDeal
    ? lostReasonDrafts[selectedDeal.id] ?? selectedDeal.lostReason?.label ?? ''
    : '';

  const dealsForStage = (stageId: string) => visibleDeals.filter(deal => dealBelongsToStage(deal, stageId));

  const refreshPipeline = () => {
    void stages.refetch();
    void deals.refetch();
  };

  const moveSelectedDeal = (stage: PipelineStage) => {
    if (!selectedDeal || selectedDeal.stageId === stage.id || selectedDeal.stage.id === stage.id) return;

    moveDealStage.mutate(
      {
        dealId: selectedDeal.id,
        expectedVersion: selectedDeal.version,
        lostReasonLabel: stage.kind === 'lost' ? lostReasonDraft : null,
        stageId: stage.id,
      },
      {
        onSuccess: response => {
          setSelectedDealId(response.data.id);
          setSelectedStageId(response.data.stageId);
        },
      }
    );
  };

  if (!accountId) {
    return (
      <View style={styles.centerSurface}>
        <Text style={styles.emptyText}>No active account.</Text>
      </View>
    );
  }

  return (
    <View style={styles.pipeline} testID="pipeline-screen">
      <View style={[styles.pipelineHeader, isCompact && styles.pipelineHeaderCompact]}>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>Pipeline</Text>
          <Text style={styles.heading}>Deals by stage</Text>
        </View>
        <Pressable
          accessibilityLabel="Refresh pipeline"
          accessibilityRole="button"
          onPress={refreshPipeline}
          style={[styles.iconButton, (stages.isFetching || deals.isFetching) && styles.iconButtonActive]}
          testID="pipeline-refresh"
        >
          <RefreshCw size={18} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.filterBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: sourceFilter === ALL_SOURCES }}
          onPress={() => setSourceFilter(ALL_SOURCES)}
          style={[styles.filterChip, sourceFilter === ALL_SOURCES && styles.filterChipActive]}
        >
          <Text style={[styles.filterChipText, sourceFilter === ALL_SOURCES && styles.filterChipTextActive]}>
            All sources
          </Text>
        </Pressable>
        {sourceOptions.map(source => {
          const selected = sourceFilter === source.key;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={source.key}
              onPress={() => setSourceFilter(source.key)}
              style={[styles.filterChip, selected && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{source.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {stages.error ? <InlineError message={safeFleexaApiErrorMessage(stages.error)} /> : null}
      {deals.error ? <InlineError message={safeFleexaApiErrorMessage(deals.error)} /> : null}

      {stages.isLoading || deals.isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.teal} />
        </View>
      ) : null}

      {isCompact ? (
        <MobilePipeline
          deals={selectedStage ? dealsForStage(selectedStage.id) : []}
          onOpenDeal={setSelectedDealId}
          selectedDealId={selectedDealVisualId}
          selectedStageId={selectedStageVisualId}
          setSelectedStageId={setSelectedStageId}
          stages={stageRows}
        />
      ) : (
        <DesktopPipeline
          dealsForStage={dealsForStage}
          onOpenDeal={setSelectedDealId}
          selectedDealId={selectedDealVisualId}
          stages={stageRows}
        />
      )}

      {!stages.isLoading && !deals.isLoading && !stageRows.length ? (
        <Text style={styles.emptyText}>No pipeline stages returned by the Manager API.</Text>
      ) : null}

      {!deals.isLoading && stageRows.length > 0 && visibleDeals.length === 0 ? (
        <Text style={styles.emptyText}>No deals match this source.</Text>
      ) : null}

      <DealInspector
        deal={selectedDeal}
        isCompact={isCompact}
        isMoving={moveDealStage.isPending}
        lostReasonDraft={lostReasonDraft}
        moveError={moveDealStage.error}
        onChangeLostReason={value => {
          if (!selectedDeal) return;
          setLostReasonDrafts(current => ({ ...current, [selectedDeal.id]: value }));
        }}
        onMoveDeal={moveSelectedDeal}
        onRefresh={refreshPipeline}
        stages={stageRows}
      />
    </View>
  );
};

const DesktopPipeline = ({
  dealsForStage,
  onOpenDeal,
  selectedDealId,
  stages,
}: {
  dealsForStage: (stageId: string) => DealSummary[];
  onOpenDeal: (dealId: string) => void;
  selectedDealId: string | null;
  stages: PipelineStage[];
}) => (
  <ScrollView horizontal contentContainerStyle={styles.desktopBoard} showsHorizontalScrollIndicator={false}>
    {stages.map(stage => (
      <StageLane
        deals={dealsForStage(stage.id)}
        key={stage.id}
        onOpenDeal={onOpenDeal}
        selectedDealId={selectedDealId}
        stage={stage}
      />
    ))}
  </ScrollView>
);

const MobilePipeline = ({
  deals,
  onOpenDeal,
  selectedDealId,
  selectedStageId,
  setSelectedStageId,
  stages,
}: {
  deals: DealSummary[];
  onOpenDeal: (dealId: string) => void;
  selectedDealId: string | null;
  selectedStageId: string | null;
  setSelectedStageId: (stageId: string) => void;
  stages: PipelineStage[];
}) => (
  <View style={styles.mobileBoard}>
    <ScrollView horizontal contentContainerStyle={styles.stageTabs} showsHorizontalScrollIndicator={false} testID="pipeline-stage-tabs">
      {stages.map(stage => {
        const selected = selectedStageId === stage.id;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={stage.id}
            onPress={() => setSelectedStageId(stage.id)}
            style={[styles.stageTab, selected && styles.stageTabActive]}
          >
            <StageDot color={stage.color} />
            <Text style={[styles.stageTabText, selected && styles.stageTabTextActive]}>{stage.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
    <View style={styles.mobileDealList}>
      {deals.map(deal => (
        <DealRow
          deal={deal}
          key={deal.id}
          onOpenDeal={onOpenDeal}
          selected={selectedDealId === deal.id}
        />
      ))}
      {!deals.length ? <Text style={styles.emptyText}>No deals in this stage.</Text> : null}
    </View>
  </View>
);

const StageLane = ({
  deals,
  onOpenDeal,
  selectedDealId,
  stage,
}: {
  deals: DealSummary[];
  onOpenDeal: (dealId: string) => void;
  selectedDealId: string | null;
  stage: PipelineStage;
}) => (
  <View style={styles.stageLane}>
    <View style={styles.stageHeader}>
      <View style={styles.stageTitleRow}>
        <StageDot color={stage.color} />
        <Text numberOfLines={1} style={styles.stageTitle}>
          {stage.name}
        </Text>
      </View>
      <Text style={styles.stageMeta}>{deals.length.toLocaleString()}</Text>
    </View>
    <Text numberOfLines={1} style={styles.stageAmount}>
      {formatAmount(stage.counters?.totalAmount ?? null)}
    </Text>

    <View style={styles.dealStack}>
      {deals.map(deal => (
        <DealRow
          deal={deal}
          key={deal.id}
          onOpenDeal={onOpenDeal}
          selected={selectedDealId === deal.id}
        />
      ))}
      {!deals.length ? <Text style={styles.laneEmptyText}>No deals</Text> : null}
    </View>
  </View>
);

const DealRow = ({
  deal,
  onOpenDeal,
  selected,
}: {
  deal: DealSummary;
  onOpenDeal: (dealId: string) => void;
  selected: boolean;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected }}
    onPress={() => onOpenDeal(deal.id)}
    style={({ pressed }) => [
      styles.dealRow,
      selected && styles.dealRowSelected,
      pressed && styles.dealRowPressed,
    ]}
    testID="pipeline-deal-row"
  >
    <View style={styles.dealRowTop}>
      <Text numberOfLines={1} style={styles.dealTitle}>
        {deal.title || deal.clientName || 'Untitled deal'}
      </Text>
      <Text style={styles.dealAmount}>{formatAmount(deal.amount)}</Text>
    </View>
    <Text numberOfLines={1} style={styles.dealClient}>
      {deal.clientName ?? deal.contact?.displayName ?? 'Unknown client'}
    </Text>
    <View style={styles.dealBadges}>
      <StatusPill label={deal.qualificationStatus} tone={qualificationTone(deal.qualificationStatus)} />
      <StatusPill label={sourceLabelForDeal(deal)} tone="info" />
    </View>
    <Text numberOfLines={1} style={styles.dealMeta}>
      {leadOriginLabelForDeal(deal)} - {formatDateTime(deal.lastMessageAt ?? deal.lastActivityAt ?? deal.createdAt)}
    </Text>
  </Pressable>
);

const DealInspector = ({
  deal,
  isCompact,
  isMoving,
  lostReasonDraft,
  moveError,
  onChangeLostReason,
  onMoveDeal,
  onRefresh,
  stages,
}: {
  deal: DealSummary | null;
  isCompact: boolean;
  isMoving: boolean;
  lostReasonDraft: string;
  moveError: unknown;
  onChangeLostReason: (value: string) => void;
  onMoveDeal: (stage: PipelineStage) => void;
  onRefresh: () => void;
  stages: PipelineStage[];
}) => {
  const currentStageId = deal?.stageId ?? deal?.stage.id ?? null;
  const showLostReason = Boolean(
    deal?.lostReason ||
      deal?.qualificationStatus === 'unqualified' ||
      deal?.stageKey === 'lost' ||
      stages.find(stage => stage.id === currentStageId)?.kind === 'lost'
  );

  return (
    <View
      style={[styles.inspector, isCompact ? styles.inspectorMobile : styles.inspectorDesktop]}
      testID="pipeline-detail-panel"
    >
      <View style={styles.inspectorHeader}>
        <View style={styles.titleBlock}>
          <Text style={styles.inspectorTitle}>Deal</Text>
          <Text numberOfLines={1} style={styles.inspectorSubtitle}>
            {deal ? deal.clientName ?? deal.title : 'Select a deal'}
          </Text>
        </View>
        <Pressable accessibilityLabel="Refresh selected deal" accessibilityRole="button" onPress={onRefresh} style={styles.smallIconButton}>
          <RefreshCw size={16} color={colors.text} />
        </Pressable>
      </View>

      {moveError ? <InlineError message={safeFleexaApiErrorMessage(moveError)} /> : null}

      {!deal ? <Text style={styles.emptyText}>Open a deal from the pipeline list.</Text> : null}

      {deal ? (
        <>
          <View style={styles.inspectorFields}>
            <FieldRow label="Client" value={deal.clientName ?? deal.contact?.displayName ?? 'Unknown'} />
            <FieldRow label="Amount" value={formatAmount(deal.amount)} />
            <FieldRow label="Stage" value={deal.stageLabel || deal.stage.name || deal.stageKey} />
            <FieldRow label="Qualification" value={deal.qualificationStatus} />
            <FieldRow label="Source" value={sourceLabelForDeal(deal)} />
            <FieldRow label="Lead origin" value={leadOriginLabelForDeal(deal)} />
            <FieldRow label="Assigned" value={deal.assignedManager?.displayName ?? deal.assignee?.displayName ?? 'Unassigned'} />
            {showLostReason ? <FieldRow label="Lost reason" value={deal.lostReason?.label ?? 'Not set'} /> : null}
          </View>

          {showLostReason ? (
            <View style={styles.lostReasonBox}>
              <Text style={styles.inputLabel}>Lost reason</Text>
              <TextInput
                onChangeText={onChangeLostReason}
                placeholder="Reason"
                placeholderTextColor="#7A8497"
                style={styles.lostReasonInput}
                value={lostReasonDraft}
              />
            </View>
          ) : null}

          <View style={styles.moveSection}>
            <Text style={styles.inputLabel}>Move stage</Text>
            <View style={styles.moveGrid}>
              {stages.map(stage => {
                const selected = currentStageId === stage.id;

                return (
                  <Pressable
                    accessibilityRole="button"
                    disabled={selected || isMoving}
                    key={stage.id}
                    onPress={() => onMoveDeal(stage)}
                    style={[styles.moveButton, selected && styles.moveButtonSelected, isMoving && styles.moveButtonDisabled]}
                    testID={`pipeline-move-stage-${stage.id}`}
                  >
                    <StageDot color={stage.color} />
                    <Text numberOfLines={1} style={[styles.moveButtonText, selected && styles.moveButtonTextSelected]}>
                      {stage.name}
                    </Text>
                    {!selected ? <MoveRight size={14} color={colors.textMuted} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {deal.conversationId ? (
            <Button
              label="Open conversation"
              leftIcon={<MessageSquareText size={16} color="#FFFFFF" />}
              onPress={() => router.push(`/conversation/${encodeURIComponent(deal.conversationId ?? '')}` as Href)}
              testID="pipeline-open-conversation"
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
};

const FieldRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.fieldRow}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text numberOfLines={2} style={styles.fieldValue}>
      {value}
    </Text>
  </View>
);

const StageDot = ({ color }: { color: string }) => (
  <View style={[styles.stageDot, { backgroundColor: normalizeStageColor(color) }]} />
);

const InlineError = ({ message }: { message: string }) => (
  <View style={styles.inlineError}>
    <Text style={styles.errorText}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  pipeline: {
    gap: spacing.lg,
  },
  pipelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  pipelineHeaderCompact: {
    alignItems: 'flex-start',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heading: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconButtonActive: {
    borderColor: colors.teal,
    backgroundColor: '#E7F7F6',
  },
  filterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  filterChipActive: {
    borderColor: colors.teal,
    backgroundColor: '#E7F7F6',
  },
  filterChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  filterChipTextActive: {
    color: colors.text,
  },
  loadingRow: {
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopBoard: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  stageLane: {
    width: 288,
    minHeight: 360,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.md,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  stageTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stageTitle: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  stageMeta: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  stageAmount: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  dealStack: {
    gap: spacing.sm,
  },
  dealRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FBFCFE',
    padding: spacing.md,
    gap: spacing.xs,
  },
  dealRowSelected: {
    borderColor: colors.teal,
    backgroundColor: '#F3FCFB',
  },
  dealRowPressed: {
    opacity: 0.78,
  },
  dealRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  dealTitle: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  dealAmount: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  dealClient: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  dealBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dealMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  laneEmptyText: {
    color: colors.textMuted,
    fontSize: 13,
    paddingVertical: spacing.md,
  },
  mobileBoard: {
    gap: spacing.md,
  },
  stageTabs: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  stageTab: {
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  stageTabActive: {
    borderColor: colors.teal,
    backgroundColor: '#E7F7F6',
  },
  stageTabText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  stageTabTextActive: {
    color: colors.text,
  },
  mobileDealList: {
    gap: spacing.sm,
  },
  inspector: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  inspectorDesktop: {
    maxWidth: 760,
  },
  inspectorMobile: {
    padding: spacing.md,
  },
  inspectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  inspectorTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  inspectorSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  smallIconButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectorFields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  fieldRow: {
    minWidth: 148,
    flexGrow: 1,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  fieldValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  lostReasonBox: {
    gap: spacing.xs,
  },
  inputLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  lostReasonInput: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: spacing.md,
  },
  moveSection: {
    gap: spacing.sm,
  },
  moveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  moveButton: {
    minHeight: 38,
    maxWidth: 210,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  moveButtonSelected: {
    borderColor: colors.teal,
    backgroundColor: '#E7F7F6',
  },
  moveButtonDisabled: {
    opacity: 0.62,
  },
  moveButtonText: {
    flex: 1,
    minWidth: 0,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  moveButtonTextSelected: {
    color: colors.text,
  },
  centerSurface: {
    minHeight: 180,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  inlineError: {
    borderRadius: 8,
    backgroundColor: '#FDE7EA',
    padding: spacing.md,
  },
  errorText: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
