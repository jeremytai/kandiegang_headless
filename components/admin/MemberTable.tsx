import React, { useState, useMemo, useCallback } from 'react';
import { MemberAnalytics, OrderHistoryEntry } from '../../types/analytics';
import { supabase } from '../../lib/supabaseClient';

interface MemberTableProps {
  members: MemberAnalytics[];
}

type SortColumn = keyof MemberAnalytics | null;
type SortDirection = 'asc' | 'desc';

/* ─── Badge helper ─── */
function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}14`, color, border: `1px solid ${color}30` }}
    >
      {children}
    </span>
  );
}

/* ─── Toggle switch ─── */
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-[#ff611a]' : 'bg-neutral-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </button>
      <span className="text-sm text-neutral-600">{label}</span>
    </label>
  );
}

/* ─── Detail section label ─── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-neutral-400 text-xs font-medium uppercase tracking-[0.15em] mb-3">
      {children}
    </h4>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-neutral-400 text-xs mb-0.5">{label}</div>
      <div className="text-neutral-900 text-sm">
        {value || <span className="text-neutral-300">—</span>}
      </div>
    </div>
  );
}

/* ─── Merge search component ─── */
function MergeSearch({
  currentMember,
  allMembers,
  onMerged,
}: {
  currentMember: MemberAnalytics;
  allMembers: MemberAnalytics[];
  onMerged: (targetId: string, sourceId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [merging, setMerging] = useState(false);
  const [mergeMsg, setMergeMsg] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return allMembers
      .filter(
        (m) =>
          m.id !== currentMember.id &&
          (m.display_name?.toLowerCase().includes(q) ||
            m.email?.toLowerCase().includes(q) ||
            m.first_name?.toLowerCase().includes(q) ||
            m.last_name?.toLowerCase().includes(q))
      )
      .slice(0, 5);
  }, [query, allMembers, currentMember.id]);

  const handleMerge = async (sourceId: string) => {
    setMerging(true);
    setMergeMsg(null);
    try {
      const {
        data: { session },
      } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch('/api/merge-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ targetId: currentMember.id, sourceId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const { merged } = await res.json();
      setMergeMsg(`Merged! +${merged.newOrders} orders, ${merged.alternateEmails.length} alt emails`);
      setQuery('');
      setConfirmId(null);
      onMerged(currentMember.id, sourceId);
    } catch (err) {
      setMergeMsg(err instanceof Error ? err.message : 'Merge failed');
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-neutral-400 text-xs mb-1">
        Search for a profile to merge into this one
      </div>
      <input
        type="text"
        placeholder="Search by name or email..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setConfirmId(null); }}
        className="w-full bg-white border border-neutral-200 text-neutral-900 px-3 py-1.5 rounded text-sm focus:outline-none focus:border-[#ff611a] transition-colors"
      />
      {results.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {results.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-2 rounded border border-neutral-100 bg-white"
            >
              <div>
                <div className="text-sm text-neutral-900">{m.display_name || m.email}</div>
                <div className="text-xs text-neutral-400">
                  {m.email} — {m.order_count || 0} orders, €{(m.lifetime_value || 0).toFixed(2)}
                </div>
              </div>
              {confirmId === m.id ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={merging}
                    onClick={() => handleMerge(m.id)}
                    className="px-3 py-1 rounded text-xs font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    {merging ? 'Merging…' : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="px-2 py-1 rounded text-xs text-neutral-500 hover:text-neutral-900"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmId(m.id)}
                  className="px-3 py-1 rounded text-xs font-medium bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                >
                  Merge
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {mergeMsg && (
        <div
          className={`text-xs ${mergeMsg.startsWith('Merged') ? 'text-emerald-500' : 'text-red-500'}`}
        >
          {mergeMsg}
        </div>
      )}
    </div>
  );
}

/* ─── Expanded detail panel ─── */
function MemberDetailPanel({
  member,
  allMembers,
  onUpdate,
  onMerged,
}: {
  member: MemberAnalytics;
  allMembers: MemberAnalytics[];
  onUpdate: (id: string, updates: Partial<MemberAnalytics>) => void;
  onMerged: (targetId: string, sourceId: string) => void;
}) {
  const [editState, setEditState] = useState({
    is_guide: member.is_guide,
    is_member: member.is_member,
    display_name: member.display_name || '',
    accepts_marketing: member.accepts_marketing,
    member_since: member.member_since ? member.member_since.slice(0, 10) : '',
    membership_expiration: member.membership_expiration
      ? member.membership_expiration.slice(0, 10)
      : '',
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const isDirty =
    editState.is_guide !== member.is_guide ||
    editState.is_member !== member.is_member ||
    editState.display_name !== (member.display_name || '') ||
    editState.accepts_marketing !== member.accepts_marketing ||
    editState.member_since !== (member.member_since ? member.member_since.slice(0, 10) : '') ||
    editState.membership_expiration !==
      (member.membership_expiration ? member.membership_expiration.slice(0, 10) : '');

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const {
        data: { session },
      } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch('/api/admin-update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          memberId: member.id,
          updates: {
            is_guide: editState.is_guide,
            is_member: editState.is_member,
            display_name: editState.display_name || null,
            accepts_marketing: editState.accepts_marketing,
            member_since: editState.member_since || null,
            membership_expiration: editState.membership_expiration || null,
          },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      onUpdate(member.id, {
        is_guide: editState.is_guide,
        is_member: editState.is_member,
        display_name: editState.display_name || '',
        accepts_marketing: editState.accepts_marketing,
        member_since: editState.member_since || null,
        membership_expiration: editState.membership_expiration || null,
      });
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(null), 2000);
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const [orders, setOrders] = useState<OrderHistoryEntry[]>(
    () => (member.order_history ?? []) as OrderHistoryEntry[]
  );
  const [ordersDirty, setOrdersDirty] = useState(false);
  const [savingOrders, setSavingOrders] = useState(false);
  const [orderSaveMsg, setOrderSaveMsg] = useState<string | null>(null);

  const removeOrder = (index: number) => {
    setOrders((prev) => prev.filter((_, i) => i !== index));
    setOrdersDirty(true);
  };

  const saveOrders = async () => {
    setSavingOrders(true);
    setOrderSaveMsg(null);
    try {
      const {
        data: { session },
      } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      if (!session?.access_token) throw new Error('Not authenticated');

      const orderCount = orders.length;
      const lifetimeValue =
        Math.round(orders.reduce((s, o) => s + (parseFloat(String(o.total)) || 0), 0) * 100) / 100;
      const avgOrderValue =
        orderCount > 0 ? Math.round((lifetimeValue / orderCount) * 100) / 100 : 0;
      const lastOrderDate = orders.reduce((latest: string | null, o) => {
        if (!o.date) return latest;
        const d = String(o.date).substring(0, 10);
        return !latest || d > latest ? d : latest;
      }, null);

      const res = await fetch('/api/admin-update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          memberId: member.id,
          updates: {
            order_history: orders,
            order_count: orderCount,
            lifetime_value: lifetimeValue,
            avg_order_value: avgOrderValue,
            last_order_date: lastOrderDate,
          },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      onUpdate(member.id, {
        order_history: orders,
        order_count: orderCount,
        lifetime_value: lifetimeValue,
        avg_order_value: avgOrderValue,
        last_order_date: lastOrderDate,
      });
      setOrdersDirty(false);
      setOrderSaveMsg('Saved');
      setTimeout(() => setOrderSaveMsg(null), 2000);
    } catch (err) {
      setOrderSaveMsg(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingOrders(false);
    }
  };
  const address = [
    member.billing_address_1,
    member.billing_city,
    member.billing_postcode,
    member.billing_country,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="bg-[#fafafa] border-t border-neutral-200 px-6 py-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Profile */}
        <div>
          <SectionLabel>Profile</SectionLabel>
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-3">
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 text-sm font-medium">
                  {(member.display_name || member.email || '?')[0].toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-neutral-900 text-sm font-medium">
                  {member.first_name || member.last_name
                    ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                    : member.display_name || 'N/A'}
                </div>
                <div className="text-neutral-400 text-xs">{member.email}</div>
                {member.alternate_emails && member.alternate_emails.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {member.alternate_emails.map((alt) => (
                      <span key={alt} className="text-[10px] text-neutral-400 bg-neutral-50 border border-neutral-100 px-1.5 py-0.5 rounded">
                        {alt}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DetailField label="Discord" value={member.username} />
            <DetailField label="Phone" value={member.billing_phone} />
            <DetailField label="Address" value={address} />
          </div>
        </div>

        {/* Membership & Subscription */}
        <div>
          <SectionLabel>Membership</SectionLabel>
          <div className="space-y-2">
            <DetailField label="Source" value={member.membership_source} />
            <DetailField
              label="Plans"
              value={member.membership_plans?.length ? member.membership_plans.join(', ') : null}
            />
            <DetailField
              label="Member Since"
              value={
                member.member_since ? new Date(member.member_since).toLocaleDateString() : null
              }
            />
            <DetailField
              label="Expires"
              value={
                member.membership_expiration
                  ? new Date(member.membership_expiration).toLocaleDateString()
                  : null
              }
            />
            <DetailField label="Stripe Status" value={member.stripe_subscription_status} />
            <DetailField
              label="Period End"
              value={
                member.subscription_current_period_end
                  ? new Date(member.subscription_current_period_end).toLocaleDateString()
                  : null
              }
            />
            {member.subscription_cancel_at_period_end && (
              <Badge color="#ef4444">Cancels at period end</Badge>
            )}
          </div>
        </div>

        {/* Newsletter Engagement */}
        <div>
          <SectionLabel>Newsletter</SectionLabel>
          <div className="space-y-2">
            <DetailField
              label="Status"
              value={
                member.newsletter_status ? (
                  <Badge
                    color={
                      member.newsletter_status === 'subscribed'
                        ? '#10B981'
                        : member.newsletter_status === 'unsubscribed'
                          ? '#ef4444'
                          : '#a3a3a3'
                    }
                  >
                    {member.newsletter_status}
                  </Badge>
                ) : null
              }
            />
            <DetailField label="Source" value={member.newsletter_source} />
            <DetailField
              label="Emails Sent"
              value={member.email_count || 0}
            />
            <DetailField
              label="Last Opened"
              value={
                member.last_email_open
                  ? new Date(member.last_email_open).toLocaleDateString()
                  : null
              }
            />
            <DetailField
              label="Last Clicked"
              value={
                member.last_email_click
                  ? new Date(member.last_email_click).toLocaleDateString()
                  : null
              }
            />
            <DetailField
              label="Last Page View"
              value={
                member.last_page_view
                  ? new Date(member.last_page_view).toLocaleDateString()
                  : null
              }
            />
          </div>
        </div>

        {/* Orders */}
        <div>
          <SectionLabel>Purchase History</SectionLabel>
          <div className="space-y-2 mb-3">
            <DetailField label="Total Orders" value={orders.length} />
            <DetailField
              label="Lifetime Value"
              value={`€${orders.reduce((s, o) => s + (parseFloat(String(o.total)) || 0), 0).toFixed(2)}`}
            />
            <DetailField
              label="Avg Order"
              value={
                orders.length > 0
                  ? `€${(orders.reduce((s, o) => s + (parseFloat(String(o.total)) || 0), 0) / orders.length).toFixed(2)}`
                  : null
              }
            />
          </div>
          {orders.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-neutral-400 text-xs">Orders</div>
                {ordersDirty && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={savingOrders}
                      onClick={saveOrders}
                      className="px-3 py-1 rounded text-xs font-medium bg-neutral-900 text-white hover:bg-[#ff611a] transition-colors"
                    >
                      {savingOrders ? 'Saving…' : 'Save Changes'}
                    </button>
                    {orderSaveMsg && (
                      <span className={`text-xs ${orderSaveMsg === 'Saved' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {orderSaveMsg}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {orders.map((order, i) => (
                  <div
                    key={`${order.order_id || i}-${order.date}`}
                    className="group p-2 rounded border border-neutral-100 bg-white relative"
                  >
                    <button
                      type="button"
                      onClick={() => removeOrder(i)}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-neutral-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove order"
                    >
                      ×
                    </button>
                    <div className="flex items-center justify-between text-xs mb-1 pr-5">
                      <span className="text-neutral-400">
                        {order.date ? new Date(order.date).toLocaleDateString() : '—'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-900 font-mono font-medium">
                          €{Number(order.total || 0).toFixed(2)}
                        </span>
                        {order.discount ? (
                          <span className="text-emerald-600 font-mono">
                            -€{Number(order.discount).toFixed(2)}
                          </span>
                        ) : null}
                        {order.status && (
                          <Badge color={order.status === 'completed' ? '#10B981' : '#a3a3a3'}>
                            {order.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {order.products && order.products.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {order.products.map((product, j) => (
                          <span
                            key={j}
                            className="text-[10px] text-neutral-500 bg-neutral-50 border border-neutral-100 px-1.5 py-0.5 rounded"
                          >
                            {product}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Editable Fields */}
        <div>
          <SectionLabel>Edit</SectionLabel>
          <div className="space-y-4">
            <div>
              <label className="block text-neutral-400 text-xs mb-1">Display Name</label>
              <input
                type="text"
                value={editState.display_name}
                onChange={(e) => setEditState((s) => ({ ...s, display_name: e.target.value }))}
                className="w-full bg-white border border-neutral-200 text-neutral-900 px-3 py-1.5 rounded text-sm focus:outline-none focus:border-[#ff611a] transition-colors"
              />
            </div>
            <Toggle
              label="Guide"
              checked={editState.is_guide}
              onChange={(v) => setEditState((s) => ({ ...s, is_guide: v }))}
            />
            <Toggle
              label="Member"
              checked={editState.is_member}
              onChange={(v) => setEditState((s) => ({ ...s, is_member: v }))}
            />
            <Toggle
              label="Accepts Marketing"
              checked={editState.accepts_marketing}
              onChange={(v) => setEditState((s) => ({ ...s, accepts_marketing: v }))}
            />
            <div>
              <label
                htmlFor={`member-since-${member.id}`}
                className="block text-neutral-400 text-xs mb-1"
              >
                Member Since
              </label>
              <input
                id={`member-since-${member.id}`}
                type="date"
                value={editState.member_since}
                onChange={(e) => setEditState((s) => ({ ...s, member_since: e.target.value }))}
                className="w-full bg-white border border-neutral-200 text-neutral-900 px-3 py-1.5 rounded text-sm focus:outline-none focus:border-[#ff611a] transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor={`membership-exp-${member.id}`}
                className="block text-neutral-400 text-xs mb-1"
              >
                Membership Expiration
              </label>
              <input
                id={`membership-exp-${member.id}`}
                type="date"
                value={editState.membership_expiration}
                onChange={(e) =>
                  setEditState((s) => ({ ...s, membership_expiration: e.target.value }))
                }
                className="w-full bg-white border border-neutral-200 text-neutral-900 px-3 py-1.5 rounded text-sm focus:outline-none focus:border-[#ff611a] transition-colors"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={!isDirty || saving}
                onClick={handleSave}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  isDirty
                    ? 'bg-neutral-900 text-white hover:bg-[#ff611a]'
                    : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                }`}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              {saveMsg && (
                <span
                  className={`text-xs ${saveMsg === 'Saved' ? 'text-emerald-500' : 'text-red-500'}`}
                >
                  {saveMsg}
                </span>
              )}
            </div>

            <div className="border-t border-neutral-200 pt-4 mt-4">
              <SectionLabel>Merge Profile</SectionLabel>
              <MergeSearch
                currentMember={member}
                allMembers={allMembers}
                onMerged={onMerged}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      {member.tags && member.tags.length > 0 && (
        <div>
          <SectionLabel>Tags</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {member.tags.map((tag) => (
              <Badge key={tag} color="#171717">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main table ─── */
export function MemberTable({ members }: MemberTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('lifetime_value');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localMembers, setLocalMembers] = useState<MemberAnalytics[]>(members);

  React.useEffect(() => {
    setLocalMembers(members);
  }, [members]);

  const handleUpdate = useCallback((id: string, updates: Partial<MemberAnalytics>) => {
    setLocalMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  }, []);

  const handleMerged = useCallback((targetId: string, sourceId: string) => {
    // Remove source profile from list and refresh (page reload for simplicity)
    setLocalMembers((prev) => prev.filter((m) => m.id !== sourceId));
    setExpandedId(null);
    // Small delay then reload to get fresh merged data
    setTimeout(() => window.location.reload(), 1000);
  }, []);

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedMembers = useMemo(() => {
    const filtered = localMembers.filter((member) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        member.display_name?.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query)
      );
    });

    if (sortColumn) {
      filtered.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }

        return 0;
      });
    }

    return filtered;
  }, [localMembers, searchQuery, sortColumn, sortDirection]);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (column !== sortColumn) return null;
    return <span className="ml-1 text-[#ff611a]">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  const thClass =
    'text-left py-3 px-4 text-neutral-400 text-xs font-medium uppercase tracking-[0.1em] cursor-pointer hover:text-[#ff611a] transition-colors';

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-neutral-400 text-xs font-medium uppercase tracking-[0.15em]">
          Members
        </h3>
        <input
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-[#fafafa] border border-neutral-200 text-neutral-900 px-4 py-2 rounded-lg text-sm focus:outline-none focus:border-[#ff611a] transition-colors placeholder:text-neutral-300"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className={thClass} onClick={() => handleSort('display_name')}>
                Name <SortIcon column="display_name" />
              </th>
              <th className={thClass} onClick={() => handleSort('email')}>
                Email <SortIcon column="email" />
              </th>
              <th
                className={`${thClass} !text-right`}
                onClick={() => handleSort('lifetime_value')}
              >
                LTV <SortIcon column="lifetime_value" />
              </th>
              <th className={`${thClass} !text-right`} onClick={() => handleSort('order_count')}>
                Orders <SortIcon column="order_count" />
              </th>
              <th
                className={`${thClass} !text-right`}
                onClick={() => handleSort('event_participation_count')}
              >
                Events <SortIcon column="event_participation_count" />
              </th>
              <th className="text-left py-3 px-4 text-neutral-400 text-xs font-medium uppercase tracking-[0.1em]">
                Role
              </th>
              <th className="text-left py-3 px-4 text-neutral-400 text-xs font-medium uppercase tracking-[0.1em]">
                Status
              </th>
              <th className={thClass} onClick={() => handleSort('last_login')}>
                Last Login <SortIcon column="last_login" />
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedMembers.map((member) => (
              <React.Fragment key={member.id}>
                <tr
                  className={`border-b border-neutral-100 cursor-pointer transition-colors ${
                    expandedId === member.id ? 'bg-[#fafafa]' : 'hover:bg-[#fafafa]'
                  }`}
                  onClick={() => setExpandedId(expandedId === member.id ? null : member.id)}
                >
                  <td className="py-3 px-4 text-neutral-900 font-medium">
                    {member.display_name || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-neutral-500">{member.email}</td>
                  <td className="py-3 px-4 text-neutral-900 text-right font-mono">
                    €{(member.lifetime_value || 0).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-neutral-900 text-right">
                    {member.order_count || 0}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {member.event_participation_count ? (
                      <Badge color="#ff611a">{member.event_participation_count} events</Badge>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {member.is_guide && <Badge color="#ff611a">Guide</Badge>}
                      {member.is_member && <Badge color="#171717">Member</Badge>}
                      {!member.is_guide && !member.is_member && (
                        <span className="text-neutral-300">—</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {member.stripe_subscription_status === 'active' && (
                      <Badge color="#10B981">Active</Badge>
                    )}
                    {member.stripe_subscription_status === 'trialing' && (
                      <Badge color="#ff611a">Trial</Badge>
                    )}
                    {member.stripe_subscription_status === 'canceled' && (
                      <Badge color="#a3a3a3">Canceled</Badge>
                    )}
                    {!member.stripe_subscription_status && <Badge color="#a3a3a3">No Sub</Badge>}
                    {member.is_at_risk && (
                      <span className="ml-1">
                        <Badge color="#ef4444">⚠ {member.days_until_expiration}d</Badge>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-neutral-500">
                    {member.last_login ? (
                      new Date(member.last_login).toLocaleDateString()
                    ) : (
                      <span className="text-neutral-300">Never</span>
                    )}
                  </td>
                </tr>
                {expandedId === member.id && (
                  <tr>
                    <td colSpan={8} className="p-0">
                      <MemberDetailPanel
                        member={member}
                        allMembers={localMembers}
                        onUpdate={handleUpdate}
                        onMerged={handleMerged}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {filteredAndSortedMembers.length === 0 && (
          <div className="text-center py-8 text-neutral-400">No members found</div>
        )}
      </div>

      <div className="mt-4 text-neutral-400 text-sm">
        Showing {filteredAndSortedMembers.length} of {localMembers.length} members
      </div>
    </div>
  );
}
