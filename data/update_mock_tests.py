# -*- coding: utf-8 -*-
path = '../frontend/src/pages/MockTestsPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update keyboard shortcut handling for Part 2
old_kbd = """        // A, B, C, D to answer directly
        if (['A', 'B', 'C', 'D'].includes(key) && currentQuestion) {
          const qKey = currentQuestion.id || `sim-${activeTestId}-q${currentQuestion.question_number || currentIndex + 1}`;
          handleSelectAnswer(qKey, key);
        }"""
new_kbd = """        // A, B, C, D to answer directly
        if (['A', 'B', 'C', 'D'].includes(key) && currentQuestion) {
          if (currentQuestion.part === 2 && key === 'D') return; // Part 2 only has choices A, B, C
          const qKey = currentQuestion.id || `sim-${activeTestId}-q${currentQuestion.question_number || currentIndex + 1}`;
          handleSelectAnswer(qKey, key);
        }"""
assert old_kbd in content, "old_kbd not found"
content = content.replace(old_kbd, new_kbd)

# 2. Update review mode image
old_rev_img = """                          {(q.image_url || q.part === 1) && (
                            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50/40 p-2 flex justify-center">
                              <QuestionImage
                                src={q.image_url}
                                alt={`Câu hỏi ${q.question_number}`}
                                part={q.part}
                                questionNumber={q.question_number}
                                className="max-h-[300px] object-contain rounded-lg"
                              />
                            </div>
                          )}"""
new_rev_img = """                          {(q.image_url || q.part === 1) && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-2 flex justify-center">
                              <QuestionImage
                                src={q.image_url}
                                alt={`Câu hỏi ${q.question_number}`}
                                part={q.part}
                                questionNumber={q.question_number}
                                maxHeight="max-h-[580px]"
                                className="w-full flex justify-center my-0 border-0 bg-transparent p-0"
                              />
                            </div>
                          )}"""
assert old_rev_img in content, "old_rev_img not found"
content = content.replace(old_rev_img, new_rev_img)

# 3. Update review mode options (exclude D for Part 2)
old_rev_opt = """                              {Object.entries(q.options).map(([letter, text]: [string, any]) => {
                                if (!text && q.part === 2 && letter === 'D') return null;"""
new_rev_opt = """                              {Object.entries(q.options).map(([letter, text]: [string, any]) => {
                                if (q.part === 2 && letter === 'D') return null;
                                if (!text && !q.options?.[letter]) return null;"""
assert old_rev_opt in content, "old_rev_opt not found"
content = content.replace(old_rev_opt, new_rev_opt)

# 4. Update shortcut hint text
old_hint = """                  <div className="text-xs text-slate-400 font-medium hidden sm:block">
                    Nhấn phím <strong>A</strong>, <strong>B</strong>, <strong>C</strong>, <strong>D</strong> để chọn nhanh
                  </div>"""
new_hint = """                  <div className="text-xs text-slate-400 font-medium hidden sm:block">
                    Nhấn phím {currentQ?.part === 2 ? <span><strong>A</strong>, <strong>B</strong>, <strong>C</strong></span> : <span><strong>A</strong>, <strong>B</strong>, <strong>C</strong>, <strong>D</strong></span>} để chọn nhanh
                  </div>"""
assert old_hint in content, "old_hint not found"
content = content.replace(old_hint, new_hint)

# 5. Update single-question exam mode image
old_exam_img = """                {/* Image (Photographs & Graphics) */}
                {(currentQ?.image_url || currentQ?.part === 1) && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50/40 p-2 flex justify-center">
                    <QuestionImage
                      src={currentQ.image_url}
                      alt={`Câu hỏi ${currentIndex + 1}`}
                      part={currentQ.part}
                      questionNumber={currentQ.question_number || currentIndex + 1}
                      className="max-h-[320px] object-contain rounded-lg"
                    />
                  </div>
                )}"""
new_exam_img = """                {/* Image (Photographs & Graphics) */}
                {(currentQ?.image_url || currentQ?.part === 1) && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-2 flex justify-center">
                    <QuestionImage
                      src={currentQ.image_url}
                      alt={`Câu hỏi ${currentIndex + 1}`}
                      part={currentQ.part}
                      questionNumber={currentQ.question_number || currentIndex + 1}
                      maxHeight="max-h-[580px]"
                      className="w-full flex justify-center my-0 border-0 bg-transparent p-0"
                    />
                  </div>
                )}"""
assert old_exam_img in content, "old_exam_img not found"
content = content.replace(old_exam_img, new_exam_img)

# 6. Update single-question exam mode options (exclude D and hide text for Part 2)
old_exam_opt = """                {/* Answer Options A, B, C, D */}
                {!isSpeakingTest && !isWritingTest && (
                  <div className="space-y-2.5 pt-1">
                    {['A', 'B', 'C', 'D'].map((letter) => {
                      const optionText = currentQ?.options ? currentQ.options[letter] : (currentQ as any)?.[`option_${letter.toLowerCase()}`];
                      if (!optionText && (currentQ?.part === 2 || !currentQ?.options?.[letter]) && letter === 'D') return null;
                      const isPart1or2 = currentQ?.part === 1 || currentQ?.part === 2;

                      const currentQKey = currentQ?.id || `sim-${activeTestId}-q${currentQ?.question_number || currentIndex + 1}`;
                      const isChecked = answers[currentQKey] === letter;

                      return (
                        <button
                          key={letter}
                          type="button"
                          onClick={() => handleSelectAnswer(currentQKey, letter)}
                          className={`w-full text-left p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm flex items-center gap-3.5 transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-blue-50/90 border-2 border-blue-600 text-blue-900 font-semibold shadow-xs ring-1 ring-blue-500/20'
                              : 'bg-slate-50/60 hover:bg-slate-100/90 text-slate-800 border-slate-200/90'
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                              isChecked
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-white border border-slate-300 text-slate-700'
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="leading-snug flex-1">{optionText || `(Lựa chọn ${letter})`}</span>
                        </button>
                      );
                    })}
                  </div>
                )}"""
new_exam_opt = """                {/* Answer Options A, B, C, D */}
                {!isSpeakingTest && !isWritingTest && (
                  <div className="space-y-2.5 pt-1">
                    {(currentQ?.part === 2 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D']).map((letter) => {
                      const optionText = currentQ?.options ? currentQ.options[letter] : (currentQ as any)?.[`option_${letter.toLowerCase()}`];
                      if (!optionText && (currentQ?.part === 2 || !currentQ?.options?.[letter]) && letter === 'D') return null;
                      const isPart2 = currentQ?.part === 2;

                      const currentQKey = currentQ?.id || `sim-${activeTestId}-q${currentQ?.question_number || currentIndex + 1}`;
                      const isChecked = answers[currentQKey] === letter;

                      return (
                        <button
                          key={letter}
                          type="button"
                          onClick={() => handleSelectAnswer(currentQKey, letter)}
                          className={`w-full text-left p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm flex items-center gap-3.5 transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-blue-50/90 border-2 border-blue-600 text-blue-900 font-semibold shadow-xs ring-1 ring-blue-500/20'
                              : 'bg-slate-50/60 hover:bg-slate-100/90 text-slate-800 border-slate-200/90'
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                              isChecked
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-white border border-slate-300 text-slate-700'
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="leading-snug flex-1">
                            {isPart2 ? `(${letter})` : (optionText || `(Lựa chọn ${letter})`)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}"""
assert old_exam_opt in content, "old_exam_opt not found"
content = content.replace(old_exam_opt, new_exam_opt)

# 7. Update all-questions mode image
old_all_img = """                      {/* Image if present */}
                      {(q.image_url || q.part === 1) && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50/40 p-2 flex justify-center">
                          <QuestionImage
                            src={q.image_url}
                            alt={`Câu hỏi ${q.question_number || targetIdx + 1}`}
                            part={q.part}
                            questionNumber={q.question_number || targetIdx + 1}
                            className="max-h-[320px] object-contain rounded-lg"
                          />
                        </div>
                      )}"""
new_all_img = """                      {/* Image if present */}
                      {(q.image_url || q.part === 1) && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-2 flex justify-center">
                          <QuestionImage
                            src={q.image_url}
                            alt={`Câu hỏi ${q.question_number || targetIdx + 1}`}
                            part={q.part}
                            questionNumber={q.question_number || targetIdx + 1}
                            maxHeight="max-h-[580px]"
                            className="w-full flex justify-center my-0 border-0 bg-transparent p-0"
                          />
                        </div>
                      )}"""
assert old_all_img in content, "old_all_img not found"
content = content.replace(old_all_img, new_all_img)

# 8. Update all-questions mode question text header (avoid transcript leak for Part 2)
old_all_qtext = """                      {/* Question Text */}
                      {q.question_text && (
                        <div className="text-sm sm:text-base font-bold text-slate-900 leading-snug tracking-tight">
                          {q.question_text}
                        </div>
                      )}"""
new_all_qtext = """                      {/* Question Text */}
                      <div className="text-sm sm:text-base font-bold text-slate-900 leading-snug tracking-tight">
                        {q.part === 1
                          ? `Câu ${q.question_number || targetIdx + 1}: Nghe 4 phương án và chọn câu miêu tả đúng nhất bức tranh`
                          : q.part === 2
                          ? `Câu ${q.question_number || targetIdx + 1}: Nghe câu hỏi và 3 câu phản hồi trong audio để chọn đáp án đúng`
                          : (q.question_text || `Câu ${q.question_number || targetIdx + 1}`)}
                      </div>"""
assert old_all_qtext in content, "old_all_qtext not found"
content = content.replace(old_all_qtext, new_all_qtext)

# 9. Update all-questions mode options (exclude D and hide text for Part 2)
old_all_opt = """                      {/* Options A, B, C, D */}
                      {!isSpeakingTest && !isWritingTest && (
                        <div className="space-y-2.5 pt-1">
                          {['A', 'B', 'C', 'D'].map((letter) => {
                            const optionText = q.options ? q.options[letter] : (q as any)?.[`option_${letter.toLowerCase()}`];
                            if (!optionText && (q.part === 2 || !q.options?.[letter]) && letter === 'D') return null;

                            const isChecked = answers[qKey] === letter;

                            return (
                              <button
                                key={letter}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentIndex(targetIdx);
                                  handleSelectAnswer(qKey, letter);
                                }}
                                className={`w-full text-left p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm flex items-center gap-3.5 transition-all cursor-pointer ${
                                  isChecked
                                    ? 'bg-blue-50/90 border-2 border-blue-600 text-blue-900 font-semibold shadow-xs ring-1 ring-blue-500/20'
                                    : 'bg-slate-50/60 hover:bg-slate-100/90 text-slate-800 border-slate-200/90'
                                }`}
                              >
                                <span
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                                    isChecked
                                      ? 'bg-blue-600 text-white shadow-2xs'
                                      : 'bg-white border border-slate-300 text-slate-700'
                                  }`}
                                >
                                  {letter}
                                </span>
                                <span className="leading-snug flex-1">{optionText || `(Lựa chọn ${letter})`}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}"""
new_all_opt = """                      {/* Options A, B, C, D */}
                      {!isSpeakingTest && !isWritingTest && (
                        <div className="space-y-2.5 pt-1">
                          {(q.part === 2 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D']).map((letter) => {
                            const optionText = q.options ? q.options[letter] : (q as any)?.[`option_${letter.toLowerCase()}`];
                            if (!optionText && (q.part === 2 || !q.options?.[letter]) && letter === 'D') return null;
                            const isPart2 = q.part === 2;

                            const isChecked = answers[qKey] === letter;

                            return (
                              <button
                                key={letter}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentIndex(targetIdx);
                                  handleSelectAnswer(qKey, letter);
                                }}
                                className={`w-full text-left p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm flex items-center gap-3.5 transition-all cursor-pointer ${
                                  isChecked
                                    ? 'bg-blue-50/90 border-2 border-blue-600 text-blue-900 font-semibold shadow-xs ring-1 ring-blue-500/20'
                                    : 'bg-slate-50/60 hover:bg-slate-100/90 text-slate-800 border-slate-200/90'
                                }`}
                              >
                                <span
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                                    isChecked
                                      ? 'bg-blue-600 text-white shadow-2xs'
                                      : 'bg-white border border-slate-300 text-slate-700'
                                  }`}
                                >
                                  {letter}
                                </span>
                                <span className="leading-snug flex-1">
                                  {isPart2 ? `(${letter})` : (optionText || `(Lựa chọn ${letter})`)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}"""
assert old_all_opt in content, "old_all_opt not found"
content = content.replace(old_all_opt, new_all_opt)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated MockTestsPage.tsx successfully")
