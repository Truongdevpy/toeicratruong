import { test as base, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface RulesConfig {
  forbidden_strings: string[];
  required_rules: Array<{
    route: string;
    required_text?: string;
    forbidden_text?: string;
    description: string;
  }>;
}

const rulesPath = path.resolve(process.cwd(), 'e2e/rules.json');
let rules: RulesConfig = { forbidden_strings: [], required_rules: [] };
try {
  rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
} catch (e) {
  console.warn('Could not read rules.json:', e);
}

// Global issues collected during a test run
export interface PageIssue {
  type: 'console_error' | 'network_error' | 'broken_image' | 'broken_media' | 'forbidden_text' | 'mojibake' | 'overflow' | 'blank_page';
  url: string;
  details: string;
  severity: 'Cao' | 'Trung bình' | 'Thấp' | 'Nghiêm trọng';
}

export const test = base.extend<{
  auditPage: Page;
  collectedIssues: PageIssue[];
}>({
  collectedIssues: async ({}, use) => {
    const issues: PageIssue[] = [];
    await use(issues);
  },

  auditPage: async ({ page, collectedIssues }, use) => {
    // 1. Console & Page Error tracking
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Allow harmless non-critical warnings
        if (text.includes('favicon') || text.includes('React Router Future Flag') || text.includes('Download the React DevTools')) {
          return;
        }
        collectedIssues.push({
          type: 'console_error',
          url: page.url(),
          details: text.slice(0, 300),
          severity: 'Trung bình'
        });
      }
    });

    page.on('pageerror', (err) => {
      collectedIssues.push({
        type: 'console_error',
        url: page.url(),
        details: err.message.slice(0, 300),
        severity: 'Cao'
      });
    });

    // 2. Failed Network Requests (4xx, 5xx)
    page.on('response', (response) => {
      const status = response.status();
      const url = response.url();
      if (status >= 400 && !url.includes('chrome-extension') && !url.includes('favicon')) {
        collectedIssues.push({
          type: 'network_error',
          url,
          details: `HTTP ${status} on ${url.slice(0, 200)}`,
          severity: status >= 500 ? 'Nghiêm trọng' : 'Trung bình'
        });
      }
    });

    // 3. AI Endpoints Default Mocking (Gemini Mock Schema)
    await page.route('**/api/ai/**', async (route) => {
      const req = route.request();
      const url = req.url();

      if (url.includes('/explain')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            explanation: 'Giải thích chi tiết chuẩn TOEIC từ AI Mock.',
            tips: ['Mẹo làm bài nhanh cho dạng câu hỏi này.']
          })
        });
      } else if (url.includes('/grade-writing') || url.includes('/writing')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            score: 2,
            max_score: 3,
            overall_band: 'Level 2',
            grammar_feedback: 'Ngữ pháp cơ bản tốt, cần bổ sung liên từ.',
            vocabulary_feedback: 'Dùng từ phù hợp ngữ cảnh.',
            rubric_evaluation: { grammar: 2, vocabulary: 2, relevance: 2 }
          })
        });
      } else if (url.includes('/grade-speaking') || url.includes('/speaking')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            score: 80,
            pronunciation: 82,
            fluency: 78,
            feedback: 'Phát âm rõ ràng, ngắt nghỉ đúng nhịp điệu.'
          })
        });
      } else if (url.includes('/assessment') || url.includes('/evaluate')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            predicted_score: 650,
            listening_predicted: 330,
            reading_predicted: 320,
            strengths: ['Part 1 Photo', 'Part 5 Grammar'],
            weaknesses: ['Part 7 Double Passage'],
            target_recommendation: 'Luyện thêm tốc độ đọc hiểu.'
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success', message: 'AI Mock Response' })
        });
      }
    });

    await use(page);

    // 4. Post-navigation DOM Invariant Checks
    try {
      // Check mojibake & forbidden strings
      const bodyText = await page.locator('body').innerText({ timeout: 2000 }).catch(() => '');
      if (bodyText) {
        // Mojibake regex check
        const mojibakeRegex = /(Ã|Ä‘|á»|â€|ï¿½|)/;
        if (mojibakeRegex.test(bodyText)) {
          collectedIssues.push({
            type: 'mojibake',
            url: page.url(),
            details: 'Phát hiện ký tự Mojibake/lỗi mã hóa font trong nội dung trang.',
            severity: 'Cao'
          });
        }

        // Forbidden strings from rules.json
        for (const forbidden of rules.forbidden_strings) {
          if (bodyText.includes(forbidden)) {
            collectedIssues.push({
              type: 'forbidden_text',
              url: page.url(),
              details: `Trang chứa chuỗi cấm: "${forbidden}"`,
              severity: 'Trung bình'
            });
          }
        }
      }

      // Check broken images
      const brokenImgsCount = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.filter((img) => img.complete && img.naturalWidth === 0).length;
      }).catch(() => 0);

      if (brokenImgsCount > 0) {
        collectedIssues.push({
          type: 'broken_image',
          url: page.url(),
          details: `Tìm thấy ${brokenImgsCount} ảnh bị lỗi hoặc không tải được (naturalWidth = 0).`,
          severity: 'Cao'
        });
      }

      // Check horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 2;
      }).catch(() => false);

      if (hasOverflow) {
        collectedIssues.push({
          type: 'overflow',
          url: page.url(),
          details: 'Giao diện bị tràn màn hình theo chiều ngang (scrollWidth > viewport).',
          severity: 'Thấp'
        });
      }

    } catch (e) {
      // Ignore teardown errors
    }
  }
});

export { expect };
