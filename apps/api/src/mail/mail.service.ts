import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

@Injectable()
export class MailService {
  private transporter!: Transporter;
  private from!: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>("SMTP_HOST") || "";
    const user = this.config.get<string>("SMTP_USER") || "";

    if (host && user) {
      const port = Number(this.config.get<string>("SMTP_PORT", "465"));
      const pass = this.config.get<string>("SMTP_PASS") || "";
      const secure = port === 465;
      this.transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
      this.from = this.config.get<string>("SMTP_FROM") || `"OPC Nexus" <${user}>`;
      this.logger.log(`MailService ready: ${host}:${port} as ${user}`);
    } else {
      this.from = `"OPC Nexus [TEST]" <no-reply@ethereal.email>`;
      this.logger.warn("[DEV] No SMTP configured — using Ethereal test account. Reset links will be logged.");
      this.initEthereal();
    }
  }

  private async initEthereal() {
    const account = await nodemailer.createTestAccount();
    this.transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email", port: 587, secure: false,
      auth: { user: account.user, pass: account.pass },
    });
    this.from = `"OPC Nexus [TEST]" <${account.user}>`;
    this.logger.log(`Ethereal account: ${account.user}`);
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const html = this.resetTemplate(resetUrl);
    const info = await this.transporter.sendMail({
      from: this.from, to,
      subject: "OPC Nexus — 重置你的密码",
      html,
    });

    const isEthereal = "nodemailer" in info && typeof (info as any).getTestMessageUrl === "function";
    if (isEthereal) {
      const previewUrl = (info as any).nodemailer.getTestMessageUrl(info);
      this.logger.warn(`[DEV] Reset email preview: ${previewUrl}`);
    }

    // Always log the reset URL so developers can test without email
    this.logger.log(`[DEV] Reset URL for ${to}: ${resetUrl}`);
  }

  private resetTemplate(resetUrl: string): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>重置密码 — OPC Nexus</title>
</head>
<body style="margin:0;padding:0;background:#f0eee8;font-family:Arial,'Microsoft YaHei',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0eee8;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:2px;box-shadow:0 1px 8px rgba(11,29,44,.07);">
          <tr>
            <td style="padding:36px 40px 0;text-align:left;">
              <span style="font-weight:800;font-size:14px;letter-spacing:.14em;color:#0b1d2c;">OPC <span style="background:#b56a3b;color:#fff;padding:3px 6px;font-size:10px;border-radius:1px;">NEXUS</span></span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 36px;">
              <h1 style="margin:0 0 12px;font:500 28px Georgia,'Noto Serif SC',serif;color:#0b1d2c;letter-spacing:-.04em;">重置你的密码</h1>
              <p style="margin:0 0 28px;color:#294457;font-size:14px;line-height:1.7;">我们收到了你的密码重置请求。点击下方按钮设置新密码（链接在 <strong>1 小时内</strong>有效）。</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left">
                    <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;background:#b56a3b;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;border-radius:1px;">重置密码 <span style="padding-left:12px;font-size:16px;">→</span></a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;color:#294457;font-size:12px;line-height:1.7;">如果按钮无法点击，请复制以下链接粘贴到浏览器中：</p>
              <p style="margin:8px 0 0;padding:12px;background:#f0eee8;font:11px ui-monospace,monospace;color:#0b1d2c;word-break:break-all;">${resetUrl}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 28px;border-top:1px solid rgba(11,29,44,.12);color:#8a979e;font-size:11px;line-height:1.7;">
              <p style="margin:0;">如果你没有请求重置密码，请忽略此邮件 — 你的账户安全不受影响。</p>
              <p style="margin:12px 0 0;">— OPC Nexus 团队</p>
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
