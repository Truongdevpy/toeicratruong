with open("core/downloader.py", "r", encoding="utf-8") as f:
    text = f.read()

target = """    async def download_batch(
        self,
        tasks: List[Dict[str, Any]],
        check_resume: bool = True
    ) -> List[Dict[str, Any]]:
        \"\"\"Download a batch of tasks asynchronously with progress tracking.\"\"\""""

replacement = """    async def download_batch(
        self,
        tasks: List[Dict[str, Any]],
        check_resume: bool = True
    ) -> List[Dict[str, Any]]:
        \"\"\"Download a batch of tasks asynchronously with progress tracking.\"\"\"
        self.semaphore = asyncio.Semaphore(self.concurrency)"""

text = text.replace(target, replacement)
with open("core/downloader.py", "w", encoding="utf-8") as f:
    f.write(text)

print("Batch semaphore initialized!")
