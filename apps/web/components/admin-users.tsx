"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Account, refreshSession } from "../lib/auth";
import { AdminUser, AdminUserPage, ListUsersQuery, UpdateUserInput, getAdminUsers, updateAdminUser } from "../lib/operations";
import { OperationsAdminNav } from "./operations-admin-nav";

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<string, string> = {
  user: "用户", researcher: "研究员", editor: "编辑",
  moderator: "审核员", operator: "运营", admin: "管理员",
};

const ALL_ROLES = ["user", "researcher", "editor", "moderator", "operator", "admin"];

export function AdminUsers() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [data, setData] = useState<AdminUserPage | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingRoles, setEditingRoles] = useState<string[]>([]);
  const [banReason, setBanReason] = useState("");

  async function load(nextPage = page, nextSearch = search, nextRole = roleFilter, nextStatus = statusFilter) {
    setLoading(true); setError("");
    try {
      const query: ListUsersQuery = { page: nextPage, limit: PAGE_SIZE };
      if (nextSearch) query.search = nextSearch;
      if (nextRole) query.role = nextRole;
      if (nextStatus) query.status = nextStatus;
      setData(await getAdminUsers(query));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "用户列表加载失败");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    refreshSession().then((value) => {
      if (!value.roles.some((r) => ["operator", "admin"].includes(r))) throw new Error("没有运营管理权限");
      setAccount(value); return load();
    }).catch(() => router.replace("/auth"));
  }, [router]);

  function submitSearch(event: FormEvent) { event.preventDefault(); setPage(1); void load(1, search, roleFilter, statusFilter); }

  function toggleExpand(userId: string, user: AdminUser) {
    if (expandedId === userId) { setExpandedId(null); return; }
    setExpandedId(userId);
    setEditingRoles(user.roles);
    setBanReason("");
  }

  async function doUpdate(userId: string, input: UpdateUserInput) {
    setError("");
    try {
      const updated = await updateAdminUser(userId, input);
      if (data) {
        setData({ ...data, items: data.items.map((u) => u.id === userId ? updated : u) });
      }
      setExpandedId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "操作失败");
    }
  }

  function toggleRole(role: string) {
    setEditingRoles((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]);
  }

  const isAdmin = account?.roles.includes("admin");

  return <main className="ops-admin-page">
    <OperationsAdminNav active="users" userName={account?.displayName} />
    <div className="ops-admin-shell">
      <section className="admin-title">
        <div>
          <p className="eyebrow">USER MANAGEMENT DESK</p>
          <h1>用户管理</h1>
          <p>查看所有注册用户，管理账号状态与角色权限。</p>
        </div>
      </section>

      <form className="ops-search-bar" onSubmit={submitSearch}>
        <input type="text" placeholder="搜索邮箱或昵称…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); void load(1, search, e.target.value, statusFilter); }}>
          <option value="">全部角色</option>
          {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); void load(1, search, roleFilter, e.target.value); }}>
          <option value="">全部状态</option>
          <option value="active">正常</option>
          <option value="banned">已封禁</option>
          <option value="pending">待审核</option>
        </select>
        <button type="submit" disabled={loading}>搜索</button>
      </form>

      {error && <p className="ops-error" role="alert">{error}</p>}
      {loading && <p className="ops-state">正在加载用户列表…</p>}

      {data && !loading && (
        <>
          <div className="user-table-wrap">
            <table className="user-table">
              <thead>
                <tr>
                  <th>用户</th>
                  <th>角色</th>
                  <th>状态</th>
                  <th>注册时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isExpanded={expandedId === user.id}
                    editingRoles={editingRoles}
                    banReason={banReason}
                    setBanReason={setBanReason}
                    isAdmin={isAdmin ?? false}
                    currentUserId={account?.id ?? ""}
                    onToggle={() => toggleExpand(user.id, user)}
                    onBan={() => doUpdate(user.id, { isActive: false, banReason: banReason || "运营手动封禁" })}
                    onUnban={() => doUpdate(user.id, { isActive: true })}
                    onUpdateRoles={() => doUpdate(user.id, { roles: editingRoles })}
                    toggleRole={toggleRole}
                  />
                ))}
              </tbody>
            </table>
            {data.items.length === 0 && <p className="ops-state">没有匹配的用户。</p>}
          </div>

          {data.pagination.totalPages > 1 && (
            <div className="ops-pagination">
              <button disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); void load(p); }}>上一页</button>
              <span>{page} / {data.pagination.totalPages}</span>
              <button disabled={page >= data.pagination.totalPages} onClick={() => { const p = page + 1; setPage(p); void load(p); }}>下一页</button>
              <small>共 {data.pagination.total} 人</small>
            </div>
          )}
        </>
      )}
    </div>
  </main>;
}

function UserRow({
  user, isExpanded, editingRoles, banReason, setBanReason, isAdmin, currentUserId, onToggle, onBan, onUnban, onUpdateRoles, toggleRole,
}: {
  user: AdminUser; isExpanded: boolean; editingRoles: string[]; banReason: string; setBanReason: (v: string) => void;
  isAdmin: boolean; currentUserId: string; onToggle: () => void;
  onBan: () => void; onUnban: () => void; onUpdateRoles: () => void;
  toggleRole: (role: string) => void;
}) {
  const isSelf = user.id === currentUserId;
  const statusBadge = user.certificationStatus === "pending"
    ? <span className="user-badge pending">待审核</span>
    : user.isActive
      ? <span className="user-badge active">正常</span>
      : <span className="user-badge banned">已封禁</span>;

  return (
    <>
      <tr className={isExpanded ? "row-expanded" : ""}>
        <td className="user-cell">
          <div className="user-cell-main">
            <span className="user-avatar-slot">
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" width={32} height={32} />
                : <span className="avatar-placeholder">{user.displayName.charAt(0).toUpperCase()}</span>
              }
            </span>
            <div>
              <strong>{user.displayName}</strong>
              <small>{user.email}</small>
            </div>
          </div>
        </td>
        <td>
          <div className="role-cell">
            {user.roles.map((r) => <span key={r} className="role-tag">{ROLE_LABELS[r] || r}</span>)}
          </div>
        </td>
        <td>{statusBadge}</td>
        <td className="date-cell">{new Date(user.createdAt).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })}</td>
        <td>
          <button className="ops-btn-sm" onClick={onToggle}>{isExpanded ? "收起" : "管理"}</button>
        </td>
      </tr>
      {isExpanded && (
        <tr className="user-action-row">
          <td colSpan={5}>
            <div className="user-action-panel">
              {/* Role editor */}
              <fieldset>
                <legend>角色分配</legend>
                <div className="role-check-grid">
                  {ALL_ROLES.map((r) => {
                    const disabled = (!isAdmin && r === "admin") || (isSelf && r === "admin");
                    return (
                      <label key={r} className={disabled ? "disabled" : ""}>
                        <input
                          type="checkbox"
                          checked={editingRoles.includes(r)}
                          disabled={disabled}
                          onChange={() => toggleRole(r)}
                        />
                        {ROLE_LABELS[r]}
                      </label>
                    );
                  })}
                </div>
                <button className="ops-btn-sm" onClick={onUpdateRoles} disabled={editingRoles.length === 0}>保存角色</button>
              </fieldset>

              {/* Ban/Unban */}
              <fieldset>
                <legend>{user.isActive ? "封禁账号" : "解封账号"}</legend>
                {user.isActive ? (
                  <>
                    <input type="text" placeholder="封禁原因（可选）" value={banReason}
                      onChange={(e) => setBanReason(e.target.value)} maxLength={500} />
                    <button className="ops-btn-sm danger" disabled={isSelf} onClick={onBan}>
                      {isSelf ? "不能封禁自己" : "确认封禁"}
                    </button>
                  </>
                ) : (
                  <>
                    {user.banReason && <p className="ban-reason">封禁原因：{user.banReason}</p>}
                    <button className="ops-btn-sm" onClick={onUnban}>确认解封</button>
                  </>
                )}
              </fieldset>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
