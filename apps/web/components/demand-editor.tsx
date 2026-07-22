"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { refreshSession } from "../lib/auth";
import { ForumSection, getForumSections } from "../lib/forum";
import { DemandBudget, DemandContact, DemandContactType, DemandType, contactTypeLabels, createDemand, demandBudgetLabels, demandTypeLabels, getDemandBoardConfig, getOwnDemand, submitDemand, updateDemand, uploadDemandImage } from "../lib/demands";

type FormState = { title: string; content: string; demandType: DemandType; budgetRange: DemandBudget; industryIds: string[]; contactInfo: DemandContact[]; imageUrls: string[]; deadline: string; agreeToRules: boolean };
const initial: FormState = { title: "", content: "", demandType: "research_collection", budgetRange: "500_2000", industryIds: [], contactInfo: [{ type: "wechat", value: "" }], imageUrls: [], deadline: "", agreeToRules: false };

export function DemandEditor({ edit = false }: { edit?: boolean }) {
  const router = useRouter(); const params = useParams<{ id: string }>(); const id = edit ? params.id : null;
  const [sections, setSections] = useState<ForumSection[]>([]); const [form, setForm] = useState<FormState>(initial); const [rules, setRules] = useState("");
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false); const [uploading, setUploading] = useState(false);

  useEffect(() => {
    refreshSession().then(() => Promise.all([getForumSections(), getDemandBoardConfig()])).then(([values, config]) => { setSections(values); setRules(config.rulesText); if (!id && values[0]) setForm((current) => ({ ...current, industryIds: [values[0].id] })); }).catch(() => router.replace(`/auth?next=${encodeURIComponent(id ? `/demands/${id}/edit` : "/demands/new")}`));
  }, [id, router]);
  useEffect(() => {
    if (!id) return;
    getOwnDemand(id).then((demand) => setForm({ title: demand.title, content: demand.content, demandType: demand.demandType, budgetRange: demand.budgetRange, industryIds: demand.industries.map((item) => item.id), contactInfo: demand.contactInfo ?? [{ type: "wechat", value: "" }], imageUrls: demand.imageUrls, deadline: demand.deadline ? toLocalInput(demand.deadline) : "", agreeToRules: Boolean(demand.rulesAcceptedAt) })).catch((reason) => setError(reason instanceof Error ? reason.message : "需求草稿加载失败"));
  }, [id]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function toggleIndustry(sectionId: string) { setForm((current) => ({ ...current, industryIds: current.industryIds.includes(sectionId) ? current.industryIds.filter((value) => value !== sectionId) : current.industryIds.length < 3 ? [...current.industryIds, sectionId] : current.industryIds })); }
  function changeContact(index: number, key: keyof DemandContact, value: string) { setForm((current) => ({ ...current, contactInfo: current.contactInfo.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) })); }
  function addContact() { if (form.contactInfo.length < 3) setField("contactInfo", [...form.contactInfo, { type: "qq", value: "" }]); }
  function removeContact(index: number) { if (form.contactInfo.length > 1) setField("contactInfo", form.contactInfo.filter((_, itemIndex) => itemIndex !== index)); }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])].slice(0, 6 - form.imageUrls.length); if (!files.length) return;
    setUploading(true); setError("");
    try { const uploaded = []; for (const file of files) uploaded.push((await uploadDemandImage(file)).url); setField("imageUrls", [...form.imageUrls, ...uploaded]); setMessage(`${uploaded.length} 张配图已上传。`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "配图上传失败"); }
    finally { setUploading(false); event.target.value = ""; }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null; const intent = submitter?.value === "submit" ? "submit" : "draft";
    const contactError = validateContacts(form.contactInfo); if (contactError) { setError(contactError); return; }
    if (!form.industryIds.length) { setError("请至少选择一个所属行业"); return; }
    if (intent === "submit" && !form.agreeToRules) { setError("提交审核前请同意《需求广场服务规范》"); return; }
    setSaving(true);
    try {
      const payload = { ...form, deadline: form.deadline ? new Date(form.deadline).toISOString() : null };
      const saved = id ? await updateDemand(id, payload) : await createDemand(payload);
      if (intent === "submit") { await submitDemand(saved.id); router.push("/account/demands?status=pending_review"); }
      else { setMessage("草稿已保存，可继续编辑后再提交审核。"); if (!id) router.replace(`/demands/${saved.id}/edit`); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "需求未能保存"); }
    finally { setSaving(false); }
  }

  return <main className="demand-editor-page">
    <header><Link className="brand" href="/demands"><span className="brand-mark">OPC</span><span>NEXUS</span></Link></header>
    <section className="demand-editor-shell">
      <Link className="demand-exit" href="/demands">← 退出编辑</Link>
      <div className="demand-editor-heading"><div><p className="eyebrow">{edit ? "REVISE REQUEST" : "NEW MATCHING REQUEST"}</p><h1>{edit ? "编辑需求工单" : "发布一条清晰的需求"}</h1></div><p>具体的交付物，比宽泛的“找合作”更容易收到有效回应。联系方式只会向登录用户展示。</p></div>
      <form className="demand-form" onSubmit={save}>
        <section className="demand-form-main">
          <fieldset><legend>01 · 定义任务</legend><label>需求标题 <span>{form.title.length}/30</span><input required minLength={2} maxLength={30} value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="例如：寻找新能源产业链访谈协作者" /></label><div className="two-fields"><label>需求类型<select value={form.demandType} onChange={(event) => setField("demandType", event.target.value as DemandType)}>{Object.entries(demandTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>预算范围<select value={form.budgetRange} onChange={(event) => setField("budgetRange", event.target.value as DemandBudget)}>{Object.entries(demandBudgetLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div><label>截止时间（选填）<input type="datetime-local" min={toLocalInput(new Date(Date.now() + 3_600_000).toISOString())} value={form.deadline} onChange={(event) => setField("deadline", event.target.value)} /></label></fieldset>
          <fieldset><legend>02 · 所属行业（最多 3 项）</legend><div className="demand-industry-checks">{sections.map((section) => <label className={form.industryIds.includes(section.id) ? "selected" : ""} key={section.id}><input type="checkbox" checked={form.industryIds.includes(section.id)} onChange={() => toggleIndustry(section.id)} disabled={!form.industryIds.includes(section.id) && form.industryIds.length >= 3} /><span>{section.name}<small>{section.description}</small></span></label>)}</div></fieldset>
          <fieldset><legend>03 · 交付说明</legend><label>需求详情 <span>{form.content.length}/10,000</span><textarea required minLength={20} maxLength={10000} rows={13} value={form.content} onChange={(event) => setField("content", event.target.value)} placeholder={"建议依次说明：\n· 背景与目标\n· 希望收到的具体交付物\n· 数据、地区或行业范围\n· 时间节点与验收标准"} /></label><label className="demand-upload">添加配图（最多 6 张）<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={uploading || form.imageUrls.length >= 6} /><span>{uploading ? "正在上传…" : "JPG / PNG / WebP，单张不超过 5MB"}</span></label>{form.imageUrls.length > 0 && <div className="demand-image-strip">{form.imageUrls.map((url, index) => <figure key={url}><img src={url} alt={`需求配图 ${index + 1}`} /><button type="button" onClick={() => setField("imageUrls", form.imageUrls.filter((item) => item !== url))}>移除</button></figure>)}</div>}</fieldset>
          <fieldset><legend>04 · 对接方式</legend><p className="field-note">可填写 QQ、微信、中国大陆手机号或企业微信，最多 3 项。</p><div className="demand-contact-list">{form.contactInfo.map((contact, index) => <div key={index}><select aria-label={`联系方式 ${index + 1} 类型`} value={contact.type} onChange={(event) => changeContact(index, "type", event.target.value as DemandContactType)}>{Object.entries(contactTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><input required minLength={3} maxLength={60} value={contact.value} onChange={(event) => changeContact(index, "value", event.target.value)} placeholder={contactPlaceholder(contact.type)} /><button type="button" onClick={() => removeContact(index)} disabled={form.contactInfo.length === 1}>删除</button></div>)}</div>{form.contactInfo.length < 3 && <button className="add-contact" type="button" onClick={addContact}>＋ 添加另一种联系方式</button>}</fieldset>
        </section>
        <aside className="demand-form-aside"><p className="eyebrow">COMPLIANCE CHECK</p><h2>发布前检查</h2><ul><li className={form.title.length >= 2 ? "done" : ""}>标题具体、可辨识</li><li className={form.content.length >= 20 ? "done" : ""}>交付标准已说明</li><li className={form.industryIds.length > 0 ? "done" : ""}>行业分类已选择</li><li className={form.contactInfo.every((item) => item.value.length >= 3) ? "done" : ""}>联系方式已填写</li></ul><p>{rules || "禁止荐股、代客理财、承诺收益、内幕交易、资金募集或骚扰引流信息。"}</p><label className="rules-check"><input type="checkbox" checked={form.agreeToRules} onChange={(event) => setField("agreeToRules", event.target.checked)} />我已阅读并同意 <Link href="/demands/rules" target="_blank">《需求广场服务规范》</Link></label></aside>
        {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}
        <div className="demand-form-actions"><button type="submit" value="draft" disabled={saving || uploading}>{saving ? "正在保存…" : "保存草稿"}</button><button className="demand-primary" type="submit" value="submit" disabled={saving || uploading}>提交审核 <span>→</span></button></div>
      </form>
    </section>
  </main>;
}

function validateContacts(contacts: DemandContact[]) {
  for (const contact of contacts) {
    const value = contact.value.trim();
    if (contact.type === "qq" && !/^[1-9]\d{4,11}$/.test(value)) return "QQ 号应为 5–12 位数字";
    if (contact.type === "wechat" && !/^[a-zA-Z][-_a-zA-Z0-9]{5,19}$/.test(value)) return "微信号应为字母开头的 6–20 位字符";
    if (contact.type === "phone" && !/^1[3-9]\d{9}$/.test(value.replaceAll(" ", ""))) return "请输入有效的中国大陆手机号";
    if (contact.type === "enterprise_wechat" && !/^[\p{L}\p{N}_@.+-]{3,40}$/u.test(value)) return "企业微信联系方式格式不正确";
  }
  return "";
}
function contactPlaceholder(type: DemandContactType) { return type === "qq" ? "5–12 位 QQ 号" : type === "wechat" ? "微信号（非昵称）" : type === "phone" ? "11 位手机号" : "企业微信账号"; }
function toLocalInput(value: string) { const date = new Date(value); const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return local.toISOString().slice(0, 16); }
