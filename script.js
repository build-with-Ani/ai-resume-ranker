// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", () => {

  // Elements
  const jobDesc = document.getElementById("jobDesc");
  const resumesText = document.getElementById("resumesText");
  const resultsContainer = document.getElementById("resultsContainer");
  const rankAllBtn = document.getElementById("rankAllBtn");
  const downloadReportBtn = document.getElementById("downloadReportBtn");
  const loadSampleBtn = document.getElementById("loadSampleBtn");
  const resumeFiles = document.getElementById("resumeFiles");
  const fileUploadArea = document.getElementById("fileUploadArea");
  const fileList = document.getElementById("fileList");
  const searchResults = document.getElementById("searchResults");
  const loadingSpinner = document.getElementById("loadingSpinner");
  const saveSessionBtn = document.getElementById("saveSessionBtn");
  const loadSessionBtn = document.getElementById("loadSessionBtn");
  const darkModeToggle = document.getElementById("darkModeToggle");

  // Stop words (for frequency calculation)
  const stopWords = new Set([
    "the", "and", "for", "with", "a", "an", "in", "on", "at", "to", "from", "by",
    "of", "as", "is", "are", "was", "were", "be", "this", "that", "these", "those",
    "it", "its", "or", "if", "not", "but", "so", "has", "have", "had", "will", "shall"
  ]);

  // Dark mode persistence
  const DARK_MODE_KEY = "ai_ats_dark_mode";

  // Util: Escape HTML for safe output
  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, (match) => {
      const escape = {
        '&': "&amp;",
        '<': "&lt;",
        '>': "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };
      return escape[match];
    });
  }

  // Util: Show loading spinner
  function showLoading(show) {
    loadingSpinner.hidden = !show;
  }

  // Util: Get word frequency from text (excluding stop words)
  function getWordFreq(text) {
    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g); // words of length 3+
    const freq = {};
    if (!words) return freq;
    words.forEach(word => {
      if (!stopWords.has(word)) {
        freq[word] = (freq[word] || 0) + 1;
      }
    });
    return freq;
  }

  // Util: Cosine similarity between two frequency objects
  function cosineSimilarity(freq1, freq2) {
    const allWords = new Set([...Object.keys(freq1), ...Object.keys(freq2)]);
    let dotProduct = 0, mag1 = 0, mag2 = 0;
    allWords.forEach(word => {
      const v1 = freq1[word] || 0;
      const v2 = freq2[word] || 0;
      dotProduct += v1 * v2;
      mag1 += v1 * v1;
      mag2 += v2 * v2;
    });
    const denom = Math.sqrt(mag1) * Math.sqrt(mag2);
    return denom === 0 ? 0 : dotProduct / denom;
  }

  // Util: Get top N words by frequency
  function getTopWords(freq, count = 15) {
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(entry => entry[0]);
  }

  // Highlight keywords in resume text: matched green, missing red
  function highlightKeywords(text, matched, missing) {
    // Escape text first
    let safeText = escapeHtml(text);
    // Highlight matched keywords
    matched.forEach(word => {
      const re = new RegExp(`\\b(${word})\\b`, "gi");
      safeText = safeText.replace(re, `<mark class="keyword-matched">$1</mark>`);
    });
    // Highlight missing keywords with underline red (only show in missing list)
    missing.forEach(word => {
      const re = new RegExp(`\\b(${word})\\b`, "gi");
      safeText = safeText.replace(re, `<span class="keyword-missing">$1</span>`);
    });
    return safeText;
  }

  // Rank resumes based on job description and update UI
  async function rankAllResumes() {
    // Clear previous filter
    searchResults.value = "";

    // Validate inputs
    if (!jobDesc.value.trim()) {
      alert("Please enter the Job Description.");
      jobDesc.focus();
      return;
    }
    if (!resumesText.value.trim()) {
      alert("Please enter at least one resume or upload files.");
      resumesText.focus();
      return;
    }

    showLoading(true);
    rankAllBtn.disabled = true;

    await new Promise(resolve => setTimeout(resolve, 100)); // small delay to show spinner

   const jobFreq = getWordFreq(jobDesc.value.trim());
const topKeywords = getTopWords(jobFreq, Math.min(15, Object.keys(jobFreq).length));

if (topKeywords.length === 0) {
  alert("Not enough valid keywords in Job Description. Please enter more meaningful text.");
  showLoading(false);
  return;
}


    // Split resumes text by separator lines
    const resumes = resumesText.value.trim().split(/\n\s*---\s*\n/);

    let results = resumes.map((resume, idx) => {
      const resumeFreq = getWordFreq(resume);
      let score = 0;
      let similarity = 0;

if (topKeywords.length === 1) {
  // Single keyword logic
  score = resumeFreq[topKeywords[0]] ? 100 : 0;
} else {
  similarity = cosineSimilarity(jobFreq, resumeFreq);
  score = Math.round(similarity * 100);
}


      const matchedKeywords = topKeywords.filter(w => w in resumeFreq);
      const missingWords = topKeywords.filter(w => !(w in resumeFreq));
      const matchPercent = Math.round((matchedKeywords.length / topKeywords.length) * 100);

      return {
        index: idx + 1,
        text: resume,
        score,
        matchedKeywords,
        missingWords,
        matchPercent
      };
    });

    // Sort by score desc
    results.sort((a, b) => b.score - a.score);

    // Render results
    renderResults(results);

    showLoading(false);
    rankAllBtn.disabled = false;
  }

  // Render ranking results with filtering support
  function renderResults(results) {
    if (results.length === 0) {
      resultsContainer.innerHTML = "<p>No resumes to display.</p>";
      return;
    }

    let html = `<h3>Ranking Results (${results.length} resumes)</h3>
                <ol>`;

    results.forEach(r => {
      let color = "red";
      let matchMsg = "❌ Poor match, improve resume.";
      if (r.score > 75) {
        color = "green";
        matchMsg = "✅ Excellent match!";
      } else if (r.score > 50) {
        color = "orange";
        matchMsg = "⚠️ Decent match, needs tweaking.";
      }

      // Highlight resume text keywords
      const highlightedText = highlightKeywords(r.text, r.matchedKeywords, r.missingWords);

      html += `
        <li class="result-item" 
    data-score="${r.score}" 
    data-keywords="${(r.matchedKeywords.join(' ') + ' ' + r.text).toLowerCase()}">
          <p><strong style="color:${color};">Score: ${r.score}% — ${matchMsg}</strong></p>
          <p style="margin: 4px 0 10px 0;">Keyword Match: <strong>${r.matchPercent}%</strong> (${r.matchedKeywords.length} of 15 key terms)</p>
          <p style="color: darkred;">Missing keywords: ${r.missingWords.length > 0 ? r.missingWords.join(', ') : 'None'}</p>
          <details>
            <summary>View Resume Text</summary>
            <pre class="resume-text">${highlightedText}</pre>
          </details>
          <button class="copyBtn" aria-label="Copy resume #${r.index} text to clipboard">Copy Resume Text</button>
        </li>`;
    });

    html += "</ol>";

    resultsContainer.innerHTML = html;

    // Attach copy button listeners
    document.querySelectorAll(".copyBtn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const pre = e.target.previousElementSibling.querySelector("pre");
        if (!pre) return;
        const text = pre.textContent || pre.innerText;
        navigator.clipboard.writeText(text).then(() => {
          alert("Resume text copied to clipboard!");
        });
      });
    });
  }

  // Filter results live based on search input
  function filterResults() {
  const filter = searchResults.value.toLowerCase();
  const items = resultsContainer.querySelectorAll(".result-item");

  items.forEach(item => {
    const keywords = item.dataset.keywords.toLowerCase();
    const resumeText = item.querySelector(".resume-text")?.innerText.toLowerCase() || "";
    const combined = keywords + " " + resumeText;

    if (combined.includes(filter)) {
      item.style.display = "";
    } else {
      item.style.display = "none";
    }
  });
}


  // Load sample data into inputs
  function loadSampleData() {
    const sampleJobDesc = `We are looking for a Software Developer with experience in Java, web development, and data structures. Strong communication skills and problem solving are required.`;

    const sampleResumes = `John Doe
Experience: Java Developer with knowledge of DSA and web development.
Skills: Java, HTML, CSS, Problem Solving.

---
Jane Smith
Entry-level software engineer skilled in Python and web development.
Good understanding of data structures and algorithms.
`;

    jobDesc.value = sampleJobDesc;
    resumesText.value = sampleResumes;
  }

  // Handle file input and drag & drop files
  function handleFiles(files) {
    if (!files || files.length === 0) return;

    const textPromises = [];
    for (let file of files) {
      if (file.type !== "text/plain") continue;
      textPromises.push(readFileAsText(file));
    }

    Promise.all(textPromises).then(contents => {
      // Append contents to resumesText separated by --- if needed
      const existingText = resumesText.value.trim();
      const newText = contents.map(c => c.trim()).join("\n\n---\n\n");
      resumesText.value = existingText
        ? existingText + "\n\n---\n\n" + newText
        : newText;

      updateFileList(files);
    });
  }

  // Read single file as text
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  // Update file list UI
  function updateFileList(files) {
    fileList.innerHTML = "";
    Array.from(files).forEach(file => {
      const li = document.createElement("li");
      li.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
      fileList.appendChild(li);
    });
  }

  // Save session to localStorage
  function saveSession() {
    const sessionData = {
      jobDesc: jobDesc.value,
      resumesText: resumesText.value,
      resultsHtml: resultsContainer.innerHTML,
      searchFilter: searchResults.value,
      darkMode: darkModeToggle.checked
    };
    localStorage.setItem("ai_ats_session", JSON.stringify(sessionData));
    alert("Session saved locally.");
  }

  // Load session from localStorage
  function loadSession() {
    const sessionDataStr = localStorage.getItem("ai_ats_session");
    if (!sessionDataStr) {
      alert("No saved session found.");
      return;
    }
    const sessionData = JSON.parse(sessionDataStr);
    jobDesc.value = sessionData.jobDesc || "";
    resumesText.value = sessionData.resumesText || "";
    resultsContainer.innerHTML = sessionData.resultsHtml || "";
    searchResults.value = sessionData.searchFilter || "";
    darkModeToggle.checked = sessionData.darkMode || false;
    applyDarkMode(darkModeToggle.checked);
  }

  // Apply dark mode styles to body
  function applyDarkMode(enabled) {
    if (enabled) {
      document.body.classList.add("dark-mode");
      darkModeToggle.setAttribute("aria-checked", "true");
    } else {
      document.body.classList.remove("dark-mode");
      darkModeToggle.setAttribute("aria-checked", "false");
    }
  }

  // Download PDF report of results
  async function downloadPDF() {
    if (!jobDesc.value.trim() || !resumesText.value.trim() || !resultsContainer.innerHTML.trim()) {
      alert("Please fill inputs and rank resumes before downloading.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Resume Matching Report", 15, 20);

    doc.setFontSize(12);
    doc.text("Job Description:", 15, 30);
    doc.text(doc.splitTextToSize(jobDesc.value.trim(), 180), 15, 37);

    let y = 70;
    const resumes = resumesText.value.trim().split(/\n\s*---\s*\n/);

    for (let i = 0; i < resumes.length; i++) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.text(`Resume #${i + 1}:`, 15, y);
      y += 8;
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(resumes[i], 180);
      doc.text(lines, 15, y);
      y += lines.length * 7 + 10;
    }

    doc.save("resume_matching_report.pdf");
alert("Download started: resume_matching_report.pdf");
  }

  // Drag & drop file events
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Setup event listeners

  rankAllBtn.addEventListener("click", rankAllResumes);
  downloadReportBtn.addEventListener("click", downloadPDF);
  loadSampleBtn.addEventListener("click", loadSampleData);

  resumeFiles.addEventListener("change", (e) => {
    handleFiles(e.target.files);
  });

  fileUploadArea.addEventListener("dragenter", preventDefaults);
  fileUploadArea.addEventListener("dragover", preventDefaults);
  fileUploadArea.addEventListener("dragleave", preventDefaults);
  fileUploadArea.addEventListener("drop", (e) => {
    preventDefaults(e);
    handleFiles(e.dataTransfer.files);
  });

  searchResults.addEventListener("input", filterResults);

  saveSessionBtn.addEventListener("click", saveSession);
  loadSessionBtn.addEventListener("click", loadSession);

  darkModeToggle.addEventListener("change", (e) => {
    applyDarkMode(e.target.checked);
    localStorage.setItem(DARK_MODE_KEY, e.target.checked);
  });

  // On page load, apply saved dark mode preference
  applyDarkMode(localStorage.getItem(DARK_MODE_KEY) === "true");

});
