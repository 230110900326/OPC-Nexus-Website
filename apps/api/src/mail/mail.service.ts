import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/** Single SMTP account configuration. */
interface SmtpConfig {
  label: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  hostIp?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  /** Primary and (optionally) backup SMTP accounts. */
  private readonly accounts: SmtpConfig[] = [];

  /** Whether at least one SMTP account is configured. */
  private readonly hasSmtp: boolean;

  constructor(private readonly config: ConfigService) {
    // --- Primary account ---
    const primaryHost = this.config.get<string>("SMTP_HOST") || "";
    const primaryUser = this.config.get<string>("SMTP_USER") || "";
    if (primaryHost && primaryUser) {
      const primaryPort = Number(this.config.get<string>("SMTP_PORT", "465"));
      const primaryPass = this.config.get<string>("SMTP_PASS") || "";
      const primaryFrom = this.config.get<string>("SMTP_FROM") || `"OPC Nexus" <${primaryUser}>`;
      const primaryHostIp = this.config.get<string>("SMTP_HOST_IP")?.trim();
      this.accounts.push({
        label: "primary",
        host: primaryHost,
        port: primaryPort,
        secure: primaryPort === 465,
        user: primaryUser,
        pass: primaryPass,
        from: primaryFrom,
        hostIp: primaryHostIp || undefined,
      });
      this.logger.log(
        `MailService ready: ${primaryHost}:${primaryPort} (${primaryUser}) as PRIMARY`,
      );
    }

    // --- Backup account (optional) ---
    const backupHost = this.config.get<string>("BACKUP_SMTP_HOST") || "";
    const backupUser = this.config.get<string>("BACKUP_SMTP_USER") || "";
    if (backupHost && backupUser) {
      const backupPort = Number(this.config.get<string>("BACKUP_SMTP_PORT", "465"));
      const backupPass = this.config.get<string>("BACKUP_SMTP_PASS") || "";
      const backupFrom =
        this.config.get<string>("BACKUP_SMTP_FROM") || `"OPC Nexus" <${backupUser}>`;
      this.accounts.push({
        label: "backup",
        host: backupHost,
        port: backupPort,
        secure: backupPort === 465,
        user: backupUser,
        pass: backupPass,
        from: backupFrom,
      });
      this.logger.log(
        `MailService backup ready: ${backupHost}:${backupPort} (${backupUser}) as BACKUP`,
      );
    }

    this.hasSmtp = this.accounts.length > 0;

    if (!this.hasSmtp) {
      this.logger.warn("[DEV] No SMTP configured — emails will not be sent, reset URLs logged to console.");
    }
  }

  /** Send mail using a specific account, with DNS-resolve fallback for the primary. */
  private async sendViaAccount(
    account: SmtpConfig,
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: account.hostIp || account.host,
      port: account.port,
      secure: account.secure,
      auth: { user: account.user, pass: account.pass },
      ...(account.hostIp ? { tls: { servername: account.host } } : {}),
    });

    try {
      await transporter.sendMail({ from: account.from, to, subject, html });
      this.logger.log(`[DEV] Reset email sent to ${to} via ${account.label} (${account.user})`);
      return;
    } catch (error) {
      const err = error as Error;
      this.logger.warn(
        `MailService [${account.label}]: ${account.host} failed — ${err.message}`,
      );

      // For primary account: try DNS resolve as fallback before giving up.
      if (account.label === "primary" && !account.hostIp) {
        try {
          const dns = await import("dns/promises");
          const records = await dns.resolve4(account.host);
          const resolved = records[0];
          if (resolved && resolved !== "127.0.0.1") {
            this.logger.log(`MailService [primary]: retrying via ${account.host} → ${resolved}`);
            const retryTransporter = nodemailer.createTransport({
              host: resolved,
              port: account.port,
              secure: account.secure,
              auth: { user: account.user, pass: account.pass },
              tls: { servername: account.host },
            });
            await retryTransporter.sendMail({ from: account.from, to, subject, html });
            this.logger.log(`[DEV] Reset email sent to ${to} via ${account.label} DNS-fallback (${account.user})`);
            return;
          }
        } catch (dnsError) {
          this.logger.warn(`MailService [primary]: DNS fallback failed — ${(dnsError as Error).message}`);
        }
      }

      throw err;
    }
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    // Always log the reset URL so developers can test without email
    this.logger.log(`[DEV] Reset URL for ${to}: ${resetUrl}`);

    if (!this.hasSmtp) {
      this.logger.warn("[DEV] Skipping send — no SMTP configured.");
      return;
    }

    const webOrigin = this.config.get<string>("WEB_ORIGIN", "http://localhost:3000");
    const logoUrl = `${webOrigin}/brand/opc-nexus-lockup-dark.png`;
    const html = this.resetTemplate(resetUrl, logoUrl);
    const subject = "OPC Nexus — 重置你的密码";

    // Try accounts in order: primary first, then backup.
    let lastError: Error | undefined;
    for (const account of this.accounts) {
      try {
        await this.sendViaAccount(account, to, subject, html);
        return; // success
      } catch (error) {
        lastError = error as Error;
        if (account.label === "primary") {
          this.logger.warn(
            `MailService: primary (${account.user}) failed, switching to backup...`,
          );
        }
      }
    }

    // All accounts failed
    this.logger.error(`MailService: all accounts failed for ${to}: ${lastError?.message}`);
    throw lastError!;
  }

  async sendPasswordChangedEmail(to: string): Promise<void> {
    if (!this.hasSmtp) {
      this.logger.warn("[DEV] Skipping changed-password email — no SMTP configured.");
      return;
    }

    const webOrigin = this.config.get<string>("WEB_ORIGIN", "http://localhost:3000");
    const logoUrl = `${webOrigin}/brand/opc-nexus-lockup-dark.png`;
    const html = this.changedTemplate(logoUrl, webOrigin);
    const subject = "[OPC Nexus] 你的密码已被更改";

    let lastError: Error | undefined;
    for (const account of this.accounts) {
      try {
        await this.sendViaAccount(account, to, subject, html);
        return;
      } catch (error) {
        lastError = error as Error;
      }
    }
    if (lastError) throw lastError;
  }

  private changedTemplate(logoUrl: string, webOrigin: string): string {
    const now = new Date();
    const timeStr = now.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>密码已更改 — OPC Nexus</title>
</head>
<body style="margin:0;padding:0;background:#f4f2ed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ed;padding:56px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border-radius:4px;box-shadow:0 2px 16px rgba(11,29,44,.06);">
          <!-- Logo -->
          <tr>
            <td style="padding:40px 48px 0;text-align:left;">
              <img src="${logoUrl}" alt="OPC Nexus" width="148" height="41" style="display:block;border:0;outline:none;">
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 48px 44px;">
              <h1 style="margin:0 0 12px;font:600 26px/1.25 -apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;color:#0b1d2c;letter-spacing:-.02em;">密码已更改</h1>
              <p style="margin:0 0 24px;color:#4a5b6b;font-size:15px;line-height:1.8;">你的 OPC Nexus 账户密码已于 <strong style="color:#0b1d2c;">${timeStr}</strong> 被成功更改。</p>
              <!-- Info card -->
              <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8f7f4;border-radius:4px;border:1px solid #ebe8e1;margin-bottom:28px;">
                <tr><td style="padding:20px 24px;">
                  <table cellpadding="0" cellspacing="0" width="100%">
                    <tr><td style="padding-bottom:8px;color:#8a979e;font-size:12px;letter-spacing:.04em;">操作</td><td style="padding-bottom:8px;color:#0b1d2c;font-size:14px;">密码重置</td></tr>
                    <tr><td style="padding-bottom:8px;color:#8a979e;font-size:12px;letter-spacing:.04em;">时间</td><td style="padding-bottom:8px;color:#0b1d2c;font-size:14px;">${timeStr} (UTC+8)</td></tr>
                    <tr><td style="color:#8a979e;font-size:12px;letter-spacing:.04em;">发起方</td><td style="color:#0b1d2c;font-size:14px;">通过密码重置邮件验证</td></tr>
                  </table>
                </td></tr>
              </table>
              <!-- Alert -->
              <table cellpadding="0" cellspacing="0" style="width:100%;background:#fef7ed;border-radius:4px;border:1px solid #f3d9a4;margin-bottom:0;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:#8b6914;font-size:13px;line-height:1.7;">
                      <strong style="color:#6b4f0a;">&#9888;</strong> 如果这不是你本人的操作，你的账户可能已被盗用。请立即登录 <a href="${webOrigin}/auth/login" style="color:#b56a3b;text-decoration:underline;">OPC Nexus</a> 重置密码，或联系管理员。
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:28px 48px 32px;border-top:1px solid #ebe8e1;color:#8a979e;font-size:12px;line-height:1.8;">
              <p style="margin:0;">此邮件由 OPC Nexus 自动发送，请勿回复。</p>
              <p style="margin:14px 0 0;color:#b0a99e;">&mdash; OPC Nexus 团队</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private resetTemplate(resetUrl: string, logoUrl: string): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>重置密码 — OPC Nexus</title>
</head>
<body style="margin:0;padding:0;background:#f4f2ed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ed;padding:56px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border-radius:4px;box-shadow:0 2px 16px rgba(11,29,44,.06);">
          <!-- ── Logo ── -->
          <tr>
            <td style="padding:40px 48px 0;text-align:left;">
              <img src="${logoUrl}" alt="OPC Nexus" width="148" height="41" style="display:block;border:0;outline:none;">
            </td>
          </tr>
          <!-- ── Body ── -->
          <tr>
            <td style="padding:36px 48px 44px;">
              <h1 style="margin:0 0 16px;font:600 28px/1.25 -apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;color:#0b1d2c;letter-spacing:-.02em;">重置你的密码</h1>
              <p style="margin:0 0 32px;color:#4a5b6b;font-size:15px;line-height:1.8;">我们收到了你的密码重置请求。点击下方按钮设置新密码，链接在 <strong style="color:#0b1d2c;">1 小时内</strong>有效。</p>
              <!-- ── CTA Button ── -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="left" style="border-radius:4px;" bgcolor="#b56a3b">
                    <a href="${resetUrl}" style="display:inline-block;padding:15px 36px;background:#b56a3b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:.03em;border-radius:4px;border:0;box-shadow:0 3px 8px rgba(181,106,59,.28);">重置密码 <span style="padding-left:8px;font-size:15px;">&#8594;</span></a>
                  </td>
                </tr>
              </table>
              <!-- ── Fallback link ── -->
              <p style="margin:0 0 10px;color:#8a979e;font-size:12px;line-height:1.6;">如果按钮无法点击，请复制以下链接粘贴到浏览器中：</p>
              <p style="margin:0;padding:14px 16px;background:#f8f7f4;border-radius:3px;font:12px/1.7 ui-monospace,SFMono-Regular,Consolas,monospace;color:#0b1d2c;word-break:break-all;border:1px solid #ebe8e1;">${resetUrl}</p>
            </td>
          </tr>
          <!-- ── Footer ── -->
          <tr>
            <td style="padding:28px 48px 32px;border-top:1px solid #ebe8e1;color:#8a979e;font-size:12px;line-height:1.8;">
              <p style="margin:0;">如果你没有请求重置密码，请忽略此邮件，你的账户安全不受影响。</p>
              <p style="margin:14px 0 0;color:#b0a99e;">&mdash; OPC Nexus 团队</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
