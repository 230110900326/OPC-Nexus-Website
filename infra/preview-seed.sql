-- Local preview data only. Safe to run repeatedly; never run against production.
BEGIN;

INSERT INTO users (id,email,password_hash,display_name,bio,industry,company,job_title,is_active)
VALUES ('10000000-0000-4000-8000-000000000001','preview@opc.local','preview-account-disabled','OPC 研究员','仅用于本地预览的演示作者','人工智能','OPC Nexus','行业研究',true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id,email,password_hash,display_name,bio,industry,company,job_title,is_active)
VALUES ('10000000-0000-4000-8000-000000000002','operator@opc.local','$2b$12$8TuiSsonoYKpRzp/0BEzAOONh4aEYs8vbzImJumpPQmfD5s1QOIDW','OPC 运营员','本地预览运营账号','财经科技','OPC Nexus','内容运营',true)
ON CONFLICT (id) DO UPDATE SET password_hash=EXCLUDED.password_hash,is_active=true;
INSERT INTO user_roles (user_id,role_id)
SELECT '10000000-0000-4000-8000-000000000002',id FROM roles WHERE name='operator'
ON CONFLICT DO NOTHING;

INSERT INTO categories (id,slug,name,sort_order,is_active)
VALUES ('10000000-0000-4000-8000-000000000010','opc-economy','OPC 与个体经济',5,true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO articles (id,slug,title,summary,cover_image_url,type,status,original_url,published_at,heat_score,category_id,operator_id,content,canonical_url,content_fingerprint,classification,summary_keywords,summary_entities,summary_model_version,summary_generated_at,summary_reviewed)
VALUES
('10000000-0000-4000-8000-000000000101','preview-opc-policy','一人公司迎来新一轮营商环境利好','围绕登记便利、普惠金融和数字化经营，政策工具正在降低超级个体的起步成本。',null,'policy','published','https://example.invalid/policy',now()-interval '2 hours',0,'10000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001','本地预览正文。','https://example.invalid/policy','preview-policy','{"OPC与个体经济":1}'::jsonb,'["一人公司","营商环境","普惠金融"]'::jsonb,'[]'::jsonb,'preview-v1',now(),true),
('10000000-0000-4000-8000-000000000102','preview-opc-finance','OPC财经观察：超级个体如何守住现金流','收入波动并不可怕，真正需要设计的是回款周期、固定成本和风险准备金。',null,'news','published','https://example.invalid/finance',now()-interval '5 hours',0,'10000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001','本地预览正文。','https://example.invalid/finance','preview-finance','{"OPC与个体经济":1}'::jsonb,'["OPC财经","超级个体","现金流"]'::jsonb,'[]'::jsonb,'preview-v1',now(),true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO article_sources (id,article_id,name,url,is_primary) VALUES
('10000000-0000-4000-8000-000000000201','10000000-0000-4000-8000-000000000101','本地政策样例','https://example.invalid/policy',true),
('10000000-0000-4000-8000-000000000202','10000000-0000-4000-8000-000000000102','OPC 本地研究台','https://example.invalid/finance',true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO posts (id,title,body,status,section_id,author_id,created_at,updated_at)
SELECT '10000000-0000-4000-8000-000000000301','OPC超级个体：你会怎样分配第一笔利润？','讨论税费准备、再投资和个人现金流的优先顺序。','published',id,'10000000-0000-4000-8000-000000000001',now()-interval '1 hour',now()-interval '1 hour' FROM forum_sections WHERE slug='startups-investment'
ON CONFLICT (id) DO NOTHING;

INSERT INTO creators (id,name,industries,trust_level,authorization_status,is_enabled)
VALUES ('10000000-0000-4000-8000-000000000401','OPC 本地视频台','["OPC与个体经济","财经"]'::jsonb,5,'authorized',true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO creator_accounts (id,creator_id,platform,platform_account_id,display_name,profile_url,is_enabled)
VALUES ('10000000-0000-4000-8000-000000000402','10000000-0000-4000-8000-000000000401','bilibili','preview-local','OPC 本地视频台','https://example.invalid/creator',true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO videos (id,platform,platform_video_id,title,cover_url,original_url,creator_account_id,published_at,duration_seconds,platform_metrics,platform_description,content_summary,key_points,industry_tags,chapters,subtitle_status,subtitle_source,transcript,summary_model_version,is_published)
VALUES ('10000000-0000-4000-8000-000000000403','bilibili','preview-video','一人公司经营复盘：从收入到自由现金流',null,'https://example.invalid/video','10000000-0000-4000-8000-000000000402',now()-interval '3 hours',842,'{"views":8200,"likes":530,"comments":87}'::jsonb,'本地预览数据','本概要基于本地合法样例字幕生成，用于展示视频频道和统一推荐。','["先拆分经营现金流与个人开支","用三个月固定成本作为风险准备","每季度复盘获客效率"]'::jsonb,'["OPC与个体经济","财经"]'::jsonb,'[{"startSeconds":0,"title":"现金流框架"},{"startSeconds":240,"title":"成本与风险"}]'::jsonb,'completed','本地授权样例','本地合法样例字幕。','preview-subtitle-v1',true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO content_metrics (id,content_type,content_id,source,read_count,like_count,comment_count,favorite_count,share_count,external_view_count,external_like_count,editor_score,source_trust,synced_at) VALUES
('10000000-0000-4000-8000-000000000501','policy','10000000-0000-4000-8000-000000000101','internal',1800,96,24,70,31,0,0,.9,.9,now()),
('10000000-0000-4000-8000-000000000502','article','10000000-0000-4000-8000-000000000102','internal',2400,132,37,84,42,0,0,.8,.8,now()),
('10000000-0000-4000-8000-000000000503','post','10000000-0000-4000-8000-000000000301','internal',620,45,19,12,8,0,0,.6,.6,now()),
('10000000-0000-4000-8000-000000000504','video','10000000-0000-4000-8000-000000000403','bilibili',0,0,0,0,0,8200,530,.8,1,now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id,title,description,cover_url,location_name,location_address,starts_at,ends_at,registration_deadline,capacity,registration_fields,status,organizer_id)
VALUES ('10000000-0000-4000-8000-000000000601','OPC 超级个体经营闭门会','围绕现金流、获客效率与轻量组织设计进行案例讨论。',null,'上海 · OPC 会客厅','徐汇区（报名确认后发送详细地址）',now()+interval '7 days',now()+interval '7 days 3 hours',now()+interval '5 days',40,'[{"key":"company","label":"公司或项目","required":true,"type":"text"}]'::jsonb,'published','10000000-0000-4000-8000-000000000002')
ON CONFLICT (id) DO NOTHING;
INSERT INTO event_registrations (id,event_id,user_id,status,form_data)
VALUES ('10000000-0000-4000-8000-000000000602','10000000-0000-4000-8000-000000000601','10000000-0000-4000-8000-000000000001','confirmed','{"company":"OPC Nexus"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO homepage_configs (id,kind,module_key,title,subtitle,target_url,image_url,display_position,sort_order,content_type,content_id,effective_from,effective_to,is_online,config,created_by_id,updated_by_id)
VALUES
('10000000-0000-4000-8000-000000000701','banner','focus','一人公司，正在成为新的经营基本单元','从政策利好、现金流方法到超级个体的真实讨论，今天值得继续判断的信号都在这里。','/discover',null,'hero',1,null,null,now()-interval '1 day',now()+interval '30 days',true,'{}'::jsonb,'10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002'),
('10000000-0000-4000-8000-000000000702','recommendation','recommendations','OPC财经：超级个体现金流清单','由运营台人工置顶的本地预览推荐。','/articles/preview-opc-finance',null,'main',1,'article','10000000-0000-4000-8000-000000000102',now()-interval '1 day',now()+interval '30 days',true,'{}'::jsonb,'10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002'),
('10000000-0000-4000-8000-000000000703','module','policies','利好政策雷达',null,'/policies',null,'main',15,null,null,null,null,true,'{}'::jsonb,'10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002')
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,subtitle=EXCLUDED.subtitle,target_url=EXCLUDED.target_url,sort_order=EXCLUDED.sort_order,effective_from=EXCLUDED.effective_from,effective_to=EXCLUDED.effective_to,is_online=EXCLUDED.is_online,updated_at=now();

INSERT INTO recommendation_events (id,homepage_config_id,event_type,session_hash,page_path,created_at) VALUES
('10000000-0000-4000-8000-000000000711','10000000-0000-4000-8000-000000000701','impression','preview-session','/',now()-interval '2 hours'),
('10000000-0000-4000-8000-000000000712','10000000-0000-4000-8000-000000000702','impression','preview-session','/',now()-interval '2 hours'),
('10000000-0000-4000-8000-000000000713','10000000-0000-4000-8000-000000000702','click','preview-session','/',now()-interval '90 minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_logs (id,actor_id,actor_name,actor_email,action,target_type,target_id,metadata,created_at)
VALUES ('10000000-0000-4000-8000-000000000721','10000000-0000-4000-8000-000000000002','OPC 运营员','operator@opc.local','homepage.config_create','homepage_config','10000000-0000-4000-8000-000000000701','{"source":"preview-seed"}'::jsonb,now()-interval '3 hours')
ON CONFLICT (id) DO NOTHING;

COMMIT;
