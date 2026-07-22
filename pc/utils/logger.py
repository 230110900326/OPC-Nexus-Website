"""
日志配置模块
"""

import sys
from loguru import logger

from config import LOG_LEVEL, LOG_FILE, LOG_MAX_SIZE, LOG_RETENTION


def setup_logger():
    """配置 loguru 日志"""
    # 移除默认 handler
    logger.remove()

    # 控制台输出（彩色）
    logger.add(
        sys.stdout,
        level=LOG_LEVEL,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        colorize=True,
    )

    # 文件输出（按大小轮转，保留7天）
    logger.add(
        LOG_FILE,
        level=LOG_LEVEL,
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        rotation=LOG_MAX_SIZE,
        retention=LOG_RETENTION,
        encoding="utf-8",
    )

    return logger
