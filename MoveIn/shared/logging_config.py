
import logging
import sys
import json
from datetime import datetime
from typing import Any, Dict

class StructuredFormatter(logging.Formatter):
    
    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        if hasattr(record, "extra_fields"):
            log_data.update(record.extra_fields)
        
        return json.dumps(log_data)

def setup_logging(log_level: str = "INFO", service_name: str = "driver-sentiment-engine") -> None:
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, log_level.upper()))
    
    formatter = StructuredFormatter()
    console_handler.setFormatter(formatter)
    
    root_logger.addHandler(console_handler)
    
    root_logger.info(f"Logging initialized for {service_name}", extra={
        "extra_fields": {
            "service": service_name,
            "log_level": log_level
        }
    })

def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
