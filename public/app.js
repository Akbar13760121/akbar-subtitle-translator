// ===== DOM Elements =====
// REMOVED: apiKeyInput is no longer needed in the frontend
const modelSelector = document.getElementById('model-selector');
const temperatureInput = document.getElementById('temperature-input');
const delayInput = document.getElementById('delay-input');
const systemPromptDisplay = document.getElementById('system-prompt-display');
const customPromptInput = document.getElementById('custom-prompt-input');
const fileInput = document.getElementById('file-input');
const fileInfoContainer = document.getElementById('file-info-container');
const translateButton = document.getElementById('translate-button');
const stopButton = document.getElementById('stop-button');
const downloadLink = document.getElementById('download-link');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const editorGrid = document.getElementById('editor-grid');
const subtitleBlockCount = document.getElementById('subtitle-block-count');
const themeToggle = document.getElementById('theme-toggle');
const promptPresetSelector = document.getElementById('prompt-preset-selector');
const findInput = document.getElementById('find-input');
const replaceInput = document.getElementById('replace-input');
const replaceAllBtn = document.getElementById('replace-all-btn');
const matchCount = document.getElementById('match-count');

// ===== State Variables =====
let parsedSubtitles = [];
let fileType = '';
let isTranslating = false;
let isPaused = false;
let currentTranslationIndex = 0;

// ===== WORLD-CLASS, PROFESSIONAL LOCALIZER PROMPT (FINAL VERSION with IRONCLAD RULE) =====
const PROMPT_PRESETS = {
    cinematic: `THE IRONCLAD RULE (YOUR ONLY TASK):
Your one and only job is to find the object with "index": 0 in the JSON provided in {{CONTEXT}}. You must translate the "text" field of THAT OBJECT ONLY. All other information is for context and must be ignored in your output. Any output that is not the direct translation of the text at "index": 0 is a failure.
---
You are a world-class cinematic subtitle localizer and cultural adapter.
CORE TRANSLATION PHILOSOPHY:
1.  **Fidelity First (وفاداری در اولویت):** Your primary, non-negotiable duty is to translate the **meaning and intent** of the original text. All stylistic choices must serve this primary duty. Never invent dialogue or change the core meaning.
2.  **Context Mastery (تسلط بر محتوا - اجباری):** This is not a suggestion; it is a mandatory step. The meaning of the 'current' subtitle is often incomplete without the surrounding dialogue. Before translating, you MUST analyze the 'previous' and 'next' subtitles to determine the correct tone, terminology, and emotional state.
    - **Example:** If 'previous' is "Did you see that explosion?" and 'current' is "Yeah.", your translation should be a context-aware "آره" or "دیدم", not a generic "بله".
CRITICAL INSTRUCTION:
The JSON array in {{CONTEXT}} contains subtitles with different indices:
- Index -1 or lower = "previous" subtitles
- Index 0 = "current" subtitle (THE ONLY ONE YOU TRANSLATE)
- Index 1 or higher = "next" subtitles
TRANSLATION STYLE REQUIREMENTS:
1.  **Natural and Conversational:** The translation must sound like something a real person would say.
2.  **Prioritize Flow:** If a literal translation is awkward, rephrase it to be more natural in Persian, while preserving the core meaning.
3.  **Adapt Idioms:** Find the closest Persian cultural equivalent for slang and idioms.
4.  **Maintain Character Voice:** Reflect the character's personality in your word choice.
5.  **Consistency is Crucial:** Names, places, and key technical terms must be translated consistently.
6.  **Interpret Interjections:** Pay extremely close attention to simple words like "Oh," "Ah," "Well," etc. Their meaning is 100% dependent on context. Choose the most fitting Persian equivalent.
{{USER_INSTRUCTIONS}}
ABSOLUTE FIDELITY REQUIREMENT:
- Your translation MUST be 100% faithful to the original text's **MEANING, INTENT, AND NUANCE**.
- **Uncensored Translation:** Translate all words, including profanity, faithfully and without censorship.
- **No Guessing (حدس ممنوع):** If you encounter a technical term you do not recognize, keep the original term in English.
STRICT RULES:
1. Your ENTIRE response must contain ONLY the Persian translation of the "current" subtitle text.
2. DO NOT output ANY words from "previous" or "next" subtitles.
3. DO NOT output ANY explanations.
YOUR RESPONSE MUST BE EXACTLY ONE THING: The Persian translation of ONLY the "current" subtitle text.`,
    youtube: ``,
    documentary: ``,
    comedy: ``
};
PROMPT_PRESETS.youtube = PROMPT_PRESETS.cinematic.replace('world-class cinematic subtitle localizer', 'professional YouTube content localizer');
PROMPT_PRESETS.documentary = PROMPT_PRESETS.cinematic.replace('cinematic subtitle localizer', 'highly precise technical translator for documentaries').replace('Conversational and Natural', 'Formal and Accurate');
PROMPT_PRESETS.comedy = PROMPT_PRESETS.cinematic.replace('cinematic subtitle localizer', 'creative and witty translator specializing in comedy').replace('Conversational and Natural', 'Humorous and Colloquial');

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    updatePromptDisplay();
});

// ===== Event Listeners =====
fileInput.addEventListener('change', handleFileSelect);
translateButton.addEventListener('click', startTranslation);
stopButton.addEventListener('click', handlePauseTranslation);
themeToggle.addEventListener('click', toggleTheme);
promptPresetSelector.addEventListener('change', () => {
    updatePromptDisplay();
    saveSettings();
});
modelSelector.addEventListener('change', saveSettings);
customPromptInput.addEventListener('input', saveSettings);
temperatureInput.addEventListener('input', saveSettings);
delayInput.addEventListener('input', saveSettings);
findInput.addEventListener('input', handleFind);
replaceAllBtn.addEventListener('click', handleReplaceAll);


// ===== Settings & Theme Functions =====
function saveSettings() {
    localStorage.setItem('selectedModel', modelSelector.value);
    localStorage.setItem('temperature', temperatureInput.value);
    localStorage.setItem('requestDelay', delayInput.value);
    localStorage.setItem('selectedPreset', promptPresetSelector.value);
    localStorage.setItem('customPrompt', customPromptInput.value);
}

function loadSettings() {
    modelSelector.value = localStorage.getItem('selectedModel') || 'gemini-1.5-flash-latest';
    temperatureInput.value = localStorage.getItem('temperature') || '0.7';
    delayInput.value = localStorage.getItem('requestDelay') || '1000';
    promptPresetSelector.value = localStorage.getItem('selectedPreset') || 'cinematic';
    customPromptInput.value = localStorage.getItem('customPrompt') || '';
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    themeToggle.innerHTML = isLight ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

function updatePromptDisplay() {
    const selectedPreset = promptPresetSelector.value;
    systemPromptDisplay.value = PROMPT_PRESETS[selectedPreset]
        .replace('{{USER_INSTRUCTIONS}}', '')
        .replace('{{CONTEXT}}', '[...context subtitles...]')
        .trim();
}

// ===== Find & Replace Functions =====
function handleFind() {
    const searchTerm = findInput.value;
    if (!searchTerm) {
        matchCount.textContent = '۰ مورد یافت شد';
        return;
    }
    let count = 0;
    const regex = new RegExp(searchTerm, 'gi');
    parsedSubtitles.forEach(sub => {
        const textarea = document.getElementById(`translated-text-${sub.id}`);
        if (textarea && textarea.value) {
            const matches = textarea.value.match(regex);
            if (matches) count += matches.length;
        }
    });
    matchCount.textContent = `${count} مورد یافت شد`;
}

function handleReplaceAll() {
    const findTerm = findInput.value;
    const replaceTerm = replaceInput.value;
    if (!findTerm) {
        alert('لطفاً کلمه‌ای را برای پیدا کردن وارد کنید.');
        return;
    }
    let replacedCount = 0;
    const regex = new RegExp(findTerm, 'gi');
    parsedSubtitles.forEach(sub => {
        const textarea = document.getElementById(`translated-text-${sub.id}`);
        if (textarea && textarea.value && textarea.value.match(regex)) {
            textarea.value = textarea.value.replace(regex, replaceTerm);
            replacedCount++;
        }
    });
    alert(`${replacedCount} جایگزینی انجام شد.`);
    handleFind();
}

// ===== UI Functions =====
function updateUIOnFinish(translateButtonText) {
    isTranslating = false;
    isPaused = false;
    currentTranslationIndex = 0;
    translateButton.disabled = false;
    translateButton.innerHTML = `<i class="fa-solid fa-play"></i> ${translateButtonText}`;
    stopButton.style.display = 'none';
}

function updateUIOnPause() {
    isTranslating = false;
    isPaused = true;
    translateButton.disabled = false;
    translateButton.innerHTML = `<i class="fa-solid fa-play"></i> ادامه دادن`;
    stopButton.style.display = 'none';
    const percentage = parsedSubtitles.length > 0 ? Math.round((currentTranslationIndex / parsedSubtitles.length) * 100) : 0;
    progressText.textContent = `متوقف شده در ${percentage}%`;
}

function displayFileInfo(file) {
    fileInfoContainer.innerHTML = `<div class="file-info-pill"><span>${file.name}</span><div class="actions"><i class="fa-solid fa-pen-to-square"></i><i class="fa-solid fa-xmark" id="remove-file-btn"></i></div></div>`;
    document.getElementById('remove-file-btn').addEventListener('click', resetApp);
}

function resetApp() {
    fileInput.value = '';
    fileInfoContainer.innerHTML = '';
    editorGrid.innerHTML = `<div class="placeholder"><i class="fa-regular fa-file-lines fa-3x"></i><p>هیچ فایل زیرنویسی بارگذاری نشده است</p></div>`;
    translateButton.disabled = true;
    translateButton.innerHTML = `<i class="fa-solid fa-play"></i> شروع ترجمه`;
    downloadLink.style.display = 'none';
    progressBar.value = 0;
    progressText.textContent = 'آماده برای شروع ترجمه';
    subtitleBlockCount.textContent = 'تعداد بلاک‌ها: ۰';
    parsedSubtitles = [];
    currentTranslationIndex = 0;
    isPaused = false;
}

// ===== Core Logic =====
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    resetApp();
    displayFileInfo(file);
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        fileType = file.name.endsWith('.vtt') ? 'vtt' : 'srt';
        try {
            parsedSubtitles = parseSrtVtt(content);
            if (parsedSubtitles.length === 0) {
                alert('فرمت فایل زیرنویس معتبر نیست یا فایل خالی است.');
                return;
            }
            displaySubtitlesInEditor();
            translateButton.disabled = false;
            translateButton.innerHTML = `<i class="fa-solid fa-play"></i> ترجمه ${parsedSubtitles.length} خط`;
        } catch (error) {
            console.error('Error parsing file:', error);
            alert('خطا در پردازش فایل زیرنویس.');
        }
    };
    reader.readAsText(file);
}

function parseSrtVtt(content) {
    const subtitles = [];
    const blocks = content.trim().replace(/\r/g, '').split(/\n\n+/);
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (!block) continue;
        const lines = block.split('\n');
        const timeLineIndex = lines.findIndex(line => line.includes('-->'));
        if (timeLineIndex === -1) continue;
        const timeLine = lines[timeLineIndex];
        const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
        if (!timeMatch) continue;
        const startTime = timeMatch[1];
        const endTime = timeMatch[2];
        const originalTextWithTags = lines.slice(timeLineIndex + 1).join('\n').trim();
        const cleanText = originalTextWithTags.replace(/<[^>]*>/g, '').replace(/{[^}]*}/g, '').trim();
        const isDialogue = /[a-zA-Z]{2}/.test(cleanText) && !/www\.|http:|(\.com|\.net|\.org)/.test(cleanText);
        let id = i + 1;
        if (timeLineIndex > 0) {
            const potentialId = parseInt(lines[timeLineIndex - 1], 10);
            if (!isNaN(potentialId)) id = potentialId;
        }
        subtitles.push({ id: id, startTime: startTime, endTime: endTime, text: isDialogue ? cleanText : '', originalTextWithTags: originalTextWithTags, translatedText: '', isDialogue: isDialogue });
    }
    return subtitles;
}

function displaySubtitlesInEditor() {
    editorGrid.innerHTML = '';
    subtitleBlockCount.textContent = `تعداد بلاک‌ها: ${parsedSubtitles.length}`;
    parsedSubtitles.forEach(sub => {
        const row = document.createElement('div');
        row.className = 'subtitle-row';
        row.id = `subtitle-row-${sub.id}`;
        row.innerHTML = `
            <div class="timecode-header">${sub.startTime} --> ${sub.endTime}</div>
            <div class="text-cells">
                <textarea class="editor-textarea" readonly>${sub.originalTextWithTags}</textarea>
                <div class="block-tag-cell">
                    <span class="block-tag">بلاک ${sub.id}</span>
                </div>
                <textarea id="translated-text-${sub.id}" class="editor-textarea" placeholder="..."></textarea>
            </div>
        `;
        editorGrid.appendChild(row);
    });
}

function handlePauseTranslation() {
    isPaused = true;
}

async function startTranslation() {
    if (isTranslating) return;
    isTranslating = true;
    isPaused = false;
    if (currentTranslationIndex === 0) {
        parsedSubtitles.forEach(sub => sub.translatedText = '');
    }
    translateButton.disabled = true;
    translateButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> در حال ترجمه...';
    stopButton.style.display = 'flex';
    downloadLink.style.display = 'none';
    await runSequentialTranslation();
    if (isPaused) {
        updateUIOnPause();
    } else {
        updateUIOnFinish(`ترجمه مجدد`);
        if (currentTranslationIndex === parsedSubtitles.length) {
            progressText.textContent = 'ترجمه کامل شد!';
        }
    }
}

async function runSequentialTranslation() {
    const totalCount = parsedSubtitles.length;
    const requestDelay = parseInt(delayInput.value, 10) || 0;
    for (let i = currentTranslationIndex; i < totalCount; i++) {
        if (isPaused) {
            currentTranslationIndex = i;
            console.log(`Translation paused at index ${i}`);
            break;
        }
        const sub = parsedSubtitles[i];
        const subtitleRow = document.getElementById(`subtitle-row-${sub.id}`);
        if (subtitleRow) subtitleRow.classList.add('translating');
        try {
            if (!sub.isDialogue) {
                sub.translatedText = sub.originalTextWithTags;
                updateTranslatedView(sub);
                continue;
            }
            const userPromptText = customPromptInput.value.trim();
            const userInstructions = userPromptText ? `\nADDITIONAL USER INSTRUCTION:\n- ${userPromptText}\n` : '';
            let finalPrompt = PROMPT_PRESETS[promptPresetSelector.value].replace('{{USER_INSTRUCTIONS}}', userInstructions);
            const contextWindow = [];
            for (let j = i - 1; j >= 0; j--) {
                if (parsedSubtitles[j].isDialogue) {
                    contextWindow.push({ index: -1, text: parsedSubtitles[j].text });
                    break;
                }
            }
            contextWindow.push({ index: 0, text: sub.text });
            for (let j = i + 1; j < totalCount; j++) {
                if (parsedSubtitles[j].isDialogue) {
                    contextWindow.push({ index: 1, text: parsedSubtitles[j].text });
                    break;
                }
            }
            const contextJson = JSON.stringify(contextWindow, null, 2);
            finalPrompt = finalPrompt.replace('{{CONTEXT}}', `\n${contextJson}\n`);
            const translatedText = await translateTextWithRetry(finalPrompt);
            sub.translatedText = translatedText;
            updateTranslatedView(sub);
        } catch (error) {
            console.error(`Failed to translate line ${sub.id} after retries:`, error);
            sub.translatedText = error.message;
            updateTranslatedView(sub, true);
            isPaused = true;
        } finally {
            if (subtitleRow) subtitleRow.classList.remove('translating');
            updateProgress(i + 1, totalCount);
            setupDownloadLink();
            currentTranslationIndex = i + 1;
            if (i < totalCount - 1 && !isPaused && requestDelay > 0) {
                await new Promise(resolve => setTimeout(resolve, requestDelay));
            }
        }
    }
}

async function translateTextWithRetry(prompt) {
    let retries = 3;
    while (retries > 0) {
        try {
            const translatedText = await translateText(prompt);
            return translatedText;
        } catch (error) {
            retries--;
            if (retries > 0) {
                const isQuota = error.isQuotaError;
                const waitTime = isQuota ? 60000 : 2000;
                const message = isQuota ? 'محدودیت اعتبار API' : 'خطای لحظه‌ای در API';
                console.warn(`${message}. Retrying in ${waitTime / 1000}s...`);
                progressText.textContent = `${message}. تلاش مجدد تا ${waitTime / 1000} ثانیه دیگر...`;
                await new Promise(resolve => setTimeout(resolve, waitTime));
                progressText.textContent = `در حال تلاش مجدد برای ترجمه...`;
            } else {
                throw new Error(`[ترجمه ناموفق] ${error.message}`);
            }
        }
    }
}

async function translateText(textToTranslate) {
    const selectedModel = modelSelector.value;
    const temperature = parseFloat(temperatureInput.value) || 0.7;
    const API_URL = `/functions/translate`;
    
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt: textToTranslate,
            model: selectedModel,
            temperature: temperature
        })
    });
    if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || `HTTP Error ${response.status}`;
        const error = new Error(errorMessage);
        if (errorMessage.includes('quota')) {
            error.isQuotaError = true;
        }
        throw error;
    }
    const data = await response.json();
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
        return data.candidates[0].content.parts[0].text.trim();
    } else {
        const reason = data.promptFeedback ? `مسدود شده: ${data.promptFeedback.blockReason}` : 'پاسخ نامعتبر';
        const error = new Error(`[${reason} از API]`);
        error.isQuotaError = false;
        throw error;
    }
}

function updateProgress(translatedCount, totalCount) {
    const percentage = totalCount > 0 ? Math.round((translatedCount / totalCount) * 100) : 0;
    progressBar.value = percentage;
    progressText.textContent = `${percentage}% (${translatedCount} از ${totalCount})`;
}

function updateTranslatedView(sub, isError = false) {
    const textarea = document.getElementById(`translated-text-${sub.id}`);
    if (textarea) {
        textarea.value = sub.translatedText;
        if (isError) {
            textarea.style.color = '#f87171';
        } else {
            textarea.style.color = '';
        }
    }
}

function setupDownloadLink() {
    const translatedContent = buildSubtitleFile();
    const blob = new Blob([translatedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = `translated.${fileType}`;
    downloadLink.style.display = 'flex';
}

function buildSubtitleFile() {
    let content = fileType === 'vtt' ? 'WEBVTT\n\n' : '';
    const sortedSubs = [...parsedSubtitles].sort((a, b) => a.id - b.id);
    sortedSubs.forEach(sub => {
        const translatedText = document.getElementById(`translated-text-${sub.id}`).value;
        if (sub.isDialogue && translatedText && !translatedText.startsWith('[')) {
            const startTime = fileType === 'vtt' ? sub.startTime.replace(',', '.') : sub.startTime;
            const endTime = fileType === 'vtt' ? sub.endTime.replace(',', '.') : sub.endTime;
            content += `${sub.id}\n`;
            content += `${startTime} --> ${endTime}\n`;
            content += `${translatedText}\n\n`;
        } else if (!sub.isDialogue && sub.originalTextWithTags) {
            const startTime = fileType === 'vtt' ? sub.startTime.replace(',', '.') : sub.startTime;
            const endTime = fileType === 'vtt' ? sub.endTime.replace(',', '.') : sub.endTime;
            content += `${sub.id}\n`;
            content += `${startTime} --> ${endTime}\n`;
            content += `${sub.originalTextWithTags}\n\n`;
        }
    });
    return content;
}