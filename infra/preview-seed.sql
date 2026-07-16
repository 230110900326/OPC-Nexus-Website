-- Local preview data only. Safe to run repeatedly; never run against production.
BEGIN;

INSERT INTO users (id,email,password_hash,display_name,bio,industry,company,job_title,is_active)
VALUES ('10000000-0000-4000-8000-000000000001','preview@opc.local','$2b$12$8uIc6UEHXmCqdhaWoPyMxu.lE9C0PvlxayImpw3sw3YItRN3Awda6','OPC 研究员','仅用于本地预览的演示作者','人工智能','OPC Nexus','行业研究',true)
ON CONFLICT (id) DO UPDATE SET password_hash=EXCLUDED.password_hash,display_name=EXCLUDED.display_name,bio=EXCLUDED.bio,industry=EXCLUDED.industry,company=EXCLUDED.company,job_title=EXCLUDED.job_title,is_active=true;

INSERT INTO users (id,email,password_hash,display_name,bio,industry,company,job_title,is_active)
VALUES ('10000000-0000-4000-8000-000000000002','operator@opc.local','$2b$12$8uIc6UEHXmCqdhaWoPyMxu.lE9C0PvlxayImpw3sw3YItRN3Awda6','OPC 运营员','本地预览运营账号','财经科技','OPC Nexus','内容运营',true)
ON CONFLICT (id) DO UPDATE SET password_hash=EXCLUDED.password_hash,is_active=true;
INSERT INTO user_roles (user_id,role_id)
SELECT '10000000-0000-4000-8000-000000000002',id FROM roles WHERE name='operator'
ON CONFLICT DO NOTHING;

INSERT INTO users (id,email,password_hash,display_name,bio,industry,company,job_title,is_active)
VALUES ('10000000-0000-4000-8000-000000000003','partner@opc.local','$2b$12$8uIc6UEHXmCqdhaWoPyMxu.lE9C0PvlxayImpw3sw3YItRN3Awda6','产业协作者','本地预览的供给方账号','先进制造','独立顾问','产业访谈顾问',true)
ON CONFLICT (id) DO UPDATE SET password_hash=EXCLUDED.password_hash,display_name=EXCLUDED.display_name,bio=EXCLUDED.bio,industry=EXCLUDED.industry,company=EXCLUDED.company,job_title=EXCLUDED.job_title,is_active=true;
INSERT INTO user_roles (user_id,role_id)
SELECT user_id,roles.id FROM (VALUES
  ('10000000-0000-4000-8000-000000000001'::uuid),
  ('10000000-0000-4000-8000-000000000003'::uuid)
) AS preview_users(user_id) CROSS JOIN roles WHERE roles.name='user'
ON CONFLICT DO NOTHING;

INSERT INTO categories (id,slug,name,sort_order,is_active)
VALUES ('10000000-0000-4000-8000-000000000010','opc-economy','OPC 与个体经济',5,true)
ON CONFLICT (id) DO UPDATE SET slug=EXCLUDED.slug,name=EXCLUDED.name,sort_order=EXCLUDED.sort_order,is_active=true;

INSERT INTO articles (id,slug,title,summary,cover_image_url,type,status,original_url,published_at,heat_score,category_id,operator_id,content,canonical_url,content_fingerprint,classification,summary_keywords,summary_entities,summary_model_version,summary_generated_at,summary_reviewed)
VALUES
('10000000-0000-4000-8000-000000000101','preview-opc-policy','一人公司迎来新一轮营商环境利好','围绕登记便利、普惠金融和数字化经营，政策工具正在降低超级个体的起步成本。',null,'policy','published','https://example.invalid/policy',now()-interval '2 hours',0,'10000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001','本地预览正文。','https://example.invalid/policy','preview-policy','{"OPC与个体经济":1}'::jsonb,'["一人公司","营商环境","普惠金融"]'::jsonb,'[]'::jsonb,'preview-v1',now(),true),
('10000000-0000-4000-8000-000000000102','preview-opc-finance','OPC财经观察：超级个体如何守住现金流','收入波动并不可怕，真正需要设计的是回款周期、固定成本和风险准备金。',null,'news','published','https://example.invalid/finance',now()-interval '5 hours',0,'10000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001','本地预览正文。','https://example.invalid/finance','preview-finance','{"OPC与个体经济":1}'::jsonb,'["OPC财经","超级个体","现金流"]'::jsonb,'[]'::jsonb,'preview-v1',now(),true)
ON CONFLICT (id) DO UPDATE SET slug=EXCLUDED.slug,title=EXCLUDED.title,summary=EXCLUDED.summary,type=EXCLUDED.type,status=EXCLUDED.status,original_url=EXCLUDED.original_url,published_at=EXCLUDED.published_at,category_id=EXCLUDED.category_id,operator_id=EXCLUDED.operator_id,content=EXCLUDED.content,canonical_url=EXCLUDED.canonical_url,content_fingerprint=EXCLUDED.content_fingerprint,classification=EXCLUDED.classification,summary_keywords=EXCLUDED.summary_keywords,summary_entities=EXCLUDED.summary_entities,summary_model_version=EXCLUDED.summary_model_version,summary_generated_at=EXCLUDED.summary_generated_at,summary_reviewed=EXCLUDED.summary_reviewed;

INSERT INTO article_sources (id,article_id,name,url,is_primary) VALUES
('10000000-0000-4000-8000-000000000201','10000000-0000-4000-8000-000000000101','本地政策样例','https://example.invalid/policy',true),
('10000000-0000-4000-8000-000000000202','10000000-0000-4000-8000-000000000102','OPC 本地研究台','https://example.invalid/finance',true)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,url=EXCLUDED.url,is_primary=EXCLUDED.is_primary;

INSERT INTO posts (id,title,body,status,section_id,author_id,created_at,updated_at)
SELECT '10000000-0000-4000-8000-000000000301','OPC超级个体：你会怎样分配第一笔利润？','讨论税费准备、再投资和个人现金流的优先顺序。','published',id,'10000000-0000-4000-8000-000000000001',now()-interval '1 hour',now()-interval '1 hour' FROM forum_sections WHERE slug='startups-investment'
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,body=EXCLUDED.body,status=EXCLUDED.status,section_id=EXCLUDED.section_id,author_id=EXCLUDED.author_id,updated_at=now();

INSERT INTO creators (id,name,industries,trust_level,authorization_status,is_enabled)
VALUES ('10000000-0000-4000-8000-000000000401','OPC 本地视频台','["OPC与个体经济","财经"]'::jsonb,5,'authorized',true)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,industries=EXCLUDED.industries,trust_level=EXCLUDED.trust_level,authorization_status=EXCLUDED.authorization_status,is_enabled=true;
INSERT INTO creator_accounts (id,creator_id,platform,platform_account_id,display_name,profile_url,is_enabled)
VALUES ('10000000-0000-4000-8000-000000000402','10000000-0000-4000-8000-000000000401','bilibili','preview-local','OPC 本地视频台','https://example.invalid/creator',true)
ON CONFLICT (id) DO UPDATE SET display_name=EXCLUDED.display_name,profile_url=EXCLUDED.profile_url,is_enabled=true;
INSERT INTO videos (id,platform,platform_video_id,title,cover_url,original_url,creator_account_id,published_at,duration_seconds,platform_metrics,platform_description,content_summary,key_points,industry_tags,chapters,subtitle_status,subtitle_source,transcript,summary_model_version,is_published)
VALUES ('10000000-0000-4000-8000-000000000403','bilibili','preview-video','一人公司经营复盘：从收入到自由现金流',null,'https://example.invalid/video','10000000-0000-4000-8000-000000000402',now()-interval '3 hours',842,'{"views":8200,"likes":530,"comments":87}'::jsonb,'本地预览数据','本概要基于本地合法样例字幕生成，用于展示视频频道和统一推荐。','["先拆分经营现金流与个人开支","用三个月固定成本作为风险准备","每季度复盘获客效率"]'::jsonb,'["OPC与个体经济","财经"]'::jsonb,'[{"startSeconds":0,"title":"现金流框架"},{"startSeconds":240,"title":"成本与风险"}]'::jsonb,'completed','本地授权样例','本地合法样例字幕。','preview-subtitle-v1',true)
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,cover_url=EXCLUDED.cover_url,original_url=EXCLUDED.original_url,published_at=EXCLUDED.published_at,duration_seconds=EXCLUDED.duration_seconds,platform_metrics=EXCLUDED.platform_metrics,platform_description=EXCLUDED.platform_description,content_summary=EXCLUDED.content_summary,key_points=EXCLUDED.key_points,industry_tags=EXCLUDED.industry_tags,chapters=EXCLUDED.chapters,subtitle_status=EXCLUDED.subtitle_status,subtitle_source=EXCLUDED.subtitle_source,transcript=EXCLUDED.transcript,summary_model_version=EXCLUDED.summary_model_version,is_published=true;

INSERT INTO content_metrics (id,content_type,content_id,source,read_count,like_count,comment_count,favorite_count,share_count,external_view_count,external_like_count,editor_score,source_trust,synced_at) VALUES
('10000000-0000-4000-8000-000000000501','policy','10000000-0000-4000-8000-000000000101','internal',1800,96,24,70,31,0,0,.9,.9,now()),
('10000000-0000-4000-8000-000000000502','article','10000000-0000-4000-8000-000000000102','internal',2400,132,37,84,42,0,0,.8,.8,now()),
('10000000-0000-4000-8000-000000000503','post','10000000-0000-4000-8000-000000000301','internal',620,45,19,12,8,0,0,.6,.6,now()),
('10000000-0000-4000-8000-000000000504','video','10000000-0000-4000-8000-000000000403','bilibili',0,0,0,0,0,8200,530,.8,1,now())
ON CONFLICT (id) DO UPDATE SET read_count=EXCLUDED.read_count,like_count=EXCLUDED.like_count,comment_count=EXCLUDED.comment_count,favorite_count=EXCLUDED.favorite_count,share_count=EXCLUDED.share_count,external_view_count=EXCLUDED.external_view_count,external_like_count=EXCLUDED.external_like_count,editor_score=EXCLUDED.editor_score,source_trust=EXCLUDED.source_trust,synced_at=now();

INSERT INTO events (id,title,description,cover_url,location_name,location_address,starts_at,ends_at,registration_deadline,capacity,registration_fields,status,organizer_id)
VALUES ('10000000-0000-4000-8000-000000000601','OPC 超级个体经营闭门会','围绕现金流、获客效率与轻量组织设计进行案例讨论。',null,'上海 · OPC 会客厅','徐汇区（报名确认后发送详细地址）',now()+interval '7 days',now()+interval '7 days 3 hours',now()+interval '5 days',40,'[{"key":"company","label":"公司或项目","required":true,"type":"text"}]'::jsonb,'published','10000000-0000-4000-8000-000000000002')
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,location_name=EXCLUDED.location_name,location_address=EXCLUDED.location_address,starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,registration_deadline=EXCLUDED.registration_deadline,capacity=EXCLUDED.capacity,registration_fields=EXCLUDED.registration_fields,status=EXCLUDED.status,organizer_id=EXCLUDED.organizer_id,updated_at=now();
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

INSERT INTO opc_demands (id,user_id,title,content,image_urls,contact_info,demand_type,budget_range,deadline,status,top_weight,view_count,connect_count,heat_score,risk_flags,contact_hash,rules_accepted_at,reviewed_by_id,reviewed_at,created_at,updated_at)
VALUES
('10000000-0000-4000-8000-000000000801','10000000-0000-4000-8000-000000000001','寻找AI应用行业访谈协作者','我们正在完成一份面向 OPC 一人公司的 AI 应用调研，希望协作者在两周内完成 6 位企业服务从业者访谈。交付物包括访谈提纲、逐字纪要、核心判断与可核验来源清单。优先考虑熟悉 SaaS、企业服务或超级个体经营的人。','[]'::jsonb,'[{"type":"wechat","value":"opc_researcher"}]'::jsonb,'research_collection','2000_10000',now()+interval '12 days','published',220,386,2,91.4,'[]'::jsonb,repeat('a',64),now()-interval '4 days','10000000-0000-4000-8000-000000000002',now()-interval '4 days',now()-interval '4 days',now()-interval '4 days'),
('10000000-0000-4000-8000-000000000802','10000000-0000-4000-8000-000000000002','征集一人公司现金流案例','OPC 财经专题正在征集真实经营案例，重点关注收入波动、回款周期、固定成本和风险准备金。交付为一份脱敏案例说明和 30 分钟线上访谈，适合有两年以上独立经营经验的超级个体参与。','[]'::jsonb,'[{"type":"qq","value":"820260716"}]'::jsonb,'report_writing','500_2000',now()+interval '20 days','published',0,214,1,76.8,'[]'::jsonb,repeat('b',64),now()-interval '2 days','10000000-0000-4000-8000-000000000002',now()-interval '2 days',now()-interval '2 days',now()-interval '2 days'),
('10000000-0000-4000-8000-000000000803','10000000-0000-4000-8000-000000000003','寻找长三角制造业走访支持','计划走访长三角制造业小微企业，需要协作者协助预约、现场记录与资料整理，最终交付走访纪要、企业基本信息表和问题清单。预算可根据实际走访城市与数量进一步确认。','[]'::jsonb,'[{"type":"phone","value":"13800138000"}]'::jsonb,'field_visit','over_10000',now()+interval '25 days','pending_review',0,0,0,0,'["新账号发布"]'::jsonb,repeat('c',64),now()-interval '1 hour',null,null,now()-interval '1 hour',now()-interval '1 hour')
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,content=EXCLUDED.content,contact_info=EXCLUDED.contact_info,demand_type=EXCLUDED.demand_type,budget_range=EXCLUDED.budget_range,deadline=EXCLUDED.deadline,status=EXCLUDED.status,top_weight=EXCLUDED.top_weight,view_count=EXCLUDED.view_count,connect_count=EXCLUDED.connect_count,heat_score=EXCLUDED.heat_score,risk_flags=EXCLUDED.risk_flags,contact_hash=EXCLUDED.contact_hash,rules_accepted_at=EXCLUDED.rules_accepted_at,reviewed_by_id=EXCLUDED.reviewed_by_id,reviewed_at=EXCLUDED.reviewed_at,created_at=EXCLUDED.created_at,updated_at=EXCLUDED.updated_at;

INSERT INTO opc_demand_industries (demand_id,section_id)
SELECT demand_id,forum_sections.id FROM (VALUES
  ('10000000-0000-4000-8000-000000000801'::uuid,'startups-investment'),
  ('10000000-0000-4000-8000-000000000802'::uuid,'startups-investment'),
  ('10000000-0000-4000-8000-000000000803'::uuid,'technology-industry')
) AS links(demand_id,section_slug) JOIN forum_sections ON forum_sections.slug=links.section_slug
ON CONFLICT DO NOTHING;

INSERT INTO opc_demand_connect (id,demand_id,apply_user_id,apply_msg,contact_status,is_anomalous,risk_reason,counts_toward_heat,viewed_at,created_at,updated_at)
VALUES
('10000000-0000-4000-8000-000000000811','10000000-0000-4000-8000-000000000801','10000000-0000-4000-8000-000000000003','我长期服务企业软件团队，可在一周内完成访谈对象筛选、访谈执行和结构化纪要，过往有产业研究交付经验。','viewed',false,null,true,now()-interval '20 hours',now()-interval '1 day',now()-interval '20 hours'),
('10000000-0000-4000-8000-000000000812','10000000-0000-4000-8000-000000000801','10000000-0000-4000-8000-000000000002','运营团队可协助引荐两位企业服务从业者，并提供已有的 OPC 研究资料索引。','communicated',false,null,true,now()-interval '2 days',now()-interval '3 days',now()-interval '2 days')
ON CONFLICT (id) DO UPDATE SET apply_msg=EXCLUDED.apply_msg,contact_status=EXCLUDED.contact_status,is_anomalous=EXCLUDED.is_anomalous,risk_reason=EXCLUDED.risk_reason,counts_toward_heat=EXCLUDED.counts_toward_heat,viewed_at=EXCLUDED.viewed_at,updated_at=EXCLUDED.updated_at;

INSERT INTO content_metrics (id,content_type,content_id,source,read_count,like_count,comment_count,favorite_count,share_count,external_view_count,external_like_count,editor_score,source_trust,synced_at)
VALUES
('10000000-0000-4000-8000-000000000821','demand','10000000-0000-4000-8000-000000000801','internal',386,0,0,18,0,0,0,.8,.8,now()),
('10000000-0000-4000-8000-000000000822','demand','10000000-0000-4000-8000-000000000802','internal',214,0,0,9,0,0,0,.6,.7,now())
ON CONFLICT (id) DO UPDATE SET read_count=EXCLUDED.read_count,favorite_count=EXCLUDED.favorite_count,editor_score=EXCLUDED.editor_score,source_trust=EXCLUDED.source_trust,synced_at=now();

INSERT INTO notifications (id,user_id,type,title,body,target_type,target_id,is_read,created_at)
VALUES ('10000000-0000-4000-8000-000000000831','10000000-0000-4000-8000-000000000001','demand_connect_received','收到新的需求对接意向','产业协作者希望对接“寻找AI应用行业访谈协作者”。','demand','10000000-0000-4000-8000-000000000801',false,now()-interval '1 day')
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,body=EXCLUDED.body,is_read=EXCLUDED.is_read,created_at=EXCLUDED.created_at;

COMMIT;
