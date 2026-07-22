"""
Scrapy 自定义中间件
"""

import random


class UARotateMiddleware:
    """
    User-Agent 轮换中间件
    每次请求随机选择一个 UA
    """

    def __init__(self, user_agents):
        self.user_agents = user_agents

    @classmethod
    def from_crawler(cls, crawler):
        from config import USER_AGENTS
        return cls(USER_AGENTS)

    def process_request(self, request):
        ua = random.choice(self.user_agents)
        request.headers["User-Agent"] = ua
