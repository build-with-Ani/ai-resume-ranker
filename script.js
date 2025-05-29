function getWordFreq(text) {
  const stopWords = new Set([
    "the", "and", "for", "with", "a", "an", "in", "on", "at", "to", "from", "by",
    "of", "as", "is", "are", "was", "were", "be", "this", "that", "these", "those",
    "it", "its", "or", "if", "not", "but", "so", "has", "have", "had", "will", "shall"
  ]);

  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g); // only 3+ letter words
  const freq = {};
  if (!words) return freq;

  words.forEach(word => {
    if (!stopWords.has(word)) {
      freq[word] = (freq[word] || 0) + 1;
    }
  });
  return freq;
}


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

  const denominator = Math.sqrt(mag1) * Math.sqrt(mag2);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

function getTopWords(freq, count = 15) {
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(entry => entry[0]);
}

// New function to rank multiple resumes
function rankAllResumes() {
  const jobDesc = document.getElementById("jobDesc").value.trim();
  const resumesText = document.getElementById("resumesText").value.trim();
  const resultsContainer = document.getElementById("resultsContainer");

  if (!jobDesc) {
    alert("Please enter the Job Description.");
    return;
  }
  if (!resumesText) {
    alert("Please enter at least one resume.");
    return;
  }

  const jobFreq = getWordFreq(jobDesc);

  // Split resumes by line with only ---
  const resumes = resumesText.split(/\n\s*---\s*\n/);

  const results = resumes.map((resume, idx) => {
    const resumeFreq = getWordFreq(resume);
    const similarity = cosineSimilarity(jobFreq, resumeFreq);
    const score = Math.round(similarity * 100);
    const missingWords = getTopWords(jobFreq, 15).filter(word => !(word in resumeFreq));
    return { index: idx + 1, text: resume, score, missingWords };
  });

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);

  // Build HTML to display
  let html = `<h3>Ranking Results (${results.length} resumes)</h3><ol>`;

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

    const missingMsg = r.missingWords.length > 0 
      ? `<span style="color: darkred;">Missing keywords: ${r.missingWords.join(', ')}</span>`
      : `<span style="color: green;">All top keywords present!</span>`;

    html += `
      <li>
        <p><strong style="color:${color};">Score: ${r.score}% — ${matchMsg}</strong></p>
        <p>${missingMsg}</p>
        <details>
          <summary>View Resume Text</summary>
          <pre style="white-space: pre-wrap; background:#f9f9f9; padding:10px; border:1px solid #ccc;">${escapeHtml(r.text)}</pre>
        </details>
      </li>`;
  });

  html += "</ol>";
  resultsContainer.innerHTML = html;
}

// Utility to escape HTML for safe display
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

// PDF download updated for multiple resumes report
async function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const jobDesc = document.getElementById("jobDesc").value.trim();
  const resumesText = document.getElementById("resumesText").value.trim();
  const resultsContainer = document.getElementById("resultsContainer");

  if (!jobDesc || !resumesText || !resultsContainer.innerHTML) {
    alert("Please fill all fields and rank resumes first.");
    return;
  }

  doc.setFontSize(16);
  doc.text("Resume Matching Report", 20, 20);

  doc.setFontSize(12);
  doc.text("Job Description:", 20, 30);
  doc.text(doc.splitTextToSize(jobDesc, 170), 20, 37);

  const resumes = resumesText.split(/\n\s*---\s*\n/);
  let y = 70;

  resumes.forEach((resume, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.text(`Resume #${idx + 1}:`, 20, y);
    y += 7;
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(resume, 170), 20, y);
    y += doc.splitTextToSize(resume, 170).length * 7 + 5;
  });

  doc.save("resume_matching_report.pdf");
}

// Attach event listener to new button
document.getElementById("rankAllBtn").addEventListener("click", rankAllResumes);
