with open("sites/study4.py", "r", encoding="utf-8") as f:
    code = f.read()

# Replace discover_tests completely with cleanly indented version
start_marker = "    def discover_tests(self, category_id: Optional[str] = None, collection_id: Optional[str] = None) -> List[Dict[str, Any]]:"
end_marker = "    def _extract_collection_name(self, title_or_slug: str) -> str:"

s_idx = code.find(start_marker)
e_idx = code.find(end_marker)

clean_discover = '''    def discover_tests(self, category_id: Optional[str] = None, collection_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Traverse pagination on Study4 library across both LR and SW categories.
        """
        targets = []
        if not category_id or category_id in ["all", "study4"]:
            targets = [
                ("study4_toeic", STUDY4_CONFIG["library_toeic_url"], "TOEIC"),
                ("study4_toeic_sw", STUDY4_CONFIG["library_sw_url"], "TOEIC SW")
            ]
        elif "sw" in category_id:
            targets = [("study4_toeic_sw", STUDY4_CONFIG["library_sw_url"], "TOEIC SW")]
        else:
            targets = [("study4_toeic", STUDY4_CONFIG["library_toeic_url"], "TOEIC")]

        discovered_tests: Dict[str, Dict[str, Any]] = {}
        cookies = self._get_client_cookies()

        with httpx.Client(headers=DEFAULT_HEADERS, cookies=cookies, timeout=20.0) as client:
            for cat_id, target_url, cat_name in targets:
                page_num = 1
                max_pages = 50
                while page_num <= max_pages:
                    req_url = f"{target_url}?page={page_num}" if page_num > 1 else target_url
                    logger.info(f"[STUDY4] Scanning {cat_name} page {page_num}: {req_url}")
                    try:
                        resp = client.get(req_url)
                        resp.raise_for_status()
                    except Exception as e:
                        logger.error(f"[STUDY4] Failed to fetch library page {page_num}: {e}")
                        break

                    soup = BeautifulSoup(resp.text, "html.parser")
                    test_links = soup.find_all("a", href=re.compile(r"^/tests/\d+/"))
                    if not test_links:
                        break

                    found_on_page = 0
                    for a in test_links:
                        href = a.get("href")
                        m = re.match(r"^/tests/(\d+)/([^/]+)/?", href)
                        if m:
                            t_id, slug = m.group(1), m.group(2)
                            if t_id not in discovered_tests:
                                title_text = a.text.strip().split("\\n")[0].strip() or slug.replace("-", " ").title()
                                col_name = self._extract_collection_name(title_text or slug)
                                is_sw = "sw" in cat_id or "speaking" in slug or "writing" in slug
                                discovered_tests[t_id] = {
                                    "id": f"study4_{t_id}",
                                    "site": self.site_name,
                                    "category_id": cat_id,
                                    "test_id": t_id,
                                    "slug": slug,
                                    "name": title_text,
                                    "url": urljoin(self.base_url, href),
                                    "collection_name": col_name,
                                    "total_questions": 11 if "speaking" in slug else (8 if "writing" in slug else 200),
                                    "duration_minutes": 20 if "speaking" in slug else (60 if "writing" in slug else 120)
                                }
                                found_on_page += 1

                    next_page = soup.find("a", href=re.compile(rf"[?&]page={page_num + 1}"))
                    if not next_page:
                        pages = [int(m.group(1)) for a_tag in soup.find_all("a", href=True) if (m := re.search(r"[?&]page=(\d+)", a_tag.get("href")))]
                        if not pages or page_num >= max(pages):
                            break

                    page_num += 1

        test_list = list(discovered_tests.values())
        logger.info(f"[STUDY4] Discovered {len(test_list)} tests.")

        for t in test_list:
            self.db.upsert_test(
                id_val=t["id"],
                site=self.site_name,
                collection_id=f"study4_{sanitize_path_segment(t['collection_name'])}",
                test_id=t["test_id"],
                name=t["name"],
                slug=t["slug"],
                url=t["url"],
                total_questions=t["total_questions"],
                duration_minutes=t["duration_minutes"]
            )

        return test_list

'''

code = code[:s_idx] + clean_discover + code[e_idx:]
with open("sites/study4.py", "w", encoding="utf-8") as f:
    f.write(code)

print("SUCCESS: discover_tests cleanly indented!")
