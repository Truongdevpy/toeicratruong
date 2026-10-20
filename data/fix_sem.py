with open("core/downloader.py", "r", encoding="utf-8") as f:
    code = f.read()

# Replace self.semaphore in __init__
old_init = "self.semaphore = asyncio.Semaphore(concurrency)"
new_init = "self.semaphore = None"
code = code.replace(old_init, new_init)

# In download_batch, ensure semaphore is initialized for the current loop
old_batch = "async def download_batch("
new_batch = """async def download_batch(
        self,
        batch_tasks: List[Dict[str, Any]],
        check_resume: bool = True
    ) -> List[Dict[str, Any]]:
        self.semaphore = asyncio.Semaphore(self.concurrency)"""

# Find exact download_batch signature in code
import re
code = re.sub(
    r"async def download_batch\(\s*self,\s*batch_tasks:\s*List\[Dict\[str,\s*Any\]\],\s*check_resume:\s*bool\s*=\s*True\s*\)\s*->\s*List\[Dict\[str,\s*Any\]\]:",
    r"""async def download_batch(
        self,
        batch_tasks: List[Dict[str, Any]],
        check_resume: bool = True
    ) -> List[Dict[str, Any]]:
        self.semaphore = asyncio.Semaphore(self.concurrency)""",
    code
)

with open("core/downloader.py", "w", encoding="utf-8") as f:
    f.write(code)

print("SUCCESS: Semaphore fixed!")
