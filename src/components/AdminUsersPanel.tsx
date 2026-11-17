import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Edit3,
  Plus,
  Search,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {
  usePlatform,
  type AdminUserEditInput,
  type InvitedUserInput,
} from '../context/PlatformContext';
import { ADMIN_EMAIL } from '../data/defaultApps';
import {
  APPROVAL_STATUS_LABELS,
  SCHEMA_LIMITS,
  type ApprovalStatus,
  type InvitedUser,
  type UserProfile,
  type UserRole,
} from '../types/platform';
import { formatDurationAr } from '../utils/device';

interface CustomFieldRow {
  key: string;
  value: string;
}

type EditorTarget =
  | { kind: 'existing'; user: UserProfile }
  | { kind: 'invited'; invite: InvitedUser }
  | { kind: 'new' };

const QUICK_CUSTOM_KEYS = [
  'الوردية',
  'خط الإنتاج الفرعي',
  'المشرف المباشر',
  'تاريخ التعيين',
  'درجة المهارة',
];

function recordToRows(customFields?: Record<string, string>): CustomFieldRow[] {
  if (!customFields) return [];
  return Object.entries(customFields).map(([key, value]) => ({ key, value }));
}

function rowsToRecord(rows: CustomFieldRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    const k = r.key.trim().slice(0, SCHEMA_LIMITS.CUSTOM_KEY_MAX);
    const v = r.value.trim().slice(0, SCHEMA_LIMITS.CUSTOM_VALUE_MAX);
    if (k) out[k] = v;
  }
  return out;
}

export const AdminUsersPanel: React.FC = () => {
  const {
    allUsers,
    invitedUsers,
    updateUserApproval,
    saveUserByAdmin,
    addOrUpdateInvitedUser,
    removeInvitedUser,
  } = usePlatform();

  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ApprovalStatus>('all');
  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null);

  // Editor state
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('approved');
  const [adminNotes, setAdminNotes] = useState('');
  const [customRows, setCustomRows] = useState<CustomFieldRow[]>([]);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [newValInput, setNewValInput] = useState('');
  const [savingEditor, setSavingEditor] = useState(false);
  const [editorFeedback, setEditorFeedback] = useState('');
  const [editorError, setEditorError] = useState('');

  const pendingUsers = useMemo(
    () => allUsers.filter((u) => u.role !== 'admin' && u.approvalStatus === 'pending'),
    [allUsers]
  );

  // Exclude invited records whose email already exists in allUsers
  const pendingInvites = useMemo(() => {
    const registeredEmails = new Set(allUsers.map((u) => u.email.toLowerCase()));
    return invitedUsers.filter((inv) => !registeredEmails.has(inv.email.toLowerCase()));
  }, [allUsers, invitedUsers]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allUsers.filter((u) => {
      if (statusFilter !== 'all' && u.approvalStatus !== statusFilter) return false;
      if (q) {
        const customStr = Object.entries(u.customFields || {})
          .map(([k, v]) => `${k} ${v}`)
          .join(' ');
        const hay =
          `${u.displayName} ${u.email} ${u.employeeCode} ${u.phone} ${u.jobTitle} ${u.company} ${u.adminNotes || ''} ${customStr}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allUsers, searchTerm, statusFilter]);

  const handleApprovalChange = async (uid: string, status: ApprovalStatus) => {
    setUpdatingUid(uid);
    try {
      await updateUserApproval(uid, status);
    } finally {
      setUpdatingUid(null);
    }
  };

  const openEditorForExisting = (u: UserProfile) => {
    setEditorTarget({ kind: 'existing', user: u });
    setEmail(u.email);
    setDisplayName(u.displayName);
    setEmployeeCode(u.employeeCode || '');
    setPhone(u.phone || '');
    setJobTitle(u.jobTitle || '');
    setCompany(u.company || '');
    setRole(u.role);
    setApprovalStatus(u.approvalStatus);
    setAdminNotes(u.adminNotes || '');
    setCustomRows(recordToRows(u.customFields));
    setNewKeyInput('');
    setNewValInput('');
    setEditorFeedback('');
    setEditorError('');
  };

  const openEditorForInvited = (inv: InvitedUser) => {
    setEditorTarget({ kind: 'invited', invite: inv });
    setEmail(inv.email);
    setDisplayName(inv.displayName);
    setEmployeeCode(inv.employeeCode || '');
    setPhone(inv.phone || '');
    setJobTitle(inv.jobTitle || '');
    setCompany(inv.company || '');
    setRole(inv.role);
    setApprovalStatus(inv.approvalStatus);
    setAdminNotes(inv.adminNotes || '');
    setCustomRows(recordToRows(inv.customFields));
    setNewKeyInput('');
    setNewValInput('');
    setEditorFeedback('');
    setEditorError('');
  };

  const openNewUserModal = () => {
    setEditorTarget({ kind: 'new' });
    setEmail('');
    setDisplayName('');
    setEmployeeCode('');
    setPhone('');
    setJobTitle('');
    setCompany('');
    setRole('user');
    setApprovalStatus('approved');
    setAdminNotes('');
    setCustomRows([]);
    setNewKeyInput('');
    setNewValInput('');
    setEditorFeedback('');
    setEditorError('');
  };

  const handleAddCustomFieldRow = (presetKey?: string) => {
    const keyToAdd = (presetKey ?? newKeyInput).trim();
    if (!keyToAdd) return;
    if (customRows.length >= SCHEMA_LIMITS.CUSTOM_FIELDS_MAX) {
      setEditorError(`الحد الأقصى للحقول الإضافية هو ${SCHEMA_LIMITS.CUSTOM_FIELDS_MAX} حقل.`);
      return;
    }
    if (customRows.some((r) => r.key.trim() === keyToAdd)) {
      setEditorError('هذا الحقل موجود بالفعل، يمكنك تعديل قيمته مباشرة.');
      return;
    }
    setEditorError('');
    setCustomRows((prev) => [
      ...prev,
      { key: keyToAdd, value: presetKey ? '' : newValInput.trim() },
    ]);
    if (!presetKey) {
      setNewKeyInput('');
      setNewValInput('');
    }
  };

  const handleSaveEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editorTarget) return;
    setEditorError('');
    setEditorFeedback('');

    if (!displayName.trim()) {
      setEditorError('يرجى إدخال اسم العضو.');
      return;
    }

    if (editorTarget.kind === 'new' || editorTarget.kind === 'invited') {
      const cleanMail = email.trim().toLowerCase();
      if (!cleanMail || !cleanMail.includes('@')) {
        setEditorError('يرجى إدخال بريد Gmail صحيح للحساب الجديد.');
        return;
      }
    }

    const customFieldsMap = rowsToRecord(customRows);

    setSavingEditor(true);
    try {
      if (editorTarget.kind === 'existing') {
        const payload: AdminUserEditInput = {
          displayName,
          employeeCode,
          phone,
          jobTitle,
          company,
          role,
          approvalStatus,
          adminNotes,
          customFields: customFieldsMap,
        };
        await saveUserByAdmin(editorTarget.user.uid, payload);
        setEditorFeedback('تم تحديث جميع بيانات الحساب والحقول الإضافية بنجاح.');
      } else {
        const payload: InvitedUserInput = {
          email,
          displayName,
          employeeCode,
          phone,
          jobTitle,
          company,
          role,
          approvalStatus,
          adminNotes,
          customFields: customFieldsMap,
        };
        const result = await addOrUpdateInvitedUser(payload);
        setEditorFeedback(
          result === 'updated_existing'
            ? 'الحساب مسجل بالفعل — تم تحديث بياناته بنجاح.'
            : 'تم حفظ بيانات الحساب بنجاح، وسيتم ربطها تلقائياً عند تسجيل دخوله بحساب Google.'
        );
      }
      setTimeout(() => {
        setEditorTarget(null);
      }, 900);
    } catch {
      setEditorError('تعذر حفظ البيانات، يرجى التأكد من الحقول والصلاحيات.');
    } finally {
      setSavingEditor(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending Approvals Queue */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              طلبات الانضمام بانتظار موافقتك ({pendingUsers.length})
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              لن يتمكن أي مستخدم جديد من فتح أو رؤية التطبيقات حتى تقوم بقبول حسابه من هنا.
            </p>
          </div>
        </div>

        {pendingUsers.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            لا توجد طلبات معلقة حالياً.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {pendingUsers.map((u) => {
              const busyUser = updatingUid === u.uid;
              return (
                <div
                  key={u.uid}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        بانتظار الموافقة
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {u.profileCompleted ? 'مكتمل البيانات' : 'لم يستكمل بياناته بعد'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-nums">{u.platformInfo || 'Web'}</span>
                    </div>

                    <p className="text-base font-bold text-zinc-900 dark:text-white">
                      {u.displayName}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                      <span
                        className="font-mono-nums font-bold text-red-700 dark:text-red-400"
                        dir="ltr"
                      >
                        كود: {u.employeeCode || '—'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-latin" dir="ltr">
                        {u.email}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-nums" dir="ltr">
                        {u.phone || 'بدون هاتف'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{u.jobTitle || 'بدون مسمى'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{u.company || 'بدون قسم'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditorForExisting(u)}
                      className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>تعديل وإضافة بيانات</span>
                    </button>
                    <button
                      type="button"
                      disabled={busyUser}
                      onClick={() => void handleApprovalChange(u.uid, 'approved')}
                      className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" />
                      <span>قبول وتفعيل</span>
                    </button>
                    <button
                      type="button"
                      disabled={busyUser}
                      onClick={() => void handleApprovalChange(u.uid, 'rejected')}
                      className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-800/70 px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      <X className="h-4 w-4" />
                      <span>رفض</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All Users Directory + Search + Add New Account */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                إدارة حسابات فريق المصنع ({allUsers.length})
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                تعديل بيانات أي حساب أو إضافة بيانات وحقول مخصصة أو تسجيل حساب جديد مسبقاً
              </p>
            </div>

            <button
              type="button"
              onClick={openNewUserModal}
              className="min-h-[40px] inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start"
            >
              <UserPlus className="h-4 w-4" />
              <span>إضافة حساب / بيانات عضو جديد</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث بالاسم، الكود الوظيفي، البريد، القسم، أو أي بيانات مخصصة..."
                className="w-full min-h-[40px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 pr-9 pl-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 self-start">
              {(
                [
                  { v: 'all', l: 'الكل' },
                  { v: 'approved', l: 'مقبول' },
                  { v: 'pending', l: 'معلق' },
                  { v: 'rejected', l: 'مرفوض' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setStatusFilter(opt.v)}
                  className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                    statusFilter === opt.v
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-stone-50 dark:bg-zinc-950 text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-4 font-semibold">الاسم والبيانات الإضافية</th>
                <th className="py-3 px-4 font-semibold">الكود</th>
                <th className="py-3 px-4 font-semibold">البريد / الهاتف</th>
                <th className="py-3 px-4 font-semibold">الوظيفة / القسم</th>
                <th className="py-3 px-4 font-semibold">الحالة</th>
                <th className="py-3 px-4 font-semibold">الاستخدام</th>
                <th className="py-3 px-4 font-semibold text-left">إدارة الحساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredUsers.map((u) => {
                const isPrimaryAdmin = u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
                const busyUser = updatingUid === u.uid;
                const customEntries = Object.entries(u.customFields || {});
                return (
                  <tr key={u.uid} className="hover:bg-stone-50/70 dark:hover:bg-zinc-800/40">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-zinc-900 dark:text-white whitespace-nowrap">
                        {u.displayName}
                      </p>
                      {customEntries.length > 0 && (
                        <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 max-w-[260px] truncate">
                          {customEntries.map(([k, v]) => `${k}: ${v}`).join(' · ')}
                        </p>
                      )}
                      {u.adminNotes && (
                        <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400 max-w-[260px] truncate">
                          ملاحظة: {u.adminNotes}
                        </p>
                      )}
                    </td>
                    <td
                      className="py-3 px-4 font-mono-nums text-xs font-bold text-red-700 dark:text-red-400 whitespace-nowrap"
                      dir="ltr"
                    >
                      {u.employeeCode || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      <p className="font-latin text-zinc-700 dark:text-zinc-200" dir="ltr">
                        {u.email}
                      </p>
                      <p className="font-mono-nums text-zinc-500 dark:text-zinc-400" dir="ltr">
                        {u.phone || '—'}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                      {[u.jobTitle, u.company].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      {isPrimaryAdmin ? (
                        <span className="font-semibold text-red-700 dark:text-red-400">
                          الحساب الرئيسي
                        </span>
                      ) : (
                        <span
                          className={`font-semibold ${
                            u.approvalStatus === 'approved'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : u.approvalStatus === 'rejected'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {APPROVAL_STATUS_LABELS[u.approvalStatus || 'pending']}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono-nums text-xs text-zinc-700 dark:text-zinc-200 whitespace-nowrap">
                      <span className="font-bold">{u.totalLaunches}</span> مرة ·{' '}
                      <span className="text-red-700 dark:text-red-400 font-semibold">
                        {formatDurationAr(u.totalDurationSeconds)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-left whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditorForExisting(u)}
                          className="min-h-[34px] inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>تعديل / إضافة</span>
                        </button>

                        {!isPrimaryAdmin && u.approvalStatus !== 'approved' && (
                          <button
                            type="button"
                            disabled={busyUser}
                            onClick={() => void handleApprovalChange(u.uid, 'approved')}
                            className="min-h-[34px] px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer disabled:opacity-60"
                          >
                            قبول
                          </button>
                        )}
                        {!isPrimaryAdmin && u.approvalStatus !== 'rejected' && (
                          <button
                            type="button"
                            disabled={busyUser}
                            onClick={() => void handleApprovalChange(u.uid, 'rejected')}
                            className="min-h-[34px] px-3 py-1 rounded-lg border border-red-200 dark:border-red-800/70 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer disabled:opacity-60"
                          >
                            {u.approvalStatus === 'approved' ? 'إيقاف' : 'رفض'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-zinc-500">
                    لا توجد حسابات مطابقة للبحث.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pre-registered / Invited Accounts awaiting first Google sign-in */}
      {pendingInvites.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              حسابات مضافة مسبقاً بانتظار أول تسجيل دخول ({pendingInvites.length})
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              بمجرد تسجيل دخول الموظف بحساب Google المطابق للبريد الإلكتروني، سيتم تحميل كل بياناته وحقوله تلقائياً.
            </p>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">
                    {inv.displayName}{' '}
                    <span className="font-mono-nums text-xs text-red-700 dark:text-red-400" dir="ltr">
                      ({inv.employeeCode || 'بدون كود'})
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-latin" dir="ltr">
                      {inv.email}
                    </span>{' '}
                    · {[inv.jobTitle, inv.company].filter(Boolean).join(' · ') || '—'} ·{' '}
                    {APPROVAL_STATUS_LABELS[inv.approvalStatus]}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditorForInvited(inv)}
                    className="min-h-[36px] inline-flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>تعديل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeInvitedUser(inv.id)}
                    aria-label={`حذف ${inv.displayName}`}
                    className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-xl border border-red-200 dark:border-red-800/70 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Account Editor / Add Account Modal */}
      {editorTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={(e) => void handleSaveEditor(e)}
            className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">
                  {editorTarget.kind === 'new'
                    ? 'إضافة حساب / بيانات عضو جديد'
                    : `تعديل وإضافة بيانات: ${displayName || email}`}
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  تحكم كامل في البيانات الوظيفية، حالة الصلاحية، الملاحظات، وإضافة أي حقول مخصصة للحساب
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditorTarget(null)}
                aria-label="إغلاق"
                className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  البريد الإلكتروني (Gmail) <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  dir="ltr"
                  required
                  disabled={editorTarget.kind === 'existing'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm font-latin text-zinc-900 dark:text-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  الاسم الكامل <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={SCHEMA_LIMITS.USER_NAME_MAX}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="مثال: م. محمد علي"
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  الكود الوظيفي
                </label>
                <input
                  type="text"
                  dir="ltr"
                  maxLength={SCHEMA_LIMITS.USER_EMPLOYEE_CODE_MAX}
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  placeholder="10245"
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm font-mono-nums text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  رقم الهاتف / الواتساب
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  maxLength={SCHEMA_LIMITS.USER_PHONE_MAX}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm font-mono-nums text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  المسمى الوظيفي
                </label>
                <input
                  type="text"
                  maxLength={SCHEMA_LIMITS.USER_JOB_MAX}
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="مهندس جودة / مشرف إنتاج"
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  القسم أو خط الإنتاج
                </label>
                <input
                  type="text"
                  maxLength={SCHEMA_LIMITS.USER_COMPANY_MAX}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="خط المبرد الصحراوي / الميكروويف"
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  حالة الاعتماد
                </label>
                <select
                  value={approvalStatus}
                  disabled={
                    editorTarget.kind === 'existing' &&
                    editorTarget.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
                  }
                  onChange={(e) => setApprovalStatus(e.target.value as ApprovalStatus)}
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-white disabled:opacity-60"
                >
                  <option value="approved">مقبول ومفعل</option>
                  <option value="pending">بانتظار الموافقة</option>
                  <option value="rejected">مرفوض / موقوف</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  الصلاحية
                </label>
                <select
                  value={role}
                  disabled={
                    editorTarget.kind === 'existing' &&
                    editorTarget.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
                  }
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-white disabled:opacity-60"
                >
                  <option value="user">عضو فريق (User)</option>
                  <option value="admin">مدير عمليات (Admin)</option>
                </select>
              </div>
            </div>

            {/* Admin Notes */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                ملاحظات الإدارة على الحساب (سرية — للإدارة فقط)
              </label>
              <textarea
                rows={2}
                maxLength={SCHEMA_LIMITS.ADMIN_NOTES_MAX}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="أضف أي ملاحظات إدارية أو تقييم تشغيلي للعضو..."
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 p-3 text-sm text-zinc-900 dark:text-white"
              />
            </div>

            {/* Dynamic Custom Fields Builder */}
            <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                    بيانات وحقول إضافية مخصصة للحساب ({customRows.length})
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    يمكنك إضافة أي بيانات إضافية تريدها لهذا الحساب (الوردية، الخط، المشرف، المهارات...)
                  </p>
                </div>
              </div>

              {/* Quick preset buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {QUICK_CUSTOM_KEYS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddCustomFieldRow(preset)}
                    className="min-h-[30px] inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 hover:border-red-300 cursor-pointer"
                  >
                    <Plus className="h-3 w-3 text-red-600" />
                    <span>{preset}</span>
                  </button>
                ))}
              </div>

              {/* Existing custom fields */}
              {customRows.length > 0 && (
                <div className="space-y-2">
                  {customRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        maxLength={SCHEMA_LIMITS.CUSTOM_KEY_MAX}
                        value={row.key}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomRows((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, key: val } : item))
                          );
                        }}
                        placeholder="اسم البيان"
                        className="col-span-5 min-h-[38px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-2.5 text-xs font-semibold text-zinc-900 dark:text-white"
                      />
                      <input
                        type="text"
                        maxLength={SCHEMA_LIMITS.CUSTOM_VALUE_MAX}
                        value={row.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomRows((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, value: val } : item))
                          );
                        }}
                        placeholder="القيمة"
                        className="col-span-6 min-h-[38px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 px-2.5 text-xs text-zinc-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setCustomRows((prev) => prev.filter((_, i) => i !== idx))
                        }
                        aria-label="حذف الحقل"
                        className="col-span-1 min-h-[38px] inline-flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new custom field input */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  maxLength={SCHEMA_LIMITS.CUSTOM_KEY_MAX}
                  value={newKeyInput}
                  onChange={(e) => setNewKeyInput(e.target.value)}
                  placeholder="اسم حقل جديد (مثال: رقم الخزانة)"
                  className="col-span-5 min-h-[38px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2.5 text-xs text-zinc-900 dark:text-white"
                />
                <input
                  type="text"
                  maxLength={SCHEMA_LIMITS.CUSTOM_VALUE_MAX}
                  value={newValInput}
                  onChange={(e) => setNewValInput(e.target.value)}
                  placeholder="القيمة (مثال: B-14)"
                  className="col-span-5 min-h-[38px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2.5 text-xs text-zinc-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => handleAddCustomFieldRow()}
                  className="col-span-2 min-h-[38px] inline-flex items-center justify-center gap-1 rounded-lg bg-zinc-900 dark:bg-zinc-800 text-white text-xs font-semibold hover:bg-red-600 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>إضافة</span>
                </button>
              </div>
            </div>

            {editorError && (
              <p className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300">
                {editorError}
              </p>
            )}

            {editorFeedback && (
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>{editorFeedback}</span>
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setEditorTarget(null)}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={savingEditor}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60"
              >
                {savingEditor ? 'جاري الحفظ...' : 'حفظ بيانات الحساب'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
